const http = require('http');
const {HttpTransport} = require('../dist/http.transport');
const utils = require('../dist/utils');
const fs = require('fs');
const FormData = require('form-data');

describe('request', () => {
  let server;
  let port;
  let name;
  let progress;

  beforeAll(done => {
    name = './' + Math.random().toString(36);
    fs.writeFileSync(name, 'test stream ' + Math.random().toString(16));

    const size = fs.statSync(name).size;

    server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.write('{"ok": "ok"}');
        res.end();
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.write('{"ok": "ok"}');
        res.end();
      }
    });
    server.listen(done);

    port = server.address().port;
    progress = [];
  });

  afterAll(done => {
    server.close(done);
    try {
      fs.unlinkSync(name);
    } finally {

    }
  });

  it ('post URLSearchParams', async () => {
    const httpTransport = new HttpTransport(console);
    try {
      const src = await httpTransport.stream('GET', `http://127.0.0.1:${port}/file`);

      const searchParams = new utils.URLSearchParams();

      searchParams.append('test', '1');
      searchParams.append('name', 'file.txt');
      searchParams.append('other', '2');

      const data = await httpTransport.post(`http://127.0.0.1:${port}`, {body: searchParams});

      await new Promise(r => setTimeout(r, 50));
      expect(JSON.stringify(data)).toBe(JSON.stringify({ok: 'ok'}));
    } finally {
        try {
        } catch (e) {
          // ignored
        }
      }
  })
});
