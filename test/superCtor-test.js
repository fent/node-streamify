var streamify = require('..');
var assert    = require('assert');
var fs        = require('fs');
var Stream    = require('stream');


describe('Create a stream', function() {
  describe('with default `superCtor`', function() {
    var stream = streamify();

    it('Is an instance of `Stream`', function() {
      assert.ok(!!(stream instanceof Stream));
    });
  });

  describe('with custom `superCtor` as `fs.WriteStream`', function() {
    var stream = streamify({ superCtor: fs.WriteStream });

    it('Is an instance of `Stream`', function() {
      assert.ok(stream instanceof Stream);
    });

    it('Is an instance of `fs.WriteStream`', function() {
      assert.ok(stream instanceof fs.WriteStream);
    });
  });
});
