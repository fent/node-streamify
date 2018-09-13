const streamify = require('..');
const assert    = require('assert');
const path      = require('path');
const fs        = require('fs');

const output1 = path.join(__dirname, 'files', 'output1.txt');
const output2 = path.join(__dirname, 'files', 'output2.txt');


describe('Create a writable stream', () => {
  it('Does not throw "write after end" error"', (done) => {
    const stream = streamify({ readable: false });
    stream.resolve(fs.createWriteStream(output1));
    after((done) => fs.unlink(output1, done));
    stream.write('hello\n');
    stream.end('world!');

    stream.on('finish', () => {
      fs.readFile(output1, 'utf8', (err, data) => {
        assert.ifError(err);
        assert.equal(data, 'hello\nworld!');
        done();
      });
    });
  });

  it('Ends underlying write stream when streamify ends', (done) => {
    const stream = streamify({ readable: false });
    stream.end('the only one');

    setTimeout(() => {
      const ws = fs.createWriteStream(output2);
      after((done) => fs.unlink(output2, done));
      stream.resolve(ws);
      ws.on('close', done);
    }, 50);
  });
});
