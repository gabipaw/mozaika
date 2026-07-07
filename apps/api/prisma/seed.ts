/**
 * Dane startowe Mozaiki (seed). Idempotentny (`upsert`).
 * Dane dobrane pod demo „Dopasowania gustu":
 *  - Ala i Bartek mają 4 wspólnie ocenione tytuły → dopasowanie się policzy,
 *  - Celina ma z nimi po 1 wspólnym tytule → zadziała reguła progu (min. 3).
 */
import { MediaType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // --- Użytkownicy ---
  const users = await Promise.all(
    [
      { email: "ala@mozaika.dev", displayName: "Ala" },
      { email: "bartek@mozaika.dev", displayName: "Bartek" },
      { email: "celina@mozaika.dev", displayName: "Celina" },
    ].map((u) =>
      prisma.user.upsert({ where: { email: u.email }, update: {}, create: u }),
    ),
  );
  const byEmail = new Map(users.map((u) => [u.email, u]));

  // --- Filmy (TMDB) ---
  const filmy = [
    { externalId: "27205", title: "Incepcja", year: 2010 },
    { externalId: "157336", title: "Interstellar", year: 2014 },
    { externalId: "496243", title: "Parasite", year: 2019 },
    { externalId: "244786", title: "Whiplash", year: 2014 },
    { externalId: "438631", title: "Diuna", year: 2021 },
    { externalId: "278", title: "Skazani na Shawshank", year: 1994 },
  ];
  const media = new Map<string, { id: number }>();
  for (const f of filmy) {
    const m = await prisma.media.upsert({
      where: { type_externalId: { type: MediaType.FILM, externalId: f.externalId } },
      update: {},
      create: {
        type: MediaType.FILM,
        title: f.title,
        externalId: f.externalId,
        year: f.year,
      },
    });
    media.set(f.title, m);
  }

  // --- Recenzje (rating 1–10) ---
  const recenzje = [
    // Ala
    {
      email: "ala@mozaika.dev",
      film: "Incepcja",
      rating: 9,
      text: "Genialna konstrukcja.",
    },
    { email: "ala@mozaika.dev", film: "Interstellar", rating: 10, text: "Mój ulubiony." },
    { email: "ala@mozaika.dev", film: "Parasite", rating: 8 },
    { email: "ala@mozaika.dev", film: "Whiplash", rating: 9 },
    { email: "ala@mozaika.dev", film: "Diuna", rating: 8 },
    // Bartek — 4 wspólne z Alą (Incepcja, Interstellar, Parasite, Whiplash)
    { email: "bartek@mozaika.dev", film: "Incepcja", rating: 8 },
    { email: "bartek@mozaika.dev", film: "Interstellar", rating: 9 },
    { email: "bartek@mozaika.dev", film: "Parasite", rating: 9 },
    {
      email: "bartek@mozaika.dev",
      film: "Whiplash",
      rating: 10,
      text: "Napięcie do końca.",
    },
    { email: "bartek@mozaika.dev", film: "Skazani na Shawshank", rating: 10 },
    // Celina — tylko po 1 wspólnym tytule z każdym (za mało do dopasowania)
    { email: "celina@mozaika.dev", film: "Diuna", rating: 3 },
    { email: "celina@mozaika.dev", film: "Skazani na Shawshank", rating: 5 },
  ];

  for (const r of recenzje) {
    const userId = byEmail.get(r.email)!.id;
    const mediaId = media.get(r.film)!.id;
    await prisma.review.upsert({
      where: { userId_mediaId: { userId, mediaId } },
      update: { rating: r.rating, text: r.text ?? null },
      create: { userId, mediaId, rating: r.rating, text: r.text ?? null },
    });
  }

  console.log(
    `🌱 Seed gotowy: ${users.length} użytkowników, ${filmy.length} filmy, ${recenzje.length} recenzji.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
