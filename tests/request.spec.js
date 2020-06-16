const http = require('http');
const {HttpTransport} = require('../dist/http.transport');
const utils = require('../dist/utils');
const fs = require('fs');

describe('request', () => {
  let server;
  let port;
  let name;

  beforeAll(done => {
    name = './' + Math.random().toString(36);
    fs.writeFileSync(name, 'test stream ' + Math.random().toString(16));

    const size = fs.statSync(name).size;

    server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.write('{"ok": "ok", "message": "error"}');
        res.end();
      } else if (req.method === 'PUT') {
        // console.log('HERE');
        // res.setHeader('Content-Length', '12');

        // console.log(req.headers);
        req.on('data', chunk => {
          console.log(`Data chunk available: ${chunk}`);
        })
        req.on('end', () => {
          // console.log('HERE 2a');
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.statusMessage = 'OK';
        res.write(JSON.stringify({ok: 'ok'}));
        res.end();

      } else {
        res.setHeader('Content-Type', 'application/json');
        res.write('{"ok": "ok"}');
        res.end();
      }
    });
    server.listen(done);

    port = server.address().port;
  });

  afterAll(done => {
    server.close(done);
    try {
      fs.unlinkSync(name);
    } finally {

    }
  });

  it('fetches ok', async () => {
    const http = new HttpTransport(console, undefined, 'Bearer 123');

    const data = await http.get( `http://127.0.0.1:${port}`);

    expect(data).toStrictEqual({ok: 'ok'});
  });

  it('fetches 500', async () => {
    const http = new HttpTransport(console);

    try {
      await http.post(`http://127.0.0.1:${port}`);
      fail(`Expected to throw`);
    } catch (e) {
      expect(e.name).toBe('Error');
      expect(e.message).toBe('error');
      expect(e.data).toStrictEqual({ok: 'ok'});
    }
  });
});
