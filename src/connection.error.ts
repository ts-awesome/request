export class ConnectionError extends Error {
  public url: string;
  constructor(url: string) {
    super();
    this.name = 'ConnectionError';
    this.message = `Connection to api ${url} is lost. Please check your internet connection status`;
    this.url = url;
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}
