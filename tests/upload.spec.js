const http = require('http');
const fs = require('fs');
const {HttpTransport} = require('../dist/http.transport');

describe('upload', () => {
  let server;
  let port;
  let progress = [];

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

    progress = [];
  });

  afterAll(done => {
    server.close(done);
  });

  it('uploads ok', async () => {
    const name = './' + Math.random().toString(36);
    const http = new HttpTransport();

    fs.writeFileSync(name, 'test stream');

    const size = fs.statSync(name).size;

    try {
      const src = fs.createReadStream(name);
      const r = await http.upload('PUT', `http://127.0.0.1:${port}`, {src, size, progress: {
          next(v) { progress.push(v)},
          complete () {},
          error() {},
        }});

      expect(r).toStrictEqual({ok: 'ok'});

      expect(progress).toStrictEqual([
        {total: size, current: 0},
        {total: size, current: size},
      ])
    } catch (e) {
      console.error(e);
    } finally {
      try {
        fs.unlinkSync(name);
      } catch (e) {
        // ignored
      }
    }
  });

  it('uploads 500', async () => {
    const http = new HttpTransport();
    const name = './' + Math.random().toString(36);

    fs.writeFileSync(name, 'test stream');

    const size = fs.statSync(name).size;

    try {
      const src = fs.createReadStream(name);
      const r = await http.upload('POST', `http://127.0.0.1:${port}`, {src, size});
      fail(`Expected to throw`);
    } catch (e) {
      expect(e.name).toBe('Error');
      expect(e.message).toBe('error');
      expect(e.data).toStrictEqual({ok: 'ok'});
    } finally {
      try {
        fs.unlinkSync(name);
      } catch (e) {
        // ignored
      }
    }
  });
});
