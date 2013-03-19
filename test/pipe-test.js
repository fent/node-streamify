var streamify   = require('..');
var assert      = require('assert');
var path        = require('path');
var fs          = require('fs');
var streamEqual = require('stream-equal');
var PassThrough = require('readable-stream').PassThrough;


var input = path.join(__dirname, 'files', 'input1.txt');


describe('Pipe from a readable stream', function() {
  it('Stream `data` events equal to original stream', function(done) {
    var writeStream = new PassThrough();
    var readStream = fs.createReadStream(input, { bufferSize: 1024 });
    var stream = streamify();
    stream.pipe(writeStream);

    streamEqual(readStream, writeStream, function(err, equal) {
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
    var readStream = fs.createReadStream(input, { bufferSize: 1024 });
    var writeStream = new PassThrough();
    var stream = streamify();
    readStream.pipe(stream);

    streamEqual(readStream, writeStream, function(err, equal) {
      if (err) return done(err);

      assert.ok(equal);
      done();
    });

    setTimeout(function() {
      stream.resolve(writeStream);
    }, 10);
  });
});


describe('Pipe to itself', function() {
  it('Everything from source stream written to dest stream', function(done) {
    var readStream = fs.createReadStream(input);
    var writeStream = new PassThrough();
    var stream = streamify();
    stream.pipe(stream);

    streamEqual(readStream, writeStream, function(err, equal) {
      if (err) return done(err);

      assert.ok(equal);
      done();
    });

    setTimeout(function() {
      stream.addSource(fs.createReadStream(input));
      stream.addDest(writeStream);
    }, 10);
  });
});
