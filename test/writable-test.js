const streamify = require('..');
const assert    = require('assert');
const path      = require('path');
const fs        = require('fs');


describe('Create a writable stream', () => {
  it('Does not throw "write after end" error"', (done) => {
    const output1 = path.join(__dirname, 'files', 'output1.txt');
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
    const output2 = path.join(__dirname, 'files', 'output2.txt');
    const stream = streamify({ readable: false });
    stream.end('the only one');

    setTimeout(() => {
      const ws = fs.createWriteStream(output2);
      after((done) => fs.unlink(output2, done));
      stream.resolve(ws);
      ws.on('close', done);
    }, 50);
  });

  describe('Add another destination after unresolving', () => {
    it('Writes to both streams', (done) => {
      const output3 = path.join(__dirname, 'files', 'output3.txt');
      const output4 = path.join(__dirname, 'files', 'output4.txt');
      const stream = streamify({ readable: false });

      stream.resolve(fs.createWriteStream(output3));
      after((done) => fs.unlink(output3, done));
      stream.write('one\n');
      stream.unresolve();

      stream.resolve(fs.createWriteStream(output4));
      after((done) => fs.unlink(output4, done));
      stream.write('two!\n');
      stream.end('end\n');

      stream.on('finish', () => {
        let n = 2;
        fs.readFile(output3, 'utf8', (err, data) => {
          assert.ifError(err);
          assert.equal(data, 'one\n');
          if (--n === 0) { done(); }
        });
        fs.readFile(output4, 'utf8', (err, data) => {
          assert.ifError(err);
          assert.equal(data, 'two!\nend\n');
          if (--n === 0) { done(); }
        });
      });
    });
  });
});
