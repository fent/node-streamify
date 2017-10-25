const streamify = require('..');
const assert    = require('assert');
const Duplex    = require('stream').Duplex;
const Readable  = require('stream').Readable;


describe('Create a stream', () => {
  describe('with default `superCtor`', () => {
    var stream = streamify();

    it('Is an instance of `Stream`', () => {
      assert.ok(!!(stream instanceof Duplex));
    });
  });

  describe('with custom `superCtor` as `Readable`', () => {
    var stream = streamify({ superCtor: Readable });

    it('Is an instance of `Readable`', () => {
      assert.ok(stream instanceof Readable);
    });
  });
});
