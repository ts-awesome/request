import {HttpTransportBase} from "./http.transport.base";
import {ILogger, Options, TokenProvider} from "./interfaces";

import fetch from 'cross-fetch';

export abstract class HttpTransport extends HttpTransportBase<Options, Response> {

  protected constructor(
    protected logger?: ILogger,
    protected baseUrl?: string,
    protected authorization?: string | TokenProvider,
  ) {
    super(fetch, logger, baseUrl, authorization);
  }

}
