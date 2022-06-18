import {HttpTransportBase} from "./http.transport.base";
import {
  AsyncRequestSignatureProvider,
  AsyncTokenProvider,
  ElementType,
  HttpMethod,
  IHttpTransport,
  ILogger,
  Options,
  RequestSignatureProvider,
  TokenProvider,
  WithDestination,
  WithModel,
  WithProgress,
  WithSource
} from "./interfaces";
import {Readable} from "stream";

export class HttpTransport extends HttpTransportBase<Options, Response> {

  constructor(
    protected logger?: ILogger,
    protected baseUrl?: string,
    protected authorization?: string | TokenProvider | AsyncTokenProvider,
    protected requestSignature?: string | RequestSignatureProvider | AsyncRequestSignatureProvider,
  ) {
    super(require('cross-fetch').fetch, logger, baseUrl, authorization, requestSignature);
  }

}

export const http: IHttpTransport = {
  get<T>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T> {
    return new HttpTransport().get(uri, options);
  },
  post<T>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T> {
    return new HttpTransport().post(uri, options);
  },
  patch<T>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T> {
    return new HttpTransport().patch(uri, options);
  },
  put<T>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T> {
    return new HttpTransport().put(uri, options);
  },
  delete<T>(uri: string, options?: Options & WithModel<ElementType<T>>): Promise<T> {
    return new HttpTransport().delete(uri, options);
  },
  head(uri: string, options?: Options): Promise<void> {
    return new HttpTransport().head(uri, options);
  },
  request(method: HttpMethod, uri: string, options?: Options & {timeout?: number}): Promise<Response> {
    return new HttpTransport().request(method, uri, options);
  },
  stream<T>(method: HttpMethod, uri: string, options?: Options & WithProgress): Promise<(Readable & {total: number}) | null> {
    return new HttpTransport().stream(method, uri, options);
  },
  download<T>(method: HttpMethod, uri: string, options: Options & WithProgress & WithDestination): Promise<void> {
    return new HttpTransport().download(method, uri, options);
  },
  upload<T>(method: HttpMethod, uri: string, options: Options & WithModel<ElementType<T>> & WithProgress & WithSource): Promise<T> {
    return new HttpTransport().upload(method, uri, options);
  }
}
