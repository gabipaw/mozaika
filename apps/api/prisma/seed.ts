/**
 * Dane startowe Mozaiki (seed) — publiczna appka.
 * Wgrywa tylko startowy KATALOG filmów (z plakatami TMDB). Bez kont i ocen —
 * użytkownicy rejestrują się sami, a oceny/rekomendacje budują się z ich aktywności.
 * Idempotentny (`upsert`).
 */
import { MediaType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const img = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;
  const filmy = [
    {
      externalId: "27205",
      title: "Incepcja",
      year: 2010,
      posterUrl: img("/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg"),
    },
    {
      externalId: "157336",
      title: "Interstellar",
      year: 2014,
      posterUrl: img("/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg"),
    },
    {
      externalId: "496243",
      title: "Parasite",
      year: 2019,
      posterUrl: img("/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"),
    },
    {
      externalId: "244786",
      title: "Whiplash",
      year: 2014,
      posterUrl: img("/7fn624j5lj3xTme2SgiLCeuedmO.jpg"),
    },
    {
      externalId: "438631",
      title: "Diuna",
      year: 2021,
      posterUrl: img("/gDzOcq0pfeCeqMBwKIJlSmQpjkZ.jpg"),
    },
    {
      externalId: "278",
      title: "Skazani na Shawshank",
      year: 1994,
      posterUrl: img("/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg"),
    },
    {
      externalId: "68718",
      title: "Django",
      year: 2012,
      posterUrl: img("/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg"),
    },
    {
      externalId: "807",
      title: "Siedem",
      year: 1995,
      posterUrl: img("/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg"),
    },
  ];

  for (const f of filmy) {
    await prisma.media.upsert({
      where: { type_externalId: { type: MediaType.FILM, externalId: f.externalId } },
      update: { posterUrl: f.posterUrl },
      create: {
        type: MediaType.FILM,
        title: f.title,
        externalId: f.externalId,
        year: f.year,
        posterUrl: f.posterUrl,
      },
    });
  }

  console.log(
    `🌱 Seed gotowy: ${filmy.length} filmów w katalogu (bez kont — appka publiczna).`,
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
