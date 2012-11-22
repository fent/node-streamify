var streamify   = require('..');
var assert      = require('assert');
var path        = require('path');
var fs          = require('fs');
var streamEqual = require('stream-equal');
var through     = require('through');


var input = path.join(__dirname, 'files', 'input1.txt');


describe('Pipe from a readable stream', function() {
  it('Stream `data` events equal to original stream', function(done) {
    var writeStream = through();
    var stream = streamify();
    stream.pipe(writeStream);

    streamEqual(stream, writeStream, function(err, equal) {
      if (err) return done(err);

      assert.ok(equal);
      done();
    });

    setTimeout(function() {
      var fileReadStream = fs.createReadStream(input, { bufferSize: 1024 });
      stream.resolve(fileReadStream);
    }, 10);
  });
});


describe('Pipe to a writable stream', function() {
  it('Everything written to final stream', function(done) {
    var fileReadStream = fs.createReadStream(input, { bufferSize: 1024 });
    var writeStream = through();
    var stream = streamify();
    fileReadStream.pipe(stream);

    var queueCalled = false;
    stream.once('queueCall', function(method, args) {
      queueCalled = true;
      assert.equal(method, 'write');
      assert.ok(Buffer.isBuffer(args[0]));
    });

    streamEqual(fileReadStream, writeStream, function(err, equal) {
      if (err) return done(err);

      assert.ok(equal);
      assert.ok(queueCalled);
      done();
    });

    setTimeout(function() {
      stream.resolve(writeStream);
    }, 10);
  });
});
