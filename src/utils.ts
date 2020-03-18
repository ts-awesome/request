/* eslint-disable @typescript-eslint/no-explicit-any */
import {Readable, Transform} from "readable-stream";

export interface IProgressStream<T> {
  on(event: 'end' | 'error', l: (...args: any[]) => any): IProgressStream<T>;
  on(event: 'progress', l: (event: T, ...args: any[]) => any): IProgressStream<T>;
  once(event: 'end' | 'error', l: (...args: any[]) => any): IProgressStream<T>;
  once(event: 'progress', l: (event: T, ...args: any[]) => any): IProgressStream<T>;
}

export class ProgressStream<T> extends Transform implements IProgressStream<T> {
  // public on(event: "end" | "error", l: (...args: any[]) => any): IProgressStream<T>;
  // public on(event: "progress", l: (event: T, ...args: any[]) => any): IProgressStream<T>;
  // public on(event: any, l: any): IProgressStream<T> {
  //   return super.on(event, l);
  // }
  // public once(event: "end" | "error", l: (...args: any[]) => any): IProgressStream<T>;
  // public once(event: "progress", l: (event: T, ...args: any[]) => any): IProgressStream<T>;
  // public once(event: any, l: any): IProgressStream<T> {
  //   return super.on(event, l);
  // }

  private current = 0;
  public get progressed(): number {
    return this.current;
  }

  constructor(
    public total = 0,
  ) {
    super();
  }

  public _transform(chunk: any, encoding: string, callback: (error?: Error, data?: any) => void): void {
    this.current += typeof chunk === 'string' ? chunk.length : Buffer.isBuffer(chunk) ? chunk.length : 1;
    (this as any).emit('progress', {total: this.total, current: this.current});
    callback(undefined, chunk);
  }
}

interface Algorithm {
  update(data: Buffer | string): void;
}

export class CaptureStream extends Transform {

  public get content(): string | null {
    return this.captured?.join('') ?? null;
  }

  private algorithm: Algorithm | null = null;
  private captured: any[] | null = null;

  public _transform(chunk: Buffer | string, encoding: string, callback: (error?: Error, data?: any) => void): void {
    if (this.captured) {
      this.captured.push(chunk.toString());
      callback(undefined, undefined);
    } else {
      this.algorithm?.update(chunk);
      callback(undefined, chunk);
    }
  }

  public capture(): void {
    this.captured = [];
  }

  public digest(algorithm: Algorithm): void {
    this.algorithm = algorithm;
  }
}

interface URLSearchParamsPrototypeIfc {
  /**
   * Appends a specified key/value pair as a new search parameter.
   */
  append(name: string, value: string): void;
  /**
   * Deletes the given search parameter, and its associated value, from the list of all search parameters.
   */
  delete(name: string): void;
  /**
   * Returns the first value associated to the given search parameter.
   */
  get(name: string): string | null;
  /**
   * Returns all the values association with a given search parameter.
   */
  getAll(name: string): string[];
  /**
   * Returns a Boolean indicating if such a search parameter exists.
   */
  has(name: string): boolean;
  /**
   * Sets the value associated to a given search parameter to the given value. If there were several values, delete the others.
   */
  set(name: string, value: string): void;
  sort(): void;
  forEach(callbackfn: (value: string, key: string, parent: URLSearchParams) => void, thisArg?: any): void;
}

declare interface FormDataPrototypeIfc {
  /**
   * Appends a specified key/value pair as a new search parameter.
   */
  append(name: string, data: Buffer | Blob | Readable, filename?: string): void;
  /**
   * Appends a specified key/value pair as a new search parameter.
   */
  append(name: string, value: string): void;
  /**
   * Deletes the given search parameter, and its associated value, from the list of all search parameters.
   */
  delete(name: string): void;
  /**
   * Returns the first value associated to the given search parameter.
   */
  get(name: string): string | null;
  /**
   * Returns all the values association with a given search parameter.
   */
  getAll(name: string): string[];
  /**
   * Returns a Boolean indicating if such a search parameter exists.
   */
  has(name: string): boolean;
  /**
   * Sets the value associated to a given search parameter to the given value. If there were several values, delete the others.
   */
  set(name: string, value: string): void;
  sort(): void;
  forEach(callbackfn: (value: string, key: string, parent: FormDataIfc) => void, thisArg?: any): void;
}

declare interface FormDataIfc {
  new (init?: FormDataIfc | string | { [key: string]: string | string[] | undefined } | Iterable<[string, string]> | Array<[string, string]>): FormDataPrototypeIfc;
  prototype: FormDataPrototypeIfc;
}

declare interface URLSearchParamsIfc {
  new (init?: URLSearchParamsIfc | string | { [key: string]: string | string[] | undefined } | Iterable<[string, string]> | Array<[string, string]>): FormDataPrototypeIfc;
  prototype: URLSearchParamsPrototypeIfc;
}

declare const self: any;
declare const global: any;

const root: any = typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : this;
const FormData: FormDataIfc | undefined = root.FormData;
const URLSearchParams: URLSearchParamsIfc | undefined = root.URLSearchParams;

const FormDataImpl: FormDataIfc = FormData ?? require('form-data');
const URLSearchParamsImpl: URLSearchParamsIfc = URLSearchParams ?? require('url').URLSearchParams;

export {
  FormDataImpl as FormData,
  URLSearchParamsImpl as URLSearchParams,
}
