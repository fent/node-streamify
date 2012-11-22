var Stream     = require('stream').Stream;
var EventYoshi = require('eventyoshi');
var hashish    = require('hashish');


/**
 * Creates property to use with `Object.create()`
 *
 * @param (Object) value
 * @return (Object)
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
 * @param (Object) obj
 * @param (string) name
 */
function addProp(obj, name) {
  obj[name] = prop(Streamify.prototype[name]);
}


/**
 * @constructor
 * @param (Object) options
 * @param (Object.Object) superCtor
 * @param (Object.boolean) readable
 * @param (Object.boolean) writable
 * @return (Stream)
 */
var Streamify = module.exports = function Streamify(options) {
  options = options || {};
  options.superCtor = options.superCtor || Stream;
  options.readable = options.readable || true;
  options.writable = options.writable || true;

  // inherit all of EventYoshi's prototype methods
  var properties = hashish.map(EventYoshi.prototype, prop);

  // rename EventYoshi's main public methods
  ['add', 'remove', 'proxy'].forEach(function(fn) {
    properties['__' + fn] = properties[fn];
    delete properties[fn];
  });

  // add `Streamify.prototype` methods
  addProp(properties, 'resolve');
  addProp(properties, 'unresolve');
  addProp(properties, '_queueMethods');
  addProp(properties, '_queueMethod');

  // add some methods until the real stream is ready
  addProp(properties, 'destroy');
  if (options.writable) {
    addProp(properties, 'write');
    addProp(properties, 'end');
  }
  if (options.readable) {
    addProp(properties, 'setEncoding');
    addProp(properties, 'pause');
    addProp(properties, 'resume');
  }

  var o = Object.create(options.superCtor.prototype, properties);
  EventYoshi.call(o);
  o.readable = options.readable;
  o.writable = options.writable;
  o.__options = options;

  o._queueMethods();

  return o;
};


/**
 * Begins fueling data from actual stream into Streamify instance.
 *
 * @param (Stream) stream
 */
Streamify.prototype.resolve = function(stream) {
  if (this.__stream) {
    return this.emit('error', Error('`resolve()` called more than once'));
  }
  this.__stream = stream;
  this.__add(stream);

  var self = this;
  hashish(this._queuedMethods).forEach(function(queue, method) {
    self.__proxy(method);
    queue.forEach(function(args) {
      var returnValue = stream[method].apply(stream, args);
      if (method === 'write' && returnValue === true) {
        process.nextTick(function() {
          stream.emit('drain');
        });
      }
    });
  });

  delete this._queuedMethods;
};


/**
 * Removes a stream from this, possibly because another is replacing it.
 */
Streamify.prototype.unresolve = function() {
  if (!this.__stream) {
    return this.emit('error', Error('no stream yet added'));
  }
  this.__remove(this.__stream);
  delete this.__stream;
  this._queueMethods();
};


/**
 * Sets up a stream to queue various methods.
 */
Streamify.prototype._queueMethods = function() {
  this._queuedMethods = {};

  // queue method calls until real stream is ready
  var self = this;
  Object.keys(self.__options.superCtor.prototype).forEach(function(key) {
    if (typeof self.__options.superCtor.prototype[key] === 'function') {
      self._queueMethod(key);
    }
  });

  // queue more methods from the stream spec
  this._queueMethod('destroy', {
    before: function() {
      this.readable = false;
      this.writable = false;
    }
  });

  if (this.__options.writable) {
    this._queueMethod('write', { returnValue: false });
    this._queueMethod('end');
  }

  if (this.__options.readable) {
    this._queueMethod('setEncoding');
    this._queueMethod('pause');
    this._queueMethod('resume');
  }
};


/**
 * Specifies that calls to a method will be queued until the real stream
 * becoems available.
 *
 * @param (string) method
 * @param (Object) options
 * @param (Object.Object) options.returnValue
 * @param (Object.Function) options.before
 */
Streamify.prototype._queueMethod = function(method, options) {
  if (this[method] || this._queuedMethods[method]) {
    return;
  }

  if (this.__stream) {
    // can't queue methods after stream is resolved
    return this.emit('error', Error('resolve()` was already called'));
  }

  options = options || {};

  var self = this;

  self._queuedMethods[method] = [];
  self[method] = function() {
    if (typeof options.before === 'function') {
      options.before.call(self);
    }

    var args = arguments;
    self._queuedMethods[method].push(args);

    process.nextTick(function() {
      self.emit('queueCall', method, args);
    });

    return options.returnValue;
  };
};
