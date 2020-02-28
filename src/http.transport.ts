import {CoreOptions, Response} from 'request';
import {CaptureStream, ProgressStream} from "./utils";
import {RequestError} from "./request.error";
import {
  ConstructorOf,
  ElementType,
  HttpMethod,
  IHttpTransport,
  ILogger,
  Restorable,
  TransferProgress,
  WithDestination, WithEtagged,
  WithModel,
  WithProgress,
  WithSource,
} from "./interfaces";
import {RestoreSymbol, ETagSymbol} from "./symbols";

import request = require('request');
import {Hash, createHash} from 'crypto';

export class HttpTransport implements IHttpTransport {
  constructor(
    protected logger?: ILogger,
    protected baseUrl?: string,
    protected authorization?: string,
  ) {
  }

  public post<T>(endpoint: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T> {
    return this.request('POST', endpoint, options);
  }

  public put<T>(endpoint: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T> {
    return this.request('PUT', endpoint, options);
  }

  public patch<T>(endpoint: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T> {
    return this.request('PATCH', endpoint, options);
  }

  public delete<T>(endpoint: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T> {
    return this.request('DELETE', endpoint, options);
  }

  public get<T>(endpoint: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T> {
    return this.request('GET', endpoint, options);
  }

  public head<T>(endpoint: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T> {
    return this.request('HEAD', endpoint, options);
  }

  public async request<T = any>(method: HttpMethod, uri: string, {Model, ...options}: CoreOptions & WithModel<ElementType<T>> = {}): Promise<T> {
    const response = new Promise<Response>(
      (resolve, reject) => {
        const [_uri, _options] = this._requestParams(method, uri, options);
        request(_uri, _options,
          (err: Error, res: any) => !err
            ? resolve(res)
            : reject(new Error(`Api ${method.toUpperCase()} ${uri} failed: ${err.message || err}`))
        )
      });

    return this._processResponse(method, uri, await response, Model);
  }

  public async download<T>(
    method: HttpMethod,
    uri: string,
    {Model, dest, progress, ...options}: CoreOptions & WithModel<ElementType<T>> & WithProgress & WithDestination
  ): Promise<T> {
    if (!dest) {
      throw new Error(`dest is required`);
    }

    let hash: Hash | undefined;

    const errorCaptureStream = new CaptureStream();
    const progressStream = new ProgressStream<TransferProgress>();
    progress?.next({current: null, total: 0});

    const [_uri, _options] = this._requestParams(method, uri, options);
    const response = new Promise<Response>((resolve, reject) => {
      let res: Response | null = null;
      request(_uri, _options)
        .once('response', function (response: any) {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            errorCaptureStream.capture();
            resolve(response);
            progress?.complete();
          } else {
            if (response.headers['digest']) {
              const [alg] = response.headers['digest'].split('=');
              hash = createHash(alg.replace('-', ''));
              errorCaptureStream.digest(hash);
            }
            res = response;
            progressStream.total = parseInt(response.headers['content-length'] || '0', 10);
            progress?.next({current: 0, total: progressStream.total});
          }
        })
        .once('error', (err: Error) => {
          reject(new Error(`Api ${method.toUpperCase()} ${uri} failed: ${err.message || err}`));
          progress?.complete();
        })
        .once('end', () => {
          resolve(res!);
          progress?.complete();
        })
        .pipe(errorCaptureStream)
        .pipe(progressStream)
        .pipe(dest);
    });

    progressStream.on('progress', (event: TransferProgress) => progress?.next(event));

    const resolved = await response;
    resolved.body = errorCaptureStream.content;

    if (resolved.statusCode === 200) {
      if (hash != null && typeof resolved.headers['digest'] === 'string') {
        const [, ...parts] = resolved.headers['digest'].split('=');
        const expected = parts.join('=');
        const computed = hash.digest('base64');
        if (expected !== computed) {
          throw new RequestError(`Digest mismatch`, 'RequestError', 0, {
            expected,
            computed,
          });
        }
      } else if (progressStream.total > progressStream.progressed) {
        throw new RequestError(`Broken connection`, 'RequestError', 0, {
          total: progressStream.total,
          progressed: progressStream.progressed,
        })
      }
    }

    return this._processResponse(method, uri, resolved, Model);
  }

  public async upload<T>(
    method: HttpMethod,
    uri: string,
    {Model, progress, src, size, ...options}: CoreOptions & WithModel<ElementType<T>> & WithProgress & WithSource,
  ): Promise<T> {
    if (!src) {
      throw new Error(`src is required`);
    }
    const captureStream = new CaptureStream();
    const progressStream = new ProgressStream<TransferProgress>(size);
    progressStream.total = size ?? 0;
    options.body = src.pipe(progressStream);
    progress?.next({current: 0, total: progressStream.total});

    const [_uri, _options] = this._requestParams(method, uri, options);

    if (_options.headers['content-length'] == null && size != null) {
      _options.headers['content-length'] = size;
    }

    const response = new Promise<Response>((resolve, reject) => {
      let res: Response | null = null;
      request(_uri, _options)
        .once('response', (response: any) => {
          captureStream.capture();
          res = response;
        })
        .once('error', (err: Error) => {
          progress?.complete();
          reject(new Error(`Api ${method.toUpperCase()} ${uri} failed: ${err.message || err}`));
        })
        .once('end', () => {
          resolve(res!);
          progress?.complete();
        })
        .pipe(captureStream)
    });

    if (progress) {
      progressStream.on('progress', (event: TransferProgress) => progress?.next(event));
    }

    const resolved = await response;
    resolved.body = captureStream.content;

    return this._processResponse(method, uri, resolved, Model);
  }

  protected resolveRelativeUrl(method: HttpMethod, uri: string): string {
    if (!this.baseUrl) {
      throw new Error(`Unable to resolve relative URL ${method} ${uri}. Please override resolveRelativeUrl() method`);
    }

    return `${this.baseUrl}${uri}`;
  }

  protected resolveHeaders(method: HttpMethod, uri: string, headers: Record<string, string> = {}): Record<string, string> {
    const auth = this.authorization ? {Authorization: this.authorization!} : undefined;
    const merged = {...auth, ...headers};

    const result = {};
    for(let key of Object.keys(merged)) {
      result[key.toLowerCase()] = merged[key];
    }

    return result;
  }

  private _requestParams(method: HttpMethod, uri: string, options: CoreOptions & WithEtagged): [string, request.CoreOptions & {method: string, headers: Record<string, any>}] {
    method = method.toUpperCase() as any;

    const {etag, eTagged, ...rest} = options;

    const opts = {
      ...rest,
      method: method.toUpperCase(),
      headers: {
        ...resolveEtagged(method, options),
        ...this.resolveHeaders(method, uri, options?.headers ?? {}),
      },
    };

    if (!/^https?:\/\//gi.test(uri)) {
      uri = this.resolveRelativeUrl(method, uri);
    }

    this.logger?.debug('Http', method, uri, JSON.stringify(opts, null, 2));

    return [uri, opts];
  }

  protected resolveError(statusMessage: string, statusCode: number, body: any): void {
    const {code, error, name, data, status, message, type, ...rest} = body ?? {};
    if (name ?? type ?? error ?? code ?? status ?? message ?? false) {
      throw new RequestError(message ?? error ?? statusMessage, type ?? name ?? 'Error', code ?? status ?? statusCode, data ?? rest);
    }
  }

  protected resolveModel<T>(raw: any, Model?: ConstructorOf<ElementType<T>> | Restorable<ElementType<T>>, _etag?: string): T {
    if (!Model) {
      return raw as T;
    }

    if (Array.isArray(raw)) {
      return raw.map(item => _restore(item, Model)) as any;
    }

    return _restore(raw, Model);
  }

  private _processResponse<T = any>(
    method: HttpMethod,
    uri: string,
    response: Response,
    Model?: ConstructorOf<ElementType<T>> | Restorable<ElementType<T>>
  ): T {
    const {
      statusCode,
      statusMessage,
    } = response;

    const raw = response.body as any;
    const ct = response.headers['content-type'];
    const body = raw && ct && ct.startsWith('application/json') && typeof raw === 'string'
      ? JSON.parse(raw)
      : raw;

    if (statusCode >= 200 && statusCode < 300) {
      const etag = response.headers.etag;
      const value = Array.isArray(etag) ? etag[0] : etag;
      return addEtag(this.resolveModel(body, Model, value), value);
    }

    this.logger?.warn(`Http ${method.toUpperCase()} ${uri} failed ${statusCode}: ${statusMessage}\n${typeof raw === 'string' ? raw : JSON.stringify(raw)}`);

    let message = statusMessage;
    let code = statusCode;
    this.resolveError(message, code, body);
    if (body && typeof body === 'object') {
      this.resolveError(message, code, body);

      const {code: jsonCode = code, error: jsonError = message, name, data, ...rest} = body ?? {};
      throw new Error(`Api ${method.toUpperCase()} ${uri} failed ${code}: ${message}${Object.keys(rest).length ? '\n' + JSON.stringify(rest) : ''}`)
    }

    throw new Error(`Api ${method.toUpperCase()} ${uri} failed ${code}: ${message}\n${typeof raw === 'string' ? raw : JSON.stringify(raw)}`)
  }
}

function _restore<T>(raw: any, Model: ConstructorOf<T> | Restorable<T>): T {
  if (typeof Model[RestoreSymbol] === 'function') {
    return Model[RestoreSymbol](raw);
  }

  if (typeof raw === 'object') {
    return Object.setPrototypeOf(raw, (Model as ConstructorOf<T>).prototype);
  }

  return raw as T;
}

function addEtag<T>(obj: T, etag?: string): T {
  if (etag) {
    Object.defineProperty(obj, ETagSymbol, {value: etag});
  }

  return obj;
}

function resolveEtagged(method: HttpMethod, {etag, eTagged}: WithEtagged): {[key: string]: string} {
  const result = {};
  const value = etag ?? eTagged?.[ETagSymbol];
  if (typeof value === 'string' && method === 'GET') {
    result['If-None-Match'] = value.startsWith('"') ? value : JSON.stringify(value);
  }
  if (typeof value === 'string' && (method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
    result['If-Match'] = value.startsWith('"') ? value : JSON.stringify(value);
  }
  return result;
}

