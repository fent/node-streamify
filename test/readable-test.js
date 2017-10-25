const streamify = require('..');
const assert    = require('assert');
const path      = require('path');
const fs        = require('fs');

const input = path.join(__dirname, 'files', 'input1.txt');


describe('Create a readable stream', () => {
  var stream = streamify({ writable: false });

  describe('pipe and resolve() after an async operation', () => {
    it('receives all `data` and `end` events', (done) => {
      setTimeout(() => {
        stream.resolve(fs.createReadStream(input, { bufferSize: 1024 }));
      }, 10);

      var length = 0;
      stream.on('readable', () => {
        var data = stream.read();
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
      it('keeps receiving `data` events from new stream', (done) => {
        var stream = streamify({ writable: false });
        var rs = fs.createReadStream(input, { bufferSize: 1024 });
        stream.resolve(rs);

        var length = 0;
        stream.on('readable', function onreadable() {
          var data = stream.read();
          if (data) {
            length += data.length;
            if (length >= 10000) {
              stream.unresolve();
              rs.destroy();
              setTimeout(createSecondStream, 10);
              stream.removeListener('readable', onreadable);
            }
          }
        });

        function createSecondStream() {
          stream.resolve(fs.createReadStream(input, { bufferSize: 1024 }));

          length = 10000;
          stream.on('readable', () => {
            var data = stream.read();
            if (data) {
              length += data.length;
            }
          });
        }

        stream.on('error', done);
        stream.on('end', () => {
          assert.equal(length, 39763);
          done();
        });
      });
    });
  });
});
