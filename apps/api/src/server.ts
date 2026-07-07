/**
 * Mozaika API — serwer HTTP (Hono).
 * Wystawia operacje domenowe: katalog, dodawanie recenzji, dopasowanie gustu
 * i rekomendacje. Błędy domenowe mapowane na kody HTTP (400/404).
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { prisma } from "./db.js";
import { NotFoundError, ValidationError } from "./errors.js";
import { addReview } from "./logic/reviews.js";
import { recommendations } from "./logic/recommendations.js";
import { tasteMatch } from "./logic/tasteMatch.js";

const app = new Hono();

/** Parsuje parametr ścieżki na dodatnią liczbę całkowitą lub rzuca ValidationError. */
function intParam(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`Parametr ${name} musi być dodatnią liczbą całkowitą.`);
  }
  return n;
}

app.get("/health", (c) => c.json({ status: "ok" }));

// Lista użytkowników (id + nazwa).
app.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, displayName: true },
    orderBy: { id: "asc" },
  });
  return c.json(users);
});

// Katalog wszystkich tytułów.
app.get("/media", async (c) => {
  const media = await prisma.media.findMany({ orderBy: { id: "asc" } });
  return c.json(media);
});

// Dodaj/aktualizuj recenzję. Body: { userId, mediaId, rating, text? }.
app.post("/reviews", async (c) => {
  const body = await c.req.json();
  const review = await addReview(body);
  return c.json(review, 201);
});

// Dopasowanie gustu między dwoma użytkownikami.
app.get("/users/:a/taste-match/:b", async (c) => {
  const a = intParam(c.req.param("a"), "a");
  const b = intParam(c.req.param("b"), "b");
  return c.json(await tasteMatch(a, b));
});

// Rekomendacje dla użytkownika (przez dopasowanie gustu).
app.get("/users/:id/recommendations", async (c) => {
  const id = intParam(c.req.param("id"), "id");
  return c.json(await recommendations(id));
});

// Błędy domenowe → kody HTTP.
app.onError((err, c) => {
  if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
  console.error(err);
  return c.json({ error: "Wewnętrzny błąd serwera." }, 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🎨 Mozaika API działa na http://localhost:${info.port}`);
});
