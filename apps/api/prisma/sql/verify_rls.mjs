// Weryfikacja RLS — wypisuje rowsecurity dla każdej tabeli public.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(
  `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;`,
);
console.table(rows);
const off = rows.filter((r) => !r.rowsecurity);
console.log(
  off.length === 0
    ? "✅ RLS włączone na WSZYSTKICH tabelach"
    : `❌ Bez RLS: ${off.map((r) => r.tablename).join(", ")}`,
);
await prisma.$disconnect();
