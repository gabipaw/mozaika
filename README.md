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

| Komenda | Opis |
|---|---|
| `npm start` | `turbo run start` → uruchamia `apps/api` przez tsx |
| `npm run dev` | `turbo run dev` → tsx w trybie watch |
| `npm run build` | `turbo run build` → `prisma generate` + kompilacja TS do `dist/` |
| `npm run typecheck` | `turbo run typecheck` → `prisma generate` + `tsc --noEmit` |

### Skrypty bazy (`--workspace=@mozaika/api`)

| Komenda | Opis |
|---|---|
| `db:migrate` | `prisma migrate dev` — tworzy/aktualizuje tabele |
| `db:seed` | `prisma db seed` — dane startowe |
| `db:generate` | `prisma generate` — regeneruje klienta |
| `db:studio` | `prisma studio` — podgląd danych w przeglądarce |
