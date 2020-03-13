import {ETagSymbol} from "./symbols";
import {Readable, Writable} from "stream";
import {Response} from "cross-fetch";

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

export interface Enconding {
  readonly encoding?: string;
  stringify<T>(x: T): string;
}

export interface Options extends RequestInit {
  qs?: Record<string, string | number>;
  headers?: Record<string, string>;
  encoding?: Enconding | Stringifier | string;
  method?: HttpMethod;
  timeout?: number;
  etag?: string;
  eTagged?: {[ETagSymbol]?: string};
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

export interface IHttpTransport {
  get<T = unknown>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T>;
  post<T = unknown>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T>;
  put<T = unknown>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T>;
  patch<T = unknown>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T>;
  delete<T = unknown>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T>;
  head(uri: string, options?: Options): Promise<void>;

  request<T = unknown>(method: HttpMethod, uri: string, options?: Options): Promise<Response>;

  stream<T = unknown>(method: HttpMethod, uri: string, options: Options & WithModel<ElementType<T>> & WithProgress): Promise<(Readable & {total: number}) | null>;
  download<T = unknown>(method: HttpMethod, uri: string, options: Options & WithModel<ElementType<T>> & WithProgress & WithDestination): Promise<void>;
  upload<T = unknown>(method: HttpMethod, uri: string, options: Omit<Options, 'body'> & WithModel<ElementType<T>> & WithProgress & WithSource): Promise<T>;
}

export declare type TokenProvider = () => string | null | undefined;
