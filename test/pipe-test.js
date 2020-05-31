const streamify   = require('..');
const assert      = require('assert');
const path        = require('path');
const fs          = require('fs');
const streamEqual = require('stream-equal');
const PassThrough = require('stream').PassThrough;


const input = path.join(__dirname, 'files', 'input1.txt');


describe('Pipe from a readable stream', () => {
  it('Stream `data` events equal to original stream', async () => {
    const writeStream = new PassThrough();
    const readStream = fs.createReadStream(input, { bufferSize: 1024 });
    const stream = streamify();
    stream.pipe(writeStream);

    setTimeout(() => {
      let fileReadStream = fs.createReadStream(input, { bufferSize: 1024 });
      stream.resolve(fileReadStream);
    }, 10);

    let equal = await streamEqual(readStream, writeStream);
    assert.ok(equal);
  });
});

describe('Pipe to a writable stream', () => {
  it('Everything written to final stream', async () => {
    const readStream = fs.createReadStream(input, { bufferSize: 1024 });
    const writeStream = new PassThrough();
    const stream = streamify();
    fs.createReadStream(input, { bufferSize: 1024 }).pipe(stream);

    setTimeout(() => {
      stream.resolve(writeStream);
    }, 10);

    let equal = await streamEqual(readStream, writeStream);
    assert.ok(equal);
  });
});

describe('Pipe to itself', () => {
  it('Everything from source stream written to dest stream', async () => {
    const readStream = fs.createReadStream(input);
    const writeStream = new PassThrough();
    const stream = streamify();
    stream.pipe(stream);

    setTimeout(() => {
      stream.addSource(fs.createReadStream(input));
      stream.addDest(writeStream);
    }, 10);

    let equal = await streamEqual(readStream, writeStream);
    assert.ok(equal);
  });
});
