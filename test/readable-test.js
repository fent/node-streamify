var streamify = require('..');
var assert    = require('assert');
var path      = require('path');
var fs        = require('fs');

var input = path.join(__dirname, 'files', 'input1.txt');


describe('Create a readable stream', function() {
  var stream = streamify({ writable: false });

  describe('pipe and resolve() after an async operation', function() {
    it('receives all `data` and `end` events', function(done) {
      setTimeout(function() {
        stream.resolve(fs.createReadStream(input, { bufferSize: 1024 }));
      }, 10);

      var length = 0;
      stream.on('readable', function() {
        var data = stream.read();
        if (data.length) {
          length += data.length;
        }
      });

      stream.on('error', done);
      stream.on('end', function() {
        assert.equal(length, 29763);
        done();
      });
    });

    describe('unresolve() and resolve() again', function() {
      it('keeps receiving `data` events from new stream', function(done) {
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
          stream.on('readable', function() {
            var data = stream.read();
            if (data) {
              length += data.length;
            }
          });
        }

        stream.on('error', done);
        stream.on('end', function() {
          assert.equal(length, 39763);
          done();
        });
      });
    });
  });
});
