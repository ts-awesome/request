import {HttpTransportBase} from "./http.transport.base";
import {
  AsyncRequestSignatureProvider,
  AsyncTokenProvider,
  ILogger,
  Options,
  RequestSignatureProvider,
  TokenProvider
} from "./interfaces";

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
