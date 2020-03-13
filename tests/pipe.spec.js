const http = require('http');
const fs = require('fs');
const {HttpTransport} = require('../dist/http.transport');

describe('download', () => {
  let server;
  let port;

  beforeAll(done => {
    server = http.createServer((req, res) => {
      if (req.method === 'PUT') {
        res.statusCode = 200;
        res.setHeader('Content-Length', req.headers['content-length']);
        res.setHeader('Content-Type', 'application/json');
        req.pipe(res);
      } else {
        const data = JSON.stringify({"ok": "ok"});
        res.setHeader('Content-Length', data.length.toString());
        res.setHeader('Content-Type', 'application/json');
        res.write(data);
        setTimeout(() => res.end(), 500);
      }
    });
    server.listen(done);

    port = server.address().port;
  });

  afterAll(done => {
    server.close(done);
  });

  it('pipe ok', async () => {
    const name = './' + Math.random().toString(36);
    const http = new HttpTransport();

    try {
      const src = await http.stream('GET', `http://127.0.0.1:${port}`);
      const data = await http.upload('PUT', `http://127.0.0.1:${port}`, {src, size: src.total});
      await new Promise(r => setTimeout(r, 500));
      expect(JSON.stringify(data)).toBe(JSON.stringify({ok: 'ok'}));
    } finally {
      try {
        fs.unlinkSync(name);
      } catch (e) {
        // ignored
      }
    }
  });
});
