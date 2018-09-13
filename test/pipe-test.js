const streamify   = require('..');
const assert      = require('assert');
const path        = require('path');
const fs          = require('fs');
const streamEqual = require('stream-equal');
const PassThrough = require('stream').PassThrough;


const input = path.join(__dirname, 'files', 'input1.txt');


describe('Pipe from a readable stream', () => {
  it('Stream `data` events equal to original stream', (done) => {
    const writeStream = new PassThrough();
    const readStream = fs.createReadStream(input, { bufferSize: 1024 });
    const stream = streamify();
    stream.pipe(writeStream);

    streamEqual(readStream, writeStream, (err, equal) => {
      assert.ifError(err);
      assert.ok(equal);
      done();
    });

    setTimeout(() => {
      let fileReadStream = fs.createReadStream(input, { bufferSize: 1024 });
      stream.resolve(fileReadStream);
    }, 10);
  });
});

describe('Pipe to a writable stream', () => {
  it('Everything written to final stream', (done) => {
    const readStream = fs.createReadStream(input, { bufferSize: 1024 });
    const writeStream = new PassThrough();
    const stream = streamify();
    fs.createReadStream(input, { bufferSize: 1024 }).pipe(stream);

    streamEqual(readStream, writeStream, (err, equal) => {
      assert.ifError(err);
      assert.ok(equal);
      done();
    });

    setTimeout(() => {
      stream.resolve(writeStream);
    }, 10);
  });
});

describe('Pipe to itself', () => {
  it('Everything from source stream written to dest stream', (done) => {
    const readStream = fs.createReadStream(input);
    const writeStream = new PassThrough();
    const stream = streamify();
    stream.pipe(stream);

    streamEqual(readStream, writeStream, (err, equal) => {
      assert.ifError(err);
      assert.ok(equal);
      done();
    });

    setTimeout(() => {
      stream.addSource(fs.createReadStream(input));
      stream.addDest(writeStream);
    }, 10);
  });
});
