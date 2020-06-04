import {HttpTransportBase} from "./http.transport.base";
import {ILogger, Options, TokenProvider} from "./interfaces";

export class HttpTransport extends HttpTransportBase<Options, Response> {

  constructor(
    protected logger?: ILogger,
    protected baseUrl?: string,
    protected authorization?: string | TokenProvider,
  ) {
    super(require('cross-fetch').fetch, logger, baseUrl, authorization);
  }

}
