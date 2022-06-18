# @ts-awesome/request

TypeScript friendly node-fetch wrapper with model reader

Key features:

* slim extension over standard fetch interface
* works with node, browser and react-native
* supports [model reader](https://github.com/ts-awesome/model-reader)

## Bare use

Simple json get

```ts
import {http} from "@ts-awesome/request";

const data = await http.get('http://example.com/some.json');
```

Get more control with request

```ts
import {http} from "@ts-awesome/request";

const response = await http.request('http://example.com/some.json');
if (response.ok) {
  const result = await response.text();
}
```

## HttpTransport

For repeatable requests to same base url you may use HttpTransport

```ts
import {HttpTransport} from "@ts-awesome/request";

const http = new HttpTransport(
  console, // optional logger, please check @ts-awesome/logger for more flexibility
  'https://example.com', // base url
  'Bearer some-token' // Authorization
);

const data = await http.get('/some.json');
```

## use with IoC

```ts
import {Container} from "inversify";
import {HttpTransport, HttpTransportSymbol} from "@ts-awesome/request";
import {IHttpTransport} from "./interfaces";

const container: Container;

// default http is plain
container.bind<IHttpTransport>(HttpTransportSymbol)
  .to(HttpTransport);

// special api preconfigure
container.bind<IHttpTransport>(HttpTransportSymbol)
  .toDynamicValue(() => new HttpTransport('https://api.example.com'))
  .whenNamed('api');

```
