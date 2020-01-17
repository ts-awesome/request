const http = require('http');
const fs = require('fs');
const {HttpTransport} = require('../dist/http.transport');

describe('download', () => {
  let server;
  let port;

  beforeAll(done => {
    server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({"ok": "ok", "message": "error"}));
        res.end();
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({"ok": "ok"}));
        res.end();
      }
    });
    server.listen(done);

    port = server.address().port;
  });

  afterAll(done => {
    server.close(done);
  });

  it('downloads ok', async () => {
    const name = './' + Math.random().toString(36);
    const http = new HttpTransport();

    try {
      const dest = fs.createWriteStream(name);
      const r = await http.download('GET', `http://127.0.0.1:${port}`, {dest});

      await new Promise(r => setTimeout(r, 500));

      const data = fs.readFileSync(name).toString();
      expect(data).toBe(JSON.stringify({ok: 'ok'}));
    } finally {
      try {
        fs.unlinkSync(name);
      } catch (e) {
        // ignored
      }
    }
  });

  it('downloads 500', async () => {
    const http = new HttpTransport();
    const name = './' + Math.random().toString(36);

    const dest = fs.createWriteStream(name);

    try {
      const r = await http.download('POST', `http://127.0.0.1:${port}`, {dest});
      fail(`Expected to throw`);
    } catch (e) {
      expect(e.name).toBe('Error');
      expect(e.message).toBe('error');
      expect(e.data).toStrictEqual({ok: 'ok'});

      await new Promise(r => setTimeout(r, 500));

      const data = fs.readFileSync(name).toString();
      expect(data).toBe('');
    } finally {
      try {
        fs.unlinkSync(name);
      } catch (e) {
        // ignored
      }
    }
  });
});
