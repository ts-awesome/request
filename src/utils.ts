import {Transform} from "stream";

export interface IProgressStream<T> {
  on(event: 'end' | 'error', l: (...args: any[]) => any): IProgressStream<T>;
  on(event: 'progress', l: (event: T, ...args: any[]) => any): IProgressStream<T>;
  once(event: 'end' | 'error', l: (...args: any[]) => any): IProgressStream<T>;
  once(event: 'progress', l: (event: T, ...args: any[]) => any): IProgressStream<T>;
}

export class ProgressStream<T=any> extends Transform implements IProgressStream<T> {

  private current = 0;

  constructor(
    public total = 0,
  ) {
    super();
  }

  public _transform(chunk: any, encoding: string, callback: (error?: Error, data?: any) => void): void {
    this.current += typeof chunk === 'string' ? chunk.length : Buffer.isBuffer(chunk) ? chunk.length : 1;
    this.emit('progress', {total: this.total, current: this.current});
    callback(undefined, chunk);
  }
}


export class CaptureStream extends Transform {

  public get content(): string | null {
    return this.captured?.join('') ?? null;
  }

  private captured: any[] | null = null;


  constructor(
    public total = 0,
  ) {
    super();
  }

  public _transform(chunk: any, encoding: string, callback: (error?: Error, data?: any) => void): void {
    if (this.captured) {
      this.captured.push(chunk.toString());
      chunk = undefined;
    }

    callback(undefined, chunk);
  }

  public capture() {
    this.captured = [];
  }
}
