-- Miękkie usuwanie wiadomości: deletedAt != null → pokazujemy „usunięto".
-- Zmiana ADDYTYWNA: dodaje kolumnę, nie rusza istniejących danych. RLS już włączone.
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
