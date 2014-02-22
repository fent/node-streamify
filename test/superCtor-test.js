var streamify = require('..');
var assert    = require('assert');
var Duplex    = require('readable-stream').Duplex;
var Readable  = require('readable-stream').Readable;


describe('Create a stream', function() {
  describe('with default `superCtor`', function() {
    var stream = streamify();

    it('Is an instance of `Stream`', function() {
      assert.ok(!!(stream instanceof Duplex));
    });
  });

  describe('with custom `superCtor` as `Readable`', function() {
    var stream = streamify({ superCtor: Readable });

    it('Is an instance of `Readable`', function() {
      assert.ok(stream instanceof Readable);
    });
  });
});
