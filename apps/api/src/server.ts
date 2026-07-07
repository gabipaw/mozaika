/**
 * Mozaika API — serwer HTTP (Hono).
 * Wystawia operacje domenowe pod `/api/*` oraz serwuje frontend PWA z `public/`.
 * Błędy domenowe mapowane na kody HTTP (400/404).
 */
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import { prisma } from "./db.js";
import { NotFoundError, ValidationError } from "./errors.js";
import { addReview } from "./logic/reviews.js";
import { recommendations } from "./logic/recommendations.js";
import { tasteMatch } from "./logic/tasteMatch.js";

const app = new Hono();
const api = new Hono();

/** Parsuje parametr ścieżki na dodatnią liczbę całkowitą lub rzuca ValidationError. */
function intParam(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`Parametr ${name} musi być dodatnią liczbą całkowitą.`);
  }
  return n;
}

api.get("/health", (c) => c.json({ status: "ok" }));

// Lista użytkowników (id + nazwa).
api.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, displayName: true },
    orderBy: { id: "asc" },
  });
  return c.json(users);
});

// Katalog wszystkich tytułów.
api.get("/media", async (c) => {
  const media = await prisma.media.findMany({ orderBy: { id: "asc" } });
  return c.json(media);
});

// Dodaj/aktualizuj recenzję. Body: { userId, mediaId, rating, text? }.
api.post("/reviews", async (c) => {
  const body = await c.req.json();
  const review = await addReview(body);
  return c.json(review, 201);
});

// Dopasowanie gustu między dwoma użytkownikami.
api.get("/users/:a/taste-match/:b", async (c) => {
  const a = intParam(c.req.param("a"), "a");
  const b = intParam(c.req.param("b"), "b");
  return c.json(await tasteMatch(a, b));
});

// Rekomendacje dla użytkownika (przez dopasowanie gustu).
api.get("/users/:id/recommendations", async (c) => {
  const id = intParam(c.req.param("id"), "id");
  return c.json(await recommendations(id));
});

// Błędy domenowe → kody HTTP.
api.onError((err, c) => {
  if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
  console.error(err);
  return c.json({ error: "Wewnętrzny błąd serwera." }, 500);
});

app.route("/api", api);

// Frontend PWA (statyczne pliki z public/): index.html, manifest, service worker, ikony.
app.use("/*", serveStatic({ root: "./public" }));

export { app };

// Serwer startuje tylko gdy plik uruchomiono bezpośrednio (nie przy imporcie w testach).
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`🎨 Mozaika działa na http://localhost:${info.port}`);
  });
}
