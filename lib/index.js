const Readable = require('stream').Readable;
const Writable = require('stream').Writable;
const Duplex   = require('stream').Duplex;


/**
 * Proxy some events from underlying readable and writable streams.
 */
const SOURCE_EVENTS = ['error', 'close'];
const DEST_EVENTS = ['drain', 'close'];


/**
 * @param {Object} options
 * @param {Object} options.superCtor
 * @param {boolean} options.readable
 * @param {boolean} options.writable
 * @return {Readalbe|Writable|Duplex}
 */
module.exports = (options) => {
  options = options || {};
  const readable = options.readable != null ? options.readable : true;
  const writable = options.writable != null ? options.writable : true;

  const superCtor =
    readable && !writable ? Readable :
    writable && !readable ? Writable :
    Duplex;

  class Streamify extends superCtor {
    /**
     * Required implementation by streaming API.
     *
     * @param {number} size
     */
    _read(size) {
      if (this._source) {
        const onreadable = this._source.onreadable = () => {
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
    }


    /**
     * Required implementation by streaming API.
     *
     * @param {Buffer|string} chunk
     * @param {!string} encoding
     * @param {Function(!Error)} callback
     */
    _write(chunk, encoding, callback) {
      if (this._dest) {
        this._dest.stream.write(chunk, encoding, callback);
      } else {
        this._destWritten.push([chunk, encoding, callback]);
      }
    }


    /**
     * Add a stream to be the readable stream source.
     *
     * @param {Readable|Stream} stream
     */
    addSource(stream) {
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
    }


    /**
     * Remove a stream from being the source.
     */
    removeSource() {
      if (!this._source) {
        throw Error('A source stream has not been added.');
      }

      SOURCE_EVENTS.forEach((event) => {
        this._source.stream.removeListener(event, this._source.listeners[event]);
      });
      this._source.stream.removeListener('readable', this._source.onreadable);
      this._source.stream.removeListener('end', this._source.onend);

      delete this._source;
    }


    /**
     * Add a stream to be the writable stream destination.
     *
     * @param {Writable|Stream} stream
     */
    addDest(stream) {
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
          stream.write(...args);
        });
        this._destWritten = [];
      }
    }


    /**
     * Remove a stream from being the destination.
     */
    removeDest() {
      if (!this._dest) {
        throw Error('A destination stream has not been added.');
      }

      DEST_EVENTS.forEach((event) => {
        this._dest.stream.removeListener(event, this._dest.listeners[event]);
      });

      delete this._dest;
      this._destWritten = [];
    }


    /**
     * Begins fueling data from actual stream into Streamify instance.
     *
     * @param {Readable|Writable|Duplex|Stream} stream
     */
    resolve(stream) {
      if (this._readable && stream.readable) {
        this.addSource(stream);
      }

      if (this._writable && stream.writable) {
        this.addDest(stream);
      }
    }


    /**
     * Removes a stream from this, possibly because another is replacing it.
     */
    unresolve() {
      if (this._source) {
        this.removeSource();
      }

      if (this._dest) {
        this.removeDest();
      }
    }
  }

  const stream = new Streamify();
  stream._readable = readable;
  stream._writable = writable;
  stream._destWritten = [];

  if (writable) {
    stream.once('finish', () => {
      stream._dest.stream.end();
    });
  }
  return stream;
};