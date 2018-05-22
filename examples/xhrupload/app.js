(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

var fingerprint = require('./lib/fingerprint.js');
var pad = require('./lib/pad.js');

var c = 0,
  blockSize = 4,
  base = 36,
  discreteValues = Math.pow(base, blockSize);

function randomBlock () {
  return pad((Math.random() *
    discreteValues << 0)
    .toString(base), blockSize);
}

function safeCounter () {
  c = c < discreteValues ? c : 0;
  c++; // this is not subliminal
  return c - 1;
}

function cuid () {
  // Starting with a lowercase letter makes
  // it HTML element ID friendly.
  var letter = 'c', // hard-coded allows for sequential access

    // timestamp
    // warning: this exposes the exact date and time
    // that the uid was created.
    timestamp = (new Date().getTime()).toString(base),

    // Prevent same-machine collisions.
    counter = pad(safeCounter().toString(base), blockSize),

    // A few chars to generate distinct ids for different
    // clients (so different computers are far less
    // likely to generate the same id)
    print = fingerprint(),

    // Grab some more chars from Math.random()
    random = randomBlock() + randomBlock();

  return letter + timestamp + counter + print + random;
}

cuid.slug = function slug () {
  var date = new Date().getTime().toString(36),
    counter = safeCounter().toString(36).slice(-4),
    print = fingerprint().slice(0, 1) +
      fingerprint().slice(-1),
    random = randomBlock().slice(-2);

  return date.slice(-2) +
    counter + print + random;
};

cuid.fingerprint = fingerprint;

module.exports = cuid;

},{"./lib/fingerprint.js":2,"./lib/pad.js":3}],2:[function(require,module,exports){
var pad = require('./pad.js');

var env = typeof window === 'object' ? window : self;
var globalCount = Object.keys(env);
var mimeTypesLength = navigator.mimeTypes ? navigator.mimeTypes.length : 0;
var clientId = pad((mimeTypesLength +
  navigator.userAgent.length).toString(36) +
  globalCount.toString(36), 4);

module.exports = function fingerprint () {
  return clientId;
};

},{"./pad.js":3}],3:[function(require,module,exports){
module.exports = function pad (num, size) {
  var s = '000000000' + num;
  return s.substr(s.length - size);
};

},{}],4:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.4+314e4831
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var TRY_CATCH_ERROR = { error: null };

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    TRY_CATCH_ERROR.error = error;
    return TRY_CATCH_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === TRY_CATCH_ERROR) {
      reject(promise, TRY_CATCH_ERROR.error);
      TRY_CATCH_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    return promise.then(function (value) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason) {
      return constructor.resolve(callback()).then(function () {
        throw reason;
      });
    });
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));





}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":20}],5:[function(require,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func`
 * should be invoked on the leading and/or trailing edge of the `wait`
 * timeout. The `func` is invoked with the last arguments provided to the
 * throttled function. Subsequent calls to the throttled function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the throttled function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=true]
 *  Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // Avoid excessively updating the position while scrolling.
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
 * jQuery(element).on('click', throttled);
 *
 * // Cancel the trailing throttled invocation.
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    'leading': leading,
    'maxWait': wait,
    'trailing': trailing
  });
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = throttle;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
var wildcard = require('wildcard');
var reMimePartSplit = /[\/\+\.]/;

/**
  # mime-match

  A simple function to checker whether a target mime type matches a mime-type
  pattern (e.g. image/jpeg matches image/jpeg OR image/*).

  ## Example Usage

  <<< example.js

**/
module.exports = function(target, pattern) {
  function test(pattern) {
    var result = wildcard(pattern, target, reMimePartSplit);

    // ensure that we have a valid mime type (should have two parts)
    return result && result.length >= 2;
  }

  return pattern ? test(pattern.split(';')[0]) : test;
};

},{"wildcard":10}],7:[function(require,module,exports){
/**
* Create an event emitter with namespaces
* @name createNamespaceEmitter
* @example
* var emitter = require('./index')()
*
* emitter.on('*', function () {
*   console.log('all events emitted', this.event)
* })
*
* emitter.on('example', function () {
*   console.log('example event emitted')
* })
*/
module.exports = function createNamespaceEmitter () {
  var emitter = {}
  var _fns = emitter._fns = {}

  /**
  * Emit an event. Optionally namespace the event. Handlers are fired in the order in which they were added with exact matches taking precedence. Separate the namespace and event with a `:`
  * @name emit
  * @param {String} event – the name of the event, with optional namespace
  * @param {...*} data – up to 6 arguments that are passed to the event listener
  * @example
  * emitter.emit('example')
  * emitter.emit('demo:test')
  * emitter.emit('data', { example: true}, 'a string', 1)
  */
  emitter.emit = function emit (event, arg1, arg2, arg3, arg4, arg5, arg6) {
    var toEmit = getListeners(event)

    if (toEmit.length) {
      emitAll(event, toEmit, [arg1, arg2, arg3, arg4, arg5, arg6])
    }
  }

  /**
  * Create en event listener.
  * @name on
  * @param {String} event
  * @param {Function} fn
  * @example
  * emitter.on('example', function () {})
  * emitter.on('demo', function () {})
  */
  emitter.on = function on (event, fn) {
    if (!_fns[event]) {
      _fns[event] = []
    }

    _fns[event].push(fn)
  }

  /**
  * Create en event listener that fires once.
  * @name once
  * @param {String} event
  * @param {Function} fn
  * @example
  * emitter.once('example', function () {})
  * emitter.once('demo', function () {})
  */
  emitter.once = function once (event, fn) {
    function one () {
      fn.apply(this, arguments)
      emitter.off(event, one)
    }
    this.on(event, one)
  }

  /**
  * Stop listening to an event. Stop all listeners on an event by only passing the event name. Stop a single listener by passing that event handler as a callback.
  * You must be explicit about what will be unsubscribed: `emitter.off('demo')` will unsubscribe an `emitter.on('demo')` listener,
  * `emitter.off('demo:example')` will unsubscribe an `emitter.on('demo:example')` listener
  * @name off
  * @param {String} event
  * @param {Function} [fn] – the specific handler
  * @example
  * emitter.off('example')
  * emitter.off('demo', function () {})
  */
  emitter.off = function off (event, fn) {
    var keep = []

    if (event && fn) {
      var fns = this._fns[event]
      var i = 0
      var l = fns.length

      for (i; i < l; i++) {
        if (fns[i] !== fn) {
          keep.push(fns[i])
        }
      }
    }

    keep.length ? this._fns[event] = keep : delete this._fns[event]
  }

  function getListeners (e) {
    var out = _fns[e] ? _fns[e] : []
    var idx = e.indexOf(':')
    var args = (idx === -1) ? [e] : [e.substring(0, idx), e.substring(idx + 1)]

    var keys = Object.keys(_fns)
    var i = 0
    var l = keys.length

    for (i; i < l; i++) {
      var key = keys[i]
      if (key === '*') {
        out = out.concat(_fns[key])
      }

      if (args.length === 2 && args[0] === key) {
        out = out.concat(_fns[key])
        break
      }
    }

    return out
  }

  function emitAll (e, fns, args) {
    var i = 0
    var l = fns.length

    for (i; i < l; i++) {
      if (!fns[i]) break
      fns[i].event = e
      fns[i].apply(fns[i], args)
    }
  }

  return emitter
}

},{}],8:[function(require,module,exports){
!function() {
    'use strict';
    function VNode() {}
    function h(nodeName, attributes) {
        var lastSimple, child, simple, i, children = EMPTY_CHILDREN;
        for (i = arguments.length; i-- > 2; ) stack.push(arguments[i]);
        if (attributes && null != attributes.children) {
            if (!stack.length) stack.push(attributes.children);
            delete attributes.children;
        }
        while (stack.length) if ((child = stack.pop()) && void 0 !== child.pop) for (i = child.length; i--; ) stack.push(child[i]); else {
            if ('boolean' == typeof child) child = null;
            if (simple = 'function' != typeof nodeName) if (null == child) child = ''; else if ('number' == typeof child) child = String(child); else if ('string' != typeof child) simple = !1;
            if (simple && lastSimple) children[children.length - 1] += child; else if (children === EMPTY_CHILDREN) children = [ child ]; else children.push(child);
            lastSimple = simple;
        }
        var p = new VNode();
        p.nodeName = nodeName;
        p.children = children;
        p.attributes = null == attributes ? void 0 : attributes;
        p.key = null == attributes ? void 0 : attributes.key;
        if (void 0 !== options.vnode) options.vnode(p);
        return p;
    }
    function extend(obj, props) {
        for (var i in props) obj[i] = props[i];
        return obj;
    }
    function cloneElement(vnode, props) {
        return h(vnode.nodeName, extend(extend({}, vnode.attributes), props), arguments.length > 2 ? [].slice.call(arguments, 2) : vnode.children);
    }
    function enqueueRender(component) {
        if (!component.__d && (component.__d = !0) && 1 == items.push(component)) (options.debounceRendering || defer)(rerender);
    }
    function rerender() {
        var p, list = items;
        items = [];
        while (p = list.pop()) if (p.__d) renderComponent(p);
    }
    function isSameNodeType(node, vnode, hydrating) {
        if ('string' == typeof vnode || 'number' == typeof vnode) return void 0 !== node.splitText;
        if ('string' == typeof vnode.nodeName) return !node._componentConstructor && isNamedNode(node, vnode.nodeName); else return hydrating || node._componentConstructor === vnode.nodeName;
    }
    function isNamedNode(node, nodeName) {
        return node.__n === nodeName || node.nodeName.toLowerCase() === nodeName.toLowerCase();
    }
    function getNodeProps(vnode) {
        var props = extend({}, vnode.attributes);
        props.children = vnode.children;
        var defaultProps = vnode.nodeName.defaultProps;
        if (void 0 !== defaultProps) for (var i in defaultProps) if (void 0 === props[i]) props[i] = defaultProps[i];
        return props;
    }
    function createNode(nodeName, isSvg) {
        var node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);
        node.__n = nodeName;
        return node;
    }
    function removeNode(node) {
        var parentNode = node.parentNode;
        if (parentNode) parentNode.removeChild(node);
    }
    function setAccessor(node, name, old, value, isSvg) {
        if ('className' === name) name = 'class';
        if ('key' === name) ; else if ('ref' === name) {
            if (old) old(null);
            if (value) value(node);
        } else if ('class' === name && !isSvg) node.className = value || ''; else if ('style' === name) {
            if (!value || 'string' == typeof value || 'string' == typeof old) node.style.cssText = value || '';
            if (value && 'object' == typeof value) {
                if ('string' != typeof old) for (var i in old) if (!(i in value)) node.style[i] = '';
                for (var i in value) node.style[i] = 'number' == typeof value[i] && !1 === IS_NON_DIMENSIONAL.test(i) ? value[i] + 'px' : value[i];
            }
        } else if ('dangerouslySetInnerHTML' === name) {
            if (value) node.innerHTML = value.__html || '';
        } else if ('o' == name[0] && 'n' == name[1]) {
            var useCapture = name !== (name = name.replace(/Capture$/, ''));
            name = name.toLowerCase().substring(2);
            if (value) {
                if (!old) node.addEventListener(name, eventProxy, useCapture);
            } else node.removeEventListener(name, eventProxy, useCapture);
            (node.__l || (node.__l = {}))[name] = value;
        } else if ('list' !== name && 'type' !== name && !isSvg && name in node) {
            setProperty(node, name, null == value ? '' : value);
            if (null == value || !1 === value) node.removeAttribute(name);
        } else {
            var ns = isSvg && name !== (name = name.replace(/^xlink\:?/, ''));
            if (null == value || !1 === value) if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase()); else node.removeAttribute(name); else if ('function' != typeof value) if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value); else node.setAttribute(name, value);
        }
    }
    function setProperty(node, name, value) {
        try {
            node[name] = value;
        } catch (e) {}
    }
    function eventProxy(e) {
        return this.__l[e.type](options.event && options.event(e) || e);
    }
    function flushMounts() {
        var c;
        while (c = mounts.pop()) {
            if (options.afterMount) options.afterMount(c);
            if (c.componentDidMount) c.componentDidMount();
        }
    }
    function diff(dom, vnode, context, mountAll, parent, componentRoot) {
        if (!diffLevel++) {
            isSvgMode = null != parent && void 0 !== parent.ownerSVGElement;
            hydrating = null != dom && !('__preactattr_' in dom);
        }
        var ret = idiff(dom, vnode, context, mountAll, componentRoot);
        if (parent && ret.parentNode !== parent) parent.appendChild(ret);
        if (!--diffLevel) {
            hydrating = !1;
            if (!componentRoot) flushMounts();
        }
        return ret;
    }
    function idiff(dom, vnode, context, mountAll, componentRoot) {
        var out = dom, prevSvgMode = isSvgMode;
        if (null == vnode || 'boolean' == typeof vnode) vnode = '';
        if ('string' == typeof vnode || 'number' == typeof vnode) {
            if (dom && void 0 !== dom.splitText && dom.parentNode && (!dom._component || componentRoot)) {
                if (dom.nodeValue != vnode) dom.nodeValue = vnode;
            } else {
                out = document.createTextNode(vnode);
                if (dom) {
                    if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                    recollectNodeTree(dom, !0);
                }
            }
            out.__preactattr_ = !0;
            return out;
        }
        var vnodeName = vnode.nodeName;
        if ('function' == typeof vnodeName) return buildComponentFromVNode(dom, vnode, context, mountAll);
        isSvgMode = 'svg' === vnodeName ? !0 : 'foreignObject' === vnodeName ? !1 : isSvgMode;
        vnodeName = String(vnodeName);
        if (!dom || !isNamedNode(dom, vnodeName)) {
            out = createNode(vnodeName, isSvgMode);
            if (dom) {
                while (dom.firstChild) out.appendChild(dom.firstChild);
                if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                recollectNodeTree(dom, !0);
            }
        }
        var fc = out.firstChild, props = out.__preactattr_, vchildren = vnode.children;
        if (null == props) {
            props = out.__preactattr_ = {};
            for (var a = out.attributes, i = a.length; i--; ) props[a[i].name] = a[i].value;
        }
        if (!hydrating && vchildren && 1 === vchildren.length && 'string' == typeof vchildren[0] && null != fc && void 0 !== fc.splitText && null == fc.nextSibling) {
            if (fc.nodeValue != vchildren[0]) fc.nodeValue = vchildren[0];
        } else if (vchildren && vchildren.length || null != fc) innerDiffNode(out, vchildren, context, mountAll, hydrating || null != props.dangerouslySetInnerHTML);
        diffAttributes(out, vnode.attributes, props);
        isSvgMode = prevSvgMode;
        return out;
    }
    function innerDiffNode(dom, vchildren, context, mountAll, isHydrating) {
        var j, c, f, vchild, child, originalChildren = dom.childNodes, children = [], keyed = {}, keyedLen = 0, min = 0, len = originalChildren.length, childrenLen = 0, vlen = vchildren ? vchildren.length : 0;
        if (0 !== len) for (var i = 0; i < len; i++) {
            var _child = originalChildren[i], props = _child.__preactattr_, key = vlen && props ? _child._component ? _child._component.__k : props.key : null;
            if (null != key) {
                keyedLen++;
                keyed[key] = _child;
            } else if (props || (void 0 !== _child.splitText ? isHydrating ? _child.nodeValue.trim() : !0 : isHydrating)) children[childrenLen++] = _child;
        }
        if (0 !== vlen) for (var i = 0; i < vlen; i++) {
            vchild = vchildren[i];
            child = null;
            var key = vchild.key;
            if (null != key) {
                if (keyedLen && void 0 !== keyed[key]) {
                    child = keyed[key];
                    keyed[key] = void 0;
                    keyedLen--;
                }
            } else if (!child && min < childrenLen) for (j = min; j < childrenLen; j++) if (void 0 !== children[j] && isSameNodeType(c = children[j], vchild, isHydrating)) {
                child = c;
                children[j] = void 0;
                if (j === childrenLen - 1) childrenLen--;
                if (j === min) min++;
                break;
            }
            child = idiff(child, vchild, context, mountAll);
            f = originalChildren[i];
            if (child && child !== dom && child !== f) if (null == f) dom.appendChild(child); else if (child === f.nextSibling) removeNode(f); else dom.insertBefore(child, f);
        }
        if (keyedLen) for (var i in keyed) if (void 0 !== keyed[i]) recollectNodeTree(keyed[i], !1);
        while (min <= childrenLen) if (void 0 !== (child = children[childrenLen--])) recollectNodeTree(child, !1);
    }
    function recollectNodeTree(node, unmountOnly) {
        var component = node._component;
        if (component) unmountComponent(component); else {
            if (null != node.__preactattr_ && node.__preactattr_.ref) node.__preactattr_.ref(null);
            if (!1 === unmountOnly || null == node.__preactattr_) removeNode(node);
            removeChildren(node);
        }
    }
    function removeChildren(node) {
        node = node.lastChild;
        while (node) {
            var next = node.previousSibling;
            recollectNodeTree(node, !0);
            node = next;
        }
    }
    function diffAttributes(dom, attrs, old) {
        var name;
        for (name in old) if ((!attrs || null == attrs[name]) && null != old[name]) setAccessor(dom, name, old[name], old[name] = void 0, isSvgMode);
        for (name in attrs) if (!('children' === name || 'innerHTML' === name || name in old && attrs[name] === ('value' === name || 'checked' === name ? dom[name] : old[name]))) setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
    }
    function collectComponent(component) {
        var name = component.constructor.name;
        (components[name] || (components[name] = [])).push(component);
    }
    function createComponent(Ctor, props, context) {
        var inst, list = components[Ctor.name];
        if (Ctor.prototype && Ctor.prototype.render) {
            inst = new Ctor(props, context);
            Component.call(inst, props, context);
        } else {
            inst = new Component(props, context);
            inst.constructor = Ctor;
            inst.render = doRender;
        }
        if (list) for (var i = list.length; i--; ) if (list[i].constructor === Ctor) {
            inst.__b = list[i].__b;
            list.splice(i, 1);
            break;
        }
        return inst;
    }
    function doRender(props, state, context) {
        return this.constructor(props, context);
    }
    function setComponentProps(component, props, opts, context, mountAll) {
        if (!component.__x) {
            component.__x = !0;
            if (component.__r = props.ref) delete props.ref;
            if (component.__k = props.key) delete props.key;
            if (!component.base || mountAll) {
                if (component.componentWillMount) component.componentWillMount();
            } else if (component.componentWillReceiveProps) component.componentWillReceiveProps(props, context);
            if (context && context !== component.context) {
                if (!component.__c) component.__c = component.context;
                component.context = context;
            }
            if (!component.__p) component.__p = component.props;
            component.props = props;
            component.__x = !1;
            if (0 !== opts) if (1 === opts || !1 !== options.syncComponentUpdates || !component.base) renderComponent(component, 1, mountAll); else enqueueRender(component);
            if (component.__r) component.__r(component);
        }
    }
    function renderComponent(component, opts, mountAll, isChild) {
        if (!component.__x) {
            var rendered, inst, cbase, props = component.props, state = component.state, context = component.context, previousProps = component.__p || props, previousState = component.__s || state, previousContext = component.__c || context, isUpdate = component.base, nextBase = component.__b, initialBase = isUpdate || nextBase, initialChildComponent = component._component, skip = !1;
            if (isUpdate) {
                component.props = previousProps;
                component.state = previousState;
                component.context = previousContext;
                if (2 !== opts && component.shouldComponentUpdate && !1 === component.shouldComponentUpdate(props, state, context)) skip = !0; else if (component.componentWillUpdate) component.componentWillUpdate(props, state, context);
                component.props = props;
                component.state = state;
                component.context = context;
            }
            component.__p = component.__s = component.__c = component.__b = null;
            component.__d = !1;
            if (!skip) {
                rendered = component.render(props, state, context);
                if (component.getChildContext) context = extend(extend({}, context), component.getChildContext());
                var toUnmount, base, childComponent = rendered && rendered.nodeName;
                if ('function' == typeof childComponent) {
                    var childProps = getNodeProps(rendered);
                    inst = initialChildComponent;
                    if (inst && inst.constructor === childComponent && childProps.key == inst.__k) setComponentProps(inst, childProps, 1, context, !1); else {
                        toUnmount = inst;
                        component._component = inst = createComponent(childComponent, childProps, context);
                        inst.__b = inst.__b || nextBase;
                        inst.__u = component;
                        setComponentProps(inst, childProps, 0, context, !1);
                        renderComponent(inst, 1, mountAll, !0);
                    }
                    base = inst.base;
                } else {
                    cbase = initialBase;
                    toUnmount = initialChildComponent;
                    if (toUnmount) cbase = component._component = null;
                    if (initialBase || 1 === opts) {
                        if (cbase) cbase._component = null;
                        base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, !0);
                    }
                }
                if (initialBase && base !== initialBase && inst !== initialChildComponent) {
                    var baseParent = initialBase.parentNode;
                    if (baseParent && base !== baseParent) {
                        baseParent.replaceChild(base, initialBase);
                        if (!toUnmount) {
                            initialBase._component = null;
                            recollectNodeTree(initialBase, !1);
                        }
                    }
                }
                if (toUnmount) unmountComponent(toUnmount);
                component.base = base;
                if (base && !isChild) {
                    var componentRef = component, t = component;
                    while (t = t.__u) (componentRef = t).base = base;
                    base._component = componentRef;
                    base._componentConstructor = componentRef.constructor;
                }
            }
            if (!isUpdate || mountAll) mounts.unshift(component); else if (!skip) {
                if (component.componentDidUpdate) component.componentDidUpdate(previousProps, previousState, previousContext);
                if (options.afterUpdate) options.afterUpdate(component);
            }
            if (null != component.__h) while (component.__h.length) component.__h.pop().call(component);
            if (!diffLevel && !isChild) flushMounts();
        }
    }
    function buildComponentFromVNode(dom, vnode, context, mountAll) {
        var c = dom && dom._component, originalComponent = c, oldDom = dom, isDirectOwner = c && dom._componentConstructor === vnode.nodeName, isOwner = isDirectOwner, props = getNodeProps(vnode);
        while (c && !isOwner && (c = c.__u)) isOwner = c.constructor === vnode.nodeName;
        if (c && isOwner && (!mountAll || c._component)) {
            setComponentProps(c, props, 3, context, mountAll);
            dom = c.base;
        } else {
            if (originalComponent && !isDirectOwner) {
                unmountComponent(originalComponent);
                dom = oldDom = null;
            }
            c = createComponent(vnode.nodeName, props, context);
            if (dom && !c.__b) {
                c.__b = dom;
                oldDom = null;
            }
            setComponentProps(c, props, 1, context, mountAll);
            dom = c.base;
            if (oldDom && dom !== oldDom) {
                oldDom._component = null;
                recollectNodeTree(oldDom, !1);
            }
        }
        return dom;
    }
    function unmountComponent(component) {
        if (options.beforeUnmount) options.beforeUnmount(component);
        var base = component.base;
        component.__x = !0;
        if (component.componentWillUnmount) component.componentWillUnmount();
        component.base = null;
        var inner = component._component;
        if (inner) unmountComponent(inner); else if (base) {
            if (base.__preactattr_ && base.__preactattr_.ref) base.__preactattr_.ref(null);
            component.__b = base;
            removeNode(base);
            collectComponent(component);
            removeChildren(base);
        }
        if (component.__r) component.__r(null);
    }
    function Component(props, context) {
        this.__d = !0;
        this.context = context;
        this.props = props;
        this.state = this.state || {};
    }
    function render(vnode, parent, merge) {
        return diff(merge, vnode, {}, !1, parent, !1);
    }
    var options = {};
    var stack = [];
    var EMPTY_CHILDREN = [];
    var defer = 'function' == typeof Promise ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;
    var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;
    var items = [];
    var mounts = [];
    var diffLevel = 0;
    var isSvgMode = !1;
    var hydrating = !1;
    var components = {};
    extend(Component.prototype, {
        setState: function(state, callback) {
            var s = this.state;
            if (!this.__s) this.__s = extend({}, s);
            extend(s, 'function' == typeof state ? state(s, this.props) : state);
            if (callback) (this.__h = this.__h || []).push(callback);
            enqueueRender(this);
        },
        forceUpdate: function(callback) {
            if (callback) (this.__h = this.__h || []).push(callback);
            renderComponent(this, 2);
        },
        render: function() {}
    });
    var preact = {
        h: h,
        createElement: h,
        cloneElement: cloneElement,
        Component: Component,
        render: render,
        rerender: rerender,
        options: options
    };
    if ('undefined' != typeof module) module.exports = preact; else self.preact = preact;
}();

},{}],9:[function(require,module,exports){
module.exports = prettierBytes

function prettierBytes (num) {
  if (typeof num !== 'number' || isNaN(num)) {
    throw new TypeError('Expected a number, got ' + typeof num)
  }

  var neg = num < 0
  var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  if (neg) {
    num = -num
  }

  if (num < 1) {
    return (neg ? '-' : '') + num + ' B'
  }

  var exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
  num = Number(num / Math.pow(1000, exponent))
  var unit = units[exponent]

  if (num >= 10 || num % 1 === 0) {
    // Do not show decimals when the number is two-digit, or if the number has no
    // decimal component.
    return (neg ? '-' : '') + num.toFixed(0) + ' ' + unit
  } else {
    return (neg ? '-' : '') + num.toFixed(1) + ' ' + unit
  }
}

},{}],10:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  # wildcard

  Very simple wildcard matching, which is designed to provide the same
  functionality that is found in the
  [eve](https://github.com/adobe-webplatform/eve) eventing library.

  ## Usage

  It works with strings:

  <<< examples/strings.js

  Arrays:

  <<< examples/arrays.js

  Objects (matching against keys):

  <<< examples/objects.js

  While the library works in Node, if you are are looking for file-based
  wildcard matching then you should have a look at:

  <https://github.com/isaacs/node-glob>
**/

function WildcardMatcher(text, separator) {
  this.text = text = text || '';
  this.hasWild = ~text.indexOf('*');
  this.separator = separator;
  this.parts = text.split(separator);
}

WildcardMatcher.prototype.match = function(input) {
  var matches = true;
  var parts = this.parts;
  var ii;
  var partsCount = parts.length;
  var testParts;

  if (typeof input == 'string' || input instanceof String) {
    if (!this.hasWild && this.text != input) {
      matches = false;
    } else {
      testParts = (input || '').split(this.separator);
      for (ii = 0; matches && ii < partsCount; ii++) {
        if (parts[ii] === '*')  {
          continue;
        } else if (ii < testParts.length) {
          matches = parts[ii] === testParts[ii];
        } else {
          matches = false;
        }
      }

      // If matches, then return the component parts
      matches = matches && testParts;
    }
  }
  else if (typeof input.splice == 'function') {
    matches = [];

    for (ii = input.length; ii--; ) {
      if (this.match(input[ii])) {
        matches[matches.length] = input[ii];
      }
    }
  }
  else if (typeof input == 'object') {
    matches = {};

    for (var key in input) {
      if (this.match(key)) {
        matches[key] = input[key];
      }
    }
  }

  return matches;
};

module.exports = function(text, test, separator) {
  var matcher = new WildcardMatcher(text, separator || /[\/\.]/);
  if (typeof test != 'undefined') {
    return matcher.match(test);
  }

  return matcher;
};

},{}],11:[function(require,module,exports){
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Utils = require('../core/Utils');
var Translator = require('../core/Translator');
var ee = require('namespace-emitter');
var cuid = require('cuid');
var throttle = require('lodash.throttle');
var prettyBytes = require('prettier-bytes');
var match = require('mime-match');
var DefaultStore = require('../store/DefaultStore');

/**
 * Uppy Core module.
 * Manages plugins, state updates, acts as an event bus,
 * adds/removes files and metadata.
 */

var Uppy = function () {
  /**
  * Instantiate Uppy
  * @param {object} opts — Uppy options
  */
  function Uppy(opts) {
    var _this = this;

    _classCallCheck(this, Uppy);

    var defaultLocale = {
      strings: {
        youCanOnlyUploadX: {
          0: 'You can only upload %{smart_count} file',
          1: 'You can only upload %{smart_count} files'
        },
        youHaveToAtLeastSelectX: {
          0: 'You have to select at least %{smart_count} file',
          1: 'You have to select at least %{smart_count} files'
        },
        exceedsSize: 'This file exceeds maximum allowed size of',
        youCanOnlyUploadFileTypes: 'You can only upload:',
        uppyServerError: 'Connection with Uppy Server failed',
        failedToUpload: 'Failed to upload',
        noInternetConnection: 'No Internet connection',
        connectedToInternet: 'Connected to the Internet',
        noFilesFound: 'You have no files or folders here'
      }

      // set default options
    };var defaultOptions = {
      id: 'uppy',
      autoProceed: true,
      debug: false,
      restrictions: {
        maxFileSize: null,
        maxNumberOfFiles: null,
        minNumberOfFiles: null,
        allowedFileTypes: null
      },
      meta: {},
      onBeforeFileAdded: function onBeforeFileAdded(currentFile, files) {
        return currentFile;
      },
      onBeforeUpload: function onBeforeUpload(files) {
        return files;
      },
      locale: defaultLocale,
      store: DefaultStore()

      // Merge default options with the ones set by user
    };this.opts = _extends({}, defaultOptions, opts);
    this.opts.restrictions = _extends({}, defaultOptions.restrictions, this.opts.restrictions);

    this.locale = _extends({}, defaultLocale, this.opts.locale);
    this.locale.strings = _extends({}, defaultLocale.strings, this.opts.locale.strings);

    // i18n
    this.translator = new Translator({ locale: this.locale });
    this.i18n = this.translator.translate.bind(this.translator);

    // Container for different types of plugins
    this.plugins = {};

    this.getState = this.getState.bind(this);
    this.getPlugin = this.getPlugin.bind(this);
    this.setFileMeta = this.setFileMeta.bind(this);
    this.setFileState = this.setFileState.bind(this);
    this.log = this.log.bind(this);
    this.info = this.info.bind(this);
    this.hideInfo = this.hideInfo.bind(this);
    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.pauseResume = this.pauseResume.bind(this);
    this._calculateProgress = this._calculateProgress.bind(this);
    this.updateOnlineStatus = this.updateOnlineStatus.bind(this);
    this.resetProgress = this.resetProgress.bind(this);

    this.pauseAll = this.pauseAll.bind(this);
    this.resumeAll = this.resumeAll.bind(this);
    this.retryAll = this.retryAll.bind(this);
    this.cancelAll = this.cancelAll.bind(this);
    this.retryUpload = this.retryUpload.bind(this);
    this.upload = this.upload.bind(this);

    this.emitter = ee();
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.once = this.emitter.once.bind(this.emitter);
    this.emit = this.emitter.emit.bind(this.emitter);

    this.preProcessors = [];
    this.uploaders = [];
    this.postProcessors = [];

    this.store = this.opts.store;
    this.setState({
      plugins: {},
      files: {},
      currentUploads: {},
      capabilities: {
        resumableUploads: false
      },
      totalProgress: 0,
      meta: _extends({}, this.opts.meta),
      info: {
        isHidden: true,
        type: 'info',
        message: ''
      }
    });

    this._storeUnsubscribe = this.store.subscribe(function (prevState, nextState, patch) {
      _this.emit('state-update', prevState, nextState, patch);
      _this.updateAll(nextState);
    });

    // for debugging and testing
    // this.updateNum = 0
    if (this.opts.debug && typeof window !== 'undefined') {
      window['uppyLog'] = '';
      window[this.opts.id] = this;
    }

    this._addListeners();
  }

  Uppy.prototype.on = function on(event, callback) {
    this.emitter.on(event, callback);
    return this;
  };

  Uppy.prototype.off = function off(event, callback) {
    this.emitter.off(event, callback);
    return this;
  };

  /**
   * Iterate on all plugins and run `update` on them.
   * Called each time state changes.
   *
   */


  Uppy.prototype.updateAll = function updateAll(state) {
    this.iteratePlugins(function (plugin) {
      plugin.update(state);
    });
  };

  /**
   * Updates state with a patch
   *
   * @param {object} patch {foo: 'bar'}
   */


  Uppy.prototype.setState = function setState(patch) {
    this.store.setState(patch);
  };

  /**
   * Returns current state.
   * @return {object}
   */


  Uppy.prototype.getState = function getState() {
    return this.store.getState();
  };

  /**
  * Back compat for when this.state is used instead of this.getState().
  */


  /**
  * Shorthand to set state for a specific file.
  */
  Uppy.prototype.setFileState = function setFileState(fileID, state) {
    var _extends2;

    this.setState({
      files: _extends({}, this.getState().files, (_extends2 = {}, _extends2[fileID] = _extends({}, this.getState().files[fileID], state), _extends2))
    });
  };

  Uppy.prototype.resetProgress = function resetProgress() {
    var defaultProgress = {
      percentage: 0,
      bytesUploaded: 0,
      uploadComplete: false,
      uploadStarted: false
    };
    var files = _extends({}, this.getState().files);
    var updatedFiles = {};
    Object.keys(files).forEach(function (fileID) {
      var updatedFile = _extends({}, files[fileID]);
      updatedFile.progress = _extends({}, updatedFile.progress, defaultProgress);
      updatedFiles[fileID] = updatedFile;
    });

    this.setState({
      files: updatedFiles,
      totalProgress: 0
    });

    // TODO Document on the website
    this.emit('reset-progress');
  };

  Uppy.prototype.addPreProcessor = function addPreProcessor(fn) {
    this.preProcessors.push(fn);
  };

  Uppy.prototype.removePreProcessor = function removePreProcessor(fn) {
    var i = this.preProcessors.indexOf(fn);
    if (i !== -1) {
      this.preProcessors.splice(i, 1);
    }
  };

  Uppy.prototype.addPostProcessor = function addPostProcessor(fn) {
    this.postProcessors.push(fn);
  };

  Uppy.prototype.removePostProcessor = function removePostProcessor(fn) {
    var i = this.postProcessors.indexOf(fn);
    if (i !== -1) {
      this.postProcessors.splice(i, 1);
    }
  };

  Uppy.prototype.addUploader = function addUploader(fn) {
    this.uploaders.push(fn);
  };

  Uppy.prototype.removeUploader = function removeUploader(fn) {
    var i = this.uploaders.indexOf(fn);
    if (i !== -1) {
      this.uploaders.splice(i, 1);
    }
  };

  Uppy.prototype.setMeta = function setMeta(data) {
    var updatedMeta = _extends({}, this.getState().meta, data);
    var updatedFiles = _extends({}, this.getState().files);

    Object.keys(updatedFiles).forEach(function (fileID) {
      updatedFiles[fileID] = _extends({}, updatedFiles[fileID], {
        meta: _extends({}, updatedFiles[fileID].meta, data)
      });
    });

    this.log('Adding metadata:');
    this.log(data);

    this.setState({
      meta: updatedMeta,
      files: updatedFiles
    });
  };

  Uppy.prototype.setFileMeta = function setFileMeta(fileID, data) {
    var updatedFiles = _extends({}, this.getState().files);
    if (!updatedFiles[fileID]) {
      this.log('Was trying to set metadata for a file that’s not with us anymore: ', fileID);
      return;
    }
    var newMeta = _extends({}, updatedFiles[fileID].meta, data);
    updatedFiles[fileID] = _extends({}, updatedFiles[fileID], {
      meta: newMeta
    });
    this.setState({ files: updatedFiles });
  };

  /**
   * Get a file object.
   *
   * @param {string} fileID The ID of the file object to return.
   */


  Uppy.prototype.getFile = function getFile(fileID) {
    return this.getState().files[fileID];
  };

  /**
   * Get all files in an array.
   */


  Uppy.prototype.getFiles = function getFiles() {
    var _getState = this.getState(),
        files = _getState.files;

    return Object.keys(files).map(function (fileID) {
      return files[fileID];
    });
  };

  /**
  * Check if minNumberOfFiles restriction is reached before uploading.
  *
  * @private
  */


  Uppy.prototype._checkMinNumberOfFiles = function _checkMinNumberOfFiles(files) {
    var minNumberOfFiles = this.opts.restrictions.minNumberOfFiles;

    if (Object.keys(files).length < minNumberOfFiles) {
      throw new Error('' + this.i18n('youHaveToAtLeastSelectX', { smart_count: minNumberOfFiles }));
    }
  };

  /**
  * Check if file passes a set of restrictions set in options: maxFileSize,
  * maxNumberOfFiles and allowedFileTypes.
  *
  * @param {object} file object to check
  * @private
  */


  Uppy.prototype._checkRestrictions = function _checkRestrictions(file) {
    var _opts$restrictions = this.opts.restrictions,
        maxFileSize = _opts$restrictions.maxFileSize,
        maxNumberOfFiles = _opts$restrictions.maxNumberOfFiles,
        allowedFileTypes = _opts$restrictions.allowedFileTypes;


    if (maxNumberOfFiles) {
      if (Object.keys(this.getState().files).length + 1 > maxNumberOfFiles) {
        throw new Error('' + this.i18n('youCanOnlyUploadX', { smart_count: maxNumberOfFiles }));
      }
    }

    if (allowedFileTypes) {
      var isCorrectFileType = allowedFileTypes.filter(function (type) {
        // if (!file.type) return false

        // is this is a mime-type
        if (type.indexOf('/') > -1) {
          if (!file.type) return false;
          return match(file.type, type);
        }

        // otherwise this is likely an extension
        if (type[0] === '.') {
          if (file.extension === type.substr(1)) {
            return file.extension;
          }
        }
      }).length > 0;

      if (!isCorrectFileType) {
        var allowedFileTypesString = allowedFileTypes.join(', ');
        throw new Error(this.i18n('youCanOnlyUploadFileTypes') + ' ' + allowedFileTypesString);
      }
    }

    if (maxFileSize) {
      if (file.data.size > maxFileSize) {
        throw new Error(this.i18n('exceedsSize') + ' ' + prettyBytes(maxFileSize));
      }
    }
  };

  /**
  * Add a new file to `state.files`. This will run `onBeforeFileAdded`,
  * try to guess file type in a clever way, check file against restrictions,
  * and start an upload if `autoProceed === true`.
  *
  * @param {object} file object to add
  */


  Uppy.prototype.addFile = function addFile(file) {
    var _this2 = this,
        _extends3;

    var _getState2 = this.getState(),
        files = _getState2.files;

    var onError = function onError(msg) {
      var err = (typeof msg === 'undefined' ? 'undefined' : _typeof(msg)) === 'object' ? msg : new Error(msg);
      _this2.log(err.message);
      _this2.info(err.message, 'error', 5000);
      throw err;
    };

    var onBeforeFileAddedResult = this.opts.onBeforeFileAdded(file, files);

    if (onBeforeFileAddedResult === false) {
      this.log('Not adding file because onBeforeFileAdded returned false');
      return;
    }

    if ((typeof onBeforeFileAddedResult === 'undefined' ? 'undefined' : _typeof(onBeforeFileAddedResult)) === 'object' && onBeforeFileAddedResult) {
      // warning after the change in 0.24
      if (onBeforeFileAddedResult.then) {
        throw new TypeError('onBeforeFileAdded() returned a Promise, but this is no longer supported. It must be synchronous.');
      }
      file = onBeforeFileAddedResult;
    }

    var fileType = Utils.getFileType(file);
    var fileName = void 0;
    if (file.name) {
      fileName = file.name;
    } else if (fileType.split('/')[0] === 'image') {
      fileName = fileType.split('/')[0] + '.' + fileType.split('/')[1];
    } else {
      fileName = 'noname';
    }
    var fileExtension = Utils.getFileNameAndExtension(fileName).extension;
    var isRemote = file.isRemote || false;

    var fileID = Utils.generateFileID(file);

    var meta = file.meta || {};
    meta.name = fileName;
    meta.type = fileType;

    var newFile = {
      source: file.source || '',
      id: fileID,
      name: fileName,
      extension: fileExtension || '',
      meta: _extends({}, this.getState().meta, meta),
      type: fileType,
      data: file.data,
      progress: {
        percentage: 0,
        bytesUploaded: 0,
        bytesTotal: file.data.size || 0,
        uploadComplete: false,
        uploadStarted: false
      },
      size: file.data.size || 0,
      isRemote: isRemote,
      remote: file.remote || '',
      preview: file.preview
    };

    try {
      this._checkRestrictions(newFile);
    } catch (err) {
      onError(err);
    }

    this.setState({
      files: _extends({}, files, (_extends3 = {}, _extends3[fileID] = newFile, _extends3))
    });

    this.emit('file-added', newFile);
    this.log('Added file: ' + fileName + ', ' + fileID + ', mime type: ' + fileType);

    if (this.opts.autoProceed && !this.scheduledAutoProceed) {
      this.scheduledAutoProceed = setTimeout(function () {
        _this2.scheduledAutoProceed = null;
        _this2.upload().catch(function (err) {
          console.error(err.stack || err.message || err);
        });
      }, 4);
    }
  };

  Uppy.prototype.removeFile = function removeFile(fileID) {
    var _this3 = this;

    var _state = this.state,
        files = _state.files,
        currentUploads = _state.currentUploads;

    var updatedFiles = _extends({}, files);
    var removedFile = updatedFiles[fileID];
    delete updatedFiles[fileID];

    // Remove this file from its `currentUpload`.
    var updatedUploads = _extends({}, currentUploads);
    var removeUploads = [];
    Object.keys(updatedUploads).forEach(function (uploadID) {
      var newFileIDs = currentUploads[uploadID].fileIDs.filter(function (uploadFileID) {
        return uploadFileID !== fileID;
      });
      // Remove the upload if no files are associated with it anymore.
      if (newFileIDs.length === 0) {
        removeUploads.push(uploadID);
        return;
      }

      updatedUploads[uploadID] = _extends({}, currentUploads[uploadID], {
        fileIDs: newFileIDs
      });
    });

    this.setState({
      currentUploads: updatedUploads,
      files: updatedFiles
    });

    removeUploads.forEach(function (uploadID) {
      _this3._removeUpload(uploadID);
    });

    this._calculateTotalProgress();
    this.emit('file-removed', removedFile);
    this.log('File removed: ' + removedFile.id);

    // Clean up object URLs.
    if (removedFile.preview && Utils.isObjectURL(removedFile.preview)) {
      URL.revokeObjectURL(removedFile.preview);
    }

    this.log('Removed file: ' + fileID);
  };

  Uppy.prototype.pauseResume = function pauseResume(fileID) {
    if (this.getFile(fileID).uploadComplete) return;

    var wasPaused = this.getFile(fileID).isPaused || false;
    var isPaused = !wasPaused;

    this.setFileState(fileID, {
      isPaused: isPaused
    });

    this.emit('upload-pause', fileID, isPaused);

    return isPaused;
  };

  Uppy.prototype.pauseAll = function pauseAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var inProgressUpdatedFiles = Object.keys(updatedFiles).filter(function (file) {
      return !updatedFiles[file].progress.uploadComplete && updatedFiles[file].progress.uploadStarted;
    });

    inProgressUpdatedFiles.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: true
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({ files: updatedFiles });

    this.emit('pause-all');
  };

  Uppy.prototype.resumeAll = function resumeAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var inProgressUpdatedFiles = Object.keys(updatedFiles).filter(function (file) {
      return !updatedFiles[file].progress.uploadComplete && updatedFiles[file].progress.uploadStarted;
    });

    inProgressUpdatedFiles.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: false,
        error: null
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({ files: updatedFiles });

    this.emit('resume-all');
  };

  Uppy.prototype.retryAll = function retryAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var filesToRetry = Object.keys(updatedFiles).filter(function (file) {
      return updatedFiles[file].error;
    });

    filesToRetry.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: false,
        error: null
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({
      files: updatedFiles,
      error: null
    });

    this.emit('retry-all', filesToRetry);

    var uploadID = this._createUpload(filesToRetry);
    return this._runUpload(uploadID);
  };

  Uppy.prototype.cancelAll = function cancelAll() {
    var _this4 = this;

    this.emit('cancel-all');

    // TODO Or should we just call removeFile on all files?

    var _getState3 = this.getState(),
        currentUploads = _getState3.currentUploads;

    var uploadIDs = Object.keys(currentUploads);

    uploadIDs.forEach(function (id) {
      _this4._removeUpload(id);
    });

    this.setState({
      files: {},
      totalProgress: 0
    });
  };

  Uppy.prototype.retryUpload = function retryUpload(fileID) {
    var updatedFiles = _extends({}, this.getState().files);
    var updatedFile = _extends({}, updatedFiles[fileID], { error: null, isPaused: false });
    updatedFiles[fileID] = updatedFile;
    this.setState({
      files: updatedFiles
    });

    this.emit('upload-retry', fileID);

    var uploadID = this._createUpload([fileID]);
    return this._runUpload(uploadID);
  };

  Uppy.prototype.reset = function reset() {
    this.cancelAll();
  };

  Uppy.prototype._calculateProgress = function _calculateProgress(file, data) {
    if (!this.getFile(file.id)) {
      this.log('Not setting progress for a file that has been removed: ' + file.id);
      return;
    }

    this.setFileState(file.id, {
      progress: _extends({}, this.getFile(file.id).progress, {
        bytesUploaded: data.bytesUploaded,
        bytesTotal: data.bytesTotal,
        percentage: Math.floor((data.bytesUploaded / data.bytesTotal * 100).toFixed(2))
      })
    });

    this._calculateTotalProgress();
  };

  Uppy.prototype._calculateTotalProgress = function _calculateTotalProgress() {
    // calculate total progress, using the number of files currently uploading,
    // multiplied by 100 and the summ of individual progress of each file
    var files = _extends({}, this.getState().files);

    var inProgress = Object.keys(files).filter(function (file) {
      return files[file].progress.uploadStarted;
    });
    var progressMax = inProgress.length * 100;
    var progressAll = 0;
    inProgress.forEach(function (file) {
      progressAll = progressAll + files[file].progress.percentage;
    });

    var totalProgress = progressMax === 0 ? 0 : Math.floor((progressAll * 100 / progressMax).toFixed(2));

    this.setState({
      totalProgress: totalProgress
    });
  };

  /**
   * Registers listeners for all global actions, like:
   * `error`, `file-removed`, `upload-progress`
   */


  Uppy.prototype._addListeners = function _addListeners() {
    var _this5 = this;

    this.on('error', function (error) {
      _this5.setState({ error: error.message });
    });

    this.on('upload-error', function (file, error) {
      _this5.setFileState(file.id, { error: error.message });
      _this5.setState({ error: error.message });

      var message = void 0;
      message = _this5.i18n('failedToUpload') + ' ' + file.name;
      if ((typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' && error.message) {
        message = { message: message, details: error.message };
      }
      _this5.info(message, 'error', 5000);
    });

    this.on('upload', function () {
      _this5.setState({ error: null });
    });

    this.on('upload-started', function (file, upload) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: {
          uploadStarted: Date.now(),
          uploadComplete: false,
          percentage: 0,
          bytesUploaded: 0,
          bytesTotal: file.size
        }
      });
    });

    // upload progress events can occur frequently, especially when you have a good
    // connection to the remote server. Therefore, we are throtteling them to
    // prevent accessive function calls.
    // see also: https://github.com/tus/tus-js-client/commit/9940f27b2361fd7e10ba58b09b60d82422183bbb
    var _throttledCalculateProgress = throttle(this._calculateProgress, 100, { leading: true, trailing: true });

    this.on('upload-progress', _throttledCalculateProgress);

    this.on('upload-success', function (file, uploadResp, uploadURL) {
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getFile(file.id).progress, {
          uploadComplete: true,
          percentage: 100
        }),
        uploadURL: uploadURL,
        isPaused: false
      });

      _this5._calculateTotalProgress();
    });

    this.on('preprocess-progress', function (file, progress) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getFile(file.id).progress, {
          preprocess: progress
        })
      });
    });

    this.on('preprocess-complete', function (file) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      var files = _extends({}, _this5.getState().files);
      files[file.id] = _extends({}, files[file.id], {
        progress: _extends({}, files[file.id].progress)
      });
      delete files[file.id].progress.preprocess;

      _this5.setState({ files: files });
    });

    this.on('postprocess-progress', function (file, progress) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getState().files[file.id].progress, {
          postprocess: progress
        })
      });
    });

    this.on('postprocess-complete', function (file) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      var files = _extends({}, _this5.getState().files);
      files[file.id] = _extends({}, files[file.id], {
        progress: _extends({}, files[file.id].progress)
      });
      delete files[file.id].progress.postprocess;
      // TODO should we set some kind of `fullyComplete` property on the file object
      // so it's easier to see that the file is upload…fully complete…rather than
      // what we have to do now (`uploadComplete && !postprocess`)

      _this5.setState({ files: files });
    });

    this.on('restored', function () {
      // Files may have changed--ensure progress is still accurate.
      _this5._calculateTotalProgress();
    });

    // show informer if offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', function () {
        return _this5.updateOnlineStatus();
      });
      window.addEventListener('offline', function () {
        return _this5.updateOnlineStatus();
      });
      setTimeout(function () {
        return _this5.updateOnlineStatus();
      }, 3000);
    }
  };

  Uppy.prototype.updateOnlineStatus = function updateOnlineStatus() {
    var online = typeof window.navigator.onLine !== 'undefined' ? window.navigator.onLine : true;
    if (!online) {
      this.emit('is-offline');
      this.info(this.i18n('noInternetConnection'), 'error', 0);
      this.wasOffline = true;
    } else {
      this.emit('is-online');
      if (this.wasOffline) {
        this.emit('back-online');
        this.info(this.i18n('connectedToInternet'), 'success', 3000);
        this.wasOffline = false;
      }
    }
  };

  Uppy.prototype.getID = function getID() {
    return this.opts.id;
  };

  /**
   * Registers a plugin with Core.
   *
   * @param {object} Plugin object
   * @param {object} [opts] object with options to be passed to Plugin
   * @return {Object} self for chaining
   */


  Uppy.prototype.use = function use(Plugin, opts) {
    if (typeof Plugin !== 'function') {
      var msg = 'Expected a plugin class, but got ' + (Plugin === null ? 'null' : typeof Plugin === 'undefined' ? 'undefined' : _typeof(Plugin)) + '.' + ' Please verify that the plugin was imported and spelled correctly.';
      throw new TypeError(msg);
    }

    // Instantiate
    var plugin = new Plugin(this, opts);
    var pluginId = plugin.id;
    this.plugins[plugin.type] = this.plugins[plugin.type] || [];

    if (!pluginId) {
      throw new Error('Your plugin must have an id');
    }

    if (!plugin.type) {
      throw new Error('Your plugin must have a type');
    }

    var existsPluginAlready = this.getPlugin(pluginId);
    if (existsPluginAlready) {
      var _msg = 'Already found a plugin named \'' + existsPluginAlready.id + '\'. ' + ('Tried to use: \'' + pluginId + '\'.\n') + 'Uppy plugins must have unique \'id\' options. See https://uppy.io/docs/plugins/#id.';
      throw new Error(_msg);
    }

    this.plugins[plugin.type].push(plugin);
    plugin.install();

    return this;
  };

  /**
   * Find one Plugin by name.
   *
   * @param {string} name description
   * @return {object | boolean}
   */


  Uppy.prototype.getPlugin = function getPlugin(name) {
    var foundPlugin = null;
    this.iteratePlugins(function (plugin) {
      var pluginName = plugin.id;
      if (pluginName === name) {
        foundPlugin = plugin;
        return false;
      }
    });
    return foundPlugin;
  };

  /**
   * Iterate through all `use`d plugins.
   *
   * @param {function} method that will be run on each plugin
   */


  Uppy.prototype.iteratePlugins = function iteratePlugins(method) {
    var _this6 = this;

    Object.keys(this.plugins).forEach(function (pluginType) {
      _this6.plugins[pluginType].forEach(method);
    });
  };

  /**
   * Uninstall and remove a plugin.
   *
   * @param {object} instance The plugin instance to remove.
   */


  Uppy.prototype.removePlugin = function removePlugin(instance) {
    var list = this.plugins[instance.type];

    if (instance.uninstall) {
      instance.uninstall();
    }

    var index = list.indexOf(instance);
    if (index !== -1) {
      list.splice(index, 1);
    }
  };

  /**
   * Uninstall all plugins and close down this Uppy instance.
   */


  Uppy.prototype.close = function close() {
    this.reset();

    this._storeUnsubscribe();

    this.iteratePlugins(function (plugin) {
      plugin.uninstall();
    });
  };

  /**
  * Set info message in `state.info`, so that UI plugins like `Informer`
  * can display the message.
  *
  * @param {string | object} message Message to be displayed by the informer
  * @param {string} [type]
  * @param {number} [duration]
  */

  Uppy.prototype.info = function info(message) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3000;

    var isComplexMessage = (typeof message === 'undefined' ? 'undefined' : _typeof(message)) === 'object';

    this.setState({
      info: {
        isHidden: false,
        type: type,
        message: isComplexMessage ? message.message : message,
        details: isComplexMessage ? message.details : null
      }
    });

    this.emit('info-visible');

    clearTimeout(this.infoTimeoutID);
    if (duration === 0) {
      this.infoTimeoutID = undefined;
      return;
    }

    // hide the informer after `duration` milliseconds
    this.infoTimeoutID = setTimeout(this.hideInfo, duration);
  };

  Uppy.prototype.hideInfo = function hideInfo() {
    var newInfo = _extends({}, this.getState().info, {
      isHidden: true
    });
    this.setState({
      info: newInfo
    });
    this.emit('info-hidden');
  };

  /**
   * Logs stuff to console, only if `debug` is set to true. Silent in production.
   *
   * @param {String|Object} msg to log
   * @param {String} [type] optional `error` or `warning`
   */


  Uppy.prototype.log = function log(msg, type) {
    if (!this.opts.debug) {
      return;
    }

    var message = '[Uppy] [' + Utils.getTimeStamp() + '] ' + msg;

    window['uppyLog'] = window['uppyLog'] + '\n' + 'DEBUG LOG: ' + msg;

    if (type === 'error') {
      console.error(message);
      return;
    }

    if (type === 'warning') {
      console.warn(message);
      return;
    }

    if (msg === '' + msg) {
      console.log(message);
    } else {
      message = '[Uppy] [' + Utils.getTimeStamp() + ']';
      console.log(message);
      console.dir(msg);
    }
  };

  /**
   * Obsolete, event listeners are now added in the constructor.
   */


  Uppy.prototype.run = function run() {
    this.log('Calling run() is no longer necessary.', 'warning');
    return this;
  };

  /**
   * Restore an upload by its ID.
   */


  Uppy.prototype.restore = function restore(uploadID) {
    this.log('Core: attempting to restore upload "' + uploadID + '"');

    if (!this.getState().currentUploads[uploadID]) {
      this._removeUpload(uploadID);
      return _Promise.reject(new Error('Nonexistent upload'));
    }

    return this._runUpload(uploadID);
  };

  /**
   * Create an upload for a bunch of files.
   *
   * @param {Array<string>} fileIDs File IDs to include in this upload.
   * @return {string} ID of this upload.
   */


  Uppy.prototype._createUpload = function _createUpload(fileIDs) {
    var _extends4;

    var uploadID = cuid();

    this.emit('upload', {
      id: uploadID,
      fileIDs: fileIDs
    });

    this.setState({
      currentUploads: _extends({}, this.getState().currentUploads, (_extends4 = {}, _extends4[uploadID] = {
        fileIDs: fileIDs,
        step: 0,
        result: {}
      }, _extends4))
    });

    return uploadID;
  };

  Uppy.prototype._getUpload = function _getUpload(uploadID) {
    return this.getState().currentUploads[uploadID];
  };

  /**
   * Add data to an upload's result object.
   *
   * @param {string} uploadID The ID of the upload.
   * @param {object} data Data properties to add to the result object.
   */


  Uppy.prototype.addResultData = function addResultData(uploadID, data) {
    var _extends5;

    if (!this._getUpload(uploadID)) {
      this.log('Not setting result for an upload that has been removed: ' + uploadID);
      return;
    }
    var currentUploads = this.getState().currentUploads;
    var currentUpload = _extends({}, currentUploads[uploadID], {
      result: _extends({}, currentUploads[uploadID].result, data)
    });
    this.setState({
      currentUploads: _extends({}, currentUploads, (_extends5 = {}, _extends5[uploadID] = currentUpload, _extends5))
    });
  };

  /**
   * Remove an upload, eg. if it has been canceled or completed.
   *
   * @param {string} uploadID The ID of the upload.
   */


  Uppy.prototype._removeUpload = function _removeUpload(uploadID) {
    var currentUploads = _extends({}, this.getState().currentUploads);
    delete currentUploads[uploadID];

    this.setState({
      currentUploads: currentUploads
    });
  };

  /**
   * Run an upload. This picks up where it left off in case the upload is being restored.
   *
   * @private
   */


  Uppy.prototype._runUpload = function _runUpload(uploadID) {
    var _this7 = this;

    var uploadData = this.getState().currentUploads[uploadID];
    var fileIDs = uploadData.fileIDs;
    var restoreStep = uploadData.step;

    var steps = [].concat(this.preProcessors, this.uploaders, this.postProcessors);
    var lastStep = _Promise.resolve();
    steps.forEach(function (fn, step) {
      // Skip this step if we are restoring and have already completed this step before.
      if (step < restoreStep) {
        return;
      }

      lastStep = lastStep.then(function () {
        var _extends6;

        var _getState4 = _this7.getState(),
            currentUploads = _getState4.currentUploads;

        var currentUpload = _extends({}, currentUploads[uploadID], {
          step: step
        });
        _this7.setState({
          currentUploads: _extends({}, currentUploads, (_extends6 = {}, _extends6[uploadID] = currentUpload, _extends6))
        });
        // TODO give this the `currentUpload` object as its only parameter maybe?
        // Otherwise when more metadata may be added to the upload this would keep getting more parameters
        return fn(fileIDs, uploadID);
      }).then(function (result) {
        return null;
      });
    });

    // Not returning the `catch`ed promise, because we still want to return a rejected
    // promise from this method if the upload failed.
    lastStep.catch(function (err) {
      _this7.emit('error', err, uploadID);

      _this7._removeUpload(uploadID);
    });

    return lastStep.then(function () {
      var files = fileIDs.map(function (fileID) {
        return _this7.getFile(fileID);
      });
      var successful = files.filter(function (file) {
        return file && !file.error;
      });
      var failed = files.filter(function (file) {
        return file && file.error;
      });
      _this7.addResultData(uploadID, { successful: successful, failed: failed, uploadID: uploadID });

      var _getState5 = _this7.getState(),
          currentUploads = _getState5.currentUploads;

      if (!currentUploads[uploadID]) {
        _this7.log('Not setting result for an upload that has been removed: ' + uploadID);
        return;
      }

      var result = currentUploads[uploadID].result;
      _this7.emit('complete', result);

      _this7._removeUpload(uploadID);

      return result;
    });
  };

  /**
   * Start an upload for all the files that are not currently being uploaded.
   *
   * @return {Promise}
   */


  Uppy.prototype.upload = function upload() {
    var _this8 = this;

    if (!this.plugins.uploader) {
      this.log('No uploader type plugins are used', 'warning');
    }

    var files = this.getState().files;
    var onBeforeUploadResult = this.opts.onBeforeUpload(files);

    if (onBeforeUploadResult === false) {
      return _Promise.reject(new Error('Not starting the upload because onBeforeUpload returned false'));
    }

    if (onBeforeUploadResult && (typeof onBeforeUploadResult === 'undefined' ? 'undefined' : _typeof(onBeforeUploadResult)) === 'object') {
      // warning after the change in 0.24
      if (onBeforeUploadResult.then) {
        throw new TypeError('onBeforeUpload() returned a Promise, but this is no longer supported. It must be synchronous.');
      }

      files = onBeforeUploadResult;
    }

    return _Promise.resolve().then(function () {
      return _this8._checkMinNumberOfFiles(files);
    }).then(function () {
      var _getState6 = _this8.getState(),
          currentUploads = _getState6.currentUploads;
      // get a list of files that are currently assigned to uploads


      var currentlyUploadingFiles = Object.keys(currentUploads).reduce(function (prev, curr) {
        return prev.concat(currentUploads[curr].fileIDs);
      }, []);

      var waitingFileIDs = [];
      Object.keys(files).forEach(function (fileID) {
        var file = _this8.getFile(fileID);
        // if the file hasn't started uploading and hasn't already been assigned to an upload..
        if (!file.progress.uploadStarted && currentlyUploadingFiles.indexOf(fileID) === -1) {
          waitingFileIDs.push(file.id);
        }
      });

      var uploadID = _this8._createUpload(waitingFileIDs);
      return _this8._runUpload(uploadID);
    }).catch(function (err) {
      var message = (typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err.message : err;
      _this8.log(message);
      _this8.info(message, 'error', 4000);
      return _Promise.reject((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err : new Error(err));
    });
  };

  _createClass(Uppy, [{
    key: 'state',
    get: function get() {
      return this.getState();
    }
  }]);

  return Uppy;
}();

module.exports = function (opts) {
  return new Uppy(opts);
};

// Expose class constructor.
module.exports.Uppy = Uppy;

},{"../core/Translator":13,"../core/Utils":15,"../store/DefaultStore":19,"cuid":1,"es6-promise":4,"lodash.throttle":5,"mime-match":6,"namespace-emitter":7,"prettier-bytes":9}],12:[function(require,module,exports){
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var preact = require('preact');

var _require = require('../core/Utils'),
    findDOMElement = _require.findDOMElement;

/**
 * Defer a frequent call to the microtask queue.
 */


function debounce(fn) {
  var calling = null;
  var latestArgs = null;
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    latestArgs = args;
    if (!calling) {
      calling = _Promise.resolve().then(function () {
        calling = null;
        // At this point `args` may be different from the most
        // recent state, if multiple calls happened since this task
        // was queued. So we use the `latestArgs`, which definitely
        // is the most recent call.
        return fn.apply(undefined, latestArgs);
      });
    }
    return calling;
  };
}

/**
 * Boilerplate that all Plugins share - and should not be used
 * directly. It also shows which methods final plugins should implement/override,
 * this deciding on structure.
 *
 * @param {object} main Uppy core object
 * @param {object} object with plugin options
 * @return {array | string} files or success/fail message
 */
module.exports = function () {
  function Plugin(uppy, opts) {
    _classCallCheck(this, Plugin);

    this.uppy = uppy;
    this.opts = opts || {};

    this.update = this.update.bind(this);
    this.mount = this.mount.bind(this);
    this.install = this.install.bind(this);
    this.uninstall = this.uninstall.bind(this);
  }

  Plugin.prototype.getPluginState = function getPluginState() {
    return this.uppy.state.plugins[this.id];
  };

  Plugin.prototype.setPluginState = function setPluginState(update) {
    var plugins = _extends({}, this.uppy.state.plugins);
    plugins[this.id] = _extends({}, plugins[this.id], update);

    this.uppy.setState({
      plugins: plugins
    });
  };

  Plugin.prototype.update = function update(state) {
    if (typeof this.el === 'undefined') {
      return;
    }

    if (this._updateUI) {
      this._updateUI(state);
    }
  };

  /**
   * Check if supplied `target` is a DOM element or an `object`.
   * If it’s an object — target is a plugin, and we search `plugins`
   * for a plugin with same name and return its target.
   *
   * @param {String|Object} target
   *
   */


  Plugin.prototype.mount = function mount(target, plugin) {
    var _this = this;

    var callerPluginName = plugin.id;

    var targetElement = findDOMElement(target);

    if (targetElement) {
      this.isTargetDOMEl = true;

      // API for plugins that require a synchronous rerender.
      this.rerender = function (state) {
        _this.el = preact.render(_this.render(state), targetElement, _this.el);
      };
      this._updateUI = debounce(this.rerender);

      this.uppy.log('Installing ' + callerPluginName + ' to a DOM element');

      // clear everything inside the target container
      if (this.opts.replaceTargetContent) {
        targetElement.innerHTML = '';
      }

      this.el = preact.render(this.render(this.uppy.getState()), targetElement);

      return this.el;
    }

    var targetPlugin = void 0;
    if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target instanceof Plugin) {
      // Targeting a plugin *instance*
      targetPlugin = target;
    } else if (typeof target === 'function') {
      // Targeting a plugin type
      var Target = target;
      // Find the target plugin instance.
      this.uppy.iteratePlugins(function (plugin) {
        if (plugin instanceof Target) {
          targetPlugin = plugin;
          return false;
        }
      });
    }

    if (targetPlugin) {
      var targetPluginName = targetPlugin.id;
      this.uppy.log('Installing ' + callerPluginName + ' to ' + targetPluginName);
      this.el = targetPlugin.addTarget(plugin);
      return this.el;
    }

    this.uppy.log('Not installing ' + callerPluginName);
    throw new Error('Invalid target option given to ' + callerPluginName);
  };

  Plugin.prototype.render = function render(state) {
    throw new Error('Extend the render method to add your plugin to a DOM element');
  };

  Plugin.prototype.addTarget = function addTarget(plugin) {
    throw new Error('Extend the addTarget method to add your plugin to another plugin\'s target');
  };

  Plugin.prototype.unmount = function unmount() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  };

  Plugin.prototype.install = function install() {};

  Plugin.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return Plugin;
}();

},{"../core/Utils":15,"es6-promise":4,"preact":8}],13:[function(require,module,exports){
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Translates strings with interpolation & pluralization support.
 * Extensible with custom dictionaries and pluralization functions.
 *
 * Borrows heavily from and inspired by Polyglot https://github.com/airbnb/polyglot.js,
 * basically a stripped-down version of it. Differences: pluralization functions are not hardcoded
 * and can be easily added among with dictionaries, nested objects are used for pluralization
 * as opposed to `||||` delimeter
 *
 * Usage example: `translator.translate('files_chosen', {smart_count: 3})`
 *
 * @param {object} opts
 */
module.exports = function () {
  function Translator(opts) {
    _classCallCheck(this, Translator);

    var defaultOptions = {
      locale: {
        strings: {},
        pluralize: function pluralize(n) {
          if (n === 1) {
            return 0;
          }
          return 1;
        }
      }
    };

    this.opts = _extends({}, defaultOptions, opts);
    this.locale = _extends({}, defaultOptions.locale, opts.locale);
  }

  /**
   * Takes a string with placeholder variables like `%{smart_count} file selected`
   * and replaces it with values from options `{smart_count: 5}`
   *
   * @license https://github.com/airbnb/polyglot.js/blob/master/LICENSE
   * taken from https://github.com/airbnb/polyglot.js/blob/master/lib/polyglot.js#L299
   *
   * @param {string} phrase that needs interpolation, with placeholders
   * @param {object} options with values that will be used to replace placeholders
   * @return {string} interpolated
   */


  Translator.prototype.interpolate = function interpolate(phrase, options) {
    var replace = String.prototype.replace;
    var dollarRegex = /\$/g;
    var dollarBillsYall = '$$$$';

    for (var arg in options) {
      if (arg !== '_' && options.hasOwnProperty(arg)) {
        // Ensure replacement value is escaped to prevent special $-prefixed
        // regex replace tokens. the "$$$$" is needed because each "$" needs to
        // be escaped with "$" itself, and we need two in the resulting output.
        var replacement = options[arg];
        if (typeof replacement === 'string') {
          replacement = replace.call(options[arg], dollarRegex, dollarBillsYall);
        }
        // We create a new `RegExp` each time instead of using a more-efficient
        // string replace so that the same argument can be replaced multiple times
        // in the same phrase.
        phrase = replace.call(phrase, new RegExp('%\\{' + arg + '\\}', 'g'), replacement);
      }
    }
    return phrase;
  };

  /**
   * Public translate method
   *
   * @param {string} key
   * @param {object} options with values that will be used later to replace placeholders in string
   * @return {string} translated (and interpolated)
   */


  Translator.prototype.translate = function translate(key, options) {
    if (options && options.smart_count) {
      var plural = this.locale.pluralize(options.smart_count);
      return this.interpolate(this.opts.locale.strings[key][plural], options);
    }

    return this.interpolate(this.opts.locale.strings[key], options);
  };

  return Translator;
}();

},{}],14:[function(require,module,exports){
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ee = require('namespace-emitter');

module.exports = function () {
  function UppySocket(opts) {
    var _this = this;

    _classCallCheck(this, UppySocket);

    this.queued = [];
    this.isOpen = false;
    this.socket = new WebSocket(opts.target);
    this.emitter = ee();

    this.socket.onopen = function (e) {
      _this.isOpen = true;

      while (_this.queued.length > 0 && _this.isOpen) {
        var first = _this.queued[0];
        _this.send(first.action, first.payload);
        _this.queued = _this.queued.slice(1);
      }
    };

    this.socket.onclose = function (e) {
      _this.isOpen = false;
    };

    this._handleMessage = this._handleMessage.bind(this);

    this.socket.onmessage = this._handleMessage;

    this.close = this.close.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.send = this.send.bind(this);
  }

  UppySocket.prototype.close = function close() {
    return this.socket.close();
  };

  UppySocket.prototype.send = function send(action, payload) {
    // attach uuid

    if (!this.isOpen) {
      this.queued.push({ action: action, payload: payload });
      return;
    }

    this.socket.send(JSON.stringify({
      action: action,
      payload: payload
    }));
  };

  UppySocket.prototype.on = function on(action, handler) {
    this.emitter.on(action, handler);
  };

  UppySocket.prototype.emit = function emit(action, payload) {
    this.emitter.emit(action, payload);
  };

  UppySocket.prototype.once = function once(action, handler) {
    this.emitter.once(action, handler);
  };

  UppySocket.prototype._handleMessage = function _handleMessage(e) {
    try {
      var message = JSON.parse(e.data);
      this.emit(message.action, message.payload);
    } catch (err) {
      console.log(err);
    }
  };

  return UppySocket;
}();

},{"namespace-emitter":7}],15:[function(require,module,exports){
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var throttle = require('lodash.throttle');

/**
 * A collection of small utility functions that help with dom manipulation, adding listeners,
 * promises and other good things.
 *
 * @module Utils
 */

function isTouchDevice() {
  return 'ontouchstart' in window || // works on most browsers
  navigator.maxTouchPoints; // works on IE10/11 and Surface
}

function truncateString(str, length) {
  if (str.length > length) {
    return str.substr(0, length / 2) + '...' + str.substr(str.length - length / 4, str.length);
  }
  return str;

  // more precise version if needed
  // http://stackoverflow.com/a/831583
}

function secondsToTime(rawSeconds) {
  var hours = Math.floor(rawSeconds / 3600) % 24;
  var minutes = Math.floor(rawSeconds / 60) % 60;
  var seconds = Math.floor(rawSeconds % 60);

  return { hours: hours, minutes: minutes, seconds: seconds };
}

/**
 * Converts list into array
*/
function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

/**
 * Returns a timestamp in the format of `hours:minutes:seconds`
*/
function getTimeStamp() {
  var date = new Date();
  var hours = pad(date.getHours().toString());
  var minutes = pad(date.getMinutes().toString());
  var seconds = pad(date.getSeconds().toString());
  return hours + ':' + minutes + ':' + seconds;
}

/**
 * Adds zero to strings shorter than two characters
*/
function pad(str) {
  return str.length !== 2 ? 0 + str : str;
}

/**
 * Takes a file object and turns it into fileID, by converting file.name to lowercase,
 * removing extra characters and adding type, size and lastModified
 *
 * @param {Object} file
 * @return {String} the fileID
 *
 */
function generateFileID(file) {
  // filter is needed to not join empty values with `-`
  return ['uppy', file.name ? file.name.toLowerCase().replace(/[^A-Z0-9]/ig, '') : '', file.type, file.data.size, file.data.lastModified].filter(function (val) {
    return val;
  }).join('-');
}

/**
 * Runs an array of promise-returning functions in sequence.
 */
function runPromiseSequence(functions) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var promise = _Promise.resolve();
  functions.forEach(function (func) {
    promise = promise.then(function () {
      return func.apply(undefined, args);
    });
  });
  return promise;
}

function isPreviewSupported(fileType) {
  if (!fileType) return false;
  var fileTypeSpecific = fileType.split('/')[1];
  // list of images that browsers can preview
  if (/^(jpeg|gif|png|svg|svg\+xml|bmp)$/.test(fileTypeSpecific)) {
    return true;
  }
  return false;
}

function getArrayBuffer(chunk) {
  return new _Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.addEventListener('load', function (e) {
      // e.target.result is an ArrayBuffer
      resolve(e.target.result);
    });
    reader.addEventListener('error', function (err) {
      console.error('FileReader error' + err);
      reject(err);
    });
    // file-type only needs the first 4100 bytes
    reader.readAsArrayBuffer(chunk);
  });
}

function getFileType(file) {
  var extensionsToMime = {
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'mp4': 'video/mp4',
    'mp3': 'audio/mp3',
    'svg': 'image/svg+xml',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'yaml': 'text/yaml',
    'yml': 'text/yaml'
  };

  var fileExtension = file.name ? getFileNameAndExtension(file.name).extension : null;

  if (file.isRemote) {
    // some remote providers do not support file types
    return file.type ? file.type : extensionsToMime[fileExtension];
  }

  // 2. if that’s no good, check if mime type is set in the file object
  if (file.type) {
    return file.type;
  }

  // 3. if that’s no good, see if we can map extension to a mime type
  if (fileExtension && extensionsToMime[fileExtension]) {
    return extensionsToMime[fileExtension];
  }

  // if all fails, well, return empty
  return null;
}

// TODO Check which types are actually supported in browsers. Chrome likes webm
// from my testing, but we may need more.
// We could use a library but they tend to contain dozens of KBs of mappings,
// most of which will go unused, so not sure if that's worth it.
var mimeToExtensions = {
  'video/ogg': 'ogv',
  'audio/ogg': 'ogg',
  'video/webm': 'webm',
  'audio/webm': 'webm',
  'video/mp4': 'mp4',
  'audio/mp3': 'mp3'
};

function getFileTypeExtension(mimeType) {
  return mimeToExtensions[mimeType] || null;
}

/**
* Takes a full filename string and returns an object {name, extension}
*
* @param {string} fullFileName
* @return {object} {name, extension}
*/
function getFileNameAndExtension(fullFileName) {
  var re = /(?:\.([^.]+))?$/;
  var fileExt = re.exec(fullFileName)[1];
  var fileName = fullFileName.replace('.' + fileExt, '');
  return {
    name: fileName,
    extension: fileExt
  };
}

/**
 * Check if a URL string is an object URL from `URL.createObjectURL`.
 *
 * @param {string} url
 * @return {boolean}
 */
function isObjectURL(url) {
  return url.indexOf('blob:') === 0;
}

function getProportionalHeight(img, width) {
  var aspect = img.width / img.height;
  return Math.round(width / aspect);
}

/**
 * Create a thumbnail for the given Uppy file object.
 *
 * @param {{data: Blob}} file
 * @param {number} width
 * @return {Promise}
 */
function createThumbnail(file, targetWidth) {
  var originalUrl = URL.createObjectURL(file.data);
  var onload = new _Promise(function (resolve, reject) {
    var image = new Image();
    image.src = originalUrl;
    image.onload = function () {
      URL.revokeObjectURL(originalUrl);
      resolve(image);
    };
    image.onerror = function () {
      // The onerror event is totally useless unfortunately, as far as I know
      URL.revokeObjectURL(originalUrl);
      reject(new Error('Could not create thumbnail'));
    };
  });

  return onload.then(function (image) {
    var targetHeight = getProportionalHeight(image, targetWidth);
    var canvas = resizeImage(image, targetWidth, targetHeight);
    return canvasToBlob(canvas, 'image/png');
  }).then(function (blob) {
    return URL.createObjectURL(blob);
  });
}

/**
 * Resize an image to the target `width` and `height`.
 *
 * Returns a Canvas with the resized image on it.
 */
function resizeImage(image, targetWidth, targetHeight) {
  var sourceWidth = image.width;
  var sourceHeight = image.height;

  if (targetHeight < image.height / 2) {
    var steps = Math.floor(Math.log(image.width / targetWidth) / Math.log(2));
    var stepScaled = downScaleInSteps(image, steps);
    image = stepScaled.image;
    sourceWidth = stepScaled.sourceWidth;
    sourceHeight = stepScaled.sourceHeight;
  }

  var canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  var context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

  return canvas;
}

/**
 * Downscale an image by 50% `steps` times.
 */
function downScaleInSteps(image, steps) {
  var source = image;
  var currentWidth = source.width;
  var currentHeight = source.height;

  for (var i = 0; i < steps; i += 1) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = currentWidth / 2;
    canvas.height = currentHeight / 2;
    context.drawImage(source,
    // The entire source image. We pass width and height here,
    // because we reuse this canvas, and should only scale down
    // the part of the canvas that contains the previous scale step.
    0, 0, currentWidth, currentHeight,
    // Draw to 50% size
    0, 0, currentWidth / 2, currentHeight / 2);
    currentWidth /= 2;
    currentHeight /= 2;
    source = canvas;
  }

  return {
    image: source,
    sourceWidth: currentWidth,
    sourceHeight: currentHeight
  };
}

/**
 * Save a <canvas> element's content to a Blob object.
 *
 * @param {HTMLCanvasElement} canvas
 * @return {Promise}
 */
function canvasToBlob(canvas, type, quality) {
  if (canvas.toBlob) {
    return new _Promise(function (resolve) {
      canvas.toBlob(resolve, type, quality);
    });
  }
  return _Promise.resolve().then(function () {
    return dataURItoBlob(canvas.toDataURL(type, quality), {});
  });
}

function dataURItoBlob(dataURI, opts, toFile) {
  // get the base64 data
  var data = dataURI.split(',')[1];

  // user may provide mime type, if not get it from data URI
  var mimeType = opts.mimeType || dataURI.split(',')[0].split(':')[1].split(';')[0];

  // default to plain/text if data URI has no mimeType
  if (mimeType == null) {
    mimeType = 'plain/text';
  }

  var binary = atob(data);
  var array = [];
  for (var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }

  // Convert to a File?
  if (toFile) {
    return new File([new Uint8Array(array)], opts.name || '', { type: mimeType });
  }

  return new Blob([new Uint8Array(array)], { type: mimeType });
}

function dataURItoFile(dataURI, opts) {
  return dataURItoBlob(dataURI, opts, true);
}

/**
 * Copies text to clipboard by creating an almost invisible textarea,
 * adding text there, then running execCommand('copy').
 * Falls back to prompt() when the easy way fails (hello, Safari!)
 * From http://stackoverflow.com/a/30810322
 *
 * @param {String} textToCopy
 * @param {String} fallbackString
 * @return {Promise}
 */
function copyToClipboard(textToCopy, fallbackString) {
  fallbackString = fallbackString || 'Copy the URL below';

  return new _Promise(function (resolve) {
    var textArea = document.createElement('textarea');
    textArea.setAttribute('style', {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '2em',
      height: '2em',
      padding: 0,
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent'
    });

    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();

    var magicCopyFailed = function magicCopyFailed() {
      document.body.removeChild(textArea);
      window.prompt(fallbackString, textToCopy);
      resolve();
    };

    try {
      var successful = document.execCommand('copy');
      if (!successful) {
        return magicCopyFailed('copy command unavailable');
      }
      document.body.removeChild(textArea);
      return resolve();
    } catch (err) {
      document.body.removeChild(textArea);
      return magicCopyFailed(err);
    }
  });
}

function getSpeed(fileProgress) {
  if (!fileProgress.bytesUploaded) return 0;

  var timeElapsed = new Date() - fileProgress.uploadStarted;
  var uploadSpeed = fileProgress.bytesUploaded / (timeElapsed / 1000);
  return uploadSpeed;
}

function getBytesRemaining(fileProgress) {
  return fileProgress.bytesTotal - fileProgress.bytesUploaded;
}

function getETA(fileProgress) {
  if (!fileProgress.bytesUploaded) return 0;

  var uploadSpeed = getSpeed(fileProgress);
  var bytesRemaining = getBytesRemaining(fileProgress);
  var secondsRemaining = Math.round(bytesRemaining / uploadSpeed * 10) / 10;

  return secondsRemaining;
}

function prettyETA(seconds) {
  var time = secondsToTime(seconds);

  // Only display hours and minutes if they are greater than 0 but always
  // display minutes if hours is being displayed
  // Display a leading zero if the there is a preceding unit: 1m 05s, but 5s
  var hoursStr = time.hours ? time.hours + 'h ' : '';
  var minutesVal = time.hours ? ('0' + time.minutes).substr(-2) : time.minutes;
  var minutesStr = minutesVal ? minutesVal + 'm ' : '';
  var secondsVal = minutesVal ? ('0' + time.seconds).substr(-2) : time.seconds;
  var secondsStr = secondsVal + 's';

  return '' + hoursStr + minutesStr + secondsStr;
}

/**
 * Check if an object is a DOM element. Duck-typing based on `nodeType`.
 *
 * @param {*} obj
 */
function isDOMElement(obj) {
  return obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj.nodeType === Node.ELEMENT_NODE;
}

/**
 * Find a DOM element.
 *
 * @param {Node|string} element
 * @return {Node|null}
 */
function findDOMElement(element) {
  if (typeof element === 'string') {
    return document.querySelector(element);
  }

  if ((typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && isDOMElement(element)) {
    return element;
  }
}

/**
 * Find one or more DOM elements.
 *
 * @param {string} element
 * @return {Array|null}
 */
function findAllDOMElements(element) {
  if (typeof element === 'string') {
    var elements = [].slice.call(document.querySelectorAll(element));
    return elements.length > 0 ? elements : null;
  }

  if ((typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && isDOMElement(element)) {
    return [element];
  }
}

function getSocketHost(url) {
  // get the host domain
  var regex = /^(?:https?:\/\/|\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\n]+)/;
  var host = regex.exec(url)[1];
  var socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws';

  return socketProtocol + '://' + host;
}

function _emitSocketProgress(uploader, progressData, file) {
  var progress = progressData.progress,
      bytesUploaded = progressData.bytesUploaded,
      bytesTotal = progressData.bytesTotal;

  if (progress) {
    uploader.uppy.log('Upload progress: ' + progress);
    uploader.uppy.emit('upload-progress', file, {
      uploader: uploader,
      bytesUploaded: bytesUploaded,
      bytesTotal: bytesTotal
    });
  }
}

var emitSocketProgress = throttle(_emitSocketProgress, 300, { leading: true, trailing: true });

function settle(promises) {
  var resolutions = [];
  var rejections = [];
  function resolved(value) {
    resolutions.push(value);
  }
  function rejected(error) {
    rejections.push(error);
  }

  var wait = _Promise.all(promises.map(function (promise) {
    return promise.then(resolved, rejected);
  }));

  return wait.then(function () {
    return {
      successful: resolutions,
      failed: rejections
    };
  });
}

/**
 * Limit the amount of simultaneously pending Promises.
 * Returns a function that, when passed a function `fn`,
 * will make sure that at most `limit` calls to `fn` are pending.
 *
 * @param {number} limit
 * @return {function()}
 */
function limitPromises(limit) {
  var pending = 0;
  var queue = [];
  return function (fn) {
    return function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var call = function call() {
        pending++;
        var promise = fn.apply(undefined, args);
        promise.then(onfinish, onfinish);
        return promise;
      };

      if (pending >= limit) {
        return new _Promise(function (resolve, reject) {
          queue.push(function () {
            call().then(resolve, reject);
          });
        });
      }
      return call();
    };
  };
  function onfinish() {
    pending--;
    var next = queue.shift();
    if (next) next();
  }
}

module.exports = {
  generateFileID: generateFileID,
  toArray: toArray,
  getTimeStamp: getTimeStamp,
  runPromiseSequence: runPromiseSequence,
  isTouchDevice: isTouchDevice,
  getFileNameAndExtension: getFileNameAndExtension,
  truncateString: truncateString,
  getFileTypeExtension: getFileTypeExtension,
  getFileType: getFileType,
  getArrayBuffer: getArrayBuffer,
  isPreviewSupported: isPreviewSupported,
  isObjectURL: isObjectURL,
  createThumbnail: createThumbnail,
  secondsToTime: secondsToTime,
  dataURItoBlob: dataURItoBlob,
  dataURItoFile: dataURItoFile,
  canvasToBlob: canvasToBlob,
  getSpeed: getSpeed,
  getBytesRemaining: getBytesRemaining,
  getETA: getETA,
  copyToClipboard: copyToClipboard,
  prettyETA: prettyETA,
  findDOMElement: findDOMElement,
  findAllDOMElements: findAllDOMElements,
  getSocketHost: getSocketHost,
  emitSocketProgress: emitSocketProgress,
  settle: settle,
  limitPromises: limitPromises
};

},{"es6-promise":4,"lodash.throttle":5}],16:[function(require,module,exports){
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Plugin = require('../core/Plugin');

var _require = require('../core/Utils'),
    toArray = _require.toArray;

var Translator = require('../core/Translator');

var _require2 = require('preact'),
    h = _require2.h;

module.exports = function (_Plugin) {
  _inherits(FileInput, _Plugin);

  function FileInput(uppy, opts) {
    _classCallCheck(this, FileInput);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.id = _this.opts.id || 'FileInput';
    _this.title = 'File Input';
    _this.type = 'acquirer';

    var defaultLocale = {
      strings: {
        chooseFiles: 'Choose files'
      }

      // Default options
    };var defaultOptions = {
      target: null,
      pretty: true,
      inputName: 'files[]',
      locale: defaultLocale

      // Merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.locale = _extends({}, defaultLocale, _this.opts.locale);
    _this.locale.strings = _extends({}, defaultLocale.strings, _this.opts.locale.strings);

    // i18n
    _this.translator = new Translator({ locale: _this.locale });
    _this.i18n = _this.translator.translate.bind(_this.translator);

    _this.render = _this.render.bind(_this);
    _this.handleInputChange = _this.handleInputChange.bind(_this);
    _this.handleClick = _this.handleClick.bind(_this);
    return _this;
  }

  FileInput.prototype.handleInputChange = function handleInputChange(ev) {
    var _this2 = this;

    this.uppy.log('[FileInput] Something selected through input...');

    var files = toArray(ev.target.files);

    files.forEach(function (file) {
      _this2.uppy.addFile({
        source: _this2.id,
        name: file.name,
        type: file.type,
        data: file
      });
    });
  };

  FileInput.prototype.handleClick = function handleClick(ev) {
    this.input.click();
  };

  FileInput.prototype.render = function render(state) {
    var _this3 = this;

    /* http://tympanus.net/codrops/2015/09/15/styling-customizing-file-inputs-smart-way/ */
    var hiddenInputStyle = {
      width: '0.1px',
      height: '0.1px',
      opacity: 0,
      overflow: 'hidden',
      position: 'absolute',
      zIndex: -1
    };

    var restrictions = this.uppy.opts.restrictions;

    // empty value="" on file input, so that the input is cleared after a file is selected,
    // because Uppy will be handling the upload and so we can select same file
    // after removing — otherwise browser thinks it’s already selected
    return h(
      'div',
      { 'class': 'uppy-Root uppy-FileInput-container' },
      h('input', { 'class': 'uppy-FileInput-input',
        style: this.opts.pretty && hiddenInputStyle,
        type: 'file',
        name: this.opts.inputName,
        onchange: this.handleInputChange,
        multiple: restrictions.maxNumberOfFiles !== 1,
        accept: restrictions.allowedFileTypes,
        ref: function ref(input) {
          _this3.input = input;
        },
        value: '' }),
      this.opts.pretty && h(
        'button',
        { 'class': 'uppy-FileInput-btn', type: 'button', onclick: this.handleClick },
        this.i18n('chooseFiles')
      )
    );
  };

  FileInput.prototype.install = function install() {
    var target = this.opts.target;
    if (target) {
      this.mount(target, this);
    }
  };

  FileInput.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return FileInput;
}(Plugin);

},{"../core/Plugin":12,"../core/Translator":13,"../core/Utils":15,"preact":8}],17:[function(require,module,exports){
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Plugin = require('../core/Plugin');

var _require = require('preact'),
    h = _require.h;

/**
 * Progress bar
 *
 */


module.exports = function (_Plugin) {
  _inherits(ProgressBar, _Plugin);

  function ProgressBar(uppy, opts) {
    _classCallCheck(this, ProgressBar);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.id = _this.opts.id || 'ProgressBar';
    _this.title = 'Progress Bar';
    _this.type = 'progressindicator';

    // set default options
    var defaultOptions = {
      target: 'body',
      replaceTargetContent: false,
      fixed: false,
      hideAfterFinish: true

      // merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.render = _this.render.bind(_this);
    return _this;
  }

  ProgressBar.prototype.render = function render(state) {
    var progress = state.totalProgress || 0;
    var isHidden = progress === 100 && this.opts.hideAfterFinish;
    return h(
      'div',
      { 'class': 'uppy uppy-ProgressBar', style: { position: this.opts.fixed ? 'fixed' : 'initial' }, 'aria-hidden': isHidden },
      h('div', { 'class': 'uppy-ProgressBar-inner', style: { width: progress + '%' } }),
      h(
        'div',
        { 'class': 'uppy-ProgressBar-percentage' },
        progress
      )
    );
  };

  ProgressBar.prototype.install = function install() {
    var target = this.opts.target;
    if (target) {
      this.mount(target, this);
    }
  };

  ProgressBar.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return ProgressBar;
}(Plugin);

},{"../core/Plugin":12,"preact":8}],18:[function(require,module,exports){
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Plugin = require('../core/Plugin');
var cuid = require('cuid');
var Translator = require('../core/Translator');
var UppySocket = require('../core/UppySocket');

var _require = require('../core/Utils'),
    emitSocketProgress = _require.emitSocketProgress,
    getSocketHost = _require.getSocketHost,
    settle = _require.settle,
    limitPromises = _require.limitPromises;

function buildResponseError(xhr, error) {
  // No error message
  if (!error) error = new Error('Upload error');
  // Got an error message string
  if (typeof error === 'string') error = new Error(error);
  // Got something else
  if (!(error instanceof Error)) {
    error = _extends(new Error('Upload error'), { data: error });
  }

  error.request = xhr;
  return error;
}

module.exports = function (_Plugin) {
  _inherits(XHRUpload, _Plugin);

  function XHRUpload(uppy, opts) {
    _classCallCheck(this, XHRUpload);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.type = 'uploader';
    _this.id = 'XHRUpload';
    _this.title = 'XHRUpload';

    var defaultLocale = {
      strings: {
        timedOut: 'Upload stalled for %{seconds} seconds, aborting.'
      }

      // Default options
    };var defaultOptions = {
      formData: true,
      fieldName: 'files[]',
      method: 'post',
      metaFields: null,
      responseUrlFieldName: 'url',
      bundle: false,
      headers: {},
      locale: defaultLocale,
      timeout: 30 * 1000,
      limit: 0,
      /**
       * @typedef respObj
       * @property {string} responseText
       * @property {number} status
       * @property {string} statusText
       * @property {Object.<string, string>} headers
       *
       * @param {string} responseText the response body string
       * @param {XMLHttpRequest | respObj} response the response object (XHR or similar)
       */
      getResponseData: function getResponseData(responseText, response) {
        var parsedResponse = {};
        try {
          parsedResponse = JSON.parse(responseText);
        } catch (err) {
          console.log(err);
        }

        return parsedResponse;
      },

      /**
       *
       * @param {string} responseText the response body string
       * @param {XMLHttpRequest | respObj} response the response object (XHR or similar)
       */
      getResponseError: function getResponseError(responseText, response) {
        return new Error('Upload error');
      }
    };

    // Merge default options with the ones set by user
    _this.opts = _extends({}, defaultOptions, opts);
    _this.locale = _extends({}, defaultLocale, _this.opts.locale);
    _this.locale.strings = _extends({}, defaultLocale.strings, _this.opts.locale.strings);

    // i18n
    _this.translator = new Translator({ locale: _this.locale });
    _this.i18n = _this.translator.translate.bind(_this.translator);

    _this.handleUpload = _this.handleUpload.bind(_this);

    // Simultaneous upload limiting is shared across all uploads with this plugin.
    if (typeof _this.opts.limit === 'number' && _this.opts.limit !== 0) {
      _this.limitUploads = limitPromises(_this.opts.limit);
    } else {
      _this.limitUploads = function (fn) {
        return fn;
      };
    }

    if (_this.opts.bundle && !_this.opts.formData) {
      throw new Error('`opts.formData` must be true when `opts.bundle` is enabled.');
    }
    return _this;
  }

  XHRUpload.prototype.getOptions = function getOptions(file) {
    var opts = _extends({}, this.opts, this.uppy.state.xhrUpload || {}, file.xhrUpload || {});
    opts.headers = {};
    _extends(opts.headers, this.opts.headers);
    if (this.uppy.state.xhrUpload) {
      _extends(opts.headers, this.uppy.state.xhrUpload.headers);
    }
    if (file.xhrUpload) {
      _extends(opts.headers, file.xhrUpload.headers);
    }

    return opts;
  };

  // Helper to abort upload requests if there has not been any progress for `timeout` ms.
  // Create an instance using `timer = createProgressTimeout(10000, onTimeout)`
  // Call `timer.progress()` to signal that there has been progress of any kind.
  // Call `timer.done()` when the upload has completed.


  XHRUpload.prototype.createProgressTimeout = function createProgressTimeout(timeout, timeoutHandler) {
    var uppy = this.uppy;
    var self = this;
    function onTimedOut() {
      uppy.log('[XHRUpload] timed out');
      var error = new Error(self.i18n('timedOut', { seconds: Math.ceil(timeout / 1000) }));
      timeoutHandler(error);
    }

    var aliveTimer = null;
    function progress() {
      if (timeout > 0) {
        done();
        aliveTimer = setTimeout(onTimedOut, timeout);
      }
    }

    function done() {
      if (aliveTimer) {
        clearTimeout(aliveTimer);
        aliveTimer = null;
      }
    }

    return {
      progress: progress,
      done: done
    };
  };

  XHRUpload.prototype.createFormDataUpload = function createFormDataUpload(file, opts) {
    var formPost = new FormData();

    var metaFields = Array.isArray(opts.metaFields) ? opts.metaFields
    // Send along all fields by default.
    : Object.keys(file.meta);
    metaFields.forEach(function (item) {
      formPost.append(item, file.meta[item]);
    });

    formPost.append(opts.fieldName, file.data);

    return formPost;
  };

  XHRUpload.prototype.createBareUpload = function createBareUpload(file, opts) {
    return file.data;
  };

  XHRUpload.prototype.upload = function upload(file, current, total) {
    var _this2 = this;

    var opts = this.getOptions(file);

    this.uppy.log('uploading ' + current + ' of ' + total);
    return new _Promise(function (resolve, reject) {
      var data = opts.formData ? _this2.createFormDataUpload(file, opts) : _this2.createBareUpload(file, opts);

      var timer = _this2.createProgressTimeout(opts.timeout, function (error) {
        xhr.abort();
        _this2.uppy.emit('upload-error', file, error);
        reject(error);
      });

      var xhr = new XMLHttpRequest();
      var id = cuid();

      xhr.upload.addEventListener('loadstart', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' started');
        // Begin checking for timeouts when loading starts.
        timer.progress();
      });

      xhr.upload.addEventListener('progress', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' progress: ' + ev.loaded + ' / ' + ev.total);
        timer.progress();

        if (ev.lengthComputable) {
          _this2.uppy.emit('upload-progress', file, {
            uploader: _this2,
            bytesUploaded: ev.loaded,
            bytesTotal: ev.total
          });
        }
      });

      xhr.addEventListener('load', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' finished');
        timer.done();

        if (ev.target.status >= 200 && ev.target.status < 300) {
          var body = opts.getResponseData(xhr.responseText, xhr);
          var uploadURL = body[opts.responseUrlFieldName];

          var response = {
            status: ev.target.status,
            body: body,
            uploadURL: uploadURL
          };

          _this2.uppy.setFileState(file.id, { response: response });

          _this2.uppy.emit('upload-success', file, body, uploadURL);

          if (uploadURL) {
            _this2.uppy.log('Download ' + file.name + ' from ' + file.uploadURL);
          }

          return resolve(file);
        } else {
          var _body = opts.getResponseData(xhr.responseText, xhr);
          var error = buildResponseError(xhr, opts.getResponseError(xhr.responseText, xhr));

          var _response = {
            status: ev.target.status,
            body: _body
          };

          _this2.uppy.setFileState(file.id, { response: _response });

          _this2.uppy.emit('upload-error', file, error);
          return reject(error);
        }
      });

      xhr.addEventListener('error', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' errored');
        timer.done();

        var error = buildResponseError(xhr, opts.getResponseError(xhr.responseText, xhr));
        _this2.uppy.emit('upload-error', file, error);
        return reject(error);
      });

      xhr.open(opts.method.toUpperCase(), opts.endpoint, true);

      Object.keys(opts.headers).forEach(function (header) {
        xhr.setRequestHeader(header, opts.headers[header]);
      });

      xhr.send(data);

      _this2.uppy.on('file-removed', function (removedFile) {
        if (removedFile.id === file.id) {
          timer.done();
          xhr.abort();
        }
      });

      _this2.uppy.on('upload-cancel', function (fileID) {
        if (fileID === file.id) {
          timer.done();
          xhr.abort();
        }
      });

      _this2.uppy.on('cancel-all', function () {
        // const files = this.uppy.getState().files
        // if (!files[file.id]) return
        xhr.abort();
      });
    });
  };

  XHRUpload.prototype.uploadRemote = function uploadRemote(file, current, total) {
    var _this3 = this;

    var opts = this.getOptions(file);
    return new _Promise(function (resolve, reject) {
      var fields = {};
      var metaFields = Array.isArray(opts.metaFields) ? opts.metaFields
      // Send along all fields by default.
      : Object.keys(file.meta);

      metaFields.forEach(function (name) {
        fields[name] = file.meta[name];
      });

      fetch(file.remote.url, {
        method: 'post',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(_extends({}, file.remote.body, {
          endpoint: opts.endpoint,
          size: file.data.size,
          fieldname: opts.fieldName,
          metadata: fields,
          headers: opts.headers
        }))
      }).then(function (res) {
        if (res.status < 200 && res.status > 300) {
          return reject(res.statusText);
        }

        res.json().then(function (data) {
          var token = data.token;
          var host = getSocketHost(file.remote.host);
          var socket = new UppySocket({ target: host + '/api/' + token });

          socket.on('progress', function (progressData) {
            return emitSocketProgress(_this3, progressData, file);
          });

          socket.on('success', function (data) {
            var resp = opts.getResponseData(data.response.responseText, data.response);
            var uploadURL = resp[opts.responseUrlFieldName];
            _this3.uppy.emit('upload-success', file, resp, uploadURL);
            socket.close();
            return resolve();
          });

          socket.on('error', function (errData) {
            var resp = errData.response;
            var error = resp ? opts.getResponseError(resp.responseText, resp) : _extends(new Error(errData.error.message), { cause: errData.error });
            _this3.uppy.emit('upload-error', file, error);
            reject(error);
          });
        });
      });
    });
  };

  XHRUpload.prototype.uploadBundle = function uploadBundle(files) {
    var _this4 = this;

    return new _Promise(function (resolve, reject) {
      var endpoint = _this4.opts.endpoint;
      var method = _this4.opts.method;

      var formData = new FormData();
      files.forEach(function (file, i) {
        var opts = _this4.getOptions(file);
        formData.append(opts.fieldName, file.data);
      });

      var xhr = new XMLHttpRequest();

      var timer = _this4.createProgressTimeout(_this4.opts.timeout, function (error) {
        xhr.abort();
        emitError(error);
        reject(error);
      });

      var emitError = function emitError(error) {
        files.forEach(function (file) {
          _this4.uppy.emit('upload-error', file, error);
        });
      };

      xhr.upload.addEventListener('loadstart', function (ev) {
        _this4.uppy.log('[XHRUpload] started uploading bundle');
        timer.progress();
      });

      xhr.upload.addEventListener('progress', function (ev) {
        timer.progress();

        if (!ev.lengthComputable) return;

        files.forEach(function (file) {
          _this4.uppy.emit('upload-progress', file, {
            uploader: _this4,
            bytesUploaded: ev.loaded,
            bytesTotal: ev.total
          });
        });
      });

      xhr.addEventListener('load', function (ev) {
        timer.done();

        if (ev.target.status >= 200 && ev.target.status < 300) {
          var resp = _this4.opts.getResponseData(xhr.responseText, xhr);
          files.forEach(function (file) {
            _this4.uppy.emit('upload-success', file, resp);
          });
          return resolve();
        }

        var error = _this4.opts.getResponseError(xhr.responseText, xhr) || new Error('Upload error');
        error.request = xhr;
        emitError(error);
        return reject(error);
      });

      xhr.addEventListener('error', function (ev) {
        timer.done();

        var error = _this4.opts.getResponseError(xhr.responseText, xhr) || new Error('Upload error');
        emitError(error);
        return reject(error);
      });

      _this4.uppy.on('cancel-all', function () {
        xhr.abort();
      });

      xhr.open(method.toUpperCase(), endpoint, true);

      Object.keys(_this4.opts.headers).forEach(function (header) {
        xhr.setRequestHeader(header, _this4.opts.headers[header]);
      });

      xhr.send(formData);

      files.forEach(function (file) {
        _this4.uppy.emit('upload-started', file);
      });
    });
  };

  XHRUpload.prototype.uploadFiles = function uploadFiles(files) {
    var _this5 = this;

    var actions = files.map(function (file, i) {
      var current = parseInt(i, 10) + 1;
      var total = files.length;

      if (file.error) {
        return function () {
          return _Promise.reject(new Error(file.error));
        };
      } else if (file.isRemote) {
        // We emit upload-started here, so that it's also emitted for files
        // that have to wait due to the `limit` option.
        _this5.uppy.emit('upload-started', file);
        return _this5.uploadRemote.bind(_this5, file, current, total);
      } else {
        _this5.uppy.emit('upload-started', file);
        return _this5.upload.bind(_this5, file, current, total);
      }
    });

    var promises = actions.map(function (action) {
      var limitedAction = _this5.limitUploads(action);
      return limitedAction();
    });

    return settle(promises);
  };

  XHRUpload.prototype.handleUpload = function handleUpload(fileIDs) {
    var _this6 = this;

    if (fileIDs.length === 0) {
      this.uppy.log('[XHRUpload] No files to upload!');
      return _Promise.resolve();
    }

    this.uppy.log('[XHRUpload] Uploading...');
    var files = fileIDs.map(function (fileID) {
      return _this6.uppy.getFile(fileID);
    });

    if (this.opts.bundle) {
      return this.uploadBundle(files);
    }

    return this.uploadFiles(files).then(function () {
      return null;
    });
  };

  XHRUpload.prototype.install = function install() {
    this.uppy.addUploader(this.handleUpload);
  };

  XHRUpload.prototype.uninstall = function uninstall() {
    this.uppy.removeUploader(this.handleUpload);
  };

  return XHRUpload;
}(Plugin);

},{"../core/Plugin":12,"../core/Translator":13,"../core/UppySocket":14,"../core/Utils":15,"cuid":1,"es6-promise":4}],19:[function(require,module,exports){
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Default store that keeps state in a simple object.
 */
var DefaultStore = function () {
  function DefaultStore() {
    _classCallCheck(this, DefaultStore);

    this.state = {};
    this.callbacks = [];
  }

  DefaultStore.prototype.getState = function getState() {
    return this.state;
  };

  DefaultStore.prototype.setState = function setState(patch) {
    var prevState = _extends({}, this.state);
    var nextState = _extends({}, this.state, patch);

    this.state = nextState;
    this._publish(prevState, nextState, patch);
  };

  DefaultStore.prototype.subscribe = function subscribe(listener) {
    var _this = this;

    this.callbacks.push(listener);
    return function () {
      // Remove the listener.
      _this.callbacks.splice(_this.callbacks.indexOf(listener), 1);
    };
  };

  DefaultStore.prototype._publish = function _publish() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    this.callbacks.forEach(function (listener) {
      listener.apply(undefined, args);
    });
  };

  return DefaultStore;
}();

module.exports = function defaultStore() {
  return new DefaultStore();
};

},{}],20:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],21:[function(require,module,exports){
var Uppy = require('/home/travis/build/transloadit/uppy/src/core/Core');
var FileInput = require('/home/travis/build/transloadit/uppy/src/plugins/FileInput');
var XHRUpload = require('/home/travis/build/transloadit/uppy/src/plugins/XHRUpload');
var ProgressBar = require('/home/travis/build/transloadit/uppy/src/plugins/ProgressBar');

var uppy = new Uppy({ debug: true, autoProceed: true });
uppy.use(FileInput, { target: '.UppyForm', replaceTargetContent: true });
uppy.use(XHRUpload, {
  endpoint: '//api2.transloadit.com',
  formData: true,
  fieldName: 'files[]'
});
uppy.use(ProgressBar, {
  target: 'body',
  fixed: true,
  hideAfterFinish: false
});

console.log('Uppy with Formtag and XHRUpload is loaded');

},{"/home/travis/build/transloadit/uppy/src/core/Core":11,"/home/travis/build/transloadit/uppy/src/plugins/FileInput":16,"/home/travis/build/transloadit/uppy/src/plugins/ProgressBar":17,"/home/travis/build/transloadit/uppy/src/plugins/XHRUpload":18}]},{},[21])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvY3VpZC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jdWlkL2xpYi9maW5nZXJwcmludC5icm93c2VyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2N1aWQvbGliL3BhZC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2VzNi1wcm9taXNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9taW1lLW1hdGNoL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL25hbWVzcGFjZS1lbWl0dGVyL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3ByZWFjdC9kaXN0L3ByZWFjdC5qcyIsIi4uL25vZGVfbW9kdWxlcy9wcmV0dGllci1ieXRlcy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy93aWxkY2FyZC9pbmRleC5qcyIsIi4uL3NyYy9jb3JlL0NvcmUuanMiLCIuLi9zcmMvY29yZS9QbHVnaW4uanMiLCIuLi9zcmMvY29yZS9UcmFuc2xhdG9yLmpzIiwiLi4vc3JjL2NvcmUvVXBweVNvY2tldC5qcyIsIi4uL3NyYy9jb3JlL1V0aWxzLmpzIiwiLi4vc3JjL3BsdWdpbnMvRmlsZUlucHV0LmpzIiwiLi4vc3JjL3BsdWdpbnMvUHJvZ3Jlc3NCYXIuanMiLCIuLi9zcmMvcGx1Z2lucy9YSFJVcGxvYWQuanMiLCIuLi9zcmMvc3RvcmUvRGVmYXVsdFN0b3JlLmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9leGFtcGxlcy94aHJ1cGxvYWQvYXBwLmVzNiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBLElBQU0sT0FBTyxRQUFRLG9CQUFSLENBQWI7QUFDQSxJQUFNLFlBQVksUUFBUSw0QkFBUixDQUFsQjtBQUNBLElBQU0sWUFBWSxRQUFRLDRCQUFSLENBQWxCO0FBQ0EsSUFBTSxjQUFjLFFBQVEsOEJBQVIsQ0FBcEI7O0FBRUEsSUFBTSxPQUFPLElBQUksSUFBSixDQUFTLEVBQUUsT0FBTyxJQUFULEVBQWUsYUFBYSxJQUE1QixFQUFULENBQWI7QUFDQSxLQUFLLEdBQUwsQ0FBUyxTQUFULEVBQW9CLEVBQUUsUUFBUSxXQUFWLEVBQXVCLHNCQUFzQixJQUE3QyxFQUFwQjtBQUNBLEtBQUssR0FBTCxDQUFTLFNBQVQsRUFBb0I7QUFDbEIsWUFBVSx3QkFEUTtBQUVsQixZQUFVLElBRlE7QUFHbEIsYUFBVztBQUhPLENBQXBCO0FBS0EsS0FBSyxHQUFMLENBQVMsV0FBVCxFQUFzQjtBQUNwQixVQUFRLE1BRFk7QUFFcEIsU0FBTyxJQUZhO0FBR3BCLG1CQUFpQjtBQUhHLENBQXRCOztBQU1BLFFBQVEsR0FBUixDQUFZLDJDQUFaIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqXG4gKiBjdWlkLmpzXG4gKiBDb2xsaXNpb24tcmVzaXN0YW50IFVJRCBnZW5lcmF0b3IgZm9yIGJyb3dzZXJzIGFuZCBub2RlLlxuICogU2VxdWVudGlhbCBmb3IgZmFzdCBkYiBsb29rdXBzIGFuZCByZWNlbmN5IHNvcnRpbmcuXG4gKiBTYWZlIGZvciBlbGVtZW50IElEcyBhbmQgc2VydmVyLXNpZGUgbG9va3Vwcy5cbiAqXG4gKiBFeHRyYWN0ZWQgZnJvbSBDTENUUlxuICpcbiAqIENvcHlyaWdodCAoYykgRXJpYyBFbGxpb3R0IDIwMTJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxudmFyIGZpbmdlcnByaW50ID0gcmVxdWlyZSgnLi9saWIvZmluZ2VycHJpbnQuanMnKTtcbnZhciBwYWQgPSByZXF1aXJlKCcuL2xpYi9wYWQuanMnKTtcblxudmFyIGMgPSAwLFxuICBibG9ja1NpemUgPSA0LFxuICBiYXNlID0gMzYsXG4gIGRpc2NyZXRlVmFsdWVzID0gTWF0aC5wb3coYmFzZSwgYmxvY2tTaXplKTtcblxuZnVuY3Rpb24gcmFuZG9tQmxvY2sgKCkge1xuICByZXR1cm4gcGFkKChNYXRoLnJhbmRvbSgpICpcbiAgICBkaXNjcmV0ZVZhbHVlcyA8PCAwKVxuICAgIC50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKTtcbn1cblxuZnVuY3Rpb24gc2FmZUNvdW50ZXIgKCkge1xuICBjID0gYyA8IGRpc2NyZXRlVmFsdWVzID8gYyA6IDA7XG4gIGMrKzsgLy8gdGhpcyBpcyBub3Qgc3VibGltaW5hbFxuICByZXR1cm4gYyAtIDE7XG59XG5cbmZ1bmN0aW9uIGN1aWQgKCkge1xuICAvLyBTdGFydGluZyB3aXRoIGEgbG93ZXJjYXNlIGxldHRlciBtYWtlc1xuICAvLyBpdCBIVE1MIGVsZW1lbnQgSUQgZnJpZW5kbHkuXG4gIHZhciBsZXR0ZXIgPSAnYycsIC8vIGhhcmQtY29kZWQgYWxsb3dzIGZvciBzZXF1ZW50aWFsIGFjY2Vzc1xuXG4gICAgLy8gdGltZXN0YW1wXG4gICAgLy8gd2FybmluZzogdGhpcyBleHBvc2VzIHRoZSBleGFjdCBkYXRlIGFuZCB0aW1lXG4gICAgLy8gdGhhdCB0aGUgdWlkIHdhcyBjcmVhdGVkLlxuICAgIHRpbWVzdGFtcCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSkudG9TdHJpbmcoYmFzZSksXG5cbiAgICAvLyBQcmV2ZW50IHNhbWUtbWFjaGluZSBjb2xsaXNpb25zLlxuICAgIGNvdW50ZXIgPSBwYWQoc2FmZUNvdW50ZXIoKS50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKSxcblxuICAgIC8vIEEgZmV3IGNoYXJzIHRvIGdlbmVyYXRlIGRpc3RpbmN0IGlkcyBmb3IgZGlmZmVyZW50XG4gICAgLy8gY2xpZW50cyAoc28gZGlmZmVyZW50IGNvbXB1dGVycyBhcmUgZmFyIGxlc3NcbiAgICAvLyBsaWtlbHkgdG8gZ2VuZXJhdGUgdGhlIHNhbWUgaWQpXG4gICAgcHJpbnQgPSBmaW5nZXJwcmludCgpLFxuXG4gICAgLy8gR3JhYiBzb21lIG1vcmUgY2hhcnMgZnJvbSBNYXRoLnJhbmRvbSgpXG4gICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKSArIHJhbmRvbUJsb2NrKCk7XG5cbiAgcmV0dXJuIGxldHRlciArIHRpbWVzdGFtcCArIGNvdW50ZXIgKyBwcmludCArIHJhbmRvbTtcbn1cblxuY3VpZC5zbHVnID0gZnVuY3Rpb24gc2x1ZyAoKSB7XG4gIHZhciBkYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCkudG9TdHJpbmcoMzYpLFxuICAgIGNvdW50ZXIgPSBzYWZlQ291bnRlcigpLnRvU3RyaW5nKDM2KS5zbGljZSgtNCksXG4gICAgcHJpbnQgPSBmaW5nZXJwcmludCgpLnNsaWNlKDAsIDEpICtcbiAgICAgIGZpbmdlcnByaW50KCkuc2xpY2UoLTEpLFxuICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkuc2xpY2UoLTIpO1xuXG4gIHJldHVybiBkYXRlLnNsaWNlKC0yKSArXG4gICAgY291bnRlciArIHByaW50ICsgcmFuZG9tO1xufTtcblxuY3VpZC5maW5nZXJwcmludCA9IGZpbmdlcnByaW50O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGN1aWQ7XG4iLCJ2YXIgcGFkID0gcmVxdWlyZSgnLi9wYWQuanMnKTtcblxudmFyIGVudiA9IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogc2VsZjtcbnZhciBnbG9iYWxDb3VudCA9IE9iamVjdC5rZXlzKGVudik7XG52YXIgbWltZVR5cGVzTGVuZ3RoID0gbmF2aWdhdG9yLm1pbWVUeXBlcyA/IG5hdmlnYXRvci5taW1lVHlwZXMubGVuZ3RoIDogMDtcbnZhciBjbGllbnRJZCA9IHBhZCgobWltZVR5cGVzTGVuZ3RoICtcbiAgbmF2aWdhdG9yLnVzZXJBZ2VudC5sZW5ndGgpLnRvU3RyaW5nKDM2KSArXG4gIGdsb2JhbENvdW50LnRvU3RyaW5nKDM2KSwgNCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmluZ2VycHJpbnQgKCkge1xuICByZXR1cm4gY2xpZW50SWQ7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYWQgKG51bSwgc2l6ZSkge1xuICB2YXIgcyA9ICcwMDAwMDAwMDAnICsgbnVtO1xuICByZXR1cm4gcy5zdWJzdHIocy5sZW5ndGggLSBzaXplKTtcbn07XG4iLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vc3RlZmFucGVubmVyL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIHY0LjIuNCszMTRlNDgzMVxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKGZhY3RvcnkpIDpcblx0KGdsb2JhbC5FUzZQcm9taXNlID0gZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgeDtcbiAgcmV0dXJuIHggIT09IG51bGwgJiYgKHR5cGUgPT09ICdvYmplY3QnIHx8IHR5cGUgPT09ICdmdW5jdGlvbicpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuXG5cblxudmFyIF9pc0FycmF5ID0gdm9pZCAwO1xuaWYgKEFycmF5LmlzQXJyYXkpIHtcbiAgX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufSBlbHNlIHtcbiAgX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59XG5cbnZhciBpc0FycmF5ID0gX2lzQXJyYXk7XG5cbnZhciBsZW4gPSAwO1xudmFyIHZlcnR4TmV4dCA9IHZvaWQgMDtcbnZhciBjdXN0b21TY2hlZHVsZXJGbiA9IHZvaWQgMDtcblxudmFyIGFzYXAgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgbGVuICs9IDI7XG4gIGlmIChsZW4gPT09IDIpIHtcbiAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgaWYgKGN1c3RvbVNjaGVkdWxlckZuKSB7XG4gICAgICBjdXN0b21TY2hlZHVsZXJGbihmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHNldFNjaGVkdWxlcihzY2hlZHVsZUZuKSB7XG4gIGN1c3RvbVNjaGVkdWxlckZuID0gc2NoZWR1bGVGbjtcbn1cblxuZnVuY3Rpb24gc2V0QXNhcChhc2FwRm4pIHtcbiAgYXNhcCA9IGFzYXBGbjtcbn1cblxudmFyIGJyb3dzZXJXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbnZhciBicm93c2VyR2xvYmFsID0gYnJvd3NlcldpbmRvdyB8fCB7fTtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG52YXIgaXNOb2RlID0gdHlwZW9mIHNlbGYgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cbi8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG52YXIgaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4vLyBub2RlXG5mdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vaXNzdWVzLzQxMCBmb3IgZGV0YWlsc1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgfTtcbn1cblxuLy8gdmVydHhcbmZ1bmN0aW9uIHVzZVZlcnR4VGltZXIoKSB7XG4gIGlmICh0eXBlb2YgdmVydHhOZXh0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2ZXJ0eE5leHQoZmx1c2gpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIG5vZGUuZGF0YSA9IGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyO1xuICB9O1xufVxuXG4vLyB3ZWIgd29ya2VyXG5mdW5jdGlvbiB1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgLy8gU3RvcmUgc2V0VGltZW91dCByZWZlcmVuY2Ugc28gZXM2LXByb21pc2Ugd2lsbCBiZSB1bmFmZmVjdGVkIGJ5XG4gIC8vIG90aGVyIGNvZGUgbW9kaWZ5aW5nIHNldFRpbWVvdXQgKGxpa2Ugc2lub24udXNlRmFrZVRpbWVycygpKVxuICB2YXIgZ2xvYmFsU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGdsb2JhbFNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICB9O1xufVxuXG52YXIgcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHZhciBjYWxsYmFjayA9IHF1ZXVlW2ldO1xuICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG5cbiAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gYXR0ZW1wdFZlcnR4KCkge1xuICB0cnkge1xuICAgIHZhciB2ZXJ0eCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCkucmVxdWlyZSgndmVydHgnKTtcbiAgICB2ZXJ0eE5leHQgPSB2ZXJ0eC5ydW5Pbkxvb3AgfHwgdmVydHgucnVuT25Db250ZXh0O1xuICAgIHJldHVybiB1c2VWZXJ0eFRpbWVyKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xuICB9XG59XG5cbnZhciBzY2hlZHVsZUZsdXNoID0gdm9pZCAwO1xuLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbmlmIChpc05vZGUpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG59IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG59IGVsc2UgaWYgKGlzV29ya2VyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNZXNzYWdlQ2hhbm5lbCgpO1xufSBlbHNlIGlmIChicm93c2VyV2luZG93ID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IGF0dGVtcHRWZXJ0eCgpO1xufSBlbHNlIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gdGhlbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgcGFyZW50ID0gdGhpcztcblxuICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihub29wKTtcblxuICBpZiAoY2hpbGRbUFJPTUlTRV9JRF0gPT09IHVuZGVmaW5lZCkge1xuICAgIG1ha2VQcm9taXNlKGNoaWxkKTtcbiAgfVxuXG4gIHZhciBfc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG5cbiAgaWYgKF9zdGF0ZSkge1xuICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tfc3RhdGUgLSAxXTtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBpbnZva2VDYWxsYmFjayhfc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcGFyZW50Ll9yZXN1bHQpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gIH1cblxuICByZXR1cm4gY2hpbGQ7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yZXNvbHZlYCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIHJlc29sdmVkIHdpdGggdGhlXG4gIHBhc3NlZCBgdmFsdWVgLiBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVzb2x2ZSgxKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoMSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZXNvbHZlXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBbnl9IHZhbHVlIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgZnVsZmlsbGVkIHdpdGggdGhlIGdpdmVuXG4gIGB2YWx1ZWBcbiovXG5mdW5jdGlvbiByZXNvbHZlJDEob2JqZWN0KSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuICByZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG52YXIgUFJPTUlTRV9JRCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnZhciBQRU5ESU5HID0gdm9pZCAwO1xudmFyIEZVTEZJTExFRCA9IDE7XG52YXIgUkVKRUNURUQgPSAyO1xuXG52YXIgVFJZX0NBVENIX0VSUk9SID0geyBlcnJvcjogbnVsbCB9O1xuXG5mdW5jdGlvbiBzZWxmRnVsZmlsbG1lbnQoKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbn1cblxuZnVuY3Rpb24gY2Fubm90UmV0dXJuT3duKCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xufVxuXG5mdW5jdGlvbiBnZXRUaGVuKHByb21pc2UpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgIHJldHVybiBUUllfQ0FUQ0hfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5VGhlbih0aGVuJCQxLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gIHRyeSB7XG4gICAgdGhlbiQkMS5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuJCQxKSB7XG4gIGFzYXAoZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgdmFyIGVycm9yID0gdHJ5VGhlbih0aGVuJCQxLCB0aGVuYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgaWYgKHNlYWxlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIH1cbiAgfSwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IEZVTEZJTExFRCkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSBpZiAodGhlbmFibGUuX3N0YXRlID09PSBSRUpFQ1RFRCkge1xuICAgIHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgfSBlbHNlIHtcbiAgICBzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbiQkMSkge1xuICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3RvciAmJiB0aGVuJCQxID09PSB0aGVuICYmIG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IucmVzb2x2ZSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoZW4kJDEgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgcmVqZWN0KHByb21pc2UsIFRSWV9DQVRDSF9FUlJPUi5lcnJvcik7XG4gICAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAodGhlbiQkMSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih0aGVuJCQxKSkge1xuICAgICAgaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBzZWxmRnVsZmlsbG1lbnQoKSk7XG4gIH0gZWxzZSBpZiAob2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlLCBnZXRUaGVuKHZhbHVlKSk7XG4gIH0gZWxzZSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICB9XG5cbiAgcHVibGlzaChwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgcHJvbWlzZS5fc3RhdGUgPSBGVUxGSUxMRUQ7XG5cbiAgaWYgKHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCAhPT0gMCkge1xuICAgIGFzYXAocHVibGlzaCwgcHJvbWlzZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBSRUpFQ1RFRDtcbiAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gIGFzYXAocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgX3N1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgdmFyIGxlbmd0aCA9IF9zdWJzY3JpYmVycy5sZW5ndGg7XG5cblxuICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gIF9zdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgX3N1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSA9IG9uUmVqZWN0aW9uO1xuXG4gIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgIGFzYXAocHVibGlzaCwgcGFyZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoKHByb21pc2UpIHtcbiAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBjaGlsZCA9IHZvaWQgMCxcbiAgICAgIGNhbGxiYWNrID0gdm9pZCAwLFxuICAgICAgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgaWYgKGNoaWxkKSB7XG4gICAgICBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgfVxuICB9XG5cbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbn1cblxuZnVuY3Rpb24gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICB0cnkge1xuICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICByZXR1cm4gVFJZX0NBVENIX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdmFyIGhhc0NhbGxiYWNrID0gaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICB2YWx1ZSA9IHZvaWQgMCxcbiAgICAgIGVycm9yID0gdm9pZCAwLFxuICAgICAgc3VjY2VlZGVkID0gdm9pZCAwLFxuICAgICAgZmFpbGVkID0gdm9pZCAwO1xuXG4gIGlmIChoYXNDYWxsYmFjaykge1xuICAgIHZhbHVlID0gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICBpZiAodmFsdWUgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICB2YWx1ZS5lcnJvciA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgLy8gbm9vcFxuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gIHRyeSB7XG4gICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBlKTtcbiAgfVxufVxuXG52YXIgaWQgPSAwO1xuZnVuY3Rpb24gbmV4dElkKCkge1xuICByZXR1cm4gaWQrKztcbn1cblxuZnVuY3Rpb24gbWFrZVByb21pc2UocHJvbWlzZSkge1xuICBwcm9taXNlW1BST01JU0VfSURdID0gaWQrKztcbiAgcHJvbWlzZS5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGlvbkVycm9yKCkge1xuICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbn1cblxudmFyIEVudW1lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0KSB7XG4gICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcblxuICAgIGlmICghdGhpcy5wcm9taXNlW1BST01JU0VfSURdKSB7XG4gICAgICBtYWtlUHJvbWlzZSh0aGlzLnByb21pc2UpO1xuICAgIH1cblxuICAgIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG5cbiAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgdGhpcy5fZW51bWVyYXRlKGlucHV0KTtcbiAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdCh0aGlzLnByb21pc2UsIHZhbGlkYXRpb25FcnJvcigpKTtcbiAgICB9XG4gIH1cblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24gX2VudW1lcmF0ZShpbnB1dCkge1xuICAgIGZvciAodmFyIGkgPSAwOyB0aGlzLl9zdGF0ZSA9PT0gUEVORElORyAmJiBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbiBfZWFjaEVudHJ5KGVudHJ5LCBpKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgIHZhciByZXNvbHZlJCQxID0gYy5yZXNvbHZlO1xuXG5cbiAgICBpZiAocmVzb2x2ZSQkMSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgICB2YXIgX3RoZW4gPSBnZXRUaGVuKGVudHJ5KTtcblxuICAgICAgaWYgKF90aGVuID09PSB0aGVuICYmIGVudHJ5Ll9zdGF0ZSAhPT0gUEVORElORykge1xuICAgICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIF90aGVuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gUHJvbWlzZSQxKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IGMobm9vcCk7XG4gICAgICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgZW50cnksIF90aGVuKTtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHByb21pc2UsIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KG5ldyBjKGZ1bmN0aW9uIChyZXNvbHZlJCQxKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUkJDEoZW50cnkpO1xuICAgICAgICB9KSwgaSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChyZXNvbHZlJCQxKGVudHJ5KSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbiBfc2V0dGxlZEF0KHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG5cbiAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbiBfd2lsbFNldHRsZUF0KHByb21pc2UsIGkpIHtcbiAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICBzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gRW51bWVyYXRvcjtcbn0oKTtcblxuLyoqXG4gIGBQcm9taXNlLmFsbGAgYWNjZXB0cyBhbiBhcnJheSBvZiBwcm9taXNlcywgYW5kIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaFxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSBvZiBmdWxmaWxsbWVudCB2YWx1ZXMgZm9yIHRoZSBwYXNzZWQgcHJvbWlzZXMsIG9yXG4gIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiBvZiB0aGUgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQuIEl0IGNhc3RzIGFsbFxuICBlbGVtZW50cyBvZiB0aGUgcGFzc2VkIGl0ZXJhYmxlIHRvIHByb21pc2VzIGFzIGl0IHJ1bnMgdGhpcyBhbGdvcml0aG0uXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlc29sdmUoMik7XG4gIGxldCBwcm9taXNlMyA9IHJlc29sdmUoMyk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgfSk7XG4gIGBgYFxuXG4gIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgbGV0IHByb21pc2UzID0gcmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICBsZXQgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gZW50cmllcyBhcnJheSBvZiBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBsYWJlbGluZyB0aGUgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLlxuICBAc3RhdGljXG4qL1xuZnVuY3Rpb24gYWxsKGVudHJpZXMpIHtcbiAgcmV0dXJuIG5ldyBFbnVtZXJhdG9yKHRoaXMsIGVudHJpZXMpLnByb21pc2U7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yYWNlYCByZXR1cm5zIGEgbmV3IHByb21pc2Ugd2hpY2ggaXMgc2V0dGxlZCBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlXG4gIGZpcnN0IHBhc3NlZCBwcm9taXNlIHRvIHNldHRsZS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDEnKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICBsZXQgcHJvbWlzZTIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMicpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHJlc3VsdCA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgLy8gd2FzIHJlc29sdmVkLlxuICB9KTtcbiAgYGBgXG5cbiAgYFByb21pc2UucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdFxuICBzZXR0bGVkIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlXG4gIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IHNldHRsZWQgcHJvbWlzZSBoYXNcbiAgYmVjb21lIHJlamVjdGVkIGJlZm9yZSB0aGUgb3RoZXIgcHJvbWlzZXMgYmVjYW1lIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gIHByb21pc2Ugd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcigncHJvbWlzZSAyJykpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdwcm9taXNlIDInIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQW4gZXhhbXBsZSByZWFsLXdvcmxkIHVzZSBjYXNlIGlzIGltcGxlbWVudGluZyB0aW1lb3V0czpcblxuICBgYGBqYXZhc2NyaXB0XG4gIFByb21pc2UucmFjZShbYWpheCgnZm9vLmpzb24nKSwgdGltZW91dCg1MDAwKV0pXG4gIGBgYFxuXG4gIEBtZXRob2QgcmFjZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIG9ic2VydmVcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2Ugd2hpY2ggc2V0dGxlcyBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlIGZpcnN0IHBhc3NlZFxuICBwcm9taXNlIHRvIHNldHRsZS5cbiovXG5mdW5jdGlvbiByYWNlKGVudHJpZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkoZW50cmllcykpIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkIGByZWFzb25gLlxuICBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZWplY3RcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlbiBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QkMShyZWFzb24pIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbmVlZHNSZXNvbHZlcigpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xufVxuXG5mdW5jdGlvbiBuZWVkc05ldygpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbn1cblxuLyoqXG4gIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gIFRlcm1pbm9sb2d5XG4gIC0tLS0tLS0tLS0tXG5cbiAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgQmFzaWMgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLVxuXG4gIGBgYGpzXG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgLy8gb24gc3VjY2Vzc1xuICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgLy8gb24gZmFpbHVyZVxuICAgIHJlamVjdChyZWFzb24pO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAvLyBvbiBmdWxmaWxsbWVudFxuICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAvLyBvbiByZWplY3Rpb25cbiAgfSk7XG4gIGBgYFxuXG4gIEFkdmFuY2VkIFVzYWdlOlxuICAtLS0tLS0tLS0tLS0tLS1cblxuICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICBsZXQgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICBgYGBqc1xuICBQcm9taXNlLmFsbChbXG4gICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9KTtcbiAgYGBgXG5cbiAgQGNsYXNzIFByb21pc2VcbiAgQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZXJcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAY29uc3RydWN0b3JcbiovXG5cbnZhciBQcm9taXNlJDEgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICB0aGlzW1BST01JU0VfSURdID0gbmV4dElkKCk7XG4gICAgdGhpcy5fcmVzdWx0ID0gdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgIGlmIChub29wICE9PSByZXNvbHZlcikge1xuICAgICAgdHlwZW9mIHJlc29sdmVyICE9PSAnZnVuY3Rpb24nICYmIG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgIHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlID8gaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpIDogbmVlZHNOZXcoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gIH0pO1xuICBgYGBcbiAgIENoYWluaW5nXG4gIC0tLS0tLS0tXG4gICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gIH0pO1xuICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgfSk7XG4gIGBgYFxuICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgQXNzaW1pbGF0aW9uXG4gIC0tLS0tLS0tLS0tLVxuICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gIH0pO1xuICBgYGBcbiAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgU2ltcGxlIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IHJlc3VsdDtcbiAgIHRyeSB7XG4gICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgIGlmIChlcnIpIHtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3VjY2Vzc1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuICAgUHJvbWlzZSBFeGFtcGxlO1xuICAgYGBgamF2YXNjcmlwdFxuICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyBmYWlsdXJlXG4gIH0pO1xuICBgYGBcbiAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IGF1dGhvciwgYm9va3M7XG4gICB0cnkge1xuICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG4gICB9XG4gICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuICAgfVxuICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgaWYgKGVycikge1xuICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICB9XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfVxuICB9KTtcbiAgYGBgXG4gICBQcm9taXNlIEV4YW1wbGU7XG4gICBgYGBqYXZhc2NyaXB0XG4gIGZpbmRBdXRob3IoKS5cbiAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgIC8vIGZvdW5kIGJvb2tzXG4gIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfSk7XG4gIGBgYFxuICAgQG1ldGhvZCB0aGVuXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG4gIC8qKlxuICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gIH1cbiAgLy8gc3luY2hyb25vdXNcbiAgdHJ5IHtcbiAgZmluZEF1dGhvcigpO1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9XG4gIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH0pO1xuICBgYGBcbiAgQG1ldGhvZCBjYXRjaFxuICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cblxuICBQcm9taXNlLnByb3RvdHlwZS5jYXRjaCA9IGZ1bmN0aW9uIF9jYXRjaChvblJlamVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICB9O1xuXG4gIC8qKlxuICAgIGBmaW5hbGx5YCB3aWxsIGJlIGludm9rZWQgcmVnYXJkbGVzcyBvZiB0aGUgcHJvbWlzZSdzIGZhdGUganVzdCBhcyBuYXRpdmVcbiAgICB0cnkvY2F0Y2gvZmluYWxseSBiZWhhdmVzXG4gIFxuICAgIFN5bmNocm9ub3VzIGV4YW1wbGU6XG4gIFxuICAgIGBgYGpzXG4gICAgZmluZEF1dGhvcigpIHtcbiAgICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBBdXRob3IoKTtcbiAgICB9XG4gIFxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZmluZEF1dGhvcigpOyAvLyBzdWNjZWVkIG9yIGZhaWxcbiAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICByZXR1cm4gZmluZE90aGVyQXV0aGVyKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIGFsd2F5cyBydW5zXG4gICAgICAvLyBkb2Vzbid0IGFmZmVjdCB0aGUgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAgIGBgYFxuICBcbiAgICBBc3luY2hyb25vdXMgZXhhbXBsZTpcbiAgXG4gICAgYGBganNcbiAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgIHJldHVybiBmaW5kT3RoZXJBdXRoZXIoKTtcbiAgICB9KS5maW5hbGx5KGZ1bmN0aW9uKCl7XG4gICAgICAvLyBhdXRob3Igd2FzIGVpdGhlciBmb3VuZCwgb3Igbm90XG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIEBtZXRob2QgZmluYWxseVxuICAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuXG4gIFByb21pc2UucHJvdG90eXBlLmZpbmFsbHkgPSBmdW5jdGlvbiBfZmluYWxseShjYWxsYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm9taXNlLmNvbnN0cnVjdG9yO1xuXG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBjb25zdHJ1Y3Rvci5yZXNvbHZlKGNhbGxiYWNrKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhyb3cgcmVhc29uO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIFByb21pc2U7XG59KCk7XG5cblByb21pc2UkMS5wcm90b3R5cGUudGhlbiA9IHRoZW47XG5Qcm9taXNlJDEuYWxsID0gYWxsO1xuUHJvbWlzZSQxLnJhY2UgPSByYWNlO1xuUHJvbWlzZSQxLnJlc29sdmUgPSByZXNvbHZlJDE7XG5Qcm9taXNlJDEucmVqZWN0ID0gcmVqZWN0JDE7XG5Qcm9taXNlJDEuX3NldFNjaGVkdWxlciA9IHNldFNjaGVkdWxlcjtcblByb21pc2UkMS5fc2V0QXNhcCA9IHNldEFzYXA7XG5Qcm9taXNlJDEuX2FzYXAgPSBhc2FwO1xuXG4vKmdsb2JhbCBzZWxmKi9cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICB2YXIgbG9jYWwgPSB2b2lkIDA7XG5cbiAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9jYWwgPSBnbG9iYWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9jYWwgPSBzZWxmO1xuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBsb2NhbCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdwb2x5ZmlsbCBmYWlsZWQgYmVjYXVzZSBnbG9iYWwgb2JqZWN0IGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnQnKTtcbiAgICB9XG4gIH1cblxuICB2YXIgUCA9IGxvY2FsLlByb21pc2U7XG5cbiAgaWYgKFApIHtcbiAgICB2YXIgcHJvbWlzZVRvU3RyaW5nID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgcHJvbWlzZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFAucmVzb2x2ZSgpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBzaWxlbnRseSBpZ25vcmVkXG4gICAgfVxuXG4gICAgaWYgKHByb21pc2VUb1N0cmluZyA9PT0gJ1tvYmplY3QgUHJvbWlzZV0nICYmICFQLmNhc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBsb2NhbC5Qcm9taXNlID0gUHJvbWlzZSQxO1xufVxuXG4vLyBTdHJhbmdlIGNvbXBhdC4uXG5Qcm9taXNlJDEucG9seWZpbGwgPSBwb2x5ZmlsbDtcblByb21pc2UkMS5Qcm9taXNlID0gUHJvbWlzZSQxO1xuXG5yZXR1cm4gUHJvbWlzZSQxO1xuXG59KSkpO1xuXG5cblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXM2LXByb21pc2UubWFwXG4iLCIvKipcbiAqIGxvZGFzaCAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IGpRdWVyeSBGb3VuZGF0aW9uIGFuZCBvdGhlciBjb250cmlidXRvcnMgPGh0dHBzOi8vanF1ZXJ5Lm9yZy8+XG4gKiBSZWxlYXNlZCB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKi9cblxuLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cbnZhciBGVU5DX0VSUk9SX1RFWFQgPSAnRXhwZWN0ZWQgYSBmdW5jdGlvbic7XG5cbi8qKiBVc2VkIGFzIHJlZmVyZW5jZXMgZm9yIHZhcmlvdXMgYE51bWJlcmAgY29uc3RhbnRzLiAqL1xudmFyIE5BTiA9IDAgLyAwO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgc3ltYm9sVGFnID0gJ1tvYmplY3QgU3ltYm9sXSc7XG5cbi8qKiBVc2VkIHRvIG1hdGNoIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHdoaXRlc3BhY2UuICovXG52YXIgcmVUcmltID0gL15cXHMrfFxccyskL2c7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBiYWQgc2lnbmVkIGhleGFkZWNpbWFsIHN0cmluZyB2YWx1ZXMuICovXG52YXIgcmVJc0JhZEhleCA9IC9eWy0rXTB4WzAtOWEtZl0rJC9pO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgYmluYXJ5IHN0cmluZyB2YWx1ZXMuICovXG52YXIgcmVJc0JpbmFyeSA9IC9eMGJbMDFdKyQvaTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IG9jdGFsIHN0cmluZyB2YWx1ZXMuICovXG52YXIgcmVJc09jdGFsID0gL14wb1swLTddKyQvaTtcblxuLyoqIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIHdpdGhvdXQgYSBkZXBlbmRlbmN5IG9uIGByb290YC4gKi9cbnZhciBmcmVlUGFyc2VJbnQgPSBwYXJzZUludDtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBnbG9iYWxgIGZyb20gTm9kZS5qcy4gKi9cbnZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWwgJiYgZ2xvYmFsLk9iamVjdCA9PT0gT2JqZWN0ICYmIGdsb2JhbDtcblxuLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBzZWxmYC4gKi9cbnZhciBmcmVlU2VsZiA9IHR5cGVvZiBzZWxmID09ICdvYmplY3QnICYmIHNlbGYgJiYgc2VsZi5PYmplY3QgPT09IE9iamVjdCAmJiBzZWxmO1xuXG4vKiogVXNlZCBhcyBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsIG9iamVjdC4gKi9cbnZhciByb290ID0gZnJlZUdsb2JhbCB8fCBmcmVlU2VsZiB8fCBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXG4vKiogVXNlZCBmb3IgYnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGVcbiAqIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogb2YgdmFsdWVzLlxuICovXG52YXIgb2JqZWN0VG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyogQnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xudmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4LFxuICAgIG5hdGl2ZU1pbiA9IE1hdGgubWluO1xuXG4vKipcbiAqIEdldHMgdGhlIHRpbWVzdGFtcCBvZiB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZVxuICogdGhlIFVuaXggZXBvY2ggKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAyLjQuMFxuICogQGNhdGVnb3J5IERhdGVcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIHRpbWVzdGFtcC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xuICogICBjb25zb2xlLmxvZyhfLm5vdygpIC0gc3RhbXApO1xuICogfSwgXy5ub3coKSk7XG4gKiAvLyA9PiBMb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBpbnZvY2F0aW9uLlxuICovXG52YXIgbm93ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiByb290LkRhdGUubm93KCk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxuICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXG4gKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXG4gKiBkZWxheWVkIGBmdW5jYCBpbnZvY2F0aW9ucyBhbmQgYSBgZmx1c2hgIG1ldGhvZCB0byBpbW1lZGlhdGVseSBpbnZva2UgdGhlbS5cbiAqIFByb3ZpZGUgYG9wdGlvbnNgIHRvIGluZGljYXRlIHdoZXRoZXIgYGZ1bmNgIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZVxuICogbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuIFRoZSBgZnVuY2AgaXMgaW52b2tlZFxuICogd2l0aCB0aGUgbGFzdCBhcmd1bWVudHMgcHJvdmlkZWQgdG8gdGhlIGRlYm91bmNlZCBmdW5jdGlvbi4gU3Vic2VxdWVudFxuICogY2FsbHMgdG8gdGhlIGRlYm91bmNlZCBmdW5jdGlvbiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBgZnVuY2BcbiAqIGludm9jYXRpb24uXG4gKlxuICogKipOb3RlOioqIElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAsIGBmdW5jYCBpc1xuICogaW52b2tlZCBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb25cbiAqIGlzIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAqXG4gKiBJZiBgd2FpdGAgaXMgYDBgIGFuZCBgbGVhZGluZ2AgaXMgYGZhbHNlYCwgYGZ1bmNgIGludm9jYXRpb24gaXMgZGVmZXJyZWRcbiAqIHVudGlsIHRvIHRoZSBuZXh0IHRpY2ssIHNpbWlsYXIgdG8gYHNldFRpbWVvdXRgIHdpdGggYSB0aW1lb3V0IG9mIGAwYC5cbiAqXG4gKiBTZWUgW0RhdmlkIENvcmJhY2hvJ3MgYXJ0aWNsZV0oaHR0cHM6Ly9jc3MtdHJpY2tzLmNvbS9kZWJvdW5jaW5nLXRocm90dGxpbmctZXhwbGFpbmVkLWV4YW1wbGVzLylcbiAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXVxuICogIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XVxuICogIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmUgZGVsYXllZCBiZWZvcmUgaXQncyBpbnZva2VkLlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXVxuICogIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIEF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXguXG4gKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xuICpcbiAqIC8vIEludm9rZSBgc2VuZE1haWxgIHdoZW4gY2xpY2tlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzLlxuICogalF1ZXJ5KGVsZW1lbnQpLm9uKCdjbGljaycsIF8uZGVib3VuY2Uoc2VuZE1haWwsIDMwMCwge1xuICogICAnbGVhZGluZyc6IHRydWUsXG4gKiAgICd0cmFpbGluZyc6IGZhbHNlXG4gKiB9KSk7XG4gKlxuICogLy8gRW5zdXJlIGBiYXRjaExvZ2AgaXMgaW52b2tlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxscy5cbiAqIHZhciBkZWJvdW5jZWQgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHsgJ21heFdhaXQnOiAxMDAwIH0pO1xuICogdmFyIHNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZSgnL3N0cmVhbScpO1xuICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBkZWJvdW5jZWQpO1xuICpcbiAqIC8vIENhbmNlbCB0aGUgdHJhaWxpbmcgZGVib3VuY2VkIGludm9jYXRpb24uXG4gKiBqUXVlcnkod2luZG93KS5vbigncG9wc3RhdGUnLCBkZWJvdW5jZWQuY2FuY2VsKTtcbiAqL1xuZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICB2YXIgbGFzdEFyZ3MsXG4gICAgICBsYXN0VGhpcyxcbiAgICAgIG1heFdhaXQsXG4gICAgICByZXN1bHQsXG4gICAgICB0aW1lcklkLFxuICAgICAgbGFzdENhbGxUaW1lLFxuICAgICAgbGFzdEludm9rZVRpbWUgPSAwLFxuICAgICAgbGVhZGluZyA9IGZhbHNlLFxuICAgICAgbWF4aW5nID0gZmFsc2UsXG4gICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XG4gIH1cbiAgd2FpdCA9IHRvTnVtYmVyKHdhaXQpIHx8IDA7XG4gIGlmIChpc09iamVjdChvcHRpb25zKSkge1xuICAgIGxlYWRpbmcgPSAhIW9wdGlvbnMubGVhZGluZztcbiAgICBtYXhpbmcgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucztcbiAgICBtYXhXYWl0ID0gbWF4aW5nID8gbmF0aXZlTWF4KHRvTnVtYmVyKG9wdGlvbnMubWF4V2FpdCkgfHwgMCwgd2FpdCkgOiBtYXhXYWl0O1xuICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XG4gIH1cblxuICBmdW5jdGlvbiBpbnZva2VGdW5jKHRpbWUpIHtcbiAgICB2YXIgYXJncyA9IGxhc3RBcmdzLFxuICAgICAgICB0aGlzQXJnID0gbGFzdFRoaXM7XG5cbiAgICBsYXN0QXJncyA9IGxhc3RUaGlzID0gdW5kZWZpbmVkO1xuICAgIGxhc3RJbnZva2VUaW1lID0gdGltZTtcbiAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBsZWFkaW5nRWRnZSh0aW1lKSB7XG4gICAgLy8gUmVzZXQgYW55IGBtYXhXYWl0YCB0aW1lci5cbiAgICBsYXN0SW52b2tlVGltZSA9IHRpbWU7XG4gICAgLy8gU3RhcnQgdGhlIHRpbWVyIGZvciB0aGUgdHJhaWxpbmcgZWRnZS5cbiAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHdhaXQpO1xuICAgIC8vIEludm9rZSB0aGUgbGVhZGluZyBlZGdlLlxuICAgIHJldHVybiBsZWFkaW5nID8gaW52b2tlRnVuYyh0aW1lKSA6IHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbWFpbmluZ1dhaXQodGltZSkge1xuICAgIHZhciB0aW1lU2luY2VMYXN0Q2FsbCA9IHRpbWUgLSBsYXN0Q2FsbFRpbWUsXG4gICAgICAgIHRpbWVTaW5jZUxhc3RJbnZva2UgPSB0aW1lIC0gbGFzdEludm9rZVRpbWUsXG4gICAgICAgIHJlc3VsdCA9IHdhaXQgLSB0aW1lU2luY2VMYXN0Q2FsbDtcblxuICAgIHJldHVybiBtYXhpbmcgPyBuYXRpdmVNaW4ocmVzdWx0LCBtYXhXYWl0IC0gdGltZVNpbmNlTGFzdEludm9rZSkgOiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBzaG91bGRJbnZva2UodGltZSkge1xuICAgIHZhciB0aW1lU2luY2VMYXN0Q2FsbCA9IHRpbWUgLSBsYXN0Q2FsbFRpbWUsXG4gICAgICAgIHRpbWVTaW5jZUxhc3RJbnZva2UgPSB0aW1lIC0gbGFzdEludm9rZVRpbWU7XG5cbiAgICAvLyBFaXRoZXIgdGhpcyBpcyB0aGUgZmlyc3QgY2FsbCwgYWN0aXZpdHkgaGFzIHN0b3BwZWQgYW5kIHdlJ3JlIGF0IHRoZVxuICAgIC8vIHRyYWlsaW5nIGVkZ2UsIHRoZSBzeXN0ZW0gdGltZSBoYXMgZ29uZSBiYWNrd2FyZHMgYW5kIHdlJ3JlIHRyZWF0aW5nXG4gICAgLy8gaXQgYXMgdGhlIHRyYWlsaW5nIGVkZ2UsIG9yIHdlJ3ZlIGhpdCB0aGUgYG1heFdhaXRgIGxpbWl0LlxuICAgIHJldHVybiAobGFzdENhbGxUaW1lID09PSB1bmRlZmluZWQgfHwgKHRpbWVTaW5jZUxhc3RDYWxsID49IHdhaXQpIHx8XG4gICAgICAodGltZVNpbmNlTGFzdENhbGwgPCAwKSB8fCAobWF4aW5nICYmIHRpbWVTaW5jZUxhc3RJbnZva2UgPj0gbWF4V2FpdCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGltZXJFeHBpcmVkKCkge1xuICAgIHZhciB0aW1lID0gbm93KCk7XG4gICAgaWYgKHNob3VsZEludm9rZSh0aW1lKSkge1xuICAgICAgcmV0dXJuIHRyYWlsaW5nRWRnZSh0aW1lKTtcbiAgICB9XG4gICAgLy8gUmVzdGFydCB0aGUgdGltZXIuXG4gICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCByZW1haW5pbmdXYWl0KHRpbWUpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYWlsaW5nRWRnZSh0aW1lKSB7XG4gICAgdGltZXJJZCA9IHVuZGVmaW5lZDtcblxuICAgIC8vIE9ubHkgaW52b2tlIGlmIHdlIGhhdmUgYGxhc3RBcmdzYCB3aGljaCBtZWFucyBgZnVuY2AgaGFzIGJlZW5cbiAgICAvLyBkZWJvdW5jZWQgYXQgbGVhc3Qgb25jZS5cbiAgICBpZiAodHJhaWxpbmcgJiYgbGFzdEFyZ3MpIHtcbiAgICAgIHJldHVybiBpbnZva2VGdW5jKHRpbWUpO1xuICAgIH1cbiAgICBsYXN0QXJncyA9IGxhc3RUaGlzID0gdW5kZWZpbmVkO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5jZWwoKSB7XG4gICAgaWYgKHRpbWVySWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVySWQpO1xuICAgIH1cbiAgICBsYXN0SW52b2tlVGltZSA9IDA7XG4gICAgbGFzdEFyZ3MgPSBsYXN0Q2FsbFRpbWUgPSBsYXN0VGhpcyA9IHRpbWVySWQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBmbHVzaCgpIHtcbiAgICByZXR1cm4gdGltZXJJZCA9PT0gdW5kZWZpbmVkID8gcmVzdWx0IDogdHJhaWxpbmdFZGdlKG5vdygpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlYm91bmNlZCgpIHtcbiAgICB2YXIgdGltZSA9IG5vdygpLFxuICAgICAgICBpc0ludm9raW5nID0gc2hvdWxkSW52b2tlKHRpbWUpO1xuXG4gICAgbGFzdEFyZ3MgPSBhcmd1bWVudHM7XG4gICAgbGFzdFRoaXMgPSB0aGlzO1xuICAgIGxhc3RDYWxsVGltZSA9IHRpbWU7XG5cbiAgICBpZiAoaXNJbnZva2luZykge1xuICAgICAgaWYgKHRpbWVySWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbGVhZGluZ0VkZ2UobGFzdENhbGxUaW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXhpbmcpIHtcbiAgICAgICAgLy8gSGFuZGxlIGludm9jYXRpb25zIGluIGEgdGlnaHQgbG9vcC5cbiAgICAgICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0KTtcbiAgICAgICAgcmV0dXJuIGludm9rZUZ1bmMobGFzdENhbGxUaW1lKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRpbWVySWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xuICBkZWJvdW5jZWQuZmx1c2ggPSBmbHVzaDtcbiAgcmV0dXJuIGRlYm91bmNlZDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgdGhyb3R0bGVkIGZ1bmN0aW9uIHRoYXQgb25seSBpbnZva2VzIGBmdW5jYCBhdCBtb3N0IG9uY2UgcGVyXG4gKiBldmVyeSBgd2FpdGAgbWlsbGlzZWNvbmRzLiBUaGUgdGhyb3R0bGVkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYFxuICogbWV0aG9kIHRvIGNhbmNlbCBkZWxheWVkIGBmdW5jYCBpbnZvY2F0aW9ucyBhbmQgYSBgZmx1c2hgIG1ldGhvZCB0b1xuICogaW1tZWRpYXRlbHkgaW52b2tlIHRoZW0uIFByb3ZpZGUgYG9wdGlvbnNgIHRvIGluZGljYXRlIHdoZXRoZXIgYGZ1bmNgXG4gKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgXG4gKiB0aW1lb3V0LiBUaGUgYGZ1bmNgIGlzIGludm9rZWQgd2l0aCB0aGUgbGFzdCBhcmd1bWVudHMgcHJvdmlkZWQgdG8gdGhlXG4gKiB0aHJvdHRsZWQgZnVuY3Rpb24uIFN1YnNlcXVlbnQgY2FsbHMgdG8gdGhlIHRocm90dGxlZCBmdW5jdGlvbiByZXR1cm4gdGhlXG4gKiByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgIGludm9jYXRpb24uXG4gKlxuICogKipOb3RlOioqIElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAsIGBmdW5jYCBpc1xuICogaW52b2tlZCBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb25cbiAqIGlzIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAqXG4gKiBJZiBgd2FpdGAgaXMgYDBgIGFuZCBgbGVhZGluZ2AgaXMgYGZhbHNlYCwgYGZ1bmNgIGludm9jYXRpb24gaXMgZGVmZXJyZWRcbiAqIHVudGlsIHRvIHRoZSBuZXh0IHRpY2ssIHNpbWlsYXIgdG8gYHNldFRpbWVvdXRgIHdpdGggYSB0aW1lb3V0IG9mIGAwYC5cbiAqXG4gKiBTZWUgW0RhdmlkIENvcmJhY2hvJ3MgYXJ0aWNsZV0oaHR0cHM6Ly9jc3MtdHJpY2tzLmNvbS9kZWJvdW5jaW5nLXRocm90dGxpbmctZXhwbGFpbmVkLWV4YW1wbGVzLylcbiAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8udGhyb3R0bGVgIGFuZCBgXy5kZWJvdW5jZWAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byB0aHJvdHRsZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byB0aHJvdHRsZSBpbnZvY2F0aW9ucyB0by5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPXRydWVdXG4gKiAgU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXVxuICogIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyB0aHJvdHRsZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIEF2b2lkIGV4Y2Vzc2l2ZWx5IHVwZGF0aW5nIHRoZSBwb3NpdGlvbiB3aGlsZSBzY3JvbGxpbmcuXG4gKiBqUXVlcnkod2luZG93KS5vbignc2Nyb2xsJywgXy50aHJvdHRsZSh1cGRhdGVQb3NpdGlvbiwgMTAwKSk7XG4gKlxuICogLy8gSW52b2tlIGByZW5ld1Rva2VuYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgYnV0IG5vdCBtb3JlIHRoYW4gb25jZSBldmVyeSA1IG1pbnV0ZXMuXG4gKiB2YXIgdGhyb3R0bGVkID0gXy50aHJvdHRsZShyZW5ld1Rva2VuLCAzMDAwMDAsIHsgJ3RyYWlsaW5nJzogZmFsc2UgfSk7XG4gKiBqUXVlcnkoZWxlbWVudCkub24oJ2NsaWNrJywgdGhyb3R0bGVkKTtcbiAqXG4gKiAvLyBDYW5jZWwgdGhlIHRyYWlsaW5nIHRocm90dGxlZCBpbnZvY2F0aW9uLlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3BvcHN0YXRlJywgdGhyb3R0bGVkLmNhbmNlbCk7XG4gKi9cbmZ1bmN0aW9uIHRocm90dGxlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGxlYWRpbmcgPSB0cnVlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIGlmIChpc09iamVjdChvcHRpb25zKSkge1xuICAgIGxlYWRpbmcgPSAnbGVhZGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy5sZWFkaW5nIDogbGVhZGluZztcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICB9XG4gIHJldHVybiBkZWJvdW5jZShmdW5jLCB3YWl0LCB7XG4gICAgJ2xlYWRpbmcnOiBsZWFkaW5nLFxuICAgICdtYXhXYWl0Jzogd2FpdCxcbiAgICAndHJhaWxpbmcnOiB0cmFpbGluZ1xuICB9KTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGVcbiAqIFtsYW5ndWFnZSB0eXBlXShodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtZWNtYXNjcmlwdC1sYW5ndWFnZS10eXBlcylcbiAqIG9mIGBPYmplY3RgLiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDAuMS4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdCh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoXy5ub29wKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuIEEgdmFsdWUgaXMgb2JqZWN0LWxpa2UgaWYgaXQncyBub3QgYG51bGxgXG4gKiBhbmQgaGFzIGEgYHR5cGVvZmAgcmVzdWx0IG9mIFwib2JqZWN0XCIuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdExpa2Uoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc09iamVjdExpa2UobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYSBgU3ltYm9sYCBwcmltaXRpdmUgb3Igb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgc3ltYm9sLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNTeW1ib2woU3ltYm9sLml0ZXJhdG9yKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzU3ltYm9sKCdhYmMnKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3ltYm9sKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ3N5bWJvbCcgfHxcbiAgICAoaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBzeW1ib2xUYWcpO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBudW1iZXIuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSBudW1iZXIuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8udG9OdW1iZXIoMy4yKTtcbiAqIC8vID0+IDMuMlxuICpcbiAqIF8udG9OdW1iZXIoTnVtYmVyLk1JTl9WQUxVRSk7XG4gKiAvLyA9PiA1ZS0zMjRcbiAqXG4gKiBfLnRvTnVtYmVyKEluZmluaXR5KTtcbiAqIC8vID0+IEluZmluaXR5XG4gKlxuICogXy50b051bWJlcignMy4yJyk7XG4gKiAvLyA9PiAzLjJcbiAqL1xuZnVuY3Rpb24gdG9OdW1iZXIodmFsdWUpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAoaXNTeW1ib2wodmFsdWUpKSB7XG4gICAgcmV0dXJuIE5BTjtcbiAgfVxuICBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgdmFyIG90aGVyID0gdHlwZW9mIHZhbHVlLnZhbHVlT2YgPT0gJ2Z1bmN0aW9uJyA/IHZhbHVlLnZhbHVlT2YoKSA6IHZhbHVlO1xuICAgIHZhbHVlID0gaXNPYmplY3Qob3RoZXIpID8gKG90aGVyICsgJycpIDogb3RoZXI7XG4gIH1cbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gMCA/IHZhbHVlIDogK3ZhbHVlO1xuICB9XG4gIHZhbHVlID0gdmFsdWUucmVwbGFjZShyZVRyaW0sICcnKTtcbiAgdmFyIGlzQmluYXJ5ID0gcmVJc0JpbmFyeS50ZXN0KHZhbHVlKTtcbiAgcmV0dXJuIChpc0JpbmFyeSB8fCByZUlzT2N0YWwudGVzdCh2YWx1ZSkpXG4gICAgPyBmcmVlUGFyc2VJbnQodmFsdWUuc2xpY2UoMiksIGlzQmluYXJ5ID8gMiA6IDgpXG4gICAgOiAocmVJc0JhZEhleC50ZXN0KHZhbHVlKSA/IE5BTiA6ICt2YWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGhyb3R0bGU7XG4iLCJ2YXIgd2lsZGNhcmQgPSByZXF1aXJlKCd3aWxkY2FyZCcpO1xudmFyIHJlTWltZVBhcnRTcGxpdCA9IC9bXFwvXFwrXFwuXS87XG5cbi8qKlxuICAjIG1pbWUtbWF0Y2hcblxuICBBIHNpbXBsZSBmdW5jdGlvbiB0byBjaGVja2VyIHdoZXRoZXIgYSB0YXJnZXQgbWltZSB0eXBlIG1hdGNoZXMgYSBtaW1lLXR5cGVcbiAgcGF0dGVybiAoZS5nLiBpbWFnZS9qcGVnIG1hdGNoZXMgaW1hZ2UvanBlZyBPUiBpbWFnZS8qKS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGUuanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgcGF0dGVybikge1xuICBmdW5jdGlvbiB0ZXN0KHBhdHRlcm4pIHtcbiAgICB2YXIgcmVzdWx0ID0gd2lsZGNhcmQocGF0dGVybiwgdGFyZ2V0LCByZU1pbWVQYXJ0U3BsaXQpO1xuXG4gICAgLy8gZW5zdXJlIHRoYXQgd2UgaGF2ZSBhIHZhbGlkIG1pbWUgdHlwZSAoc2hvdWxkIGhhdmUgdHdvIHBhcnRzKVxuICAgIHJldHVybiByZXN1bHQgJiYgcmVzdWx0Lmxlbmd0aCA+PSAyO1xuICB9XG5cbiAgcmV0dXJuIHBhdHRlcm4gPyB0ZXN0KHBhdHRlcm4uc3BsaXQoJzsnKVswXSkgOiB0ZXN0O1xufTtcbiIsIi8qKlxuKiBDcmVhdGUgYW4gZXZlbnQgZW1pdHRlciB3aXRoIG5hbWVzcGFjZXNcbiogQG5hbWUgY3JlYXRlTmFtZXNwYWNlRW1pdHRlclxuKiBAZXhhbXBsZVxuKiB2YXIgZW1pdHRlciA9IHJlcXVpcmUoJy4vaW5kZXgnKSgpXG4qXG4qIGVtaXR0ZXIub24oJyonLCBmdW5jdGlvbiAoKSB7XG4qICAgY29uc29sZS5sb2coJ2FsbCBldmVudHMgZW1pdHRlZCcsIHRoaXMuZXZlbnQpXG4qIH0pXG4qXG4qIGVtaXR0ZXIub24oJ2V4YW1wbGUnLCBmdW5jdGlvbiAoKSB7XG4qICAgY29uc29sZS5sb2coJ2V4YW1wbGUgZXZlbnQgZW1pdHRlZCcpXG4qIH0pXG4qL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjcmVhdGVOYW1lc3BhY2VFbWl0dGVyICgpIHtcbiAgdmFyIGVtaXR0ZXIgPSB7fVxuICB2YXIgX2ZucyA9IGVtaXR0ZXIuX2ZucyA9IHt9XG5cbiAgLyoqXG4gICogRW1pdCBhbiBldmVudC4gT3B0aW9uYWxseSBuYW1lc3BhY2UgdGhlIGV2ZW50LiBIYW5kbGVycyBhcmUgZmlyZWQgaW4gdGhlIG9yZGVyIGluIHdoaWNoIHRoZXkgd2VyZSBhZGRlZCB3aXRoIGV4YWN0IG1hdGNoZXMgdGFraW5nIHByZWNlZGVuY2UuIFNlcGFyYXRlIHRoZSBuYW1lc3BhY2UgYW5kIGV2ZW50IHdpdGggYSBgOmBcbiAgKiBAbmFtZSBlbWl0XG4gICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IOKAkyB0aGUgbmFtZSBvZiB0aGUgZXZlbnQsIHdpdGggb3B0aW9uYWwgbmFtZXNwYWNlXG4gICogQHBhcmFtIHsuLi4qfSBkYXRhIOKAkyB1cCB0byA2IGFyZ3VtZW50cyB0aGF0IGFyZSBwYXNzZWQgdG8gdGhlIGV2ZW50IGxpc3RlbmVyXG4gICogQGV4YW1wbGVcbiAgKiBlbWl0dGVyLmVtaXQoJ2V4YW1wbGUnKVxuICAqIGVtaXR0ZXIuZW1pdCgnZGVtbzp0ZXN0JylcbiAgKiBlbWl0dGVyLmVtaXQoJ2RhdGEnLCB7IGV4YW1wbGU6IHRydWV9LCAnYSBzdHJpbmcnLCAxKVxuICAqL1xuICBlbWl0dGVyLmVtaXQgPSBmdW5jdGlvbiBlbWl0IChldmVudCwgYXJnMSwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNikge1xuICAgIHZhciB0b0VtaXQgPSBnZXRMaXN0ZW5lcnMoZXZlbnQpXG5cbiAgICBpZiAodG9FbWl0Lmxlbmd0aCkge1xuICAgICAgZW1pdEFsbChldmVudCwgdG9FbWl0LCBbYXJnMSwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNl0pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ3JlYXRlIGVuIGV2ZW50IGxpc3RlbmVyLlxuICAqIEBuYW1lIG9uXG4gICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgKiBAZXhhbXBsZVxuICAqIGVtaXR0ZXIub24oJ2V4YW1wbGUnLCBmdW5jdGlvbiAoKSB7fSlcbiAgKiBlbWl0dGVyLm9uKCdkZW1vJywgZnVuY3Rpb24gKCkge30pXG4gICovXG4gIGVtaXR0ZXIub24gPSBmdW5jdGlvbiBvbiAoZXZlbnQsIGZuKSB7XG4gICAgaWYgKCFfZm5zW2V2ZW50XSkge1xuICAgICAgX2Zuc1tldmVudF0gPSBbXVxuICAgIH1cblxuICAgIF9mbnNbZXZlbnRdLnB1c2goZm4pXG4gIH1cblxuICAvKipcbiAgKiBDcmVhdGUgZW4gZXZlbnQgbGlzdGVuZXIgdGhhdCBmaXJlcyBvbmNlLlxuICAqIEBuYW1lIG9uY2VcbiAgKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAqIEBleGFtcGxlXG4gICogZW1pdHRlci5vbmNlKCdleGFtcGxlJywgZnVuY3Rpb24gKCkge30pXG4gICogZW1pdHRlci5vbmNlKCdkZW1vJywgZnVuY3Rpb24gKCkge30pXG4gICovXG4gIGVtaXR0ZXIub25jZSA9IGZ1bmN0aW9uIG9uY2UgKGV2ZW50LCBmbikge1xuICAgIGZ1bmN0aW9uIG9uZSAoKSB7XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICBlbWl0dGVyLm9mZihldmVudCwgb25lKVxuICAgIH1cbiAgICB0aGlzLm9uKGV2ZW50LCBvbmUpXG4gIH1cblxuICAvKipcbiAgKiBTdG9wIGxpc3RlbmluZyB0byBhbiBldmVudC4gU3RvcCBhbGwgbGlzdGVuZXJzIG9uIGFuIGV2ZW50IGJ5IG9ubHkgcGFzc2luZyB0aGUgZXZlbnQgbmFtZS4gU3RvcCBhIHNpbmdsZSBsaXN0ZW5lciBieSBwYXNzaW5nIHRoYXQgZXZlbnQgaGFuZGxlciBhcyBhIGNhbGxiYWNrLlxuICAqIFlvdSBtdXN0IGJlIGV4cGxpY2l0IGFib3V0IHdoYXQgd2lsbCBiZSB1bnN1YnNjcmliZWQ6IGBlbWl0dGVyLm9mZignZGVtbycpYCB3aWxsIHVuc3Vic2NyaWJlIGFuIGBlbWl0dGVyLm9uKCdkZW1vJylgIGxpc3RlbmVyLFxuICAqIGBlbWl0dGVyLm9mZignZGVtbzpleGFtcGxlJylgIHdpbGwgdW5zdWJzY3JpYmUgYW4gYGVtaXR0ZXIub24oJ2RlbW86ZXhhbXBsZScpYCBsaXN0ZW5lclxuICAqIEBuYW1lIG9mZlxuICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl0g4oCTIHRoZSBzcGVjaWZpYyBoYW5kbGVyXG4gICogQGV4YW1wbGVcbiAgKiBlbWl0dGVyLm9mZignZXhhbXBsZScpXG4gICogZW1pdHRlci5vZmYoJ2RlbW8nLCBmdW5jdGlvbiAoKSB7fSlcbiAgKi9cbiAgZW1pdHRlci5vZmYgPSBmdW5jdGlvbiBvZmYgKGV2ZW50LCBmbikge1xuICAgIHZhciBrZWVwID0gW11cblxuICAgIGlmIChldmVudCAmJiBmbikge1xuICAgICAgdmFyIGZucyA9IHRoaXMuX2Zuc1tldmVudF1cbiAgICAgIHZhciBpID0gMFxuICAgICAgdmFyIGwgPSBmbnMubGVuZ3RoXG5cbiAgICAgIGZvciAoaTsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZiAoZm5zW2ldICE9PSBmbikge1xuICAgICAgICAgIGtlZXAucHVzaChmbnNbaV0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBrZWVwLmxlbmd0aCA/IHRoaXMuX2Zuc1tldmVudF0gPSBrZWVwIDogZGVsZXRlIHRoaXMuX2Zuc1tldmVudF1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldExpc3RlbmVycyAoZSkge1xuICAgIHZhciBvdXQgPSBfZm5zW2VdID8gX2Zuc1tlXSA6IFtdXG4gICAgdmFyIGlkeCA9IGUuaW5kZXhPZignOicpXG4gICAgdmFyIGFyZ3MgPSAoaWR4ID09PSAtMSkgPyBbZV0gOiBbZS5zdWJzdHJpbmcoMCwgaWR4KSwgZS5zdWJzdHJpbmcoaWR4ICsgMSldXG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKF9mbnMpXG4gICAgdmFyIGkgPSAwXG4gICAgdmFyIGwgPSBrZXlzLmxlbmd0aFxuXG4gICAgZm9yIChpOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXVxuICAgICAgaWYgKGtleSA9PT0gJyonKSB7XG4gICAgICAgIG91dCA9IG91dC5jb25jYXQoX2Zuc1trZXldKVxuICAgICAgfVxuXG4gICAgICBpZiAoYXJncy5sZW5ndGggPT09IDIgJiYgYXJnc1swXSA9PT0ga2V5KSB7XG4gICAgICAgIG91dCA9IG91dC5jb25jYXQoX2Zuc1trZXldKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXRcbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXRBbGwgKGUsIGZucywgYXJncykge1xuICAgIHZhciBpID0gMFxuICAgIHZhciBsID0gZm5zLmxlbmd0aFxuXG4gICAgZm9yIChpOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoIWZuc1tpXSkgYnJlYWtcbiAgICAgIGZuc1tpXS5ldmVudCA9IGVcbiAgICAgIGZuc1tpXS5hcHBseShmbnNbaV0sIGFyZ3MpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGVtaXR0ZXJcbn1cbiIsIiFmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgZnVuY3Rpb24gVk5vZGUoKSB7fVxuICAgIGZ1bmN0aW9uIGgobm9kZU5hbWUsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgdmFyIGxhc3RTaW1wbGUsIGNoaWxkLCBzaW1wbGUsIGksIGNoaWxkcmVuID0gRU1QVFlfQ0hJTERSRU47XG4gICAgICAgIGZvciAoaSA9IGFyZ3VtZW50cy5sZW5ndGg7IGktLSA+IDI7ICkgc3RhY2sucHVzaChhcmd1bWVudHNbaV0pO1xuICAgICAgICBpZiAoYXR0cmlidXRlcyAmJiBudWxsICE9IGF0dHJpYnV0ZXMuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGlmICghc3RhY2subGVuZ3RoKSBzdGFjay5wdXNoKGF0dHJpYnV0ZXMuY2hpbGRyZW4pO1xuICAgICAgICAgICAgZGVsZXRlIGF0dHJpYnV0ZXMuY2hpbGRyZW47XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkgaWYgKChjaGlsZCA9IHN0YWNrLnBvcCgpKSAmJiB2b2lkIDAgIT09IGNoaWxkLnBvcCkgZm9yIChpID0gY2hpbGQubGVuZ3RoOyBpLS07ICkgc3RhY2sucHVzaChjaGlsZFtpXSk7IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCdib29sZWFuJyA9PSB0eXBlb2YgY2hpbGQpIGNoaWxkID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChzaW1wbGUgPSAnZnVuY3Rpb24nICE9IHR5cGVvZiBub2RlTmFtZSkgaWYgKG51bGwgPT0gY2hpbGQpIGNoaWxkID0gJyc7IGVsc2UgaWYgKCdudW1iZXInID09IHR5cGVvZiBjaGlsZCkgY2hpbGQgPSBTdHJpbmcoY2hpbGQpOyBlbHNlIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgY2hpbGQpIHNpbXBsZSA9ICExO1xuICAgICAgICAgICAgaWYgKHNpbXBsZSAmJiBsYXN0U2ltcGxlKSBjaGlsZHJlbltjaGlsZHJlbi5sZW5ndGggLSAxXSArPSBjaGlsZDsgZWxzZSBpZiAoY2hpbGRyZW4gPT09IEVNUFRZX0NISUxEUkVOKSBjaGlsZHJlbiA9IFsgY2hpbGQgXTsgZWxzZSBjaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgIGxhc3RTaW1wbGUgPSBzaW1wbGU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHAgPSBuZXcgVk5vZGUoKTtcbiAgICAgICAgcC5ub2RlTmFtZSA9IG5vZGVOYW1lO1xuICAgICAgICBwLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgICAgIHAuYXR0cmlidXRlcyA9IG51bGwgPT0gYXR0cmlidXRlcyA/IHZvaWQgMCA6IGF0dHJpYnV0ZXM7XG4gICAgICAgIHAua2V5ID0gbnVsbCA9PSBhdHRyaWJ1dGVzID8gdm9pZCAwIDogYXR0cmlidXRlcy5rZXk7XG4gICAgICAgIGlmICh2b2lkIDAgIT09IG9wdGlvbnMudm5vZGUpIG9wdGlvbnMudm5vZGUocCk7XG4gICAgICAgIHJldHVybiBwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBleHRlbmQob2JqLCBwcm9wcykge1xuICAgICAgICBmb3IgKHZhciBpIGluIHByb3BzKSBvYmpbaV0gPSBwcm9wc1tpXTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gICAgZnVuY3Rpb24gY2xvbmVFbGVtZW50KHZub2RlLCBwcm9wcykge1xuICAgICAgICByZXR1cm4gaCh2bm9kZS5ub2RlTmFtZSwgZXh0ZW5kKGV4dGVuZCh7fSwgdm5vZGUuYXR0cmlidXRlcyksIHByb3BzKSwgYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMikgOiB2bm9kZS5jaGlsZHJlbik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGVucXVldWVSZW5kZXIoY29tcG9uZW50KSB7XG4gICAgICAgIGlmICghY29tcG9uZW50Ll9fZCAmJiAoY29tcG9uZW50Ll9fZCA9ICEwKSAmJiAxID09IGl0ZW1zLnB1c2goY29tcG9uZW50KSkgKG9wdGlvbnMuZGVib3VuY2VSZW5kZXJpbmcgfHwgZGVmZXIpKHJlcmVuZGVyKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVyZW5kZXIoKSB7XG4gICAgICAgIHZhciBwLCBsaXN0ID0gaXRlbXM7XG4gICAgICAgIGl0ZW1zID0gW107XG4gICAgICAgIHdoaWxlIChwID0gbGlzdC5wb3AoKSkgaWYgKHAuX19kKSByZW5kZXJDb21wb25lbnQocCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzU2FtZU5vZGVUeXBlKG5vZGUsIHZub2RlLCBoeWRyYXRpbmcpIHtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZSB8fCAnbnVtYmVyJyA9PSB0eXBlb2Ygdm5vZGUpIHJldHVybiB2b2lkIDAgIT09IG5vZGUuc3BsaXRUZXh0O1xuICAgICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZub2RlLm5vZGVOYW1lKSByZXR1cm4gIW5vZGUuX2NvbXBvbmVudENvbnN0cnVjdG9yICYmIGlzTmFtZWROb2RlKG5vZGUsIHZub2RlLm5vZGVOYW1lKTsgZWxzZSByZXR1cm4gaHlkcmF0aW5nIHx8IG5vZGUuX2NvbXBvbmVudENvbnN0cnVjdG9yID09PSB2bm9kZS5ub2RlTmFtZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNOYW1lZE5vZGUobm9kZSwgbm9kZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuX19uID09PSBub2RlTmFtZSB8fCBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldE5vZGVQcm9wcyh2bm9kZSkge1xuICAgICAgICB2YXIgcHJvcHMgPSBleHRlbmQoe30sIHZub2RlLmF0dHJpYnV0ZXMpO1xuICAgICAgICBwcm9wcy5jaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuO1xuICAgICAgICB2YXIgZGVmYXVsdFByb3BzID0gdm5vZGUubm9kZU5hbWUuZGVmYXVsdFByb3BzO1xuICAgICAgICBpZiAodm9pZCAwICE9PSBkZWZhdWx0UHJvcHMpIGZvciAodmFyIGkgaW4gZGVmYXVsdFByb3BzKSBpZiAodm9pZCAwID09PSBwcm9wc1tpXSkgcHJvcHNbaV0gPSBkZWZhdWx0UHJvcHNbaV07XG4gICAgICAgIHJldHVybiBwcm9wcztcbiAgICB9XG4gICAgZnVuY3Rpb24gY3JlYXRlTm9kZShub2RlTmFtZSwgaXNTdmcpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBpc1N2ZyA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCBub2RlTmFtZSkgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICAgICAgbm9kZS5fX24gPSBub2RlTmFtZTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSkge1xuICAgICAgICB2YXIgcGFyZW50Tm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgaWYgKHBhcmVudE5vZGUpIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldEFjY2Vzc29yKG5vZGUsIG5hbWUsIG9sZCwgdmFsdWUsIGlzU3ZnKSB7XG4gICAgICAgIGlmICgnY2xhc3NOYW1lJyA9PT0gbmFtZSkgbmFtZSA9ICdjbGFzcyc7XG4gICAgICAgIGlmICgna2V5JyA9PT0gbmFtZSkgOyBlbHNlIGlmICgncmVmJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKG9sZCkgb2xkKG51bGwpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB2YWx1ZShub2RlKTtcbiAgICAgICAgfSBlbHNlIGlmICgnY2xhc3MnID09PSBuYW1lICYmICFpc1N2Zykgbm9kZS5jbGFzc05hbWUgPSB2YWx1ZSB8fCAnJzsgZWxzZSBpZiAoJ3N0eWxlJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZSB8fCAnc3RyaW5nJyA9PSB0eXBlb2YgdmFsdWUgfHwgJ3N0cmluZycgPT0gdHlwZW9mIG9sZCkgbm9kZS5zdHlsZS5jc3NUZXh0ID0gdmFsdWUgfHwgJyc7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgJ29iamVjdCcgPT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBvbGQpIGZvciAodmFyIGkgaW4gb2xkKSBpZiAoIShpIGluIHZhbHVlKSkgbm9kZS5zdHlsZVtpXSA9ICcnO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIG5vZGUuc3R5bGVbaV0gPSAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVbaV0gJiYgITEgPT09IElTX05PTl9ESU1FTlNJT05BTC50ZXN0KGkpID8gdmFsdWVbaV0gKyAncHgnIDogdmFsdWVbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ2Rhbmdlcm91c2x5U2V0SW5uZXJIVE1MJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlKSBub2RlLmlubmVySFRNTCA9IHZhbHVlLl9faHRtbCB8fCAnJztcbiAgICAgICAgfSBlbHNlIGlmICgnbycgPT0gbmFtZVswXSAmJiAnbicgPT0gbmFtZVsxXSkge1xuICAgICAgICAgICAgdmFyIHVzZUNhcHR1cmUgPSBuYW1lICE9PSAobmFtZSA9IG5hbWUucmVwbGFjZSgvQ2FwdHVyZSQvLCAnJykpO1xuICAgICAgICAgICAgbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKS5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9sZCkgbm9kZS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGV2ZW50UHJveHksIHVzZUNhcHR1cmUpO1xuICAgICAgICAgICAgfSBlbHNlIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBldmVudFByb3h5LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgIChub2RlLl9fbCB8fCAobm9kZS5fX2wgPSB7fSkpW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2xpc3QnICE9PSBuYW1lICYmICd0eXBlJyAhPT0gbmFtZSAmJiAhaXNTdmcgJiYgbmFtZSBpbiBub2RlKSB7XG4gICAgICAgICAgICBzZXRQcm9wZXJ0eShub2RlLCBuYW1lLCBudWxsID09IHZhbHVlID8gJycgOiB2YWx1ZSk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSB8fCAhMSA9PT0gdmFsdWUpIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5zID0gaXNTdmcgJiYgbmFtZSAhPT0gKG5hbWUgPSBuYW1lLnJlcGxhY2UoL154bGlua1xcOj8vLCAnJykpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgfHwgITEgPT09IHZhbHVlKSBpZiAobnMpIG5vZGUucmVtb3ZlQXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCBuYW1lLnRvTG93ZXJDYXNlKCkpOyBlbHNlIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpOyBlbHNlIGlmICgnZnVuY3Rpb24nICE9IHR5cGVvZiB2YWx1ZSkgaWYgKG5zKSBub2RlLnNldEF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgbmFtZS50b0xvd2VyQ2FzZSgpLCB2YWx1ZSk7IGVsc2Ugbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldFByb3BlcnR5KG5vZGUsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBub2RlW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGV2ZW50UHJveHkoZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fX2xbZS50eXBlXShvcHRpb25zLmV2ZW50ICYmIG9wdGlvbnMuZXZlbnQoZSkgfHwgZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZsdXNoTW91bnRzKCkge1xuICAgICAgICB2YXIgYztcbiAgICAgICAgd2hpbGUgKGMgPSBtb3VudHMucG9wKCkpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFmdGVyTW91bnQpIG9wdGlvbnMuYWZ0ZXJNb3VudChjKTtcbiAgICAgICAgICAgIGlmIChjLmNvbXBvbmVudERpZE1vdW50KSBjLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gZGlmZihkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCwgcGFyZW50LCBjb21wb25lbnRSb290KSB7XG4gICAgICAgIGlmICghZGlmZkxldmVsKyspIHtcbiAgICAgICAgICAgIGlzU3ZnTW9kZSA9IG51bGwgIT0gcGFyZW50ICYmIHZvaWQgMCAhPT0gcGFyZW50Lm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgICAgIGh5ZHJhdGluZyA9IG51bGwgIT0gZG9tICYmICEoJ19fcHJlYWN0YXR0cl8nIGluIGRvbSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJldCA9IGlkaWZmKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsLCBjb21wb25lbnRSb290KTtcbiAgICAgICAgaWYgKHBhcmVudCAmJiByZXQucGFyZW50Tm9kZSAhPT0gcGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQocmV0KTtcbiAgICAgICAgaWYgKCEtLWRpZmZMZXZlbCkge1xuICAgICAgICAgICAgaHlkcmF0aW5nID0gITE7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudFJvb3QpIGZsdXNoTW91bnRzKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgZnVuY3Rpb24gaWRpZmYoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwsIGNvbXBvbmVudFJvb3QpIHtcbiAgICAgICAgdmFyIG91dCA9IGRvbSwgcHJldlN2Z01vZGUgPSBpc1N2Z01vZGU7XG4gICAgICAgIGlmIChudWxsID09IHZub2RlIHx8ICdib29sZWFuJyA9PSB0eXBlb2Ygdm5vZGUpIHZub2RlID0gJyc7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2Ygdm5vZGUgfHwgJ251bWJlcicgPT0gdHlwZW9mIHZub2RlKSB7XG4gICAgICAgICAgICBpZiAoZG9tICYmIHZvaWQgMCAhPT0gZG9tLnNwbGl0VGV4dCAmJiBkb20ucGFyZW50Tm9kZSAmJiAoIWRvbS5fY29tcG9uZW50IHx8IGNvbXBvbmVudFJvb3QpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbS5ub2RlVmFsdWUgIT0gdm5vZGUpIGRvbS5ub2RlVmFsdWUgPSB2bm9kZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodm5vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChkb20pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbS5wYXJlbnROb2RlKSBkb20ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQob3V0LCBkb20pO1xuICAgICAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShkb20sICEwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQuX19wcmVhY3RhdHRyXyA9ICEwO1xuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdm5vZGVOYW1lID0gdm5vZGUubm9kZU5hbWU7XG4gICAgICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiB2bm9kZU5hbWUpIHJldHVybiBidWlsZENvbXBvbmVudEZyb21WTm9kZShkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgIGlzU3ZnTW9kZSA9ICdzdmcnID09PSB2bm9kZU5hbWUgPyAhMCA6ICdmb3JlaWduT2JqZWN0JyA9PT0gdm5vZGVOYW1lID8gITEgOiBpc1N2Z01vZGU7XG4gICAgICAgIHZub2RlTmFtZSA9IFN0cmluZyh2bm9kZU5hbWUpO1xuICAgICAgICBpZiAoIWRvbSB8fCAhaXNOYW1lZE5vZGUoZG9tLCB2bm9kZU5hbWUpKSB7XG4gICAgICAgICAgICBvdXQgPSBjcmVhdGVOb2RlKHZub2RlTmFtZSwgaXNTdmdNb2RlKTtcbiAgICAgICAgICAgIGlmIChkb20pIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZG9tLmZpcnN0Q2hpbGQpIG91dC5hcHBlbmRDaGlsZChkb20uZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbS5wYXJlbnROb2RlKSBkb20ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQob3V0LCBkb20pO1xuICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKGRvbSwgITApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBmYyA9IG91dC5maXJzdENoaWxkLCBwcm9wcyA9IG91dC5fX3ByZWFjdGF0dHJfLCB2Y2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKG51bGwgPT0gcHJvcHMpIHtcbiAgICAgICAgICAgIHByb3BzID0gb3V0Ll9fcHJlYWN0YXR0cl8gPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGEgPSBvdXQuYXR0cmlidXRlcywgaSA9IGEubGVuZ3RoOyBpLS07ICkgcHJvcHNbYVtpXS5uYW1lXSA9IGFbaV0udmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFoeWRyYXRpbmcgJiYgdmNoaWxkcmVuICYmIDEgPT09IHZjaGlsZHJlbi5sZW5ndGggJiYgJ3N0cmluZycgPT0gdHlwZW9mIHZjaGlsZHJlblswXSAmJiBudWxsICE9IGZjICYmIHZvaWQgMCAhPT0gZmMuc3BsaXRUZXh0ICYmIG51bGwgPT0gZmMubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgICAgIGlmIChmYy5ub2RlVmFsdWUgIT0gdmNoaWxkcmVuWzBdKSBmYy5ub2RlVmFsdWUgPSB2Y2hpbGRyZW5bMF07XG4gICAgICAgIH0gZWxzZSBpZiAodmNoaWxkcmVuICYmIHZjaGlsZHJlbi5sZW5ndGggfHwgbnVsbCAhPSBmYykgaW5uZXJEaWZmTm9kZShvdXQsIHZjaGlsZHJlbiwgY29udGV4dCwgbW91bnRBbGwsIGh5ZHJhdGluZyB8fCBudWxsICE9IHByb3BzLmRhbmdlcm91c2x5U2V0SW5uZXJIVE1MKTtcbiAgICAgICAgZGlmZkF0dHJpYnV0ZXMob3V0LCB2bm9kZS5hdHRyaWJ1dGVzLCBwcm9wcyk7XG4gICAgICAgIGlzU3ZnTW9kZSA9IHByZXZTdmdNb2RlO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbm5lckRpZmZOb2RlKGRvbSwgdmNoaWxkcmVuLCBjb250ZXh0LCBtb3VudEFsbCwgaXNIeWRyYXRpbmcpIHtcbiAgICAgICAgdmFyIGosIGMsIGYsIHZjaGlsZCwgY2hpbGQsIG9yaWdpbmFsQ2hpbGRyZW4gPSBkb20uY2hpbGROb2RlcywgY2hpbGRyZW4gPSBbXSwga2V5ZWQgPSB7fSwga2V5ZWRMZW4gPSAwLCBtaW4gPSAwLCBsZW4gPSBvcmlnaW5hbENoaWxkcmVuLmxlbmd0aCwgY2hpbGRyZW5MZW4gPSAwLCB2bGVuID0gdmNoaWxkcmVuID8gdmNoaWxkcmVuLmxlbmd0aCA6IDA7XG4gICAgICAgIGlmICgwICE9PSBsZW4pIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBfY2hpbGQgPSBvcmlnaW5hbENoaWxkcmVuW2ldLCBwcm9wcyA9IF9jaGlsZC5fX3ByZWFjdGF0dHJfLCBrZXkgPSB2bGVuICYmIHByb3BzID8gX2NoaWxkLl9jb21wb25lbnQgPyBfY2hpbGQuX2NvbXBvbmVudC5fX2sgOiBwcm9wcy5rZXkgOiBudWxsO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0ga2V5KSB7XG4gICAgICAgICAgICAgICAga2V5ZWRMZW4rKztcbiAgICAgICAgICAgICAgICBrZXllZFtrZXldID0gX2NoaWxkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wcyB8fCAodm9pZCAwICE9PSBfY2hpbGQuc3BsaXRUZXh0ID8gaXNIeWRyYXRpbmcgPyBfY2hpbGQubm9kZVZhbHVlLnRyaW0oKSA6ICEwIDogaXNIeWRyYXRpbmcpKSBjaGlsZHJlbltjaGlsZHJlbkxlbisrXSA9IF9jaGlsZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoMCAhPT0gdmxlbikgZm9yICh2YXIgaSA9IDA7IGkgPCB2bGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZjaGlsZCA9IHZjaGlsZHJlbltpXTtcbiAgICAgICAgICAgIGNoaWxkID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBrZXkgPSB2Y2hpbGQua2V5O1xuICAgICAgICAgICAgaWYgKG51bGwgIT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleWVkTGVuICYmIHZvaWQgMCAhPT0ga2V5ZWRba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZCA9IGtleWVkW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGtleWVkW2tleV0gPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgICAgIGtleWVkTGVuLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghY2hpbGQgJiYgbWluIDwgY2hpbGRyZW5MZW4pIGZvciAoaiA9IG1pbjsgaiA8IGNoaWxkcmVuTGVuOyBqKyspIGlmICh2b2lkIDAgIT09IGNoaWxkcmVuW2pdICYmIGlzU2FtZU5vZGVUeXBlKGMgPSBjaGlsZHJlbltqXSwgdmNoaWxkLCBpc0h5ZHJhdGluZykpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGM7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW5bal0gPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgaWYgKGogPT09IGNoaWxkcmVuTGVuIC0gMSkgY2hpbGRyZW5MZW4tLTtcbiAgICAgICAgICAgICAgICBpZiAoaiA9PT0gbWluKSBtaW4rKztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNoaWxkID0gaWRpZmYoY2hpbGQsIHZjaGlsZCwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgZiA9IG9yaWdpbmFsQ2hpbGRyZW5baV07XG4gICAgICAgICAgICBpZiAoY2hpbGQgJiYgY2hpbGQgIT09IGRvbSAmJiBjaGlsZCAhPT0gZikgaWYgKG51bGwgPT0gZikgZG9tLmFwcGVuZENoaWxkKGNoaWxkKTsgZWxzZSBpZiAoY2hpbGQgPT09IGYubmV4dFNpYmxpbmcpIHJlbW92ZU5vZGUoZik7IGVsc2UgZG9tLmluc2VydEJlZm9yZShjaGlsZCwgZik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGtleWVkTGVuKSBmb3IgKHZhciBpIGluIGtleWVkKSBpZiAodm9pZCAwICE9PSBrZXllZFtpXSkgcmVjb2xsZWN0Tm9kZVRyZWUoa2V5ZWRbaV0sICExKTtcbiAgICAgICAgd2hpbGUgKG1pbiA8PSBjaGlsZHJlbkxlbikgaWYgKHZvaWQgMCAhPT0gKGNoaWxkID0gY2hpbGRyZW5bY2hpbGRyZW5MZW4tLV0pKSByZWNvbGxlY3ROb2RlVHJlZShjaGlsZCwgITEpO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZWNvbGxlY3ROb2RlVHJlZShub2RlLCB1bm1vdW50T25seSkge1xuICAgICAgICB2YXIgY29tcG9uZW50ID0gbm9kZS5fY29tcG9uZW50O1xuICAgICAgICBpZiAoY29tcG9uZW50KSB1bm1vdW50Q29tcG9uZW50KGNvbXBvbmVudCk7IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gbm9kZS5fX3ByZWFjdGF0dHJfICYmIG5vZGUuX19wcmVhY3RhdHRyXy5yZWYpIG5vZGUuX19wcmVhY3RhdHRyXy5yZWYobnVsbCk7XG4gICAgICAgICAgICBpZiAoITEgPT09IHVubW91bnRPbmx5IHx8IG51bGwgPT0gbm9kZS5fX3ByZWFjdGF0dHJfKSByZW1vdmVOb2RlKG5vZGUpO1xuICAgICAgICAgICAgcmVtb3ZlQ2hpbGRyZW4obm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVtb3ZlQ2hpbGRyZW4obm9kZSkge1xuICAgICAgICBub2RlID0gbm9kZS5sYXN0Q2hpbGQ7XG4gICAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IG5vZGUucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUobm9kZSwgITApO1xuICAgICAgICAgICAgbm9kZSA9IG5leHQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gZGlmZkF0dHJpYnV0ZXMoZG9tLCBhdHRycywgb2xkKSB7XG4gICAgICAgIHZhciBuYW1lO1xuICAgICAgICBmb3IgKG5hbWUgaW4gb2xkKSBpZiAoKCFhdHRycyB8fCBudWxsID09IGF0dHJzW25hbWVdKSAmJiBudWxsICE9IG9sZFtuYW1lXSkgc2V0QWNjZXNzb3IoZG9tLCBuYW1lLCBvbGRbbmFtZV0sIG9sZFtuYW1lXSA9IHZvaWQgMCwgaXNTdmdNb2RlKTtcbiAgICAgICAgZm9yIChuYW1lIGluIGF0dHJzKSBpZiAoISgnY2hpbGRyZW4nID09PSBuYW1lIHx8ICdpbm5lckhUTUwnID09PSBuYW1lIHx8IG5hbWUgaW4gb2xkICYmIGF0dHJzW25hbWVdID09PSAoJ3ZhbHVlJyA9PT0gbmFtZSB8fCAnY2hlY2tlZCcgPT09IG5hbWUgPyBkb21bbmFtZV0gOiBvbGRbbmFtZV0pKSkgc2V0QWNjZXNzb3IoZG9tLCBuYW1lLCBvbGRbbmFtZV0sIG9sZFtuYW1lXSA9IGF0dHJzW25hbWVdLCBpc1N2Z01vZGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb2xsZWN0Q29tcG9uZW50KGNvbXBvbmVudCkge1xuICAgICAgICB2YXIgbmFtZSA9IGNvbXBvbmVudC5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICAoY29tcG9uZW50c1tuYW1lXSB8fCAoY29tcG9uZW50c1tuYW1lXSA9IFtdKSkucHVzaChjb21wb25lbnQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoQ3RvciwgcHJvcHMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGluc3QsIGxpc3QgPSBjb21wb25lbnRzW0N0b3IubmFtZV07XG4gICAgICAgIGlmIChDdG9yLnByb3RvdHlwZSAmJiBDdG9yLnByb3RvdHlwZS5yZW5kZXIpIHtcbiAgICAgICAgICAgIGluc3QgPSBuZXcgQ3Rvcihwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBDb21wb25lbnQuY2FsbChpbnN0LCBwcm9wcywgY29udGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IENvbXBvbmVudChwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpbnN0LmNvbnN0cnVjdG9yID0gQ3RvcjtcbiAgICAgICAgICAgIGluc3QucmVuZGVyID0gZG9SZW5kZXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpc3QpIGZvciAodmFyIGkgPSBsaXN0Lmxlbmd0aDsgaS0tOyApIGlmIChsaXN0W2ldLmNvbnN0cnVjdG9yID09PSBDdG9yKSB7XG4gICAgICAgICAgICBpbnN0Ll9fYiA9IGxpc3RbaV0uX19iO1xuICAgICAgICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zdDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZG9SZW5kZXIocHJvcHMsIHN0YXRlLCBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0Q29tcG9uZW50UHJvcHMoY29tcG9uZW50LCBwcm9wcywgb3B0cywgY29udGV4dCwgbW91bnRBbGwpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX194KSB7XG4gICAgICAgICAgICBjb21wb25lbnQuX194ID0gITA7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50Ll9fciA9IHByb3BzLnJlZikgZGVsZXRlIHByb3BzLnJlZjtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19rID0gcHJvcHMua2V5KSBkZWxldGUgcHJvcHMua2V5O1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuYmFzZSB8fCBtb3VudEFsbCkge1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbE1vdW50KSBjb21wb25lbnQuY29tcG9uZW50V2lsbE1vdW50KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKSBjb21wb25lbnQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBjb21wb25lbnQuY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGlmICghY29tcG9uZW50Ll9fYykgY29tcG9uZW50Ll9fYyA9IGNvbXBvbmVudC5jb250ZXh0O1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghY29tcG9uZW50Ll9fcCkgY29tcG9uZW50Ll9fcCA9IGNvbXBvbmVudC5wcm9wcztcbiAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wcyA9IHByb3BzO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9feCA9ICExO1xuICAgICAgICAgICAgaWYgKDAgIT09IG9wdHMpIGlmICgxID09PSBvcHRzIHx8ICExICE9PSBvcHRpb25zLnN5bmNDb21wb25lbnRVcGRhdGVzIHx8ICFjb21wb25lbnQuYmFzZSkgcmVuZGVyQ29tcG9uZW50KGNvbXBvbmVudCwgMSwgbW91bnRBbGwpOyBlbHNlIGVucXVldWVSZW5kZXIoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19yKSBjb21wb25lbnQuX19yKGNvbXBvbmVudCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVuZGVyQ29tcG9uZW50KGNvbXBvbmVudCwgb3B0cywgbW91bnRBbGwsIGlzQ2hpbGQpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX194KSB7XG4gICAgICAgICAgICB2YXIgcmVuZGVyZWQsIGluc3QsIGNiYXNlLCBwcm9wcyA9IGNvbXBvbmVudC5wcm9wcywgc3RhdGUgPSBjb21wb25lbnQuc3RhdGUsIGNvbnRleHQgPSBjb21wb25lbnQuY29udGV4dCwgcHJldmlvdXNQcm9wcyA9IGNvbXBvbmVudC5fX3AgfHwgcHJvcHMsIHByZXZpb3VzU3RhdGUgPSBjb21wb25lbnQuX19zIHx8IHN0YXRlLCBwcmV2aW91c0NvbnRleHQgPSBjb21wb25lbnQuX19jIHx8IGNvbnRleHQsIGlzVXBkYXRlID0gY29tcG9uZW50LmJhc2UsIG5leHRCYXNlID0gY29tcG9uZW50Ll9fYiwgaW5pdGlhbEJhc2UgPSBpc1VwZGF0ZSB8fCBuZXh0QmFzZSwgaW5pdGlhbENoaWxkQ29tcG9uZW50ID0gY29tcG9uZW50Ll9jb21wb25lbnQsIHNraXAgPSAhMTtcbiAgICAgICAgICAgIGlmIChpc1VwZGF0ZSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wcyA9IHByZXZpb3VzUHJvcHM7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnN0YXRlID0gcHJldmlvdXNTdGF0ZTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuY29udGV4dCA9IHByZXZpb3VzQ29udGV4dDtcbiAgICAgICAgICAgICAgICBpZiAoMiAhPT0gb3B0cyAmJiBjb21wb25lbnQuc2hvdWxkQ29tcG9uZW50VXBkYXRlICYmICExID09PSBjb21wb25lbnQuc2hvdWxkQ29tcG9uZW50VXBkYXRlKHByb3BzLCBzdGF0ZSwgY29udGV4dCkpIHNraXAgPSAhMDsgZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxVcGRhdGUpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsVXBkYXRlKHByb3BzLCBzdGF0ZSwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJvcHM7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnN0YXRlID0gc3RhdGU7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tcG9uZW50Ll9fcCA9IGNvbXBvbmVudC5fX3MgPSBjb21wb25lbnQuX19jID0gY29tcG9uZW50Ll9fYiA9IG51bGw7XG4gICAgICAgICAgICBjb21wb25lbnQuX19kID0gITE7XG4gICAgICAgICAgICBpZiAoIXNraXApIHtcbiAgICAgICAgICAgICAgICByZW5kZXJlZCA9IGNvbXBvbmVudC5yZW5kZXIocHJvcHMsIHN0YXRlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmdldENoaWxkQ29udGV4dCkgY29udGV4dCA9IGV4dGVuZChleHRlbmQoe30sIGNvbnRleHQpLCBjb21wb25lbnQuZ2V0Q2hpbGRDb250ZXh0KCkpO1xuICAgICAgICAgICAgICAgIHZhciB0b1VubW91bnQsIGJhc2UsIGNoaWxkQ29tcG9uZW50ID0gcmVuZGVyZWQgJiYgcmVuZGVyZWQubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGNoaWxkQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZFByb3BzID0gZ2V0Tm9kZVByb3BzKHJlbmRlcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdCA9IGluaXRpYWxDaGlsZENvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluc3QgJiYgaW5zdC5jb25zdHJ1Y3RvciA9PT0gY2hpbGRDb21wb25lbnQgJiYgY2hpbGRQcm9wcy5rZXkgPT0gaW5zdC5fX2spIHNldENvbXBvbmVudFByb3BzKGluc3QsIGNoaWxkUHJvcHMsIDEsIGNvbnRleHQsICExKTsgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b1VubW91bnQgPSBpbnN0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Ll9jb21wb25lbnQgPSBpbnN0ID0gY3JlYXRlQ29tcG9uZW50KGNoaWxkQ29tcG9uZW50LCBjaGlsZFByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3QuX19iID0gaW5zdC5fX2IgfHwgbmV4dEJhc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0Ll9fdSA9IGNvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldENvbXBvbmVudFByb3BzKGluc3QsIGNoaWxkUHJvcHMsIDAsIGNvbnRleHQsICExKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckNvbXBvbmVudChpbnN0LCAxLCBtb3VudEFsbCwgITApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJhc2UgPSBpbnN0LmJhc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2Jhc2UgPSBpbml0aWFsQmFzZTtcbiAgICAgICAgICAgICAgICAgICAgdG9Vbm1vdW50ID0gaW5pdGlhbENoaWxkQ29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9Vbm1vdW50KSBjYmFzZSA9IGNvbXBvbmVudC5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluaXRpYWxCYXNlIHx8IDEgPT09IG9wdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYmFzZSkgY2Jhc2UuX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlID0gZGlmZihjYmFzZSwgcmVuZGVyZWQsIGNvbnRleHQsIG1vdW50QWxsIHx8ICFpc1VwZGF0ZSwgaW5pdGlhbEJhc2UgJiYgaW5pdGlhbEJhc2UucGFyZW50Tm9kZSwgITApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpbml0aWFsQmFzZSAmJiBiYXNlICE9PSBpbml0aWFsQmFzZSAmJiBpbnN0ICE9PSBpbml0aWFsQ2hpbGRDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJhc2VQYXJlbnQgPSBpbml0aWFsQmFzZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZVBhcmVudCAmJiBiYXNlICE9PSBiYXNlUGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlUGFyZW50LnJlcGxhY2VDaGlsZChiYXNlLCBpbml0aWFsQmFzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRvVW5tb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxCYXNlLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKGluaXRpYWxCYXNlLCAhMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRvVW5tb3VudCkgdW5tb3VudENvbXBvbmVudCh0b1VubW91bnQpO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5iYXNlID0gYmFzZTtcbiAgICAgICAgICAgICAgICBpZiAoYmFzZSAmJiAhaXNDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29tcG9uZW50UmVmID0gY29tcG9uZW50LCB0ID0gY29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodCA9IHQuX191KSAoY29tcG9uZW50UmVmID0gdCkuYmFzZSA9IGJhc2U7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UuX2NvbXBvbmVudCA9IGNvbXBvbmVudFJlZjtcbiAgICAgICAgICAgICAgICAgICAgYmFzZS5fY29tcG9uZW50Q29uc3RydWN0b3IgPSBjb21wb25lbnRSZWYuY29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFpc1VwZGF0ZSB8fCBtb3VudEFsbCkgbW91bnRzLnVuc2hpZnQoY29tcG9uZW50KTsgZWxzZSBpZiAoIXNraXApIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmNvbXBvbmVudERpZFVwZGF0ZSkgY29tcG9uZW50LmNvbXBvbmVudERpZFVwZGF0ZShwcmV2aW91c1Byb3BzLCBwcmV2aW91c1N0YXRlLCBwcmV2aW91c0NvbnRleHQpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmFmdGVyVXBkYXRlKSBvcHRpb25zLmFmdGVyVXBkYXRlKGNvbXBvbmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBjb21wb25lbnQuX19oKSB3aGlsZSAoY29tcG9uZW50Ll9faC5sZW5ndGgpIGNvbXBvbmVudC5fX2gucG9wKCkuY2FsbChjb21wb25lbnQpO1xuICAgICAgICAgICAgaWYgKCFkaWZmTGV2ZWwgJiYgIWlzQ2hpbGQpIGZsdXNoTW91bnRzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gYnVpbGRDb21wb25lbnRGcm9tVk5vZGUoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwpIHtcbiAgICAgICAgdmFyIGMgPSBkb20gJiYgZG9tLl9jb21wb25lbnQsIG9yaWdpbmFsQ29tcG9uZW50ID0gYywgb2xkRG9tID0gZG9tLCBpc0RpcmVjdE93bmVyID0gYyAmJiBkb20uX2NvbXBvbmVudENvbnN0cnVjdG9yID09PSB2bm9kZS5ub2RlTmFtZSwgaXNPd25lciA9IGlzRGlyZWN0T3duZXIsIHByb3BzID0gZ2V0Tm9kZVByb3BzKHZub2RlKTtcbiAgICAgICAgd2hpbGUgKGMgJiYgIWlzT3duZXIgJiYgKGMgPSBjLl9fdSkpIGlzT3duZXIgPSBjLmNvbnN0cnVjdG9yID09PSB2bm9kZS5ub2RlTmFtZTtcbiAgICAgICAgaWYgKGMgJiYgaXNPd25lciAmJiAoIW1vdW50QWxsIHx8IGMuX2NvbXBvbmVudCkpIHtcbiAgICAgICAgICAgIHNldENvbXBvbmVudFByb3BzKGMsIHByb3BzLCAzLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgICAgICBkb20gPSBjLmJhc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAob3JpZ2luYWxDb21wb25lbnQgJiYgIWlzRGlyZWN0T3duZXIpIHtcbiAgICAgICAgICAgICAgICB1bm1vdW50Q29tcG9uZW50KG9yaWdpbmFsQ29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICBkb20gPSBvbGREb20gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYyA9IGNyZWF0ZUNvbXBvbmVudCh2bm9kZS5ub2RlTmFtZSwgcHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYgKGRvbSAmJiAhYy5fX2IpIHtcbiAgICAgICAgICAgICAgICBjLl9fYiA9IGRvbTtcbiAgICAgICAgICAgICAgICBvbGREb20gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0Q29tcG9uZW50UHJvcHMoYywgcHJvcHMsIDEsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgICAgIGRvbSA9IGMuYmFzZTtcbiAgICAgICAgICAgIGlmIChvbGREb20gJiYgZG9tICE9PSBvbGREb20pIHtcbiAgICAgICAgICAgICAgICBvbGREb20uX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUob2xkRG9tLCAhMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdW5tb3VudENvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuYmVmb3JlVW5tb3VudCkgb3B0aW9ucy5iZWZvcmVVbm1vdW50KGNvbXBvbmVudCk7XG4gICAgICAgIHZhciBiYXNlID0gY29tcG9uZW50LmJhc2U7XG4gICAgICAgIGNvbXBvbmVudC5fX3ggPSAhMDtcbiAgICAgICAgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsVW5tb3VudCkgY29tcG9uZW50LmNvbXBvbmVudFdpbGxVbm1vdW50KCk7XG4gICAgICAgIGNvbXBvbmVudC5iYXNlID0gbnVsbDtcbiAgICAgICAgdmFyIGlubmVyID0gY29tcG9uZW50Ll9jb21wb25lbnQ7XG4gICAgICAgIGlmIChpbm5lcikgdW5tb3VudENvbXBvbmVudChpbm5lcik7IGVsc2UgaWYgKGJhc2UpIHtcbiAgICAgICAgICAgIGlmIChiYXNlLl9fcHJlYWN0YXR0cl8gJiYgYmFzZS5fX3ByZWFjdGF0dHJfLnJlZikgYmFzZS5fX3ByZWFjdGF0dHJfLnJlZihudWxsKTtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX2IgPSBiYXNlO1xuICAgICAgICAgICAgcmVtb3ZlTm9kZShiYXNlKTtcbiAgICAgICAgICAgIGNvbGxlY3RDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICAgICAgICAgIHJlbW92ZUNoaWxkcmVuKGJhc2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb21wb25lbnQuX19yKSBjb21wb25lbnQuX19yKG51bGwpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBDb21wb25lbnQocHJvcHMsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fX2QgPSAhMDtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgdGhpcy5wcm9wcyA9IHByb3BzO1xuICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5zdGF0ZSB8fCB7fTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVuZGVyKHZub2RlLCBwYXJlbnQsIG1lcmdlKSB7XG4gICAgICAgIHJldHVybiBkaWZmKG1lcmdlLCB2bm9kZSwge30sICExLCBwYXJlbnQsICExKTtcbiAgICB9XG4gICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICB2YXIgc3RhY2sgPSBbXTtcbiAgICB2YXIgRU1QVFlfQ0hJTERSRU4gPSBbXTtcbiAgICB2YXIgZGVmZXIgPSAnZnVuY3Rpb24nID09IHR5cGVvZiBQcm9taXNlID8gUHJvbWlzZS5yZXNvbHZlKCkudGhlbi5iaW5kKFByb21pc2UucmVzb2x2ZSgpKSA6IHNldFRpbWVvdXQ7XG4gICAgdmFyIElTX05PTl9ESU1FTlNJT05BTCA9IC9hY2l0fGV4KD86c3xnfG58cHwkKXxycGh8b3dzfG1uY3xudHd8aW5lW2NoXXx6b298Xm9yZC9pO1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHZhciBtb3VudHMgPSBbXTtcbiAgICB2YXIgZGlmZkxldmVsID0gMDtcbiAgICB2YXIgaXNTdmdNb2RlID0gITE7XG4gICAgdmFyIGh5ZHJhdGluZyA9ICExO1xuICAgIHZhciBjb21wb25lbnRzID0ge307XG4gICAgZXh0ZW5kKENvbXBvbmVudC5wcm90b3R5cGUsIHtcbiAgICAgICAgc2V0U3RhdGU6IGZ1bmN0aW9uKHN0YXRlLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHMgPSB0aGlzLnN0YXRlO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9fcykgdGhpcy5fX3MgPSBleHRlbmQoe30sIHMpO1xuICAgICAgICAgICAgZXh0ZW5kKHMsICdmdW5jdGlvbicgPT0gdHlwZW9mIHN0YXRlID8gc3RhdGUocywgdGhpcy5wcm9wcykgOiBzdGF0ZSk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spICh0aGlzLl9faCA9IHRoaXMuX19oIHx8IFtdKS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGVucXVldWVSZW5kZXIodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcmNlVXBkYXRlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSAodGhpcy5fX2ggPSB0aGlzLl9faCB8fCBbXSkucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICByZW5kZXJDb21wb25lbnQodGhpcywgMik7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7fVxuICAgIH0pO1xuICAgIHZhciBwcmVhY3QgPSB7XG4gICAgICAgIGg6IGgsXG4gICAgICAgIGNyZWF0ZUVsZW1lbnQ6IGgsXG4gICAgICAgIGNsb25lRWxlbWVudDogY2xvbmVFbGVtZW50LFxuICAgICAgICBDb21wb25lbnQ6IENvbXBvbmVudCxcbiAgICAgICAgcmVuZGVyOiByZW5kZXIsXG4gICAgICAgIHJlcmVuZGVyOiByZXJlbmRlcixcbiAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgIH07XG4gICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiBtb2R1bGUpIG1vZHVsZS5leHBvcnRzID0gcHJlYWN0OyBlbHNlIHNlbGYucHJlYWN0ID0gcHJlYWN0O1xufSgpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJlYWN0LmpzLm1hcCIsIm1vZHVsZS5leHBvcnRzID0gcHJldHRpZXJCeXRlc1xuXG5mdW5jdGlvbiBwcmV0dGllckJ5dGVzIChudW0pIHtcbiAgaWYgKHR5cGVvZiBudW0gIT09ICdudW1iZXInIHx8IGlzTmFOKG51bSkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhIG51bWJlciwgZ290ICcgKyB0eXBlb2YgbnVtKVxuICB9XG5cbiAgdmFyIG5lZyA9IG51bSA8IDBcbiAgdmFyIHVuaXRzID0gWydCJywgJ0tCJywgJ01CJywgJ0dCJywgJ1RCJywgJ1BCJywgJ0VCJywgJ1pCJywgJ1lCJ11cblxuICBpZiAobmVnKSB7XG4gICAgbnVtID0gLW51bVxuICB9XG5cbiAgaWYgKG51bSA8IDEpIHtcbiAgICByZXR1cm4gKG5lZyA/ICctJyA6ICcnKSArIG51bSArICcgQidcbiAgfVxuXG4gIHZhciBleHBvbmVudCA9IE1hdGgubWluKE1hdGguZmxvb3IoTWF0aC5sb2cobnVtKSAvIE1hdGgubG9nKDEwMDApKSwgdW5pdHMubGVuZ3RoIC0gMSlcbiAgbnVtID0gTnVtYmVyKG51bSAvIE1hdGgucG93KDEwMDAsIGV4cG9uZW50KSlcbiAgdmFyIHVuaXQgPSB1bml0c1tleHBvbmVudF1cblxuICBpZiAobnVtID49IDEwIHx8IG51bSAlIDEgPT09IDApIHtcbiAgICAvLyBEbyBub3Qgc2hvdyBkZWNpbWFscyB3aGVuIHRoZSBudW1iZXIgaXMgdHdvLWRpZ2l0LCBvciBpZiB0aGUgbnVtYmVyIGhhcyBub1xuICAgIC8vIGRlY2ltYWwgY29tcG9uZW50LlxuICAgIHJldHVybiAobmVnID8gJy0nIDogJycpICsgbnVtLnRvRml4ZWQoMCkgKyAnICcgKyB1bml0XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIChuZWcgPyAnLScgOiAnJykgKyBudW0udG9GaXhlZCgxKSArICcgJyArIHVuaXRcbiAgfVxufVxuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMgd2lsZGNhcmRcblxuICBWZXJ5IHNpbXBsZSB3aWxkY2FyZCBtYXRjaGluZywgd2hpY2ggaXMgZGVzaWduZWQgdG8gcHJvdmlkZSB0aGUgc2FtZVxuICBmdW5jdGlvbmFsaXR5IHRoYXQgaXMgZm91bmQgaW4gdGhlXG4gIFtldmVdKGh0dHBzOi8vZ2l0aHViLmNvbS9hZG9iZS13ZWJwbGF0Zm9ybS9ldmUpIGV2ZW50aW5nIGxpYnJhcnkuXG5cbiAgIyMgVXNhZ2VcblxuICBJdCB3b3JrcyB3aXRoIHN0cmluZ3M6XG5cbiAgPDw8IGV4YW1wbGVzL3N0cmluZ3MuanNcblxuICBBcnJheXM6XG5cbiAgPDw8IGV4YW1wbGVzL2FycmF5cy5qc1xuXG4gIE9iamVjdHMgKG1hdGNoaW5nIGFnYWluc3Qga2V5cyk6XG5cbiAgPDw8IGV4YW1wbGVzL29iamVjdHMuanNcblxuICBXaGlsZSB0aGUgbGlicmFyeSB3b3JrcyBpbiBOb2RlLCBpZiB5b3UgYXJlIGFyZSBsb29raW5nIGZvciBmaWxlLWJhc2VkXG4gIHdpbGRjYXJkIG1hdGNoaW5nIHRoZW4geW91IHNob3VsZCBoYXZlIGEgbG9vayBhdDpcblxuICA8aHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9ub2RlLWdsb2I+XG4qKi9cblxuZnVuY3Rpb24gV2lsZGNhcmRNYXRjaGVyKHRleHQsIHNlcGFyYXRvcikge1xuICB0aGlzLnRleHQgPSB0ZXh0ID0gdGV4dCB8fCAnJztcbiAgdGhpcy5oYXNXaWxkID0gfnRleHQuaW5kZXhPZignKicpO1xuICB0aGlzLnNlcGFyYXRvciA9IHNlcGFyYXRvcjtcbiAgdGhpcy5wYXJ0cyA9IHRleHQuc3BsaXQoc2VwYXJhdG9yKTtcbn1cblxuV2lsZGNhcmRNYXRjaGVyLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIHZhciBtYXRjaGVzID0gdHJ1ZTtcbiAgdmFyIHBhcnRzID0gdGhpcy5wYXJ0cztcbiAgdmFyIGlpO1xuICB2YXIgcGFydHNDb3VudCA9IHBhcnRzLmxlbmd0aDtcbiAgdmFyIHRlc3RQYXJ0cztcblxuICBpZiAodHlwZW9mIGlucHV0ID09ICdzdHJpbmcnIHx8IGlucHV0IGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgaWYgKCF0aGlzLmhhc1dpbGQgJiYgdGhpcy50ZXh0ICE9IGlucHV0KSB7XG4gICAgICBtYXRjaGVzID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlc3RQYXJ0cyA9IChpbnB1dCB8fCAnJykuc3BsaXQodGhpcy5zZXBhcmF0b3IpO1xuICAgICAgZm9yIChpaSA9IDA7IG1hdGNoZXMgJiYgaWkgPCBwYXJ0c0NvdW50OyBpaSsrKSB7XG4gICAgICAgIGlmIChwYXJ0c1tpaV0gPT09ICcqJykgIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmIChpaSA8IHRlc3RQYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICBtYXRjaGVzID0gcGFydHNbaWldID09PSB0ZXN0UGFydHNbaWldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1hdGNoZXMgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiBtYXRjaGVzLCB0aGVuIHJldHVybiB0aGUgY29tcG9uZW50IHBhcnRzXG4gICAgICBtYXRjaGVzID0gbWF0Y2hlcyAmJiB0ZXN0UGFydHM7XG4gICAgfVxuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiBpbnB1dC5zcGxpY2UgPT0gJ2Z1bmN0aW9uJykge1xuICAgIG1hdGNoZXMgPSBbXTtcblxuICAgIGZvciAoaWkgPSBpbnB1dC5sZW5ndGg7IGlpLS07ICkge1xuICAgICAgaWYgKHRoaXMubWF0Y2goaW5wdXRbaWldKSkge1xuICAgICAgICBtYXRjaGVzW21hdGNoZXMubGVuZ3RoXSA9IGlucHV0W2lpXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSBpZiAodHlwZW9mIGlucHV0ID09ICdvYmplY3QnKSB7XG4gICAgbWF0Y2hlcyA9IHt9O1xuXG4gICAgZm9yICh2YXIga2V5IGluIGlucHV0KSB7XG4gICAgICBpZiAodGhpcy5tYXRjaChrZXkpKSB7XG4gICAgICAgIG1hdGNoZXNba2V5XSA9IGlucHV0W2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRleHQsIHRlc3QsIHNlcGFyYXRvcikge1xuICB2YXIgbWF0Y2hlciA9IG5ldyBXaWxkY2FyZE1hdGNoZXIodGV4dCwgc2VwYXJhdG9yIHx8IC9bXFwvXFwuXS8pO1xuICBpZiAodHlwZW9mIHRlc3QgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gbWF0Y2hlci5tYXRjaCh0ZXN0KTtcbiAgfVxuXG4gIHJldHVybiBtYXRjaGVyO1xufTtcbiIsImNvbnN0IFV0aWxzID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5jb25zdCBUcmFuc2xhdG9yID0gcmVxdWlyZSgnLi4vY29yZS9UcmFuc2xhdG9yJylcbmNvbnN0IGVlID0gcmVxdWlyZSgnbmFtZXNwYWNlLWVtaXR0ZXInKVxuY29uc3QgY3VpZCA9IHJlcXVpcmUoJ2N1aWQnKVxuY29uc3QgdGhyb3R0bGUgPSByZXF1aXJlKCdsb2Rhc2gudGhyb3R0bGUnKVxuY29uc3QgcHJldHR5Qnl0ZXMgPSByZXF1aXJlKCdwcmV0dGllci1ieXRlcycpXG5jb25zdCBtYXRjaCA9IHJlcXVpcmUoJ21pbWUtbWF0Y2gnKVxuY29uc3QgRGVmYXVsdFN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUvRGVmYXVsdFN0b3JlJylcblxuLyoqXG4gKiBVcHB5IENvcmUgbW9kdWxlLlxuICogTWFuYWdlcyBwbHVnaW5zLCBzdGF0ZSB1cGRhdGVzLCBhY3RzIGFzIGFuIGV2ZW50IGJ1cyxcbiAqIGFkZHMvcmVtb3ZlcyBmaWxlcyBhbmQgbWV0YWRhdGEuXG4gKi9cbmNsYXNzIFVwcHkge1xuICAvKipcbiAgKiBJbnN0YW50aWF0ZSBVcHB5XG4gICogQHBhcmFtIHtvYmplY3R9IG9wdHMg4oCUIFVwcHkgb3B0aW9uc1xuICAqL1xuICBjb25zdHJ1Y3RvciAob3B0cykge1xuICAgIGNvbnN0IGRlZmF1bHRMb2NhbGUgPSB7XG4gICAgICBzdHJpbmdzOiB7XG4gICAgICAgIHlvdUNhbk9ubHlVcGxvYWRYOiB7XG4gICAgICAgICAgMDogJ1lvdSBjYW4gb25seSB1cGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZScsXG4gICAgICAgICAgMTogJ1lvdSBjYW4gb25seSB1cGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHlvdUhhdmVUb0F0TGVhc3RTZWxlY3RYOiB7XG4gICAgICAgICAgMDogJ1lvdSBoYXZlIHRvIHNlbGVjdCBhdCBsZWFzdCAle3NtYXJ0X2NvdW50fSBmaWxlJyxcbiAgICAgICAgICAxOiAnWW91IGhhdmUgdG8gc2VsZWN0IGF0IGxlYXN0ICV7c21hcnRfY291bnR9IGZpbGVzJ1xuICAgICAgICB9LFxuICAgICAgICBleGNlZWRzU2l6ZTogJ1RoaXMgZmlsZSBleGNlZWRzIG1heGltdW0gYWxsb3dlZCBzaXplIG9mJyxcbiAgICAgICAgeW91Q2FuT25seVVwbG9hZEZpbGVUeXBlczogJ1lvdSBjYW4gb25seSB1cGxvYWQ6JyxcbiAgICAgICAgdXBweVNlcnZlckVycm9yOiAnQ29ubmVjdGlvbiB3aXRoIFVwcHkgU2VydmVyIGZhaWxlZCcsXG4gICAgICAgIGZhaWxlZFRvVXBsb2FkOiAnRmFpbGVkIHRvIHVwbG9hZCcsXG4gICAgICAgIG5vSW50ZXJuZXRDb25uZWN0aW9uOiAnTm8gSW50ZXJuZXQgY29ubmVjdGlvbicsXG4gICAgICAgIGNvbm5lY3RlZFRvSW50ZXJuZXQ6ICdDb25uZWN0ZWQgdG8gdGhlIEludGVybmV0JyxcbiAgICAgICAgbm9GaWxlc0ZvdW5kOiAnWW91IGhhdmUgbm8gZmlsZXMgb3IgZm9sZGVycyBoZXJlJ1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIGlkOiAndXBweScsXG4gICAgICBhdXRvUHJvY2VlZDogdHJ1ZSxcbiAgICAgIGRlYnVnOiBmYWxzZSxcbiAgICAgIHJlc3RyaWN0aW9uczoge1xuICAgICAgICBtYXhGaWxlU2l6ZTogbnVsbCxcbiAgICAgICAgbWF4TnVtYmVyT2ZGaWxlczogbnVsbCxcbiAgICAgICAgbWluTnVtYmVyT2ZGaWxlczogbnVsbCxcbiAgICAgICAgYWxsb3dlZEZpbGVUeXBlczogbnVsbFxuICAgICAgfSxcbiAgICAgIG1ldGE6IHt9LFxuICAgICAgb25CZWZvcmVGaWxlQWRkZWQ6IChjdXJyZW50RmlsZSwgZmlsZXMpID0+IGN1cnJlbnRGaWxlLFxuICAgICAgb25CZWZvcmVVcGxvYWQ6IChmaWxlcykgPT4gZmlsZXMsXG4gICAgICBsb2NhbGU6IGRlZmF1bHRMb2NhbGUsXG4gICAgICBzdG9yZTogRGVmYXVsdFN0b3JlKClcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBzZXQgYnkgdXNlclxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuICAgIHRoaXMub3B0cy5yZXN0cmljdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucy5yZXN0cmljdGlvbnMsIHRoaXMub3B0cy5yZXN0cmljdGlvbnMpXG5cbiAgICB0aGlzLmxvY2FsZSA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUsIHRoaXMub3B0cy5sb2NhbGUpXG4gICAgdGhpcy5sb2NhbGUuc3RyaW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUuc3RyaW5ncywgdGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzKVxuXG4gICAgLy8gaTE4blxuICAgIHRoaXMudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKHtsb2NhbGU6IHRoaXMubG9jYWxlfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuXG4gICAgLy8gQ29udGFpbmVyIGZvciBkaWZmZXJlbnQgdHlwZXMgb2YgcGx1Z2luc1xuICAgIHRoaXMucGx1Z2lucyA9IHt9XG5cbiAgICB0aGlzLmdldFN0YXRlID0gdGhpcy5nZXRTdGF0ZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5nZXRQbHVnaW4gPSB0aGlzLmdldFBsdWdpbi5iaW5kKHRoaXMpXG4gICAgdGhpcy5zZXRGaWxlTWV0YSA9IHRoaXMuc2V0RmlsZU1ldGEuYmluZCh0aGlzKVxuICAgIHRoaXMuc2V0RmlsZVN0YXRlID0gdGhpcy5zZXRGaWxlU3RhdGUuYmluZCh0aGlzKVxuICAgIHRoaXMubG9nID0gdGhpcy5sb2cuYmluZCh0aGlzKVxuICAgIHRoaXMuaW5mbyA9IHRoaXMuaW5mby5iaW5kKHRoaXMpXG4gICAgdGhpcy5oaWRlSW5mbyA9IHRoaXMuaGlkZUluZm8uYmluZCh0aGlzKVxuICAgIHRoaXMuYWRkRmlsZSA9IHRoaXMuYWRkRmlsZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZW1vdmVGaWxlID0gdGhpcy5yZW1vdmVGaWxlLmJpbmQodGhpcylcbiAgICB0aGlzLnBhdXNlUmVzdW1lID0gdGhpcy5wYXVzZVJlc3VtZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5fY2FsY3VsYXRlUHJvZ3Jlc3MgPSB0aGlzLl9jYWxjdWxhdGVQcm9ncmVzcy5iaW5kKHRoaXMpXG4gICAgdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMgPSB0aGlzLnVwZGF0ZU9ubGluZVN0YXR1cy5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZXNldFByb2dyZXNzID0gdGhpcy5yZXNldFByb2dyZXNzLmJpbmQodGhpcylcblxuICAgIHRoaXMucGF1c2VBbGwgPSB0aGlzLnBhdXNlQWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnJlc3VtZUFsbCA9IHRoaXMucmVzdW1lQWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnJldHJ5QWxsID0gdGhpcy5yZXRyeUFsbC5iaW5kKHRoaXMpXG4gICAgdGhpcy5jYW5jZWxBbGwgPSB0aGlzLmNhbmNlbEFsbC5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZXRyeVVwbG9hZCA9IHRoaXMucmV0cnlVcGxvYWQuYmluZCh0aGlzKVxuICAgIHRoaXMudXBsb2FkID0gdGhpcy51cGxvYWQuYmluZCh0aGlzKVxuXG4gICAgdGhpcy5lbWl0dGVyID0gZWUoKVxuICAgIHRoaXMub24gPSB0aGlzLm9uLmJpbmQodGhpcylcbiAgICB0aGlzLm9mZiA9IHRoaXMub2ZmLmJpbmQodGhpcylcbiAgICB0aGlzLm9uY2UgPSB0aGlzLmVtaXR0ZXIub25jZS5iaW5kKHRoaXMuZW1pdHRlcilcbiAgICB0aGlzLmVtaXQgPSB0aGlzLmVtaXR0ZXIuZW1pdC5iaW5kKHRoaXMuZW1pdHRlcilcblxuICAgIHRoaXMucHJlUHJvY2Vzc29ycyA9IFtdXG4gICAgdGhpcy51cGxvYWRlcnMgPSBbXVxuICAgIHRoaXMucG9zdFByb2Nlc3NvcnMgPSBbXVxuXG4gICAgdGhpcy5zdG9yZSA9IHRoaXMub3B0cy5zdG9yZVxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgcGx1Z2luczoge30sXG4gICAgICBmaWxlczoge30sXG4gICAgICBjdXJyZW50VXBsb2Fkczoge30sXG4gICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgcmVzdW1hYmxlVXBsb2FkczogZmFsc2VcbiAgICAgIH0sXG4gICAgICB0b3RhbFByb2dyZXNzOiAwLFxuICAgICAgbWV0YTogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5vcHRzLm1ldGEpLFxuICAgICAgaW5mbzoge1xuICAgICAgICBpc0hpZGRlbjogdHJ1ZSxcbiAgICAgICAgdHlwZTogJ2luZm8nLFxuICAgICAgICBtZXNzYWdlOiAnJ1xuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLl9zdG9yZVVuc3Vic2NyaWJlID0gdGhpcy5zdG9yZS5zdWJzY3JpYmUoKHByZXZTdGF0ZSwgbmV4dFN0YXRlLCBwYXRjaCkgPT4ge1xuICAgICAgdGhpcy5lbWl0KCdzdGF0ZS11cGRhdGUnLCBwcmV2U3RhdGUsIG5leHRTdGF0ZSwgcGF0Y2gpXG4gICAgICB0aGlzLnVwZGF0ZUFsbChuZXh0U3RhdGUpXG4gICAgfSlcblxuICAgIC8vIGZvciBkZWJ1Z2dpbmcgYW5kIHRlc3RpbmdcbiAgICAvLyB0aGlzLnVwZGF0ZU51bSA9IDBcbiAgICBpZiAodGhpcy5vcHRzLmRlYnVnICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB3aW5kb3dbJ3VwcHlMb2cnXSA9ICcnXG4gICAgICB3aW5kb3dbdGhpcy5vcHRzLmlkXSA9IHRoaXNcbiAgICB9XG5cbiAgICB0aGlzLl9hZGRMaXN0ZW5lcnMoKVxuICB9XG5cbiAgb24gKGV2ZW50LCBjYWxsYmFjaykge1xuICAgIHRoaXMuZW1pdHRlci5vbihldmVudCwgY2FsbGJhY2spXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIG9mZiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5lbWl0dGVyLm9mZihldmVudCwgY2FsbGJhY2spXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIG9uIGFsbCBwbHVnaW5zIGFuZCBydW4gYHVwZGF0ZWAgb24gdGhlbS5cbiAgICogQ2FsbGVkIGVhY2ggdGltZSBzdGF0ZSBjaGFuZ2VzLlxuICAgKlxuICAgKi9cbiAgdXBkYXRlQWxsIChzdGF0ZSkge1xuICAgIHRoaXMuaXRlcmF0ZVBsdWdpbnMocGx1Z2luID0+IHtcbiAgICAgIHBsdWdpbi51cGRhdGUoc3RhdGUpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHN0YXRlIHdpdGggYSBwYXRjaFxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGF0Y2gge2ZvbzogJ2Jhcid9XG4gICAqL1xuICBzZXRTdGF0ZSAocGF0Y2gpIHtcbiAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHBhdGNoKVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgY3VycmVudCBzdGF0ZS5cbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlLmdldFN0YXRlKClcbiAgfVxuXG4gIC8qKlxuICAqIEJhY2sgY29tcGF0IGZvciB3aGVuIHRoaXMuc3RhdGUgaXMgdXNlZCBpbnN0ZWFkIG9mIHRoaXMuZ2V0U3RhdGUoKS5cbiAgKi9cbiAgZ2V0IHN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpXG4gIH1cblxuICAvKipcbiAgKiBTaG9ydGhhbmQgdG8gc2V0IHN0YXRlIGZvciBhIHNwZWNpZmljIGZpbGUuXG4gICovXG4gIHNldEZpbGVTdGF0ZSAoZmlsZUlELCBzdGF0ZSkge1xuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcywge1xuICAgICAgICBbZmlsZUlEXTogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzW2ZpbGVJRF0sIHN0YXRlKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgcmVzZXRQcm9ncmVzcyAoKSB7XG4gICAgY29uc3QgZGVmYXVsdFByb2dyZXNzID0ge1xuICAgICAgcGVyY2VudGFnZTogMCxcbiAgICAgIGJ5dGVzVXBsb2FkZWQ6IDAsXG4gICAgICB1cGxvYWRDb21wbGV0ZTogZmFsc2UsXG4gICAgICB1cGxvYWRTdGFydGVkOiBmYWxzZVxuICAgIH1cbiAgICBjb25zdCBmaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSB7fVxuICAgIE9iamVjdC5rZXlzKGZpbGVzKS5mb3JFYWNoKGZpbGVJRCA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzW2ZpbGVJRF0pXG4gICAgICB1cGRhdGVkRmlsZS5wcm9ncmVzcyA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlLnByb2dyZXNzLCBkZWZhdWx0UHJvZ3Jlc3MpXG4gICAgICB1cGRhdGVkRmlsZXNbZmlsZUlEXSA9IHVwZGF0ZWRGaWxlXG4gICAgfSlcblxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IHVwZGF0ZWRGaWxlcyxcbiAgICAgIHRvdGFsUHJvZ3Jlc3M6IDBcbiAgICB9KVxuXG4gICAgLy8gVE9ETyBEb2N1bWVudCBvbiB0aGUgd2Vic2l0ZVxuICAgIHRoaXMuZW1pdCgncmVzZXQtcHJvZ3Jlc3MnKVxuICB9XG5cbiAgYWRkUHJlUHJvY2Vzc29yIChmbikge1xuICAgIHRoaXMucHJlUHJvY2Vzc29ycy5wdXNoKGZuKVxuICB9XG5cbiAgcmVtb3ZlUHJlUHJvY2Vzc29yIChmbikge1xuICAgIGNvbnN0IGkgPSB0aGlzLnByZVByb2Nlc3NvcnMuaW5kZXhPZihmbilcbiAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgIHRoaXMucHJlUHJvY2Vzc29ycy5zcGxpY2UoaSwgMSlcbiAgICB9XG4gIH1cblxuICBhZGRQb3N0UHJvY2Vzc29yIChmbikge1xuICAgIHRoaXMucG9zdFByb2Nlc3NvcnMucHVzaChmbilcbiAgfVxuXG4gIHJlbW92ZVBvc3RQcm9jZXNzb3IgKGZuKSB7XG4gICAgY29uc3QgaSA9IHRoaXMucG9zdFByb2Nlc3NvcnMuaW5kZXhPZihmbilcbiAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgIHRoaXMucG9zdFByb2Nlc3NvcnMuc3BsaWNlKGksIDEpXG4gICAgfVxuICB9XG5cbiAgYWRkVXBsb2FkZXIgKGZuKSB7XG4gICAgdGhpcy51cGxvYWRlcnMucHVzaChmbilcbiAgfVxuXG4gIHJlbW92ZVVwbG9hZGVyIChmbikge1xuICAgIGNvbnN0IGkgPSB0aGlzLnVwbG9hZGVycy5pbmRleE9mKGZuKVxuICAgIGlmIChpICE9PSAtMSkge1xuICAgICAgdGhpcy51cGxvYWRlcnMuc3BsaWNlKGksIDEpXG4gICAgfVxuICB9XG5cbiAgc2V0TWV0YSAoZGF0YSkge1xuICAgIGNvbnN0IHVwZGF0ZWRNZXRhID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLm1ldGEsIGRhdGEpXG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuXG4gICAgT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5mb3JFYWNoKChmaWxlSUQpID0+IHtcbiAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlSURdID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0sIHtcbiAgICAgICAgbWV0YTogT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0ubWV0YSwgZGF0YSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHRoaXMubG9nKCdBZGRpbmcgbWV0YWRhdGE6JylcbiAgICB0aGlzLmxvZyhkYXRhKVxuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBtZXRhOiB1cGRhdGVkTWV0YSxcbiAgICAgIGZpbGVzOiB1cGRhdGVkRmlsZXNcbiAgICB9KVxuICB9XG5cbiAgc2V0RmlsZU1ldGEgKGZpbGVJRCwgZGF0YSkge1xuICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICBpZiAoIXVwZGF0ZWRGaWxlc1tmaWxlSURdKSB7XG4gICAgICB0aGlzLmxvZygnV2FzIHRyeWluZyB0byBzZXQgbWV0YWRhdGEgZm9yIGEgZmlsZSB0aGF04oCZcyBub3Qgd2l0aCB1cyBhbnltb3JlOiAnLCBmaWxlSUQpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgbmV3TWV0YSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLm1ldGEsIGRhdGEpXG4gICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZUlEXSwge1xuICAgICAgbWV0YTogbmV3TWV0YVxuICAgIH0pXG4gICAgdGhpcy5zZXRTdGF0ZSh7ZmlsZXM6IHVwZGF0ZWRGaWxlc30pXG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgZmlsZSBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSUQgVGhlIElEIG9mIHRoZSBmaWxlIG9iamVjdCB0byByZXR1cm4uXG4gICAqL1xuICBnZXRGaWxlIChmaWxlSUQpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpLmZpbGVzW2ZpbGVJRF1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGZpbGVzIGluIGFuIGFycmF5LlxuICAgKi9cbiAgZ2V0RmlsZXMgKCkge1xuICAgIGNvbnN0IHsgZmlsZXMgfSA9IHRoaXMuZ2V0U3RhdGUoKVxuICAgIHJldHVybiBPYmplY3Qua2V5cyhmaWxlcykubWFwKChmaWxlSUQpID0+IGZpbGVzW2ZpbGVJRF0pXG4gIH1cblxuICAvKipcbiAgKiBDaGVjayBpZiBtaW5OdW1iZXJPZkZpbGVzIHJlc3RyaWN0aW9uIGlzIHJlYWNoZWQgYmVmb3JlIHVwbG9hZGluZy5cbiAgKlxuICAqIEBwcml2YXRlXG4gICovXG4gIF9jaGVja01pbk51bWJlck9mRmlsZXMgKGZpbGVzKSB7XG4gICAgY29uc3Qge21pbk51bWJlck9mRmlsZXN9ID0gdGhpcy5vcHRzLnJlc3RyaWN0aW9uc1xuICAgIGlmIChPYmplY3Qua2V5cyhmaWxlcykubGVuZ3RoIDwgbWluTnVtYmVyT2ZGaWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXMuaTE4bigneW91SGF2ZVRvQXRMZWFzdFNlbGVjdFgnLCB7IHNtYXJ0X2NvdW50OiBtaW5OdW1iZXJPZkZpbGVzIH0pfWApXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ2hlY2sgaWYgZmlsZSBwYXNzZXMgYSBzZXQgb2YgcmVzdHJpY3Rpb25zIHNldCBpbiBvcHRpb25zOiBtYXhGaWxlU2l6ZSxcbiAgKiBtYXhOdW1iZXJPZkZpbGVzIGFuZCBhbGxvd2VkRmlsZVR5cGVzLlxuICAqXG4gICogQHBhcmFtIHtvYmplY3R9IGZpbGUgb2JqZWN0IHRvIGNoZWNrXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2NoZWNrUmVzdHJpY3Rpb25zIChmaWxlKSB7XG4gICAgY29uc3Qge21heEZpbGVTaXplLCBtYXhOdW1iZXJPZkZpbGVzLCBhbGxvd2VkRmlsZVR5cGVzfSA9IHRoaXMub3B0cy5yZXN0cmljdGlvbnNcblxuICAgIGlmIChtYXhOdW1iZXJPZkZpbGVzKSB7XG4gICAgICBpZiAoT2JqZWN0LmtleXModGhpcy5nZXRTdGF0ZSgpLmZpbGVzKS5sZW5ndGggKyAxID4gbWF4TnVtYmVyT2ZGaWxlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7dGhpcy5pMThuKCd5b3VDYW5Pbmx5VXBsb2FkWCcsIHsgc21hcnRfY291bnQ6IG1heE51bWJlck9mRmlsZXMgfSl9YClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYWxsb3dlZEZpbGVUeXBlcykge1xuICAgICAgY29uc3QgaXNDb3JyZWN0RmlsZVR5cGUgPSBhbGxvd2VkRmlsZVR5cGVzLmZpbHRlcigodHlwZSkgPT4ge1xuICAgICAgICAvLyBpZiAoIWZpbGUudHlwZSkgcmV0dXJuIGZhbHNlXG5cbiAgICAgICAgLy8gaXMgdGhpcyBpcyBhIG1pbWUtdHlwZVxuICAgICAgICBpZiAodHlwZS5pbmRleE9mKCcvJykgPiAtMSkge1xuICAgICAgICAgIGlmICghZmlsZS50eXBlKSByZXR1cm4gZmFsc2VcbiAgICAgICAgICByZXR1cm4gbWF0Y2goZmlsZS50eXBlLCB0eXBlKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoaXMgaXMgbGlrZWx5IGFuIGV4dGVuc2lvblxuICAgICAgICBpZiAodHlwZVswXSA9PT0gJy4nKSB7XG4gICAgICAgICAgaWYgKGZpbGUuZXh0ZW5zaW9uID09PSB0eXBlLnN1YnN0cigxKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUuZXh0ZW5zaW9uXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KS5sZW5ndGggPiAwXG5cbiAgICAgIGlmICghaXNDb3JyZWN0RmlsZVR5cGUpIHtcbiAgICAgICAgY29uc3QgYWxsb3dlZEZpbGVUeXBlc1N0cmluZyA9IGFsbG93ZWRGaWxlVHlwZXMuam9pbignLCAnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7dGhpcy5pMThuKCd5b3VDYW5Pbmx5VXBsb2FkRmlsZVR5cGVzJyl9ICR7YWxsb3dlZEZpbGVUeXBlc1N0cmluZ31gKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXhGaWxlU2l6ZSkge1xuICAgICAgaWYgKGZpbGUuZGF0YS5zaXplID4gbWF4RmlsZVNpemUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXMuaTE4bignZXhjZWVkc1NpemUnKX0gJHtwcmV0dHlCeXRlcyhtYXhGaWxlU2l6ZSl9YClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBBZGQgYSBuZXcgZmlsZSB0byBgc3RhdGUuZmlsZXNgLiBUaGlzIHdpbGwgcnVuIGBvbkJlZm9yZUZpbGVBZGRlZGAsXG4gICogdHJ5IHRvIGd1ZXNzIGZpbGUgdHlwZSBpbiBhIGNsZXZlciB3YXksIGNoZWNrIGZpbGUgYWdhaW5zdCByZXN0cmljdGlvbnMsXG4gICogYW5kIHN0YXJ0IGFuIHVwbG9hZCBpZiBgYXV0b1Byb2NlZWQgPT09IHRydWVgLlxuICAqXG4gICogQHBhcmFtIHtvYmplY3R9IGZpbGUgb2JqZWN0IHRvIGFkZFxuICAqL1xuICBhZGRGaWxlIChmaWxlKSB7XG4gICAgY29uc3QgeyBmaWxlcyB9ID0gdGhpcy5nZXRTdGF0ZSgpXG5cbiAgICBjb25zdCBvbkVycm9yID0gKG1zZykgPT4ge1xuICAgICAgY29uc3QgZXJyID0gdHlwZW9mIG1zZyA9PT0gJ29iamVjdCcgPyBtc2cgOiBuZXcgRXJyb3IobXNnKVxuICAgICAgdGhpcy5sb2coZXJyLm1lc3NhZ2UpXG4gICAgICB0aGlzLmluZm8oZXJyLm1lc3NhZ2UsICdlcnJvcicsIDUwMDApXG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG5cbiAgICBjb25zdCBvbkJlZm9yZUZpbGVBZGRlZFJlc3VsdCA9IHRoaXMub3B0cy5vbkJlZm9yZUZpbGVBZGRlZChmaWxlLCBmaWxlcylcblxuICAgIGlmIChvbkJlZm9yZUZpbGVBZGRlZFJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgIHRoaXMubG9nKCdOb3QgYWRkaW5nIGZpbGUgYmVjYXVzZSBvbkJlZm9yZUZpbGVBZGRlZCByZXR1cm5lZCBmYWxzZScpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9uQmVmb3JlRmlsZUFkZGVkUmVzdWx0ID09PSAnb2JqZWN0JyAmJiBvbkJlZm9yZUZpbGVBZGRlZFJlc3VsdCkge1xuICAgICAgLy8gd2FybmluZyBhZnRlciB0aGUgY2hhbmdlIGluIDAuMjRcbiAgICAgIGlmIChvbkJlZm9yZUZpbGVBZGRlZFJlc3VsdC50aGVuKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29uQmVmb3JlRmlsZUFkZGVkKCkgcmV0dXJuZWQgYSBQcm9taXNlLCBidXQgdGhpcyBpcyBubyBsb25nZXIgc3VwcG9ydGVkLiBJdCBtdXN0IGJlIHN5bmNocm9ub3VzLicpXG4gICAgICB9XG4gICAgICBmaWxlID0gb25CZWZvcmVGaWxlQWRkZWRSZXN1bHRcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlVHlwZSA9IFV0aWxzLmdldEZpbGVUeXBlKGZpbGUpXG4gICAgbGV0IGZpbGVOYW1lXG4gICAgaWYgKGZpbGUubmFtZSkge1xuICAgICAgZmlsZU5hbWUgPSBmaWxlLm5hbWVcbiAgICB9IGVsc2UgaWYgKGZpbGVUeXBlLnNwbGl0KCcvJylbMF0gPT09ICdpbWFnZScpIHtcbiAgICAgIGZpbGVOYW1lID0gZmlsZVR5cGUuc3BsaXQoJy8nKVswXSArICcuJyArIGZpbGVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZU5hbWUgPSAnbm9uYW1lJ1xuICAgIH1cbiAgICBjb25zdCBmaWxlRXh0ZW5zaW9uID0gVXRpbHMuZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24oZmlsZU5hbWUpLmV4dGVuc2lvblxuICAgIGNvbnN0IGlzUmVtb3RlID0gZmlsZS5pc1JlbW90ZSB8fCBmYWxzZVxuXG4gICAgY29uc3QgZmlsZUlEID0gVXRpbHMuZ2VuZXJhdGVGaWxlSUQoZmlsZSlcblxuICAgIGNvbnN0IG1ldGEgPSBmaWxlLm1ldGEgfHwge31cbiAgICBtZXRhLm5hbWUgPSBmaWxlTmFtZVxuICAgIG1ldGEudHlwZSA9IGZpbGVUeXBlXG5cbiAgICBjb25zdCBuZXdGaWxlID0ge1xuICAgICAgc291cmNlOiBmaWxlLnNvdXJjZSB8fCAnJyxcbiAgICAgIGlkOiBmaWxlSUQsXG4gICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgIGV4dGVuc2lvbjogZmlsZUV4dGVuc2lvbiB8fCAnJyxcbiAgICAgIG1ldGE6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5tZXRhLCBtZXRhKSxcbiAgICAgIHR5cGU6IGZpbGVUeXBlLFxuICAgICAgZGF0YTogZmlsZS5kYXRhLFxuICAgICAgcHJvZ3Jlc3M6IHtcbiAgICAgICAgcGVyY2VudGFnZTogMCxcbiAgICAgICAgYnl0ZXNVcGxvYWRlZDogMCxcbiAgICAgICAgYnl0ZXNUb3RhbDogZmlsZS5kYXRhLnNpemUgfHwgMCxcbiAgICAgICAgdXBsb2FkQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICB1cGxvYWRTdGFydGVkOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIHNpemU6IGZpbGUuZGF0YS5zaXplIHx8IDAsXG4gICAgICBpc1JlbW90ZTogaXNSZW1vdGUsXG4gICAgICByZW1vdGU6IGZpbGUucmVtb3RlIHx8ICcnLFxuICAgICAgcHJldmlldzogZmlsZS5wcmV2aWV3XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX2NoZWNrUmVzdHJpY3Rpb25zKG5ld0ZpbGUpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBvbkVycm9yKGVycilcbiAgICB9XG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGZpbGVzOiBPYmplY3QuYXNzaWduKHt9LCBmaWxlcywge1xuICAgICAgICBbZmlsZUlEXTogbmV3RmlsZVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5lbWl0KCdmaWxlLWFkZGVkJywgbmV3RmlsZSlcbiAgICB0aGlzLmxvZyhgQWRkZWQgZmlsZTogJHtmaWxlTmFtZX0sICR7ZmlsZUlEfSwgbWltZSB0eXBlOiAke2ZpbGVUeXBlfWApXG5cbiAgICBpZiAodGhpcy5vcHRzLmF1dG9Qcm9jZWVkICYmICF0aGlzLnNjaGVkdWxlZEF1dG9Qcm9jZWVkKSB7XG4gICAgICB0aGlzLnNjaGVkdWxlZEF1dG9Qcm9jZWVkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVkQXV0b1Byb2NlZWQgPSBudWxsXG4gICAgICAgIHRoaXMudXBsb2FkKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyLnN0YWNrIHx8IGVyci5tZXNzYWdlIHx8IGVycilcbiAgICAgICAgfSlcbiAgICAgIH0sIDQpXG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlRmlsZSAoZmlsZUlEKSB7XG4gICAgY29uc3QgeyBmaWxlcywgY3VycmVudFVwbG9hZHMgfSA9IHRoaXMuc3RhdGVcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlcylcbiAgICBjb25zdCByZW1vdmVkRmlsZSA9IHVwZGF0ZWRGaWxlc1tmaWxlSURdXG4gICAgZGVsZXRlIHVwZGF0ZWRGaWxlc1tmaWxlSURdXG5cbiAgICAvLyBSZW1vdmUgdGhpcyBmaWxlIGZyb20gaXRzIGBjdXJyZW50VXBsb2FkYC5cbiAgICBjb25zdCB1cGRhdGVkVXBsb2FkcyA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzKVxuICAgIGNvbnN0IHJlbW92ZVVwbG9hZHMgPSBbXVxuICAgIE9iamVjdC5rZXlzKHVwZGF0ZWRVcGxvYWRzKS5mb3JFYWNoKCh1cGxvYWRJRCkgPT4ge1xuICAgICAgY29uc3QgbmV3RmlsZUlEcyA9IGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXS5maWxlSURzLmZpbHRlcigodXBsb2FkRmlsZUlEKSA9PiB1cGxvYWRGaWxlSUQgIT09IGZpbGVJRClcbiAgICAgIC8vIFJlbW92ZSB0aGUgdXBsb2FkIGlmIG5vIGZpbGVzIGFyZSBhc3NvY2lhdGVkIHdpdGggaXQgYW55bW9yZS5cbiAgICAgIGlmIChuZXdGaWxlSURzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZW1vdmVVcGxvYWRzLnB1c2godXBsb2FkSUQpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB1cGRhdGVkVXBsb2Fkc1t1cGxvYWRJRF0gPSBPYmplY3QuYXNzaWduKHt9LCBjdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0sIHtcbiAgICAgICAgZmlsZUlEczogbmV3RmlsZUlEc1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBjdXJyZW50VXBsb2FkczogdXBkYXRlZFVwbG9hZHMsXG4gICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgfSlcblxuICAgIHJlbW92ZVVwbG9hZHMuZm9yRWFjaCgodXBsb2FkSUQpID0+IHtcbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZCh1cGxvYWRJRClcbiAgICB9KVxuXG4gICAgdGhpcy5fY2FsY3VsYXRlVG90YWxQcm9ncmVzcygpXG4gICAgdGhpcy5lbWl0KCdmaWxlLXJlbW92ZWQnLCByZW1vdmVkRmlsZSlcbiAgICB0aGlzLmxvZyhgRmlsZSByZW1vdmVkOiAke3JlbW92ZWRGaWxlLmlkfWApXG5cbiAgICAvLyBDbGVhbiB1cCBvYmplY3QgVVJMcy5cbiAgICBpZiAocmVtb3ZlZEZpbGUucHJldmlldyAmJiBVdGlscy5pc09iamVjdFVSTChyZW1vdmVkRmlsZS5wcmV2aWV3KSkge1xuICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChyZW1vdmVkRmlsZS5wcmV2aWV3KVxuICAgIH1cblxuICAgIHRoaXMubG9nKGBSZW1vdmVkIGZpbGU6ICR7ZmlsZUlEfWApXG4gIH1cblxuICBwYXVzZVJlc3VtZSAoZmlsZUlEKSB7XG4gICAgaWYgKHRoaXMuZ2V0RmlsZShmaWxlSUQpLnVwbG9hZENvbXBsZXRlKSByZXR1cm5cblxuICAgIGNvbnN0IHdhc1BhdXNlZCA9IHRoaXMuZ2V0RmlsZShmaWxlSUQpLmlzUGF1c2VkIHx8IGZhbHNlXG4gICAgY29uc3QgaXNQYXVzZWQgPSAhd2FzUGF1c2VkXG5cbiAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlSUQsIHtcbiAgICAgIGlzUGF1c2VkOiBpc1BhdXNlZFxuICAgIH0pXG5cbiAgICB0aGlzLmVtaXQoJ3VwbG9hZC1wYXVzZScsIGZpbGVJRCwgaXNQYXVzZWQpXG5cbiAgICByZXR1cm4gaXNQYXVzZWRcbiAgfVxuXG4gIHBhdXNlQWxsICgpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgaW5Qcm9ncmVzc1VwZGF0ZWRGaWxlcyA9IE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gIXVwZGF0ZWRGaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRDb21wbGV0ZSAmJlxuICAgICAgICAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRTdGFydGVkXG4gICAgfSlcblxuICAgIGluUHJvZ3Jlc3NVcGRhdGVkRmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZV0sIHtcbiAgICAgICAgaXNQYXVzZWQ6IHRydWVcbiAgICAgIH0pXG4gICAgICB1cGRhdGVkRmlsZXNbZmlsZV0gPSB1cGRhdGVkRmlsZVxuICAgIH0pXG4gICAgdGhpcy5zZXRTdGF0ZSh7ZmlsZXM6IHVwZGF0ZWRGaWxlc30pXG5cbiAgICB0aGlzLmVtaXQoJ3BhdXNlLWFsbCcpXG4gIH1cblxuICByZXN1bWVBbGwgKCkge1xuICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICBjb25zdCBpblByb2dyZXNzVXBkYXRlZEZpbGVzID0gT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgIHJldHVybiAhdXBkYXRlZEZpbGVzW2ZpbGVdLnByb2dyZXNzLnVwbG9hZENvbXBsZXRlICYmXG4gICAgICAgICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdLnByb2dyZXNzLnVwbG9hZFN0YXJ0ZWRcbiAgICB9KVxuXG4gICAgaW5Qcm9ncmVzc1VwZGF0ZWRGaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlXSwge1xuICAgICAgICBpc1BhdXNlZDogZmFsc2UsXG4gICAgICAgIGVycm9yOiBudWxsXG4gICAgICB9KVxuICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdID0gdXBkYXRlZEZpbGVcbiAgICB9KVxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgdGhpcy5lbWl0KCdyZXN1bWUtYWxsJylcbiAgfVxuXG4gIHJldHJ5QWxsICgpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgZmlsZXNUb1JldHJ5ID0gT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5maWx0ZXIoZmlsZSA9PiB7XG4gICAgICByZXR1cm4gdXBkYXRlZEZpbGVzW2ZpbGVdLmVycm9yXG4gICAgfSlcblxuICAgIGZpbGVzVG9SZXRyeS5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlXSwge1xuICAgICAgICBpc1BhdXNlZDogZmFsc2UsXG4gICAgICAgIGVycm9yOiBudWxsXG4gICAgICB9KVxuICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdID0gdXBkYXRlZEZpbGVcbiAgICB9KVxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IHVwZGF0ZWRGaWxlcyxcbiAgICAgIGVycm9yOiBudWxsXG4gICAgfSlcblxuICAgIHRoaXMuZW1pdCgncmV0cnktYWxsJywgZmlsZXNUb1JldHJ5KVxuXG4gICAgY29uc3QgdXBsb2FkSUQgPSB0aGlzLl9jcmVhdGVVcGxvYWQoZmlsZXNUb1JldHJ5KVxuICAgIHJldHVybiB0aGlzLl9ydW5VcGxvYWQodXBsb2FkSUQpXG4gIH1cblxuICBjYW5jZWxBbGwgKCkge1xuICAgIHRoaXMuZW1pdCgnY2FuY2VsLWFsbCcpXG5cbiAgICAvLyBUT0RPIE9yIHNob3VsZCB3ZSBqdXN0IGNhbGwgcmVtb3ZlRmlsZSBvbiBhbGwgZmlsZXM/XG4gICAgY29uc3QgeyBjdXJyZW50VXBsb2FkcyB9ID0gdGhpcy5nZXRTdGF0ZSgpXG4gICAgY29uc3QgdXBsb2FkSURzID0gT2JqZWN0LmtleXMoY3VycmVudFVwbG9hZHMpXG5cbiAgICB1cGxvYWRJRHMuZm9yRWFjaCgoaWQpID0+IHtcbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZChpZClcbiAgICB9KVxuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBmaWxlczoge30sXG4gICAgICB0b3RhbFByb2dyZXNzOiAwXG4gICAgfSlcbiAgfVxuXG4gIHJldHJ5VXBsb2FkIChmaWxlSUQpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZUlEXSxcbiAgICAgIHsgZXJyb3I6IG51bGwsIGlzUGF1c2VkOiBmYWxzZSB9XG4gICAgKVxuICAgIHVwZGF0ZWRGaWxlc1tmaWxlSURdID0gdXBkYXRlZEZpbGVcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGZpbGVzOiB1cGRhdGVkRmlsZXNcbiAgICB9KVxuXG4gICAgdGhpcy5lbWl0KCd1cGxvYWQtcmV0cnknLCBmaWxlSUQpXG5cbiAgICBjb25zdCB1cGxvYWRJRCA9IHRoaXMuX2NyZWF0ZVVwbG9hZChbIGZpbGVJRCBdKVxuICAgIHJldHVybiB0aGlzLl9ydW5VcGxvYWQodXBsb2FkSUQpXG4gIH1cblxuICByZXNldCAoKSB7XG4gICAgdGhpcy5jYW5jZWxBbGwoKVxuICB9XG5cbiAgX2NhbGN1bGF0ZVByb2dyZXNzIChmaWxlLCBkYXRhKSB7XG4gICAgaWYgKCF0aGlzLmdldEZpbGUoZmlsZS5pZCkpIHtcbiAgICAgIHRoaXMubG9nKGBOb3Qgc2V0dGluZyBwcm9ncmVzcyBmb3IgYSBmaWxlIHRoYXQgaGFzIGJlZW4gcmVtb3ZlZDogJHtmaWxlLmlkfWApXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7XG4gICAgICBwcm9ncmVzczogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRGaWxlKGZpbGUuaWQpLnByb2dyZXNzLCB7XG4gICAgICAgIGJ5dGVzVXBsb2FkZWQ6IGRhdGEuYnl0ZXNVcGxvYWRlZCxcbiAgICAgICAgYnl0ZXNUb3RhbDogZGF0YS5ieXRlc1RvdGFsLFxuICAgICAgICBwZXJjZW50YWdlOiBNYXRoLmZsb29yKChkYXRhLmJ5dGVzVXBsb2FkZWQgLyBkYXRhLmJ5dGVzVG90YWwgKiAxMDApLnRvRml4ZWQoMikpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgfVxuXG4gIF9jYWxjdWxhdGVUb3RhbFByb2dyZXNzICgpIHtcbiAgICAvLyBjYWxjdWxhdGUgdG90YWwgcHJvZ3Jlc3MsIHVzaW5nIHRoZSBudW1iZXIgb2YgZmlsZXMgY3VycmVudGx5IHVwbG9hZGluZyxcbiAgICAvLyBtdWx0aXBsaWVkIGJ5IDEwMCBhbmQgdGhlIHN1bW0gb2YgaW5kaXZpZHVhbCBwcm9ncmVzcyBvZiBlYWNoIGZpbGVcbiAgICBjb25zdCBmaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcblxuICAgIGNvbnN0IGluUHJvZ3Jlc3MgPSBPYmplY3Qua2V5cyhmaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gZmlsZXNbZmlsZV0ucHJvZ3Jlc3MudXBsb2FkU3RhcnRlZFxuICAgIH0pXG4gICAgY29uc3QgcHJvZ3Jlc3NNYXggPSBpblByb2dyZXNzLmxlbmd0aCAqIDEwMFxuICAgIGxldCBwcm9ncmVzc0FsbCA9IDBcbiAgICBpblByb2dyZXNzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIHByb2dyZXNzQWxsID0gcHJvZ3Jlc3NBbGwgKyBmaWxlc1tmaWxlXS5wcm9ncmVzcy5wZXJjZW50YWdlXG4gICAgfSlcblxuICAgIGNvbnN0IHRvdGFsUHJvZ3Jlc3MgPSBwcm9ncmVzc01heCA9PT0gMCA/IDAgOiBNYXRoLmZsb29yKChwcm9ncmVzc0FsbCAqIDEwMCAvIHByb2dyZXNzTWF4KS50b0ZpeGVkKDIpKVxuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICB0b3RhbFByb2dyZXNzOiB0b3RhbFByb2dyZXNzXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgbGlzdGVuZXJzIGZvciBhbGwgZ2xvYmFsIGFjdGlvbnMsIGxpa2U6XG4gICAqIGBlcnJvcmAsIGBmaWxlLXJlbW92ZWRgLCBgdXBsb2FkLXByb2dyZXNzYFxuICAgKi9cbiAgX2FkZExpc3RlbmVycyAoKSB7XG4gICAgdGhpcy5vbignZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCd1cGxvYWQtZXJyb3InLCAoZmlsZSwgZXJyb3IpID0+IHtcbiAgICAgIHRoaXMuc2V0RmlsZVN0YXRlKGZpbGUuaWQsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSlcbiAgICAgIHRoaXMuc2V0U3RhdGUoeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KVxuXG4gICAgICBsZXQgbWVzc2FnZVxuICAgICAgbWVzc2FnZSA9IGAke3RoaXMuaTE4bignZmFpbGVkVG9VcGxvYWQnKX0gJHtmaWxlLm5hbWV9YFxuICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgZXJyb3IubWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlID0geyBtZXNzYWdlOiBtZXNzYWdlLCBkZXRhaWxzOiBlcnJvci5tZXNzYWdlIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuaW5mbyhtZXNzYWdlLCAnZXJyb3InLCA1MDAwKVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCd1cGxvYWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLnNldFN0YXRlKHsgZXJyb3I6IG51bGwgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigndXBsb2FkLXN0YXJ0ZWQnLCAoZmlsZSwgdXBsb2FkKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuZ2V0RmlsZShmaWxlLmlkKSkge1xuICAgICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbW92ZWQ6ICR7ZmlsZS5pZH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0RmlsZVN0YXRlKGZpbGUuaWQsIHtcbiAgICAgICAgcHJvZ3Jlc3M6IHtcbiAgICAgICAgICB1cGxvYWRTdGFydGVkOiBEYXRlLm5vdygpLFxuICAgICAgICAgIHVwbG9hZENvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgICBwZXJjZW50YWdlOiAwLFxuICAgICAgICAgIGJ5dGVzVXBsb2FkZWQ6IDAsXG4gICAgICAgICAgYnl0ZXNUb3RhbDogZmlsZS5zaXplXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIHVwbG9hZCBwcm9ncmVzcyBldmVudHMgY2FuIG9jY3VyIGZyZXF1ZW50bHksIGVzcGVjaWFsbHkgd2hlbiB5b3UgaGF2ZSBhIGdvb2RcbiAgICAvLyBjb25uZWN0aW9uIHRvIHRoZSByZW1vdGUgc2VydmVyLiBUaGVyZWZvcmUsIHdlIGFyZSB0aHJvdHRlbGluZyB0aGVtIHRvXG4gICAgLy8gcHJldmVudCBhY2Nlc3NpdmUgZnVuY3Rpb24gY2FsbHMuXG4gICAgLy8gc2VlIGFsc286IGh0dHBzOi8vZ2l0aHViLmNvbS90dXMvdHVzLWpzLWNsaWVudC9jb21taXQvOTk0MGYyN2IyMzYxZmQ3ZTEwYmE1OGIwOWI2MGQ4MjQyMjE4M2JiYlxuICAgIGNvbnN0IF90aHJvdHRsZWRDYWxjdWxhdGVQcm9ncmVzcyA9IHRocm90dGxlKHRoaXMuX2NhbGN1bGF0ZVByb2dyZXNzLCAxMDAsIHsgbGVhZGluZzogdHJ1ZSwgdHJhaWxpbmc6IHRydWUgfSlcblxuICAgIHRoaXMub24oJ3VwbG9hZC1wcm9ncmVzcycsIF90aHJvdHRsZWRDYWxjdWxhdGVQcm9ncmVzcylcblxuICAgIHRoaXMub24oJ3VwbG9hZC1zdWNjZXNzJywgKGZpbGUsIHVwbG9hZFJlc3AsIHVwbG9hZFVSTCkgPT4ge1xuICAgICAgdGhpcy5zZXRGaWxlU3RhdGUoZmlsZS5pZCwge1xuICAgICAgICBwcm9ncmVzczogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRGaWxlKGZpbGUuaWQpLnByb2dyZXNzLCB7XG4gICAgICAgICAgdXBsb2FkQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgcGVyY2VudGFnZTogMTAwXG4gICAgICAgIH0pLFxuICAgICAgICB1cGxvYWRVUkw6IHVwbG9hZFVSTCxcbiAgICAgICAgaXNQYXVzZWQ6IGZhbHNlXG4gICAgICB9KVxuXG4gICAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncHJlcHJvY2Vzcy1wcm9ncmVzcycsIChmaWxlLCBwcm9ncmVzcykgPT4ge1xuICAgICAgaWYgKCF0aGlzLmdldEZpbGUoZmlsZS5pZCkpIHtcbiAgICAgICAgdGhpcy5sb2coYE5vdCBzZXR0aW5nIHByb2dyZXNzIGZvciBhIGZpbGUgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke2ZpbGUuaWR9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldEZpbGUoZmlsZS5pZCkucHJvZ3Jlc3MsIHtcbiAgICAgICAgICBwcmVwcm9jZXNzOiBwcm9ncmVzc1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncHJlcHJvY2Vzcy1jb21wbGV0ZScsIChmaWxlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuZ2V0RmlsZShmaWxlLmlkKSkge1xuICAgICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbW92ZWQ6ICR7ZmlsZS5pZH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGNvbnN0IGZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgICAgZmlsZXNbZmlsZS5pZF0gPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlLmlkXSwge1xuICAgICAgICBwcm9ncmVzczogT2JqZWN0LmFzc2lnbih7fSwgZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MpXG4gICAgICB9KVxuICAgICAgZGVsZXRlIGZpbGVzW2ZpbGUuaWRdLnByb2dyZXNzLnByZXByb2Nlc3NcblxuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGZpbGVzOiBmaWxlcyB9KVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCdwb3N0cHJvY2Vzcy1wcm9ncmVzcycsIChmaWxlLCBwcm9ncmVzcykgPT4ge1xuICAgICAgaWYgKCF0aGlzLmdldEZpbGUoZmlsZS5pZCkpIHtcbiAgICAgICAgdGhpcy5sb2coYE5vdCBzZXR0aW5nIHByb2dyZXNzIGZvciBhIGZpbGUgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke2ZpbGUuaWR9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MsIHtcbiAgICAgICAgICBwb3N0cHJvY2VzczogcHJvZ3Jlc3NcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHRoaXMub24oJ3Bvc3Rwcm9jZXNzLWNvbXBsZXRlJywgKGZpbGUpID0+IHtcbiAgICAgIGlmICghdGhpcy5nZXRGaWxlKGZpbGUuaWQpKSB7XG4gICAgICAgIHRoaXMubG9nKGBOb3Qgc2V0dGluZyBwcm9ncmVzcyBmb3IgYSBmaWxlIHRoYXQgaGFzIGJlZW4gcmVtb3ZlZDogJHtmaWxlLmlkfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY29uc3QgZmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgICBmaWxlc1tmaWxlLmlkXSA9IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzW2ZpbGUuaWRdLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlLmlkXS5wcm9ncmVzcylcbiAgICAgIH0pXG4gICAgICBkZWxldGUgZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MucG9zdHByb2Nlc3NcbiAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHNldCBzb21lIGtpbmQgb2YgYGZ1bGx5Q29tcGxldGVgIHByb3BlcnR5IG9uIHRoZSBmaWxlIG9iamVjdFxuICAgICAgLy8gc28gaXQncyBlYXNpZXIgdG8gc2VlIHRoYXQgdGhlIGZpbGUgaXMgdXBsb2Fk4oCmZnVsbHkgY29tcGxldGXigKZyYXRoZXIgdGhhblxuICAgICAgLy8gd2hhdCB3ZSBoYXZlIHRvIGRvIG5vdyAoYHVwbG9hZENvbXBsZXRlICYmICFwb3N0cHJvY2Vzc2ApXG5cbiAgICAgIHRoaXMuc2V0U3RhdGUoeyBmaWxlczogZmlsZXMgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncmVzdG9yZWQnLCAoKSA9PiB7XG4gICAgICAvLyBGaWxlcyBtYXkgaGF2ZSBjaGFuZ2VkLS1lbnN1cmUgcHJvZ3Jlc3MgaXMgc3RpbGwgYWNjdXJhdGUuXG4gICAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB9KVxuXG4gICAgLy8gc2hvdyBpbmZvcm1lciBpZiBvZmZsaW5lXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25saW5lJywgKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSlcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvZmZsaW5lJywgKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSlcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSwgMzAwMClcbiAgICB9XG4gIH1cblxuICB1cGRhdGVPbmxpbmVTdGF0dXMgKCkge1xuICAgIGNvbnN0IG9ubGluZSA9XG4gICAgICB0eXBlb2Ygd2luZG93Lm5hdmlnYXRvci5vbkxpbmUgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gd2luZG93Lm5hdmlnYXRvci5vbkxpbmVcbiAgICAgICAgOiB0cnVlXG4gICAgaWYgKCFvbmxpbmUpIHtcbiAgICAgIHRoaXMuZW1pdCgnaXMtb2ZmbGluZScpXG4gICAgICB0aGlzLmluZm8odGhpcy5pMThuKCdub0ludGVybmV0Q29ubmVjdGlvbicpLCAnZXJyb3InLCAwKVxuICAgICAgdGhpcy53YXNPZmZsaW5lID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVtaXQoJ2lzLW9ubGluZScpXG4gICAgICBpZiAodGhpcy53YXNPZmZsaW5lKSB7XG4gICAgICAgIHRoaXMuZW1pdCgnYmFjay1vbmxpbmUnKVxuICAgICAgICB0aGlzLmluZm8odGhpcy5pMThuKCdjb25uZWN0ZWRUb0ludGVybmV0JyksICdzdWNjZXNzJywgMzAwMClcbiAgICAgICAgdGhpcy53YXNPZmZsaW5lID0gZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRJRCAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0cy5pZFxuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIHBsdWdpbiB3aXRoIENvcmUuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBQbHVnaW4gb2JqZWN0XG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0c10gb2JqZWN0IHdpdGggb3B0aW9ucyB0byBiZSBwYXNzZWQgdG8gUGx1Z2luXG4gICAqIEByZXR1cm4ge09iamVjdH0gc2VsZiBmb3IgY2hhaW5pbmdcbiAgICovXG4gIHVzZSAoUGx1Z2luLCBvcHRzKSB7XG4gICAgaWYgKHR5cGVvZiBQbHVnaW4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGxldCBtc2cgPSBgRXhwZWN0ZWQgYSBwbHVnaW4gY2xhc3MsIGJ1dCBnb3QgJHtQbHVnaW4gPT09IG51bGwgPyAnbnVsbCcgOiB0eXBlb2YgUGx1Z2lufS5gICtcbiAgICAgICAgJyBQbGVhc2UgdmVyaWZ5IHRoYXQgdGhlIHBsdWdpbiB3YXMgaW1wb3J0ZWQgYW5kIHNwZWxsZWQgY29ycmVjdGx5LidcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobXNnKVxuICAgIH1cblxuICAgIC8vIEluc3RhbnRpYXRlXG4gICAgY29uc3QgcGx1Z2luID0gbmV3IFBsdWdpbih0aGlzLCBvcHRzKVxuICAgIGNvbnN0IHBsdWdpbklkID0gcGx1Z2luLmlkXG4gICAgdGhpcy5wbHVnaW5zW3BsdWdpbi50eXBlXSA9IHRoaXMucGx1Z2luc1twbHVnaW4udHlwZV0gfHwgW11cblxuICAgIGlmICghcGx1Z2luSWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91ciBwbHVnaW4gbXVzdCBoYXZlIGFuIGlkJylcbiAgICB9XG5cbiAgICBpZiAoIXBsdWdpbi50eXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdXIgcGx1Z2luIG11c3QgaGF2ZSBhIHR5cGUnKVxuICAgIH1cblxuICAgIGxldCBleGlzdHNQbHVnaW5BbHJlYWR5ID0gdGhpcy5nZXRQbHVnaW4ocGx1Z2luSWQpXG4gICAgaWYgKGV4aXN0c1BsdWdpbkFscmVhZHkpIHtcbiAgICAgIGxldCBtc2cgPSBgQWxyZWFkeSBmb3VuZCBhIHBsdWdpbiBuYW1lZCAnJHtleGlzdHNQbHVnaW5BbHJlYWR5LmlkfScuIGAgK1xuICAgICAgICBgVHJpZWQgdG8gdXNlOiAnJHtwbHVnaW5JZH0nLlxcbmAgK1xuICAgICAgICBgVXBweSBwbHVnaW5zIG11c3QgaGF2ZSB1bmlxdWUgJ2lkJyBvcHRpb25zLiBTZWUgaHR0cHM6Ly91cHB5LmlvL2RvY3MvcGx1Z2lucy8jaWQuYFxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZylcbiAgICB9XG5cbiAgICB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdLnB1c2gocGx1Z2luKVxuICAgIHBsdWdpbi5pbnN0YWxsKClcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogRmluZCBvbmUgUGx1Z2luIGJ5IG5hbWUuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIGRlc2NyaXB0aW9uXG4gICAqIEByZXR1cm4ge29iamVjdCB8IGJvb2xlYW59XG4gICAqL1xuICBnZXRQbHVnaW4gKG5hbWUpIHtcbiAgICBsZXQgZm91bmRQbHVnaW4gPSBudWxsXG4gICAgdGhpcy5pdGVyYXRlUGx1Z2lucygocGx1Z2luKSA9PiB7XG4gICAgICBjb25zdCBwbHVnaW5OYW1lID0gcGx1Z2luLmlkXG4gICAgICBpZiAocGx1Z2luTmFtZSA9PT0gbmFtZSkge1xuICAgICAgICBmb3VuZFBsdWdpbiA9IHBsdWdpblxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3VuZFBsdWdpblxuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgdGhyb3VnaCBhbGwgYHVzZWBkIHBsdWdpbnMuXG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IG1ldGhvZCB0aGF0IHdpbGwgYmUgcnVuIG9uIGVhY2ggcGx1Z2luXG4gICAqL1xuICBpdGVyYXRlUGx1Z2lucyAobWV0aG9kKSB7XG4gICAgT2JqZWN0LmtleXModGhpcy5wbHVnaW5zKS5mb3JFYWNoKHBsdWdpblR5cGUgPT4ge1xuICAgICAgdGhpcy5wbHVnaW5zW3BsdWdpblR5cGVdLmZvckVhY2gobWV0aG9kKVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVW5pbnN0YWxsIGFuZCByZW1vdmUgYSBwbHVnaW4uXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSBUaGUgcGx1Z2luIGluc3RhbmNlIHRvIHJlbW92ZS5cbiAgICovXG4gIHJlbW92ZVBsdWdpbiAoaW5zdGFuY2UpIHtcbiAgICBjb25zdCBsaXN0ID0gdGhpcy5wbHVnaW5zW2luc3RhbmNlLnR5cGVdXG5cbiAgICBpZiAoaW5zdGFuY2UudW5pbnN0YWxsKSB7XG4gICAgICBpbnN0YW5jZS51bmluc3RhbGwoKVxuICAgIH1cblxuICAgIGNvbnN0IGluZGV4ID0gbGlzdC5pbmRleE9mKGluc3RhbmNlKVxuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAxKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVbmluc3RhbGwgYWxsIHBsdWdpbnMgYW5kIGNsb3NlIGRvd24gdGhpcyBVcHB5IGluc3RhbmNlLlxuICAgKi9cbiAgY2xvc2UgKCkge1xuICAgIHRoaXMucmVzZXQoKVxuXG4gICAgdGhpcy5fc3RvcmVVbnN1YnNjcmliZSgpXG5cbiAgICB0aGlzLml0ZXJhdGVQbHVnaW5zKChwbHVnaW4pID0+IHtcbiAgICAgIHBsdWdpbi51bmluc3RhbGwoKVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgKiBTZXQgaW5mbyBtZXNzYWdlIGluIGBzdGF0ZS5pbmZvYCwgc28gdGhhdCBVSSBwbHVnaW5zIGxpa2UgYEluZm9ybWVyYFxuICAqIGNhbiBkaXNwbGF5IHRoZSBtZXNzYWdlLlxuICAqXG4gICogQHBhcmFtIHtzdHJpbmcgfCBvYmplY3R9IG1lc3NhZ2UgTWVzc2FnZSB0byBiZSBkaXNwbGF5ZWQgYnkgdGhlIGluZm9ybWVyXG4gICogQHBhcmFtIHtzdHJpbmd9IFt0eXBlXVxuICAqIEBwYXJhbSB7bnVtYmVyfSBbZHVyYXRpb25dXG4gICovXG5cbiAgaW5mbyAobWVzc2FnZSwgdHlwZSA9ICdpbmZvJywgZHVyYXRpb24gPSAzMDAwKSB7XG4gICAgY29uc3QgaXNDb21wbGV4TWVzc2FnZSA9IHR5cGVvZiBtZXNzYWdlID09PSAnb2JqZWN0J1xuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBpbmZvOiB7XG4gICAgICAgIGlzSGlkZGVuOiBmYWxzZSxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgbWVzc2FnZTogaXNDb21wbGV4TWVzc2FnZSA/IG1lc3NhZ2UubWVzc2FnZSA6IG1lc3NhZ2UsXG4gICAgICAgIGRldGFpbHM6IGlzQ29tcGxleE1lc3NhZ2UgPyBtZXNzYWdlLmRldGFpbHMgOiBudWxsXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMuZW1pdCgnaW5mby12aXNpYmxlJylcblxuICAgIGNsZWFyVGltZW91dCh0aGlzLmluZm9UaW1lb3V0SUQpXG4gICAgaWYgKGR1cmF0aW9uID09PSAwKSB7XG4gICAgICB0aGlzLmluZm9UaW1lb3V0SUQgPSB1bmRlZmluZWRcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIGhpZGUgdGhlIGluZm9ybWVyIGFmdGVyIGBkdXJhdGlvbmAgbWlsbGlzZWNvbmRzXG4gICAgdGhpcy5pbmZvVGltZW91dElEID0gc2V0VGltZW91dCh0aGlzLmhpZGVJbmZvLCBkdXJhdGlvbilcbiAgfVxuXG4gIGhpZGVJbmZvICgpIHtcbiAgICBjb25zdCBuZXdJbmZvID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmluZm8sIHtcbiAgICAgIGlzSGlkZGVuOiB0cnVlXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGluZm86IG5ld0luZm9cbiAgICB9KVxuICAgIHRoaXMuZW1pdCgnaW5mby1oaWRkZW4nKVxuICB9XG5cbiAgLyoqXG4gICAqIExvZ3Mgc3R1ZmYgdG8gY29uc29sZSwgb25seSBpZiBgZGVidWdgIGlzIHNldCB0byB0cnVlLiBTaWxlbnQgaW4gcHJvZHVjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBtc2cgdG8gbG9nXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbdHlwZV0gb3B0aW9uYWwgYGVycm9yYCBvciBgd2FybmluZ2BcbiAgICovXG4gIGxvZyAobXNnLCB0eXBlKSB7XG4gICAgaWYgKCF0aGlzLm9wdHMuZGVidWcpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGxldCBtZXNzYWdlID0gYFtVcHB5XSBbJHtVdGlscy5nZXRUaW1lU3RhbXAoKX1dICR7bXNnfWBcblxuICAgIHdpbmRvd1sndXBweUxvZyddID0gd2luZG93Wyd1cHB5TG9nJ10gKyAnXFxuJyArICdERUJVRyBMT0c6ICcgKyBtc2dcblxuICAgIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBjb25zb2xlLmVycm9yKG1lc3NhZ2UpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gJ3dhcm5pbmcnKSB7XG4gICAgICBjb25zb2xlLndhcm4obWVzc2FnZSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmIChtc2cgPT09IGAke21zZ31gKSB7XG4gICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKVxuICAgIH0gZWxzZSB7XG4gICAgICBtZXNzYWdlID0gYFtVcHB5XSBbJHtVdGlscy5nZXRUaW1lU3RhbXAoKX1dYFxuICAgICAgY29uc29sZS5sb2cobWVzc2FnZSlcbiAgICAgIGNvbnNvbGUuZGlyKG1zZylcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT2Jzb2xldGUsIGV2ZW50IGxpc3RlbmVycyBhcmUgbm93IGFkZGVkIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHJ1biAoKSB7XG4gICAgdGhpcy5sb2coJ0NhbGxpbmcgcnVuKCkgaXMgbm8gbG9uZ2VyIG5lY2Vzc2FyeS4nLCAnd2FybmluZycpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXN0b3JlIGFuIHVwbG9hZCBieSBpdHMgSUQuXG4gICAqL1xuICByZXN0b3JlICh1cGxvYWRJRCkge1xuICAgIHRoaXMubG9nKGBDb3JlOiBhdHRlbXB0aW5nIHRvIHJlc3RvcmUgdXBsb2FkIFwiJHt1cGxvYWRJRH1cImApXG5cbiAgICBpZiAoIXRoaXMuZ2V0U3RhdGUoKS5jdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0pIHtcbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZCh1cGxvYWRJRClcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ05vbmV4aXN0ZW50IHVwbG9hZCcpKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9ydW5VcGxvYWQodXBsb2FkSUQpXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIHVwbG9hZCBmb3IgYSBidW5jaCBvZiBmaWxlcy5cbiAgICpcbiAgICogQHBhcmFtIHtBcnJheTxzdHJpbmc+fSBmaWxlSURzIEZpbGUgSURzIHRvIGluY2x1ZGUgaW4gdGhpcyB1cGxvYWQuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gSUQgb2YgdGhpcyB1cGxvYWQuXG4gICAqL1xuICBfY3JlYXRlVXBsb2FkIChmaWxlSURzKSB7XG4gICAgY29uc3QgdXBsb2FkSUQgPSBjdWlkKClcblxuICAgIHRoaXMuZW1pdCgndXBsb2FkJywge1xuICAgICAgaWQ6IHVwbG9hZElELFxuICAgICAgZmlsZUlEczogZmlsZUlEc1xuICAgIH0pXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHMsIHtcbiAgICAgICAgW3VwbG9hZElEXToge1xuICAgICAgICAgIGZpbGVJRHM6IGZpbGVJRHMsXG4gICAgICAgICAgc3RlcDogMCxcbiAgICAgICAgICByZXN1bHQ6IHt9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiB1cGxvYWRJRFxuICB9XG5cbiAgX2dldFVwbG9hZCAodXBsb2FkSUQpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpLmN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBkYXRhIHRvIGFuIHVwbG9hZCdzIHJlc3VsdCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJRCBUaGUgSUQgb2YgdGhlIHVwbG9hZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgRGF0YSBwcm9wZXJ0aWVzIHRvIGFkZCB0byB0aGUgcmVzdWx0IG9iamVjdC5cbiAgICovXG4gIGFkZFJlc3VsdERhdGEgKHVwbG9hZElELCBkYXRhKSB7XG4gICAgaWYgKCF0aGlzLl9nZXRVcGxvYWQodXBsb2FkSUQpKSB7XG4gICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcmVzdWx0IGZvciBhbiB1cGxvYWQgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke3VwbG9hZElEfWApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgY3VycmVudFVwbG9hZHMgPSB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHNcbiAgICBjb25zdCBjdXJyZW50VXBsb2FkID0gT2JqZWN0LmFzc2lnbih7fSwgY3VycmVudFVwbG9hZHNbdXBsb2FkSURdLCB7XG4gICAgICByZXN1bHQ6IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXS5yZXN1bHQsIGRhdGEpXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBPYmplY3QuYXNzaWduKHt9LCBjdXJyZW50VXBsb2Fkcywge1xuICAgICAgICBbdXBsb2FkSURdOiBjdXJyZW50VXBsb2FkXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFuIHVwbG9hZCwgZWcuIGlmIGl0IGhhcyBiZWVuIGNhbmNlbGVkIG9yIGNvbXBsZXRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElEIFRoZSBJRCBvZiB0aGUgdXBsb2FkLlxuICAgKi9cbiAgX3JlbW92ZVVwbG9hZCAodXBsb2FkSUQpIHtcbiAgICBjb25zdCBjdXJyZW50VXBsb2FkcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5jdXJyZW50VXBsb2FkcylcbiAgICBkZWxldGUgY3VycmVudFVwbG9hZHNbdXBsb2FkSURdXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBjdXJyZW50VXBsb2Fkc1xuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUnVuIGFuIHVwbG9hZC4gVGhpcyBwaWNrcyB1cCB3aGVyZSBpdCBsZWZ0IG9mZiBpbiBjYXNlIHRoZSB1cGxvYWQgaXMgYmVpbmcgcmVzdG9yZWQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcnVuVXBsb2FkICh1cGxvYWRJRCkge1xuICAgIGNvbnN0IHVwbG9hZERhdGEgPSB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHNbdXBsb2FkSURdXG4gICAgY29uc3QgZmlsZUlEcyA9IHVwbG9hZERhdGEuZmlsZUlEc1xuICAgIGNvbnN0IHJlc3RvcmVTdGVwID0gdXBsb2FkRGF0YS5zdGVwXG5cbiAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgIC4uLnRoaXMucHJlUHJvY2Vzc29ycyxcbiAgICAgIC4uLnRoaXMudXBsb2FkZXJzLFxuICAgICAgLi4udGhpcy5wb3N0UHJvY2Vzc29yc1xuICAgIF1cbiAgICBsZXQgbGFzdFN0ZXAgPSBQcm9taXNlLnJlc29sdmUoKVxuICAgIHN0ZXBzLmZvckVhY2goKGZuLCBzdGVwKSA9PiB7XG4gICAgICAvLyBTa2lwIHRoaXMgc3RlcCBpZiB3ZSBhcmUgcmVzdG9yaW5nIGFuZCBoYXZlIGFscmVhZHkgY29tcGxldGVkIHRoaXMgc3RlcCBiZWZvcmUuXG4gICAgICBpZiAoc3RlcCA8IHJlc3RvcmVTdGVwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBsYXN0U3RlcCA9IGxhc3RTdGVwLnRoZW4oKCkgPT4ge1xuICAgICAgICBjb25zdCB7IGN1cnJlbnRVcGxvYWRzIH0gPSB0aGlzLmdldFN0YXRlKClcbiAgICAgICAgY29uc3QgY3VycmVudFVwbG9hZCA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXSwge1xuICAgICAgICAgIHN0ZXA6IHN0ZXBcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgY3VycmVudFVwbG9hZHM6IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzLCB7XG4gICAgICAgICAgICBbdXBsb2FkSURdOiBjdXJyZW50VXBsb2FkXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLy8gVE9ETyBnaXZlIHRoaXMgdGhlIGBjdXJyZW50VXBsb2FkYCBvYmplY3QgYXMgaXRzIG9ubHkgcGFyYW1ldGVyIG1heWJlP1xuICAgICAgICAvLyBPdGhlcndpc2Ugd2hlbiBtb3JlIG1ldGFkYXRhIG1heSBiZSBhZGRlZCB0byB0aGUgdXBsb2FkIHRoaXMgd291bGQga2VlcCBnZXR0aW5nIG1vcmUgcGFyYW1ldGVyc1xuICAgICAgICByZXR1cm4gZm4oZmlsZUlEcywgdXBsb2FkSUQpXG4gICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIE5vdCByZXR1cm5pbmcgdGhlIGBjYXRjaGBlZCBwcm9taXNlLCBiZWNhdXNlIHdlIHN0aWxsIHdhbnQgdG8gcmV0dXJuIGEgcmVqZWN0ZWRcbiAgICAvLyBwcm9taXNlIGZyb20gdGhpcyBtZXRob2QgaWYgdGhlIHVwbG9hZCBmYWlsZWQuXG4gICAgbGFzdFN0ZXAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVyciwgdXBsb2FkSUQpXG5cbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZCh1cGxvYWRJRClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGxhc3RTdGVwLnRoZW4oKCkgPT4ge1xuICAgICAgY29uc3QgZmlsZXMgPSBmaWxlSURzLm1hcCgoZmlsZUlEKSA9PiB0aGlzLmdldEZpbGUoZmlsZUlEKSlcbiAgICAgIGNvbnN0IHN1Y2Nlc3NmdWwgPSBmaWxlcy5maWx0ZXIoKGZpbGUpID0+IGZpbGUgJiYgIWZpbGUuZXJyb3IpXG4gICAgICBjb25zdCBmYWlsZWQgPSBmaWxlcy5maWx0ZXIoKGZpbGUpID0+IGZpbGUgJiYgZmlsZS5lcnJvcilcbiAgICAgIHRoaXMuYWRkUmVzdWx0RGF0YSh1cGxvYWRJRCwgeyBzdWNjZXNzZnVsLCBmYWlsZWQsIHVwbG9hZElEIH0pXG5cbiAgICAgIGNvbnN0IHsgY3VycmVudFVwbG9hZHMgfSA9IHRoaXMuZ2V0U3RhdGUoKVxuICAgICAgaWYgKCFjdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0pIHtcbiAgICAgICAgdGhpcy5sb2coYE5vdCBzZXR0aW5nIHJlc3VsdCBmb3IgYW4gdXBsb2FkIHRoYXQgaGFzIGJlZW4gcmVtb3ZlZDogJHt1cGxvYWRJRH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0ID0gY3VycmVudFVwbG9hZHNbdXBsb2FkSURdLnJlc3VsdFxuICAgICAgdGhpcy5lbWl0KCdjb21wbGV0ZScsIHJlc3VsdClcblxuICAgICAgdGhpcy5fcmVtb3ZlVXBsb2FkKHVwbG9hZElEKVxuXG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCBhbiB1cGxvYWQgZm9yIGFsbCB0aGUgZmlsZXMgdGhhdCBhcmUgbm90IGN1cnJlbnRseSBiZWluZyB1cGxvYWRlZC5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gIHVwbG9hZCAoKSB7XG4gICAgaWYgKCF0aGlzLnBsdWdpbnMudXBsb2FkZXIpIHtcbiAgICAgIHRoaXMubG9nKCdObyB1cGxvYWRlciB0eXBlIHBsdWdpbnMgYXJlIHVzZWQnLCAnd2FybmluZycpXG4gICAgfVxuXG4gICAgbGV0IGZpbGVzID0gdGhpcy5nZXRTdGF0ZSgpLmZpbGVzXG4gICAgY29uc3Qgb25CZWZvcmVVcGxvYWRSZXN1bHQgPSB0aGlzLm9wdHMub25CZWZvcmVVcGxvYWQoZmlsZXMpXG5cbiAgICBpZiAob25CZWZvcmVVcGxvYWRSZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdOb3Qgc3RhcnRpbmcgdGhlIHVwbG9hZCBiZWNhdXNlIG9uQmVmb3JlVXBsb2FkIHJldHVybmVkIGZhbHNlJykpXG4gICAgfVxuXG4gICAgaWYgKG9uQmVmb3JlVXBsb2FkUmVzdWx0ICYmIHR5cGVvZiBvbkJlZm9yZVVwbG9hZFJlc3VsdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIHdhcm5pbmcgYWZ0ZXIgdGhlIGNoYW5nZSBpbiAwLjI0XG4gICAgICBpZiAob25CZWZvcmVVcGxvYWRSZXN1bHQudGhlbikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvbkJlZm9yZVVwbG9hZCgpIHJldHVybmVkIGEgUHJvbWlzZSwgYnV0IHRoaXMgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZC4gSXQgbXVzdCBiZSBzeW5jaHJvbm91cy4nKVxuICAgICAgfVxuXG4gICAgICBmaWxlcyA9IG9uQmVmb3JlVXBsb2FkUmVzdWx0XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAudGhlbigoKSA9PiB0aGlzLl9jaGVja01pbk51bWJlck9mRmlsZXMoZmlsZXMpKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBjb25zdCB7IGN1cnJlbnRVcGxvYWRzIH0gPSB0aGlzLmdldFN0YXRlKClcbiAgICAgICAgLy8gZ2V0IGEgbGlzdCBvZiBmaWxlcyB0aGF0IGFyZSBjdXJyZW50bHkgYXNzaWduZWQgdG8gdXBsb2Fkc1xuICAgICAgICBjb25zdCBjdXJyZW50bHlVcGxvYWRpbmdGaWxlcyA9IE9iamVjdC5rZXlzKGN1cnJlbnRVcGxvYWRzKS5yZWR1Y2UoKHByZXYsIGN1cnIpID0+IHByZXYuY29uY2F0KGN1cnJlbnRVcGxvYWRzW2N1cnJdLmZpbGVJRHMpLCBbXSlcblxuICAgICAgICBjb25zdCB3YWl0aW5nRmlsZUlEcyA9IFtdXG4gICAgICAgIE9iamVjdC5rZXlzKGZpbGVzKS5mb3JFYWNoKChmaWxlSUQpID0+IHtcbiAgICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5nZXRGaWxlKGZpbGVJRClcbiAgICAgICAgICAvLyBpZiB0aGUgZmlsZSBoYXNuJ3Qgc3RhcnRlZCB1cGxvYWRpbmcgYW5kIGhhc24ndCBhbHJlYWR5IGJlZW4gYXNzaWduZWQgdG8gYW4gdXBsb2FkLi5cbiAgICAgICAgICBpZiAoKCFmaWxlLnByb2dyZXNzLnVwbG9hZFN0YXJ0ZWQpICYmIChjdXJyZW50bHlVcGxvYWRpbmdGaWxlcy5pbmRleE9mKGZpbGVJRCkgPT09IC0xKSkge1xuICAgICAgICAgICAgd2FpdGluZ0ZpbGVJRHMucHVzaChmaWxlLmlkKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBjb25zdCB1cGxvYWRJRCA9IHRoaXMuX2NyZWF0ZVVwbG9hZCh3YWl0aW5nRmlsZUlEcylcbiAgICAgICAgcmV0dXJuIHRoaXMuX3J1blVwbG9hZCh1cGxvYWRJRClcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gdHlwZW9mIGVyciA9PT0gJ29iamVjdCcgPyBlcnIubWVzc2FnZSA6IGVyclxuICAgICAgICB0aGlzLmxvZyhtZXNzYWdlKVxuICAgICAgICB0aGlzLmluZm8obWVzc2FnZSwgJ2Vycm9yJywgNDAwMClcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHR5cGVvZiBlcnIgPT09ICdvYmplY3QnID8gZXJyIDogbmV3IEVycm9yKGVycikpXG4gICAgICB9KVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgcmV0dXJuIG5ldyBVcHB5KG9wdHMpXG59XG5cbi8vIEV4cG9zZSBjbGFzcyBjb25zdHJ1Y3Rvci5cbm1vZHVsZS5leHBvcnRzLlVwcHkgPSBVcHB5XG4iLCJjb25zdCBwcmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKVxuY29uc3QgeyBmaW5kRE9NRWxlbWVudCB9ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5cbi8qKlxuICogRGVmZXIgYSBmcmVxdWVudCBjYWxsIHRvIHRoZSBtaWNyb3Rhc2sgcXVldWUuXG4gKi9cbmZ1bmN0aW9uIGRlYm91bmNlIChmbikge1xuICBsZXQgY2FsbGluZyA9IG51bGxcbiAgbGV0IGxhdGVzdEFyZ3MgPSBudWxsXG4gIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgIGxhdGVzdEFyZ3MgPSBhcmdzXG4gICAgaWYgKCFjYWxsaW5nKSB7XG4gICAgICBjYWxsaW5nID0gUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgIGNhbGxpbmcgPSBudWxsXG4gICAgICAgIC8vIEF0IHRoaXMgcG9pbnQgYGFyZ3NgIG1heSBiZSBkaWZmZXJlbnQgZnJvbSB0aGUgbW9zdFxuICAgICAgICAvLyByZWNlbnQgc3RhdGUsIGlmIG11bHRpcGxlIGNhbGxzIGhhcHBlbmVkIHNpbmNlIHRoaXMgdGFza1xuICAgICAgICAvLyB3YXMgcXVldWVkLiBTbyB3ZSB1c2UgdGhlIGBsYXRlc3RBcmdzYCwgd2hpY2ggZGVmaW5pdGVseVxuICAgICAgICAvLyBpcyB0aGUgbW9zdCByZWNlbnQgY2FsbC5cbiAgICAgICAgcmV0dXJuIGZuKC4uLmxhdGVzdEFyZ3MpXG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY2FsbGluZ1xuICB9XG59XG5cbi8qKlxuICogQm9pbGVycGxhdGUgdGhhdCBhbGwgUGx1Z2lucyBzaGFyZSAtIGFuZCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGRpcmVjdGx5LiBJdCBhbHNvIHNob3dzIHdoaWNoIG1ldGhvZHMgZmluYWwgcGx1Z2lucyBzaG91bGQgaW1wbGVtZW50L292ZXJyaWRlLFxuICogdGhpcyBkZWNpZGluZyBvbiBzdHJ1Y3R1cmUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG1haW4gVXBweSBjb3JlIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdCB3aXRoIHBsdWdpbiBvcHRpb25zXG4gKiBAcmV0dXJuIHthcnJheSB8IHN0cmluZ30gZmlsZXMgb3Igc3VjY2Vzcy9mYWlsIG1lc3NhZ2VcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHRoaXMudXBweSA9IHVwcHlcbiAgICB0aGlzLm9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcylcbiAgICB0aGlzLm1vdW50ID0gdGhpcy5tb3VudC5iaW5kKHRoaXMpXG4gICAgdGhpcy5pbnN0YWxsID0gdGhpcy5pbnN0YWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnVuaW5zdGFsbCA9IHRoaXMudW5pbnN0YWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIGdldFBsdWdpblN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy51cHB5LnN0YXRlLnBsdWdpbnNbdGhpcy5pZF1cbiAgfVxuXG4gIHNldFBsdWdpblN0YXRlICh1cGRhdGUpIHtcbiAgICBjb25zdCBwbHVnaW5zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy51cHB5LnN0YXRlLnBsdWdpbnMpXG4gICAgcGx1Z2luc1t0aGlzLmlkXSA9IE9iamVjdC5hc3NpZ24oe30sIHBsdWdpbnNbdGhpcy5pZF0sIHVwZGF0ZSlcblxuICAgIHRoaXMudXBweS5zZXRTdGF0ZSh7XG4gICAgICBwbHVnaW5zOiBwbHVnaW5zXG4gICAgfSlcbiAgfVxuXG4gIHVwZGF0ZSAoc3RhdGUpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuZWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fdXBkYXRlVUkpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZVVJKHN0YXRlKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBzdXBwbGllZCBgdGFyZ2V0YCBpcyBhIERPTSBlbGVtZW50IG9yIGFuIGBvYmplY3RgLlxuICAgKiBJZiBpdOKAmXMgYW4gb2JqZWN0IOKAlCB0YXJnZXQgaXMgYSBwbHVnaW4sIGFuZCB3ZSBzZWFyY2ggYHBsdWdpbnNgXG4gICAqIGZvciBhIHBsdWdpbiB3aXRoIHNhbWUgbmFtZSBhbmQgcmV0dXJuIGl0cyB0YXJnZXQuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gdGFyZ2V0XG4gICAqXG4gICAqL1xuICBtb3VudCAodGFyZ2V0LCBwbHVnaW4pIHtcbiAgICBjb25zdCBjYWxsZXJQbHVnaW5OYW1lID0gcGx1Z2luLmlkXG5cbiAgICBjb25zdCB0YXJnZXRFbGVtZW50ID0gZmluZERPTUVsZW1lbnQodGFyZ2V0KVxuXG4gICAgaWYgKHRhcmdldEVsZW1lbnQpIHtcbiAgICAgIHRoaXMuaXNUYXJnZXRET01FbCA9IHRydWVcblxuICAgICAgLy8gQVBJIGZvciBwbHVnaW5zIHRoYXQgcmVxdWlyZSBhIHN5bmNocm9ub3VzIHJlcmVuZGVyLlxuICAgICAgdGhpcy5yZXJlbmRlciA9IChzdGF0ZSkgPT4ge1xuICAgICAgICB0aGlzLmVsID0gcHJlYWN0LnJlbmRlcih0aGlzLnJlbmRlcihzdGF0ZSksIHRhcmdldEVsZW1lbnQsIHRoaXMuZWwpXG4gICAgICB9XG4gICAgICB0aGlzLl91cGRhdGVVSSA9IGRlYm91bmNlKHRoaXMucmVyZW5kZXIpXG5cbiAgICAgIHRoaXMudXBweS5sb2coYEluc3RhbGxpbmcgJHtjYWxsZXJQbHVnaW5OYW1lfSB0byBhIERPTSBlbGVtZW50YClcblxuICAgICAgLy8gY2xlYXIgZXZlcnl0aGluZyBpbnNpZGUgdGhlIHRhcmdldCBjb250YWluZXJcbiAgICAgIGlmICh0aGlzLm9wdHMucmVwbGFjZVRhcmdldENvbnRlbnQpIHtcbiAgICAgICAgdGFyZ2V0RWxlbWVudC5pbm5lckhUTUwgPSAnJ1xuICAgICAgfVxuXG4gICAgICB0aGlzLmVsID0gcHJlYWN0LnJlbmRlcih0aGlzLnJlbmRlcih0aGlzLnVwcHkuZ2V0U3RhdGUoKSksIHRhcmdldEVsZW1lbnQpXG5cbiAgICAgIHJldHVybiB0aGlzLmVsXG4gICAgfVxuXG4gICAgbGV0IHRhcmdldFBsdWdpblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0JyAmJiB0YXJnZXQgaW5zdGFuY2VvZiBQbHVnaW4pIHtcbiAgICAgIC8vIFRhcmdldGluZyBhIHBsdWdpbiAqaW5zdGFuY2UqXG4gICAgICB0YXJnZXRQbHVnaW4gPSB0YXJnZXRcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIFRhcmdldGluZyBhIHBsdWdpbiB0eXBlXG4gICAgICBjb25zdCBUYXJnZXQgPSB0YXJnZXRcbiAgICAgIC8vIEZpbmQgdGhlIHRhcmdldCBwbHVnaW4gaW5zdGFuY2UuXG4gICAgICB0aGlzLnVwcHkuaXRlcmF0ZVBsdWdpbnMoKHBsdWdpbikgPT4ge1xuICAgICAgICBpZiAocGx1Z2luIGluc3RhbmNlb2YgVGFyZ2V0KSB7XG4gICAgICAgICAgdGFyZ2V0UGx1Z2luID0gcGx1Z2luXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKHRhcmdldFBsdWdpbikge1xuICAgICAgY29uc3QgdGFyZ2V0UGx1Z2luTmFtZSA9IHRhcmdldFBsdWdpbi5pZFxuICAgICAgdGhpcy51cHB5LmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvICR7dGFyZ2V0UGx1Z2luTmFtZX1gKVxuICAgICAgdGhpcy5lbCA9IHRhcmdldFBsdWdpbi5hZGRUYXJnZXQocGx1Z2luKVxuICAgICAgcmV0dXJuIHRoaXMuZWxcbiAgICB9XG5cbiAgICB0aGlzLnVwcHkubG9nKGBOb3QgaW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9YClcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdGFyZ2V0IG9wdGlvbiBnaXZlbiB0byAke2NhbGxlclBsdWdpbk5hbWV9YClcbiAgfVxuXG4gIHJlbmRlciAoc3RhdGUpIHtcbiAgICB0aHJvdyAobmV3IEVycm9yKCdFeHRlbmQgdGhlIHJlbmRlciBtZXRob2QgdG8gYWRkIHlvdXIgcGx1Z2luIHRvIGEgRE9NIGVsZW1lbnQnKSlcbiAgfVxuXG4gIGFkZFRhcmdldCAocGx1Z2luKSB7XG4gICAgdGhyb3cgKG5ldyBFcnJvcignRXh0ZW5kIHRoZSBhZGRUYXJnZXQgbWV0aG9kIHRvIGFkZCB5b3VyIHBsdWdpbiB0byBhbm90aGVyIHBsdWdpblxcJ3MgdGFyZ2V0JykpXG4gIH1cblxuICB1bm1vdW50ICgpIHtcbiAgICBpZiAodGhpcy5lbCAmJiB0aGlzLmVsLnBhcmVudE5vZGUpIHtcbiAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsKVxuICAgIH1cbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuXG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudW5tb3VudCgpXG4gIH1cbn1cbiIsIi8qKlxuICogVHJhbnNsYXRlcyBzdHJpbmdzIHdpdGggaW50ZXJwb2xhdGlvbiAmIHBsdXJhbGl6YXRpb24gc3VwcG9ydC5cbiAqIEV4dGVuc2libGUgd2l0aCBjdXN0b20gZGljdGlvbmFyaWVzIGFuZCBwbHVyYWxpemF0aW9uIGZ1bmN0aW9ucy5cbiAqXG4gKiBCb3Jyb3dzIGhlYXZpbHkgZnJvbSBhbmQgaW5zcGlyZWQgYnkgUG9seWdsb3QgaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcyxcbiAqIGJhc2ljYWxseSBhIHN0cmlwcGVkLWRvd24gdmVyc2lvbiBvZiBpdC4gRGlmZmVyZW5jZXM6IHBsdXJhbGl6YXRpb24gZnVuY3Rpb25zIGFyZSBub3QgaGFyZGNvZGVkXG4gKiBhbmQgY2FuIGJlIGVhc2lseSBhZGRlZCBhbW9uZyB3aXRoIGRpY3Rpb25hcmllcywgbmVzdGVkIG9iamVjdHMgYXJlIHVzZWQgZm9yIHBsdXJhbGl6YXRpb25cbiAqIGFzIG9wcG9zZWQgdG8gYHx8fHxgIGRlbGltZXRlclxuICpcbiAqIFVzYWdlIGV4YW1wbGU6IGB0cmFuc2xhdG9yLnRyYW5zbGF0ZSgnZmlsZXNfY2hvc2VuJywge3NtYXJ0X2NvdW50OiAzfSlgXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBUcmFuc2xhdG9yIHtcbiAgY29uc3RydWN0b3IgKG9wdHMpIHtcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIGxvY2FsZToge1xuICAgICAgICBzdHJpbmdzOiB7fSxcbiAgICAgICAgcGx1cmFsaXplOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgIGlmIChuID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gMFxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gMVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG4gICAgdGhpcy5sb2NhbGUgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucy5sb2NhbGUsIG9wdHMubG9jYWxlKVxuICB9XG5cbiAgLyoqXG4gICAqIFRha2VzIGEgc3RyaW5nIHdpdGggcGxhY2Vob2xkZXIgdmFyaWFibGVzIGxpa2UgYCV7c21hcnRfY291bnR9IGZpbGUgc2VsZWN0ZWRgXG4gICAqIGFuZCByZXBsYWNlcyBpdCB3aXRoIHZhbHVlcyBmcm9tIG9wdGlvbnMgYHtzbWFydF9jb3VudDogNX1gXG4gICAqXG4gICAqIEBsaWNlbnNlIGh0dHBzOi8vZ2l0aHViLmNvbS9haXJibmIvcG9seWdsb3QuanMvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICAgKiB0YWtlbiBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9haXJibmIvcG9seWdsb3QuanMvYmxvYi9tYXN0ZXIvbGliL3BvbHlnbG90LmpzI0wyOTlcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBocmFzZSB0aGF0IG5lZWRzIGludGVycG9sYXRpb24sIHdpdGggcGxhY2Vob2xkZXJzXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHdpdGggdmFsdWVzIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHJlcGxhY2UgcGxhY2Vob2xkZXJzXG4gICAqIEByZXR1cm4ge3N0cmluZ30gaW50ZXJwb2xhdGVkXG4gICAqL1xuICBpbnRlcnBvbGF0ZSAocGhyYXNlLCBvcHRpb25zKSB7XG4gICAgY29uc3QgcmVwbGFjZSA9IFN0cmluZy5wcm90b3R5cGUucmVwbGFjZVxuICAgIGNvbnN0IGRvbGxhclJlZ2V4ID0gL1xcJC9nXG4gICAgY29uc3QgZG9sbGFyQmlsbHNZYWxsID0gJyQkJCQnXG5cbiAgICBmb3IgKGxldCBhcmcgaW4gb3B0aW9ucykge1xuICAgICAgaWYgKGFyZyAhPT0gJ18nICYmIG9wdGlvbnMuaGFzT3duUHJvcGVydHkoYXJnKSkge1xuICAgICAgICAvLyBFbnN1cmUgcmVwbGFjZW1lbnQgdmFsdWUgaXMgZXNjYXBlZCB0byBwcmV2ZW50IHNwZWNpYWwgJC1wcmVmaXhlZFxuICAgICAgICAvLyByZWdleCByZXBsYWNlIHRva2Vucy4gdGhlIFwiJCQkJFwiIGlzIG5lZWRlZCBiZWNhdXNlIGVhY2ggXCIkXCIgbmVlZHMgdG9cbiAgICAgICAgLy8gYmUgZXNjYXBlZCB3aXRoIFwiJFwiIGl0c2VsZiwgYW5kIHdlIG5lZWQgdHdvIGluIHRoZSByZXN1bHRpbmcgb3V0cHV0LlxuICAgICAgICB2YXIgcmVwbGFjZW1lbnQgPSBvcHRpb25zW2FyZ11cbiAgICAgICAgaWYgKHR5cGVvZiByZXBsYWNlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXBsYWNlbWVudCA9IHJlcGxhY2UuY2FsbChvcHRpb25zW2FyZ10sIGRvbGxhclJlZ2V4LCBkb2xsYXJCaWxsc1lhbGwpXG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgY3JlYXRlIGEgbmV3IGBSZWdFeHBgIGVhY2ggdGltZSBpbnN0ZWFkIG9mIHVzaW5nIGEgbW9yZS1lZmZpY2llbnRcbiAgICAgICAgLy8gc3RyaW5nIHJlcGxhY2Ugc28gdGhhdCB0aGUgc2FtZSBhcmd1bWVudCBjYW4gYmUgcmVwbGFjZWQgbXVsdGlwbGUgdGltZXNcbiAgICAgICAgLy8gaW4gdGhlIHNhbWUgcGhyYXNlLlxuICAgICAgICBwaHJhc2UgPSByZXBsYWNlLmNhbGwocGhyYXNlLCBuZXcgUmVnRXhwKCclXFxcXHsnICsgYXJnICsgJ1xcXFx9JywgJ2cnKSwgcmVwbGFjZW1lbnQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwaHJhc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWMgdHJhbnNsYXRlIG1ldGhvZFxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHdpdGggdmFsdWVzIHRoYXQgd2lsbCBiZSB1c2VkIGxhdGVyIHRvIHJlcGxhY2UgcGxhY2Vob2xkZXJzIGluIHN0cmluZ1xuICAgKiBAcmV0dXJuIHtzdHJpbmd9IHRyYW5zbGF0ZWQgKGFuZCBpbnRlcnBvbGF0ZWQpXG4gICAqL1xuICB0cmFuc2xhdGUgKGtleSwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuc21hcnRfY291bnQpIHtcbiAgICAgIHZhciBwbHVyYWwgPSB0aGlzLmxvY2FsZS5wbHVyYWxpemUob3B0aW9ucy5zbWFydF9jb3VudClcbiAgICAgIHJldHVybiB0aGlzLmludGVycG9sYXRlKHRoaXMub3B0cy5sb2NhbGUuc3RyaW5nc1trZXldW3BsdXJhbF0sIG9wdGlvbnMpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuaW50ZXJwb2xhdGUodGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzW2tleV0sIG9wdGlvbnMpXG4gIH1cbn1cbiIsImNvbnN0IGVlID0gcmVxdWlyZSgnbmFtZXNwYWNlLWVtaXR0ZXInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFVwcHlTb2NrZXQge1xuICBjb25zdHJ1Y3RvciAob3B0cykge1xuICAgIHRoaXMucXVldWVkID0gW11cbiAgICB0aGlzLmlzT3BlbiA9IGZhbHNlXG4gICAgdGhpcy5zb2NrZXQgPSBuZXcgV2ViU29ja2V0KG9wdHMudGFyZ2V0KVxuICAgIHRoaXMuZW1pdHRlciA9IGVlKClcblxuICAgIHRoaXMuc29ja2V0Lm9ub3BlbiA9IChlKSA9PiB7XG4gICAgICB0aGlzLmlzT3BlbiA9IHRydWVcblxuICAgICAgd2hpbGUgKHRoaXMucXVldWVkLmxlbmd0aCA+IDAgJiYgdGhpcy5pc09wZW4pIHtcbiAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLnF1ZXVlZFswXVxuICAgICAgICB0aGlzLnNlbmQoZmlyc3QuYWN0aW9uLCBmaXJzdC5wYXlsb2FkKVxuICAgICAgICB0aGlzLnF1ZXVlZCA9IHRoaXMucXVldWVkLnNsaWNlKDEpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zb2NrZXQub25jbG9zZSA9IChlKSA9PiB7XG4gICAgICB0aGlzLmlzT3BlbiA9IGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5faGFuZGxlTWVzc2FnZSA9IHRoaXMuX2hhbmRsZU1lc3NhZ2UuYmluZCh0aGlzKVxuXG4gICAgdGhpcy5zb2NrZXQub25tZXNzYWdlID0gdGhpcy5faGFuZGxlTWVzc2FnZVxuXG4gICAgdGhpcy5jbG9zZSA9IHRoaXMuY2xvc2UuYmluZCh0aGlzKVxuICAgIHRoaXMuZW1pdCA9IHRoaXMuZW1pdC5iaW5kKHRoaXMpXG4gICAgdGhpcy5vbiA9IHRoaXMub24uYmluZCh0aGlzKVxuICAgIHRoaXMub25jZSA9IHRoaXMub25jZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5zZW5kID0gdGhpcy5zZW5kLmJpbmQodGhpcylcbiAgfVxuXG4gIGNsb3NlICgpIHtcbiAgICByZXR1cm4gdGhpcy5zb2NrZXQuY2xvc2UoKVxuICB9XG5cbiAgc2VuZCAoYWN0aW9uLCBwYXlsb2FkKSB7XG4gICAgLy8gYXR0YWNoIHV1aWRcblxuICAgIGlmICghdGhpcy5pc09wZW4pIHtcbiAgICAgIHRoaXMucXVldWVkLnB1c2goe2FjdGlvbiwgcGF5bG9hZH0pXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIGFjdGlvbixcbiAgICAgIHBheWxvYWRcbiAgICB9KSlcbiAgfVxuXG4gIG9uIChhY3Rpb24sIGhhbmRsZXIpIHtcbiAgICB0aGlzLmVtaXR0ZXIub24oYWN0aW9uLCBoYW5kbGVyKVxuICB9XG5cbiAgZW1pdCAoYWN0aW9uLCBwYXlsb2FkKSB7XG4gICAgdGhpcy5lbWl0dGVyLmVtaXQoYWN0aW9uLCBwYXlsb2FkKVxuICB9XG5cbiAgb25jZSAoYWN0aW9uLCBoYW5kbGVyKSB7XG4gICAgdGhpcy5lbWl0dGVyLm9uY2UoYWN0aW9uLCBoYW5kbGVyKVxuICB9XG5cbiAgX2hhbmRsZU1lc3NhZ2UgKGUpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IEpTT04ucGFyc2UoZS5kYXRhKVxuICAgICAgdGhpcy5lbWl0KG1lc3NhZ2UuYWN0aW9uLCBtZXNzYWdlLnBheWxvYWQpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgfVxuICB9XG59XG4iLCJjb25zdCB0aHJvdHRsZSA9IHJlcXVpcmUoJ2xvZGFzaC50aHJvdHRsZScpXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHNtYWxsIHV0aWxpdHkgZnVuY3Rpb25zIHRoYXQgaGVscCB3aXRoIGRvbSBtYW5pcHVsYXRpb24sIGFkZGluZyBsaXN0ZW5lcnMsXG4gKiBwcm9taXNlcyBhbmQgb3RoZXIgZ29vZCB0aGluZ3MuXG4gKlxuICogQG1vZHVsZSBVdGlsc1xuICovXG5cbmZ1bmN0aW9uIGlzVG91Y2hEZXZpY2UgKCkge1xuICByZXR1cm4gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8IC8vIHdvcmtzIG9uIG1vc3QgYnJvd3NlcnNcbiAgICAgICAgICBuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgICAvLyB3b3JrcyBvbiBJRTEwLzExIGFuZCBTdXJmYWNlXG59XG5cbmZ1bmN0aW9uIHRydW5jYXRlU3RyaW5nIChzdHIsIGxlbmd0aCkge1xuICBpZiAoc3RyLmxlbmd0aCA+IGxlbmd0aCkge1xuICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIGxlbmd0aCAvIDIpICsgJy4uLicgKyBzdHIuc3Vic3RyKHN0ci5sZW5ndGggLSBsZW5ndGggLyA0LCBzdHIubGVuZ3RoKVxuICB9XG4gIHJldHVybiBzdHJcblxuICAvLyBtb3JlIHByZWNpc2UgdmVyc2lvbiBpZiBuZWVkZWRcbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODMxNTgzXG59XG5cbmZ1bmN0aW9uIHNlY29uZHNUb1RpbWUgKHJhd1NlY29uZHMpIHtcbiAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHJhd1NlY29uZHMgLyAzNjAwKSAlIDI0XG4gIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKHJhd1NlY29uZHMgLyA2MCkgJSA2MFxuICBjb25zdCBzZWNvbmRzID0gTWF0aC5mbG9vcihyYXdTZWNvbmRzICUgNjApXG5cbiAgcmV0dXJuIHsgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMgfVxufVxuXG4vKipcbiAqIENvbnZlcnRzIGxpc3QgaW50byBhcnJheVxuKi9cbmZ1bmN0aW9uIHRvQXJyYXkgKGxpc3QpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGxpc3QgfHwgW10sIDApXG59XG5cbi8qKlxuICogUmV0dXJucyBhIHRpbWVzdGFtcCBpbiB0aGUgZm9ybWF0IG9mIGBob3VyczptaW51dGVzOnNlY29uZHNgXG4qL1xuZnVuY3Rpb24gZ2V0VGltZVN0YW1wICgpIHtcbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpXG4gIHZhciBob3VycyA9IHBhZChkYXRlLmdldEhvdXJzKCkudG9TdHJpbmcoKSlcbiAgdmFyIG1pbnV0ZXMgPSBwYWQoZGF0ZS5nZXRNaW51dGVzKCkudG9TdHJpbmcoKSlcbiAgdmFyIHNlY29uZHMgPSBwYWQoZGF0ZS5nZXRTZWNvbmRzKCkudG9TdHJpbmcoKSlcbiAgcmV0dXJuIGhvdXJzICsgJzonICsgbWludXRlcyArICc6JyArIHNlY29uZHNcbn1cblxuLyoqXG4gKiBBZGRzIHplcm8gdG8gc3RyaW5ncyBzaG9ydGVyIHRoYW4gdHdvIGNoYXJhY3RlcnNcbiovXG5mdW5jdGlvbiBwYWQgKHN0cikge1xuICByZXR1cm4gc3RyLmxlbmd0aCAhPT0gMiA/IDAgKyBzdHIgOiBzdHJcbn1cblxuLyoqXG4gKiBUYWtlcyBhIGZpbGUgb2JqZWN0IGFuZCB0dXJucyBpdCBpbnRvIGZpbGVJRCwgYnkgY29udmVydGluZyBmaWxlLm5hbWUgdG8gbG93ZXJjYXNlLFxuICogcmVtb3ZpbmcgZXh0cmEgY2hhcmFjdGVycyBhbmQgYWRkaW5nIHR5cGUsIHNpemUgYW5kIGxhc3RNb2RpZmllZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHRoZSBmaWxlSURcbiAqXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZUlEIChmaWxlKSB7XG4gIC8vIGZpbHRlciBpcyBuZWVkZWQgdG8gbm90IGpvaW4gZW1wdHkgdmFsdWVzIHdpdGggYC1gXG4gIHJldHVybiBbXG4gICAgJ3VwcHknLFxuICAgIGZpbGUubmFtZSA/IGZpbGUubmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teQS1aMC05XS9pZywgJycpIDogJycsXG4gICAgZmlsZS50eXBlLFxuICAgIGZpbGUuZGF0YS5zaXplLFxuICAgIGZpbGUuZGF0YS5sYXN0TW9kaWZpZWRcbiAgXS5maWx0ZXIodmFsID0+IHZhbCkuam9pbignLScpXG59XG5cbi8qKlxuICogUnVucyBhbiBhcnJheSBvZiBwcm9taXNlLXJldHVybmluZyBmdW5jdGlvbnMgaW4gc2VxdWVuY2UuXG4gKi9cbmZ1bmN0aW9uIHJ1blByb21pc2VTZXF1ZW5jZSAoZnVuY3Rpb25zLCAuLi5hcmdzKSB7XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKClcbiAgZnVuY3Rpb25zLmZvckVhY2goKGZ1bmMpID0+IHtcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCgpID0+IGZ1bmMoLi4uYXJncykpXG4gIH0pXG4gIHJldHVybiBwcm9taXNlXG59XG5cbmZ1bmN0aW9uIGlzUHJldmlld1N1cHBvcnRlZCAoZmlsZVR5cGUpIHtcbiAgaWYgKCFmaWxlVHlwZSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGZpbGVUeXBlU3BlY2lmaWMgPSBmaWxlVHlwZS5zcGxpdCgnLycpWzFdXG4gIC8vIGxpc3Qgb2YgaW1hZ2VzIHRoYXQgYnJvd3NlcnMgY2FuIHByZXZpZXdcbiAgaWYgKC9eKGpwZWd8Z2lmfHBuZ3xzdmd8c3ZnXFwreG1sfGJtcCkkLy50ZXN0KGZpbGVUeXBlU3BlY2lmaWMpKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuZnVuY3Rpb24gZ2V0QXJyYXlCdWZmZXIgKGNodW5rKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAvLyBlLnRhcmdldC5yZXN1bHQgaXMgYW4gQXJyYXlCdWZmZXJcbiAgICAgIHJlc29sdmUoZS50YXJnZXQucmVzdWx0KVxuICAgIH0pXG4gICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignRmlsZVJlYWRlciBlcnJvcicgKyBlcnIpXG4gICAgICByZWplY3QoZXJyKVxuICAgIH0pXG4gICAgLy8gZmlsZS10eXBlIG9ubHkgbmVlZHMgdGhlIGZpcnN0IDQxMDAgYnl0ZXNcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoY2h1bmspXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGdldEZpbGVUeXBlIChmaWxlKSB7XG4gIGNvbnN0IGV4dGVuc2lvbnNUb01pbWUgPSB7XG4gICAgJ21kJzogJ3RleHQvbWFya2Rvd24nLFxuICAgICdtYXJrZG93bic6ICd0ZXh0L21hcmtkb3duJyxcbiAgICAnbXA0JzogJ3ZpZGVvL21wNCcsXG4gICAgJ21wMyc6ICdhdWRpby9tcDMnLFxuICAgICdzdmcnOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgJ2pwZyc6ICdpbWFnZS9qcGVnJyxcbiAgICAncG5nJzogJ2ltYWdlL3BuZycsXG4gICAgJ2dpZic6ICdpbWFnZS9naWYnLFxuICAgICd5YW1sJzogJ3RleHQveWFtbCcsXG4gICAgJ3ltbCc6ICd0ZXh0L3lhbWwnXG4gIH1cblxuICBjb25zdCBmaWxlRXh0ZW5zaW9uID0gZmlsZS5uYW1lID8gZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24oZmlsZS5uYW1lKS5leHRlbnNpb24gOiBudWxsXG5cbiAgaWYgKGZpbGUuaXNSZW1vdGUpIHtcbiAgICAvLyBzb21lIHJlbW90ZSBwcm92aWRlcnMgZG8gbm90IHN1cHBvcnQgZmlsZSB0eXBlc1xuICAgIHJldHVybiBmaWxlLnR5cGUgPyBmaWxlLnR5cGUgOiBleHRlbnNpb25zVG9NaW1lW2ZpbGVFeHRlbnNpb25dXG4gIH1cblxuICAvLyAyLiBpZiB0aGF04oCZcyBubyBnb29kLCBjaGVjayBpZiBtaW1lIHR5cGUgaXMgc2V0IGluIHRoZSBmaWxlIG9iamVjdFxuICBpZiAoZmlsZS50eXBlKSB7XG4gICAgcmV0dXJuIGZpbGUudHlwZVxuICB9XG5cbiAgLy8gMy4gaWYgdGhhdOKAmXMgbm8gZ29vZCwgc2VlIGlmIHdlIGNhbiBtYXAgZXh0ZW5zaW9uIHRvIGEgbWltZSB0eXBlXG4gIGlmIChmaWxlRXh0ZW5zaW9uICYmIGV4dGVuc2lvbnNUb01pbWVbZmlsZUV4dGVuc2lvbl0pIHtcbiAgICByZXR1cm4gZXh0ZW5zaW9uc1RvTWltZVtmaWxlRXh0ZW5zaW9uXVxuICB9XG5cbiAgLy8gaWYgYWxsIGZhaWxzLCB3ZWxsLCByZXR1cm4gZW1wdHlcbiAgcmV0dXJuIG51bGxcbn1cblxuLy8gVE9ETyBDaGVjayB3aGljaCB0eXBlcyBhcmUgYWN0dWFsbHkgc3VwcG9ydGVkIGluIGJyb3dzZXJzLiBDaHJvbWUgbGlrZXMgd2VibVxuLy8gZnJvbSBteSB0ZXN0aW5nLCBidXQgd2UgbWF5IG5lZWQgbW9yZS5cbi8vIFdlIGNvdWxkIHVzZSBhIGxpYnJhcnkgYnV0IHRoZXkgdGVuZCB0byBjb250YWluIGRvemVucyBvZiBLQnMgb2YgbWFwcGluZ3MsXG4vLyBtb3N0IG9mIHdoaWNoIHdpbGwgZ28gdW51c2VkLCBzbyBub3Qgc3VyZSBpZiB0aGF0J3Mgd29ydGggaXQuXG5jb25zdCBtaW1lVG9FeHRlbnNpb25zID0ge1xuICAndmlkZW8vb2dnJzogJ29ndicsXG4gICdhdWRpby9vZ2cnOiAnb2dnJyxcbiAgJ3ZpZGVvL3dlYm0nOiAnd2VibScsXG4gICdhdWRpby93ZWJtJzogJ3dlYm0nLFxuICAndmlkZW8vbXA0JzogJ21wNCcsXG4gICdhdWRpby9tcDMnOiAnbXAzJ1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlVHlwZUV4dGVuc2lvbiAobWltZVR5cGUpIHtcbiAgcmV0dXJuIG1pbWVUb0V4dGVuc2lvbnNbbWltZVR5cGVdIHx8IG51bGxcbn1cblxuLyoqXG4qIFRha2VzIGEgZnVsbCBmaWxlbmFtZSBzdHJpbmcgYW5kIHJldHVybnMgYW4gb2JqZWN0IHtuYW1lLCBleHRlbnNpb259XG4qXG4qIEBwYXJhbSB7c3RyaW5nfSBmdWxsRmlsZU5hbWVcbiogQHJldHVybiB7b2JqZWN0fSB7bmFtZSwgZXh0ZW5zaW9ufVxuKi9cbmZ1bmN0aW9uIGdldEZpbGVOYW1lQW5kRXh0ZW5zaW9uIChmdWxsRmlsZU5hbWUpIHtcbiAgdmFyIHJlID0gLyg/OlxcLihbXi5dKykpPyQvXG4gIHZhciBmaWxlRXh0ID0gcmUuZXhlYyhmdWxsRmlsZU5hbWUpWzFdXG4gIHZhciBmaWxlTmFtZSA9IGZ1bGxGaWxlTmFtZS5yZXBsYWNlKCcuJyArIGZpbGVFeHQsICcnKVxuICByZXR1cm4ge1xuICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgIGV4dGVuc2lvbjogZmlsZUV4dFxuICB9XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBVUkwgc3RyaW5nIGlzIGFuIG9iamVjdCBVUkwgZnJvbSBgVVJMLmNyZWF0ZU9iamVjdFVSTGAuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybFxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RVUkwgKHVybCkge1xuICByZXR1cm4gdXJsLmluZGV4T2YoJ2Jsb2I6JykgPT09IDBcbn1cblxuZnVuY3Rpb24gZ2V0UHJvcG9ydGlvbmFsSGVpZ2h0IChpbWcsIHdpZHRoKSB7XG4gIGNvbnN0IGFzcGVjdCA9IGltZy53aWR0aCAvIGltZy5oZWlnaHRcbiAgcmV0dXJuIE1hdGgucm91bmQod2lkdGggLyBhc3BlY3QpXG59XG5cbi8qKlxuICogQ3JlYXRlIGEgdGh1bWJuYWlsIGZvciB0aGUgZ2l2ZW4gVXBweSBmaWxlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge3tkYXRhOiBCbG9ifX0gZmlsZVxuICogQHBhcmFtIHtudW1iZXJ9IHdpZHRoXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5mdW5jdGlvbiBjcmVhdGVUaHVtYm5haWwgKGZpbGUsIHRhcmdldFdpZHRoKSB7XG4gIGNvbnN0IG9yaWdpbmFsVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlLmRhdGEpXG4gIGNvbnN0IG9ubG9hZCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpXG4gICAgaW1hZ2Uuc3JjID0gb3JpZ2luYWxVcmxcbiAgICBpbWFnZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKG9yaWdpbmFsVXJsKVxuICAgICAgcmVzb2x2ZShpbWFnZSlcbiAgICB9XG4gICAgaW1hZ2Uub25lcnJvciA9ICgpID0+IHtcbiAgICAgIC8vIFRoZSBvbmVycm9yIGV2ZW50IGlzIHRvdGFsbHkgdXNlbGVzcyB1bmZvcnR1bmF0ZWx5LCBhcyBmYXIgYXMgSSBrbm93XG4gICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKG9yaWdpbmFsVXJsKVxuICAgICAgcmVqZWN0KG5ldyBFcnJvcignQ291bGQgbm90IGNyZWF0ZSB0aHVtYm5haWwnKSlcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIG9ubG9hZC50aGVuKChpbWFnZSkgPT4ge1xuICAgIGNvbnN0IHRhcmdldEhlaWdodCA9IGdldFByb3BvcnRpb25hbEhlaWdodChpbWFnZSwgdGFyZ2V0V2lkdGgpXG4gICAgY29uc3QgY2FudmFzID0gcmVzaXplSW1hZ2UoaW1hZ2UsIHRhcmdldFdpZHRoLCB0YXJnZXRIZWlnaHQpXG4gICAgcmV0dXJuIGNhbnZhc1RvQmxvYihjYW52YXMsICdpbWFnZS9wbmcnKVxuICB9KS50aGVuKChibG9iKSA9PiB7XG4gICAgcmV0dXJuIFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYilcbiAgfSlcbn1cblxuLyoqXG4gKiBSZXNpemUgYW4gaW1hZ2UgdG8gdGhlIHRhcmdldCBgd2lkdGhgIGFuZCBgaGVpZ2h0YC5cbiAqXG4gKiBSZXR1cm5zIGEgQ2FudmFzIHdpdGggdGhlIHJlc2l6ZWQgaW1hZ2Ugb24gaXQuXG4gKi9cbmZ1bmN0aW9uIHJlc2l6ZUltYWdlIChpbWFnZSwgdGFyZ2V0V2lkdGgsIHRhcmdldEhlaWdodCkge1xuICBsZXQgc291cmNlV2lkdGggPSBpbWFnZS53aWR0aFxuICBsZXQgc291cmNlSGVpZ2h0ID0gaW1hZ2UuaGVpZ2h0XG5cbiAgaWYgKHRhcmdldEhlaWdodCA8IGltYWdlLmhlaWdodCAvIDIpIHtcbiAgICBjb25zdCBzdGVwcyA9IE1hdGguZmxvb3IoTWF0aC5sb2coaW1hZ2Uud2lkdGggLyB0YXJnZXRXaWR0aCkgLyBNYXRoLmxvZygyKSlcbiAgICBjb25zdCBzdGVwU2NhbGVkID0gZG93blNjYWxlSW5TdGVwcyhpbWFnZSwgc3RlcHMpXG4gICAgaW1hZ2UgPSBzdGVwU2NhbGVkLmltYWdlXG4gICAgc291cmNlV2lkdGggPSBzdGVwU2NhbGVkLnNvdXJjZVdpZHRoXG4gICAgc291cmNlSGVpZ2h0ID0gc3RlcFNjYWxlZC5zb3VyY2VIZWlnaHRcbiAgfVxuXG4gIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gIGNhbnZhcy53aWR0aCA9IHRhcmdldFdpZHRoXG4gIGNhbnZhcy5oZWlnaHQgPSB0YXJnZXRIZWlnaHRcblxuICBjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsXG4gICAgMCwgMCwgc291cmNlV2lkdGgsIHNvdXJjZUhlaWdodCxcbiAgICAwLCAwLCB0YXJnZXRXaWR0aCwgdGFyZ2V0SGVpZ2h0KVxuXG4gIHJldHVybiBjYW52YXNcbn1cblxuLyoqXG4gKiBEb3duc2NhbGUgYW4gaW1hZ2UgYnkgNTAlIGBzdGVwc2AgdGltZXMuXG4gKi9cbmZ1bmN0aW9uIGRvd25TY2FsZUluU3RlcHMgKGltYWdlLCBzdGVwcykge1xuICBsZXQgc291cmNlID0gaW1hZ2VcbiAgbGV0IGN1cnJlbnRXaWR0aCA9IHNvdXJjZS53aWR0aFxuICBsZXQgY3VycmVudEhlaWdodCA9IHNvdXJjZS5oZWlnaHRcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ZXBzOyBpICs9IDEpIHtcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuICAgIGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgIGNhbnZhcy53aWR0aCA9IGN1cnJlbnRXaWR0aCAvIDJcbiAgICBjYW52YXMuaGVpZ2h0ID0gY3VycmVudEhlaWdodCAvIDJcbiAgICBjb250ZXh0LmRyYXdJbWFnZShzb3VyY2UsXG4gICAgICAvLyBUaGUgZW50aXJlIHNvdXJjZSBpbWFnZS4gV2UgcGFzcyB3aWR0aCBhbmQgaGVpZ2h0IGhlcmUsXG4gICAgICAvLyBiZWNhdXNlIHdlIHJldXNlIHRoaXMgY2FudmFzLCBhbmQgc2hvdWxkIG9ubHkgc2NhbGUgZG93blxuICAgICAgLy8gdGhlIHBhcnQgb2YgdGhlIGNhbnZhcyB0aGF0IGNvbnRhaW5zIHRoZSBwcmV2aW91cyBzY2FsZSBzdGVwLlxuICAgICAgMCwgMCwgY3VycmVudFdpZHRoLCBjdXJyZW50SGVpZ2h0LFxuICAgICAgLy8gRHJhdyB0byA1MCUgc2l6ZVxuICAgICAgMCwgMCwgY3VycmVudFdpZHRoIC8gMiwgY3VycmVudEhlaWdodCAvIDIpXG4gICAgY3VycmVudFdpZHRoIC89IDJcbiAgICBjdXJyZW50SGVpZ2h0IC89IDJcbiAgICBzb3VyY2UgPSBjYW52YXNcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW1hZ2U6IHNvdXJjZSxcbiAgICBzb3VyY2VXaWR0aDogY3VycmVudFdpZHRoLFxuICAgIHNvdXJjZUhlaWdodDogY3VycmVudEhlaWdodFxuICB9XG59XG5cbi8qKlxuICogU2F2ZSBhIDxjYW52YXM+IGVsZW1lbnQncyBjb250ZW50IHRvIGEgQmxvYiBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtIVE1MQ2FudmFzRWxlbWVudH0gY2FudmFzXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5mdW5jdGlvbiBjYW52YXNUb0Jsb2IgKGNhbnZhcywgdHlwZSwgcXVhbGl0eSkge1xuICBpZiAoY2FudmFzLnRvQmxvYikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgY2FudmFzLnRvQmxvYihyZXNvbHZlLCB0eXBlLCBxdWFsaXR5KVxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xuICAgIHJldHVybiBkYXRhVVJJdG9CbG9iKGNhbnZhcy50b0RhdGFVUkwodHlwZSwgcXVhbGl0eSksIHt9KVxuICB9KVxufVxuXG5mdW5jdGlvbiBkYXRhVVJJdG9CbG9iIChkYXRhVVJJLCBvcHRzLCB0b0ZpbGUpIHtcbiAgLy8gZ2V0IHRoZSBiYXNlNjQgZGF0YVxuICB2YXIgZGF0YSA9IGRhdGFVUkkuc3BsaXQoJywnKVsxXVxuXG4gIC8vIHVzZXIgbWF5IHByb3ZpZGUgbWltZSB0eXBlLCBpZiBub3QgZ2V0IGl0IGZyb20gZGF0YSBVUklcbiAgdmFyIG1pbWVUeXBlID0gb3B0cy5taW1lVHlwZSB8fCBkYXRhVVJJLnNwbGl0KCcsJylbMF0uc3BsaXQoJzonKVsxXS5zcGxpdCgnOycpWzBdXG5cbiAgLy8gZGVmYXVsdCB0byBwbGFpbi90ZXh0IGlmIGRhdGEgVVJJIGhhcyBubyBtaW1lVHlwZVxuICBpZiAobWltZVR5cGUgPT0gbnVsbCkge1xuICAgIG1pbWVUeXBlID0gJ3BsYWluL3RleHQnXG4gIH1cblxuICB2YXIgYmluYXJ5ID0gYXRvYihkYXRhKVxuICB2YXIgYXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGJpbmFyeS5sZW5ndGg7IGkrKykge1xuICAgIGFycmF5LnB1c2goYmluYXJ5LmNoYXJDb2RlQXQoaSkpXG4gIH1cblxuICAvLyBDb252ZXJ0IHRvIGEgRmlsZT9cbiAgaWYgKHRvRmlsZSkge1xuICAgIHJldHVybiBuZXcgRmlsZShbbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXSwgb3B0cy5uYW1lIHx8ICcnLCB7dHlwZTogbWltZVR5cGV9KVxuICB9XG5cbiAgcmV0dXJuIG5ldyBCbG9iKFtuZXcgVWludDhBcnJheShhcnJheSldLCB7dHlwZTogbWltZVR5cGV9KVxufVxuXG5mdW5jdGlvbiBkYXRhVVJJdG9GaWxlIChkYXRhVVJJLCBvcHRzKSB7XG4gIHJldHVybiBkYXRhVVJJdG9CbG9iKGRhdGFVUkksIG9wdHMsIHRydWUpXG59XG5cbi8qKlxuICogQ29waWVzIHRleHQgdG8gY2xpcGJvYXJkIGJ5IGNyZWF0aW5nIGFuIGFsbW9zdCBpbnZpc2libGUgdGV4dGFyZWEsXG4gKiBhZGRpbmcgdGV4dCB0aGVyZSwgdGhlbiBydW5uaW5nIGV4ZWNDb21tYW5kKCdjb3B5JykuXG4gKiBGYWxscyBiYWNrIHRvIHByb21wdCgpIHdoZW4gdGhlIGVhc3kgd2F5IGZhaWxzIChoZWxsbywgU2FmYXJpISlcbiAqIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzA4MTAzMjJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdGV4dFRvQ29weVxuICogQHBhcmFtIHtTdHJpbmd9IGZhbGxiYWNrU3RyaW5nXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5mdW5jdGlvbiBjb3B5VG9DbGlwYm9hcmQgKHRleHRUb0NvcHksIGZhbGxiYWNrU3RyaW5nKSB7XG4gIGZhbGxiYWNrU3RyaW5nID0gZmFsbGJhY2tTdHJpbmcgfHwgJ0NvcHkgdGhlIFVSTCBiZWxvdydcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCB0ZXh0QXJlYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJylcbiAgICB0ZXh0QXJlYS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywge1xuICAgICAgcG9zaXRpb246ICdmaXhlZCcsXG4gICAgICB0b3A6IDAsXG4gICAgICBsZWZ0OiAwLFxuICAgICAgd2lkdGg6ICcyZW0nLFxuICAgICAgaGVpZ2h0OiAnMmVtJyxcbiAgICAgIHBhZGRpbmc6IDAsXG4gICAgICBib3JkZXI6ICdub25lJyxcbiAgICAgIG91dGxpbmU6ICdub25lJyxcbiAgICAgIGJveFNoYWRvdzogJ25vbmUnLFxuICAgICAgYmFja2dyb3VuZDogJ3RyYW5zcGFyZW50J1xuICAgIH0pXG5cbiAgICB0ZXh0QXJlYS52YWx1ZSA9IHRleHRUb0NvcHlcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRleHRBcmVhKVxuICAgIHRleHRBcmVhLnNlbGVjdCgpXG5cbiAgICBjb25zdCBtYWdpY0NvcHlGYWlsZWQgPSAoKSA9PiB7XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKVxuICAgICAgd2luZG93LnByb21wdChmYWxsYmFja1N0cmluZywgdGV4dFRvQ29weSlcbiAgICAgIHJlc29sdmUoKVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdWNjZXNzZnVsID0gZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKVxuICAgICAgaWYgKCFzdWNjZXNzZnVsKSB7XG4gICAgICAgIHJldHVybiBtYWdpY0NvcHlGYWlsZWQoJ2NvcHkgY29tbWFuZCB1bmF2YWlsYWJsZScpXG4gICAgICB9XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKVxuICAgICAgcmV0dXJuIHJlc29sdmUoKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXh0QXJlYSlcbiAgICAgIHJldHVybiBtYWdpY0NvcHlGYWlsZWQoZXJyKVxuICAgIH1cbiAgfSlcbn1cblxuZnVuY3Rpb24gZ2V0U3BlZWQgKGZpbGVQcm9ncmVzcykge1xuICBpZiAoIWZpbGVQcm9ncmVzcy5ieXRlc1VwbG9hZGVkKSByZXR1cm4gMFxuXG4gIGNvbnN0IHRpbWVFbGFwc2VkID0gKG5ldyBEYXRlKCkpIC0gZmlsZVByb2dyZXNzLnVwbG9hZFN0YXJ0ZWRcbiAgY29uc3QgdXBsb2FkU3BlZWQgPSBmaWxlUHJvZ3Jlc3MuYnl0ZXNVcGxvYWRlZCAvICh0aW1lRWxhcHNlZCAvIDEwMDApXG4gIHJldHVybiB1cGxvYWRTcGVlZFxufVxuXG5mdW5jdGlvbiBnZXRCeXRlc1JlbWFpbmluZyAoZmlsZVByb2dyZXNzKSB7XG4gIHJldHVybiBmaWxlUHJvZ3Jlc3MuYnl0ZXNUb3RhbCAtIGZpbGVQcm9ncmVzcy5ieXRlc1VwbG9hZGVkXG59XG5cbmZ1bmN0aW9uIGdldEVUQSAoZmlsZVByb2dyZXNzKSB7XG4gIGlmICghZmlsZVByb2dyZXNzLmJ5dGVzVXBsb2FkZWQpIHJldHVybiAwXG5cbiAgY29uc3QgdXBsb2FkU3BlZWQgPSBnZXRTcGVlZChmaWxlUHJvZ3Jlc3MpXG4gIGNvbnN0IGJ5dGVzUmVtYWluaW5nID0gZ2V0Qnl0ZXNSZW1haW5pbmcoZmlsZVByb2dyZXNzKVxuICBjb25zdCBzZWNvbmRzUmVtYWluaW5nID0gTWF0aC5yb3VuZChieXRlc1JlbWFpbmluZyAvIHVwbG9hZFNwZWVkICogMTApIC8gMTBcblxuICByZXR1cm4gc2Vjb25kc1JlbWFpbmluZ1xufVxuXG5mdW5jdGlvbiBwcmV0dHlFVEEgKHNlY29uZHMpIHtcbiAgY29uc3QgdGltZSA9IHNlY29uZHNUb1RpbWUoc2Vjb25kcylcblxuICAvLyBPbmx5IGRpc3BsYXkgaG91cnMgYW5kIG1pbnV0ZXMgaWYgdGhleSBhcmUgZ3JlYXRlciB0aGFuIDAgYnV0IGFsd2F5c1xuICAvLyBkaXNwbGF5IG1pbnV0ZXMgaWYgaG91cnMgaXMgYmVpbmcgZGlzcGxheWVkXG4gIC8vIERpc3BsYXkgYSBsZWFkaW5nIHplcm8gaWYgdGhlIHRoZXJlIGlzIGEgcHJlY2VkaW5nIHVuaXQ6IDFtIDA1cywgYnV0IDVzXG4gIGNvbnN0IGhvdXJzU3RyID0gdGltZS5ob3VycyA/IHRpbWUuaG91cnMgKyAnaCAnIDogJydcbiAgY29uc3QgbWludXRlc1ZhbCA9IHRpbWUuaG91cnMgPyAoJzAnICsgdGltZS5taW51dGVzKS5zdWJzdHIoLTIpIDogdGltZS5taW51dGVzXG4gIGNvbnN0IG1pbnV0ZXNTdHIgPSBtaW51dGVzVmFsID8gbWludXRlc1ZhbCArICdtICcgOiAnJ1xuICBjb25zdCBzZWNvbmRzVmFsID0gbWludXRlc1ZhbCA/ICgnMCcgKyB0aW1lLnNlY29uZHMpLnN1YnN0cigtMikgOiB0aW1lLnNlY29uZHNcbiAgY29uc3Qgc2Vjb25kc1N0ciA9IHNlY29uZHNWYWwgKyAncydcblxuICByZXR1cm4gYCR7aG91cnNTdHJ9JHttaW51dGVzU3RyfSR7c2Vjb25kc1N0cn1gXG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYW4gb2JqZWN0IGlzIGEgRE9NIGVsZW1lbnQuIER1Y2stdHlwaW5nIGJhc2VkIG9uIGBub2RlVHlwZWAuXG4gKlxuICogQHBhcmFtIHsqfSBvYmpcbiAqL1xuZnVuY3Rpb24gaXNET01FbGVtZW50IChvYmopIHtcbiAgcmV0dXJuIG9iaiAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiBvYmoubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFXG59XG5cbi8qKlxuICogRmluZCBhIERPTSBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZXxzdHJpbmd9IGVsZW1lbnRcbiAqIEByZXR1cm4ge05vZGV8bnVsbH1cbiAqL1xuZnVuY3Rpb24gZmluZERPTUVsZW1lbnQgKGVsZW1lbnQpIHtcbiAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnQpXG4gIH1cblxuICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdvYmplY3QnICYmIGlzRE9NRWxlbWVudChlbGVtZW50KSkge1xuICAgIHJldHVybiBlbGVtZW50XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kIG9uZSBvciBtb3JlIERPTSBlbGVtZW50cy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gZWxlbWVudFxuICogQHJldHVybiB7QXJyYXl8bnVsbH1cbiAqL1xuZnVuY3Rpb24gZmluZEFsbERPTUVsZW1lbnRzIChlbGVtZW50KSB7XG4gIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBlbGVtZW50cyA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChlbGVtZW50KSlcbiAgICByZXR1cm4gZWxlbWVudHMubGVuZ3RoID4gMCA/IGVsZW1lbnRzIDogbnVsbFxuICB9XG5cbiAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnb2JqZWN0JyAmJiBpc0RPTUVsZW1lbnQoZWxlbWVudCkpIHtcbiAgICByZXR1cm4gW2VsZW1lbnRdXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U29ja2V0SG9zdCAodXJsKSB7XG4gIC8vIGdldCB0aGUgaG9zdCBkb21haW5cbiAgdmFyIHJlZ2V4ID0gL14oPzpodHRwcz86XFwvXFwvfFxcL1xcLyk/KD86W15AXFxuXStAKT8oPzp3d3dcXC4pPyhbXlxcbl0rKS9cbiAgdmFyIGhvc3QgPSByZWdleC5leGVjKHVybClbMV1cbiAgdmFyIHNvY2tldFByb3RvY29sID0gbG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonID8gJ3dzcycgOiAnd3MnXG5cbiAgcmV0dXJuIGAke3NvY2tldFByb3RvY29sfTovLyR7aG9zdH1gXG59XG5cbmZ1bmN0aW9uIF9lbWl0U29ja2V0UHJvZ3Jlc3MgKHVwbG9hZGVyLCBwcm9ncmVzc0RhdGEsIGZpbGUpIHtcbiAgY29uc3QgeyBwcm9ncmVzcywgYnl0ZXNVcGxvYWRlZCwgYnl0ZXNUb3RhbCB9ID0gcHJvZ3Jlc3NEYXRhXG4gIGlmIChwcm9ncmVzcykge1xuICAgIHVwbG9hZGVyLnVwcHkubG9nKGBVcGxvYWQgcHJvZ3Jlc3M6ICR7cHJvZ3Jlc3N9YClcbiAgICB1cGxvYWRlci51cHB5LmVtaXQoJ3VwbG9hZC1wcm9ncmVzcycsIGZpbGUsIHtcbiAgICAgIHVwbG9hZGVyLFxuICAgICAgYnl0ZXNVcGxvYWRlZDogYnl0ZXNVcGxvYWRlZCxcbiAgICAgIGJ5dGVzVG90YWw6IGJ5dGVzVG90YWxcbiAgICB9KVxuICB9XG59XG5cbmNvbnN0IGVtaXRTb2NrZXRQcm9ncmVzcyA9IHRocm90dGxlKF9lbWl0U29ja2V0UHJvZ3Jlc3MsIDMwMCwge2xlYWRpbmc6IHRydWUsIHRyYWlsaW5nOiB0cnVlfSlcblxuZnVuY3Rpb24gc2V0dGxlIChwcm9taXNlcykge1xuICBjb25zdCByZXNvbHV0aW9ucyA9IFtdXG4gIGNvbnN0IHJlamVjdGlvbnMgPSBbXVxuICBmdW5jdGlvbiByZXNvbHZlZCAodmFsdWUpIHtcbiAgICByZXNvbHV0aW9ucy5wdXNoKHZhbHVlKVxuICB9XG4gIGZ1bmN0aW9uIHJlamVjdGVkIChlcnJvcikge1xuICAgIHJlamVjdGlvbnMucHVzaChlcnJvcilcbiAgfVxuXG4gIGNvbnN0IHdhaXQgPSBQcm9taXNlLmFsbChcbiAgICBwcm9taXNlcy5tYXAoKHByb21pc2UpID0+IHByb21pc2UudGhlbihyZXNvbHZlZCwgcmVqZWN0ZWQpKVxuICApXG5cbiAgcmV0dXJuIHdhaXQudGhlbigoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3NmdWw6IHJlc29sdXRpb25zLFxuICAgICAgZmFpbGVkOiByZWplY3Rpb25zXG4gICAgfVxuICB9KVxufVxuXG4vKipcbiAqIExpbWl0IHRoZSBhbW91bnQgb2Ygc2ltdWx0YW5lb3VzbHkgcGVuZGluZyBQcm9taXNlcy5cbiAqIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIHBhc3NlZCBhIGZ1bmN0aW9uIGBmbmAsXG4gKiB3aWxsIG1ha2Ugc3VyZSB0aGF0IGF0IG1vc3QgYGxpbWl0YCBjYWxscyB0byBgZm5gIGFyZSBwZW5kaW5nLlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdFxuICogQHJldHVybiB7ZnVuY3Rpb24oKX1cbiAqL1xuZnVuY3Rpb24gbGltaXRQcm9taXNlcyAobGltaXQpIHtcbiAgbGV0IHBlbmRpbmcgPSAwXG4gIGNvbnN0IHF1ZXVlID0gW11cbiAgcmV0dXJuIChmbikgPT4ge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgY29uc3QgY2FsbCA9ICgpID0+IHtcbiAgICAgICAgcGVuZGluZysrXG4gICAgICAgIGNvbnN0IHByb21pc2UgPSBmbiguLi5hcmdzKVxuICAgICAgICBwcm9taXNlLnRoZW4ob25maW5pc2gsIG9uZmluaXNoKVxuICAgICAgICByZXR1cm4gcHJvbWlzZVxuICAgICAgfVxuXG4gICAgICBpZiAocGVuZGluZyA+PSBsaW1pdCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIHF1ZXVlLnB1c2goKCkgPT4ge1xuICAgICAgICAgICAgY2FsbCgpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gY2FsbCgpXG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG9uZmluaXNoICgpIHtcbiAgICBwZW5kaW5nLS1cbiAgICBjb25zdCBuZXh0ID0gcXVldWUuc2hpZnQoKVxuICAgIGlmIChuZXh0KSBuZXh0KClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2VuZXJhdGVGaWxlSUQsXG4gIHRvQXJyYXksXG4gIGdldFRpbWVTdGFtcCxcbiAgcnVuUHJvbWlzZVNlcXVlbmNlLFxuICBpc1RvdWNoRGV2aWNlLFxuICBnZXRGaWxlTmFtZUFuZEV4dGVuc2lvbixcbiAgdHJ1bmNhdGVTdHJpbmcsXG4gIGdldEZpbGVUeXBlRXh0ZW5zaW9uLFxuICBnZXRGaWxlVHlwZSxcbiAgZ2V0QXJyYXlCdWZmZXIsXG4gIGlzUHJldmlld1N1cHBvcnRlZCxcbiAgaXNPYmplY3RVUkwsXG4gIGNyZWF0ZVRodW1ibmFpbCxcbiAgc2Vjb25kc1RvVGltZSxcbiAgZGF0YVVSSXRvQmxvYixcbiAgZGF0YVVSSXRvRmlsZSxcbiAgY2FudmFzVG9CbG9iLFxuICBnZXRTcGVlZCxcbiAgZ2V0Qnl0ZXNSZW1haW5pbmcsXG4gIGdldEVUQSxcbiAgY29weVRvQ2xpcGJvYXJkLFxuICBwcmV0dHlFVEEsXG4gIGZpbmRET01FbGVtZW50LFxuICBmaW5kQWxsRE9NRWxlbWVudHMsXG4gIGdldFNvY2tldEhvc3QsXG4gIGVtaXRTb2NrZXRQcm9ncmVzcyxcbiAgc2V0dGxlLFxuICBsaW1pdFByb21pc2VzXG59XG4iLCJjb25zdCBQbHVnaW4gPSByZXF1aXJlKCcuLi9jb3JlL1BsdWdpbicpXG5jb25zdCB7IHRvQXJyYXkgfSA9IHJlcXVpcmUoJy4uL2NvcmUvVXRpbHMnKVxuY29uc3QgVHJhbnNsYXRvciA9IHJlcXVpcmUoJy4uL2NvcmUvVHJhbnNsYXRvcicpXG5jb25zdCB7IGggfSA9IHJlcXVpcmUoJ3ByZWFjdCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgRmlsZUlucHV0IGV4dGVuZHMgUGx1Z2luIHtcbiAgY29uc3RydWN0b3IgKHVwcHksIG9wdHMpIHtcbiAgICBzdXBlcih1cHB5LCBvcHRzKVxuICAgIHRoaXMuaWQgPSB0aGlzLm9wdHMuaWQgfHwgJ0ZpbGVJbnB1dCdcbiAgICB0aGlzLnRpdGxlID0gJ0ZpbGUgSW5wdXQnXG4gICAgdGhpcy50eXBlID0gJ2FjcXVpcmVyJ1xuXG4gICAgY29uc3QgZGVmYXVsdExvY2FsZSA9IHtcbiAgICAgIHN0cmluZ3M6IHtcbiAgICAgICAgY2hvb3NlRmlsZXM6ICdDaG9vc2UgZmlsZXMnXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICB0YXJnZXQ6IG51bGwsXG4gICAgICBwcmV0dHk6IHRydWUsXG4gICAgICBpbnB1dE5hbWU6ICdmaWxlc1tdJyxcbiAgICAgIGxvY2FsZTogZGVmYXVsdExvY2FsZVxuICAgIH1cblxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIHNldCBieSB1c2VyXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG5cbiAgICB0aGlzLmxvY2FsZSA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUsIHRoaXMub3B0cy5sb2NhbGUpXG4gICAgdGhpcy5sb2NhbGUuc3RyaW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUuc3RyaW5ncywgdGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzKVxuXG4gICAgLy8gaTE4blxuICAgIHRoaXMudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKHtsb2NhbGU6IHRoaXMubG9jYWxlfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuXG4gICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpXG4gICAgdGhpcy5oYW5kbGVJbnB1dENoYW5nZSA9IHRoaXMuaGFuZGxlSW5wdXRDaGFuZ2UuYmluZCh0aGlzKVxuICAgIHRoaXMuaGFuZGxlQ2xpY2sgPSB0aGlzLmhhbmRsZUNsaWNrLmJpbmQodGhpcylcbiAgfVxuXG4gIGhhbmRsZUlucHV0Q2hhbmdlIChldikge1xuICAgIHRoaXMudXBweS5sb2coJ1tGaWxlSW5wdXRdIFNvbWV0aGluZyBzZWxlY3RlZCB0aHJvdWdoIGlucHV0Li4uJylcblxuICAgIGNvbnN0IGZpbGVzID0gdG9BcnJheShldi50YXJnZXQuZmlsZXMpXG5cbiAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICB0aGlzLnVwcHkuYWRkRmlsZSh7XG4gICAgICAgIHNvdXJjZTogdGhpcy5pZCxcbiAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxuICAgICAgICB0eXBlOiBmaWxlLnR5cGUsXG4gICAgICAgIGRhdGE6IGZpbGVcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGhhbmRsZUNsaWNrIChldikge1xuICAgIHRoaXMuaW5wdXQuY2xpY2soKVxuICB9XG5cbiAgcmVuZGVyIChzdGF0ZSkge1xuICAgIC8qIGh0dHA6Ly90eW1wYW51cy5uZXQvY29kcm9wcy8yMDE1LzA5LzE1L3N0eWxpbmctY3VzdG9taXppbmctZmlsZS1pbnB1dHMtc21hcnQtd2F5LyAqL1xuICAgIGNvbnN0IGhpZGRlbklucHV0U3R5bGUgPSB7XG4gICAgICB3aWR0aDogJzAuMXB4JyxcbiAgICAgIGhlaWdodDogJzAuMXB4JyxcbiAgICAgIG9wYWNpdHk6IDAsXG4gICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgIHpJbmRleDogLTFcbiAgICB9XG5cbiAgICBjb25zdCByZXN0cmljdGlvbnMgPSB0aGlzLnVwcHkub3B0cy5yZXN0cmljdGlvbnNcblxuICAgIC8vIGVtcHR5IHZhbHVlPVwiXCIgb24gZmlsZSBpbnB1dCwgc28gdGhhdCB0aGUgaW5wdXQgaXMgY2xlYXJlZCBhZnRlciBhIGZpbGUgaXMgc2VsZWN0ZWQsXG4gICAgLy8gYmVjYXVzZSBVcHB5IHdpbGwgYmUgaGFuZGxpbmcgdGhlIHVwbG9hZCBhbmQgc28gd2UgY2FuIHNlbGVjdCBzYW1lIGZpbGVcbiAgICAvLyBhZnRlciByZW1vdmluZyDigJQgb3RoZXJ3aXNlIGJyb3dzZXIgdGhpbmtzIGl04oCZcyBhbHJlYWR5IHNlbGVjdGVkXG4gICAgcmV0dXJuIDxkaXYgY2xhc3M9XCJ1cHB5LVJvb3QgdXBweS1GaWxlSW5wdXQtY29udGFpbmVyXCI+XG4gICAgICA8aW5wdXQgY2xhc3M9XCJ1cHB5LUZpbGVJbnB1dC1pbnB1dFwiXG4gICAgICAgIHN0eWxlPXt0aGlzLm9wdHMucHJldHR5ICYmIGhpZGRlbklucHV0U3R5bGV9XG4gICAgICAgIHR5cGU9XCJmaWxlXCJcbiAgICAgICAgbmFtZT17dGhpcy5vcHRzLmlucHV0TmFtZX1cbiAgICAgICAgb25jaGFuZ2U9e3RoaXMuaGFuZGxlSW5wdXRDaGFuZ2V9XG4gICAgICAgIG11bHRpcGxlPXtyZXN0cmljdGlvbnMubWF4TnVtYmVyT2ZGaWxlcyAhPT0gMX1cbiAgICAgICAgYWNjZXB0PXtyZXN0cmljdGlvbnMuYWxsb3dlZEZpbGVUeXBlc31cbiAgICAgICAgcmVmPXsoaW5wdXQpID0+IHsgdGhpcy5pbnB1dCA9IGlucHV0IH19XG4gICAgICAgIHZhbHVlPVwiXCIgLz5cbiAgICAgIHt0aGlzLm9wdHMucHJldHR5ICYmXG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJ1cHB5LUZpbGVJbnB1dC1idG5cIiB0eXBlPVwiYnV0dG9uXCIgb25jbGljaz17dGhpcy5oYW5kbGVDbGlja30+XG4gICAgICAgICAge3RoaXMuaTE4bignY2hvb3NlRmlsZXMnKX1cbiAgICAgICAgPC9idXR0b24+XG4gICAgICB9XG4gICAgPC9kaXY+XG4gIH1cblxuICBpbnN0YWxsICgpIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm9wdHMudGFyZ2V0XG4gICAgaWYgKHRhcmdldCkge1xuICAgICAgdGhpcy5tb3VudCh0YXJnZXQsIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgdW5pbnN0YWxsICgpIHtcbiAgICB0aGlzLnVubW91bnQoKVxuICB9XG59XG4iLCJjb25zdCBQbHVnaW4gPSByZXF1aXJlKCcuLi9jb3JlL1BsdWdpbicpXG5jb25zdCB7IGggfSA9IHJlcXVpcmUoJ3ByZWFjdCcpXG5cbi8qKlxuICogUHJvZ3Jlc3MgYmFyXG4gKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFByb2dyZXNzQmFyIGV4dGVuZHMgUGx1Z2luIHtcbiAgY29uc3RydWN0b3IgKHVwcHksIG9wdHMpIHtcbiAgICBzdXBlcih1cHB5LCBvcHRzKVxuICAgIHRoaXMuaWQgPSB0aGlzLm9wdHMuaWQgfHwgJ1Byb2dyZXNzQmFyJ1xuICAgIHRoaXMudGl0bGUgPSAnUHJvZ3Jlc3MgQmFyJ1xuICAgIHRoaXMudHlwZSA9ICdwcm9ncmVzc2luZGljYXRvcidcblxuICAgIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIHRhcmdldDogJ2JvZHknLFxuICAgICAgcmVwbGFjZVRhcmdldENvbnRlbnQ6IGZhbHNlLFxuICAgICAgZml4ZWQ6IGZhbHNlLFxuICAgICAgaGlkZUFmdGVyRmluaXNoOiB0cnVlXG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKVxuICB9XG5cbiAgcmVuZGVyIChzdGF0ZSkge1xuICAgIGNvbnN0IHByb2dyZXNzID0gc3RhdGUudG90YWxQcm9ncmVzcyB8fCAwXG4gICAgY29uc3QgaXNIaWRkZW4gPSBwcm9ncmVzcyA9PT0gMTAwICYmIHRoaXMub3B0cy5oaWRlQWZ0ZXJGaW5pc2hcbiAgICByZXR1cm4gPGRpdiBjbGFzcz1cInVwcHkgdXBweS1Qcm9ncmVzc0JhclwiIHN0eWxlPXt7IHBvc2l0aW9uOiB0aGlzLm9wdHMuZml4ZWQgPyAnZml4ZWQnIDogJ2luaXRpYWwnIH19IGFyaWEtaGlkZGVuPXtpc0hpZGRlbn0+XG4gICAgICA8ZGl2IGNsYXNzPVwidXBweS1Qcm9ncmVzc0Jhci1pbm5lclwiIHN0eWxlPXt7IHdpZHRoOiBwcm9ncmVzcyArICclJyB9fSAvPlxuICAgICAgPGRpdiBjbGFzcz1cInVwcHktUHJvZ3Jlc3NCYXItcGVyY2VudGFnZVwiPntwcm9ncmVzc308L2Rpdj5cbiAgICA8L2Rpdj5cbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMub3B0cy50YXJnZXRcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICB0aGlzLm1vdW50KHRhcmdldCwgdGhpcylcbiAgICB9XG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudW5tb3VudCgpXG4gIH1cbn1cbiIsImNvbnN0IFBsdWdpbiA9IHJlcXVpcmUoJy4uL2NvcmUvUGx1Z2luJylcbmNvbnN0IGN1aWQgPSByZXF1aXJlKCdjdWlkJylcbmNvbnN0IFRyYW5zbGF0b3IgPSByZXF1aXJlKCcuLi9jb3JlL1RyYW5zbGF0b3InKVxuY29uc3QgVXBweVNvY2tldCA9IHJlcXVpcmUoJy4uL2NvcmUvVXBweVNvY2tldCcpXG5jb25zdCB7XG4gIGVtaXRTb2NrZXRQcm9ncmVzcyxcbiAgZ2V0U29ja2V0SG9zdCxcbiAgc2V0dGxlLFxuICBsaW1pdFByb21pc2VzXG59ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5cbmZ1bmN0aW9uIGJ1aWxkUmVzcG9uc2VFcnJvciAoeGhyLCBlcnJvcikge1xuICAvLyBObyBlcnJvciBtZXNzYWdlXG4gIGlmICghZXJyb3IpIGVycm9yID0gbmV3IEVycm9yKCdVcGxvYWQgZXJyb3InKVxuICAvLyBHb3QgYW4gZXJyb3IgbWVzc2FnZSBzdHJpbmdcbiAgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ3N0cmluZycpIGVycm9yID0gbmV3IEVycm9yKGVycm9yKVxuICAvLyBHb3Qgc29tZXRoaW5nIGVsc2VcbiAgaWYgKCEoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikpIHtcbiAgICBlcnJvciA9IE9iamVjdC5hc3NpZ24obmV3IEVycm9yKCdVcGxvYWQgZXJyb3InKSwgeyBkYXRhOiBlcnJvciB9KVxuICB9XG5cbiAgZXJyb3IucmVxdWVzdCA9IHhoclxuICByZXR1cm4gZXJyb3Jcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBYSFJVcGxvYWQgZXh0ZW5kcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHN1cGVyKHVwcHksIG9wdHMpXG4gICAgdGhpcy50eXBlID0gJ3VwbG9hZGVyJ1xuICAgIHRoaXMuaWQgPSAnWEhSVXBsb2FkJ1xuICAgIHRoaXMudGl0bGUgPSAnWEhSVXBsb2FkJ1xuXG4gICAgY29uc3QgZGVmYXVsdExvY2FsZSA9IHtcbiAgICAgIHN0cmluZ3M6IHtcbiAgICAgICAgdGltZWRPdXQ6ICdVcGxvYWQgc3RhbGxlZCBmb3IgJXtzZWNvbmRzfSBzZWNvbmRzLCBhYm9ydGluZy4nXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICBmb3JtRGF0YTogdHJ1ZSxcbiAgICAgIGZpZWxkTmFtZTogJ2ZpbGVzW10nLFxuICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICBtZXRhRmllbGRzOiBudWxsLFxuICAgICAgcmVzcG9uc2VVcmxGaWVsZE5hbWU6ICd1cmwnLFxuICAgICAgYnVuZGxlOiBmYWxzZSxcbiAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgbG9jYWxlOiBkZWZhdWx0TG9jYWxlLFxuICAgICAgdGltZW91dDogMzAgKiAxMDAwLFxuICAgICAgbGltaXQ6IDAsXG4gICAgICAvKipcbiAgICAgICAqIEB0eXBlZGVmIHJlc3BPYmpcbiAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSByZXNwb25zZVRleHRcbiAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzdGF0dXNcbiAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzdGF0dXNUZXh0XG4gICAgICAgKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCBzdHJpbmc+fSBoZWFkZXJzXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlVGV4dCB0aGUgcmVzcG9uc2UgYm9keSBzdHJpbmdcbiAgICAgICAqIEBwYXJhbSB7WE1MSHR0cFJlcXVlc3QgfCByZXNwT2JqfSByZXNwb25zZSB0aGUgcmVzcG9uc2Ugb2JqZWN0IChYSFIgb3Igc2ltaWxhcilcbiAgICAgICAqL1xuICAgICAgZ2V0UmVzcG9uc2VEYXRhIChyZXNwb25zZVRleHQsIHJlc3BvbnNlKSB7XG4gICAgICAgIGxldCBwYXJzZWRSZXNwb25zZSA9IHt9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyc2VkUmVzcG9uc2UgPSBKU09OLnBhcnNlKHJlc3BvbnNlVGV4dClcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlZFJlc3BvbnNlXG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlVGV4dCB0aGUgcmVzcG9uc2UgYm9keSBzdHJpbmdcbiAgICAgICAqIEBwYXJhbSB7WE1MSHR0cFJlcXVlc3QgfCByZXNwT2JqfSByZXNwb25zZSB0aGUgcmVzcG9uc2Ugb2JqZWN0IChYSFIgb3Igc2ltaWxhcilcbiAgICAgICAqL1xuICAgICAgZ2V0UmVzcG9uc2VFcnJvciAocmVzcG9uc2VUZXh0LCByZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gbmV3IEVycm9yKCdVcGxvYWQgZXJyb3InKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIHNldCBieSB1c2VyXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG4gICAgdGhpcy5sb2NhbGUgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0TG9jYWxlLCB0aGlzLm9wdHMubG9jYWxlKVxuICAgIHRoaXMubG9jYWxlLnN0cmluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0TG9jYWxlLnN0cmluZ3MsIHRoaXMub3B0cy5sb2NhbGUuc3RyaW5ncylcblxuICAgIC8vIGkxOG5cbiAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih7IGxvY2FsZTogdGhpcy5sb2NhbGUgfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuXG4gICAgdGhpcy5oYW5kbGVVcGxvYWQgPSB0aGlzLmhhbmRsZVVwbG9hZC5iaW5kKHRoaXMpXG5cbiAgICAvLyBTaW11bHRhbmVvdXMgdXBsb2FkIGxpbWl0aW5nIGlzIHNoYXJlZCBhY3Jvc3MgYWxsIHVwbG9hZHMgd2l0aCB0aGlzIHBsdWdpbi5cbiAgICBpZiAodHlwZW9mIHRoaXMub3B0cy5saW1pdCA9PT0gJ251bWJlcicgJiYgdGhpcy5vcHRzLmxpbWl0ICE9PSAwKSB7XG4gICAgICB0aGlzLmxpbWl0VXBsb2FkcyA9IGxpbWl0UHJvbWlzZXModGhpcy5vcHRzLmxpbWl0KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxpbWl0VXBsb2FkcyA9IChmbikgPT4gZm5cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRzLmJ1bmRsZSAmJiAhdGhpcy5vcHRzLmZvcm1EYXRhKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BvcHRzLmZvcm1EYXRhYCBtdXN0IGJlIHRydWUgd2hlbiBgb3B0cy5idW5kbGVgIGlzIGVuYWJsZWQuJylcbiAgICB9XG4gIH1cblxuICBnZXRPcHRpb25zIChmaWxlKSB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sXG4gICAgICB0aGlzLm9wdHMsXG4gICAgICB0aGlzLnVwcHkuc3RhdGUueGhyVXBsb2FkIHx8IHt9LFxuICAgICAgZmlsZS54aHJVcGxvYWQgfHwge31cbiAgICApXG4gICAgb3B0cy5oZWFkZXJzID0ge31cbiAgICBPYmplY3QuYXNzaWduKG9wdHMuaGVhZGVycywgdGhpcy5vcHRzLmhlYWRlcnMpXG4gICAgaWYgKHRoaXMudXBweS5zdGF0ZS54aHJVcGxvYWQpIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ob3B0cy5oZWFkZXJzLCB0aGlzLnVwcHkuc3RhdGUueGhyVXBsb2FkLmhlYWRlcnMpXG4gICAgfVxuICAgIGlmIChmaWxlLnhoclVwbG9hZCkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRzLmhlYWRlcnMsIGZpbGUueGhyVXBsb2FkLmhlYWRlcnMpXG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHNcbiAgfVxuXG4gIC8vIEhlbHBlciB0byBhYm9ydCB1cGxvYWQgcmVxdWVzdHMgaWYgdGhlcmUgaGFzIG5vdCBiZWVuIGFueSBwcm9ncmVzcyBmb3IgYHRpbWVvdXRgIG1zLlxuICAvLyBDcmVhdGUgYW4gaW5zdGFuY2UgdXNpbmcgYHRpbWVyID0gY3JlYXRlUHJvZ3Jlc3NUaW1lb3V0KDEwMDAwLCBvblRpbWVvdXQpYFxuICAvLyBDYWxsIGB0aW1lci5wcm9ncmVzcygpYCB0byBzaWduYWwgdGhhdCB0aGVyZSBoYXMgYmVlbiBwcm9ncmVzcyBvZiBhbnkga2luZC5cbiAgLy8gQ2FsbCBgdGltZXIuZG9uZSgpYCB3aGVuIHRoZSB1cGxvYWQgaGFzIGNvbXBsZXRlZC5cbiAgY3JlYXRlUHJvZ3Jlc3NUaW1lb3V0ICh0aW1lb3V0LCB0aW1lb3V0SGFuZGxlcikge1xuICAgIGNvbnN0IHVwcHkgPSB0aGlzLnVwcHlcbiAgICBjb25zdCBzZWxmID0gdGhpc1xuICAgIGZ1bmN0aW9uIG9uVGltZWRPdXQgKCkge1xuICAgICAgdXBweS5sb2coYFtYSFJVcGxvYWRdIHRpbWVkIG91dGApXG4gICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihzZWxmLmkxOG4oJ3RpbWVkT3V0JywgeyBzZWNvbmRzOiBNYXRoLmNlaWwodGltZW91dCAvIDEwMDApIH0pKVxuICAgICAgdGltZW91dEhhbmRsZXIoZXJyb3IpXG4gICAgfVxuXG4gICAgbGV0IGFsaXZlVGltZXIgPSBudWxsXG4gICAgZnVuY3Rpb24gcHJvZ3Jlc3MgKCkge1xuICAgICAgaWYgKHRpbWVvdXQgPiAwKSB7XG4gICAgICAgIGRvbmUoKVxuICAgICAgICBhbGl2ZVRpbWVyID0gc2V0VGltZW91dChvblRpbWVkT3V0LCB0aW1lb3V0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRvbmUgKCkge1xuICAgICAgaWYgKGFsaXZlVGltZXIpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGFsaXZlVGltZXIpXG4gICAgICAgIGFsaXZlVGltZXIgPSBudWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2dyZXNzLFxuICAgICAgZG9uZVxuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUZvcm1EYXRhVXBsb2FkIChmaWxlLCBvcHRzKSB7XG4gICAgY29uc3QgZm9ybVBvc3QgPSBuZXcgRm9ybURhdGEoKVxuXG4gICAgY29uc3QgbWV0YUZpZWxkcyA9IEFycmF5LmlzQXJyYXkob3B0cy5tZXRhRmllbGRzKVxuICAgICAgPyBvcHRzLm1ldGFGaWVsZHNcbiAgICAgIC8vIFNlbmQgYWxvbmcgYWxsIGZpZWxkcyBieSBkZWZhdWx0LlxuICAgICAgOiBPYmplY3Qua2V5cyhmaWxlLm1ldGEpXG4gICAgbWV0YUZpZWxkcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBmb3JtUG9zdC5hcHBlbmQoaXRlbSwgZmlsZS5tZXRhW2l0ZW1dKVxuICAgIH0pXG5cbiAgICBmb3JtUG9zdC5hcHBlbmQob3B0cy5maWVsZE5hbWUsIGZpbGUuZGF0YSlcblxuICAgIHJldHVybiBmb3JtUG9zdFxuICB9XG5cbiAgY3JlYXRlQmFyZVVwbG9hZCAoZmlsZSwgb3B0cykge1xuICAgIHJldHVybiBmaWxlLmRhdGFcbiAgfVxuXG4gIHVwbG9hZCAoZmlsZSwgY3VycmVudCwgdG90YWwpIHtcbiAgICBjb25zdCBvcHRzID0gdGhpcy5nZXRPcHRpb25zKGZpbGUpXG5cbiAgICB0aGlzLnVwcHkubG9nKGB1cGxvYWRpbmcgJHtjdXJyZW50fSBvZiAke3RvdGFsfWApXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSBvcHRzLmZvcm1EYXRhXG4gICAgICAgID8gdGhpcy5jcmVhdGVGb3JtRGF0YVVwbG9hZChmaWxlLCBvcHRzKVxuICAgICAgICA6IHRoaXMuY3JlYXRlQmFyZVVwbG9hZChmaWxlLCBvcHRzKVxuXG4gICAgICBjb25zdCB0aW1lciA9IHRoaXMuY3JlYXRlUHJvZ3Jlc3NUaW1lb3V0KG9wdHMudGltZW91dCwgKGVycm9yKSA9PiB7XG4gICAgICAgIHhoci5hYm9ydCgpXG4gICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtZXJyb3InLCBmaWxlLCBlcnJvcilcbiAgICAgICAgcmVqZWN0KGVycm9yKVxuICAgICAgfSlcblxuICAgICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgIGNvbnN0IGlkID0gY3VpZCgpXG5cbiAgICAgIHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZHN0YXJ0JywgKGV2KSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coYFtYSFJVcGxvYWRdICR7aWR9IHN0YXJ0ZWRgKVxuICAgICAgICAvLyBCZWdpbiBjaGVja2luZyBmb3IgdGltZW91dHMgd2hlbiBsb2FkaW5nIHN0YXJ0cy5cbiAgICAgICAgdGltZXIucHJvZ3Jlc3MoKVxuICAgICAgfSlcblxuICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIChldikgPT4ge1xuICAgICAgICB0aGlzLnVwcHkubG9nKGBbWEhSVXBsb2FkXSAke2lkfSBwcm9ncmVzczogJHtldi5sb2FkZWR9IC8gJHtldi50b3RhbH1gKVxuICAgICAgICB0aW1lci5wcm9ncmVzcygpXG5cbiAgICAgICAgaWYgKGV2Lmxlbmd0aENvbXB1dGFibGUpIHtcbiAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXByb2dyZXNzJywgZmlsZSwge1xuICAgICAgICAgICAgdXBsb2FkZXI6IHRoaXMsXG4gICAgICAgICAgICBieXRlc1VwbG9hZGVkOiBldi5sb2FkZWQsXG4gICAgICAgICAgICBieXRlc1RvdGFsOiBldi50b3RhbFxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKGV2KSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coYFtYSFJVcGxvYWRdICR7aWR9IGZpbmlzaGVkYClcbiAgICAgICAgdGltZXIuZG9uZSgpXG5cbiAgICAgICAgaWYgKGV2LnRhcmdldC5zdGF0dXMgPj0gMjAwICYmIGV2LnRhcmdldC5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICBjb25zdCBib2R5ID0gb3B0cy5nZXRSZXNwb25zZURhdGEoeGhyLnJlc3BvbnNlVGV4dCwgeGhyKVxuICAgICAgICAgIGNvbnN0IHVwbG9hZFVSTCA9IGJvZHlbb3B0cy5yZXNwb25zZVVybEZpZWxkTmFtZV1cblxuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3RhdHVzOiBldi50YXJnZXQuc3RhdHVzLFxuICAgICAgICAgICAgYm9keSxcbiAgICAgICAgICAgIHVwbG9hZFVSTFxuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMudXBweS5zZXRGaWxlU3RhdGUoZmlsZS5pZCwgeyByZXNwb25zZSB9KVxuXG4gICAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdWNjZXNzJywgZmlsZSwgYm9keSwgdXBsb2FkVVJMKVxuXG4gICAgICAgICAgaWYgKHVwbG9hZFVSTCkge1xuICAgICAgICAgICAgdGhpcy51cHB5LmxvZyhgRG93bmxvYWQgJHtmaWxlLm5hbWV9IGZyb20gJHtmaWxlLnVwbG9hZFVSTH1gKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiByZXNvbHZlKGZpbGUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgYm9keSA9IG9wdHMuZ2V0UmVzcG9uc2VEYXRhKHhoci5yZXNwb25zZVRleHQsIHhocilcbiAgICAgICAgICBjb25zdCBlcnJvciA9IGJ1aWxkUmVzcG9uc2VFcnJvcih4aHIsIG9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpKVxuXG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB7XG4gICAgICAgICAgICBzdGF0dXM6IGV2LnRhcmdldC5zdGF0dXMsXG4gICAgICAgICAgICBib2R5XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy51cHB5LnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7IHJlc3BvbnNlIH0pXG5cbiAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLWVycm9yJywgZmlsZSwgZXJyb3IpXG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnJvcilcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgeGhyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGV2KSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coYFtYSFJVcGxvYWRdICR7aWR9IGVycm9yZWRgKVxuICAgICAgICB0aW1lci5kb25lKClcblxuICAgICAgICBjb25zdCBlcnJvciA9IGJ1aWxkUmVzcG9uc2VFcnJvcih4aHIsIG9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpKVxuICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLWVycm9yJywgZmlsZSwgZXJyb3IpXG4gICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpXG4gICAgICB9KVxuXG4gICAgICB4aHIub3BlbihvcHRzLm1ldGhvZC50b1VwcGVyQ2FzZSgpLCBvcHRzLmVuZHBvaW50LCB0cnVlKVxuXG4gICAgICBPYmplY3Qua2V5cyhvcHRzLmhlYWRlcnMpLmZvckVhY2goKGhlYWRlcikgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIsIG9wdHMuaGVhZGVyc1toZWFkZXJdKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQoZGF0YSlcblxuICAgICAgdGhpcy51cHB5Lm9uKCdmaWxlLXJlbW92ZWQnLCAocmVtb3ZlZEZpbGUpID0+IHtcbiAgICAgICAgaWYgKHJlbW92ZWRGaWxlLmlkID09PSBmaWxlLmlkKSB7XG4gICAgICAgICAgdGltZXIuZG9uZSgpXG4gICAgICAgICAgeGhyLmFib3J0KClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdGhpcy51cHB5Lm9uKCd1cGxvYWQtY2FuY2VsJywgKGZpbGVJRCkgPT4ge1xuICAgICAgICBpZiAoZmlsZUlEID09PSBmaWxlLmlkKSB7XG4gICAgICAgICAgdGltZXIuZG9uZSgpXG4gICAgICAgICAgeGhyLmFib3J0KClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdGhpcy51cHB5Lm9uKCdjYW5jZWwtYWxsJywgKCkgPT4ge1xuICAgICAgICAvLyBjb25zdCBmaWxlcyA9IHRoaXMudXBweS5nZXRTdGF0ZSgpLmZpbGVzXG4gICAgICAgIC8vIGlmICghZmlsZXNbZmlsZS5pZF0pIHJldHVyblxuICAgICAgICB4aHIuYWJvcnQoKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgdXBsb2FkUmVtb3RlIChmaWxlLCBjdXJyZW50LCB0b3RhbCkge1xuICAgIGNvbnN0IG9wdHMgPSB0aGlzLmdldE9wdGlvbnMoZmlsZSlcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgZmllbGRzID0ge31cbiAgICAgIGNvbnN0IG1ldGFGaWVsZHMgPSBBcnJheS5pc0FycmF5KG9wdHMubWV0YUZpZWxkcylcbiAgICAgICAgPyBvcHRzLm1ldGFGaWVsZHNcbiAgICAgICAgLy8gU2VuZCBhbG9uZyBhbGwgZmllbGRzIGJ5IGRlZmF1bHQuXG4gICAgICAgIDogT2JqZWN0LmtleXMoZmlsZS5tZXRhKVxuXG4gICAgICBtZXRhRmllbGRzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgICAgZmllbGRzW25hbWVdID0gZmlsZS5tZXRhW25hbWVdXG4gICAgICB9KVxuXG4gICAgICBmZXRjaChmaWxlLnJlbW90ZS51cmwsIHtcbiAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgIGNyZWRlbnRpYWxzOiAnaW5jbHVkZScsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoT2JqZWN0LmFzc2lnbih7fSwgZmlsZS5yZW1vdGUuYm9keSwge1xuICAgICAgICAgIGVuZHBvaW50OiBvcHRzLmVuZHBvaW50LFxuICAgICAgICAgIHNpemU6IGZpbGUuZGF0YS5zaXplLFxuICAgICAgICAgIGZpZWxkbmFtZTogb3B0cy5maWVsZE5hbWUsXG4gICAgICAgICAgbWV0YWRhdGE6IGZpZWxkcyxcbiAgICAgICAgICBoZWFkZXJzOiBvcHRzLmhlYWRlcnNcbiAgICAgICAgfSkpXG4gICAgICB9KVxuICAgICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBpZiAocmVzLnN0YXR1cyA8IDIwMCAmJiByZXMuc3RhdHVzID4gMzAwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChyZXMuc3RhdHVzVGV4dClcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy5qc29uKCkudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHRva2VuID0gZGF0YS50b2tlblxuICAgICAgICAgIGNvbnN0IGhvc3QgPSBnZXRTb2NrZXRIb3N0KGZpbGUucmVtb3RlLmhvc3QpXG4gICAgICAgICAgY29uc3Qgc29ja2V0ID0gbmV3IFVwcHlTb2NrZXQoeyB0YXJnZXQ6IGAke2hvc3R9L2FwaS8ke3Rva2VufWAgfSlcblxuICAgICAgICAgIHNvY2tldC5vbigncHJvZ3Jlc3MnLCAocHJvZ3Jlc3NEYXRhKSA9PiBlbWl0U29ja2V0UHJvZ3Jlc3ModGhpcywgcHJvZ3Jlc3NEYXRhLCBmaWxlKSlcblxuICAgICAgICAgIHNvY2tldC5vbignc3VjY2VzcycsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXNwID0gb3B0cy5nZXRSZXNwb25zZURhdGEoZGF0YS5yZXNwb25zZS5yZXNwb25zZVRleHQsIGRhdGEucmVzcG9uc2UpXG4gICAgICAgICAgICBjb25zdCB1cGxvYWRVUkwgPSByZXNwW29wdHMucmVzcG9uc2VVcmxGaWVsZE5hbWVdXG4gICAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXN1Y2Nlc3MnLCBmaWxlLCByZXNwLCB1cGxvYWRVUkwpXG4gICAgICAgICAgICBzb2NrZXQuY2xvc2UoKVxuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVyckRhdGEpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBlcnJEYXRhLnJlc3BvbnNlXG4gICAgICAgICAgICBjb25zdCBlcnJvciA9IHJlc3BcbiAgICAgICAgICAgICAgPyBvcHRzLmdldFJlc3BvbnNlRXJyb3IocmVzcC5yZXNwb25zZVRleHQsIHJlc3ApXG4gICAgICAgICAgICAgIDogT2JqZWN0LmFzc2lnbihuZXcgRXJyb3IoZXJyRGF0YS5lcnJvci5tZXNzYWdlKSwgeyBjYXVzZTogZXJyRGF0YS5lcnJvciB9KVxuICAgICAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1lcnJvcicsIGZpbGUsIGVycm9yKVxuICAgICAgICAgICAgcmVqZWN0KGVycm9yKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICB1cGxvYWRCdW5kbGUgKGZpbGVzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGVuZHBvaW50ID0gdGhpcy5vcHRzLmVuZHBvaW50XG4gICAgICBjb25zdCBtZXRob2QgPSB0aGlzLm9wdHMubWV0aG9kXG5cbiAgICAgIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKClcbiAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUsIGkpID0+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuZ2V0T3B0aW9ucyhmaWxlKVxuICAgICAgICBmb3JtRGF0YS5hcHBlbmQob3B0cy5maWVsZE5hbWUsIGZpbGUuZGF0YSlcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5jcmVhdGVQcm9ncmVzc1RpbWVvdXQodGhpcy5vcHRzLnRpbWVvdXQsIChlcnJvcikgPT4ge1xuICAgICAgICB4aHIuYWJvcnQoKVxuICAgICAgICBlbWl0RXJyb3IoZXJyb3IpXG4gICAgICAgIHJlamVjdChlcnJvcilcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IGVtaXRFcnJvciA9IChlcnJvcikgPT4ge1xuICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1lcnJvcicsIGZpbGUsIGVycm9yKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRzdGFydCcsIChldikgPT4ge1xuICAgICAgICB0aGlzLnVwcHkubG9nKCdbWEhSVXBsb2FkXSBzdGFydGVkIHVwbG9hZGluZyBidW5kbGUnKVxuICAgICAgICB0aW1lci5wcm9ncmVzcygpXG4gICAgICB9KVxuXG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2KSA9PiB7XG4gICAgICAgIHRpbWVyLnByb2dyZXNzKClcblxuICAgICAgICBpZiAoIWV2Lmxlbmd0aENvbXB1dGFibGUpIHJldHVyblxuXG4gICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXByb2dyZXNzJywgZmlsZSwge1xuICAgICAgICAgICAgdXBsb2FkZXI6IHRoaXMsXG4gICAgICAgICAgICBieXRlc1VwbG9hZGVkOiBldi5sb2FkZWQsXG4gICAgICAgICAgICBieXRlc1RvdGFsOiBldi50b3RhbFxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldikgPT4ge1xuICAgICAgICB0aW1lci5kb25lKClcblxuICAgICAgICBpZiAoZXYudGFyZ2V0LnN0YXR1cyA+PSAyMDAgJiYgZXYudGFyZ2V0LnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgIGNvbnN0IHJlc3AgPSB0aGlzLm9wdHMuZ2V0UmVzcG9uc2VEYXRhKHhoci5yZXNwb25zZVRleHQsIHhocilcbiAgICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXN1Y2Nlc3MnLCBmaWxlLCByZXNwKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUoKVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXJyb3IgPSB0aGlzLm9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpIHx8IG5ldyBFcnJvcignVXBsb2FkIGVycm9yJylcbiAgICAgICAgZXJyb3IucmVxdWVzdCA9IHhoclxuICAgICAgICBlbWl0RXJyb3IoZXJyb3IpXG4gICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpXG4gICAgICB9KVxuXG4gICAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoZXYpID0+IHtcbiAgICAgICAgdGltZXIuZG9uZSgpXG5cbiAgICAgICAgY29uc3QgZXJyb3IgPSB0aGlzLm9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpIHx8IG5ldyBFcnJvcignVXBsb2FkIGVycm9yJylcbiAgICAgICAgZW1pdEVycm9yKGVycm9yKVxuICAgICAgICByZXR1cm4gcmVqZWN0KGVycm9yKVxuICAgICAgfSlcblxuICAgICAgdGhpcy51cHB5Lm9uKCdjYW5jZWwtYWxsJywgKCkgPT4ge1xuICAgICAgICB4aHIuYWJvcnQoKVxuICAgICAgfSlcblxuICAgICAgeGhyLm9wZW4obWV0aG9kLnRvVXBwZXJDYXNlKCksIGVuZHBvaW50LCB0cnVlKVxuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLm9wdHMuaGVhZGVycykuZm9yRWFjaCgoaGVhZGVyKSA9PiB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlciwgdGhpcy5vcHRzLmhlYWRlcnNbaGVhZGVyXSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKGZvcm1EYXRhKVxuXG4gICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtc3RhcnRlZCcsIGZpbGUpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICB1cGxvYWRGaWxlcyAoZmlsZXMpIHtcbiAgICBjb25zdCBhY3Rpb25zID0gZmlsZXMubWFwKChmaWxlLCBpKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gcGFyc2VJbnQoaSwgMTApICsgMVxuICAgICAgY29uc3QgdG90YWwgPSBmaWxlcy5sZW5ndGhcblxuICAgICAgaWYgKGZpbGUuZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuICgpID0+IFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihmaWxlLmVycm9yKSlcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5pc1JlbW90ZSkge1xuICAgICAgICAvLyBXZSBlbWl0IHVwbG9hZC1zdGFydGVkIGhlcmUsIHNvIHRoYXQgaXQncyBhbHNvIGVtaXR0ZWQgZm9yIGZpbGVzXG4gICAgICAgIC8vIHRoYXQgaGF2ZSB0byB3YWl0IGR1ZSB0byB0aGUgYGxpbWl0YCBvcHRpb24uXG4gICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtc3RhcnRlZCcsIGZpbGUpXG4gICAgICAgIHJldHVybiB0aGlzLnVwbG9hZFJlbW90ZS5iaW5kKHRoaXMsIGZpbGUsIGN1cnJlbnQsIHRvdGFsKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdGFydGVkJywgZmlsZSlcbiAgICAgICAgcmV0dXJuIHRoaXMudXBsb2FkLmJpbmQodGhpcywgZmlsZSwgY3VycmVudCwgdG90YWwpXG4gICAgICB9XG4gICAgfSlcblxuICAgIGNvbnN0IHByb21pc2VzID0gYWN0aW9ucy5tYXAoKGFjdGlvbikgPT4ge1xuICAgICAgY29uc3QgbGltaXRlZEFjdGlvbiA9IHRoaXMubGltaXRVcGxvYWRzKGFjdGlvbilcbiAgICAgIHJldHVybiBsaW1pdGVkQWN0aW9uKClcbiAgICB9KVxuXG4gICAgcmV0dXJuIHNldHRsZShwcm9taXNlcylcbiAgfVxuXG4gIGhhbmRsZVVwbG9hZCAoZmlsZUlEcykge1xuICAgIGlmIChmaWxlSURzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy51cHB5LmxvZygnW1hIUlVwbG9hZF0gTm8gZmlsZXMgdG8gdXBsb2FkIScpXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICB9XG5cbiAgICB0aGlzLnVwcHkubG9nKCdbWEhSVXBsb2FkXSBVcGxvYWRpbmcuLi4nKVxuICAgIGNvbnN0IGZpbGVzID0gZmlsZUlEcy5tYXAoKGZpbGVJRCkgPT4gdGhpcy51cHB5LmdldEZpbGUoZmlsZUlEKSlcblxuICAgIGlmICh0aGlzLm9wdHMuYnVuZGxlKSB7XG4gICAgICByZXR1cm4gdGhpcy51cGxvYWRCdW5kbGUoZmlsZXMpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudXBsb2FkRmlsZXMoZmlsZXMpLnRoZW4oKCkgPT4gbnVsbClcbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuICAgIHRoaXMudXBweS5hZGRVcGxvYWRlcih0aGlzLmhhbmRsZVVwbG9hZClcbiAgfVxuXG4gIHVuaW5zdGFsbCAoKSB7XG4gICAgdGhpcy51cHB5LnJlbW92ZVVwbG9hZGVyKHRoaXMuaGFuZGxlVXBsb2FkKVxuICB9XG59XG4iLCIvKipcbiAqIERlZmF1bHQgc3RvcmUgdGhhdCBrZWVwcyBzdGF0ZSBpbiBhIHNpbXBsZSBvYmplY3QuXG4gKi9cbmNsYXNzIERlZmF1bHRTdG9yZSB7XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLnN0YXRlID0ge31cbiAgICB0aGlzLmNhbGxiYWNrcyA9IFtdXG4gIH1cblxuICBnZXRTdGF0ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVcbiAgfVxuXG4gIHNldFN0YXRlIChwYXRjaCkge1xuICAgIGNvbnN0IHByZXZTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUpXG4gICAgY29uc3QgbmV4dFN0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZSwgcGF0Y2gpXG5cbiAgICB0aGlzLnN0YXRlID0gbmV4dFN0YXRlXG4gICAgdGhpcy5fcHVibGlzaChwcmV2U3RhdGUsIG5leHRTdGF0ZSwgcGF0Y2gpXG4gIH1cblxuICBzdWJzY3JpYmUgKGxpc3RlbmVyKSB7XG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChsaXN0ZW5lcilcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgLy8gUmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICAgIHRoaXMuY2FsbGJhY2tzLnNwbGljZShcbiAgICAgICAgdGhpcy5jYWxsYmFja3MuaW5kZXhPZihsaXN0ZW5lciksXG4gICAgICAgIDFcbiAgICAgIClcbiAgICB9XG4gIH1cblxuICBfcHVibGlzaCAoLi4uYXJncykge1xuICAgIHRoaXMuY2FsbGJhY2tzLmZvckVhY2goKGxpc3RlbmVyKSA9PiB7XG4gICAgICBsaXN0ZW5lciguLi5hcmdzKVxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWZhdWx0U3RvcmUgKCkge1xuICByZXR1cm4gbmV3IERlZmF1bHRTdG9yZSgpXG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiY29uc3QgVXBweSA9IHJlcXVpcmUoJ3VwcHkvbGliL2NvcmUvQ29yZScpXG5jb25zdCBGaWxlSW5wdXQgPSByZXF1aXJlKCd1cHB5L2xpYi9wbHVnaW5zL0ZpbGVJbnB1dCcpXG5jb25zdCBYSFJVcGxvYWQgPSByZXF1aXJlKCd1cHB5L2xpYi9wbHVnaW5zL1hIUlVwbG9hZCcpXG5jb25zdCBQcm9ncmVzc0JhciA9IHJlcXVpcmUoJ3VwcHkvbGliL3BsdWdpbnMvUHJvZ3Jlc3NCYXInKVxuXG5jb25zdCB1cHB5ID0gbmV3IFVwcHkoeyBkZWJ1ZzogdHJ1ZSwgYXV0b1Byb2NlZWQ6IHRydWUgfSlcbnVwcHkudXNlKEZpbGVJbnB1dCwgeyB0YXJnZXQ6ICcuVXBweUZvcm0nLCByZXBsYWNlVGFyZ2V0Q29udGVudDogdHJ1ZSB9KVxudXBweS51c2UoWEhSVXBsb2FkLCB7XG4gIGVuZHBvaW50OiAnLy9hcGkyLnRyYW5zbG9hZGl0LmNvbScsXG4gIGZvcm1EYXRhOiB0cnVlLFxuICBmaWVsZE5hbWU6ICdmaWxlc1tdJ1xufSlcbnVwcHkudXNlKFByb2dyZXNzQmFyLCB7XG4gIHRhcmdldDogJ2JvZHknLFxuICBmaXhlZDogdHJ1ZSxcbiAgaGlkZUFmdGVyRmluaXNoOiBmYWxzZVxufSlcblxuY29uc29sZS5sb2coJ1VwcHkgd2l0aCBGb3JtdGFnIGFuZCBYSFJVcGxvYWQgaXMgbG9hZGVkJylcbiJdfQ==
