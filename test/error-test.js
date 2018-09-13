const streamify = require('..');
const assert    = require('assert');


describe('Errorneously call stream methods', () => {
  describe('Call `stream.addSource()` with an existing source', () => {
    it('Throws error', () => {
      const stream = streamify();
      stream.addSource(streamify());
      assert.throws(() => {
        stream.addSource(streamify());
      }, /source stream has already been added/);
    });
  });

  describe('Call `stream.addDest()` with an existing dest', () => {
    it('Throws error', () => {
      const stream = streamify();
      stream.addDest(streamify());
      assert.throws(() => {
        stream.addDest(streamify());
      }, /destination stream has already been added/);
    });
  });

  describe('Call `stream.removeSource()` without adding one', () => {
    it('Throws error', () => {
      const stream = streamify();
      assert.throws(() => {
        stream.removeSource();
      }, /source stream has not been added/);
    });
  });

  describe('Call `stream.removeDest()` without adding one', () => {
    it('Throws error', () => {
      const stream = streamify();
      assert.throws(() => {
        stream.removeDest(streamify());
      }, /destination stream has not been added/);
    });
  });

});
