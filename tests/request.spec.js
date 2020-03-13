const http = require('http');
const {HttpTransport} = require('../dist/http.transport');

describe('request', () => {
  let server;
  let port;

  beforeAll(done => {
    server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.write('{"ok": "ok", "message": "error"}');
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
  });

  it('fetches ok', async () => {
    const http = new HttpTransport();

    const data = await http.get( `http://127.0.0.1:${port}`);

    expect(data).toStrictEqual({ok: 'ok'});
  });

  it('fetches 500', async () => {
    const http = new HttpTransport();

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
