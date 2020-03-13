export class RequestError extends Error {
  constructor(
    message: string,
    public readonly name: string,
    public readonly statusCode: number = 500,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly data?: any,
  ) {
    super(message);
    Object.setPrototypeOf(this, RequestError.prototype);
  }
}
