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
        res.setHeader('Content-Length', '100000');
        res.statusMessage = 'OK';
        for(let i=0; i < 10000; i++) {
          res.write('0123456789');
        }
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

  it ('put formData as stream', async () => {
    const httpTransport = new HttpTransport();
    try {
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
        } catch (e) {
          // ignored
        }
      }
  })
});
