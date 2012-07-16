# node-streamify [![Build Status](https://secure.travis-ci.org/fent/node-streamify.png)](http://travis-ci.org/fent/node-streamify)

Streamify helps you easily provide a streaming interface for your code.


# Usage

```js
var Streamify = require('streamify');
var request   = require('request');

exports.doSomething = function doSomething() {
  var stream = new Streamify();

  request(url1, function(err, res, body) {
    // do something with `body`

    // once the actual stream you want to return is ready,
    // call `stream.resolve()`
    stream.resolve(request(url2));
  });

  // your function can return back a stream!!
  return stream;
}

// because `doSomething()` returns a stream, it can be piped
exports.doSomething().pipe(anotherStream);
```


# API
### new Streamify([options])

Creates an instance of a stream. `options` can be

* `superCtor` - The object from which it inherits. Defaults to `require('stream').Stream`. Sometimes you may want to use this if your stream might be checked with the `instanceof` operator against objects such as `http.ServerResponse`.
* `readable` - Defaults to `true`.
* `writable` - Defaults to `true`.

### Streamify#resolve(stream)

Must be called only once when the actual stream you are proxying to becomes available after an asynchronous operation.


# Install

    npm install streamify


# Tests
Tests are written with [mocha](http://visionmedia.github.com/mocha/)

```bash
npm test
```

# License
MIT
