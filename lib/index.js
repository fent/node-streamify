const Readable = require('stream').Readable;
const Writable = require('stream').Writable;
const Duplex   = require('stream').Duplex;


/**
 * Proxy some events from underlying readable and writable streams.
 */
const SOURCE_EVENTS = ['error', 'close'];
const DEST_EVENTS = ['drain', 'close'];


/**
 * @constructor
 * @param {Object} options
 *   {Object} superCtor
 *   {boolean} readable
 *   {boolean} writable
 * @return {Duplex}
 */
const Streamify = module.exports = function Streamify(options) {
  options = options || {};
  const readable = options.readable != null ? options.readable : true;
  const writable = options.writable != null ? options.writable : true;

  const superCtor =
    readable && !writable ? Readable :
    writable && !readable ? Writable :
    Duplex;

  // Add `Streamify.prototype` methods.
  const props = {};
  for (let key in Streamify.prototype) {
    props[key] = {
      writable: true,
      enumerable: true,
      configurable: true,
      value: Streamify.prototype[key],
    };
  }

  const o = Object.create(superCtor.prototype, props);
  superCtor.call(o);
  o._readable = readable;
  o._writable = writable;
  o._destWritten = [];

  if (writable) {
    o.once('finish', () => {
      if (o._dest) {
        o._dest.stream.end();
      }
    });
  }
  return o;
};


/**
 * Required implementation by streaming API.
 *
 * @param {number} size
 */
Streamify.prototype._read = function(size) {
  if (this._source) {
    const onreadable = this._source.onreadable = () => {
      if (!this._source) { return; }
      const data = this._source.stream.read(size);
      if (data) {
        this.push(data);
      } else {
        this._source.stream.once('readable', onreadable);
      }
    };
    onreadable();

  } else {
    this._sourceRead = size;
  }
};


/**
 * Required implementation by streaming API.
 *
 * @param {Buffer|string} chunk
 * @param {!string} encoding
 * @param {Function(!Error)} callback
 */
Streamify.prototype._write = function(chunk, encoding, callback) {
  if (this._dest) {
    this._dest.stream.write(chunk, encoding, callback);
  } else {
    this._destWritten.push(arguments);
  }
};


/**
 * Add a stream to be the readable stream source.
 *
 * @param {Readable|Stream} stream
 */
Streamify.prototype.addSource = function(stream) {
  if (this._source) {
    throw Error('A source stream has already been added.');
  }

  const onend = () => { this.push(null); };
  this._source = { stream, listeners: {}, onend };

  SOURCE_EVENTS.forEach((event) => {
    const onevent = this._source.listeners[event] = (arg) => {
      this.emit(event, arg);
    };
    stream.on(event, onevent);
  });

  // Listen for `end` event to signal for end of data.
  stream.on('end', onend);

  // Check if `Readable#_read()` has already been called.
  this._read(this._sourceRead);
};


/**
 * Remove a stream from being the source.
 */
Streamify.prototype.removeSource = function() {
  if (!this._source) {
    throw Error('A source stream has not been added.');
  }

  const source = this._source;
  SOURCE_EVENTS.forEach((event) => {
    source.stream.removeListener(event, source.listeners[event]);
  });
  source.stream.removeListener('readable', source.onreadable);
  source.stream.removeListener('end', source.onend);

  delete this._source;
};


/**
 * Add a stream to be the writable stream destination.
 *
 * @param {Writable|Stream} stream
 */
Streamify.prototype.addDest = function(stream) {
  if (this._dest) {
    throw Error('A destination stream has already been added.');
  }

  this._dest = { stream, listeners: {} };

  DEST_EVENTS.forEach((event) => {
    const onevent = this._dest.listeners[event] = (arg) => {
      this.emit(event, arg);
    };
    stream.on(event, onevent);
  });

  if (this._destWritten.length) {
    this._destWritten.forEach((args) => {
      stream.write.apply(stream, args);
    });
  }
};


/**
 * Remove a stream from being the destination.
 */
Streamify.prototype.removeDest = function() {
  if (!this._dest) {
    throw Error('A destination stream has not been added.');
  }

  const dest = this._dest;
  DEST_EVENTS.forEach((event) => {
    dest.stream.removeListener(event, dest.listeners[event]);
  });

  delete this._dest;
  this._destWritten = [];
};


/**
 * Begins fueling data from actual stream into Streamify instance.
 *
 * @param {Readable|Writable|Duplex|Stream} stream
 */
Streamify.prototype.resolve = function(stream) {
  if (this._readable && stream.readable) {
    this.addSource(stream);
  }

  if (this._writable && stream.writable) {
    this.addDest(stream);
  }
};


/**
 * Removes a stream from this, possibly because another is replacing it.
 */
Streamify.prototype.unresolve = function() {
  if (this._source) {
    this.removeSource();
  }

  if (this._dest) {
    this.removeDest();
  }
};