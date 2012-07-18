var Stream     = require('stream').Stream;
var EventYoshi = require('eventyoshi');
var Hash       = require('hashish');


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
  var properties = Hash.map(EventYoshi.prototype, prop);

  // rename EventYoshi's main public methods
  ['add', 'remove', 'proxy'].forEach(function(fn) {
    properties['__' + fn] = properties[fn];
    delete properties[fn];
  });

  // add `Streamify.prototype` methods
  addProp(properties, 'resolve');
  addProp(properties, 'queueMethod');

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
  o.__queuedMethods = {};

  // queue method calls until real stream is ready
  Object.keys(options.superCtor.prototype).forEach(function(key) {
    if (typeof options.superCtor.prototype[key] === 'function') {
      o.queueMethod(key);
    }
  });

  // queue more methods from the stream spec
  o.queueMethod('destroy', {
    before: function() {
      this.readable = false;
      this.writable = false;
    }
  });

  if (options.writable) {
    o.queueMethod('write', { returnValue: false });
    o.queueMethod('end');
  }

  if (options.readable) {
    o.queueMethod('setEncoding');
    o.queueMethod('pause');
    o.queueMethod('resume');
  }

  return o;
}


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
 * Begins fueling data from actual stream into Streamify instance.
 *
 * @param (Stream) stream
 */
Streamify.prototype.resolve = function(stream) {
  if (this.__stream) {
    return this.emit('error', new Error('`resolve()` called more than once'));
  }
  this.__stream = stream;
  this.__add(stream);

  var self = this;
  Hash(this.__queuedMethods).forEach(function(queue, method) {
    self.__proxy(method);
    queue.forEach(function(args) {
      stream[method].apply(stream, args);
    });
  });

  delete this.__queuedMethods;
}


/**
 * Specifies that calls to a method will be queued until the real stream
 * becoems available.
 *
 * @param (string) method
 * @param (Object) options
 * @param (Object.Object) options.returnValue
 * @param (Object.Function) options.before
 */
Streamify.prototype.queueMethod = function(method, options) {
  if (this[method] || this.__queuedMethods[method]) {
    return;
  }

  if (this.__stream) {
    // can't queue methods after stream is resolved
    return this.emit('error', new Error('resolve()` was already called'));
  }

  options = options || {};

  var self = this;

  self.__queuedMethods[method] = [];
  self[method] = function() {
    if (typeof options.before === 'function') {
      options.before.call(self);
    }

    var args = arguments;
    self.__queuedMethods[method].push(args);

    process.nextTick(function() {
      self.emit('queueCall', method, args);
    });

    return options.returnValue;
  }
}
