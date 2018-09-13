const streamify = require('..');
const assert    = require('assert');
const Duplex    = require('stream').Duplex;
const Readable  = require('stream').Readable;


describe('Create a stream', () => {
  describe('With default `superCtor`', () => {
    it('Is an instance of `Stream`', () => {
      const stream = streamify();
      assert.ok(!!(stream instanceof Duplex));
    });
  });

  describe('With custom `superCtor` as `Readable`', () => {
    it('Is an instance of `Readable`', () => {
      const stream = streamify({ superCtor: Readable });
      assert.ok(stream instanceof Readable);
    });
  });
});
