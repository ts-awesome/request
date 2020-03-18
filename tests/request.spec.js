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
          // console.log(`Data chunk available: ${chunk}`)
        })
        req.on('end', () => {
          // console.log('HERE 2a');
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.statusMessage = 'OK';
        res.write(JSON.stringify({ok: 'ok'}));
        res.end();

      } else if (req.url.endsWith('/file')) {
        // const strem =  fs.createReadStream(name);
        // strem.pipe(res);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');
        res.statusMessage = 'OK';
        fs.createReadStream(name).pipe(res);
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
    const http = new HttpTransport();

    const data = await http.get( `http://127.0.0.1:${port}`);

    expect(data).toStrictEqual({ok: 'ok'});
  });

  it ('put formData as stream', async () => {
    const httpTransport = new HttpTransport();
    try {
      // const file = await (await httpTransport.request('GET', `http://127.0.0.1:${port}`)).blob();

      const src = await httpTransport.stream('GET', `http://127.0.0.1:${port}/file`);

      const formData = new utils.FormData();

      formData.append('test', '1');
      formData.append('src', src, 'file.txt');
      formData.append('other', '2');

      const data = await httpTransport.put(`http://127.0.0.1:${port}`, {body: formData});

      await new Promise(r => setTimeout(r, 50));
      expect(JSON.stringify(data)).toBe(JSON.stringify({ok: 'ok'}));
    } finally {
        try {
          // fs.unlinkSync(name);
        } catch (e) {
          // ignored
        }
      }
  })

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
