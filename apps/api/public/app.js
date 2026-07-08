// Frontend Mozaiki — logowanie (JWT), profil, plakaty, wyszukiwarka TMDB.

const $ = (id) => document.getElementById(id);
let allMedia = [];
let searchTimer = null;
let me = null;
let authMode = "login";

const getToken = () => localStorage.getItem("mozaika_token");
const setToken = (t) => localStorage.setItem("mozaika_token", t);
const clearToken = () => localStorage.removeItem("mozaika_token");

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
  poster.className = "poster";
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

// Siatka kart z kontrolką oceny. onRate(item, rating) decyduje co się dzieje.
function renderGrid(container, list, onRate, addLabel) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = '<p class="muted">Nic nie znaleziono.</p>';
    return;
  }
  for (const m of list) {
    const { card, meta } = posterCard(m, { score: m.myRating });
    const rate = document.createElement("div");
    rate.className = "rate";
    const sel = document.createElement("select");
    for (let n = 1; n <= 10; n += 1) {
      const o = document.createElement("option");
      o.value = String(n);
      o.textContent = String(n);
      if (n === 8) o.selected = true;
      sel.append(o);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = addLabel;
    btn.addEventListener("click", () => onRate(m, Number(sel.value)));
    rate.append(sel, btn);
    meta.append(rate);
    container.append(card);
  }
}

async function loadCatalog() {
  allMedia = await api("/media");
  $("catalogTitle").textContent = "Katalog";
  renderGrid($("catalog"), allMedia, (m, rating) => rateMedia(m.id, rating), "Oceń");
}

async function runSearch(q) {
  $("catalogTitle").textContent = `Wyniki z TMDB: „${q}”`;
  const grid = $("catalog");
  grid.innerHTML = '<p class="muted">Szukam…</p>';
  try {
    const results = await api(`/search?q=${encodeURIComponent(q)}`);
    renderGrid(
      grid,
      results,
      (m, rating) => addAndRate(m.externalId, rating),
      "Dodaj i oceń",
    );
  } catch (e) {
    grid.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

function onSearchInput() {
  const q = $("search").value.trim();
  window.clearTimeout(searchTimer);
  if (!q) {
    loadCatalog();
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
      row.append(
        posterCard(r, { score: r.score, recby: `poleca ${r.recommenders.length} os.` })
          .card,
      );
    }
  } catch (e) {
    row.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

async function loadProfile() {
  const data = await api("/me");
  const box = $("myReviews");
  $("profileStats").textContent = data.count
    ? `Ocen: ${data.count} · średnia Twoja ocena: ${data.avg}/10`
    : "Nie masz jeszcze ocen — oceń coś z katalogu poniżej.";
  box.innerHTML = "";
  for (const r of data.reviews) {
    box.append(posterCard(r.media, { score: r.rating }).card);
  }
}

async function rateMedia(mediaId, rating) {
  try {
    await api("/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId, rating }),
    });
    toast("✅ Zapisano ocenę");
    loadProfile();
    loadRecommendations();
  } catch (e) {
    toast(`⚠️ ${e.message}`);
  }
}

async function addAndRate(externalId, rating) {
  try {
    const media = await api("/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ externalId }),
    });
    await rateMedia(media.id, rating);
  } catch (e) {
    toast(`⚠️ ${e.message}`);
  }
}

async function loadOthers() {
  const users = await api("/users");
  const other = $("other");
  other.innerHTML = "";
  for (const u of users) {
    if (me && u.id === me.id) continue;
    const o = document.createElement("option");
    o.value = String(u.id);
    o.textContent = u.displayName;
    other.append(o);
  }
}

async function showMatch() {
  const out = $("matchResult");
  try {
    const m = await api(`/users/${me.id}/taste-match/${Number($("other").value)}`);
    out.textContent =
      m.status === "OK" ? `${m.score}%` : `za mało danych (${m.shared}/${m.minShared})`;
  } catch (e) {
    out.textContent = e.message;
  }
}

// --- Widoki: logowanie vs aplikacja ---
function showAuth() {
  me = null;
  $("appView").classList.add("hidden");
  $("userBox").classList.add("hidden");
  $("authView").classList.remove("hidden");
}

async function showApp() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("userBox").classList.remove("hidden");
  $("hello").textContent = `Cześć, ${me.displayName}`;
  await Promise.all([loadProfile(), loadRecommendations(), loadCatalog(), loadOthers()]);
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
  $("hello").addEventListener("click", () => {
    $("profile").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("search").addEventListener("input", onSearchInput);
  $("matchBtn").addEventListener("click", showMatch);
  $("pwToggle").addEventListener("click", () => {
    const pw = $("password");
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    $("pwToggle").textContent = show ? "🙈" : "👁";
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
