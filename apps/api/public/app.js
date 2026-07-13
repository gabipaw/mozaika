// Frontend Mozaiki — logowanie (JWT), profil, plakaty, wyszukiwarka TMDB.

const $ = (id) => document.getElementById(id);
let allMedia = [];
let searchTimer = null;
let me = null;
let authMode = "login";
let searchType = "film"; // "film" (TMDB) | "book" (Open Library)
let viewingUserId = null; // null = własny profil; inaczej id oglądanego usera
let viewingName = ""; // imię oglądanego usera (do etykiet porównania)

// --- i18n (tłumaczenia) ---
const I18N = {
  pl: {
    back: "← Wróć",
    logout: "Wyloguj",
    settings: "Ustawienia",
    language: "Język",
    tagline:
      "Oceniaj wszystko, co oglądasz i czytasz, a resztę dobierzemy do Twojego gustu.",
    yourName: "Twoja nazwa",
    email: "E-mail",
    login: "Zaloguj się",
    register: "Załóż konto",
    noAccount: "Nie masz jeszcze konta?",
    haveAccount: "Masz już konto?",
    passwordPh: "Hasło",
    passwordPhNew: "Hasło (min. 6 znaków)",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",
    yourProfile: "Twój profil",
    changePhoto: "Zmień zdjęcie",
    hi: "Cześć, {name}",
    typeFilm: "🎬 Filmy",
    typeBook: "📚 Książki",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Muzyka",
    typeGame: "🎮 Gry",
    searchFilm: "Szukaj filmu (TMDB)…",
    searchBook: "Szukaj książki (Open Library)…",
    searchManga: "Szukaj mangi (AniList)…",
    searchAnime: "Szukaj anime (AniList)…",
    searchMusic: "Szukaj albumu (iTunes)…",
    searchGame: "Szukaj gry (RAWG)…",
    results: "Wyniki",
    resultsFrom: "Wyniki z {src}: „{q}”",
    searching: "Szukam…",
    nothingFound: "Nic nie znaleziono.",
    forYou: "Dla Ciebie",
    forYouHint: "Polecane przez osoby o podobnym guście.",
    tasteRecs: "Pod Twój gust",
    tasteRecsHint: "Nowe tytuły spoza Twojego katalogu, dobrane do Twojego gustu.",
    noTasteRecs: "Oceń kilka tytułów, a odkryjemy coś nowego pod Twój gust.",
    noTasteRecsType: "Oceń kilka tytułów z tej kategorii, a dobierzemy coś nowego.",
    noDiscoverForType: "Dla tej kategorii nie mamy jeszcze świeżych rekomendacji.",
    reasonSimilar: "Bo podobne do „{title}”",
    reasonGenre: "Bo lubisz gatunek {genre}",
    reasonType: "Bo lubisz {kat}",
    reasonPopular: "Bo popularne w tej kategorii",
    reasonDecade: "Bo lubisz lata {decade}.",
    reasonGeneral: "Popularne — w Twoim guście",
    catFilm: "filmy",
    catAnime: "anime",
    catManga: "mangę",
    catGame: "gry",
    yourCatalog: "Twój katalog",
    yourCatalogHint: "Tytuły, które oceniłeś.",
    allGenres: "Wszystkie",
    tastePortrait: "Portret gustu",
    portraitEmpty: "Oceń kilka tytułów, a narysujemy Twój portret gustu.",
    harshMild: "Oceniasz łagodniej niż średnia.",
    harshTough: "Oceniasz surowiej niż średnia.",
    harshBalanced: "Oceniasz mniej więcej jak średnia.",
    yourAvg: "Twoja średnia",
    siteAvg: "serwis",
    topGenres: "Twoje gatunki",
    topTypes: "Rodzaje mediów",
    favDecade: "Ulubiona dekada: lata {decade}.",
    recBy: "poleca {n} os.",
    noRecs: "Brak — oceń kilka tytułów, a coś dobierzemy.",
    yourRating: "Twoja ocena",
    fav: "☆ TOP 4",
    favActive: "★ w TOP 4",
    watchAdd: "＋ Do listy",
    watchActive: "✓ Na liście",
    commentPh: "Napisz komentarz (opcjonalnie)…",
    saveReview: "Zapisz ocenę i komentarz",
    deleteReview: "🗑 Usuń ocenę",
    confirmDeleteReview:
      "Usunąć Twoją ocenę i komentarz do „{title}”? Tego nie da się cofnąć.",
    deletedReview: "Usunięto ocenę",
    comments: "Komentarze",
    noComments: "Brak komentarzy — bądź pierwszy.",
    loadingDesc: "Ładowanie opisu…",
    noDesc: "Brak opisu.",
    pickRating: "Wybierz ocenę (kliknij gwiazdki).",
    rateFirst: "Najpierw oceń ten tytuł (gwiazdki), żeby dodać do TOP 4.",
    addedTop4: "Dodano do TOP 4",
    removedTop4: "Usunięto z TOP 4",
    addedList: "Dodano do listy",
    removedList: "Usunięto z listy",
    saved: "Zapisano",
    savedPhoto: "Zapisano zdjęcie",
    top4: "Top 4 ulubione",
    top4Empty: "Przypnij ulubione przyciskiem „TOP 4” na stronie tytułu.",
    top4EmptyRO: "Brak ulubionych.",
    myComments: "Moje komentarze",
    myCommentsEmpty: "Nie dodałeś jeszcze żadnego komentarza do ocen.",
    watchlistTitle: "Do obejrzenia / zagrania",
    watchEmpty: "Pusto — dodaj coś przyciskiem „Do listy”.",
    watchEmptyRO: "Pusto.",
    seeAll: "Zobacz wszystko ({n})",
    nothingRatedCat: "Nic tu jeszcze",
    edit: "Zmień",
    pickN: "Wybierz {max} ({n})",
    pickCovers: "{label} — wybierz do {max} okładek",
    maxCovers: "Możesz wybrać maksymalnie {max} okładki.",
    friends: "Znajomi",
    add: "＋ Dodaj",
    searchFriends: "Szukaj znajomych…",
    noFriendsFound: "Nikogo nie znaleziono.",
    notifications: "Powiadomienia",
    notifFollowed: "zaczął(-ęła) Cię obserwować",
    noNotif: "Brak powiadomień. Gdy ktoś Cię zaobserwuje, pojawi się tu.",
    counts: "{fo} obserwujących · {fw} obserwowanych",
    follow: "Obserwuj",
    following: "Obserwujesz",
    noFollows: "Nie obserwujesz jeszcze nikogo — dodaj znajomych przyciskiem „＋ Dodaj”.",
    noActivity: "Twoi znajomi nie ocenili jeszcze nic.",
    noUsers: "Brak innych użytkowników.",
    yourTaste: "Wasz gust",
    matchCap: "dopasowania · {n} wspólnych",
    notEnough:
      "Za mało wspólnych ocen ({n}/3), żeby policzyć dopasowanie. Oceńcie więcej tych samych tytułów.",
    you: "Ty",
    loading: "Ładowanie…",
    done: "✕ Gotowe",
    close: "✕ Zamknij",
    loginRequired: "Zaloguj się.",
    apiError: "Błąd API",
    connectError: "Nie udało się połączyć z API: {msg}",
    justNow: "przed chwilą",
    minAgo: "{n} min temu",
    hAgo: "{n} godz. temu",
    dAgo: "{n} dni temu",
  },
  en: {
    back: "← Back",
    logout: "Log out",
    settings: "Settings",
    language: "Language",
    tagline: "Rate everything you watch and read — we'll match the rest to your taste.",
    yourName: "Your name",
    email: "Email",
    login: "Log in",
    register: "Sign up",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    passwordPh: "Password",
    passwordPhNew: "Password (min. 6 characters)",
    showPassword: "Show password",
    hidePassword: "Hide password",
    yourProfile: "Your profile",
    changePhoto: "Change photo",
    hi: "Hi, {name}",
    typeFilm: "🎬 Movies",
    typeBook: "📚 Books",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Music",
    typeGame: "🎮 Games",
    searchFilm: "Search movies (TMDB)…",
    searchBook: "Search books (Open Library)…",
    searchManga: "Search manga (AniList)…",
    searchAnime: "Search anime (AniList)…",
    searchMusic: "Search albums (iTunes)…",
    searchGame: "Search games (RAWG)…",
    results: "Results",
    resultsFrom: "Results from {src}: “{q}”",
    searching: "Searching…",
    nothingFound: "Nothing found.",
    forYou: "For you",
    forYouHint: "Recommended by people with similar taste.",
    tasteRecs: "For your taste",
    tasteRecsHint: "Fresh titles beyond your catalog, matched to your taste.",
    noTasteRecs: "Rate a few titles and we'll discover something new for you.",
    noTasteRecsType: "Rate a few titles in this category and we'll find something new.",
    noDiscoverForType: "No fresh recommendations for this category yet.",
    reasonSimilar: "Because it's like “{title}”",
    reasonGenre: "Because you like {genre}",
    reasonType: "Because you like {kat}",
    reasonPopular: "Popular in this category",
    reasonDecade: "Because you like the {decade}s",
    reasonGeneral: "Popular — in your taste",
    catFilm: "films",
    catAnime: "anime",
    catManga: "manga",
    catGame: "games",
    yourCatalog: "Your catalog",
    yourCatalogHint: "Titles you've rated.",
    allGenres: "All",
    tastePortrait: "Taste portrait",
    portraitEmpty: "Rate a few titles and we'll draw your taste portrait.",
    harshMild: "You rate more generously than average.",
    harshTough: "You rate more harshly than average.",
    harshBalanced: "You rate about average.",
    yourAvg: "Your average",
    siteAvg: "site",
    topGenres: "Your genres",
    topTypes: "Media types",
    favDecade: "Favourite decade: the {decade}s.",
    recBy: "recommended by {n}",
    noRecs: "Nothing yet — rate a few titles and we'll find some.",
    yourRating: "Your rating",
    fav: "☆ TOP 4",
    favActive: "★ in TOP 4",
    watchAdd: "＋ To list",
    watchActive: "✓ On list",
    commentPh: "Write a comment (optional)…",
    saveReview: "Save rating and comment",
    deleteReview: "🗑 Delete rating",
    confirmDeleteReview:
      "Delete your rating and comment for “{title}”? This can't be undone.",
    deletedReview: "Rating deleted",
    comments: "Comments",
    noComments: "No comments — be the first.",
    loadingDesc: "Loading description…",
    noDesc: "No description.",
    pickRating: "Pick a rating (click the stars).",
    rateFirst: "Rate this title first (stars) to add it to TOP 4.",
    addedTop4: "Added to TOP 4",
    removedTop4: "Removed from TOP 4",
    addedList: "Added to list",
    removedList: "Removed from list",
    saved: "Saved",
    savedPhoto: "Photo saved",
    top4: "Top 4 favorites",
    top4Empty: "Pin favorites with the “TOP 4” button on a title page.",
    top4EmptyRO: "No favorites.",
    myComments: "My comments",
    myCommentsEmpty: "You haven't added any comments to your ratings yet.",
    watchlistTitle: "To watch / play",
    watchEmpty: "Empty — add something with the “To list” button.",
    watchEmptyRO: "Empty.",
    seeAll: "See all ({n})",
    nothingRatedCat: "Nothing yet",
    edit: "Edit",
    pickN: "Pick {max} ({n})",
    pickCovers: "{label} — pick up to {max} covers",
    maxCovers: "You can pick at most {max} covers.",
    friends: "Friends",
    add: "＋ Add",
    searchFriends: "Search friends…",
    noFriendsFound: "No one found.",
    notifications: "Notifications",
    notifFollowed: "started following you",
    noNotif: "No notifications. When someone follows you, it'll show up here.",
    counts: "{fo} followers · {fw} following",
    follow: "Follow",
    following: "Following",
    noFollows: "You're not following anyone yet — add friends with the “＋ Add” button.",
    noActivity: "Your friends haven't rated anything yet.",
    noUsers: "No other users.",
    yourTaste: "Your taste",
    matchCap: "match · {n} in common",
    notEnough:
      "Not enough shared ratings ({n}/3) to compute the match. Rate more of the same titles.",
    you: "You",
    loading: "Loading…",
    done: "✕ Done",
    close: "✕ Close",
    loginRequired: "Please log in.",
    apiError: "API error",
    connectError: "Couldn't connect to the API: {msg}",
    justNow: "just now",
    minAgo: "{n} min ago",
    hAgo: "{n} h ago",
    dAgo: "{n} d ago",
  },
};

const LANGS = [
  { code: "pl", label: "Polski" },
  { code: "en", label: "English" },
];
const LANG_KEY = "mozaika_lang";
let lang = localStorage.getItem(LANG_KEY) || (navigator.language || "pl").slice(0, 2);
if (!I18N[lang]) lang = "pl";

function t(key, params) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.pl[key] || key;
  if (params) for (const k in params) s = s.replaceAll(`{${k}}`, params[k]);
  return s;
}

// Podmienia teksty statyczne (atrybuty data-i18n / -ph / -title) na bieżący język.
function applyStaticI18n() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const el of document.querySelectorAll("[data-i18n-ph]")) {
    el.placeholder = t(el.getAttribute("data-i18n-ph"));
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.getAttribute("data-i18n-title"));
  }
}

const SEARCH_PH_KEY = {
  film: "searchFilm",
  book: "searchBook",
  manga: "searchManga",
  anime: "searchAnime",
  music: "searchMusic",
  game: "searchGame",
};
function applySearchPlaceholder() {
  $("search").placeholder = t(SEARCH_PH_KEY[searchType] || "searchFilm");
}

function renderLangList() {
  const list = $("langList");
  list.innerHTML = "";
  for (const L of LANGS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-btn" + (L.code === lang ? " active" : "");
    btn.textContent = L.label;
    btn.addEventListener("click", () => setLang(L.code));
    list.append(btn);
  }
}

function setLang(code) {
  if (!I18N[code]) return;
  lang = code;
  localStorage.setItem(LANG_KEY, code);
  applyStaticI18n();
  renderLangList();
  refreshDynamic();
}

// Odświeża teksty ustawiane dynamicznie w bieżącym widoku po zmianie języka.
function refreshDynamic() {
  setAuthMode(authMode);
  applySearchPlaceholder();
  if (!$("profileView").classList.contains("hidden")) {
    if (viewingUserId) loadUserProfile(viewingUserId);
    else loadProfile();
  } else if (!$("detailView").classList.contains("hidden")) {
    updateDetailButtons();
  } else if (me) {
    loadTasteRecommendations();
    loadRecommendations();
    loadCatalog();
  }
}

function openSettings() {
  renderLangList();
  $("settingsOverlay").classList.remove("hidden");
}
function closeSettings() {
  $("settingsOverlay").classList.add("hidden");
}

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
    throw new Error(t("loginRequired"));
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || t("apiError"));
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
  card.className = opts.square ? "card sq" : "card";

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
    genres: m.genres ?? [],
    mediaId: mediaId ?? m.id ?? null,
    myRating,
  };
}

// Siatka klikalnych kart — klik otwiera szczegóły (opis + ocena + komentarz).
function renderGrid(container, list, onClick) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = `<p class="muted">${t("nothingFound")}</p>`;
    return;
  }
  for (const m of list) {
    const { card } = posterCard(m, { score: m.myRating });
    card.addEventListener("click", () => onClick(m));
    container.append(card);
  }
}

let catalogItems = []; // Twoje ocenione tytuły (z gatunkami)
let catalogGenre = null; // wybrany gatunek do filtrowania (null = wszystkie)

async function loadCatalog() {
  allMedia = await api("/media"); // pełna lista — potrzebna tylko do znajdowania mediaId
  // Katalog pokazuje WYŁĄCZNIE Twoje ocenione tytuły (nie cudze).
  catalogItems = myProfile.reviews.map((r) => ({ ...r.media, myRating: r.rating }));
  if (
    catalogGenre &&
    !catalogItems.some((m) => (m.genres ?? []).includes(catalogGenre))
  ) {
    catalogGenre = null; // wybrany gatunek zniknął z katalogu → wróć do „Wszystkie"
  }
  renderCatalogFilter();
  renderCatalog();
}

// Filtruje katalog po wybranym gatunku i rysuje siatkę.
function renderCatalog() {
  const items = catalogGenre
    ? catalogItems.filter((m) => (m.genres ?? []).includes(catalogGenre))
    : catalogItems;
  renderGrid($("catalog"), items, (m) =>
    openDetail(toDetail(m, m.type, m.id, m.myRating)),
  );
}

// Chipy gatunków nad katalogiem (tylko gdy są min. 2 różne gatunki).
function renderCatalogFilter() {
  const box = $("catalogGenres");
  box.innerHTML = "";
  const genres = [...new Set(catalogItems.flatMap((m) => m.genres ?? []))].sort();
  if (genres.length < 2) return;

  const chip = (label, value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "genre-chip filter" + (catalogGenre === value ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      catalogGenre = catalogGenre === value ? null : value;
      renderCatalogFilter();
      renderCatalog();
    });
    return b;
  };
  box.append(chip(t("allGenres"), null));
  for (const g of genres) box.append(chip(g, g));
}

// Wyniki wyszukiwania vs przeglądanie (rekomendacje/profil/katalog).
function showResults() {
  $("searchResults").classList.remove("hidden");
  $("browse").classList.add("hidden");
}
function showBrowse() {
  $("searchResults").classList.add("hidden");
  $("browse").classList.remove("hidden");
  // Rotacja „pod Twój gust" przy każdym wejściu na stronę główną (świeży zestaw).
  if (me) loadTasteRecommendations();
}

const SEARCH_SRC = {
  film: "TMDB",
  book: "Open Library",
  manga: "AniList",
  anime: "AniList",
  music: "iTunes",
  game: "RAWG",
};
async function runSearch(q) {
  const src = SEARCH_SRC[searchType] ?? "TMDB";
  $("searchTitle").textContent = t("resultsFrom", { src, q });
  const grid = $("searchGrid");
  grid.innerHTML = `<p class="muted">${t("searching")}</p>`;
  showResults();
  try {
    const results = await api(`/search?q=${encodeURIComponent(q)}&type=${searchType}`);
    renderGrid(grid, results, (m) => openDetail(toDetail(m, searchType, null)));
  } catch (e) {
    grid.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Przełącznik źródła wyszukiwania: filmy (TMDB) / książki (Open Library).
function setSearchType(type) {
  if (searchType === type) return;
  searchType = type;
  $("typeFilm").classList.toggle("active", type === "film");
  $("typeBook").classList.toggle("active", type === "book");
  $("typeManga").classList.toggle("active", type === "manga");
  $("typeAnime").classList.toggle("active", type === "anime");
  $("typeMusic").classList.toggle("active", type === "music");
  $("typeGame").classList.toggle("active", type === "game");
  applySearchPlaceholder();
  // „Pod Twój gust" idzie za zakładką — nowy rodzaj = nowe rekomendacje.
  loadTasteRecommendations();
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
  row.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    const recs = await api("/me/recommendations");
    if (recs.length === 0) {
      row.innerHTML = `<p class="muted">${t("noRecs")}</p>`;
      return;
    }
    row.innerHTML = "";
    for (const r of recs) {
      const { card } = posterCard(r, {
        score: r.score,
        recby: t("recBy", { n: r.recommenders.length }),
      });
      card.addEventListener("click", () => openDetail(toDetail(r, r.type, r.id)));
      row.append(card);
    }
  } catch (e) {
    row.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Nazwa kategorii (do powodu „Bo lubisz …") wg klucza rodzaju z API.
const CAT_LABEL = {
  film: "catFilm",
  anime: "catAnime",
  manga: "catManga",
  game: "catGame",
};
function catLabel(typeKey) {
  const key = CAT_LABEL[typeKey];
  return key ? t(key) : "";
}

// Zamienia powód rekomendacji z API na czytelny tekst — WYJAŚNIA, czemu w guście.
function tasteReasonLabel(reason, item) {
  if (!reason) return "";
  if (reason.kind === "similar") return t("reasonSimilar", { title: reason.to });
  if (reason.kind === "genre") return t("reasonGenre", { genre: reason.genre });
  if (reason.kind === "type") {
    const kat = catLabel(item?.type);
    return kat ? t("reasonType", { kat }) : t("reasonGeneral");
  }
  if (reason.kind === "popular") return t("reasonPopular");
  if (reason.kind === "decade") return t("reasonDecade", { decade: reason.decade });
  return t("reasonGeneral");
}

// Rodzaje, dla których źródła mają API „podobne"/„odkrywaj" (patrz DISCOVERABLE
// w logic/discovery.ts). Książki (Open Library) i muzyka (iTunes) go nie mają.
const DISCOVERABLE_KEYS = ["film", "anime", "manga", "game"];

// Odkrywanie pod gust — świeże tytuły z zewnątrz (TMDB/AniList/RAWG), nie z katalogu.
// Pozycje są zewnętrzne (mają externalId, brak mediaId) — klik otwiera detal i ocenę.
// Sekcja idzie za aktywną zakładką: klikasz „Gry" → same gry.
async function loadTasteRecommendations() {
  const row = $("tasteRecs");
  if (!DISCOVERABLE_KEYS.includes(searchType)) {
    row.innerHTML = `<p class="muted">${t("noDiscoverForType")}</p>`;
    return;
  }
  row.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    const recs = await api(`/me/discover?type=${encodeURIComponent(searchType)}`);
    if (recs.length === 0) {
      row.innerHTML = `<p class="muted">${t("noTasteRecsType")}</p>`;
      return;
    }
    row.innerHTML = "";
    for (const r of recs) {
      const { card } = posterCard(r, {
        score: r.score,
        recby: tasteReasonLabel(r.reason, r),
      });
      card.addEventListener("click", () => openDetail(toDetail(r, r.type, null)));
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
  { key: "music", label: "Muzyka", types: ["MUZYKA"] },
  { key: "film", label: "Filmy / Seriale", types: ["FILM", "SERIAL"] },
  { key: "anime", label: "Anime", types: ["ANIME"] },
  { key: "book", label: "Książki / Manga", types: ["KSIAZKA", "MANGA"] },
  { key: "game", label: "Gry", types: ["GRA"] },
];

// Ile okładek pokazuje jeden rząd kategorii na profilu. JEDNO miejsce — teksty
// („wybierz do N") też się z tego biorą, żeby nie rozjechały się z rzeczywistością.
const MAX_COVERS = 4;

// Które okładki pokazać w danej kategorii — wybór usera (mapa key→[mediaId]),
// zapis w localStorage. Puste = pokaż domyślnie pierwsze MAX_COVERS.
const FEATURED_KEY = "mozaika_featured";

function getFeaturedMap() {
  try {
    const m = JSON.parse(localStorage.getItem(FEATURED_KEY) || "{}");
    return m && typeof m === "object" ? m : {};
  } catch {
    return {};
  }
}

function getFeatured(catKey) {
  const ids = getFeaturedMap()[catKey];
  return Array.isArray(ids) ? ids : [];
}

function setFeatured(catKey, ids) {
  const m = getFeaturedMap();
  if (ids.length) m[catKey] = ids;
  else delete m[catKey];
  localStorage.setItem(FEATURED_KEY, JSON.stringify(m));
}

// Które pozycje pokazać w kategorii: wybrane okładki albo pierwsze MAX_COVERS.
function displayedForCat(g, items) {
  const feat = getFeatured(g.key);
  if (feat.length) {
    const byId = new Map(items.map((r) => [r.media.id, r]));
    const chosen = feat.map((id) => byId.get(id)).filter(Boolean);
    if (chosen.length) return chosen.slice(0, MAX_COVERS);
  }
  return items.slice(0, MAX_COVERS);
}

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

// --- Wybór okładek w kategorii (max 4) — używa nakładki „Zobacz wszystko" ---
let catPickCtx = null; // { group, items } gdy tryb wyboru okładek

function openCatPicker(group, items) {
  catPickCtx = { group, items };
  $("seeAllTitle").textContent = t("pickCovers", {
    label: group.label,
    max: MAX_COVERS,
  });
  renderCatPickGrid();
  $("seeAllOverlay").classList.remove("hidden");
}

function renderCatPickGrid() {
  const { group, items } = catPickCtx;
  const grid = $("seeAllGrid");
  grid.innerHTML = "";
  const feat = getFeatured(group.key);
  for (const r of items) {
    const square = r.media.type === "MUZYKA";
    const { card } = posterCard(r.media, { score: r.rating, noMeta: true, square });
    const pos = feat.indexOf(r.media.id);
    if (pos >= 0) {
      card.classList.add("picked");
      const num = document.createElement("span");
      num.className = "pick-num";
      num.textContent = String(pos + 1);
      card.append(num);
    }
    card.addEventListener("click", () => {
      let cur = getFeatured(group.key);
      if (cur.includes(r.media.id)) {
        cur = cur.filter((id) => id !== r.media.id);
      } else {
        if (cur.length >= MAX_COVERS) {
          toast(t("maxCovers", { max: MAX_COVERS }));
          return;
        }
        cur = [...cur, r.media.id];
      }
      setFeatured(group.key, cur);
      renderCatPickGrid();
      renderRatedByCat(myProfile.reviews);
    });
    grid.append(card);
  }
}

function renderRatedByCat(reviews, readOnly) {
  const box = $("ratedByCat");
  box.innerHTML = "";
  // WSZYSTKIE 5 kategorii zawsze jako stałe kontenery (puste też), żeby układ się
  // nie rozjeżdżał. Na własnym profilu można wybrać 4 okładki; na cudzym — pierwsze 4.
  for (const g of CAT_GROUPS) {
    const items = reviews.filter((r) => g.types.includes(r.media.type));
    const catRow = document.createElement("div");
    catRow.className = "cat-row";
    const label = document.createElement("div");
    label.className = "cat-label";
    label.textContent = g.label;
    const posters = document.createElement("div");
    posters.className = "cat-posters";
    if (items.length === 0) {
      posters.classList.add("empty");
      const ph = document.createElement("span");
      ph.className = "cat-empty";
      ph.textContent = t("nothingRatedCat");
      posters.append(ph);
    } else {
      const shown = readOnly ? items.slice(0, MAX_COVERS) : displayedForCat(g, items);
      for (const r of shown) appendCard(posters, r.media, r.rating);
    }
    catRow.append(label, posters);
    // „Wybierz" tylko na WŁASNYM profilu (nie zmieniasz cudzych okładek).
    if (!readOnly && items.length > 0) {
      const btn = document.createElement("button");
      btn.className = "seeall cat-seeall";
      btn.type = "button";
      btn.textContent =
        items.length > MAX_COVERS
          ? t("pickN", { n: items.length, max: MAX_COVERS })
          : t("edit");
      btn.addEventListener("click", () => openCatPicker(g, items));
      catRow.append(btn);
    }
    box.append(catRow);
  }
}

// --- Znajomi (follow) + feed aktywności ---
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("justNow");
  if (s < 3600) return t("minAgo", { n: Math.floor(s / 60) });
  if (s < 86400) return t("hAgo", { n: Math.floor(s / 3600) });
  return t("dAgo", { n: Math.floor(s / 86400) });
}

// Kółko z avatarem usera (zdjęcie albo inicjał).
function avatarEl(user) {
  const el = document.createElement("div");
  el.className = "feed-avatar";
  if (user.avatarUrl) {
    const img = document.createElement("img");
    img.src = user.avatarUrl;
    img.alt = "";
    el.append(img);
  } else {
    el.textContent = (user.displayName[0] || "?").toUpperCase();
  }
  return el;
}

async function loadActivity() {
  const box = $("activityFeed");
  box.innerHTML = `<p class="muted small">${t("loading")}</p>`;
  try {
    const [items, following] = await Promise.all([
      api("/me/activity"),
      api("/me/following").catch(() => []),
    ]);
    box.innerHTML = "";
    if (items.length === 0) {
      box.innerHTML = `<p class="muted small">${
        following.length === 0 ? t("noFollows") : t("noActivity")
      }</p>`;
      return;
    }
    for (const it of items) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "feed-item";
      item.append(avatarEl(it.user));
      const txt = document.createElement("div");
      txt.className = "feed-text";
      const line = document.createElement("div");
      line.className = "feed-line";
      const name = document.createElement("span");
      name.className = "feed-name";
      name.textContent = it.user.displayName;
      const rate = document.createElement("span");
      rate.className = "feed-rate";
      rate.textContent = `★ ${it.rating}`;
      line.append(name, rate);
      const title = document.createElement("div");
      title.className = "feed-title";
      title.textContent = it.media.title;
      // Klik w tytuł → szczegóły tytułu (nie wchodzi na profil osoby).
      title.addEventListener("click", (e) => {
        e.stopPropagation();
        openDetail(toDetail(it.media, it.media.type, it.media.id));
      });
      const time = document.createElement("div");
      time.className = "feed-time";
      time.textContent = timeAgo(it.createdAt);
      txt.append(line, title, time);
      item.append(txt);
      // Klik w resztę pozycji → profil osoby.
      item.addEventListener("click", () => openUserProfile(it.user.id));
      box.append(item);
    }
  } catch (e) {
    box.innerHTML = `<p class="muted small">${e.message}</p>`;
  }
}

const friendsData = { others: [], followingIds: new Set() };

async function renderFriendsList() {
  const list = $("friendsList");
  list.innerHTML = `<p class="muted small">${t("loading")}</p>`;
  try {
    const [users, following] = await Promise.all([api("/users"), api("/me/following")]);
    friendsData.followingIds = new Set(following.map((u) => u.id));
    friendsData.others = users.filter((u) => u.id !== me.id);
    drawFriends();
  } catch (e) {
    list.innerHTML = `<p class="muted small">${e.message}</p>`;
  }
}

// Rysuje listę znajomych z uwzględnieniem wyszukiwarki (filtr po nazwie).
function drawFriends() {
  const list = $("friendsList");
  const q = ($("friendsSearch").value || "").trim().toLowerCase();
  const items = q
    ? friendsData.others.filter((u) => u.displayName.toLowerCase().includes(q))
    : friendsData.others;
  list.innerHTML = "";
  if (friendsData.others.length === 0) {
    list.innerHTML = `<p class="muted small">${t("noUsers")}</p>`;
    return;
  }
  if (items.length === 0) {
    list.innerHTML = `<p class="muted small">${t("noFriendsFound")}</p>`;
    return;
  }
  for (const u of items) {
    const row = document.createElement("div");
    row.className = "friend-row";
    const av = avatarEl(u);
    av.style.cursor = "pointer";
    av.addEventListener("click", () => {
      closeFriends();
      openUserProfile(u.id);
    });
    row.append(av);
    const name = document.createElement("span");
    name.className = "friend-name friend-link";
    name.textContent = u.displayName;
    name.addEventListener("click", () => {
      closeFriends();
      openUserProfile(u.id);
    });
    const btn = document.createElement("button");
    btn.type = "button";
    const on = friendsData.followingIds.has(u.id);
    btn.className = "follow-btn" + (on ? " active" : "");
    btn.textContent = on ? t("following") : t("follow");
    btn.addEventListener("click", async () => {
      try {
        if (friendsData.followingIds.has(u.id)) {
          await api(`/me/follow/${u.id}`, { method: "DELETE" });
        } else {
          await api("/me/follow", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ userId: u.id }),
          });
        }
        await renderFriendsList();
        loadActivity();
      } catch (e) {
        toast(e.message);
      }
    });
    row.append(name, btn);
    list.append(row);
  }
}

// --- Powiadomienia: nowi obserwujący (znacznik „przeczytane" w localStorage) ---
const NOTIF_SEEN_KEY = "mozaika_notif_seen";
let followersCache = [];

const getNotifSeen = () => Number(localStorage.getItem(NOTIF_SEEN_KEY) || 0);

async function loadFollowers() {
  try {
    followersCache = await api("/me/followers");
  } catch {
    followersCache = [];
  }
  updateNotifBadge();
}

function updateNotifBadge() {
  const seen = getNotifSeen();
  const n = followersCache.filter((f) => new Date(f.since).getTime() > seen).length;
  const badge = $("notifBadge");
  badge.textContent = n > 9 ? "9+" : String(n);
  badge.classList.toggle("hidden", n === 0);
}

function renderNotifList() {
  const list = $("notifList");
  const seen = getNotifSeen();
  list.innerHTML = "";
  if (followersCache.length === 0) {
    list.innerHTML = `<p class="muted small">${t("noNotif")}</p>`;
    return;
  }
  for (const f of followersCache) {
    const row = document.createElement("div");
    row.className = "friend-row notif-row";
    if (new Date(f.since).getTime() > seen) row.classList.add("new");
    const av = avatarEl(f);
    av.style.cursor = "pointer";
    const go = () => {
      closeNotif();
      openUserProfile(f.id);
    };
    av.addEventListener("click", go);
    const body = document.createElement("div");
    body.className = "notif-body";
    const txt = document.createElement("span");
    txt.className = "friend-link";
    const b = document.createElement("b");
    b.textContent = f.displayName;
    txt.append(b, ` ${t("notifFollowed")}`);
    txt.addEventListener("click", go);
    const time = document.createElement("span");
    time.className = "notif-time muted small";
    time.textContent = timeAgo(f.since);
    body.append(txt, time);
    row.append(av, body);
    list.append(row);
  }
}

function openNotif() {
  $("notifOverlay").classList.remove("hidden");
  renderNotifList();
  localStorage.setItem(NOTIF_SEEN_KEY, String(Date.now())); // oznacz jako przeczytane
  updateNotifBadge();
}
function closeNotif() {
  $("notifOverlay").classList.add("hidden");
}

async function openFriends() {
  $("friendsOverlay").classList.remove("hidden");
  await renderFriendsList();
}

function closeFriends() {
  $("friendsOverlay").classList.add("hidden");
}

// Renderuje dane profilu — własnego (readOnly=false) lub cudzego (readOnly=true).
function renderProfileData(data, readOnly) {
  // Nagłówek: zdjęcie profilowe + imię.
  $("profileName").textContent = readOnly
    ? data.user.displayName
    : t("hi", { name: data.user.displayName });
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
  $("avatarBtn").disabled = readOnly; // cudzego zdjęcia nie zmieniasz
  $("avatarBtn").title = readOnly ? "" : t("changePhoto");
  $("followProfileBtn").classList.toggle("hidden", !readOnly);

  // Liczniki obserwacji pod imieniem.
  const fo = data.followersCount ?? 0;
  const fw = data.followingCount ?? 0;
  $("profileCounts").textContent = t("counts", { fo, fw });

  // 3. kolumna: własny profil = portret gustu + feed znajomych, cudzy = porównanie.
  $("profileFeed").classList.toggle("hidden", readOnly);
  $("comparePanel").classList.toggle("hidden", !readOnly);
  $("tastePanel").classList.toggle("hidden", readOnly); // portret tylko na własnym profilu

  // Top 4 = przypięte (favorite).
  const top = data.reviews.filter((r) => r.favorite).slice(0, 4);
  const topBox = $("topMedia");
  topBox.innerHTML = "";
  if (top.length === 0) {
    topBox.innerHTML = `<p class="muted">${readOnly ? t("top4EmptyRO") : t("top4Empty")}</p>`;
  } else {
    // Muzyka w Top 4 jako prostokąt 2:3 (rect), nie kwadrat.
    for (const r of top) appendCard(topBox, r.media, r.rating, undefined, true);
  }

  // Lista „do obejrzenia/zagrania" — do 6 (3×2), reszta pod „Zobacz wszystko".
  const watch = data.watchlist || [];
  const watchBox = $("watchlist");
  watchBox.innerHTML = "";
  if (watch.length === 0) {
    watchBox.innerHTML = `<p class="muted">${readOnly ? t("watchEmptyRO") : t("watchEmpty")}</p>`;
  } else {
    for (const w of watch.slice(0, 6)) appendCard(watchBox, w.media, undefined);
  }
  const watchSeeAll = $("watchSeeAll");
  if (watch.length > 6) {
    watchSeeAll.classList.remove("hidden");
    watchSeeAll.textContent = t("seeAll", { n: watch.length });
    watchSeeAll.onclick = () => openSeeAll(t("watchlistTitle"), watch);
  } else {
    watchSeeAll.classList.add("hidden");
  }

  // Prawa strona: ocenione pogrupowane po kategoriach.
  renderRatedByCat(data.reviews, readOnly);

  // Moje komentarze (recenzje z tekstem) — lewy dół, tylko własny profil.
  $("myCommentsWrap").classList.toggle("hidden", readOnly);
  if (!readOnly) renderMyComments(data.reviews);
}

// Lista Twoich recenzji z komentarzem: plakat + tytuł + ocena + tekst.
function renderMyComments(reviews) {
  const box = $("myComments");
  box.innerHTML = "";
  const withText = reviews.filter((r) => r.media && (r.text || "").trim());
  if (withText.length === 0) {
    box.innerHTML = `<p class="muted">${t("myCommentsEmpty")}</p>`;
    return;
  }
  for (const r of withText) {
    const item = document.createElement("article");
    item.className = "comment-item";

    const poster = document.createElement("div");
    poster.className = "comment-poster";
    if (r.media.posterUrl) {
      const img = document.createElement("img");
      img.src = r.media.posterUrl;
      img.alt = r.media.title;
      img.loading = "lazy";
      poster.append(img);
    } else {
      poster.textContent = r.media.title[0] || "?";
    }

    const body = document.createElement("div");
    body.className = "comment-body";
    const head = document.createElement("div");
    head.className = "comment-head";
    const title = document.createElement("span");
    title.className = "comment-title";
    title.textContent = r.media.title;
    const rating = document.createElement("span");
    rating.className = "comment-rating";
    rating.textContent = `★ ${r.rating}`;
    head.append(title, rating);
    const text = document.createElement("p");
    text.className = "comment-text";
    text.textContent = r.text;
    body.append(head, text);

    item.append(poster, body);
    item.addEventListener("click", () =>
      openDetail(toDetail(r.media, r.media.type, r.media.id, r.rating)),
    );
    box.append(item);
  }
}

async function loadProfile() {
  const data = await loadMe();
  renderProfileData(
    { user: data.user, reviews: data.reviews, watchlist: data.watchlist },
    false,
  );
  loadActivity();
  loadTastePortrait();
}

// Enum rodzaju mediów → etykieta (z emoji) z i18n.
const TYPE_I18N = {
  FILM: "typeFilm",
  SERIAL: "typeFilm",
  KSIAZKA: "typeBook",
  MANGA: "typeManga",
  ANIME: "typeAnime",
  MUZYKA: "typeMusic",
  GRA: "typeGame",
};

async function loadTastePortrait() {
  const box = $("tasteBody");
  box.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    renderPortrait(await api("/me/taste-portrait"));
  } catch (e) {
    box.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Rysuje portret gustu: surowość + paski top gatunków/rodzajów + ulubiona dekada.
function renderPortrait(p) {
  const box = $("tasteBody");
  box.innerHTML = "";
  if (!p || p.reviewCount < 3) {
    box.innerHTML = `<p class="muted">${t("portraitEmpty")}</p>`;
    return;
  }

  const harsh = document.createElement("p");
  harsh.className = "taste-harsh";
  let word = t("harshBalanced");
  const g = p.globalBaseline;
  if (g !== null && g !== undefined && p.baseline >= g + 0.5) word = t("harshMild");
  else if (g !== null && g !== undefined && p.baseline <= g - 0.5) word = t("harshTough");
  const cmp = g !== null && g !== undefined ? ` · ${t("siteAvg")}: ${g}` : "";
  harsh.innerHTML = `${word} <span class="muted">(${t("yourAvg")}: ${p.baseline}${cmp})</span>`;
  box.append(harsh);

  const byCount = (arr) => [...arr].sort((a, b) => b.count - a.count);

  const section = (label, affs, fmt) => {
    if (!affs.length) return;
    const head = document.createElement("div");
    head.className = "taste-sec-label";
    head.textContent = label;
    box.append(head);
    const max = Math.max(...affs.map((a) => a.count));
    for (const a of affs) {
      const row = document.createElement("div");
      row.className = "taste-bar";
      const name = document.createElement("span");
      name.className = "taste-bar-name";
      name.textContent = fmt ? fmt(a.key) : a.key;
      const track = document.createElement("span");
      track.className = "taste-bar-track";
      const fill = document.createElement("span");
      fill.className = "taste-bar-fill";
      fill.style.width = `${Math.round((a.count / max) * 100)}%`;
      track.append(fill);
      const val = document.createElement("span");
      val.className = "taste-bar-val";
      val.textContent = a.count;
      row.append(name, track, val);
      box.append(row);
    }
  };

  section(t("topGenres"), byCount(p.genres).slice(0, 5));
  section(t("topTypes"), byCount(p.types).slice(0, 4), (k) => t(TYPE_I18N[k] || "") || k);

  const topDecade = byCount(p.decades)[0];
  if (topDecade) {
    const d = document.createElement("p");
    d.className = "taste-highlight";
    d.textContent = t("favDecade", { decade: topDecade.key });
    box.append(d);
  }
}

async function loadUserProfile(id) {
  const [data, following] = await Promise.all([
    api(`/users/${id}/profile`),
    api("/me/following").catch(() => []),
  ]);
  viewingName = data.user.displayName;
  renderProfileData(data, true);
  setFollowBtn(following.some((u) => u.id === id));
  loadCompare(id);
}

function setFollowBtn(on) {
  const btn = $("followProfileBtn");
  btn.classList.toggle("active", on);
  btn.textContent = on ? t("following") : t("follow");
}

// Porównanie gustu z oglądanym userem: % dopasowania + wspólnie ocenione tytuły.
async function loadCompare(id) {
  const body = $("compareBody");
  body.innerHTML = '<p class="muted small">Liczenie…</p>';
  try {
    const data = await api(`/users/${id}/compare`);
    body.innerHTML = "";
    if (data.status !== "OK") {
      body.innerHTML = `<p class="muted small">${t("notEnough", { n: data.shared })}</p>`;
      return;
    }
    const score = document.createElement("div");
    score.className = "match-score";
    const pct = document.createElement("span");
    pct.className = "match-pct";
    pct.textContent = `${data.score}%`;
    const cap = document.createElement("span");
    cap.className = "match-cap";
    cap.textContent = t("matchCap", { n: data.sharedCount });
    score.append(pct, cap);
    body.append(score);
    for (const s of data.shared) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "compare-row";
      const titleEl = document.createElement("div");
      titleEl.className = "compare-title";
      titleEl.textContent = s.media.title;
      const rates = document.createElement("div");
      rates.className = "compare-rates";
      const you = document.createElement("span");
      you.className = "cr-you";
      you.textContent = `${t("you")} ★${s.myRating}`;
      const them = document.createElement("span");
      them.className = "cr-them";
      them.textContent = `${viewingName} ★${s.theirRating}`;
      rates.append(you, them);
      row.append(titleEl, rates);
      row.addEventListener("click", () =>
        openDetail(toDetail(s.media, s.media.type, s.media.id, s.myRating)),
      );
      body.append(row);
    }
  } catch (e) {
    body.innerHTML = `<p class="muted small">${e.message}</p>`;
  }
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
    toast(t("savedPhoto"));
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

  const genresBox = $("detailGenres");
  genresBox.innerHTML = "";
  for (const g of item.genres ?? []) {
    const chip = document.createElement("span");
    chip.className = "genre-chip";
    chip.textContent = g;
    genresBox.append(chip);
  }

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
  $("detailDesc").textContent = t("loadingDesc");
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
        $("detailDesc").textContent = d.description || t("noDesc");
      })
      .catch(() => {
        $("detailDesc").textContent = t("noDesc");
      });
  } else {
    $("detailDesc").textContent = t("noDesc");
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
  $("favBtn").textContent = isFav ? t("favActive") : t("fav");
  $("watchBtn").classList.toggle("active", onWatch);
  $("watchBtn").textContent = onWatch ? t("watchActive") : t("watchAdd");
  // „Usuń ocenę" tylko gdy JEST co usuwać — inaczej przycisk myli.
  $("deleteBtn").classList.toggle("hidden", !rev);
  $("deleteBtn").textContent = t("deleteReview");
}

// Usuwa Twoją ocenę + komentarz tego tytułu (po potwierdzeniu). Znika też z TOP 4
// i z katalogu, bo katalog to właśnie lista Twoich ocen.
async function deleteDetailReview() {
  const mid = detailCtx?.mediaId;
  const rev = mid ? myProfile.reviews.find((r) => r.media.id === mid) : null;
  if (!rev) return;
  if (!window.confirm(t("confirmDeleteReview", { title: detailCtx.title }))) return;

  $("detailMsg").textContent = "";
  try {
    await api(`/reviews/${rev.id}`, { method: "DELETE" });
    toast(t("deletedReview"));
    detailStars.set(0);
    $("detailComment").value = "";
    await loadMe();
    await Promise.all([
      loadRecommendations(),
      loadCatalog(),
      loadTasteRecommendations(), // mniej ocen → inny gust
    ]);
    updateDetailButtons();
    loadDetailReviews(mid);
  } catch (e) {
    $("detailMsg").textContent = e.message;
  }
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
    toast(t("rateFirst"));
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
    toast(t(rev.favorite ? "removedTop4" : "addedTop4"));
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
    toast(t(onWatch ? "removedList" : "addedList"));
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
      box.innerHTML = `<p class="muted">${t("noComments")}</p>`;
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
    $("detailMsg").textContent = t("pickRating");
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
    toast(t("saved"));
    await loadMe();
    // „Pod Twój gust" odświeży się przy powrocie na główną (closeDetail) — bez
    // ocenionego tytułu i z rotacją. Tu tylko katalog i polecenia od znajomych.
    await Promise.all([loadRecommendations(), loadCatalog()]);
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
    if (viewingUserId) openUserProfile(viewingUserId);
    else openProfile();
    return;
  }
  $("topBack").classList.add("hidden");
  $("searchbar").classList.remove("hidden");
  $("searchResults").classList.toggle("hidden", detailReturn !== "results");
  $("browse").classList.toggle("hidden", detailReturn === "results");
  // Powrót na stronę główną → rotacja (i usunięcie właśnie ocenionego tytułu).
  if (me && detailReturn !== "results") loadTasteRecommendations();
}

// --- Profil (własny lub cudzy, osobna strona) ---
function showProfileShell() {
  closeSeeAll();
  closeFriends();
  $("searchbar").classList.add("hidden");
  $("searchResults").classList.add("hidden");
  $("browse").classList.add("hidden");
  $("detailView").classList.add("hidden");
  $("profileView").classList.remove("hidden");
  $("topBack").classList.remove("hidden");
  window.scrollTo(0, 0);
}

async function openProfile() {
  viewingUserId = null;
  showProfileShell();
  await loadProfile();
}

async function openUserProfile(id) {
  if (!id || id === me.id) return openProfile();
  viewingUserId = id;
  showProfileShell();
  try {
    await loadUserProfile(id);
  } catch (e) {
    toast(e.message);
  }
}

function closeProfile() {
  viewingUserId = null;
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
  // Reset do strony głównej — po (ponownym) logowaniu nie zostawaj na starym
  // widoku (np. czyimś profilu) z ukrytym „Wróć".
  viewingUserId = null;
  $("profileView").classList.add("hidden");
  $("detailView").classList.add("hidden");
  $("searchResults").classList.add("hidden");
  $("topBack").classList.add("hidden");
  $("searchbar").classList.remove("hidden");
  $("browse").classList.remove("hidden");
  $("hello").textContent = `Cześć, ${me.displayName}`;
  await loadMe(); // katalog i profil czytają myProfile — najpierw je pobierz
  loadFollowers(); // licznik powiadomień (nowi obserwujący)
  await Promise.all([loadTasteRecommendations(), loadRecommendations(), loadCatalog()]);
}

function logout() {
  clearToken();
  showAuth();
}

function setAuthMode(mode) {
  authMode = mode;
  const login = mode === "login";
  $("displayName").classList.toggle("hidden", login);
  $("authSubmit").textContent = login ? t("login") : t("register");
  $("switchText").textContent = login ? t("noAccount") : t("haveAccount");
  $("switchBtn").textContent = login ? t("register") : t("login");
  $("password").placeholder = login ? t("passwordPh") : t("passwordPhNew");
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
  $("deleteBtn").addEventListener("click", deleteDetailReview);
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
  $("settingsBtn").addEventListener("click", openSettings);
  $("settingsClose").addEventListener("click", closeSettings);
  $("settingsOverlay").addEventListener("click", (e) => {
    if (e.target === $("settingsOverlay")) closeSettings();
  });
  $("friendsBtn").addEventListener("click", openFriends);
  $("friendsClose").addEventListener("click", closeFriends);
  $("friendsSearch").addEventListener("input", drawFriends);
  $("notifBtn").addEventListener("click", openNotif);
  $("notifClose").addEventListener("click", closeNotif);
  $("notifOverlay").addEventListener("click", (e) => {
    if (e.target === $("notifOverlay")) closeNotif();
  });
  $("followProfileBtn").addEventListener("click", async () => {
    if (!viewingUserId) return;
    const on = $("followProfileBtn").classList.contains("active");
    try {
      if (on) {
        await api(`/me/follow/${viewingUserId}`, { method: "DELETE" });
      } else {
        await api("/me/follow", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: viewingUserId }),
        });
      }
      setFollowBtn(!on);
    } catch (e) {
      toast(e.message);
    }
  });
  $("friendsOverlay").addEventListener("click", (e) => {
    if (e.target === $("friendsOverlay")) closeFriends();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("settingsOverlay").classList.contains("hidden")) closeSettings();
    else if (!$("notifOverlay").classList.contains("hidden")) closeNotif();
    else if (!$("friendsOverlay").classList.contains("hidden")) closeFriends();
    else if (!$("seeAllOverlay").classList.contains("hidden")) closeSeeAll();
    else if (!$("detailView").classList.contains("hidden")) closeDetail();
  });
  $("pwToggle").innerHTML = pwIcon(false);
  $("pwToggle").addEventListener("click", () => {
    const pw = $("password");
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    $("pwToggle").innerHTML = pwIcon(show);
    $("pwToggle").setAttribute(
      "aria-label",
      show ? t("hidePassword") : t("showPassword"),
    );
  });
  applyStaticI18n();
  applySearchPlaceholder();
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
    `<p class="muted">${t("connectError", { msg: e.message })}</p>`;
});
