/**
 * Dane startowe Mozaiki (seed).
 * Idempotentny: używa `upsert`, więc można go odpalać wielokrotnie bez duplikatów.
 * MVP na filmach (dane z TMDB). Dwie osoby z częściowo wspólnymi ocenami —
 * przyda się później do funkcji „Dopasowanie gustu".
 */
import { MediaType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // --- Użytkownicy ---
  const ala = await prisma.user.upsert({
    where: { email: "ala@mozaika.dev" },
    update: {},
    create: { email: "ala@mozaika.dev", displayName: "Ala" },
  });
  const bartek = await prisma.user.upsert({
    where: { email: "bartek@mozaika.dev" },
    update: {},
    create: { email: "bartek@mozaika.dev", displayName: "Bartek" },
  });

  // --- Filmy (TMDB) ---
  const filmy = [
    { externalId: "27205", title: "Incepcja", year: 2010 },
    { externalId: "157336", title: "Interstellar", year: 2014 },
    { externalId: "496243", title: "Parasite", year: 2019 },
    { externalId: "244786", title: "Whiplash", year: 2014 },
  ];

  const media = [];
  for (const f of filmy) {
    const m = await prisma.media.upsert({
      where: { type_externalId: { type: MediaType.FILM, externalId: f.externalId } },
      update: {},
      create: { type: MediaType.FILM, title: f.title, externalId: f.externalId, year: f.year },
    });
    media.push(m);
  }
  const [incepcja, interstellar, parasite, whiplash] = media;

  // --- Recenzje (rating 1–10) ---
  const recenzje = [
    { user: ala, media: incepcja, rating: 9, text: "Genialna konstrukcja." },
    { user: ala, media: interstellar, rating: 10, text: "Mój ulubiony." },
    { user: ala, media: parasite, rating: 8 },
    { user: bartek, media: incepcja, rating: 8 },
    { user: bartek, media: interstellar, rating: 9 },
    { user: bartek, media: whiplash, rating: 10, text: "Napięcie do końca." },
  ];

  for (const r of recenzje) {
    await prisma.review.upsert({
      where: { userId_mediaId: { userId: r.user.id, mediaId: r.media.id } },
      update: { rating: r.rating, text: r.text ?? null },
      create: { userId: r.user.id, mediaId: r.media.id, rating: r.rating, text: r.text ?? null },
    });
  }

  console.log("🌱 Seed gotowy: 2 użytkowników, 4 filmy, 6 recenzji.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
