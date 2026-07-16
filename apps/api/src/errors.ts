/**
 * Błędy domenowe Mozaiki. Rozróżniamy złe dane wejściowe (ValidationError),
 * brak zasobu w bazie (NotFoundError) i cudzy zasób (ForbiddenError), żeby
 * logika mogła reagować różnie.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Zasób istnieje, ale nie należy do tego użytkownika (np. cudza recenzja). */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Za dużo żądań w oknie czasu (np. próby logowania). Mapowane na HTTP 429. */
export class TooManyRequestsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TooManyRequestsError";
  }
}
