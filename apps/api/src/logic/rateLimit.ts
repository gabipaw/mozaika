/**
 * Prosty limiter żądań w pamięci — okno przesuwne per klucz (zwykle IP+trasa).
 *
 * Chroni logowanie/rejestrację przed zgadywaniem hasła na siłę. Trzymanie stanu
 * w pamięci wystarcza, bo Render (plan free) to JEDNA instancja; przy skalowaniu
 * na wiele instancji trzeba by przenieść licznik do współdzielonego magazynu.
 *
 * Czas wstrzykiwany (`now`) — dzięki temu logikę okna da się przetestować bez zegara.
 */

interface Bucket {
  /** Znaczniki czasu (ms) prób mieszczących się jeszcze w oknie. */
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  /** Ile sekund do zwolnienia miejsca (0, gdy dozwolone). */
  retryAfter: number;
}

/**
 * Rejestruje próbę dla klucza. Zwraca, czy mieści się w limicie `max` na `windowMs`.
 * Okno przesuwne: tempo jest ograniczone do `max` udanych prób na okno. Prób
 * ODRZUCONYCH nie doliczamy — inaczej klient w pętli ponawiania nigdy by się nie
 * odblokował. To wystarcza: atak słownikowy i tak spada do max/okno.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  // Wyrzuć próby starsze niż okno.
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= max) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfter };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfter: 0 };
}

/** Kasuje licznik dla klucza — np. po udanym logowaniu, żeby nie karać za sukces. */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}

/** Tylko do testów: czyści cały stan. */
export function rateLimitClear(): void {
  buckets.clear();
}
