import {ETagSymbol} from "./symbols";
import {Readable, Writable} from "stream";
import {Response} from "cross-fetch";
import {AbortSignal} from "abort-controller";

export interface TransferProgress {
  readonly total: number;
  readonly current: number| null;
}

export interface IProgressReporter<T> {
  next(value: T): void;
  complete(): void;
}

export type HttpMethod = 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export interface ILogger {
  debug(...args: string[]): void;
  warn(...args: string[]): void;
}

export interface Stringifier {
  <T>(x: T): string;
}

export interface Encoding {
  readonly encoding?: string;
  stringify<T>(x: T): string;
}

/** @deprecated use Encoding */
export type Enconding = Encoding;

export interface Options {
  qs?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  encoding?: Encoding | Stringifier | string;
  timeout?: number;
  etag?: string;
  eTagged?: {[ETagSymbol]?: string};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: BodyInit | null | Record<string, any>;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  integrity?: string;
  keepalive?: boolean;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ElementType<T> = T extends any[] ? T[number] : T;

export interface ConstructorOf<T> {
  new (...args: unknown[]): T;
}

export interface WithModel<T> {
  Model?: ConstructorOf<T> | [ConstructorOf<T>];
}

export interface WithProgress {
  progress?: IProgressReporter<TransferProgress>;
  size?: number;
}

export interface WithSource {
  src: Readable;
}

export interface WithDestination {
  dest: Writable;
}

export interface IHttpTransport<TOptions = Options, TResponse = Response> {
  get<T = unknown>(uri: string, options?: TOptions & WithModel<ElementType<T>>): Promise<T>;
  post<T = unknown>(uri: string, options?: TOptions & WithModel<ElementType<T>>): Promise<T>;
  put<T = unknown>(uri: string, options?: TOptions & WithModel<ElementType<T>>): Promise<T>;
  patch<T = unknown>(uri: string, options?: TOptions & WithModel<ElementType<T>>): Promise<T>;
  delete<T = unknown>(uri: string, options?: TOptions & WithModel<ElementType<T>>): Promise<T>;
  head(uri: string, options?: TOptions): Promise<void>;

  request(method: HttpMethod, uri: string, options?: TOptions): Promise<TResponse>;

  stream<T = unknown>(method: HttpMethod, uri: string, options: TOptions & WithModel<ElementType<T>> & WithProgress): Promise<(Readable & {total: number}) | null>;
  download<T = unknown>(method: HttpMethod, uri: string, options: TOptions & WithModel<ElementType<T>> & WithProgress & WithDestination): Promise<void>;
  upload<T = unknown>(method: HttpMethod, uri: string, options: Omit<TOptions, 'body'> & WithModel<ElementType<T>> & WithProgress & WithSource): Promise<T>;
}

export declare type TokenProvider = () => string | null | undefined;
export declare type AsyncTokenProvider = () => Promise<string | null | undefined>;

export declare type RequestSignatureProvider = (request: RequestInit) => string | null | undefined;
export declare type AsyncRequestSignatureProvider = (request: RequestInit) => Promise<string | null | undefined>;
