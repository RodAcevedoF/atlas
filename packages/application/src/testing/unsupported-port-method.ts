export class UnsupportedPortMethodError extends Error {
  constructor(fake: string, method: string) {
    super(`${fake} does not support ${method}`);
    this.name = "UnsupportedPortMethodError";
  }
}
