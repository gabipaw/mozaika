/**
 * Jeden współdzielony klient Prisma dla całego backendu.
 * Importuj `prisma` stąd zamiast tworzyć nowego `PrismaClient` w każdym pliku.
 */
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
