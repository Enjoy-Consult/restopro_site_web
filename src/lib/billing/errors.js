export class ApiError extends Error {
  constructor(code, status = 0, detail = null, retryAfterMs = null) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.retryAfterMs = retryAfterMs; // attente demandée par un 429, en millisecondes
  }
}
