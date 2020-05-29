import {CaptureStream, ProgressStream, FormData, URLSearchParams} from "./utils";
import {RequestError} from "./request.error";
import {
  ConstructorOf,
  ElementType,
  HttpMethod,
  IHttpTransport,
  ILogger,
  Options,
  TokenProvider,
  TransferProgress,
  WithDestination,
  WithModel,
  WithProgress,
  WithSource
} from "./interfaces";
import {ETagSymbol} from "./symbols";
import reader from '@viatsyshyn/ts-model-reader';
import fetch, {Headers, Response} from 'cross-fetch';
import {createHash, Hash} from 'crypto';
import {Readable} from "stream";
import querystring from 'querystring';
import {AbortController} from 'abort-controller/dist/abort-controller';
import { ConnectionError } from "./connection.error";
import { RedirectError } from "./redirect.error";

/* eslint-disable @typescript-eslint/no-use-before-define */

export class HttpTransport implements IHttpTransport {
  constructor(
    protected logger?: ILogger,
    protected baseUrl?: string,
    protected authorization?: string | TokenProvider,
  ) {
  }

  public async post<T>(endpoint: string, {Model, ...options}: Options & WithModel<ElementType<T>> = {}): Promise<T> {
    return this._readData(await this.request('POST', endpoint, options), Model);
  }

  public async put<T>(endpoint: string, {Model, ...options}: Options & WithModel<ElementType<T>> = {}): Promise<T> {
    return this._readData(await this.request('PUT', endpoint, options), Model);
  }

  public async patch<T>(endpoint: string, {Model, ...options}: Options & WithModel<ElementType<T>> = {}): Promise<T> {
    return this._readData(await this.request('PATCH', endpoint, options), Model);
  }

  public async delete<T>(endpoint: string, {Model, ...options}: Options & WithModel<ElementType<T>> = {}): Promise<T> {
    return this._readData(await this.request('DELETE', endpoint, options), Model);
  }

  public async get<T>(endpoint: string, {Model, ...options}: Options & WithModel<ElementType<T>> = {}): Promise<T> {
    return this._readData(await this.request('GET', endpoint, options), Model);
  }

  public async head(endpoint: string, options?: Options): Promise<void> {
    await this.request('HEAD', endpoint, options);
  }

  public async request<T>(method: HttpMethod, uri: string, options: Options & {timeout?: number} = {}): Promise<Response> {
    const [_uri, _options] = await this._requestParams(method, uri, options);
    const {timeout, signal} = options;
    if (timeout != null && signal) {
      throw new Error('Can not have timeout and signal options at the same time');
    }

    let response;
    try {
      response = await new Promise((resolve, reject) => {
        if (timeout) {
          const controller = new AbortController();
          setTimeout(() => {
            controller.abort();
            this.logger?.warn('timeout', method, _uri);
            reject(new RequestError('Timeout', 'RequestError', 0));
          }, timeout);
          _options.signal = controller.signal;
        }

        fetch(_uri, _options).then(resolve, reject);
      })

    } catch (err) {

      if (!err.statusCode) {
        this.logger?.warn(`Api ${method.toUpperCase()} ${uri} connection failed: ${err.message || err}`);
        throw new ConnectionError(uri);
      }
      this.logger?.warn(`Api ${method.toUpperCase()} ${uri} failed: ${err.message || err}`);
      throw new Error(`Api ${method.toUpperCase()} ${uri} failed: ${err.message || err}`);
    }
    return await this._processResponse(method, uri, response);
  }

  public async stream<T>(
    method: HttpMethod,
    uri: string,
    {progress, ...options}: Options & WithProgress = {}
  ): Promise<(Readable & {total: number}) | null> {
    const {headers = {}} = options || {};
    const {accept = null} = headers;

    options = {
      ...options,
      headers: {
        ...headers,
        accept: accept ?? '*/*'
      }
    };

    const response = await this.request(method, uri, options);

    // no need to check for response.ok here

    const total = parseInt(response.headers.get('Content-Length') ?? '0', 10);

    const progressStream = new ProgressStream<TransferProgress>(total);
    progress?.next({current: null, total});

    Object.defineProperty(progressStream, 'httpVersion', {value: '1.1', enumerable: false});
    Object.defineProperty(progressStream, 'headers', {value: {'content-length': total}, configurable: false});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream: any = response.body;
    if (stream == null) {
      progress?.complete();
      return null;
    }

    if (typeof stream.pipe !== 'function' && typeof stream.pipeTo !== 'function') {
      throw new Error (`Fetch body doesn't support pipe()`);
    }

    return (stream.pipeTo ?? stream.pipe).call(stream, progressStream)
      .on('progress', (event: TransferProgress) => progress?.next(event))
      .once('end', () => progress?.complete());
  }

  public async download<T>(
    method: HttpMethod,
    uri: string,
    {dest, progress, ...options}: Options & WithProgress & WithDestination
  ): Promise<void> {
    const {headers = {}} = options || {};
    const {accept = null} = headers;

    options = {
      ...options,
      headers: {
        ...headers,
        accept: accept ?? '*/*'
      }
    };

    const response = await this.request(method, uri, options);

    // no need to check for response.ok here

    const total = parseInt(response.headers.get('Content-Length') ?? '0', 10);

    const progressStream = new ProgressStream<TransferProgress>(total);
    progress?.next({current: null, total});

    let hash: Hash;
    const captureStream = new CaptureStream();

    if (response.headers.has('Digest')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const [alg] = response.headers.get('Digest')!.split('=');
      hash = createHash(alg.replace('-', ''));
      captureStream.digest(hash);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream: any = response.body;
    if (stream == null) {
      throw new RequestError('No stream', 'RequestError',0);
    }

    if (typeof stream.pipe !== 'function') {
      throw new Error (`Fetch body doesn't support pipe()`);
    }

    progressStream.on('progress', (event: TransferProgress) => progress?.next(event));

    return new Promise((resolve, reject) => {
      (stream.pipeTo ?? stream.pipe).call(stream, captureStream)
        .once('error', reject)
        .once('end', () => {
          setTimeout(() => {
            progress?.complete();

            if (hash != null) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const [, ...parts] = response.headers.get('Digest')!.split('=');
              const expected = parts.join('=');
              const computed = hash.digest('base64');
              if (expected !== computed) {
                reject(new RequestError(`Digest mismatch`, 'RequestError', 0, {
                  expected,
                  computed,
                }));
              }
            } else if (progressStream.total > progressStream.progressed) {
              reject(new RequestError(`Broken connection`, 'RequestError', 0, {
                total: progressStream.total,
                progressed: progressStream.progressed,
              }));
            }

            setImmediate(resolve);
          }, 100)
        })
        .pipe(progressStream)
        .pipe(dest);
    });
  }

  public async upload<T>(
    method: HttpMethod,
    uri: string,
    {Model, progress, src, size, ...options}: Options & WithModel<ElementType<T>> & WithProgress & WithSource,
  ): Promise<T> {
    const [_uri, _options] = await this._requestParams(method, uri, options);

    if (!src) {
      throw new Error(`src is required`);
    }

    const progressStream = new ProgressStream<TransferProgress>(size);
    progressStream.total = size ?? 0;
    progress?.next({current: 0, total: progressStream.total});

    if (progress) {
      progressStream.on('progress', (event: TransferProgress) => progress?.next(event));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _options.body = src.pipe(progressStream as any);
    _options.headers = new Headers(_options.headers);

    if (!_options.headers.has('Content-Length') && size != null) {
      _options.headers.set('Content-Length', `${size}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.request(method, _uri, _options as any);

    progress?.complete();

    return this._readData(response, Model);
  }

  protected resolveRelativeUrl(method: HttpMethod, uri: string): string {
    if (!this.baseUrl) {
      throw new Error(`Unable to resolve relative URL ${method} ${uri}. Please override resolveRelativeUrl() method`);
    }

    return `${this.baseUrl}${uri.startsWith('/') ? '' : '/'}${uri}`;
  }

  protected resolveHeaders(method: HttpMethod, uri: string, headers: Record<string, string> = {}): Record<string, string> {

    const Authorization = typeof this.authorization === 'function' ? this.authorization() : this.authorization;

    const auth = Authorization ? { Authorization } : undefined;
    const merged = {...auth, ...headers};

    const result = {};
    for(const key of Object.keys(merged)) {
      result[key.toLowerCase()] = merged[key];
    }

    return result;
  }

  private async _requestParams(
    method: HttpMethod, uri: string, options: Options = {}
  ): Promise<[string, RequestInit]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    method = method.toUpperCase() as any;

    let plain: Record<string, string> = {};
    if (typeof options.headers === 'object' && options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        plain[key] = value;
      })
    } else {
      plain = {...options.headers};
    }

    const headers = new Headers({
      ...resolveEtagged(method, options),
      ...this.resolveHeaders(method, uri, plain),
    });

    // eslint-disable-next-line prefer-const, @typescript-eslint/no-unused-vars
    let {qs, timeout, encoding, body, ...rest} = options;

    const query = querystring.stringify(qs);

    if (body && typeof body === 'object') {
      // eslint-disable-next-line no-prototype-builtins
      if (typeof body['hasKnownLength'] === 'function' && typeof body['getLength'] === 'function' && typeof body['getLengthSync'] === 'function') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        if (!body.hasKnownLength()) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          const length = await new Promise((res, rej) => body.getLength((err, x) => err ? rej(err) : res(x) ));
          if (length) {
            headers.set('Content-Length', '' + length);
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          headers.set('Content-Length', body.getLengthSync());
        }
      }

      if (body instanceof FormData || body instanceof URLSearchParams) {
        encoding = typeof encoding === 'string' ? encoding : undefined;
      } else if (Object.getPrototypeOf(body).constructor === Object) {
        encoding = JSON;
      }

      if (encoding === 'application/json, */*') {
        encoding = JSON;
      }

      if (typeof encoding === 'string') {
        // keep encoding do nothing
      } else if (encoding === JSON) {
        headers.set('Content-Type', 'application/json');
        body = encoding.stringify(body);
      } else if (typeof encoding === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body = (encoding as any)(body);
      } else if (typeof encoding?.stringify === 'function') {
        if (encoding.encoding != null) {
          headers.set('Content-Type', encoding.encoding);
        }
        body = encoding.stringify(body);
      }
    }

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }

    const opts: RequestInit = {
      ...rest,
      body: body as string,
      method: method.toUpperCase(),
      headers,
    };

    if (!/^https?:\/\//gi.test(uri) && !uri.startsWith('data:')) {
      uri = this.resolveRelativeUrl(method, uri) + (query ? '?' + query : '');
    }

    this.logger?.debug('Http', method, uri, JSON.stringify(opts, null, 2));

    return [uri, opts];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected resolveError(statusMessage: string, statusCode: number, body: any): void {
    const {code, error, name, data, status, message, type, ...rest} = body ?? {};
    if (name ?? type ?? error ?? code ?? status ?? message ?? false) {
      throw new RequestError(message ?? error ?? statusMessage, type ?? name ?? 'Error', code ?? status ?? statusCode, data ?? rest);
    }
  }

  protected resolveModel<T>(raw: T, Model?: ConstructorOf<ElementType<T>> | [ConstructorOf<ElementType<T>>], _etag?: string): T {
    if (Model == null || raw == null) {
      return raw as T;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return addEtag(reader(raw, Model as any, true), _etag);
  }

  private async _processResponse(
    method: HttpMethod,
    uri: string,
    response: Response,
  ): Promise<Response> {
    if (response.ok) {
      return response;
    }

    const {
      status,
      statusText,
      headers,
    } = response;

    const raw = await response.text();

    this.logger?.warn(`Http ${method.toUpperCase()} ${uri} failed ${status}: ${statusText}\n${raw}`);

    const body = headers.get('Content-Type')?.startsWith('application/json') ? JSON.parse(raw) : raw;
    const location = headers.get('Location');
    if ((status >= 300 && status <= 308) && location) {
      throw new RedirectError(raw, uri, status, location);
    }
 
    this.resolveError(statusText, status, body);
    if (body && typeof body === 'object') {
      this.resolveError(statusText, status, body);
      const {code: jsonCode = status, error: jsonError = statusText, ...rest} = body;
      throw new Error(`Api ${method.toUpperCase()} ${uri} failed ${jsonCode}: ${jsonError}${Object.keys(rest).length ? '\n' + JSON.stringify(rest) : ''}`)
    }

    throw new Error(`Api ${method.toUpperCase()} ${uri} failed ${status}: ${statusText}\n${typeof raw === 'string' ? raw : JSON.stringify(raw)}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _readData(response: Response, Model: any): Promise<any> {

    console.log('_readData', response.redirected, response.url, response.status);
    const contentType = response.headers.get('Content-Type') ?? '';
    if (!contentType.startsWith('application/json')) {
      return await response.text();
    }

    const body = await response.json();
    const etag = response.headers.get('ETag');
    const value = Array.isArray(etag) ? etag[0] : etag;
    return addEtag(this.resolveModel(body, Model, value), value);
  }
}

function addEtag<T>(obj: T, etag?: string): T {
  if (etag && obj && (Array.isArray(obj) || typeof obj === 'object')) {
    Object.defineProperty(obj, ETagSymbol, {value: etag});
  }

  return obj;
}

function resolveEtagged(method: HttpMethod, {etag, eTagged}: Options): {[key: string]: string} {
  const result = {};
  const value = etag ?? eTagged?.[ETagSymbol];
  // noinspection SuspiciousTypeOfGuard
  if (typeof value === 'string' && method === 'GET') {
    result['If-None-Match'] = value.startsWith('"') ? value : JSON.stringify(value);
  }
  // noinspection SuspiciousTypeOfGuard
  if (typeof value === 'string' && (method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
    result['If-Match'] = value.startsWith('"') ? value : JSON.stringify(value);
  }
  return result;
}
