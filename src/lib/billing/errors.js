export class ApiError extends Error {
  constructor(code, status = 0, detail = null) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}
