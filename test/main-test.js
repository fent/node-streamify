var streamify = require('..')
  , assert    = require('assert')
  , path      = require('path')
  , fs        = require('fs')
  , Stream    = require('stream').Stream
  ;


var input = path.join(__dirname, 'files', 'input1.txt')
  , output = path.join(__dirname, 'files', 'output.txt')
  ;


describe('Create a readable stream', function() {
  describe('with default `superCtor`', function() {
    var stream = streamify({ writable: false });

    it('Is an instance of `Stream`', function() {
      assert.ok(!!(stream instanceof Stream));
    });

    describe('pipe and resolve after an async operation', function() {
      it('receives all `data` and `end` events', function(done) {
        setTimeout(function() {
          stream.resolve(fs.createReadStream(input, { bufferSize: 1024 }));
        }, 10);

        var length = 0;
        stream.on('data', function(data) {
          length += data.length;
        });

        stream.on('error', done);
        stream.on('end', function() {
          assert.equal(length, 29763);
          done();
        });
      });
    });
  });

  describe('with custom `superCtor` as `fs.WriteStream`', function() {
    var stream = streamify({ superCtor: fs.WriteStream, writable: false });

    it('Is an instance of `Stream`', function() {
      assert.ok(!!(stream instanceof Stream));
    });

    it('Is an instance of `fs.WriteStream`', function() {
      assert.ok(!!(stream instanceof fs.WriteStream));
    });
  });
});


describe('Create a writable stream', function() {
  it('Can pipe to it from a readable stream', function(done) {
    var fileReadStream = fs.createReadStream(input, { bufferSize: 1024 });
    var stream = streamify();
    fileReadStream.pipe(stream);

    fileReadStream.on('error', done);
    stream.on('error', done);

    var queueCalled = false;
    stream.once('queueCall', function(method, args) {
      queueCalled = true;
      assert.equal(method, 'write');
      assert.ok(Buffer.isBuffer(args[0]));
    });

    fileReadStream.on('end', function() {
      var inputData = fs.readFileSync(input);
      var outputData = fs.readFileSync(output);
      fs.unlink(output);

      assert.deepEqual(inputData, outputData);
      assert.ok(queueCalled);
      done();
    });

    setTimeout(function() {
      stream.resolve(fs.createWriteStream(output));
    }, 10);
  });
});
