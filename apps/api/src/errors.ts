/**
 * Błędy domenowe Mozaiki. Rozróżniamy złe dane wejściowe (ValidationError)
 * od braku zasobu w bazie (NotFoundError), żeby logika mogła reagować różnie.
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
