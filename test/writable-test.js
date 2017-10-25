const streamify = require('..');
const assert    = require('assert');
const path      = require('path');
const fs        = require('fs');

const output1 = path.join(__dirname, 'files', 'output1.txt');
const output2 = path.join(__dirname, 'files', 'output2.txt');


describe('Create a writable stream', () => {
  it('Does not throw "write after end" error"', (done) => {
    var stream = streamify({ readable: false });
    stream.resolve(fs.createWriteStream(output1));
    stream.write('hello\n');
    stream.end('world!');

    stream.on('finish', () => {
      fs.readFile(output1, 'utf8', (err, data) => {
        if (err) return done(err);
        fs.unlink(output1, () => {});
        assert.equal(data, 'hello\nworld!');
        done();
      });
    });
  });

  it('Ends underlying write stream when streamify ends', (done) => {
    var stream = streamify({ readable: false });
    stream.end('the only one');

    setTimeout(() => {
      var ws = fs.createWriteStream(output2);
      stream.resolve(ws);
      
      ws.on('close', () => {
        fs.unlink(output2, () => {});
        done();
      });
    }, 50);
  });
});
