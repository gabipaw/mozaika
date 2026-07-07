// Frontend Mozaiki — plakaty + wyszukiwarka TMDB. Woła API pod /api/*.

const $ = (id) => document.getElementById(id);
let allMedia = [];
let searchTimer = null;

async function api(path, options) {
  const res = await fetch(`/api${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Błąd API");
  return data;
}

const currentUserId = () => Number($("user").value);

function fillSelect(select, users) {
  select.innerHTML = "";
  for (const u of users) {
    const opt = document.createElement("option");
    opt.value = String(u.id);
    opt.textContent = u.displayName;
    select.append(opt);
  }
}

function toast(msg) {
  const t = $("reviewMsg");
  t.textContent = msg;
  t.classList.add("show");
  window.setTimeout(() => t.classList.remove("show"), 2200);
}

// Wspólna „karta plakatu" — używana w katalogu, wynikach TMDB i rekomendacjach.
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
function renderGrid(list, onRate, addLabel) {
  const grid = $("catalog");
  grid.innerHTML = "";
  if (list.length === 0) {
    grid.innerHTML = '<p class="muted">Nic nie znaleziono.</p>';
    return;
  }
  for (const m of list) {
    const { card, meta } = posterCard(m);
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
    grid.append(card);
  }
}

async function loadCatalog() {
  allMedia = await api("/media");
  $("catalogTitle").textContent = "Katalog";
  renderGrid(allMedia, (m, rating) => rateMedia(m.id, rating), "Oceń");
}

async function runSearch(q) {
  $("catalogTitle").textContent = `Wyniki z TMDB: „${q}”`;
  const grid = $("catalog");
  grid.innerHTML = '<p class="muted">Szukam…</p>';
  try {
    const results = await api(`/search?q=${encodeURIComponent(q)}`);
    renderGrid(results, (m, rating) => addAndRate(m.externalId, rating), "Dodaj i oceń");
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
    const recs = await api(`/users/${currentUserId()}/recommendations`);
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
      row.append(card);
    }
  } catch (e) {
    row.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

async function rateMedia(mediaId, rating) {
  try {
    await api("/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: currentUserId(), mediaId, rating }),
    });
    toast("✅ Zapisano ocenę");
    loadRecommendations();
  } catch (e) {
    toast(`⚠️ ${e.message}`);
  }
}

// Dodaje film z TMDB do katalogu, potem zapisuje ocenę.
async function addAndRate(externalId, rating) {
  try {
    const media = await api("/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ externalId }),
    });
    await rateMedia(media.id, rating);
    toast("✅ Dodano i oceniono");
  } catch (e) {
    toast(`⚠️ ${e.message}`);
  }
}

async function showMatch() {
  const out = $("matchResult");
  try {
    const m = await api(
      `/users/${currentUserId()}/taste-match/${Number($("other").value)}`,
    );
    out.textContent =
      m.status === "OK" ? `${m.score}%` : `za mało danych (${m.shared}/${m.minShared})`;
  } catch (e) {
    out.textContent = e.message;
  }
}

async function init() {
  const users = await api("/users");
  fillSelect($("user"), users);
  fillSelect($("other"), users);
  if (users.length > 1) $("other").selectedIndex = 1;

  $("user").addEventListener("change", loadRecommendations);
  $("search").addEventListener("input", onSearchInput);
  $("matchBtn").addEventListener("click", showMatch);

  await Promise.all([loadRecommendations(), loadCatalog()]);
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
