/**
 * Mozaika — punkt startowy backendu (apps/api).
 *
 * Łączy się z bazą (PostgreSQL przez Prisma) i wypisuje stan warstwy danych:
 * użytkowników oraz katalog mediów z liczbą recenzji i średnią oceną.
 * To dowód, że schemat + migracja + zapytania działają end-to-end.
 */
import { prisma } from "./db.js";

function srednia(oceny: number[]): string {
  if (oceny.length === 0) return "—";
  const avg = oceny.reduce((a, b) => a + b, 0) / oceny.length;
  return avg.toFixed(1);
}

async function main(): Promise<void> {
  console.log("🎨 Mozaika — warstwa danych (PostgreSQL + Prisma)\n");

  const [userCount, reviewCount] = await Promise.all([
    prisma.user.count(),
    prisma.review.count(),
  ]);
  console.log(`Użytkownicy: ${userCount} · Recenzje: ${reviewCount}\n`);

  const media = await prisma.media.findMany({
    orderBy: { id: "asc" },
    include: { reviews: { select: { rating: true } } },
  });

  console.log("Katalog mediów:");
  for (const m of media) {
    const oceny = m.reviews.map((r) => r.rating);
    const rok = m.year ? ` (${m.year})` : "";
    console.log(
      `  • [${m.type}] ${m.title}${rok} — recenzji: ${oceny.length}, średnia: ${srednia(oceny)}/10`,
    );
  }

  if (media.length === 0) {
    console.log("  (brak danych — odpal `npm run db:seed`)");
  }
}

main()
  .catch((e) => {
    console.error("Błąd połączenia z bazą:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
