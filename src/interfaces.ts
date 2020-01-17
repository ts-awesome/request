import {RestoreSymbol} from "./symbols";

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

export interface CoreOptions {
  baseUrl?: string;
  formData?: { [key: string]: any };
  form?: { [key: string]: any } | string;
  qs?: any;
  qsStringifyOptions?: any;
  qsParseOptions?: any;
  json?: any;
  jsonReviver?: (key: string, value: any) => any;
  jsonReplacer?: (key: string, value: any) => any;
  forever?: any;
  host?: string;
  port?: number;
  method?: string;
  headers?: Headers;
  body?: any;
  family?: 4 | 6;
  followAllRedirects?: boolean;
  followOriginalHttpMethod?: boolean;
  maxRedirects?: number;
  removeRefererHeader?: boolean;
  encoding?: string | null;
  pool?: any;
  timeout?: number;
  localAddress?: string;
  proxy?: any;
  tunnel?: boolean;
  strictSSL?: boolean;
  rejectUnauthorized?: boolean;
  time?: boolean;
  gzip?: boolean;
  preambleCRLF?: boolean;
  postambleCRLF?: boolean;
  withCredentials?: boolean;
  useQuerystring?: boolean;
}

export interface Restorable<T> {
  [RestoreSymbol](raw: any): T;
}

export type ElementType<T> = T extends any[] ? T[number] : T;

export interface ConstructorOf<T> {
  new (...args: any[]): T;
}

export interface WithModel<T> {
  Model?: ConstructorOf<T> | Restorable<T>;
}

export interface WithProgress {
  progress?: IProgressReporter<TransferProgress>;
  size?: number;
}

export interface WithSource {
  src: NodeJS.ReadableStream;
}

export interface WithDestination {
  dest: NodeJS.WritableStream;
}

export interface IHttpTransport {
  get<T = any>(uri: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T>;
  post<T = any>(uri: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T>;
  put<T = any>(uri: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T>;
  patch<T = any>(uri: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T>;
  delete<T = any>(uri: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T>;
  head<T = any>(uri: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T>;

  request<T = any>(method: HttpMethod, uri: string, options?: CoreOptions & WithModel<ElementType<T>>): Promise<T>;
  download<T = any>(method: HttpMethod, uri: string, options: CoreOptions & WithModel<ElementType<T>> & WithProgress & WithDestination): Promise<T>;
  upload<T = any>(method: HttpMethod, uri: string, options: Omit<CoreOptions, 'body'> & WithModel<ElementType<T>> & WithProgress & WithSource): Promise<T>;
}
