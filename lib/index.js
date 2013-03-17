var Duplex  = require('readable-stream').Duplex;
var hashish = require('hashish');


/**
 * Proxy some events from underlying readable and writable streams.
 */
var SOURCE_EVENTS = ['end', 'error', 'close'];
var DEST_EVENTS = ['drain', 'close', 'finish', 'end'];


/**
 * Creates property to use with `Object.create()`
 *
 * @param {Object} value
 * @return {Object}
 */
function prop(value) {
  return {
    writable: true
  , enumerable: true
  , configurable: true
  , value: value
  };
}


/**
 * Adds property from `Streamify.prototype` into `obj`
 *
 * @param {Object} obj
 * @param {String} name
 */
 /*
function addProp(obj, name) {
  obj[name] = prop(Streamify.prototype[name]);
}
*/


/**
 * @constructor
 * @param {Object} options
 *   {Object} superCtor
 *   {Boolean} readable
 *   {Boolean} writable
 * @return {Duplex}
 */
var Streamify = module.exports = function Streamify(options) {
  options = options || {};
  options.superCtor = options.superCtor || Duplex;
  options.readable = options.readable || true;
  options.writable = options.writable || true;

  // Add `Streamify.prototype` methods.
  var properties = hashish.map(Streamify.prototype, prop);

  var o = Object.create(options.superCtor.prototype, properties);
  Duplex.call(o);
  o.readable = typeof options.readable !== 'undefined'
    ? options.readable : true;
  o.writable = typeof options.writable !== 'undefined'
    ? options.writable : true;
  o.__options = options;
  o._onevent = function onevent() {
  };
  o._destWritten = [];

  return o;
};


/**
 * Required implementation by streaming API.
 *
 * @param {Number} size
 */
Streamify.prototype._read = function(size) {
  if (this._source) {
    var self = this;
    var onreadable = this._source.onreadable = function onreadable() {
      var data = self._source.stream.read(size);
      if (data) {
        self.push(data);
      } else {
        self.push('');
      }
    };
    self._source.stream.once('readable', onreadable);

  } else {
    this._sourceRead = size;
  }
};


/**
 * Required implementation by streaming API.
 *
 * @param {Buffer|String} chunk
 * @param {!String} encoding
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
 * This needs to be overwritten for underlying write streams.
 *
 * @param {Buffer|String} chunk
 * @param {!String} encoding
 * @param {!Function(!Error)} callback
 */
Streamify.prototype.end = function(chunk, encoding, callback) {
  Duplex.prototype.end.call(this, chunk, encoding, callback);
  if (this._dest) {
    this._dest.stream.end(chunk, encoding, callback);
  } else {
    this._destEnded = arguments;
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

  this._source = { stream: stream, listeners: {} };
  var self = this;

  SOURCE_EVENTS.forEach(function(event) {
    var onevent = self._source.listeners[event] = function onevent() {
      var args = Array.prototype.slice.call(arguments);
      self.emit.apply(self, [event].concat(args));
    };
    stream.on(event, onevent);
  });

  // Check if `Readable#_read()` has already been called.
  if (this._sourceRead) {
    this._read(this._sourceRead);
  } else {
    this.push('');
  }
};


/**
 * Remove a stream from being the source.
 */
Streamify.prototype.removeSource = function() {
  if (!this._source) {
    throw Error('A source stream has not been added.');
  }

  var source = this._source;
  SOURCE_EVENTS.forEach(function(event) {
    source.stream.removeListener(event, source.listeners[event]);
  });
  source.stream.removeListener('readable', source.onreadable);

  delete this._source;
};


/**
 * Add a stream to be the readable stream destination.
 *
 * @param {Writable|Stream} stream
 */
Streamify.prototype.addDest = function(stream) {
  if (this._dest) {
    throw Error('A destination stream has already been added.');
  }

  this._dest = { stream: stream, listeners: {} };
  var self = this;

  DEST_EVENTS.forEach(function(event) {
    var onevent = self._dest.listeners[event] = function onevent() {
      var args = Array.prototype.slice.call(arguments);
      self.emit.apply(self, [event].concat(args));
    };
    stream.on(event, onevent);
  });

  if (this._destWritten.length) {
    this._destWritten.forEach(function(args) {
      stream.write.apply(stream, args);
    });
    delete this._destWritten;
  }

  if (this._destEnded) {
    stream.end.apply(stream, this._destEnded);
    delete this._destEnded;
  }
};


/**
 * Remove a stream from being the destination.
 */
Streamify.prototype.removeDest = function() {
  if (!this._dest) {
    throw Error('A destination stream has not been added.');
  }

  var dest = dest;
  DEST_EVENTS.forEach(function(event) {
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
  if (this.readable && stream.readable) {
    this.addSource(stream);
  }

  if (this.writable && stream.writable) {
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
