const http = require('http');
const fs = require('fs');
const {HttpTransport} = require('../dist/http.transport');

describe('download', () => {
  let server;
  let port;

  beforeAll(done => {
    server = http.createServer((req, res) => {
      if (req.method === 'PATCH') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', '20000');
        res.write('BROKEN-PDF');
        setTimeout(() => res.end(), 500);
      } else if (req.method === 'POST') {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({"ok": "ok", "message": "error"}));
        setTimeout(() => res.end(), 500);
      } else if (req.method === 'PUT') {
        res.statusCode = 200;
        res.setHeader('Digest', 'sha-256=X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=');
        res.write('BROKEN-PDF');
        setTimeout(() => res.end(), 500);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({"ok": "ok"}));
        setTimeout(() => res.end(), 500);
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

  it('downloads broken pdf', async () => {
    const http = new HttpTransport();
    const name = './' + Math.random().toString(36);

    const dest = fs.createWriteStream(name);

    try {
      const r = await http.download('PATCH', `http://127.0.0.1:${port}`, {dest, timeout: 2000});
      fail(`Expected to throw`);
    } catch (e) {
      expect(e.name).toBe('RequestError');
      expect(e.message).toBe('Broken connection');

      await new Promise(r => setTimeout(r, 500));

      const data = fs.readFileSync(name).toString();
      expect(data).toBe('BROKEN-PDF');
    } finally {
      try {
        fs.unlinkSync(name);
      } catch (e) {
        // ignored
      }
    }
  });

  it('downloads failed digest', async () => {
    const http = new HttpTransport();
    const name = './' + Math.random().toString(36);

    const dest = fs.createWriteStream(name);

    try {
      const r = await http.download('PUT', `http://127.0.0.1:${port}`, {dest});
      fail(`Expected to throw`);
    } catch (e) {
      expect(e.name).toBe('RequestError');
      expect(e.message).toBe('Digest mismatch');

      await new Promise(r => setTimeout(r, 500));

      const data = fs.readFileSync(name).toString();
      expect(data).toBe('BROKEN-PDF');
    } finally {
      try {
        fs.unlinkSync(name);
      } catch (e) {
        // ignored
      }
    }
  });
});
