// Frontend Mozaiki — logowanie (JWT), profil, plakaty, wyszukiwarka TMDB.

const $ = (id) => document.getElementById(id);
let allMedia = [];
let searchTimer = null;
let me = null;
let authMode = "login";
let searchType = "film"; // "film" (TMDB) | "book" (Open Library)

const getToken = () => localStorage.getItem("mozaika_token");
const setToken = (t) => localStorage.setItem("mozaika_token", t);
const clearToken = () => localStorage.removeItem("mozaika_token");

// Ikona oka do podglądu hasła. off=true → oko przekreślone ukośną linią (hasło widoczne).
function pwIcon(off) {
  const eye =
    '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
  const slash = off ? '<line x1="3" y1="3" x2="21" y2="21"/>' : "";
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${eye}${slash}</svg>`;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error("Zaloguj się.");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Błąd API");
  return data;
}

function toast(msg) {
  const t = $("reviewMsg");
  t.textContent = msg;
  t.classList.add("show");
  window.setTimeout(() => t.classList.remove("show"), 2200);
}

// Wspólna „karta plakatu".
function posterCard(m, opts = {}) {
  const card = document.createElement("article");
  card.className = "card";

  const poster = document.createElement("div");
  poster.className = opts.square ? "poster square" : "poster";
  if (m.posterUrl) {
    const img = document.createElement("img");
    img.src = m.posterUrl;
    img.alt = m.title;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.remove();
      const n = document.createElement("div");
      n.className = "noimg";
      n.textContent = m.title;
      poster.append(n);
    });
    poster.append(img);
  } else {
    const n = document.createElement("div");
    n.className = "noimg";
    n.textContent = m.title;
    poster.append(n);
  }
  if (opts.score !== undefined) {
    const s = document.createElement("span");
    s.className = "score";
    s.textContent = `★ ${opts.score}`;
    poster.append(s);
  }
  card.append(poster);

  // Na profilu pokazujemy sam plakat (bez nazwy/roku pod spodem).
  if (opts.noMeta) return { card, meta: null };

  const meta = document.createElement("div");
  meta.className = "meta";
  const t = document.createElement("div");
  t.className = "t";
  t.textContent = m.title;
  const y = document.createElement("div");
  y.className = "y";
  y.textContent = m.year ? String(m.year) : "";
  meta.append(t, y);
  if (opts.recby) {
    const r = document.createElement("div");
    r.className = "recby";
    r.textContent = opts.recby;
    meta.append(r);
  }
  card.append(meta);
  return { card, meta };
}

// Enum typu w bazie (WIELKIE) → klucz źródła używany na froncie i w API (małe).
const ENUM_TYPE = {
  FILM: "film",
  SERIAL: "film",
  KSIAZKA: "book",
  MANGA: "manga",
  ANIME: "anime",
  MUZYKA: "music",
  GRA: "game",
};

// Buduje obiekt szczegółów z rekordu (media z bazy / wynik wyszukiwania).
// Typ zawsze normalizowany do małego klucza (film/book/manga/anime/music).
function toDetail(m, type, mediaId, myRating) {
  const raw = type ?? m.type;
  return {
    type: ENUM_TYPE[raw] ?? raw,
    externalId: m.externalId ?? null,
    title: m.title,
    year: m.year ?? null,
    posterUrl: m.posterUrl ?? null,
    mediaId: mediaId ?? m.id ?? null,
    myRating,
  };
}

// Siatka klikalnych kart — klik otwiera szczegóły (opis + ocena + komentarz).
function renderGrid(container, list, onClick) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = '<p class="muted">Nic nie znaleziono.</p>';
    return;
  }
  for (const m of list) {
    const { card } = posterCard(m, { score: m.myRating });
    card.addEventListener("click", () => onClick(m));
    container.append(card);
  }
}

async function loadCatalog() {
  allMedia = await api("/media");
  renderGrid($("catalog"), allMedia, (m) => openDetail(toDetail(m, m.type, m.id)));
}

// Wyniki wyszukiwania vs przeglądanie (rekomendacje/profil/katalog).
function showResults() {
  $("searchResults").classList.remove("hidden");
  $("browse").classList.add("hidden");
}
function showBrowse() {
  $("searchResults").classList.add("hidden");
  $("browse").classList.remove("hidden");
}

const SEARCH_SRC = {
  film: "TMDB",
  book: "Open Library",
  manga: "AniList",
  anime: "AniList",
  music: "iTunes",
  game: "RAWG",
};
const SEARCH_PH = {
  film: "Szukaj filmu (TMDB)…",
  book: "Szukaj książki (Open Library)…",
  manga: "Szukaj mangi (AniList)…",
  anime: "Szukaj anime (AniList)…",
  music: "Szukaj albumu (iTunes)…",
  game: "Szukaj gry (RAWG)…",
};

async function runSearch(q) {
  const src = SEARCH_SRC[searchType] ?? "TMDB";
  $("searchTitle").textContent = `Wyniki z ${src}: „${q}”`;
  const grid = $("searchGrid");
  grid.innerHTML = '<p class="muted">Szukam…</p>';
  showResults();
  try {
    const results = await api(`/search?q=${encodeURIComponent(q)}&type=${searchType}`);
    renderGrid(grid, results, (m) => openDetail(toDetail(m, searchType, null)));
  } catch (e) {
    grid.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Przełącznik źródła wyszukiwania: filmy (TMDB) / książki (Open Library).
function setSearchType(t) {
  if (searchType === t) return;
  searchType = t;
  $("typeFilm").classList.toggle("active", t === "film");
  $("typeBook").classList.toggle("active", t === "book");
  $("typeManga").classList.toggle("active", t === "manga");
  $("typeAnime").classList.toggle("active", t === "anime");
  $("typeMusic").classList.toggle("active", t === "music");
  $("typeGame").classList.toggle("active", t === "game");
  $("search").placeholder = SEARCH_PH[t] ?? SEARCH_PH.film;
  const q = $("search").value.trim();
  if (q) runSearch(q);
  else showBrowse();
}

function onSearchInput() {
  const q = $("search").value.trim();
  window.clearTimeout(searchTimer);
  if (!q) {
    showBrowse();
    return;
  }
  searchTimer = window.setTimeout(() => runSearch(q), 350);
}

async function loadRecommendations() {
  const row = $("recs");
  row.innerHTML = '<p class="muted">Ładowanie…</p>';
  try {
    const recs = await api("/me/recommendations");
    if (recs.length === 0) {
      row.innerHTML = '<p class="muted">Brak — oceń kilka tytułów, a coś dobierzemy.</p>';
      return;
    }
    row.innerHTML = "";
    for (const r of recs) {
      const { card } = posterCard(r, {
        score: r.score,
        recby: `poleca ${r.recommenders.length} os.`,
      });
      card.addEventListener("click", () => openDetail(toDetail(r, r.type, r.id)));
      row.append(card);
    }
  } catch (e) {
    row.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Cache danych zalogowanego usera (oceny + lista) — używany na profilu i w detalu.
let myProfile = { user: null, reviews: [], watchlist: [] };
async function loadMe() {
  myProfile = await api("/me");
  return myProfile;
}

// Grupy kategorii na prawej stronie profilu.
const CAT_GROUPS = [
  { label: "Muzyka", types: ["MUZYKA"] },
  { label: "Filmy / Seriale", types: ["FILM", "SERIAL"] },
  { label: "Anime", types: ["ANIME"] },
  { label: "Książki / Manga", types: ["KSIAZKA", "MANGA"] },
  { label: "Gry", types: ["GRA"] },
];

// Dodaje klikalną kartę (otwiera szczegóły) do kontenera.
// Muzyka = kwadratowa okładka (jak płyta CD), reszta = plakat 2:3.
// onClick opcjonalny — nadpisuje domyślne otwarcie szczegółów (np. z nakładki).
// rect=true wymusza plakat 2:3 nawet dla muzyki (używane w Top 4).
function appendCard(container, media, rating, onClick, rect) {
  const square = media.type === "MUZYKA" && !rect;
  const { card } = posterCard(media, { score: rating, noMeta: true, square });
  card.addEventListener(
    "click",
    onClick ?? (() => openDetail(toDetail(media, media.type, media.id, rating))),
  );
  container.append(card);
}

// Nakładka „Zobacz wszystko" — pełna siatka pozycji danej sekcji/kategorii.
// items: lista rekordów {media, rating} (recenzje) lub {media} (watchlista).
function openSeeAll(title, items) {
  $("seeAllTitle").textContent = title;
  const grid = $("seeAllGrid");
  grid.innerHTML = "";
  for (const it of items) {
    const media = it.media;
    const rating = it.rating;
    appendCard(grid, media, rating, () => {
      closeSeeAll();
      openDetail(toDetail(media, media.type, media.id, rating));
    });
  }
  $("seeAllOverlay").classList.remove("hidden");
}

function closeSeeAll() {
  $("seeAllOverlay").classList.add("hidden");
}

function renderRatedByCat(reviews) {
  const box = $("ratedByCat");
  box.innerHTML = "";
  for (const g of CAT_GROUPS) {
    const items = reviews.filter((r) => g.types.includes(r.media.type));
    if (items.length === 0) continue;
    // Rząd = etykieta kategorii z lewej + max 4 plakaty (1×4) z prawej.
    const catRow = document.createElement("div");
    catRow.className = "cat-row";
    const label = document.createElement("div");
    label.className = "cat-label";
    label.textContent = g.label;
    const posters = document.createElement("div");
    posters.className = "cat-posters";
    for (const r of items.slice(0, 4)) appendCard(posters, r.media, r.rating);
    catRow.append(label, posters);
    // „Zobacz wszystko" w prawym górnym rogu rzędu (gdy >4).
    if (items.length > 4) {
      const btn = document.createElement("button");
      btn.className = "seeall cat-seeall";
      btn.type = "button";
      btn.textContent = `Zobacz wszystko (${items.length})`;
      btn.addEventListener("click", () => openSeeAll(g.label, items));
      catRow.append(btn);
    }
    box.append(catRow);
  }
  if (box.children.length === 0) {
    box.innerHTML = '<p class="muted">Nic jeszcze nie ocenione.</p>';
  }
}

async function loadProfile() {
  const data = await loadMe();

  // Nagłówek: zdjęcie profilowe + imię.
  $("profileName").textContent = `Cześć, ${data.user.displayName}`;
  const img = $("avatarImg");
  const initial = $("avatarInitial");
  if (data.user.avatarUrl) {
    img.src = data.user.avatarUrl;
    img.classList.remove("hidden");
    initial.classList.add("hidden");
  } else {
    img.classList.add("hidden");
    initial.classList.remove("hidden");
    initial.textContent = (data.user.displayName[0] || "?").toUpperCase();
  }

  // Top 4 = tytuły przypięte przez usera (favorite).
  const top = data.reviews.filter((r) => r.favorite).slice(0, 4);
  const topBox = $("topMedia");
  topBox.innerHTML = "";
  if (top.length === 0) {
    topBox.innerHTML =
      '<p class="muted">Przypnij ulubione przyciskiem „TOP 4" na stronie tytułu.</p>';
  } else {
    // Top 4 = jeden rząd 1×4; muzyka tu jako prostokąt 2:3 (rect), nie kwadrat.
    for (const r of top) appendCard(topBox, r.media, r.rating, undefined, true);
  }

  // Lista „do obejrzenia/zagrania" — do 4 (2×2), reszta pod „Zobacz wszystko".
  const watch = data.watchlist;
  const watchBox = $("watchlist");
  watchBox.innerHTML = "";
  if (watch.length === 0) {
    watchBox.innerHTML = '<p class="muted">Pusto — dodaj coś przyciskiem „Do listy".</p>';
  } else {
    for (const w of watch.slice(0, 6)) appendCard(watchBox, w.media, undefined);
  }
  const watchSeeAll = $("watchSeeAll");
  if (watch.length > 6) {
    watchSeeAll.classList.remove("hidden");
    watchSeeAll.textContent = `Zobacz wszystko (${watch.length})`;
    watchSeeAll.onclick = () => openSeeAll("Do obejrzenia / zagrania", watch);
  } else {
    watchSeeAll.classList.add("hidden");
  }

  // Prawa strona: ocenione pogrupowane po kategoriach.
  renderRatedByCat(data.reviews);
}

// Wgranie zdjęcia profilowego: kompresja do 256px (canvas) → data:image → zapis.
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();
    reader.onload = () => {
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Nie udało się wczytać pliku."));
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Nieprawidłowy obraz."));
    reader.readAsDataURL(file);
  });
}

async function onAvatarPick(ev) {
  const file = ev.target.value && ev.target.files ? ev.target.files[0] : null;
  if (!file) return;
  try {
    const avatarUrl = await fileToAvatar(file);
    await api("/me/avatar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ avatarUrl }),
    });
    $("avatarImg").src = avatarUrl;
    $("avatarImg").classList.remove("hidden");
    $("avatarInitial").classList.add("hidden");
    toast("Zapisano zdjęcie");
  } catch (e) {
    toast(e.message);
  } finally {
    ev.target.value = "";
  }
}

// --- Szczegóły tytułu (opis + ocena + komentarz) ---
let detailCtx = null;
let detailReturn = "browse"; // dokąd wrócić z widoku szczegółów
let detailStars = null;

// Widget gwiazdek 0.5–10 (półgwiazdki: lewa połowa = x.5, prawa = x.0).
function buildStars(container, label) {
  container.innerHTML = "";
  let committed = 0;
  const fills = [];
  const paint = (v) => {
    for (let i = 0; i < 10; i += 1) {
      fills[i].style.width = `${Math.max(0, Math.min(1, v - i)) * 100}%`;
    }
    label.textContent = v ? `${v}/10` : "";
  };
  for (let i = 0; i < 10; i += 1) {
    const star = document.createElement("span");
    star.className = "star";
    const fill = document.createElement("span");
    fill.className = "fill";
    star.append(fill);
    fills.push(fill);
    star.addEventListener("mousemove", (e) => {
      paint(i + (e.offsetX < star.offsetWidth / 2 ? 0.5 : 1));
    });
    star.addEventListener("click", (e) => {
      committed = i + (e.offsetX < star.offsetWidth / 2 ? 0.5 : 1);
      paint(committed);
    });
    container.append(star);
  }
  container.addEventListener("mouseleave", () => paint(committed));
  return {
    get: () => committed,
    set: (v) => {
      committed = v || 0;
      paint(committed);
    },
  };
}

async function openDetail(item) {
  detailCtx = item;
  $("detailMsg").textContent = "";
  $("detailTitle").textContent = item.title;
  $("detailYear").textContent = item.year ? String(item.year) : "";

  const poster = $("detailPoster");
  poster.innerHTML = "";
  if (item.posterUrl) {
    const img = document.createElement("img");
    img.src = item.posterUrl;
    img.alt = item.title;
    poster.append(img);
  }

  detailStars.set(item.myRating ?? 0);
  $("detailComment").value = "";
  $("detailDesc").textContent = "Ładowanie opisu…";
  $("detailReviews").innerHTML = "";
  detailReturn = !$("profileView").classList.contains("hidden")
    ? "profile"
    : $("searchResults").classList.contains("hidden")
      ? "browse"
      : "results";
  $("searchbar").classList.add("hidden");
  $("searchResults").classList.add("hidden");
  $("browse").classList.add("hidden");
  $("profileView").classList.add("hidden");
  $("detailView").classList.remove("hidden");
  $("topBack").classList.remove("hidden");
  window.scrollTo(0, 0);

  if (item.type && item.externalId) {
    api(
      `/details?type=${encodeURIComponent(item.type)}&externalId=${encodeURIComponent(item.externalId)}`,
    )
      .then((d) => {
        $("detailDesc").textContent = d.description || "Brak opisu.";
      })
      .catch(() => {
        $("detailDesc").textContent = "Brak opisu.";
      });
  } else {
    $("detailDesc").textContent = "Brak opisu.";
  }

  // Jeśli tytuł jest już w katalogu, znajdź mediaId, żeby pokazać komentarze.
  // (typ w bazie jest WIELKIMI literami, więc normalizujemy przez ENUM_TYPE.)
  if (!item.mediaId && item.externalId) {
    const found = allMedia.find(
      (m) =>
        ENUM_TYPE[m.type] === item.type &&
        String(m.externalId) === String(item.externalId),
    );
    if (found) item.mediaId = found.id;
  }
  if (item.mediaId) loadDetailReviews(item.mediaId);
  updateDetailButtons();
}

// Stan przycisków TOP 4 / Do listy na podstawie cache myProfile.
function updateDetailButtons() {
  const mid = detailCtx?.mediaId;
  const rev = mid ? myProfile.reviews.find((r) => r.media.id === mid) : null;
  const onWatch = mid ? myProfile.watchlist.some((w) => w.media.id === mid) : false;
  const isFav = !!rev?.favorite;
  $("favBtn").classList.toggle("active", isFav);
  $("favBtn").textContent = isFav ? "★ w TOP 4" : "☆ TOP 4";
  $("watchBtn").classList.toggle("active", onWatch);
  $("watchBtn").textContent = onWatch ? "✓ Na liście" : "＋ Do listy";
}

// Upewnia się, że tytuł jest w bazie (dodaje, jeśli to świeży wynik wyszukiwania).
async function ensureMedia() {
  if (detailCtx.mediaId) return detailCtx.mediaId;
  const media = await api("/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ externalId: detailCtx.externalId, type: detailCtx.type }),
  });
  detailCtx.mediaId = media.id;
  await loadCatalog();
  return media.id;
}

async function toggleFavorite() {
  const mid = detailCtx?.mediaId;
  const rev = mid ? myProfile.reviews.find((r) => r.media.id === mid) : null;
  if (!mid || !rev) {
    toast("Najpierw oceń ten tytuł (gwiazdki), żeby dodać do TOP 4.");
    return;
  }
  try {
    await api("/me/favorite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: mid, favorite: !rev.favorite }),
    });
    await loadMe();
    updateDetailButtons();
    toast(rev.favorite ? "Usunięto z TOP 4" : "Dodano do TOP 4");
  } catch (e) {
    toast(e.message);
  }
}

async function toggleWatchlist() {
  try {
    const mid = await ensureMedia();
    const onWatch = myProfile.watchlist.some((w) => w.media.id === mid);
    if (onWatch) {
      await api(`/me/watchlist/${mid}`, { method: "DELETE" });
    } else {
      await api("/me/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaId: mid }),
      });
    }
    await loadMe();
    updateDetailButtons();
    toast(onWatch ? "Usunięto z listy" : "Dodano do listy");
  } catch (e) {
    toast(e.message);
  }
}

async function loadDetailReviews(mediaId) {
  try {
    const reviews = await api(`/media/${mediaId}/reviews`);
    const box = $("detailReviews");
    box.innerHTML = "";
    if (reviews.length === 0) {
      box.innerHTML = '<p class="muted">Brak komentarzy — bądź pierwszy.</p>';
      return;
    }
    for (const r of reviews) {
      // Wstępnie wypełnij swoją poprzednią ocenę/komentarz.
      if (me && r.user.displayName === me.displayName) {
        detailStars.set(r.rating);
        if (r.text) $("detailComment").value = r.text;
      }
      const el = document.createElement("div");
      el.className = "review";
      const who = document.createElement("div");
      who.className = "who";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = r.user.displayName;
      const rating = document.createElement("span");
      rating.className = "rating";
      rating.textContent = `★ ${r.rating}`;
      who.append(name, rating);
      el.append(who);
      if (r.text) {
        const txt = document.createElement("div");
        txt.className = "text";
        txt.textContent = r.text;
        el.append(txt);
      }
      box.append(el);
    }
  } catch {
    /* lista komentarzy opcjonalna */
  }
}

async function saveDetail() {
  if (!detailCtx) return;
  $("detailMsg").textContent = "";
  const rating = detailStars.get();
  const text = $("detailComment").value;
  if (rating < 0.5) {
    $("detailMsg").textContent = "Wybierz ocenę (kliknij gwiazdki).";
    return;
  }
  try {
    let mediaId = detailCtx.mediaId;
    if (!mediaId) {
      const media = await api("/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ externalId: detailCtx.externalId, type: detailCtx.type }),
      });
      mediaId = media.id;
      detailCtx.mediaId = mediaId;
    }
    await api("/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId, rating, text }),
    });
    toast("Zapisano");
    await Promise.all([loadMe(), loadRecommendations(), loadCatalog()]);
    updateDetailButtons();
    loadDetailReviews(mediaId);
  } catch (e) {
    $("detailMsg").textContent = e.message;
  }
}

function closeDetail() {
  $("detailView").classList.add("hidden");
  detailCtx = null;
  if (detailReturn === "profile") {
    openProfile();
    return;
  }
  $("topBack").classList.add("hidden");
  $("searchbar").classList.remove("hidden");
  $("searchResults").classList.toggle("hidden", detailReturn !== "results");
  $("browse").classList.toggle("hidden", detailReturn === "results");
}

// --- Twój profil (osobna strona) ---
async function openProfile() {
  $("searchbar").classList.add("hidden");
  $("searchResults").classList.add("hidden");
  $("browse").classList.add("hidden");
  $("detailView").classList.add("hidden");
  $("profileView").classList.remove("hidden");
  $("topBack").classList.remove("hidden");
  window.scrollTo(0, 0);
  await loadProfile();
}

function closeProfile() {
  $("profileView").classList.add("hidden");
  $("topBack").classList.add("hidden");
  $("searchbar").classList.remove("hidden");
  $("searchResults").classList.add("hidden");
  $("browse").classList.remove("hidden");
}

// --- Widoki: logowanie vs aplikacja ---
function showAuth() {
  me = null;
  $("topBack").classList.add("hidden");
  $("appView").classList.add("hidden");
  $("userBox").classList.add("hidden");
  $("authView").classList.remove("hidden");
}

async function showApp() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("userBox").classList.remove("hidden");
  $("hello").textContent = `Cześć, ${me.displayName}`;
  await Promise.all([loadMe(), loadRecommendations(), loadCatalog()]);
}

function logout() {
  clearToken();
  showAuth();
}

function setAuthMode(mode) {
  authMode = mode;
  const login = mode === "login";
  $("displayName").classList.toggle("hidden", login);
  $("authSubmit").textContent = login ? "Zaloguj się" : "Załóż konto";
  $("switchText").textContent = login ? "Nie masz jeszcze konta?" : "Masz już konto?";
  $("switchBtn").textContent = login ? "Załóż konto" : "Zaloguj się";
  $("password").placeholder = login ? "Hasło" : "Hasło (min. 6 znaków)";
  $("password").setAttribute("autocomplete", login ? "current-password" : "new-password");
  $("authMsg").textContent = "";
}

async function submitAuth(ev) {
  ev.preventDefault();
  $("authMsg").textContent = "";
  const body = {
    email: $("email").value,
    password: $("password").value,
    displayName: $("displayName").value,
  };
  try {
    const path = authMode === "login" ? "/auth/login" : "/auth/register";
    const res = await api(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setToken(res.token);
    me = res.user;
    await showApp();
  } catch (e) {
    $("authMsg").textContent = e.message;
  }
}

async function init() {
  $("switchBtn").addEventListener("click", () =>
    setAuthMode(authMode === "login" ? "register" : "login"),
  );
  $("authForm").addEventListener("submit", submitAuth);
  $("logout").addEventListener("click", logout);
  $("hello").addEventListener("click", openProfile);
  $("topBack").addEventListener("click", () => {
    if (!$("detailView").classList.contains("hidden")) closeDetail();
    else if (!$("profileView").classList.contains("hidden")) closeProfile();
  });
  $("avatarBtn").addEventListener("click", () => $("avatarFile").click());
  $("avatarFile").addEventListener("change", onAvatarPick);
  $("favBtn").addEventListener("click", toggleFavorite);
  $("watchBtn").addEventListener("click", toggleWatchlist);
  $("search").addEventListener("input", onSearchInput);
  $("typeFilm").addEventListener("click", () => setSearchType("film"));
  $("typeBook").addEventListener("click", () => setSearchType("book"));
  $("typeManga").addEventListener("click", () => setSearchType("manga"));
  $("typeAnime").addEventListener("click", () => setSearchType("anime"));
  $("typeMusic").addEventListener("click", () => setSearchType("music"));
  $("typeGame").addEventListener("click", () => setSearchType("game"));
  detailStars = buildStars($("detailStars"), $("detailStarVal"));
  $("detailSave").addEventListener("click", saveDetail);
  $("seeAllClose").addEventListener("click", closeSeeAll);
  $("seeAllOverlay").addEventListener("click", (e) => {
    if (e.target === $("seeAllOverlay")) closeSeeAll();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("seeAllOverlay").classList.contains("hidden")) closeSeeAll();
    else if (!$("detailView").classList.contains("hidden")) closeDetail();
  });
  $("pwToggle").innerHTML = pwIcon(false);
  $("pwToggle").addEventListener("click", () => {
    const pw = $("password");
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    $("pwToggle").innerHTML = pwIcon(show);
    $("pwToggle").setAttribute("aria-label", show ? "Ukryj hasło" : "Pokaż hasło");
  });
  setAuthMode("login");

  if (getToken()) {
    try {
      const data = await api("/me");
      me = data.user;
      await showApp();
      return;
    } catch {
      clearToken();
    }
  }
  showAuth();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

init().catch((e) => {
  document.querySelector("main").innerHTML =
    `<p class="muted">Nie udało się połączyć z API: ${e.message}</p>`;
});
