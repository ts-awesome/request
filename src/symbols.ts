export const ETagSymbol = Symbol.for('ETag');
export const RestoreSymbol = Symbol('restore');
export const HttpTransportSymbol = Symbol.for('IHttpTransport');

export const Symbols = {
  HttpTransport: HttpTransportSymbol,
  restore: RestoreSymbol,
};

export default Symbols;
