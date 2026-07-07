# Mozaika

Monorepo aplikacji biznesowej **Mozaika** — platformy recenzji wszystkich mediów
(film / serial / książka / gra / muzyka) z profilem jako „portretem gustu" i funkcją
sygnaturową **Dopasowanie gustu** (% zgodności między użytkownikami).

To jest **fundament** projektu: szkielet monorepo na docelowym stacku. Kolejne kroki
(baza PostgreSQL + Prisma, logika biznesowa, API) będą dobudowywane w tym samym repo.

## Stack

- **Node.js** (>= 20) + **TypeScript** (strict)
- **Turborepo** — orkiestracja zadań w monorepo
- **tsx** — uruchamianie TypeScriptu bez ręcznej kompilacji
- **PostgreSQL** — baza danych
- **Prisma** — ORM: schemat, migracje i typowane zapytania

## Struktura

```
mozaika/
├─ package.json          # root: npm workspaces + skrypty turbo
├─ turbo.json            # definicje zadań (build / start / dev / typecheck)
├─ tsconfig.base.json    # wspólna konfiguracja TypeScript
└─ apps/
   └─ api/               # backend
      ├─ prisma/
      │  ├─ schema.prisma  # modele: User, Media, Review (+ enum MediaType)
      │  └─ seed.ts        # dane startowe (filmy z TMDB, recenzje)
      ├─ src/
      │  ├─ db.ts          # współdzielony klient Prisma
      │  └─ index.ts       # odczyt danych z bazy
      └─ tsconfig.json
```

Katalog `apps/*` (i przyszły `packages/*`) to workspace'y npm, którymi zarządza Turbo.

## Baza danych

Model danych: **User** 1→N **Review** N←1 **Media**. Tabela `Media` ma pole `type`
(FILM / SERIAL / KSIAZKA / GRA / MUZYKA), więc jedna struktura obsługuje wszystkie media.
Oceny w skali **1–10**; jeden użytkownik ma najwyżej jedną recenzję danego tytułu.

Potrzebny jest PostgreSQL. Ustaw connection string w `apps/api/.env`:

```
DATABASE_URL="postgresql://UŻYTKOWNIK:HASŁO@HOST:5432/BAZA"
```

(np. z projektu Supabase → Project Settings → Database → Connection string.)

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

Demo (`npm start`) pokazuje oba przepływy na żywo z bazy, w tym odrzucenie błędnej oceny.
Testy logiki: `npm test` (wbudowany `node:test`, bez bazy).

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

Dowód, że lint przechodzi bez błędów (8 plików .ts, 0 problemów):

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

## Uruchomienie

Wymagany Node.js >= 20, npm i działający PostgreSQL (`DATABASE_URL` w `apps/api/.env`).

```bash
# 1. instalacja zależności (dla całego monorepo)
npm install

# 2. utwórz tabele w bazie (migracja) + wygeneruj klienta Prisma
npm run db:migrate --workspace=@mozaika/api   # prisma migrate dev

# 3. wrzuć dane startowe
npm run db:seed --workspace=@mozaika/api       # prisma db seed

# 4. uruchom backend przez Turbo (odpala tsx → czyta z bazy)
npm start                                      # turbo run start

# sprawdź typy / kompilację
npm run typecheck   # prisma generate + tsc --noEmit
npm run build       # prisma generate + tsc → apps/api/dist
```

Po `npm start` zobaczysz katalog mediów z liczbą recenzji i średnią oceną.
Podgląd danych w przeglądarce: `npm run db:studio --workspace=@mozaika/api`.

## Skrypty (root)

| Komenda             | Opis                                                             |
| ------------------- | ---------------------------------------------------------------- |
| `npm start`         | `turbo run start` → uruchamia `apps/api` przez tsx               |
| `npm run dev`       | `turbo run dev` → tsx w trybie watch                             |
| `npm run build`     | `turbo run build` → `prisma generate` + kompilacja TS do `dist/` |
| `npm run typecheck` | `turbo run typecheck` → `prisma generate` + `tsc --noEmit`       |
| `npm test`          | `turbo run test` → testy logiki (`node:test`)                    |
| `npm run lint`      | `eslint .` — linter (0 błędów)                                   |
| `npm run format`    | `prettier --write .` — formatowanie                              |

### Skrypty bazy (`--workspace=@mozaika/api`)

| Komenda       | Opis                                             |
| ------------- | ------------------------------------------------ |
| `db:migrate`  | `prisma migrate dev` — tworzy/aktualizuje tabele |
| `db:seed`     | `prisma db seed` — dane startowe                 |
| `db:generate` | `prisma generate` — regeneruje klienta           |
| `db:studio`   | `prisma studio` — podgląd danych w przeglądarce  |
