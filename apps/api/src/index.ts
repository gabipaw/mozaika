/**
 * Mozaika — demo serca aplikacji (logika biznesowa) na danych z bazy.
 * Pokazuje: (1) dopasowanie gustu dla pary z wystarczającą liczbą wspólnych ocen,
 * (2) regułę progu dla pary z małą liczbą wspólnych, (3) zapis recenzji z walidacją,
 * (4) odrzucenie recenzji z oceną poza zakresem.
 */
import { prisma } from "./db.js";
import { NotFoundError, ValidationError } from "./errors.js";
import { addReview } from "./logic/reviews.js";
import { recommendations } from "./logic/recommendations.js";
import { tasteMatch } from "./logic/tasteMatch.js";

async function userIdByEmail(email: string): Promise<number> {
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  return u.id;
}

function opiszDopasowanie(
  label: string,
  wynik: Awaited<ReturnType<typeof tasteMatch>>,
): void {
  console.log(`🎯 Dopasowanie gustu — ${label}:`);
  if (wynik.status === "OK") {
    console.log(`   ${wynik.score}% zgodności (wspólnych tytułów: ${wynik.shared})`);
  } else {
    console.log(
      `   za mało danych (wspólnych: ${wynik.shared}, wymagane: ${wynik.minShared}) — reguła progu zadziałała`,
    );
  }
}

async function main(): Promise<void> {
  console.log("🎨 Mozaika — serce aplikacji (logika biznesowa)\n");

  const [ala, bartek, celina] = await Promise.all([
    userIdByEmail("ala@mozaika.dev"),
    userIdByEmail("bartek@mozaika.dev"),
    userIdByEmail("celina@mozaika.dev"),
  ]);

  // 1) Para z 4 wspólnymi ocenami — dopasowanie się liczy.
  opiszDopasowanie("Ala ↔ Bartek", await tasteMatch(ala, bartek));

  // 2) Para z 1 wspólną oceną — reguła progu blokuje wynik.
  console.log();
  opiszDopasowanie("Ala ↔ Celina", await tasteMatch(ala, celina));

  // 3) Zapis recenzji (poprawny) — aktualizacja istniejącej oceny.
  const parasite = await prisma.media.findFirstOrThrow({ where: { title: "Parasite" } });
  console.log("\n📝 addReview (poprawny): Ala zmienia ocenę Parasite na 9");
  const zapis = await addReview({
    userId: ala,
    mediaId: parasite.id,
    rating: 9,
    text: "Po ponownym seansie — jeszcze lepszy.",
  });
  console.log(`   ✅ zapisano: ocena = ${zapis.rating}`);

  // 4) Reguła walidacji — ocena 11 odrzucona PRZED zapisem do bazy.
  console.log("\n🛑 addReview (błędny): ocena 11 — powinno zostać odrzucone");
  try {
    await addReview({ userId: ala, mediaId: parasite.id, rating: 11 });
    console.log("   ❌ BŁĄD: zapis przeszedł, a nie powinien!");
  } catch (e) {
    if (e instanceof ValidationError || e instanceof NotFoundError) {
      console.log(`   ✅ odrzucono: ${e.message}`);
    } else {
      throw e;
    }
  }

  // 5) Rekomendacje przez dopasowanie gustu — tytuły od podobnych użytkowników.
  console.log("\n🍿 Rekomendacje dla Ali (od użytkowników o podobnym guście):");
  const recs = await recommendations(ala);
  if (recs.length === 0) {
    console.log("   brak — za mało podobnych użytkowników");
  } else {
    for (const r of recs) {
      const kto = r.recommenders.map((x) => `#${x.userId}@${x.matchScore}%`).join(", ");
      console.log(`   • ${r.title} — przewidywana ocena ${r.score}/10 (poleca: ${kto})`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Błąd:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
