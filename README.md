# Mozaika

**Mozaika** to aplikacja biznesowa — platforma recenzji **wszystkich mediów naraz**
(film / serial / książka / gra / muzyka) w jednym miejscu. Zbudowana na pełnym stacku
(Node.js + TypeScript, PostgreSQL + Prisma, monorepo Turbo) z kompletem bramek jakości.

## Problem

Serwisy z recenzjami są zwykle osobne dla każdego medium (film osobno, książki osobno).
Mozaika je łączy: jeden profil to **„portret gustu"** złożony z ocen różnych mediów.
Na tym opiera się funkcja sygnaturowa — **Dopasowanie gustu**: liczy % zgodności między
użytkownikami z ich wspólnie ocenionych tytułów, a na tej podstawie generuje
**rekomendacje** („ludzie o podobnym guście polecają Ci tytuł, którego jeszcze nie znasz").

## Funkcje

- **Katalog mediów** — jedna uniwersalna tabela `Media` (pole `type`) na wszystkie rodzaje.
- **Recenzje z regułami** — ocena 1–10, walidacja przed zapisem, jeden użytkownik = jedna ocena tytułu.
- **Dopasowanie gustu** — % zgodności dwóch użytkowników (reguła: min. 3 wspólne oceny).
- **Rekomendacje** — tytuły od użytkowników o podobnym guście, których cel jeszcze nie ocenił.
- **HTTP API (Hono)** — operacje wystawione pod `/api/*`, błędy mapowane na kody HTTP.
- **Aplikacja webowa (PWA)** — mobilna strona wołająca API, instalowalna na telefonie.

## Narzędzia (cały stack) — i po co

| Narzędzie       | Rola         | Po co w Mozaice                                       |
| --------------- | ------------ | ----------------------------------------------------- |
| **Node.js**     | runtime      | uruchamia backend                                     |
| **TypeScript**  | język + typy | łapie błędy przed uruchomieniem (tryb `strict`)       |
| **tsx**         | runner       | uruchamia `.ts` bez ręcznej kompilacji                |
| **Turborepo**   | monorepo     | orkiestruje zadania (build / test / lint / typecheck) |
| **PostgreSQL**  | baza danych  | trwałe dane: użytkownicy, media, recenzje             |
| **Prisma**      | ORM          | schemat, migracje, typowane zapytania                 |
| **ESLint**      | linter       | wykrywa błędy i antywzorce w kodzie                   |
| **Prettier**    | formatter    | ujednolica styl (wcięcia, cudzysłowy)                 |
| **Husky**       | git hooks    | pre-commit uruchamia bramki automatycznie             |
| **lint-staged** | runner hooka | odpala narzędzia tylko na plikach z commita           |
| **jscpd**       | duplikaty    | pilnuje niskiego poziomu „kopiuj-wklej"               |
| **secretlint**  | sekrety      | blokuje wyciek haseł / kluczy do repo                 |

## Struktura

```
mozaika/
├─ package.json          # root: workspaces + skrypty + lint-staged
├─ turbo.json            # zadania monorepo (build / test / lint / typecheck …)
├─ tsconfig.base.json    # wspólna konfiguracja TypeScript
├─ eslint.config.mjs     # reguły ESLint (flat config)
├─ .prettierrc.json      # reguły Prettier
├─ .jscpd.json           # próg duplikatów kodu
├─ .secretlintrc.json    # reguły secretlint
├─ .husky/pre-commit     # bramka jakości przed commitem
└─ apps/
   └─ api/               # backend — Mozaika API
      ├─ prisma/
      │  ├─ schema.prisma  # modele User, Media, Review (+ enum MediaType)
      │  └─ seed.ts        # dane startowe (filmy z TMDB)
      ├─ public/            # frontend PWA (index.html, app.js, manifest, service worker, ikony)
      └─ src/
         ├─ db.ts          # współdzielony klient Prisma
         ├─ errors.ts      # błędy domenowe (Validation / NotFound)
         ├─ server.ts      # serwer HTTP (Hono) — API /api/* + serwuje PWA
         ├─ index.ts       # demo logiki w terminalu
         └─ logic/         # reviews, tasteMatch, recommendations (+ testy)
```

Katalog `apps/*` (i przyszły `packages/*`) to workspace'y npm, którymi zarządza Turbo.

## Baza danych

Model danych: **User** 1→N **Review** N←1 **Media**. Tabela `Media` ma pole `type`
(FILM / SERIAL / KSIAZKA / GRA / MUZYKA), więc jedna struktura obsługuje wszystkie media.
Oceny w skali **1–10**; jeden użytkownik ma najwyżej jedną recenzję danego tytułu.

Potrzebny jest PostgreSQL. W `apps/api/.env` ustaw dwa połączenia:

- `DATABASE_URL` — pooler transakcyjny (port 6543), używa aplikacja,
- `DIRECT_URL` — połączenie bezpośrednie (port 5432), używa Prisma do migracji.

Connection stringi znajdziesz w Supabase → **Connect → ORMs → Prisma**.
Plik `.env` jest w `.gitignore` (i `.secretlintignore`) — sekrety nie trafiają do repo.

## Logika biznesowa (serce aplikacji)

Cała logika w `apps/api/src/logic/` — czyste funkcje (łatwe do testów) oddzielone od bazy.

**Dodaj recenzję** (`addReview`) — zapis z regułami, walidacja PRZED bazą:

- ocena musi być liczbą całkowitą **1–10**,
- użytkownik i tytuł muszą istnieć,
- **jeden użytkownik = jedna ocena tytułu** (ponowna ocena aktualizuje poprzednią).

**Dopasowanie gustu** (`tasteMatch`) — funkcja sygnaturowa: dla dwóch użytkowników
liczy **% zgodności** z ich wspólnie ocenionych tytułów:
`score = 100 × (1 − średnia_różnica_ocen / 9)` (identyczne oceny = 100%).
Reguła: potrzeba **min. 3 wspólnie ocenionych tytułów**, inaczej wynik „za mało danych".

Demo (`npm run demo`) pokazuje te przepływy na żywo z bazy, w tym odrzucenie błędnej oceny
i rekomendacje. Testy logiki: `npm test` (wbudowany `node:test`, bez bazy).

## Jakość kodu (ESLint + Prettier)

Dwa różne narzędzia, dwa różne zadania:

- **ESLint** (`eslint.config.mjs`) — **linter**: wykrywa błędy i antywzorce (np. nieużywane
  zmienne, `==` zamiast `===`, `var`). Reguły: `@eslint/js` recommended + `typescript-eslint`
  recommended + kilka własnych; `eslint-config-prettier` wyłącza reguły kolidujące z Prettierem.
- **Prettier** (`.prettierrc.json`) — **formatter**: automatycznie ujednolica styl (wcięcia,
  cudzysłowy, przecinki). Nie szuka błędów — tylko formatuje.

Skrypty:

```bash
npm run lint          # eslint .            — 0 błędów
npm run lint:fix      # eslint . --fix      — auto-naprawa
npm run format        # prettier --write .  — sformatuj wszystko
npm run format:check  # prettier --check .  — sprawdź spójność
```

Dowód, że lint przechodzi bez błędów (wszystkie pliki `.ts`, 0 problemów):

```
$ npm run lint
> eslint .
$ echo $?
0
$ npm run format:check
Checking formatting...
All matched files use Prettier code style!
```

## Automatyzacja: git hooks (Husky)

**Git hooks** to skrypty, które git odpala przy zdarzeniach (np. przed commitem).
**Husky** podpina je w repo (katalog `.husky/`), a **lint-staged** uruchamia narzędzia
tylko na plikach z danego commita (szybko, bez skanowania całego repo).

**pre-commit** (`.husky/pre-commit`) uruchamia `lint-staged`, który na plikach z commita:

- `*.ts` → **ESLint** (błędy lintu) + **Prettier --check** (spójny format),
- `*.{js,mjs,json,md}` → **Prettier --check**.

Jeśli którekolwiek sprawdzenie nie przejdzie, **commit jest blokowany** — wadliwy lub
niesformatowany kod nie wejdzie do repozytorium. Hooki instalują się same przy
`npm install` (skrypt `prepare: husky`).

Dowód (próba commita kodu z `==` i nieużywaną zmienną):

```
$ git commit -m "..."
🔍 pre-commit: sprawdzam pliki z commita (ESLint + Prettier)...
✖ eslint:
  1:7  error  'nieuzywana' is assigned a value but never used   @typescript-eslint/no-unused-vars
  2:7  error  Expected '===' and instead saw '=='                eqeqeq
husky - pre-commit script failed (code 1)
# commit ZABLOKOWANY — nic nie trafiło do repo
```

## Higiena i bezpieczeństwo (jscpd + secretlint)

- **jscpd** (`.jscpd.json`) — wykrywa **duplikaty kodu** („kopiuj-wklej"). Próg: **1%**
  (powyżej — błąd). Aktualny poziom duplikacji: **0%** (kod jest DRY dzięki współdzielonemu
  klientowi Prisma i wydzielonym funkcjom). Uruchom: `npm run dupcheck`.
- **secretlint** (`.secretlintrc.json`, preset `recommend`) — skanuje pliki pod kątem
  **sekretów** (tokeny API, hasła, klucze). Uruchom na całym repo: `npm run secretcheck`.
  Plik `.env` jest w `.secretlintignore` (trzyma prawdziwy `DATABASE_URL`, nie może blokować commitów).

Oba podpięte do **pre-commit** (`.husky/pre-commit`): secretlint przez `lint-staged` na
plikach z commita, jscpd jako skan duplikatów. Commit z sekretem jest **blokowany**.

Dowód (próba commita z fałszywym tokenem Slack):

```
$ git commit -m "..."
✖ secretlint:
  2:3  error  [SLACK_TOKEN] found slack token: ***   @secretlint/secretlint-rule-slack
husky - pre-commit script failed (code 1)
# commit ZABLOKOWANY — sekret nie trafił do repo
```

## Rekomendacje przez dopasowanie gustu

`recommendations(userId)` (`apps/api/src/logic/recommendations.ts`) poleca tytuły
w oparciu o **podobieństwo gustu**: znajduje użytkowników z wysokim `tasteMatch`
(≥ 60%), bierze tytuły, które ocenili wysoko (≥ 7), a których cel jeszcze **nie ocenił**,
i sortuje je po przewidywanej ocenie (średnia ważona % dopasowania). Reużywa
`computeTasteMatch`; czysta część (`computeRecommendations`) ma testy jednostkowe.

## API HTTP (Hono)

Serwer (`apps/api/src/server.ts`) serwuje **frontend PWA** (spod `/`) oraz **API** (spod
`/api/*`) — z jednego procesu, więc bez CORS. Uruchom: `npm start` (lub `npm run dev`
z auto-reloadem). Domyślny port `3000` (zmienny przez `PORT`).

| Metoda + ścieżka                     | Opis                                  |
| ------------------------------------ | ------------------------------------- |
| `GET /api/health`                    | status serwera                        |
| `GET /api/users`                     | lista użytkowników                    |
| `GET /api/media`                     | katalog tytułów                       |
| `POST /api/reviews`                  | dodaj/aktualizuj recenzję (body JSON) |
| `GET /api/users/:a/taste-match/:b`   | dopasowanie gustu dwóch użytkowników  |
| `GET /api/users/:id/recommendations` | rekomendacje dla użytkownika          |

Błędy domenowe mapują się na kody HTTP: walidacja → **400**, brak zasobu → **404**.

```bash
curl localhost:3000/api/users/1/recommendations
curl -X POST localhost:3000/api/reviews -H "content-type: application/json" \
  -d '{"userId":1,"mediaId":2,"rating":9}'
```

## Frontend PWA (instalowalny na telefonie)

Pod `/` działa prosta strona (`apps/api/public/`) wołająca API — pokazuje rekomendacje,
liczy dopasowanie gustu i pozwala oceniać tytuły. To **PWA**: ma `manifest.webmanifest`,
`service-worker.js` (cache powłoki, działa offline) i ikony, więc na telefonie można ją
**„Dodać do ekranu głównego"** i uruchamiać jak natywną apkę (wymaga HTTPS — daje go hosting).

## Wdrożenie (Render)

Repo zawiera `render.yaml` (Blueprint). W panelu Render: **New → Blueprint → wybierz to repo**.
Render zbuduje (`npm install --include=dev && npm run build`) i uruchomi
(`cd apps/api && node dist/server.js`). W zakładce **Environment** ustaw sekrety
`DATABASE_URL` i `DIRECT_URL` (z Supabase). Po wdrożeniu apka jest pod publicznym
`https://…onrender.com`. Uwaga: darmowy plan usypia po ~15 min → pierwszy request budzi
serwer ~50 s.

## Uruchomienie

Wymagany Node.js >= 20, npm i działający PostgreSQL (`DATABASE_URL` w `apps/api/.env`).

```bash
# 1. instalacja zależności (dla całego monorepo)
npm install

# 2. utwórz tabele w bazie (migracja) + wygeneruj klienta Prisma
npm run db:migrate --workspace=@mozaika/api   # prisma migrate dev

# 3. wrzuć dane startowe
npm run db:seed --workspace=@mozaika/api       # prisma db seed

# 4. uruchom serwer API (Hono) — domyślnie http://localhost:3000
npm start

# (opcjonalnie) demo logiki w terminalu zamiast serwera
npm run demo

# sprawdź typy / kompilację / bramki jakości
npm run typecheck   # prisma generate + tsc --noEmit
npm test            # testy logiki (node:test)
npm run lint        # ESLint (0 błędów)
```

Po `npm start` API działa na `http://localhost:3000` — sprawdź np.
`curl localhost:3000/users/1/recommendations`. Podgląd danych: `npm run db:studio --workspace=@mozaika/api`.

## Skrypty (root)

| Komenda               | Opis                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `npm start`           | `turbo run start` → uruchamia serwer API (Hono)                  |
| `npm run demo`        | `apps/api` demo logiki w terminalu (`tsx src/index.ts`)          |
| `npm run dev`         | `turbo run dev` → tsx w trybie watch                             |
| `npm run build`       | `turbo run build` → `prisma generate` + kompilacja TS do `dist/` |
| `npm run typecheck`   | `turbo run typecheck` → `prisma generate` + `tsc --noEmit`       |
| `npm test`            | `turbo run test` → testy logiki (`node:test`)                    |
| `npm run lint`        | `eslint .` — linter (0 błędów)                                   |
| `npm run format`      | `prettier --write .` — formatowanie                              |
| `npm run dupcheck`    | `jscpd apps` — wykrywanie duplikatów kodu                        |
| `npm run secretcheck` | `secretlint` — skan sekretów w całym repo                        |

### Skrypty bazy (`--workspace=@mozaika/api`)

| Komenda       | Opis                                             |
| ------------- | ------------------------------------------------ |
| `db:migrate`  | `prisma migrate dev` — tworzy/aktualizuje tabele |
| `db:seed`     | `prisma db seed` — dane startowe                 |
| `db:generate` | `prisma generate` — regeneruje klienta           |
| `db:studio`   | `prisma studio` — podgląd danych w przeglądarce  |
