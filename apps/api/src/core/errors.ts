export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this") {
    super(message);
    this.name = "ForbiddenError";
  }
}
