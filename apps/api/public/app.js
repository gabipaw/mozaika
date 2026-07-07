// Frontend Mozaiki — woła API pod /api/* i renderuje wynik. Waniliowy JS.

const $ = (id) => document.getElementById(id);

async function api(path, options) {
  const res = await fetch(`/api${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Błąd API");
  return data;
}

function currentUserId() {
  return Number($("user").value);
}

function fillSelect(select, users) {
  select.innerHTML = "";
  for (const u of users) {
    const opt = document.createElement("option");
    opt.value = String(u.id);
    opt.textContent = u.displayName;
    select.append(opt);
  }
}

async function loadRecommendations() {
  const list = $("recs");
  list.innerHTML = '<li class="muted">Ładowanie…</li>';
  try {
    const recs = await api(`/users/${currentUserId()}/recommendations`);
    if (recs.length === 0) {
      list.innerHTML = '<li class="muted">Brak — za mało podobnych użytkowników.</li>';
      return;
    }
    list.innerHTML = "";
    for (const r of recs) {
      const li = document.createElement("li");
      const rok = r.year ? ` (${r.year})` : "";
      li.innerHTML =
        `<span class="title">${r.title}${rok}</span>` +
        `<span class="badge">${r.score}/10</span>` +
        `<div class="sub">poleca ${r.recommenders.length} os. o podobnym guście</div>`;
      list.append(li);
    }
  } catch (e) {
    list.innerHTML = `<li class="muted">${e.message}</li>`;
  }
}

async function loadCatalog() {
  const list = $("catalog");
  const media = await api("/media");
  list.innerHTML = "";
  for (const m of media) {
    const li = document.createElement("li");
    const rok = m.year ? ` (${m.year})` : "";
    const select = document.createElement("select");
    for (let n = 1; n <= 10; n += 1) {
      const opt = document.createElement("option");
      opt.value = String(n);
      opt.textContent = String(n);
      if (n === 8) opt.selected = true;
      select.append(opt);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Oceń";
    btn.addEventListener("click", () => rate(m.id, Number(select.value)));

    const row = document.createElement("div");
    row.className = "row";
    row.append(select, btn);

    li.innerHTML = `<span class="title">${m.title}${rok}</span>`;
    li.append(row);
    list.append(li);
  }
}

async function rate(mediaId, rating) {
  const msg = $("reviewMsg");
  try {
    await api("/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: currentUserId(), mediaId, rating }),
    });
    msg.textContent = "✅ Zapisano ocenę.";
    loadRecommendations();
  } catch (e) {
    msg.textContent = `⚠️ ${e.message}`;
  }
}

async function showMatch() {
  const result = $("matchResult");
  const a = currentUserId();
  const b = Number($("other").value);
  try {
    const m = await api(`/users/${a}/taste-match/${b}`);
    result.textContent =
      m.status === "OK"
        ? `${m.score}% zgodności (wspólnych tytułów: ${m.shared})`
        : `Za mało danych (wspólnych: ${m.shared}, wymagane: ${m.minShared}).`;
  } catch (e) {
    result.textContent = `⚠️ ${e.message}`;
  }
}

async function init() {
  const users = await api("/users");
  fillSelect($("user"), users);
  fillSelect($("other"), users);
  if (users.length > 1) $("other").selectedIndex = 1;

  $("user").addEventListener("change", loadRecommendations);
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
