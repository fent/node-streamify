var streamify = require('..');
var assert    = require('assert');
var path      = require('path');
var fs        = require('fs');

var output1 = path.join(__dirname, 'files', 'output1.txt');
var output2 = path.join(__dirname, 'files', 'output2.txt');


describe('Create a writable stream', function() {
  it('Does not throw "write after end" error"', function(done) {
    var stream = streamify({ readable: false });
    stream.resolve(fs.createWriteStream(output1));
    stream.write('hello\n');
    stream.end('world!');

    stream.on('finish', function() {
      fs.readFile(output1, 'utf8', function(err, data) {
        if (err) return done(err);
        fs.unlink(output1, function() {});
        assert.equal(data, 'hello\nworld!');
        done();
      });
    });
  });

  it('Ends underlying write stream when streamify ends', function(done) {
    var stream = streamify({ readable: false });
    stream.end('the only one');

    setTimeout(function() {
      var ws = fs.createWriteStream(output2);
      stream.resolve(ws);
      
      ws.on('close', function onfinish() {
        fs.unlink(output2, function() {});
        done();
      });
    }, 50);
  });
});
