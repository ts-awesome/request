export class RedirectError extends Error {
  public url: string;
  public statusCode: number;
  public location: string;
  constructor(message: string, url: string, statusCode: number, location: string) {
    super();
    this.name = 'RedirectError';
    this.message = `Redirect occured from ${url} to ${location}. Message: ${message}`;
    this.url = url;
    this.location = location;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, RedirectError.prototype);
  }
}
