const streamify = require('..');
const assert    = require('assert');
const path      = require('path');
const fs        = require('fs');

const input = path.join(__dirname, 'files', 'input1.txt');


describe('Create a readable stream', () => {
  describe('Pipe and resolve() after an async operation', () => {
    it('Receives all `data` and `end` events', (done) => {
      const stream = streamify({ writable: false });
      setTimeout(() => {
        stream.resolve(fs.createReadStream(input, { bufferSize: 1024 }));
      }, 10);

      let length = 0;
      stream.on('readable', () => {
        const data = stream.read();
        if (data && data.length) {
          length += data.length;
        }
      });

      stream.on('error', done);
      stream.on('end', () => {
        assert.equal(length, 29763);
        done();
      });
    });

    describe('unresolve() and resolve() again', () => {
      it('Keeps receiving `data` events from new stream', (done) => {
        const stream = streamify({ writable: false });
        const rs = fs.createReadStream(input, { bufferSize: 1024 });
        stream.resolve(rs);

        let length = 0;
        const onreadable = () => {
          const data = stream.read();
          if (data) {
            length += data.length;
            if (length >= 10000) {
              stream.unresolve();
              rs.destroy();
              setTimeout(() => {
                stream.resolve(fs.createReadStream(input, {
                  bufferSize: 1024
                }));
                length = 10000;
                stream.on('readable', () => {
                  const data = stream.read();
                  if (data) {
                    length += data.length;
                  }
                });
              }, 10);
              stream.removeListener('readable', onreadable);
            }
          }
        };
        stream.on('readable', onreadable);

        stream.on('error', done);
        stream.on('end', () => {
          assert.equal(length, 39763);
          done();
        });
      });
    });
  });
});
