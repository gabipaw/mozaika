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

## Struktura

```
mozaika/
├─ package.json          # root: npm workspaces + skrypty turbo
├─ turbo.json            # definicje zadań (build / start / dev / typecheck)
├─ tsconfig.base.json    # wspólna konfiguracja TypeScript
└─ apps/
   └─ api/               # backend (na razie: skrypt startowy)
      ├─ src/index.ts    # sprawdzenie środowiska
      └─ tsconfig.json
```

Katalog `apps/*` (i przyszły `packages/*`) to workspace'y npm, którymi zarządza Turbo.

## Uruchomienie

Wymagany Node.js >= 20 i npm.

```bash
# 1. instalacja zależności (dla całego monorepo)
npm install

# 2. uruchom skrypt startowy przez Turbo (odpala tsx pod spodem)
npm start
# === lub bezpośrednio: npx turbo run start

# 3. sprawdź, że projekt się typuje / kompiluje
npm run typecheck   # tsc --noEmit
npm run build       # tsc → apps/api/dist

# tryb watch (restart przy zmianie pliku)
npm run dev
```

Po `npm start` zobaczysz powitanie Mozaiki i wynik sprawdzenia środowiska.

## Skrypty (root)

| Komenda | Opis |
|---|---|
| `npm start` | `turbo run start` → uruchamia `apps/api` przez tsx |
| `npm run dev` | `turbo run dev` → tsx w trybie watch |
| `npm run build` | `turbo run build` → kompilacja TS do `dist/` |
| `npm run typecheck` | `turbo run typecheck` → `tsc --noEmit` |
