var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i2 = 1; i2 < meta.length; i2++) {
    if (meta[i2] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i2]}`;
      if (meta[i2].indexOf("charset=") === 0) {
        charset = meta[i2].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* toIterator(parts, clone2 = true) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else if (ArrayBuffer.isView(part)) {
      if (clone2) {
        let position = part.byteOffset;
        const end = part.byteOffset + part.byteLength;
        while (position !== end) {
          const size = Math.min(end - position, POOL_SIZE);
          const chunk = part.buffer.slice(position, position + size);
          position += chunk.byteLength;
          yield new Uint8Array(chunk);
        }
      } else {
        yield part;
      }
    } else {
      let position = 0;
      while (position !== part.size) {
        const chunk = part.slice(position, Math.min(part.size, position + POOL_SIZE));
        const buffer = await chunk.arrayBuffer();
        position += buffer.byteLength;
        yield new Uint8Array(buffer);
      }
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    length += isBlob(value) ? value.size : Buffer.byteLength(String(value));
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = import_stream.default.Readable.from(body.stream());
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const error2 = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(error2);
        throw error2;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    const error_ = error2 instanceof FetchBaseError ? error2 : new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error2.message}`, "system", error2);
    throw error_;
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c2) => typeof c2 === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index, array) => {
    if (index % 2 === 0) {
      result.push(array.slice(index, index + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data = dataUriToBuffer$1(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options2.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (error2) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${error2.message}`, "system", error2));
      finalize();
    });
    fixResponseChunkedTransferBadEnding(request_, (error2) => {
      response.body.destroy(error2);
    });
    if (process.version < "v14") {
      request_.on("socket", (s3) => {
        let endedWithEventsCount;
        s3.prependListener("end", () => {
          endedWithEventsCount = s3._eventsCount;
        });
        s3.prependListener("close", (hadError) => {
          if (response && endedWithEventsCount < s3._eventsCount && !hadError) {
            const error2 = new Error("Premature close");
            error2.code = "ERR_STREAM_PREMATURE_CLOSE";
            response.body.emit("error", error2);
          }
        });
      });
    }
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              headers.set("Location", locationURL);
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
          default:
            return reject(new TypeError(`Redirect option '${request.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      if (signal) {
        response_.once("end", () => {
          signal.removeEventListener("abort", abortAndFinalize);
        });
      }
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), reject);
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), reject);
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), reject);
        raw.once("data", (chunk) => {
          body = (chunk[0] & 15) === 8 ? (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), reject) : (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), reject);
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), reject);
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
function fixResponseChunkedTransferBadEnding(request, errorCallback) {
  const LAST_CHUNK = Buffer.from("0\r\n\r\n");
  let isChunkedTransfer = false;
  let properLastChunkReceived = false;
  let previousChunk;
  request.on("response", (response) => {
    const { headers } = response;
    isChunkedTransfer = headers["transfer-encoding"] === "chunked" && !headers["content-length"];
  });
  request.on("socket", (socket) => {
    const onSocketClose = () => {
      if (isChunkedTransfer && !properLastChunkReceived) {
        const error2 = new Error("Premature close");
        error2.code = "ERR_STREAM_PREMATURE_CLOSE";
        errorCallback(error2);
      }
    };
    socket.prependListener("close", onSocketClose);
    request.on("abort", () => {
      socket.removeListener("close", onSocketClose);
    });
    socket.on("data", (buf) => {
      properLastChunkReceived = Buffer.compare(buf.slice(-5), LAST_CHUNK) === 0;
      if (!properLastChunkReceived && previousChunk) {
        properLastChunkReceived = Buffer.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 && Buffer.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0;
      }
      previousChunk = buf;
    });
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, commonjsGlobal, src, dataUriToBuffer$1, ponyfill_es2018, POOL_SIZE$1, POOL_SIZE, _Blob, Blob2, Blob$1, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
    src = dataUriToBuffer;
    dataUriToBuffer$1 = src;
    ponyfill_es2018 = { exports: {} };
    (function(module2, exports) {
      (function(global2, factory) {
        factory(exports);
      })(commonjsGlobal, function(exports2) {
        const SymbolPolyfill = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? Symbol : (description) => `Symbol(${description})`;
        function noop2() {
          return void 0;
        }
        function getGlobals() {
          if (typeof self !== "undefined") {
            return self;
          } else if (typeof window !== "undefined") {
            return window;
          } else if (typeof commonjsGlobal !== "undefined") {
            return commonjsGlobal;
          }
          return void 0;
        }
        const globals2 = getGlobals();
        function typeIsObject(x2) {
          return typeof x2 === "object" && x2 !== null || typeof x2 === "function";
        }
        const rethrowAssertionErrorRejection = noop2;
        const originalPromise = Promise;
        const originalPromiseThen = Promise.prototype.then;
        const originalPromiseResolve = Promise.resolve.bind(originalPromise);
        const originalPromiseReject = Promise.reject.bind(originalPromise);
        function newPromise(executor) {
          return new originalPromise(executor);
        }
        function promiseResolvedWith(value) {
          return originalPromiseResolve(value);
        }
        function promiseRejectedWith(reason) {
          return originalPromiseReject(reason);
        }
        function PerformPromiseThen(promise, onFulfilled, onRejected) {
          return originalPromiseThen.call(promise, onFulfilled, onRejected);
        }
        function uponPromise(promise, onFulfilled, onRejected) {
          PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), void 0, rethrowAssertionErrorRejection);
        }
        function uponFulfillment(promise, onFulfilled) {
          uponPromise(promise, onFulfilled);
        }
        function uponRejection(promise, onRejected) {
          uponPromise(promise, void 0, onRejected);
        }
        function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
          return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
        }
        function setPromiseIsHandledToTrue(promise) {
          PerformPromiseThen(promise, void 0, rethrowAssertionErrorRejection);
        }
        const queueMicrotask = (() => {
          const globalQueueMicrotask = globals2 && globals2.queueMicrotask;
          if (typeof globalQueueMicrotask === "function") {
            return globalQueueMicrotask;
          }
          const resolvedPromise = promiseResolvedWith(void 0);
          return (fn) => PerformPromiseThen(resolvedPromise, fn);
        })();
        function reflectCall(F2, V2, args) {
          if (typeof F2 !== "function") {
            throw new TypeError("Argument is not a function");
          }
          return Function.prototype.apply.call(F2, V2, args);
        }
        function promiseCall(F2, V2, args) {
          try {
            return promiseResolvedWith(reflectCall(F2, V2, args));
          } catch (value) {
            return promiseRejectedWith(value);
          }
        }
        const QUEUE_MAX_ARRAY_SIZE = 16384;
        class SimpleQueue {
          constructor() {
            this._cursor = 0;
            this._size = 0;
            this._front = {
              _elements: [],
              _next: void 0
            };
            this._back = this._front;
            this._cursor = 0;
            this._size = 0;
          }
          get length() {
            return this._size;
          }
          push(element) {
            const oldBack = this._back;
            let newBack = oldBack;
            if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) {
              newBack = {
                _elements: [],
                _next: void 0
              };
            }
            oldBack._elements.push(element);
            if (newBack !== oldBack) {
              this._back = newBack;
              oldBack._next = newBack;
            }
            ++this._size;
          }
          shift() {
            const oldFront = this._front;
            let newFront = oldFront;
            const oldCursor = this._cursor;
            let newCursor = oldCursor + 1;
            const elements = oldFront._elements;
            const element = elements[oldCursor];
            if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
              newFront = oldFront._next;
              newCursor = 0;
            }
            --this._size;
            this._cursor = newCursor;
            if (oldFront !== newFront) {
              this._front = newFront;
            }
            elements[oldCursor] = void 0;
            return element;
          }
          forEach(callback) {
            let i2 = this._cursor;
            let node = this._front;
            let elements = node._elements;
            while (i2 !== elements.length || node._next !== void 0) {
              if (i2 === elements.length) {
                node = node._next;
                elements = node._elements;
                i2 = 0;
                if (elements.length === 0) {
                  break;
                }
              }
              callback(elements[i2]);
              ++i2;
            }
          }
          peek() {
            const front = this._front;
            const cursor = this._cursor;
            return front._elements[cursor];
          }
        }
        function ReadableStreamReaderGenericInitialize(reader, stream) {
          reader._ownerReadableStream = stream;
          stream._reader = reader;
          if (stream._state === "readable") {
            defaultReaderClosedPromiseInitialize(reader);
          } else if (stream._state === "closed") {
            defaultReaderClosedPromiseInitializeAsResolved(reader);
          } else {
            defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
          }
        }
        function ReadableStreamReaderGenericCancel(reader, reason) {
          const stream = reader._ownerReadableStream;
          return ReadableStreamCancel(stream, reason);
        }
        function ReadableStreamReaderGenericRelease(reader) {
          if (reader._ownerReadableStream._state === "readable") {
            defaultReaderClosedPromiseReject(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          } else {
            defaultReaderClosedPromiseResetToRejected(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          }
          reader._ownerReadableStream._reader = void 0;
          reader._ownerReadableStream = void 0;
        }
        function readerLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released reader");
        }
        function defaultReaderClosedPromiseInitialize(reader) {
          reader._closedPromise = newPromise((resolve2, reject) => {
            reader._closedPromise_resolve = resolve2;
            reader._closedPromise_reject = reject;
          });
        }
        function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseReject(reader, reason);
        }
        function defaultReaderClosedPromiseInitializeAsResolved(reader) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseResolve(reader);
        }
        function defaultReaderClosedPromiseReject(reader, reason) {
          if (reader._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(reader._closedPromise);
          reader._closedPromise_reject(reason);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        function defaultReaderClosedPromiseResetToRejected(reader, reason) {
          defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
        }
        function defaultReaderClosedPromiseResolve(reader) {
          if (reader._closedPromise_resolve === void 0) {
            return;
          }
          reader._closedPromise_resolve(void 0);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        const AbortSteps = SymbolPolyfill("[[AbortSteps]]");
        const ErrorSteps = SymbolPolyfill("[[ErrorSteps]]");
        const CancelSteps = SymbolPolyfill("[[CancelSteps]]");
        const PullSteps = SymbolPolyfill("[[PullSteps]]");
        const NumberIsFinite = Number.isFinite || function(x2) {
          return typeof x2 === "number" && isFinite(x2);
        };
        const MathTrunc = Math.trunc || function(v2) {
          return v2 < 0 ? Math.ceil(v2) : Math.floor(v2);
        };
        function isDictionary(x2) {
          return typeof x2 === "object" || typeof x2 === "function";
        }
        function assertDictionary(obj, context) {
          if (obj !== void 0 && !isDictionary(obj)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertFunction(x2, context) {
          if (typeof x2 !== "function") {
            throw new TypeError(`${context} is not a function.`);
          }
        }
        function isObject(x2) {
          return typeof x2 === "object" && x2 !== null || typeof x2 === "function";
        }
        function assertObject(x2, context) {
          if (!isObject(x2)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertRequiredArgument(x2, position, context) {
          if (x2 === void 0) {
            throw new TypeError(`Parameter ${position} is required in '${context}'.`);
          }
        }
        function assertRequiredField(x2, field, context) {
          if (x2 === void 0) {
            throw new TypeError(`${field} is required in '${context}'.`);
          }
        }
        function convertUnrestrictedDouble(value) {
          return Number(value);
        }
        function censorNegativeZero(x2) {
          return x2 === 0 ? 0 : x2;
        }
        function integerPart(x2) {
          return censorNegativeZero(MathTrunc(x2));
        }
        function convertUnsignedLongLongWithEnforceRange(value, context) {
          const lowerBound = 0;
          const upperBound = Number.MAX_SAFE_INTEGER;
          let x2 = Number(value);
          x2 = censorNegativeZero(x2);
          if (!NumberIsFinite(x2)) {
            throw new TypeError(`${context} is not a finite number`);
          }
          x2 = integerPart(x2);
          if (x2 < lowerBound || x2 > upperBound) {
            throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
          }
          if (!NumberIsFinite(x2) || x2 === 0) {
            return 0;
          }
          return x2;
        }
        function assertReadableStream(x2, context) {
          if (!IsReadableStream(x2)) {
            throw new TypeError(`${context} is not a ReadableStream.`);
          }
        }
        function AcquireReadableStreamDefaultReader(stream) {
          return new ReadableStreamDefaultReader(stream);
        }
        function ReadableStreamAddReadRequest(stream, readRequest) {
          stream._reader._readRequests.push(readRequest);
        }
        function ReadableStreamFulfillReadRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readRequest = reader._readRequests.shift();
          if (done) {
            readRequest._closeSteps();
          } else {
            readRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadRequests(stream) {
          return stream._reader._readRequests.length;
        }
        function ReadableStreamHasDefaultReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamDefaultReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamDefaultReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamDefaultReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("read"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: () => resolvePromise({ value: void 0, done: true }),
              _errorSteps: (e2) => rejectPromise(e2)
            };
            ReadableStreamDefaultReaderRead(this, readRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamDefaultReader(this)) {
              throw defaultReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamDefaultReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultReader",
            configurable: true
          });
        }
        function IsReadableStreamDefaultReader(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_readRequests")) {
            return false;
          }
          return x2 instanceof ReadableStreamDefaultReader;
        }
        function ReadableStreamDefaultReaderRead(reader, readRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "closed") {
            readRequest._closeSteps();
          } else if (stream._state === "errored") {
            readRequest._errorSteps(stream._storedError);
          } else {
            stream._readableStreamController[PullSteps](readRequest);
          }
        }
        function defaultReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
        }
        const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {
        }).prototype);
        class ReadableStreamAsyncIteratorImpl {
          constructor(reader, preventCancel) {
            this._ongoingPromise = void 0;
            this._isFinished = false;
            this._reader = reader;
            this._preventCancel = preventCancel;
          }
          next() {
            const nextSteps = () => this._nextSteps();
            this._ongoingPromise = this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) : nextSteps();
            return this._ongoingPromise;
          }
          return(value) {
            const returnSteps = () => this._returnSteps(value);
            return this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) : returnSteps();
          }
          _nextSteps() {
            if (this._isFinished) {
              return Promise.resolve({ value: void 0, done: true });
            }
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("iterate"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => {
                this._ongoingPromise = void 0;
                queueMicrotask(() => resolvePromise({ value: chunk, done: false }));
              },
              _closeSteps: () => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                resolvePromise({ value: void 0, done: true });
              },
              _errorSteps: (reason) => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                rejectPromise(reason);
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promise;
          }
          _returnSteps(value) {
            if (this._isFinished) {
              return Promise.resolve({ value, done: true });
            }
            this._isFinished = true;
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("finish iterating"));
            }
            if (!this._preventCancel) {
              const result = ReadableStreamReaderGenericCancel(reader, value);
              ReadableStreamReaderGenericRelease(reader);
              return transformPromiseWith(result, () => ({ value, done: true }));
            }
            ReadableStreamReaderGenericRelease(reader);
            return promiseResolvedWith({ value, done: true });
          }
        }
        const ReadableStreamAsyncIteratorPrototype = {
          next() {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("next"));
            }
            return this._asyncIteratorImpl.next();
          },
          return(value) {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("return"));
            }
            return this._asyncIteratorImpl.return(value);
          }
        };
        if (AsyncIteratorPrototype !== void 0) {
          Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
        }
        function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          const impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
          const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
          iterator._asyncIteratorImpl = impl;
          return iterator;
        }
        function IsReadableStreamAsyncIterator(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_asyncIteratorImpl")) {
            return false;
          }
          try {
            return x2._asyncIteratorImpl instanceof ReadableStreamAsyncIteratorImpl;
          } catch (_a) {
            return false;
          }
        }
        function streamAsyncIteratorBrandCheckException(name) {
          return new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
        }
        const NumberIsNaN = Number.isNaN || function(x2) {
          return x2 !== x2;
        };
        function CreateArrayFromList(elements) {
          return elements.slice();
        }
        function CopyDataBlockBytes(dest, destOffset, src2, srcOffset, n2) {
          new Uint8Array(dest).set(new Uint8Array(src2, srcOffset, n2), destOffset);
        }
        function TransferArrayBuffer(O2) {
          return O2;
        }
        function IsDetachedBuffer(O2) {
          return false;
        }
        function ArrayBufferSlice(buffer, begin, end) {
          if (buffer.slice) {
            return buffer.slice(begin, end);
          }
          const length = end - begin;
          const slice = new ArrayBuffer(length);
          CopyDataBlockBytes(slice, 0, buffer, begin, length);
          return slice;
        }
        function IsNonNegativeNumber(v2) {
          if (typeof v2 !== "number") {
            return false;
          }
          if (NumberIsNaN(v2)) {
            return false;
          }
          if (v2 < 0) {
            return false;
          }
          return true;
        }
        function CloneAsUint8Array(O2) {
          const buffer = ArrayBufferSlice(O2.buffer, O2.byteOffset, O2.byteOffset + O2.byteLength);
          return new Uint8Array(buffer);
        }
        function DequeueValue(container) {
          const pair = container._queue.shift();
          container._queueTotalSize -= pair.size;
          if (container._queueTotalSize < 0) {
            container._queueTotalSize = 0;
          }
          return pair.value;
        }
        function EnqueueValueWithSize(container, value, size) {
          if (!IsNonNegativeNumber(size) || size === Infinity) {
            throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
          }
          container._queue.push({ value, size });
          container._queueTotalSize += size;
        }
        function PeekQueueValue(container) {
          const pair = container._queue.peek();
          return pair.value;
        }
        function ResetQueue(container) {
          container._queue = new SimpleQueue();
          container._queueTotalSize = 0;
        }
        class ReadableStreamBYOBRequest {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get view() {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("view");
            }
            return this._view;
          }
          respond(bytesWritten) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respond");
            }
            assertRequiredArgument(bytesWritten, 1, "respond");
            bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, "First parameter");
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(this._view.buffer))
              ;
            ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
          }
          respondWithNewView(view) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respondWithNewView");
            }
            assertRequiredArgument(view, 1, "respondWithNewView");
            if (!ArrayBuffer.isView(view)) {
              throw new TypeError("You can only respond with array buffer views");
            }
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
          }
        }
        Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
          respond: { enumerable: true },
          respondWithNewView: { enumerable: true },
          view: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBRequest.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBRequest",
            configurable: true
          });
        }
        class ReadableByteStreamController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get byobRequest() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("byobRequest");
            }
            return ReadableByteStreamControllerGetBYOBRequest(this);
          }
          get desiredSize() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("desiredSize");
            }
            return ReadableByteStreamControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("close");
            }
            if (this._closeRequested) {
              throw new TypeError("The stream has already been closed; do not close it again!");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
            }
            ReadableByteStreamControllerClose(this);
          }
          enqueue(chunk) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("enqueue");
            }
            assertRequiredArgument(chunk, 1, "enqueue");
            if (!ArrayBuffer.isView(chunk)) {
              throw new TypeError("chunk must be an array buffer view");
            }
            if (chunk.byteLength === 0) {
              throw new TypeError("chunk must have non-zero byteLength");
            }
            if (chunk.buffer.byteLength === 0) {
              throw new TypeError(`chunk's buffer must have non-zero byteLength`);
            }
            if (this._closeRequested) {
              throw new TypeError("stream is closed or draining");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
            }
            ReadableByteStreamControllerEnqueue(this, chunk);
          }
          error(e2 = void 0) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("error");
            }
            ReadableByteStreamControllerError(this, e2);
          }
          [CancelSteps](reason) {
            ReadableByteStreamControllerClearPendingPullIntos(this);
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableByteStreamControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableByteStream;
            if (this._queueTotalSize > 0) {
              const entry = this._queue.shift();
              this._queueTotalSize -= entry.byteLength;
              ReadableByteStreamControllerHandleQueueDrain(this);
              const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
              readRequest._chunkSteps(view);
              return;
            }
            const autoAllocateChunkSize = this._autoAllocateChunkSize;
            if (autoAllocateChunkSize !== void 0) {
              let buffer;
              try {
                buffer = new ArrayBuffer(autoAllocateChunkSize);
              } catch (bufferE) {
                readRequest._errorSteps(bufferE);
                return;
              }
              const pullIntoDescriptor = {
                buffer,
                bufferByteLength: autoAllocateChunkSize,
                byteOffset: 0,
                byteLength: autoAllocateChunkSize,
                bytesFilled: 0,
                elementSize: 1,
                viewConstructor: Uint8Array,
                readerType: "default"
              };
              this._pendingPullIntos.push(pullIntoDescriptor);
            }
            ReadableStreamAddReadRequest(stream, readRequest);
            ReadableByteStreamControllerCallPullIfNeeded(this);
          }
        }
        Object.defineProperties(ReadableByteStreamController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          byobRequest: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableByteStreamController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableByteStreamController",
            configurable: true
          });
        }
        function IsReadableByteStreamController(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_controlledReadableByteStream")) {
            return false;
          }
          return x2 instanceof ReadableByteStreamController;
        }
        function IsReadableStreamBYOBRequest(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_associatedReadableByteStreamController")) {
            return false;
          }
          return x2 instanceof ReadableStreamBYOBRequest;
        }
        function ReadableByteStreamControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableByteStreamControllerCallPullIfNeeded(controller);
            }
          }, (e2) => {
            ReadableByteStreamControllerError(controller, e2);
          });
        }
        function ReadableByteStreamControllerClearPendingPullIntos(controller) {
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          controller._pendingPullIntos = new SimpleQueue();
        }
        function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
          let done = false;
          if (stream._state === "closed") {
            done = true;
          }
          const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
          if (pullIntoDescriptor.readerType === "default") {
            ReadableStreamFulfillReadRequest(stream, filledView, done);
          } else {
            ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
          }
        }
        function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
          const bytesFilled = pullIntoDescriptor.bytesFilled;
          const elementSize = pullIntoDescriptor.elementSize;
          return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
        }
        function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
          controller._queue.push({ buffer, byteOffset, byteLength });
          controller._queueTotalSize += byteLength;
        }
        function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
          const elementSize = pullIntoDescriptor.elementSize;
          const currentAlignedBytes = pullIntoDescriptor.bytesFilled - pullIntoDescriptor.bytesFilled % elementSize;
          const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
          const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
          const maxAlignedBytes = maxBytesFilled - maxBytesFilled % elementSize;
          let totalBytesToCopyRemaining = maxBytesToCopy;
          let ready = false;
          if (maxAlignedBytes > currentAlignedBytes) {
            totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
            ready = true;
          }
          const queue = controller._queue;
          while (totalBytesToCopyRemaining > 0) {
            const headOfQueue = queue.peek();
            const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
            const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
            if (headOfQueue.byteLength === bytesToCopy) {
              queue.shift();
            } else {
              headOfQueue.byteOffset += bytesToCopy;
              headOfQueue.byteLength -= bytesToCopy;
            }
            controller._queueTotalSize -= bytesToCopy;
            ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
            totalBytesToCopyRemaining -= bytesToCopy;
          }
          return ready;
        }
        function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
          pullIntoDescriptor.bytesFilled += size;
        }
        function ReadableByteStreamControllerHandleQueueDrain(controller) {
          if (controller._queueTotalSize === 0 && controller._closeRequested) {
            ReadableByteStreamControllerClearAlgorithms(controller);
            ReadableStreamClose(controller._controlledReadableByteStream);
          } else {
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }
        }
        function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
          if (controller._byobRequest === null) {
            return;
          }
          controller._byobRequest._associatedReadableByteStreamController = void 0;
          controller._byobRequest._view = null;
          controller._byobRequest = null;
        }
        function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
          while (controller._pendingPullIntos.length > 0) {
            if (controller._queueTotalSize === 0) {
              return;
            }
            const pullIntoDescriptor = controller._pendingPullIntos.peek();
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerPullInto(controller, view, readIntoRequest) {
          const stream = controller._controlledReadableByteStream;
          let elementSize = 1;
          if (view.constructor !== DataView) {
            elementSize = view.constructor.BYTES_PER_ELEMENT;
          }
          const ctor = view.constructor;
          const buffer = TransferArrayBuffer(view.buffer);
          const pullIntoDescriptor = {
            buffer,
            bufferByteLength: buffer.byteLength,
            byteOffset: view.byteOffset,
            byteLength: view.byteLength,
            bytesFilled: 0,
            elementSize,
            viewConstructor: ctor,
            readerType: "byob"
          };
          if (controller._pendingPullIntos.length > 0) {
            controller._pendingPullIntos.push(pullIntoDescriptor);
            ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
            return;
          }
          if (stream._state === "closed") {
            const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
            readIntoRequest._closeSteps(emptyView);
            return;
          }
          if (controller._queueTotalSize > 0) {
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
              ReadableByteStreamControllerHandleQueueDrain(controller);
              readIntoRequest._chunkSteps(filledView);
              return;
            }
            if (controller._closeRequested) {
              const e2 = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e2);
              readIntoRequest._errorSteps(e2);
              return;
            }
          }
          controller._pendingPullIntos.push(pullIntoDescriptor);
          ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
          const stream = controller._controlledReadableByteStream;
          if (ReadableStreamHasBYOBReader(stream)) {
            while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
              const pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
          ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
          if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize) {
            return;
          }
          ReadableByteStreamControllerShiftPendingPullInto(controller);
          const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
          if (remainderSize > 0) {
            const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            const remainder = ArrayBufferSlice(pullIntoDescriptor.buffer, end - remainderSize, end);
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, remainder, 0, remainder.byteLength);
          }
          pullIntoDescriptor.bytesFilled -= remainderSize;
          ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
          ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
        }
        function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            ReadableByteStreamControllerRespondInClosedState(controller);
          } else {
            ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerShiftPendingPullInto(controller) {
          const descriptor = controller._pendingPullIntos.shift();
          return descriptor;
        }
        function ReadableByteStreamControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return false;
          }
          if (controller._closeRequested) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableByteStreamControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
        }
        function ReadableByteStreamControllerClose(controller) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          if (controller._queueTotalSize > 0) {
            controller._closeRequested = true;
            return;
          }
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (firstPendingPullInto.bytesFilled > 0) {
              const e2 = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e2);
              throw e2;
            }
          }
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamClose(stream);
        }
        function ReadableByteStreamControllerEnqueue(controller, chunk) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          const buffer = chunk.buffer;
          const byteOffset = chunk.byteOffset;
          const byteLength = chunk.byteLength;
          const transferredBuffer = TransferArrayBuffer(buffer);
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (IsDetachedBuffer(firstPendingPullInto.buffer))
              ;
            firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
          }
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          if (ReadableStreamHasDefaultReader(stream)) {
            if (ReadableStreamGetNumReadRequests(stream) === 0) {
              ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            } else {
              const transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
              ReadableStreamFulfillReadRequest(stream, transferredView, false);
            }
          } else if (ReadableStreamHasBYOBReader(stream)) {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
          } else {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerError(controller, e2) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return;
          }
          ReadableByteStreamControllerClearPendingPullIntos(controller);
          ResetQueue(controller);
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e2);
        }
        function ReadableByteStreamControllerGetBYOBRequest(controller) {
          if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
            const firstDescriptor = controller._pendingPullIntos.peek();
            const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
            const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
            SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
            controller._byobRequest = byobRequest;
          }
          return controller._byobRequest;
        }
        function ReadableByteStreamControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableByteStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableByteStreamControllerRespond(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (bytesWritten !== 0) {
              throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
            }
          } else {
            if (bytesWritten === 0) {
              throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
            }
            if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) {
              throw new RangeError("bytesWritten out of range");
            }
          }
          firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
          ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
        }
        function ReadableByteStreamControllerRespondWithNewView(controller, view) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (view.byteLength !== 0) {
              throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
            }
          } else {
            if (view.byteLength === 0) {
              throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
            }
          }
          if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
            throw new RangeError("The region specified by view does not match byobRequest");
          }
          if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) {
            throw new RangeError("The buffer of view has different capacity than byobRequest");
          }
          if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) {
            throw new RangeError("The region specified by view is larger than byobRequest");
          }
          firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
          ReadableByteStreamControllerRespondInternal(controller, view.byteLength);
        }
        function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
          controller._controlledReadableByteStream = stream;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._byobRequest = null;
          controller._queue = controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._closeRequested = false;
          controller._started = false;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          controller._autoAllocateChunkSize = autoAllocateChunkSize;
          controller._pendingPullIntos = new SimpleQueue();
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }, (r2) => {
            ReadableByteStreamControllerError(controller, r2);
          });
        }
        function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
          const controller = Object.create(ReadableByteStreamController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingByteSource.start !== void 0) {
            startAlgorithm = () => underlyingByteSource.start(controller);
          }
          if (underlyingByteSource.pull !== void 0) {
            pullAlgorithm = () => underlyingByteSource.pull(controller);
          }
          if (underlyingByteSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingByteSource.cancel(reason);
          }
          const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
          if (autoAllocateChunkSize === 0) {
            throw new TypeError("autoAllocateChunkSize must be greater than 0");
          }
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
        }
        function SetUpReadableStreamBYOBRequest(request, controller, view) {
          request._associatedReadableByteStreamController = controller;
          request._view = view;
        }
        function byobRequestBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
        }
        function byteStreamControllerBrandCheckException(name) {
          return new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
        }
        function AcquireReadableStreamBYOBReader(stream) {
          return new ReadableStreamBYOBReader(stream);
        }
        function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
          stream._reader._readIntoRequests.push(readIntoRequest);
        }
        function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readIntoRequest = reader._readIntoRequests.shift();
          if (done) {
            readIntoRequest._closeSteps(chunk);
          } else {
            readIntoRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadIntoRequests(stream) {
          return stream._reader._readIntoRequests.length;
        }
        function ReadableStreamHasBYOBReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamBYOBReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamBYOBReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamBYOBReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            if (!IsReadableByteStreamController(stream._readableStreamController)) {
              throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readIntoRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read(view) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("read"));
            }
            if (!ArrayBuffer.isView(view)) {
              return promiseRejectedWith(new TypeError("view must be an array buffer view"));
            }
            if (view.byteLength === 0) {
              return promiseRejectedWith(new TypeError("view must have non-zero byteLength"));
            }
            if (view.buffer.byteLength === 0) {
              return promiseRejectedWith(new TypeError(`view's buffer must have non-zero byteLength`));
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readIntoRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: (chunk) => resolvePromise({ value: chunk, done: true }),
              _errorSteps: (e2) => rejectPromise(e2)
            };
            ReadableStreamBYOBReaderRead(this, view, readIntoRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamBYOBReader(this)) {
              throw byobReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readIntoRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamBYOBReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBReader",
            configurable: true
          });
        }
        function IsReadableStreamBYOBReader(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_readIntoRequests")) {
            return false;
          }
          return x2 instanceof ReadableStreamBYOBReader;
        }
        function ReadableStreamBYOBReaderRead(reader, view, readIntoRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "errored") {
            readIntoRequest._errorSteps(stream._storedError);
          } else {
            ReadableByteStreamControllerPullInto(stream._readableStreamController, view, readIntoRequest);
          }
        }
        function byobReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
        }
        function ExtractHighWaterMark(strategy, defaultHWM) {
          const { highWaterMark } = strategy;
          if (highWaterMark === void 0) {
            return defaultHWM;
          }
          if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
            throw new RangeError("Invalid highWaterMark");
          }
          return highWaterMark;
        }
        function ExtractSizeAlgorithm(strategy) {
          const { size } = strategy;
          if (!size) {
            return () => 1;
          }
          return size;
        }
        function convertQueuingStrategy(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          const size = init2 === null || init2 === void 0 ? void 0 : init2.size;
          return {
            highWaterMark: highWaterMark === void 0 ? void 0 : convertUnrestrictedDouble(highWaterMark),
            size: size === void 0 ? void 0 : convertQueuingStrategySize(size, `${context} has member 'size' that`)
          };
        }
        function convertQueuingStrategySize(fn, context) {
          assertFunction(fn, context);
          return (chunk) => convertUnrestrictedDouble(fn(chunk));
        }
        function convertUnderlyingSink(original, context) {
          assertDictionary(original, context);
          const abort = original === null || original === void 0 ? void 0 : original.abort;
          const close = original === null || original === void 0 ? void 0 : original.close;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          const write = original === null || original === void 0 ? void 0 : original.write;
          return {
            abort: abort === void 0 ? void 0 : convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
            close: close === void 0 ? void 0 : convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
            write: write === void 0 ? void 0 : convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
            type
          };
        }
        function convertUnderlyingSinkAbortCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSinkCloseCallback(fn, original, context) {
          assertFunction(fn, context);
          return () => promiseCall(fn, original, []);
        }
        function convertUnderlyingSinkStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertUnderlyingSinkWriteCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        function assertWritableStream(x2, context) {
          if (!IsWritableStream(x2)) {
            throw new TypeError(`${context} is not a WritableStream.`);
          }
        }
        function isAbortSignal2(value) {
          if (typeof value !== "object" || value === null) {
            return false;
          }
          try {
            return typeof value.aborted === "boolean";
          } catch (_a) {
            return false;
          }
        }
        const supportsAbortController = typeof AbortController === "function";
        function createAbortController() {
          if (supportsAbortController) {
            return new AbortController();
          }
          return void 0;
        }
        class WritableStream {
          constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
            if (rawUnderlyingSink === void 0) {
              rawUnderlyingSink = null;
            } else {
              assertObject(rawUnderlyingSink, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, "First parameter");
            InitializeWritableStream(this);
            const type = underlyingSink.type;
            if (type !== void 0) {
              throw new RangeError("Invalid type is specified");
            }
            const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
            const highWaterMark = ExtractHighWaterMark(strategy, 1);
            SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
          }
          get locked() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("locked");
            }
            return IsWritableStreamLocked(this);
          }
          abort(reason = void 0) {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("abort"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot abort a stream that already has a writer"));
            }
            return WritableStreamAbort(this, reason);
          }
          close() {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("close"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot close a stream that already has a writer"));
            }
            if (WritableStreamCloseQueuedOrInFlight(this)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamClose(this);
          }
          getWriter() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("getWriter");
            }
            return AcquireWritableStreamDefaultWriter(this);
          }
        }
        Object.defineProperties(WritableStream.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          getWriter: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStream.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStream",
            configurable: true
          });
        }
        function AcquireWritableStreamDefaultWriter(stream) {
          return new WritableStreamDefaultWriter(stream);
        }
        function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(WritableStream.prototype);
          InitializeWritableStream(stream);
          const controller = Object.create(WritableStreamDefaultController.prototype);
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function InitializeWritableStream(stream) {
          stream._state = "writable";
          stream._storedError = void 0;
          stream._writer = void 0;
          stream._writableStreamController = void 0;
          stream._writeRequests = new SimpleQueue();
          stream._inFlightWriteRequest = void 0;
          stream._closeRequest = void 0;
          stream._inFlightCloseRequest = void 0;
          stream._pendingAbortRequest = void 0;
          stream._backpressure = false;
        }
        function IsWritableStream(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_writableStreamController")) {
            return false;
          }
          return x2 instanceof WritableStream;
        }
        function IsWritableStreamLocked(stream) {
          if (stream._writer === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamAbort(stream, reason) {
          var _a;
          if (stream._state === "closed" || stream._state === "errored") {
            return promiseResolvedWith(void 0);
          }
          stream._writableStreamController._abortReason = reason;
          (_a = stream._writableStreamController._abortController) === null || _a === void 0 ? void 0 : _a.abort();
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseResolvedWith(void 0);
          }
          if (stream._pendingAbortRequest !== void 0) {
            return stream._pendingAbortRequest._promise;
          }
          let wasAlreadyErroring = false;
          if (state === "erroring") {
            wasAlreadyErroring = true;
            reason = void 0;
          }
          const promise = newPromise((resolve2, reject) => {
            stream._pendingAbortRequest = {
              _promise: void 0,
              _resolve: resolve2,
              _reject: reject,
              _reason: reason,
              _wasAlreadyErroring: wasAlreadyErroring
            };
          });
          stream._pendingAbortRequest._promise = promise;
          if (!wasAlreadyErroring) {
            WritableStreamStartErroring(stream, reason);
          }
          return promise;
        }
        function WritableStreamClose(stream) {
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseRejectedWith(new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
          }
          const promise = newPromise((resolve2, reject) => {
            const closeRequest = {
              _resolve: resolve2,
              _reject: reject
            };
            stream._closeRequest = closeRequest;
          });
          const writer = stream._writer;
          if (writer !== void 0 && stream._backpressure && state === "writable") {
            defaultWriterReadyPromiseResolve(writer);
          }
          WritableStreamDefaultControllerClose(stream._writableStreamController);
          return promise;
        }
        function WritableStreamAddWriteRequest(stream) {
          const promise = newPromise((resolve2, reject) => {
            const writeRequest = {
              _resolve: resolve2,
              _reject: reject
            };
            stream._writeRequests.push(writeRequest);
          });
          return promise;
        }
        function WritableStreamDealWithRejection(stream, error2) {
          const state = stream._state;
          if (state === "writable") {
            WritableStreamStartErroring(stream, error2);
            return;
          }
          WritableStreamFinishErroring(stream);
        }
        function WritableStreamStartErroring(stream, reason) {
          const controller = stream._writableStreamController;
          stream._state = "erroring";
          stream._storedError = reason;
          const writer = stream._writer;
          if (writer !== void 0) {
            WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
          }
          if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) {
            WritableStreamFinishErroring(stream);
          }
        }
        function WritableStreamFinishErroring(stream) {
          stream._state = "errored";
          stream._writableStreamController[ErrorSteps]();
          const storedError = stream._storedError;
          stream._writeRequests.forEach((writeRequest) => {
            writeRequest._reject(storedError);
          });
          stream._writeRequests = new SimpleQueue();
          if (stream._pendingAbortRequest === void 0) {
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const abortRequest = stream._pendingAbortRequest;
          stream._pendingAbortRequest = void 0;
          if (abortRequest._wasAlreadyErroring) {
            abortRequest._reject(storedError);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
          uponPromise(promise, () => {
            abortRequest._resolve();
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          }, (reason) => {
            abortRequest._reject(reason);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          });
        }
        function WritableStreamFinishInFlightWrite(stream) {
          stream._inFlightWriteRequest._resolve(void 0);
          stream._inFlightWriteRequest = void 0;
        }
        function WritableStreamFinishInFlightWriteWithError(stream, error2) {
          stream._inFlightWriteRequest._reject(error2);
          stream._inFlightWriteRequest = void 0;
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamFinishInFlightClose(stream) {
          stream._inFlightCloseRequest._resolve(void 0);
          stream._inFlightCloseRequest = void 0;
          const state = stream._state;
          if (state === "erroring") {
            stream._storedError = void 0;
            if (stream._pendingAbortRequest !== void 0) {
              stream._pendingAbortRequest._resolve();
              stream._pendingAbortRequest = void 0;
            }
          }
          stream._state = "closed";
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseResolve(writer);
          }
        }
        function WritableStreamFinishInFlightCloseWithError(stream, error2) {
          stream._inFlightCloseRequest._reject(error2);
          stream._inFlightCloseRequest = void 0;
          if (stream._pendingAbortRequest !== void 0) {
            stream._pendingAbortRequest._reject(error2);
            stream._pendingAbortRequest = void 0;
          }
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamCloseQueuedOrInFlight(stream) {
          if (stream._closeRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamHasOperationMarkedInFlight(stream) {
          if (stream._inFlightWriteRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamMarkCloseRequestInFlight(stream) {
          stream._inFlightCloseRequest = stream._closeRequest;
          stream._closeRequest = void 0;
        }
        function WritableStreamMarkFirstWriteRequestInFlight(stream) {
          stream._inFlightWriteRequest = stream._writeRequests.shift();
        }
        function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
          if (stream._closeRequest !== void 0) {
            stream._closeRequest._reject(stream._storedError);
            stream._closeRequest = void 0;
          }
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseReject(writer, stream._storedError);
          }
        }
        function WritableStreamUpdateBackpressure(stream, backpressure) {
          const writer = stream._writer;
          if (writer !== void 0 && backpressure !== stream._backpressure) {
            if (backpressure) {
              defaultWriterReadyPromiseReset(writer);
            } else {
              defaultWriterReadyPromiseResolve(writer);
            }
          }
          stream._backpressure = backpressure;
        }
        class WritableStreamDefaultWriter {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "WritableStreamDefaultWriter");
            assertWritableStream(stream, "First parameter");
            if (IsWritableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive writing by another writer");
            }
            this._ownerWritableStream = stream;
            stream._writer = this;
            const state = stream._state;
            if (state === "writable") {
              if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) {
                defaultWriterReadyPromiseInitialize(this);
              } else {
                defaultWriterReadyPromiseInitializeAsResolved(this);
              }
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "erroring") {
              defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "closed") {
              defaultWriterReadyPromiseInitializeAsResolved(this);
              defaultWriterClosedPromiseInitializeAsResolved(this);
            } else {
              const storedError = stream._storedError;
              defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
              defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
            }
          }
          get closed() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          get desiredSize() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("desiredSize");
            }
            if (this._ownerWritableStream === void 0) {
              throw defaultWriterLockException("desiredSize");
            }
            return WritableStreamDefaultWriterGetDesiredSize(this);
          }
          get ready() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("ready"));
            }
            return this._readyPromise;
          }
          abort(reason = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("abort"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("abort"));
            }
            return WritableStreamDefaultWriterAbort(this, reason);
          }
          close() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("close"));
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("close"));
            }
            if (WritableStreamCloseQueuedOrInFlight(stream)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamDefaultWriterClose(this);
          }
          releaseLock() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("releaseLock");
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return;
            }
            WritableStreamDefaultWriterRelease(this);
          }
          write(chunk = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("write"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("write to"));
            }
            return WritableStreamDefaultWriterWrite(this, chunk);
          }
        }
        Object.defineProperties(WritableStreamDefaultWriter.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          releaseLock: { enumerable: true },
          write: { enumerable: true },
          closed: { enumerable: true },
          desiredSize: { enumerable: true },
          ready: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultWriter.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultWriter",
            configurable: true
          });
        }
        function IsWritableStreamDefaultWriter(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_ownerWritableStream")) {
            return false;
          }
          return x2 instanceof WritableStreamDefaultWriter;
        }
        function WritableStreamDefaultWriterAbort(writer, reason) {
          const stream = writer._ownerWritableStream;
          return WritableStreamAbort(stream, reason);
        }
        function WritableStreamDefaultWriterClose(writer) {
          const stream = writer._ownerWritableStream;
          return WritableStreamClose(stream);
        }
        function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          return WritableStreamDefaultWriterClose(writer);
        }
        function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error2) {
          if (writer._closedPromiseState === "pending") {
            defaultWriterClosedPromiseReject(writer, error2);
          } else {
            defaultWriterClosedPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error2) {
          if (writer._readyPromiseState === "pending") {
            defaultWriterReadyPromiseReject(writer, error2);
          } else {
            defaultWriterReadyPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterGetDesiredSize(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (state === "errored" || state === "erroring") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
        }
        function WritableStreamDefaultWriterRelease(writer) {
          const stream = writer._ownerWritableStream;
          const releasedError = new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
          WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
          WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
          stream._writer = void 0;
          writer._ownerWritableStream = void 0;
        }
        function WritableStreamDefaultWriterWrite(writer, chunk) {
          const stream = writer._ownerWritableStream;
          const controller = stream._writableStreamController;
          const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
          if (stream !== writer._ownerWritableStream) {
            return promiseRejectedWith(defaultWriterLockException("write to"));
          }
          const state = stream._state;
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseRejectedWith(new TypeError("The stream is closing or closed and cannot be written to"));
          }
          if (state === "erroring") {
            return promiseRejectedWith(stream._storedError);
          }
          const promise = WritableStreamAddWriteRequest(stream);
          WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
          return promise;
        }
        const closeSentinel = {};
        class WritableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get abortReason() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("abortReason");
            }
            return this._abortReason;
          }
          get signal() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("signal");
            }
            if (this._abortController === void 0) {
              throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
            }
            return this._abortController.signal;
          }
          error(e2 = void 0) {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("error");
            }
            const state = this._controlledWritableStream._state;
            if (state !== "writable") {
              return;
            }
            WritableStreamDefaultControllerError(this, e2);
          }
          [AbortSteps](reason) {
            const result = this._abortAlgorithm(reason);
            WritableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [ErrorSteps]() {
            ResetQueue(this);
          }
        }
        Object.defineProperties(WritableStreamDefaultController.prototype, {
          error: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultController",
            configurable: true
          });
        }
        function IsWritableStreamDefaultController(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_controlledWritableStream")) {
            return false;
          }
          return x2 instanceof WritableStreamDefaultController;
        }
        function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledWritableStream = stream;
          stream._writableStreamController = controller;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._abortReason = void 0;
          controller._abortController = createAbortController();
          controller._started = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._writeAlgorithm = writeAlgorithm;
          controller._closeAlgorithm = closeAlgorithm;
          controller._abortAlgorithm = abortAlgorithm;
          const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
          WritableStreamUpdateBackpressure(stream, backpressure);
          const startResult = startAlgorithm();
          const startPromise = promiseResolvedWith(startResult);
          uponPromise(startPromise, () => {
            controller._started = true;
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (r2) => {
            controller._started = true;
            WritableStreamDealWithRejection(stream, r2);
          });
        }
        function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(WritableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let writeAlgorithm = () => promiseResolvedWith(void 0);
          let closeAlgorithm = () => promiseResolvedWith(void 0);
          let abortAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSink.start !== void 0) {
            startAlgorithm = () => underlyingSink.start(controller);
          }
          if (underlyingSink.write !== void 0) {
            writeAlgorithm = (chunk) => underlyingSink.write(chunk, controller);
          }
          if (underlyingSink.close !== void 0) {
            closeAlgorithm = () => underlyingSink.close();
          }
          if (underlyingSink.abort !== void 0) {
            abortAlgorithm = (reason) => underlyingSink.abort(reason);
          }
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function WritableStreamDefaultControllerClearAlgorithms(controller) {
          controller._writeAlgorithm = void 0;
          controller._closeAlgorithm = void 0;
          controller._abortAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function WritableStreamDefaultControllerClose(controller) {
          EnqueueValueWithSize(controller, closeSentinel, 0);
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
          try {
            return controller._strategySizeAlgorithm(chunk);
          } catch (chunkSizeE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
            return 1;
          }
        }
        function WritableStreamDefaultControllerGetDesiredSize(controller) {
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
          try {
            EnqueueValueWithSize(controller, chunk, chunkSize);
          } catch (enqueueE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
            return;
          }
          const stream = controller._controlledWritableStream;
          if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === "writable") {
            const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
            WritableStreamUpdateBackpressure(stream, backpressure);
          }
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
          const stream = controller._controlledWritableStream;
          if (!controller._started) {
            return;
          }
          if (stream._inFlightWriteRequest !== void 0) {
            return;
          }
          const state = stream._state;
          if (state === "erroring") {
            WritableStreamFinishErroring(stream);
            return;
          }
          if (controller._queue.length === 0) {
            return;
          }
          const value = PeekQueueValue(controller);
          if (value === closeSentinel) {
            WritableStreamDefaultControllerProcessClose(controller);
          } else {
            WritableStreamDefaultControllerProcessWrite(controller, value);
          }
        }
        function WritableStreamDefaultControllerErrorIfNeeded(controller, error2) {
          if (controller._controlledWritableStream._state === "writable") {
            WritableStreamDefaultControllerError(controller, error2);
          }
        }
        function WritableStreamDefaultControllerProcessClose(controller) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkCloseRequestInFlight(stream);
          DequeueValue(controller);
          const sinkClosePromise = controller._closeAlgorithm();
          WritableStreamDefaultControllerClearAlgorithms(controller);
          uponPromise(sinkClosePromise, () => {
            WritableStreamFinishInFlightClose(stream);
          }, (reason) => {
            WritableStreamFinishInFlightCloseWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkFirstWriteRequestInFlight(stream);
          const sinkWritePromise = controller._writeAlgorithm(chunk);
          uponPromise(sinkWritePromise, () => {
            WritableStreamFinishInFlightWrite(stream);
            const state = stream._state;
            DequeueValue(controller);
            if (!WritableStreamCloseQueuedOrInFlight(stream) && state === "writable") {
              const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
              WritableStreamUpdateBackpressure(stream, backpressure);
            }
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (reason) => {
            if (stream._state === "writable") {
              WritableStreamDefaultControllerClearAlgorithms(controller);
            }
            WritableStreamFinishInFlightWriteWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerGetBackpressure(controller) {
          const desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
          return desiredSize <= 0;
        }
        function WritableStreamDefaultControllerError(controller, error2) {
          const stream = controller._controlledWritableStream;
          WritableStreamDefaultControllerClearAlgorithms(controller);
          WritableStreamStartErroring(stream, error2);
        }
        function streamBrandCheckException$2(name) {
          return new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
        }
        function defaultControllerBrandCheckException$2(name) {
          return new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
        }
        function defaultWriterBrandCheckException(name) {
          return new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
        }
        function defaultWriterLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released writer");
        }
        function defaultWriterClosedPromiseInitialize(writer) {
          writer._closedPromise = newPromise((resolve2, reject) => {
            writer._closedPromise_resolve = resolve2;
            writer._closedPromise_reject = reject;
            writer._closedPromiseState = "pending";
          });
        }
        function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseReject(writer, reason);
        }
        function defaultWriterClosedPromiseInitializeAsResolved(writer) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseResolve(writer);
        }
        function defaultWriterClosedPromiseReject(writer, reason) {
          if (writer._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._closedPromise);
          writer._closedPromise_reject(reason);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "rejected";
        }
        function defaultWriterClosedPromiseResetToRejected(writer, reason) {
          defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterClosedPromiseResolve(writer) {
          if (writer._closedPromise_resolve === void 0) {
            return;
          }
          writer._closedPromise_resolve(void 0);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "resolved";
        }
        function defaultWriterReadyPromiseInitialize(writer) {
          writer._readyPromise = newPromise((resolve2, reject) => {
            writer._readyPromise_resolve = resolve2;
            writer._readyPromise_reject = reject;
          });
          writer._readyPromiseState = "pending";
        }
        function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseReject(writer, reason);
        }
        function defaultWriterReadyPromiseInitializeAsResolved(writer) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseResolve(writer);
        }
        function defaultWriterReadyPromiseReject(writer, reason) {
          if (writer._readyPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._readyPromise);
          writer._readyPromise_reject(reason);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "rejected";
        }
        function defaultWriterReadyPromiseReset(writer) {
          defaultWriterReadyPromiseInitialize(writer);
        }
        function defaultWriterReadyPromiseResetToRejected(writer, reason) {
          defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterReadyPromiseResolve(writer) {
          if (writer._readyPromise_resolve === void 0) {
            return;
          }
          writer._readyPromise_resolve(void 0);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "fulfilled";
        }
        const NativeDOMException = typeof DOMException !== "undefined" ? DOMException : void 0;
        function isDOMExceptionConstructor(ctor) {
          if (!(typeof ctor === "function" || typeof ctor === "object")) {
            return false;
          }
          try {
            new ctor();
            return true;
          } catch (_a) {
            return false;
          }
        }
        function createDOMExceptionPolyfill() {
          const ctor = function DOMException2(message, name) {
            this.message = message || "";
            this.name = name || "Error";
            if (Error.captureStackTrace) {
              Error.captureStackTrace(this, this.constructor);
            }
          };
          ctor.prototype = Object.create(Error.prototype);
          Object.defineProperty(ctor.prototype, "constructor", { value: ctor, writable: true, configurable: true });
          return ctor;
        }
        const DOMException$1 = isDOMExceptionConstructor(NativeDOMException) ? NativeDOMException : createDOMExceptionPolyfill();
        function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
          const reader = AcquireReadableStreamDefaultReader(source);
          const writer = AcquireWritableStreamDefaultWriter(dest);
          source._disturbed = true;
          let shuttingDown = false;
          let currentWrite = promiseResolvedWith(void 0);
          return newPromise((resolve2, reject) => {
            let abortAlgorithm;
            if (signal !== void 0) {
              abortAlgorithm = () => {
                const error2 = new DOMException$1("Aborted", "AbortError");
                const actions = [];
                if (!preventAbort) {
                  actions.push(() => {
                    if (dest._state === "writable") {
                      return WritableStreamAbort(dest, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                if (!preventCancel) {
                  actions.push(() => {
                    if (source._state === "readable") {
                      return ReadableStreamCancel(source, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                shutdownWithAction(() => Promise.all(actions.map((action) => action())), true, error2);
              };
              if (signal.aborted) {
                abortAlgorithm();
                return;
              }
              signal.addEventListener("abort", abortAlgorithm);
            }
            function pipeLoop() {
              return newPromise((resolveLoop, rejectLoop) => {
                function next(done) {
                  if (done) {
                    resolveLoop();
                  } else {
                    PerformPromiseThen(pipeStep(), next, rejectLoop);
                  }
                }
                next(false);
              });
            }
            function pipeStep() {
              if (shuttingDown) {
                return promiseResolvedWith(true);
              }
              return PerformPromiseThen(writer._readyPromise, () => {
                return newPromise((resolveRead, rejectRead) => {
                  ReadableStreamDefaultReaderRead(reader, {
                    _chunkSteps: (chunk) => {
                      currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), void 0, noop2);
                      resolveRead(false);
                    },
                    _closeSteps: () => resolveRead(true),
                    _errorSteps: rejectRead
                  });
                });
              });
            }
            isOrBecomesErrored(source, reader._closedPromise, (storedError) => {
              if (!preventAbort) {
                shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesErrored(dest, writer._closedPromise, (storedError) => {
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesClosed(source, reader._closedPromise, () => {
              if (!preventClose) {
                shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
              } else {
                shutdown();
              }
            });
            if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === "closed") {
              const destClosed = new TypeError("the destination writable stream closed before all data could be piped to it");
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
              } else {
                shutdown(true, destClosed);
              }
            }
            setPromiseIsHandledToTrue(pipeLoop());
            function waitForWritesToFinish() {
              const oldCurrentWrite = currentWrite;
              return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : void 0);
            }
            function isOrBecomesErrored(stream, promise, action) {
              if (stream._state === "errored") {
                action(stream._storedError);
              } else {
                uponRejection(promise, action);
              }
            }
            function isOrBecomesClosed(stream, promise, action) {
              if (stream._state === "closed") {
                action();
              } else {
                uponFulfillment(promise, action);
              }
            }
            function shutdownWithAction(action, originalIsError, originalError) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), doTheRest);
              } else {
                doTheRest();
              }
              function doTheRest() {
                uponPromise(action(), () => finalize(originalIsError, originalError), (newError) => finalize(true, newError));
              }
            }
            function shutdown(isError, error2) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error2));
              } else {
                finalize(isError, error2);
              }
            }
            function finalize(isError, error2) {
              WritableStreamDefaultWriterRelease(writer);
              ReadableStreamReaderGenericRelease(reader);
              if (signal !== void 0) {
                signal.removeEventListener("abort", abortAlgorithm);
              }
              if (isError) {
                reject(error2);
              } else {
                resolve2(void 0);
              }
            }
          });
        }
        class ReadableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("desiredSize");
            }
            return ReadableStreamDefaultControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("close");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits close");
            }
            ReadableStreamDefaultControllerClose(this);
          }
          enqueue(chunk = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("enqueue");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits enqueue");
            }
            return ReadableStreamDefaultControllerEnqueue(this, chunk);
          }
          error(e2 = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("error");
            }
            ReadableStreamDefaultControllerError(this, e2);
          }
          [CancelSteps](reason) {
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableStream;
            if (this._queue.length > 0) {
              const chunk = DequeueValue(this);
              if (this._closeRequested && this._queue.length === 0) {
                ReadableStreamDefaultControllerClearAlgorithms(this);
                ReadableStreamClose(stream);
              } else {
                ReadableStreamDefaultControllerCallPullIfNeeded(this);
              }
              readRequest._chunkSteps(chunk);
            } else {
              ReadableStreamAddReadRequest(stream, readRequest);
              ReadableStreamDefaultControllerCallPullIfNeeded(this);
            }
          }
        }
        Object.defineProperties(ReadableStreamDefaultController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultController",
            configurable: true
          });
        }
        function IsReadableStreamDefaultController(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_controlledReadableStream")) {
            return false;
          }
          return x2 instanceof ReadableStreamDefaultController;
        }
        function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableStreamDefaultControllerCallPullIfNeeded(controller);
            }
          }, (e2) => {
            ReadableStreamDefaultControllerError(controller, e2);
          });
        }
        function ReadableStreamDefaultControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableStream;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableStreamDefaultControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function ReadableStreamDefaultControllerClose(controller) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          controller._closeRequested = true;
          if (controller._queue.length === 0) {
            ReadableStreamDefaultControllerClearAlgorithms(controller);
            ReadableStreamClose(stream);
          }
        }
        function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            ReadableStreamFulfillReadRequest(stream, chunk, false);
          } else {
            let chunkSize;
            try {
              chunkSize = controller._strategySizeAlgorithm(chunk);
            } catch (chunkSizeE) {
              ReadableStreamDefaultControllerError(controller, chunkSizeE);
              throw chunkSizeE;
            }
            try {
              EnqueueValueWithSize(controller, chunk, chunkSize);
            } catch (enqueueE) {
              ReadableStreamDefaultControllerError(controller, enqueueE);
              throw enqueueE;
            }
          }
          ReadableStreamDefaultControllerCallPullIfNeeded(controller);
        }
        function ReadableStreamDefaultControllerError(controller, e2) {
          const stream = controller._controlledReadableStream;
          if (stream._state !== "readable") {
            return;
          }
          ResetQueue(controller);
          ReadableStreamDefaultControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e2);
        }
        function ReadableStreamDefaultControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableStreamDefaultControllerHasBackpressure(controller) {
          if (ReadableStreamDefaultControllerShouldCallPull(controller)) {
            return false;
          }
          return true;
        }
        function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
          const state = controller._controlledReadableStream._state;
          if (!controller._closeRequested && state === "readable") {
            return true;
          }
          return false;
        }
        function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledReadableStream = stream;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._started = false;
          controller._closeRequested = false;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
          }, (r2) => {
            ReadableStreamDefaultControllerError(controller, r2);
          });
        }
        function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSource.start !== void 0) {
            startAlgorithm = () => underlyingSource.start(controller);
          }
          if (underlyingSource.pull !== void 0) {
            pullAlgorithm = () => underlyingSource.pull(controller);
          }
          if (underlyingSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingSource.cancel(reason);
          }
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function defaultControllerBrandCheckException$1(name) {
          return new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
        }
        function ReadableStreamTee(stream, cloneForBranch2) {
          if (IsReadableByteStreamController(stream._readableStreamController)) {
            return ReadableByteStreamTee(stream);
          }
          return ReadableStreamDefaultTee(stream);
        }
        function ReadableStreamDefaultTee(stream, cloneForBranch2) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve2) => {
            resolveCancelPromise = resolve2;
          });
          function pullAlgorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  const chunk2 = chunk;
                  if (!canceled1) {
                    ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableStreamDefaultControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableStreamDefaultControllerClose(branch2._readableStreamController);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
          }
          branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
          branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
          uponRejection(reader._closedPromise, (r2) => {
            ReadableStreamDefaultControllerError(branch1._readableStreamController, r2);
            ReadableStreamDefaultControllerError(branch2._readableStreamController, r2);
            if (!canceled1 || !canceled2) {
              resolveCancelPromise(void 0);
            }
          });
          return [branch1, branch2];
        }
        function ReadableByteStreamTee(stream) {
          let reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve2) => {
            resolveCancelPromise = resolve2;
          });
          function forwardReaderError(thisReader) {
            uponRejection(thisReader._closedPromise, (r2) => {
              if (thisReader !== reader) {
                return;
              }
              ReadableByteStreamControllerError(branch1._readableStreamController, r2);
              ReadableByteStreamControllerError(branch2._readableStreamController, r2);
              if (!canceled1 || !canceled2) {
                resolveCancelPromise(void 0);
              }
            });
          }
          function pullWithDefaultReader() {
            if (IsReadableStreamBYOBReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamDefaultReader(stream);
              forwardReaderError(reader);
            }
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  let chunk2 = chunk;
                  if (!canceled1 && !canceled2) {
                    try {
                      chunk2 = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                  }
                  if (!canceled1) {
                    ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableByteStreamControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableByteStreamControllerClose(branch2._readableStreamController);
                }
                if (branch1._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
                }
                if (branch2._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
          }
          function pullWithBYOBReader(view, forBranch2) {
            if (IsReadableStreamDefaultReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamBYOBReader(stream);
              forwardReaderError(reader);
            }
            const byobBranch = forBranch2 ? branch2 : branch1;
            const otherBranch = forBranch2 ? branch1 : branch2;
            const readIntoRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const byobCanceled = forBranch2 ? canceled2 : canceled1;
                  const otherCanceled = forBranch2 ? canceled1 : canceled2;
                  if (!otherCanceled) {
                    let clonedChunk;
                    try {
                      clonedChunk = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                    if (!byobCanceled) {
                      ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                    }
                    ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
                  } else if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                });
              },
              _closeSteps: (chunk) => {
                reading = false;
                const byobCanceled = forBranch2 ? canceled2 : canceled1;
                const otherCanceled = forBranch2 ? canceled1 : canceled2;
                if (!byobCanceled) {
                  ReadableByteStreamControllerClose(byobBranch._readableStreamController);
                }
                if (!otherCanceled) {
                  ReadableByteStreamControllerClose(otherBranch._readableStreamController);
                }
                if (chunk !== void 0) {
                  if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                  if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) {
                    ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
                  }
                }
                if (!byobCanceled || !otherCanceled) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamBYOBReaderRead(reader, view, readIntoRequest);
          }
          function pull1Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, false);
            }
            return promiseResolvedWith(void 0);
          }
          function pull2Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, true);
            }
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
            return;
          }
          branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
          branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
          forwardReaderError(reader);
          return [branch1, branch2];
        }
        function convertUnderlyingDefaultOrByteSource(source, context) {
          assertDictionary(source, context);
          const original = source;
          const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
          const cancel = original === null || original === void 0 ? void 0 : original.cancel;
          const pull = original === null || original === void 0 ? void 0 : original.pull;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          return {
            autoAllocateChunkSize: autoAllocateChunkSize === void 0 ? void 0 : convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
            cancel: cancel === void 0 ? void 0 : convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
            pull: pull === void 0 ? void 0 : convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
            type: type === void 0 ? void 0 : convertReadableStreamType(type, `${context} has member 'type' that`)
          };
        }
        function convertUnderlyingSourceCancelCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSourcePullCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertUnderlyingSourceStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertReadableStreamType(type, context) {
          type = `${type}`;
          if (type !== "bytes") {
            throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
          }
          return type;
        }
        function convertReaderOptions(options2, context) {
          assertDictionary(options2, context);
          const mode = options2 === null || options2 === void 0 ? void 0 : options2.mode;
          return {
            mode: mode === void 0 ? void 0 : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`)
          };
        }
        function convertReadableStreamReaderMode(mode, context) {
          mode = `${mode}`;
          if (mode !== "byob") {
            throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
          }
          return mode;
        }
        function convertIteratorOptions(options2, context) {
          assertDictionary(options2, context);
          const preventCancel = options2 === null || options2 === void 0 ? void 0 : options2.preventCancel;
          return { preventCancel: Boolean(preventCancel) };
        }
        function convertPipeOptions(options2, context) {
          assertDictionary(options2, context);
          const preventAbort = options2 === null || options2 === void 0 ? void 0 : options2.preventAbort;
          const preventCancel = options2 === null || options2 === void 0 ? void 0 : options2.preventCancel;
          const preventClose = options2 === null || options2 === void 0 ? void 0 : options2.preventClose;
          const signal = options2 === null || options2 === void 0 ? void 0 : options2.signal;
          if (signal !== void 0) {
            assertAbortSignal(signal, `${context} has member 'signal' that`);
          }
          return {
            preventAbort: Boolean(preventAbort),
            preventCancel: Boolean(preventCancel),
            preventClose: Boolean(preventClose),
            signal
          };
        }
        function assertAbortSignal(signal, context) {
          if (!isAbortSignal2(signal)) {
            throw new TypeError(`${context} is not an AbortSignal.`);
          }
        }
        function convertReadableWritablePair(pair, context) {
          assertDictionary(pair, context);
          const readable = pair === null || pair === void 0 ? void 0 : pair.readable;
          assertRequiredField(readable, "readable", "ReadableWritablePair");
          assertReadableStream(readable, `${context} has member 'readable' that`);
          const writable2 = pair === null || pair === void 0 ? void 0 : pair.writable;
          assertRequiredField(writable2, "writable", "ReadableWritablePair");
          assertWritableStream(writable2, `${context} has member 'writable' that`);
          return { readable, writable: writable2 };
        }
        class ReadableStream2 {
          constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
            if (rawUnderlyingSource === void 0) {
              rawUnderlyingSource = null;
            } else {
              assertObject(rawUnderlyingSource, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, "First parameter");
            InitializeReadableStream(this);
            if (underlyingSource.type === "bytes") {
              if (strategy.size !== void 0) {
                throw new RangeError("The strategy for a byte stream cannot have a size function");
              }
              const highWaterMark = ExtractHighWaterMark(strategy, 0);
              SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
            } else {
              const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
              const highWaterMark = ExtractHighWaterMark(strategy, 1);
              SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
            }
          }
          get locked() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("locked");
            }
            return IsReadableStreamLocked(this);
          }
          cancel(reason = void 0) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("cancel"));
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot cancel a stream that already has a reader"));
            }
            return ReadableStreamCancel(this, reason);
          }
          getReader(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("getReader");
            }
            const options2 = convertReaderOptions(rawOptions, "First parameter");
            if (options2.mode === void 0) {
              return AcquireReadableStreamDefaultReader(this);
            }
            return AcquireReadableStreamBYOBReader(this);
          }
          pipeThrough(rawTransform, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("pipeThrough");
            }
            assertRequiredArgument(rawTransform, 1, "pipeThrough");
            const transform = convertReadableWritablePair(rawTransform, "First parameter");
            const options2 = convertPipeOptions(rawOptions, "Second parameter");
            if (IsReadableStreamLocked(this)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
            }
            if (IsWritableStreamLocked(transform.writable)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
            }
            const promise = ReadableStreamPipeTo(this, transform.writable, options2.preventClose, options2.preventAbort, options2.preventCancel, options2.signal);
            setPromiseIsHandledToTrue(promise);
            return transform.readable;
          }
          pipeTo(destination, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("pipeTo"));
            }
            if (destination === void 0) {
              return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
            }
            if (!IsWritableStream(destination)) {
              return promiseRejectedWith(new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
            }
            let options2;
            try {
              options2 = convertPipeOptions(rawOptions, "Second parameter");
            } catch (e2) {
              return promiseRejectedWith(e2);
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream"));
            }
            if (IsWritableStreamLocked(destination)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream"));
            }
            return ReadableStreamPipeTo(this, destination, options2.preventClose, options2.preventAbort, options2.preventCancel, options2.signal);
          }
          tee() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("tee");
            }
            const branches = ReadableStreamTee(this);
            return CreateArrayFromList(branches);
          }
          values(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("values");
            }
            const options2 = convertIteratorOptions(rawOptions, "First parameter");
            return AcquireReadableStreamAsyncIterator(this, options2.preventCancel);
          }
        }
        Object.defineProperties(ReadableStream2.prototype, {
          cancel: { enumerable: true },
          getReader: { enumerable: true },
          pipeThrough: { enumerable: true },
          pipeTo: { enumerable: true },
          tee: { enumerable: true },
          values: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStream",
            configurable: true
          });
        }
        if (typeof SymbolPolyfill.asyncIterator === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.asyncIterator, {
            value: ReadableStream2.prototype.values,
            writable: true,
            configurable: true
          });
        }
        function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableByteStreamController.prototype);
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, void 0);
          return stream;
        }
        function InitializeReadableStream(stream) {
          stream._state = "readable";
          stream._reader = void 0;
          stream._storedError = void 0;
          stream._disturbed = false;
        }
        function IsReadableStream(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_readableStreamController")) {
            return false;
          }
          return x2 instanceof ReadableStream2;
        }
        function IsReadableStreamLocked(stream) {
          if (stream._reader === void 0) {
            return false;
          }
          return true;
        }
        function ReadableStreamCancel(stream, reason) {
          stream._disturbed = true;
          if (stream._state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (stream._state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          ReadableStreamClose(stream);
          const reader = stream._reader;
          if (reader !== void 0 && IsReadableStreamBYOBReader(reader)) {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._closeSteps(void 0);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
          const sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
          return transformPromiseWith(sourceCancelPromise, noop2);
        }
        function ReadableStreamClose(stream) {
          stream._state = "closed";
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseResolve(reader);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._closeSteps();
            });
            reader._readRequests = new SimpleQueue();
          }
        }
        function ReadableStreamError(stream, e2) {
          stream._state = "errored";
          stream._storedError = e2;
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseReject(reader, e2);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._errorSteps(e2);
            });
            reader._readRequests = new SimpleQueue();
          } else {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._errorSteps(e2);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
        }
        function streamBrandCheckException$1(name) {
          return new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
        }
        function convertQueuingStrategyInit(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          assertRequiredField(highWaterMark, "highWaterMark", "QueuingStrategyInit");
          return {
            highWaterMark: convertUnrestrictedDouble(highWaterMark)
          };
        }
        const byteLengthSizeFunction = (chunk) => {
          return chunk.byteLength;
        };
        Object.defineProperty(byteLengthSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class ByteLengthQueuingStrategy {
          constructor(options2) {
            assertRequiredArgument(options2, 1, "ByteLengthQueuingStrategy");
            options2 = convertQueuingStrategyInit(options2, "First parameter");
            this._byteLengthQueuingStrategyHighWaterMark = options2.highWaterMark;
          }
          get highWaterMark() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("highWaterMark");
            }
            return this._byteLengthQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("size");
            }
            return byteLengthSizeFunction;
          }
        }
        Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ByteLengthQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "ByteLengthQueuingStrategy",
            configurable: true
          });
        }
        function byteLengthBrandCheckException(name) {
          return new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
        }
        function IsByteLengthQueuingStrategy(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_byteLengthQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x2 instanceof ByteLengthQueuingStrategy;
        }
        const countSizeFunction = () => {
          return 1;
        };
        Object.defineProperty(countSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class CountQueuingStrategy {
          constructor(options2) {
            assertRequiredArgument(options2, 1, "CountQueuingStrategy");
            options2 = convertQueuingStrategyInit(options2, "First parameter");
            this._countQueuingStrategyHighWaterMark = options2.highWaterMark;
          }
          get highWaterMark() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("highWaterMark");
            }
            return this._countQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("size");
            }
            return countSizeFunction;
          }
        }
        Object.defineProperties(CountQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(CountQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "CountQueuingStrategy",
            configurable: true
          });
        }
        function countBrandCheckException(name) {
          return new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
        }
        function IsCountQueuingStrategy(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_countQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x2 instanceof CountQueuingStrategy;
        }
        function convertTransformer(original, context) {
          assertDictionary(original, context);
          const flush = original === null || original === void 0 ? void 0 : original.flush;
          const readableType = original === null || original === void 0 ? void 0 : original.readableType;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const transform = original === null || original === void 0 ? void 0 : original.transform;
          const writableType = original === null || original === void 0 ? void 0 : original.writableType;
          return {
            flush: flush === void 0 ? void 0 : convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
            readableType,
            start: start === void 0 ? void 0 : convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
            transform: transform === void 0 ? void 0 : convertTransformerTransformCallback(transform, original, `${context} has member 'transform' that`),
            writableType
          };
        }
        function convertTransformerFlushCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertTransformerStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertTransformerTransformCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        class TransformStream {
          constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
            if (rawTransformer === void 0) {
              rawTransformer = null;
            }
            const writableStrategy = convertQueuingStrategy(rawWritableStrategy, "Second parameter");
            const readableStrategy = convertQueuingStrategy(rawReadableStrategy, "Third parameter");
            const transformer = convertTransformer(rawTransformer, "First parameter");
            if (transformer.readableType !== void 0) {
              throw new RangeError("Invalid readableType specified");
            }
            if (transformer.writableType !== void 0) {
              throw new RangeError("Invalid writableType specified");
            }
            const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
            const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
            const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
            const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
            let startPromise_resolve;
            const startPromise = newPromise((resolve2) => {
              startPromise_resolve = resolve2;
            });
            InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
            SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
            if (transformer.start !== void 0) {
              startPromise_resolve(transformer.start(this._transformStreamController));
            } else {
              startPromise_resolve(void 0);
            }
          }
          get readable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("readable");
            }
            return this._readable;
          }
          get writable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("writable");
            }
            return this._writable;
          }
        }
        Object.defineProperties(TransformStream.prototype, {
          readable: { enumerable: true },
          writable: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStream.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStream",
            configurable: true
          });
        }
        function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
          function startAlgorithm() {
            return startPromise;
          }
          function writeAlgorithm(chunk) {
            return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
          }
          function abortAlgorithm(reason) {
            return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
          }
          function closeAlgorithm() {
            return TransformStreamDefaultSinkCloseAlgorithm(stream);
          }
          stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
          function pullAlgorithm() {
            return TransformStreamDefaultSourcePullAlgorithm(stream);
          }
          function cancelAlgorithm(reason) {
            TransformStreamErrorWritableAndUnblockWrite(stream, reason);
            return promiseResolvedWith(void 0);
          }
          stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
          stream._backpressure = void 0;
          stream._backpressureChangePromise = void 0;
          stream._backpressureChangePromise_resolve = void 0;
          TransformStreamSetBackpressure(stream, true);
          stream._transformStreamController = void 0;
        }
        function IsTransformStream(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_transformStreamController")) {
            return false;
          }
          return x2 instanceof TransformStream;
        }
        function TransformStreamError(stream, e2) {
          ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e2);
          TransformStreamErrorWritableAndUnblockWrite(stream, e2);
        }
        function TransformStreamErrorWritableAndUnblockWrite(stream, e2) {
          TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
          WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e2);
          if (stream._backpressure) {
            TransformStreamSetBackpressure(stream, false);
          }
        }
        function TransformStreamSetBackpressure(stream, backpressure) {
          if (stream._backpressureChangePromise !== void 0) {
            stream._backpressureChangePromise_resolve();
          }
          stream._backpressureChangePromise = newPromise((resolve2) => {
            stream._backpressureChangePromise_resolve = resolve2;
          });
          stream._backpressure = backpressure;
        }
        class TransformStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("desiredSize");
            }
            const readableController = this._controlledTransformStream._readable._readableStreamController;
            return ReadableStreamDefaultControllerGetDesiredSize(readableController);
          }
          enqueue(chunk = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("enqueue");
            }
            TransformStreamDefaultControllerEnqueue(this, chunk);
          }
          error(reason = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("error");
            }
            TransformStreamDefaultControllerError(this, reason);
          }
          terminate() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("terminate");
            }
            TransformStreamDefaultControllerTerminate(this);
          }
        }
        Object.defineProperties(TransformStreamDefaultController.prototype, {
          enqueue: { enumerable: true },
          error: { enumerable: true },
          terminate: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStreamDefaultController",
            configurable: true
          });
        }
        function IsTransformStreamDefaultController(x2) {
          if (!typeIsObject(x2)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x2, "_controlledTransformStream")) {
            return false;
          }
          return x2 instanceof TransformStreamDefaultController;
        }
        function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm) {
          controller._controlledTransformStream = stream;
          stream._transformStreamController = controller;
          controller._transformAlgorithm = transformAlgorithm;
          controller._flushAlgorithm = flushAlgorithm;
        }
        function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
          const controller = Object.create(TransformStreamDefaultController.prototype);
          let transformAlgorithm = (chunk) => {
            try {
              TransformStreamDefaultControllerEnqueue(controller, chunk);
              return promiseResolvedWith(void 0);
            } catch (transformResultE) {
              return promiseRejectedWith(transformResultE);
            }
          };
          let flushAlgorithm = () => promiseResolvedWith(void 0);
          if (transformer.transform !== void 0) {
            transformAlgorithm = (chunk) => transformer.transform(chunk, controller);
          }
          if (transformer.flush !== void 0) {
            flushAlgorithm = () => transformer.flush(controller);
          }
          SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm);
        }
        function TransformStreamDefaultControllerClearAlgorithms(controller) {
          controller._transformAlgorithm = void 0;
          controller._flushAlgorithm = void 0;
        }
        function TransformStreamDefaultControllerEnqueue(controller, chunk) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) {
            throw new TypeError("Readable side is not in a state that permits enqueue");
          }
          try {
            ReadableStreamDefaultControllerEnqueue(readableController, chunk);
          } catch (e2) {
            TransformStreamErrorWritableAndUnblockWrite(stream, e2);
            throw stream._readable._storedError;
          }
          const backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
          if (backpressure !== stream._backpressure) {
            TransformStreamSetBackpressure(stream, true);
          }
        }
        function TransformStreamDefaultControllerError(controller, e2) {
          TransformStreamError(controller._controlledTransformStream, e2);
        }
        function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
          const transformPromise = controller._transformAlgorithm(chunk);
          return transformPromiseWith(transformPromise, void 0, (r2) => {
            TransformStreamError(controller._controlledTransformStream, r2);
            throw r2;
          });
        }
        function TransformStreamDefaultControllerTerminate(controller) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          ReadableStreamDefaultControllerClose(readableController);
          const error2 = new TypeError("TransformStream terminated");
          TransformStreamErrorWritableAndUnblockWrite(stream, error2);
        }
        function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
          const controller = stream._transformStreamController;
          if (stream._backpressure) {
            const backpressureChangePromise = stream._backpressureChangePromise;
            return transformPromiseWith(backpressureChangePromise, () => {
              const writable2 = stream._writable;
              const state = writable2._state;
              if (state === "erroring") {
                throw writable2._storedError;
              }
              return TransformStreamDefaultControllerPerformTransform(controller, chunk);
            });
          }
          return TransformStreamDefaultControllerPerformTransform(controller, chunk);
        }
        function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
          TransformStreamError(stream, reason);
          return promiseResolvedWith(void 0);
        }
        function TransformStreamDefaultSinkCloseAlgorithm(stream) {
          const readable = stream._readable;
          const controller = stream._transformStreamController;
          const flushPromise = controller._flushAlgorithm();
          TransformStreamDefaultControllerClearAlgorithms(controller);
          return transformPromiseWith(flushPromise, () => {
            if (readable._state === "errored") {
              throw readable._storedError;
            }
            ReadableStreamDefaultControllerClose(readable._readableStreamController);
          }, (r2) => {
            TransformStreamError(stream, r2);
            throw readable._storedError;
          });
        }
        function TransformStreamDefaultSourcePullAlgorithm(stream) {
          TransformStreamSetBackpressure(stream, false);
          return stream._backpressureChangePromise;
        }
        function defaultControllerBrandCheckException(name) {
          return new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
        }
        function streamBrandCheckException(name) {
          return new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
        }
        exports2.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
        exports2.CountQueuingStrategy = CountQueuingStrategy;
        exports2.ReadableByteStreamController = ReadableByteStreamController;
        exports2.ReadableStream = ReadableStream2;
        exports2.ReadableStreamBYOBReader = ReadableStreamBYOBReader;
        exports2.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest;
        exports2.ReadableStreamDefaultController = ReadableStreamDefaultController;
        exports2.ReadableStreamDefaultReader = ReadableStreamDefaultReader;
        exports2.TransformStream = TransformStream;
        exports2.TransformStreamDefaultController = TransformStreamDefaultController;
        exports2.WritableStream = WritableStream;
        exports2.WritableStreamDefaultController = WritableStreamDefaultController;
        exports2.WritableStreamDefaultWriter = WritableStreamDefaultWriter;
        Object.defineProperty(exports2, "__esModule", { value: true });
      });
    })(ponyfill_es2018, ponyfill_es2018.exports);
    POOL_SIZE$1 = 65536;
    if (!globalThis.ReadableStream) {
      try {
        const process2 = require("node:process");
        const { emitWarning } = process2;
        try {
          process2.emitWarning = () => {
          };
          Object.assign(globalThis, require("node:stream/web"));
          process2.emitWarning = emitWarning;
        } catch (error2) {
          process2.emitWarning = emitWarning;
          throw error2;
        }
      } catch (error2) {
        Object.assign(globalThis, ponyfill_es2018.exports);
      }
    }
    try {
      const { Blob: Blob3 } = require("buffer");
      if (Blob3 && !Blob3.prototype.stream) {
        Blob3.prototype.stream = function name(params) {
          let position = 0;
          const blob = this;
          return new ReadableStream({
            type: "bytes",
            async pull(ctrl) {
              const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE$1));
              const buffer = await chunk.arrayBuffer();
              position += buffer.byteLength;
              ctrl.enqueue(new Uint8Array(buffer));
              if (position === blob.size) {
                ctrl.close();
              }
            }
          });
        };
      }
    } catch (error2) {
    }
    POOL_SIZE = 65536;
    _Blob = class Blob {
      #parts = [];
      #type = "";
      #size = 0;
      constructor(blobParts = [], options2 = {}) {
        if (typeof blobParts !== "object" || blobParts === null) {
          throw new TypeError("Failed to construct 'Blob': The provided value cannot be converted to a sequence.");
        }
        if (typeof blobParts[Symbol.iterator] !== "function") {
          throw new TypeError("Failed to construct 'Blob': The object must have a callable @@iterator property.");
        }
        if (typeof options2 !== "object" && typeof options2 !== "function") {
          throw new TypeError("Failed to construct 'Blob': parameter 2 cannot convert to dictionary.");
        }
        if (options2 === null)
          options2 = {};
        const encoder = new TextEncoder();
        for (const element of blobParts) {
          let part;
          if (ArrayBuffer.isView(element)) {
            part = new Uint8Array(element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength));
          } else if (element instanceof ArrayBuffer) {
            part = new Uint8Array(element.slice(0));
          } else if (element instanceof Blob) {
            part = element;
          } else {
            part = encoder.encode(element);
          }
          this.#size += ArrayBuffer.isView(part) ? part.byteLength : part.size;
          this.#parts.push(part);
        }
        const type = options2.type === void 0 ? "" : String(options2.type);
        this.#type = /^[\x20-\x7E]*$/.test(type) ? type : "";
      }
      get size() {
        return this.#size;
      }
      get type() {
        return this.#type;
      }
      async text() {
        const decoder = new TextDecoder();
        let str = "";
        for await (const part of toIterator(this.#parts, false)) {
          str += decoder.decode(part, { stream: true });
        }
        str += decoder.decode();
        return str;
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of toIterator(this.#parts, false)) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        const it = toIterator(this.#parts, true);
        return new globalThis.ReadableStream({
          type: "bytes",
          async pull(ctrl) {
            const chunk = await it.next();
            chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
          },
          async cancel() {
            await it.return();
          }
        });
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = this.#parts;
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          if (added >= span) {
            break;
          }
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            let chunk;
            if (ArrayBuffer.isView(part)) {
              chunk = part.subarray(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.byteLength;
            } else {
              chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.size;
            }
            relativeEnd -= size2;
            blobParts.push(chunk);
            relativeStart = 0;
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        blob.#size = span;
        blob.#parts = blobParts;
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.constructor === "function" && (typeof object.stream === "function" || typeof object.arrayBuffer === "function") && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(_Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    Blob2 = _Blob;
    Blob$1 = Blob2;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && (object[NAME] === "AbortSignal" || object[NAME] === "EventTarget");
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (error_) => {
            const error2 = error_ instanceof FetchBaseError ? error_ : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${error_.message}`, "system", error_);
            this[INTERNALS$2].error = error2;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new Blob$1([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        import_stream.default.Readable.from(body.stream()).pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const error2 = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw error2;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const error2 = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_CHAR" });
        throw error2;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p2, receiver) {
            switch (p2) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p2].call(target, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p2].call(target, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p2, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback, thisArg = void 0) {
        for (const name of this.keys()) {
          Reflect.apply(callback, thisArg, [this.get(name), name, this]);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status != null ? options2.status : 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          type: "default",
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get type() {
        return this[INTERNALS$1].type;
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          type: this.type,
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      static error() {
        const response = new Response(null, { status: 0, statusText: "" });
        response[INTERNALS$1].type = "error";
        return response;
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      type: { enumerable: true },
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal != null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/@sveltejs/adapter-netlify/files/shims.js
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-netlify/files/shims.js"() {
    init_install_fetch();
  }
});

// node_modules/jssha/dist/sha.mjs
function n(t2, n2, e2, r2) {
  let i2, s3, o2;
  const h2 = n2 || [0], u2 = (e2 = e2 || 0) >>> 3, w2 = r2 === -1 ? 3 : 0;
  for (i2 = 0; i2 < t2.length; i2 += 1)
    o2 = i2 + u2, s3 = o2 >>> 2, h2.length <= s3 && h2.push(0), h2[s3] |= t2[i2] << 8 * (w2 + r2 * (o2 % 4));
  return { value: h2, binLen: 8 * t2.length + e2 };
}
function e(e2, r2, i2) {
  switch (r2) {
    case "UTF8":
    case "UTF16BE":
    case "UTF16LE":
      break;
    default:
      throw new Error("encoding must be UTF8, UTF16BE, or UTF16LE");
  }
  switch (e2) {
    case "HEX":
      return function(t2, n2, e3) {
        return function(t3, n3, e4, r3) {
          let i3, s3, o2, h2;
          if (t3.length % 2 != 0)
            throw new Error("String of HEX type must be in byte increments");
          const u2 = n3 || [0], w2 = (e4 = e4 || 0) >>> 3, c2 = r3 === -1 ? 3 : 0;
          for (i3 = 0; i3 < t3.length; i3 += 2) {
            if (s3 = parseInt(t3.substr(i3, 2), 16), isNaN(s3))
              throw new Error("String of HEX type contains invalid characters");
            for (h2 = (i3 >>> 1) + w2, o2 = h2 >>> 2; u2.length <= o2; )
              u2.push(0);
            u2[o2] |= s3 << 8 * (c2 + r3 * (h2 % 4));
          }
          return { value: u2, binLen: 4 * t3.length + e4 };
        }(t2, n2, e3, i2);
      };
    case "TEXT":
      return function(t2, n2, e3) {
        return function(t3, n3, e4, r3, i3) {
          let s3, o2, h2, u2, w2, c2, f2, a2, l2 = 0;
          const A2 = e4 || [0], E2 = (r3 = r3 || 0) >>> 3;
          if (n3 === "UTF8")
            for (f2 = i3 === -1 ? 3 : 0, h2 = 0; h2 < t3.length; h2 += 1)
              for (s3 = t3.charCodeAt(h2), o2 = [], 128 > s3 ? o2.push(s3) : 2048 > s3 ? (o2.push(192 | s3 >>> 6), o2.push(128 | 63 & s3)) : 55296 > s3 || 57344 <= s3 ? o2.push(224 | s3 >>> 12, 128 | s3 >>> 6 & 63, 128 | 63 & s3) : (h2 += 1, s3 = 65536 + ((1023 & s3) << 10 | 1023 & t3.charCodeAt(h2)), o2.push(240 | s3 >>> 18, 128 | s3 >>> 12 & 63, 128 | s3 >>> 6 & 63, 128 | 63 & s3)), u2 = 0; u2 < o2.length; u2 += 1) {
                for (c2 = l2 + E2, w2 = c2 >>> 2; A2.length <= w2; )
                  A2.push(0);
                A2[w2] |= o2[u2] << 8 * (f2 + i3 * (c2 % 4)), l2 += 1;
              }
          else
            for (f2 = i3 === -1 ? 2 : 0, a2 = n3 === "UTF16LE" && i3 !== 1 || n3 !== "UTF16LE" && i3 === 1, h2 = 0; h2 < t3.length; h2 += 1) {
              for (s3 = t3.charCodeAt(h2), a2 === true && (u2 = 255 & s3, s3 = u2 << 8 | s3 >>> 8), c2 = l2 + E2, w2 = c2 >>> 2; A2.length <= w2; )
                A2.push(0);
              A2[w2] |= s3 << 8 * (f2 + i3 * (c2 % 4)), l2 += 2;
            }
          return { value: A2, binLen: 8 * l2 + r3 };
        }(t2, r2, n2, e3, i2);
      };
    case "B64":
      return function(n2, e3, r3) {
        return function(n3, e4, r4, i3) {
          let s3, o2, h2, u2, w2, c2, f2, a2 = 0;
          const l2 = e4 || [0], A2 = (r4 = r4 || 0) >>> 3, E2 = i3 === -1 ? 3 : 0, H2 = n3.indexOf("=");
          if (n3.search(/^[a-zA-Z0-9=+/]+$/) === -1)
            throw new Error("Invalid character in base-64 string");
          if (n3 = n3.replace(/=/g, ""), H2 !== -1 && H2 < n3.length)
            throw new Error("Invalid '=' found in base-64 string");
          for (o2 = 0; o2 < n3.length; o2 += 4) {
            for (w2 = n3.substr(o2, 4), u2 = 0, h2 = 0; h2 < w2.length; h2 += 1)
              s3 = t.indexOf(w2.charAt(h2)), u2 |= s3 << 18 - 6 * h2;
            for (h2 = 0; h2 < w2.length - 1; h2 += 1) {
              for (f2 = a2 + A2, c2 = f2 >>> 2; l2.length <= c2; )
                l2.push(0);
              l2[c2] |= (u2 >>> 16 - 8 * h2 & 255) << 8 * (E2 + i3 * (f2 % 4)), a2 += 1;
            }
          }
          return { value: l2, binLen: 8 * a2 + r4 };
        }(n2, e3, r3, i2);
      };
    case "BYTES":
      return function(t2, n2, e3) {
        return function(t3, n3, e4, r3) {
          let i3, s3, o2, h2;
          const u2 = n3 || [0], w2 = (e4 = e4 || 0) >>> 3, c2 = r3 === -1 ? 3 : 0;
          for (s3 = 0; s3 < t3.length; s3 += 1)
            i3 = t3.charCodeAt(s3), h2 = s3 + w2, o2 = h2 >>> 2, u2.length <= o2 && u2.push(0), u2[o2] |= i3 << 8 * (c2 + r3 * (h2 % 4));
          return { value: u2, binLen: 8 * t3.length + e4 };
        }(t2, n2, e3, i2);
      };
    case "ARRAYBUFFER":
      try {
        new ArrayBuffer(0);
      } catch (t2) {
        throw new Error("ARRAYBUFFER not supported by this environment");
      }
      return function(t2, e3, r3) {
        return function(t3, e4, r4, i3) {
          return n(new Uint8Array(t3), e4, r4, i3);
        }(t2, e3, r3, i2);
      };
    case "UINT8ARRAY":
      try {
        new Uint8Array(0);
      } catch (t2) {
        throw new Error("UINT8ARRAY not supported by this environment");
      }
      return function(t2, e3, r3) {
        return n(t2, e3, r3, i2);
      };
    default:
      throw new Error("format must be HEX, TEXT, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY");
  }
}
function r(n2, e2, r2, i2) {
  switch (n2) {
    case "HEX":
      return function(t2) {
        return function(t3, n3, e3, r3) {
          let i3, s3, o2 = "";
          const h2 = n3 / 8, u2 = e3 === -1 ? 3 : 0;
          for (i3 = 0; i3 < h2; i3 += 1)
            s3 = t3[i3 >>> 2] >>> 8 * (u2 + e3 * (i3 % 4)), o2 += "0123456789abcdef".charAt(s3 >>> 4 & 15) + "0123456789abcdef".charAt(15 & s3);
          return r3.outputUpper ? o2.toUpperCase() : o2;
        }(t2, e2, r2, i2);
      };
    case "B64":
      return function(n3) {
        return function(n4, e3, r3, i3) {
          let s3, o2, h2, u2, w2, c2 = "";
          const f2 = e3 / 8, a2 = r3 === -1 ? 3 : 0;
          for (s3 = 0; s3 < f2; s3 += 3)
            for (u2 = s3 + 1 < f2 ? n4[s3 + 1 >>> 2] : 0, w2 = s3 + 2 < f2 ? n4[s3 + 2 >>> 2] : 0, h2 = (n4[s3 >>> 2] >>> 8 * (a2 + r3 * (s3 % 4)) & 255) << 16 | (u2 >>> 8 * (a2 + r3 * ((s3 + 1) % 4)) & 255) << 8 | w2 >>> 8 * (a2 + r3 * ((s3 + 2) % 4)) & 255, o2 = 0; o2 < 4; o2 += 1)
              c2 += 8 * s3 + 6 * o2 <= e3 ? t.charAt(h2 >>> 6 * (3 - o2) & 63) : i3.b64Pad;
          return c2;
        }(n3, e2, r2, i2);
      };
    case "BYTES":
      return function(t2) {
        return function(t3, n3, e3) {
          let r3, i3, s3 = "";
          const o2 = n3 / 8, h2 = e3 === -1 ? 3 : 0;
          for (r3 = 0; r3 < o2; r3 += 1)
            i3 = t3[r3 >>> 2] >>> 8 * (h2 + e3 * (r3 % 4)) & 255, s3 += String.fromCharCode(i3);
          return s3;
        }(t2, e2, r2);
      };
    case "ARRAYBUFFER":
      try {
        new ArrayBuffer(0);
      } catch (t2) {
        throw new Error("ARRAYBUFFER not supported by this environment");
      }
      return function(t2) {
        return function(t3, n3, e3) {
          let r3;
          const i3 = n3 / 8, s3 = new ArrayBuffer(i3), o2 = new Uint8Array(s3), h2 = e3 === -1 ? 3 : 0;
          for (r3 = 0; r3 < i3; r3 += 1)
            o2[r3] = t3[r3 >>> 2] >>> 8 * (h2 + e3 * (r3 % 4)) & 255;
          return s3;
        }(t2, e2, r2);
      };
    case "UINT8ARRAY":
      try {
        new Uint8Array(0);
      } catch (t2) {
        throw new Error("UINT8ARRAY not supported by this environment");
      }
      return function(t2) {
        return function(t3, n3, e3) {
          let r3;
          const i3 = n3 / 8, s3 = e3 === -1 ? 3 : 0, o2 = new Uint8Array(i3);
          for (r3 = 0; r3 < i3; r3 += 1)
            o2[r3] = t3[r3 >>> 2] >>> 8 * (s3 + e3 * (r3 % 4)) & 255;
          return o2;
        }(t2, e2, r2);
      };
    default:
      throw new Error("format must be HEX, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY");
  }
}
function u(t2, n2) {
  let e2, r2;
  const i2 = t2.binLen >>> 3, s3 = n2.binLen >>> 3, o2 = i2 << 3, h2 = 4 - i2 << 3;
  if (i2 % 4 != 0) {
    for (e2 = 0; e2 < s3; e2 += 4)
      r2 = i2 + e2 >>> 2, t2.value[r2] |= n2.value[e2 >>> 2] << o2, t2.value.push(0), t2.value[r2 + 1] |= n2.value[e2 >>> 2] >>> h2;
    return (t2.value.length << 2) - 4 >= s3 + i2 && t2.value.pop(), { value: t2.value, binLen: t2.binLen + n2.binLen };
  }
  return { value: t2.value.concat(n2.value), binLen: t2.binLen + n2.binLen };
}
function w(t2) {
  const n2 = { outputUpper: false, b64Pad: "=", outputLen: -1 }, e2 = t2 || {}, r2 = "Output length must be a multiple of 8";
  if (n2.outputUpper = e2.outputUpper || false, e2.b64Pad && (n2.b64Pad = e2.b64Pad), e2.outputLen) {
    if (e2.outputLen % 8 != 0)
      throw new Error(r2);
    n2.outputLen = e2.outputLen;
  } else if (e2.shakeLen) {
    if (e2.shakeLen % 8 != 0)
      throw new Error(r2);
    n2.outputLen = e2.shakeLen;
  }
  if (typeof n2.outputUpper != "boolean")
    throw new Error("Invalid outputUpper formatting option");
  if (typeof n2.b64Pad != "string")
    throw new Error("Invalid b64Pad formatting option");
  return n2;
}
function c(t2, n2, r2, i2) {
  const s3 = t2 + " must include a value and format";
  if (!n2) {
    if (!i2)
      throw new Error(s3);
    return i2;
  }
  if (n2.value === void 0 || !n2.format)
    throw new Error(s3);
  return e(n2.format, n2.encoding || "UTF8", r2)(n2.value);
}
function a(t2, n2) {
  return t2 << n2 | t2 >>> 32 - n2;
}
function l(t2, n2) {
  return t2 >>> n2 | t2 << 32 - n2;
}
function A(t2, n2) {
  return t2 >>> n2;
}
function E(t2, n2, e2) {
  return t2 ^ n2 ^ e2;
}
function H(t2, n2, e2) {
  return t2 & n2 ^ ~t2 & e2;
}
function S(t2, n2, e2) {
  return t2 & n2 ^ t2 & e2 ^ n2 & e2;
}
function b(t2) {
  return l(t2, 2) ^ l(t2, 13) ^ l(t2, 22);
}
function p(t2, n2) {
  const e2 = (65535 & t2) + (65535 & n2);
  return (65535 & (t2 >>> 16) + (n2 >>> 16) + (e2 >>> 16)) << 16 | 65535 & e2;
}
function d(t2, n2, e2, r2) {
  const i2 = (65535 & t2) + (65535 & n2) + (65535 & e2) + (65535 & r2);
  return (65535 & (t2 >>> 16) + (n2 >>> 16) + (e2 >>> 16) + (r2 >>> 16) + (i2 >>> 16)) << 16 | 65535 & i2;
}
function m(t2, n2, e2, r2, i2) {
  const s3 = (65535 & t2) + (65535 & n2) + (65535 & e2) + (65535 & r2) + (65535 & i2);
  return (65535 & (t2 >>> 16) + (n2 >>> 16) + (e2 >>> 16) + (r2 >>> 16) + (i2 >>> 16) + (s3 >>> 16)) << 16 | 65535 & s3;
}
function C(t2) {
  return l(t2, 7) ^ l(t2, 18) ^ A(t2, 3);
}
function y(t2) {
  return l(t2, 6) ^ l(t2, 11) ^ l(t2, 25);
}
function R(t2) {
  return [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
}
function U(t2, n2) {
  let e2, r2, i2, s3, o2, h2, u2;
  const w2 = [];
  for (e2 = n2[0], r2 = n2[1], i2 = n2[2], s3 = n2[3], o2 = n2[4], u2 = 0; u2 < 80; u2 += 1)
    w2[u2] = u2 < 16 ? t2[u2] : a(w2[u2 - 3] ^ w2[u2 - 8] ^ w2[u2 - 14] ^ w2[u2 - 16], 1), h2 = u2 < 20 ? m(a(e2, 5), H(r2, i2, s3), o2, 1518500249, w2[u2]) : u2 < 40 ? m(a(e2, 5), E(r2, i2, s3), o2, 1859775393, w2[u2]) : u2 < 60 ? m(a(e2, 5), S(r2, i2, s3), o2, 2400959708, w2[u2]) : m(a(e2, 5), E(r2, i2, s3), o2, 3395469782, w2[u2]), o2 = s3, s3 = i2, i2 = a(r2, 30), r2 = e2, e2 = h2;
  return n2[0] = p(e2, n2[0]), n2[1] = p(r2, n2[1]), n2[2] = p(i2, n2[2]), n2[3] = p(s3, n2[3]), n2[4] = p(o2, n2[4]), n2;
}
function v(t2, n2, e2, r2) {
  let i2;
  const s3 = 15 + (n2 + 65 >>> 9 << 4), o2 = n2 + e2;
  for (; t2.length <= s3; )
    t2.push(0);
  for (t2[n2 >>> 5] |= 128 << 24 - n2 % 32, t2[s3] = 4294967295 & o2, t2[s3 - 1] = o2 / 4294967296 | 0, i2 = 0; i2 < t2.length; i2 += 16)
    r2 = U(t2.slice(i2, i2 + 16), r2);
  return r2;
}
function T(t2) {
  let n2;
  return n2 = t2 == "SHA-224" ? s.slice() : o.slice(), n2;
}
function F(t2, n2) {
  let e2, r2, s3, o2, h2, u2, w2, c2, f2, a2, E2;
  const R2 = [];
  for (e2 = n2[0], r2 = n2[1], s3 = n2[2], o2 = n2[3], h2 = n2[4], u2 = n2[5], w2 = n2[6], c2 = n2[7], E2 = 0; E2 < 64; E2 += 1)
    R2[E2] = E2 < 16 ? t2[E2] : d(l(U2 = R2[E2 - 2], 17) ^ l(U2, 19) ^ A(U2, 10), R2[E2 - 7], C(R2[E2 - 15]), R2[E2 - 16]), f2 = m(c2, y(h2), H(h2, u2, w2), i[E2], R2[E2]), a2 = p(b(e2), S(e2, r2, s3)), c2 = w2, w2 = u2, u2 = h2, h2 = p(o2, f2), o2 = s3, s3 = r2, r2 = e2, e2 = p(f2, a2);
  var U2;
  return n2[0] = p(e2, n2[0]), n2[1] = p(r2, n2[1]), n2[2] = p(s3, n2[2]), n2[3] = p(o2, n2[3]), n2[4] = p(h2, n2[4]), n2[5] = p(u2, n2[5]), n2[6] = p(w2, n2[6]), n2[7] = p(c2, n2[7]), n2;
}
function L(t2, n2) {
  let e2;
  return n2 > 32 ? (e2 = 64 - n2, new B(t2.N << n2 | t2.Y >>> e2, t2.Y << n2 | t2.N >>> e2)) : n2 !== 0 ? (e2 = 32 - n2, new B(t2.Y << n2 | t2.N >>> e2, t2.N << n2 | t2.Y >>> e2)) : t2;
}
function M(t2, n2) {
  let e2;
  return n2 < 32 ? (e2 = 32 - n2, new B(t2.Y >>> n2 | t2.N << e2, t2.N >>> n2 | t2.Y << e2)) : (e2 = 64 - n2, new B(t2.N >>> n2 | t2.Y << e2, t2.Y >>> n2 | t2.N << e2));
}
function k(t2, n2) {
  return new B(t2.Y >>> n2, t2.N >>> n2 | t2.Y << 32 - n2);
}
function Y(t2, n2, e2) {
  return new B(t2.Y & n2.Y ^ t2.Y & e2.Y ^ n2.Y & e2.Y, t2.N & n2.N ^ t2.N & e2.N ^ n2.N & e2.N);
}
function N(t2) {
  const n2 = M(t2, 28), e2 = M(t2, 34), r2 = M(t2, 39);
  return new B(n2.Y ^ e2.Y ^ r2.Y, n2.N ^ e2.N ^ r2.N);
}
function I(t2, n2) {
  let e2, r2;
  e2 = (65535 & t2.N) + (65535 & n2.N), r2 = (t2.N >>> 16) + (n2.N >>> 16) + (e2 >>> 16);
  const i2 = (65535 & r2) << 16 | 65535 & e2;
  e2 = (65535 & t2.Y) + (65535 & n2.Y) + (r2 >>> 16), r2 = (t2.Y >>> 16) + (n2.Y >>> 16) + (e2 >>> 16);
  return new B((65535 & r2) << 16 | 65535 & e2, i2);
}
function X(t2, n2, e2, r2) {
  let i2, s3;
  i2 = (65535 & t2.N) + (65535 & n2.N) + (65535 & e2.N) + (65535 & r2.N), s3 = (t2.N >>> 16) + (n2.N >>> 16) + (e2.N >>> 16) + (r2.N >>> 16) + (i2 >>> 16);
  const o2 = (65535 & s3) << 16 | 65535 & i2;
  i2 = (65535 & t2.Y) + (65535 & n2.Y) + (65535 & e2.Y) + (65535 & r2.Y) + (s3 >>> 16), s3 = (t2.Y >>> 16) + (n2.Y >>> 16) + (e2.Y >>> 16) + (r2.Y >>> 16) + (i2 >>> 16);
  return new B((65535 & s3) << 16 | 65535 & i2, o2);
}
function z(t2, n2, e2, r2, i2) {
  let s3, o2;
  s3 = (65535 & t2.N) + (65535 & n2.N) + (65535 & e2.N) + (65535 & r2.N) + (65535 & i2.N), o2 = (t2.N >>> 16) + (n2.N >>> 16) + (e2.N >>> 16) + (r2.N >>> 16) + (i2.N >>> 16) + (s3 >>> 16);
  const h2 = (65535 & o2) << 16 | 65535 & s3;
  s3 = (65535 & t2.Y) + (65535 & n2.Y) + (65535 & e2.Y) + (65535 & r2.Y) + (65535 & i2.Y) + (o2 >>> 16), o2 = (t2.Y >>> 16) + (n2.Y >>> 16) + (e2.Y >>> 16) + (r2.Y >>> 16) + (i2.Y >>> 16) + (s3 >>> 16);
  return new B((65535 & o2) << 16 | 65535 & s3, h2);
}
function x(t2, n2) {
  return new B(t2.Y ^ n2.Y, t2.N ^ n2.N);
}
function _(t2) {
  const n2 = M(t2, 19), e2 = M(t2, 61), r2 = k(t2, 6);
  return new B(n2.Y ^ e2.Y ^ r2.Y, n2.N ^ e2.N ^ r2.N);
}
function O(t2) {
  const n2 = M(t2, 1), e2 = M(t2, 8), r2 = k(t2, 7);
  return new B(n2.Y ^ e2.Y ^ r2.Y, n2.N ^ e2.N ^ r2.N);
}
function P(t2) {
  const n2 = M(t2, 14), e2 = M(t2, 18), r2 = M(t2, 41);
  return new B(n2.Y ^ e2.Y ^ r2.Y, n2.N ^ e2.N ^ r2.N);
}
function Z(t2) {
  return t2 === "SHA-384" ? [new B(3418070365, s[0]), new B(1654270250, s[1]), new B(2438529370, s[2]), new B(355462360, s[3]), new B(1731405415, s[4]), new B(41048885895, s[5]), new B(3675008525, s[6]), new B(1203062813, s[7])] : [new B(o[0], 4089235720), new B(o[1], 2227873595), new B(o[2], 4271175723), new B(o[3], 1595750129), new B(o[4], 2917565137), new B(o[5], 725511199), new B(o[6], 4215389547), new B(o[7], 327033209)];
}
function j(t2, n2) {
  let e2, r2, i2, s3, o2, h2, u2, w2, c2, f2, a2, l2;
  const A2 = [];
  for (e2 = n2[0], r2 = n2[1], i2 = n2[2], s3 = n2[3], o2 = n2[4], h2 = n2[5], u2 = n2[6], w2 = n2[7], a2 = 0; a2 < 80; a2 += 1)
    a2 < 16 ? (l2 = 2 * a2, A2[a2] = new B(t2[l2], t2[l2 + 1])) : A2[a2] = X(_(A2[a2 - 2]), A2[a2 - 7], O(A2[a2 - 15]), A2[a2 - 16]), c2 = z(w2, P(o2), (H2 = h2, S2 = u2, new B((E2 = o2).Y & H2.Y ^ ~E2.Y & S2.Y, E2.N & H2.N ^ ~E2.N & S2.N)), V[a2], A2[a2]), f2 = I(N(e2), Y(e2, r2, i2)), w2 = u2, u2 = h2, h2 = o2, o2 = I(s3, c2), s3 = i2, i2 = r2, r2 = e2, e2 = I(c2, f2);
  var E2, H2, S2;
  return n2[0] = I(e2, n2[0]), n2[1] = I(r2, n2[1]), n2[2] = I(i2, n2[2]), n2[3] = I(s3, n2[3]), n2[4] = I(o2, n2[4]), n2[5] = I(h2, n2[5]), n2[6] = I(u2, n2[6]), n2[7] = I(w2, n2[7]), n2;
}
function J(t2) {
  let n2;
  const e2 = [];
  for (n2 = 0; n2 < 5; n2 += 1)
    e2[n2] = [new B(0, 0), new B(0, 0), new B(0, 0), new B(0, 0), new B(0, 0)];
  return e2;
}
function Q(t2) {
  let n2;
  const e2 = [];
  for (n2 = 0; n2 < 5; n2 += 1)
    e2[n2] = t2[n2].slice();
  return e2;
}
function W(t2, n2) {
  let e2, r2, i2, s3;
  const o2 = [], h2 = [];
  if (t2 !== null)
    for (r2 = 0; r2 < t2.length; r2 += 2)
      n2[(r2 >>> 1) % 5][(r2 >>> 1) / 5 | 0] = x(n2[(r2 >>> 1) % 5][(r2 >>> 1) / 5 | 0], new B(t2[r2 + 1], t2[r2]));
  for (e2 = 0; e2 < 24; e2 += 1) {
    for (s3 = J(), r2 = 0; r2 < 5; r2 += 1)
      o2[r2] = (u2 = n2[r2][0], w2 = n2[r2][1], c2 = n2[r2][2], f2 = n2[r2][3], a2 = n2[r2][4], new B(u2.Y ^ w2.Y ^ c2.Y ^ f2.Y ^ a2.Y, u2.N ^ w2.N ^ c2.N ^ f2.N ^ a2.N));
    for (r2 = 0; r2 < 5; r2 += 1)
      h2[r2] = x(o2[(r2 + 4) % 5], L(o2[(r2 + 1) % 5], 1));
    for (r2 = 0; r2 < 5; r2 += 1)
      for (i2 = 0; i2 < 5; i2 += 1)
        n2[r2][i2] = x(n2[r2][i2], h2[r2]);
    for (r2 = 0; r2 < 5; r2 += 1)
      for (i2 = 0; i2 < 5; i2 += 1)
        s3[i2][(2 * r2 + 3 * i2) % 5] = L(n2[r2][i2], G[r2][i2]);
    for (r2 = 0; r2 < 5; r2 += 1)
      for (i2 = 0; i2 < 5; i2 += 1)
        n2[r2][i2] = x(s3[r2][i2], new B(~s3[(r2 + 1) % 5][i2].Y & s3[(r2 + 2) % 5][i2].Y, ~s3[(r2 + 1) % 5][i2].N & s3[(r2 + 2) % 5][i2].N));
    n2[0][0] = x(n2[0][0], D[e2]);
  }
  var u2, w2, c2, f2, a2;
  return n2;
}
function $(t2) {
  let n2, e2, r2 = 0;
  const i2 = [0, 0], s3 = [4294967295 & t2, t2 / 4294967296 & 2097151];
  for (n2 = 6; n2 >= 0; n2--)
    e2 = s3[n2 >> 2] >>> 8 * n2 & 255, e2 === 0 && r2 === 0 || (i2[r2 + 1 >> 2] |= e2 << 8 * (r2 + 1), r2 += 1);
  return r2 = r2 !== 0 ? r2 : 1, i2[0] |= r2, { value: r2 + 1 > 4 ? i2 : [i2[0]], binLen: 8 + 8 * r2 };
}
function tt(t2) {
  return u($(t2.binLen), t2);
}
function nt(t2, n2) {
  let e2, r2 = $(n2);
  r2 = u(r2, t2);
  const i2 = n2 >>> 2, s3 = (i2 - r2.value.length % i2) % i2;
  for (e2 = 0; e2 < s3; e2++)
    r2.value.push(0);
  return r2.value;
}
var t, i, s, o, h, f, K, g, B, V, q, D, G, et, sha_default;
var init_sha = __esm({
  "node_modules/jssha/dist/sha.mjs"() {
    init_shims();
    t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    i = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
    s = [3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428];
    o = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
    h = "Chosen SHA variant is not supported";
    f = class {
      constructor(t2, n2, e2) {
        const r2 = e2 || {};
        if (this.t = n2, this.i = r2.encoding || "UTF8", this.numRounds = r2.numRounds || 1, isNaN(this.numRounds) || this.numRounds !== parseInt(this.numRounds, 10) || 1 > this.numRounds)
          throw new Error("numRounds must a integer >= 1");
        this.s = t2, this.o = [], this.h = 0, this.u = false, this.l = 0, this.A = false, this.H = [], this.S = [];
      }
      update(t2) {
        let n2, e2 = 0;
        const r2 = this.p >>> 5, i2 = this.m(t2, this.o, this.h), s3 = i2.binLen, o2 = i2.value, h2 = s3 >>> 5;
        for (n2 = 0; n2 < h2; n2 += r2)
          e2 + this.p <= s3 && (this.C = this.R(o2.slice(n2, n2 + r2), this.C), e2 += this.p);
        this.l += e2, this.o = o2.slice(e2 >>> 5), this.h = s3 % this.p, this.u = true;
      }
      getHash(t2, n2) {
        let e2, i2, s3 = this.U;
        const o2 = w(n2);
        if (this.v) {
          if (o2.outputLen === -1)
            throw new Error("Output length must be specified in options");
          s3 = o2.outputLen;
        }
        const h2 = r(t2, s3, this.K, o2);
        if (this.A && this.T)
          return h2(this.T(o2));
        for (i2 = this.F(this.o.slice(), this.h, this.l, this.g(this.C), s3), e2 = 1; e2 < this.numRounds; e2 += 1)
          this.v && s3 % 32 != 0 && (i2[i2.length - 1] &= 16777215 >>> 24 - s3 % 32), i2 = this.F(i2, s3, 0, this.B(this.s), s3);
        return h2(i2);
      }
      setHMACKey(t2, n2, r2) {
        if (!this.L)
          throw new Error("Variant does not support HMAC");
        if (this.u)
          throw new Error("Cannot set MAC key after calling update");
        const i2 = e(n2, (r2 || {}).encoding || "UTF8", this.K);
        this.M(i2(t2));
      }
      M(t2) {
        const n2 = this.p >>> 3, e2 = n2 / 4 - 1;
        let r2;
        if (this.numRounds !== 1)
          throw new Error("Cannot set numRounds with MAC");
        if (this.A)
          throw new Error("MAC key already set");
        for (n2 < t2.binLen / 8 && (t2.value = this.F(t2.value, t2.binLen, 0, this.B(this.s), this.U)); t2.value.length <= e2; )
          t2.value.push(0);
        for (r2 = 0; r2 <= e2; r2 += 1)
          this.H[r2] = 909522486 ^ t2.value[r2], this.S[r2] = 1549556828 ^ t2.value[r2];
        this.C = this.R(this.H, this.C), this.l = this.p, this.A = true;
      }
      getHMAC(t2, n2) {
        const e2 = w(n2);
        return r(t2, this.U, this.K, e2)(this.k());
      }
      k() {
        let t2;
        if (!this.A)
          throw new Error("Cannot call getHMAC without first setting MAC key");
        const n2 = this.F(this.o.slice(), this.h, this.l, this.g(this.C), this.U);
        return t2 = this.R(this.S, this.B(this.s)), t2 = this.F(n2, this.U, this.p, t2, this.U), t2;
      }
    };
    K = class extends f {
      constructor(t2, n2, r2) {
        if (t2 !== "SHA-1")
          throw new Error(h);
        super(t2, n2, r2);
        const i2 = r2 || {};
        this.L = true, this.T = this.k, this.K = -1, this.m = e(this.t, this.i, this.K), this.R = U, this.g = function(t3) {
          return t3.slice();
        }, this.B = R, this.F = v, this.C = [1732584193, 4023233417, 2562383102, 271733878, 3285377520], this.p = 512, this.U = 160, this.v = false, i2.hmacKey && this.M(c("hmacKey", i2.hmacKey, this.K));
      }
    };
    g = class extends f {
      constructor(t2, n2, r2) {
        if (t2 !== "SHA-224" && t2 !== "SHA-256")
          throw new Error(h);
        super(t2, n2, r2);
        const i2 = r2 || {};
        this.T = this.k, this.L = true, this.K = -1, this.m = e(this.t, this.i, this.K), this.R = F, this.g = function(t3) {
          return t3.slice();
        }, this.B = T, this.F = function(n3, e2, r3, i3) {
          return function(t3, n4, e3, r4, i4) {
            let s3, o2;
            const h2 = 15 + (n4 + 65 >>> 9 << 4), u2 = n4 + e3;
            for (; t3.length <= h2; )
              t3.push(0);
            for (t3[n4 >>> 5] |= 128 << 24 - n4 % 32, t3[h2] = 4294967295 & u2, t3[h2 - 1] = u2 / 4294967296 | 0, s3 = 0; s3 < t3.length; s3 += 16)
              r4 = F(t3.slice(s3, s3 + 16), r4);
            return o2 = i4 === "SHA-224" ? [r4[0], r4[1], r4[2], r4[3], r4[4], r4[5], r4[6]] : r4, o2;
          }(n3, e2, r3, i3, t2);
        }, this.C = T(t2), this.p = 512, this.U = t2 === "SHA-224" ? 224 : 256, this.v = false, i2.hmacKey && this.M(c("hmacKey", i2.hmacKey, this.K));
      }
    };
    B = class {
      constructor(t2, n2) {
        this.Y = t2, this.N = n2;
      }
    };
    V = [new B(i[0], 3609767458), new B(i[1], 602891725), new B(i[2], 3964484399), new B(i[3], 2173295548), new B(i[4], 4081628472), new B(i[5], 3053834265), new B(i[6], 2937671579), new B(i[7], 3664609560), new B(i[8], 2734883394), new B(i[9], 1164996542), new B(i[10], 1323610764), new B(i[11], 3590304994), new B(i[12], 4068182383), new B(i[13], 991336113), new B(i[14], 633803317), new B(i[15], 3479774868), new B(i[16], 2666613458), new B(i[17], 944711139), new B(i[18], 2341262773), new B(i[19], 2007800933), new B(i[20], 1495990901), new B(i[21], 1856431235), new B(i[22], 3175218132), new B(i[23], 2198950837), new B(i[24], 3999719339), new B(i[25], 766784016), new B(i[26], 2566594879), new B(i[27], 3203337956), new B(i[28], 1034457026), new B(i[29], 2466948901), new B(i[30], 3758326383), new B(i[31], 168717936), new B(i[32], 1188179964), new B(i[33], 1546045734), new B(i[34], 1522805485), new B(i[35], 2643833823), new B(i[36], 2343527390), new B(i[37], 1014477480), new B(i[38], 1206759142), new B(i[39], 344077627), new B(i[40], 1290863460), new B(i[41], 3158454273), new B(i[42], 3505952657), new B(i[43], 106217008), new B(i[44], 3606008344), new B(i[45], 1432725776), new B(i[46], 1467031594), new B(i[47], 851169720), new B(i[48], 3100823752), new B(i[49], 1363258195), new B(i[50], 3750685593), new B(i[51], 3785050280), new B(i[52], 3318307427), new B(i[53], 3812723403), new B(i[54], 2003034995), new B(i[55], 3602036899), new B(i[56], 1575990012), new B(i[57], 1125592928), new B(i[58], 2716904306), new B(i[59], 442776044), new B(i[60], 593698344), new B(i[61], 3733110249), new B(i[62], 2999351573), new B(i[63], 3815920427), new B(3391569614, 3928383900), new B(3515267271, 566280711), new B(3940187606, 3454069534), new B(4118630271, 4000239992), new B(116418474, 1914138554), new B(174292421, 2731055270), new B(289380356, 3203993006), new B(460393269, 320620315), new B(685471733, 587496836), new B(852142971, 1086792851), new B(1017036298, 365543100), new B(1126000580, 2618297676), new B(1288033470, 3409855158), new B(1501505948, 4234509866), new B(1607167915, 987167468), new B(1816402316, 1246189591)];
    q = class extends f {
      constructor(t2, n2, r2) {
        if (t2 !== "SHA-384" && t2 !== "SHA-512")
          throw new Error(h);
        super(t2, n2, r2);
        const i2 = r2 || {};
        this.T = this.k, this.L = true, this.K = -1, this.m = e(this.t, this.i, this.K), this.R = j, this.g = function(t3) {
          return t3.slice();
        }, this.B = Z, this.F = function(n3, e2, r3, i3) {
          return function(t3, n4, e3, r4, i4) {
            let s3, o2;
            const h2 = 31 + (n4 + 129 >>> 10 << 5), u2 = n4 + e3;
            for (; t3.length <= h2; )
              t3.push(0);
            for (t3[n4 >>> 5] |= 128 << 24 - n4 % 32, t3[h2] = 4294967295 & u2, t3[h2 - 1] = u2 / 4294967296 | 0, s3 = 0; s3 < t3.length; s3 += 32)
              r4 = j(t3.slice(s3, s3 + 32), r4);
            return o2 = i4 === "SHA-384" ? [(r4 = r4)[0].Y, r4[0].N, r4[1].Y, r4[1].N, r4[2].Y, r4[2].N, r4[3].Y, r4[3].N, r4[4].Y, r4[4].N, r4[5].Y, r4[5].N] : [r4[0].Y, r4[0].N, r4[1].Y, r4[1].N, r4[2].Y, r4[2].N, r4[3].Y, r4[3].N, r4[4].Y, r4[4].N, r4[5].Y, r4[5].N, r4[6].Y, r4[6].N, r4[7].Y, r4[7].N], o2;
          }(n3, e2, r3, i3, t2);
        }, this.C = Z(t2), this.p = 1024, this.U = t2 === "SHA-384" ? 384 : 512, this.v = false, i2.hmacKey && this.M(c("hmacKey", i2.hmacKey, this.K));
      }
    };
    D = [new B(0, 1), new B(0, 32898), new B(2147483648, 32906), new B(2147483648, 2147516416), new B(0, 32907), new B(0, 2147483649), new B(2147483648, 2147516545), new B(2147483648, 32777), new B(0, 138), new B(0, 136), new B(0, 2147516425), new B(0, 2147483658), new B(0, 2147516555), new B(2147483648, 139), new B(2147483648, 32905), new B(2147483648, 32771), new B(2147483648, 32770), new B(2147483648, 128), new B(0, 32778), new B(2147483648, 2147483658), new B(2147483648, 2147516545), new B(2147483648, 32896), new B(0, 2147483649), new B(2147483648, 2147516424)];
    G = [[0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61], [28, 55, 25, 21, 56], [27, 20, 39, 8, 14]];
    et = class extends f {
      constructor(t2, n2, r2) {
        let i2 = 6, s3 = 0;
        super(t2, n2, r2);
        const o2 = r2 || {};
        if (this.numRounds !== 1) {
          if (o2.kmacKey || o2.hmacKey)
            throw new Error("Cannot set numRounds with MAC");
          if (this.s === "CSHAKE128" || this.s === "CSHAKE256")
            throw new Error("Cannot set numRounds for CSHAKE variants");
        }
        switch (this.K = 1, this.m = e(this.t, this.i, this.K), this.R = W, this.g = Q, this.B = J, this.C = J(), this.v = false, t2) {
          case "SHA3-224":
            this.p = s3 = 1152, this.U = 224, this.L = true, this.T = this.k;
            break;
          case "SHA3-256":
            this.p = s3 = 1088, this.U = 256, this.L = true, this.T = this.k;
            break;
          case "SHA3-384":
            this.p = s3 = 832, this.U = 384, this.L = true, this.T = this.k;
            break;
          case "SHA3-512":
            this.p = s3 = 576, this.U = 512, this.L = true, this.T = this.k;
            break;
          case "SHAKE128":
            i2 = 31, this.p = s3 = 1344, this.U = -1, this.v = true, this.L = false, this.T = null;
            break;
          case "SHAKE256":
            i2 = 31, this.p = s3 = 1088, this.U = -1, this.v = true, this.L = false, this.T = null;
            break;
          case "KMAC128":
            i2 = 4, this.p = s3 = 1344, this.I(r2), this.U = -1, this.v = true, this.L = false, this.T = this.X;
            break;
          case "KMAC256":
            i2 = 4, this.p = s3 = 1088, this.I(r2), this.U = -1, this.v = true, this.L = false, this.T = this.X;
            break;
          case "CSHAKE128":
            this.p = s3 = 1344, i2 = this._(r2), this.U = -1, this.v = true, this.L = false, this.T = null;
            break;
          case "CSHAKE256":
            this.p = s3 = 1088, i2 = this._(r2), this.U = -1, this.v = true, this.L = false, this.T = null;
            break;
          default:
            throw new Error(h);
        }
        this.F = function(t3, n3, e2, r3, o3) {
          return function(t4, n4, e3, r4, i3, s4, o4) {
            let h2, u2, w2 = 0;
            const c2 = [], f2 = i3 >>> 5, a2 = n4 >>> 5;
            for (h2 = 0; h2 < a2 && n4 >= i3; h2 += f2)
              r4 = W(t4.slice(h2, h2 + f2), r4), n4 -= i3;
            for (t4 = t4.slice(h2), n4 %= i3; t4.length < f2; )
              t4.push(0);
            for (h2 = n4 >>> 3, t4[h2 >> 2] ^= s4 << h2 % 4 * 8, t4[f2 - 1] ^= 2147483648, r4 = W(t4, r4); 32 * c2.length < o4 && (u2 = r4[w2 % 5][w2 / 5 | 0], c2.push(u2.N), !(32 * c2.length >= o4)); )
              c2.push(u2.Y), w2 += 1, 64 * w2 % i3 == 0 && (W(null, r4), w2 = 0);
            return c2;
          }(t3, n3, 0, r3, s3, i2, o3);
        }, o2.hmacKey && this.M(c("hmacKey", o2.hmacKey, this.K));
      }
      _(t2, n2) {
        const e2 = function(t3) {
          const n3 = t3 || {};
          return { funcName: c("funcName", n3.funcName, 1, { value: [], binLen: 0 }), customization: c("Customization", n3.customization, 1, { value: [], binLen: 0 }) };
        }(t2 || {});
        n2 && (e2.funcName = n2);
        const r2 = u(tt(e2.funcName), tt(e2.customization));
        if (e2.customization.binLen !== 0 || e2.funcName.binLen !== 0) {
          const t3 = nt(r2, this.p >>> 3);
          for (let n3 = 0; n3 < t3.length; n3 += this.p >>> 5)
            this.C = this.R(t3.slice(n3, n3 + (this.p >>> 5)), this.C), this.l += this.p;
          return 4;
        }
        return 31;
      }
      I(t2) {
        const n2 = function(t3) {
          const n3 = t3 || {};
          return { kmacKey: c("kmacKey", n3.kmacKey, 1), funcName: { value: [1128353099], binLen: 32 }, customization: c("Customization", n3.customization, 1, { value: [], binLen: 0 }) };
        }(t2 || {});
        this._(t2, n2.funcName);
        const e2 = nt(tt(n2.kmacKey), this.p >>> 3);
        for (let t3 = 0; t3 < e2.length; t3 += this.p >>> 5)
          this.C = this.R(e2.slice(t3, t3 + (this.p >>> 5)), this.C), this.l += this.p;
        this.A = true;
      }
      X(t2) {
        const n2 = u({ value: this.o.slice(), binLen: this.h }, function(t3) {
          let n3, e2, r2 = 0;
          const i2 = [0, 0], s3 = [4294967295 & t3, t3 / 4294967296 & 2097151];
          for (n3 = 6; n3 >= 0; n3--)
            e2 = s3[n3 >> 2] >>> 8 * n3 & 255, e2 === 0 && r2 === 0 || (i2[r2 >> 2] |= e2 << 8 * r2, r2 += 1);
          return r2 = r2 !== 0 ? r2 : 1, i2[r2 >> 2] |= r2 << 8 * r2, { value: r2 + 1 > 4 ? i2 : [i2[0]], binLen: 8 + 8 * r2 };
        }(t2.outputLen));
        return this.F(n2.value, n2.binLen, this.l, this.g(this.C), t2.outputLen);
      }
    };
    sha_default = class {
      constructor(t2, n2, e2) {
        if (t2 == "SHA-1")
          this.O = new K(t2, n2, e2);
        else if (t2 == "SHA-224" || t2 == "SHA-256")
          this.O = new g(t2, n2, e2);
        else if (t2 == "SHA-384" || t2 == "SHA-512")
          this.O = new q(t2, n2, e2);
        else {
          if (t2 != "SHA3-224" && t2 != "SHA3-256" && t2 != "SHA3-384" && t2 != "SHA3-512" && t2 != "SHAKE128" && t2 != "SHAKE256" && t2 != "CSHAKE128" && t2 != "CSHAKE256" && t2 != "KMAC128" && t2 != "KMAC256")
            throw new Error(h);
          this.O = new et(t2, n2, e2);
        }
      }
      update(t2) {
        this.O.update(t2);
      }
      getHash(t2, n2) {
        return this.O.getHash(t2, n2);
      }
      setHMACKey(t2, n2, e2) {
        this.O.setHMACKey(t2, n2, e2);
      }
      getHMAC(t2, n2) {
        return this.O.getHMAC(t2, n2);
      }
    };
  }
});

// node_modules/axios/lib/helpers/bind.js
var require_bind = __commonJS({
  "node_modules/axios/lib/helpers/bind.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i2 = 0; i2 < args.length; i2++) {
          args[i2] = arguments[i2];
        }
        return fn.apply(thisArg, args);
      };
    };
  }
});

// node_modules/axios/lib/utils.js
var require_utils = __commonJS({
  "node_modules/axios/lib/utils.js"(exports, module2) {
    init_shims();
    "use strict";
    var bind = require_bind();
    var toString = Object.prototype.toString;
    function isArray(val) {
      return toString.call(val) === "[object Array]";
    }
    function isUndefined(val) {
      return typeof val === "undefined";
    }
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && typeof val.constructor.isBuffer === "function" && val.constructor.isBuffer(val);
    }
    function isArrayBuffer(val) {
      return toString.call(val) === "[object ArrayBuffer]";
    }
    function isFormData2(val) {
      return typeof FormData !== "undefined" && val instanceof FormData;
    }
    function isArrayBufferView(val) {
      var result;
      if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
        result = ArrayBuffer.isView(val);
      } else {
        result = val && val.buffer && val.buffer instanceof ArrayBuffer;
      }
      return result;
    }
    function isString(val) {
      return typeof val === "string";
    }
    function isNumber(val) {
      return typeof val === "number";
    }
    function isObject(val) {
      return val !== null && typeof val === "object";
    }
    function isPlainObject(val) {
      if (toString.call(val) !== "[object Object]") {
        return false;
      }
      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }
    function isDate(val) {
      return toString.call(val) === "[object Date]";
    }
    function isFile(val) {
      return toString.call(val) === "[object File]";
    }
    function isBlob2(val) {
      return toString.call(val) === "[object Blob]";
    }
    function isFunction(val) {
      return toString.call(val) === "[object Function]";
    }
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== "undefined" && val instanceof URLSearchParams;
    }
    function trim(str) {
      return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
    }
    function isStandardBrowserEnv() {
      if (typeof navigator !== "undefined" && (navigator.product === "ReactNative" || navigator.product === "NativeScript" || navigator.product === "NS")) {
        return false;
      }
      return typeof window !== "undefined" && typeof document !== "undefined";
    }
    function forEach(obj, fn) {
      if (obj === null || typeof obj === "undefined") {
        return;
      }
      if (typeof obj !== "object") {
        obj = [obj];
      }
      if (isArray(obj)) {
        for (var i2 = 0, l2 = obj.length; i2 < l2; i2++) {
          fn.call(null, obj[i2], i2, obj);
        }
      } else {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }
    function merge() {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }
      for (var i2 = 0, l2 = arguments.length; i2 < l2; i2++) {
        forEach(arguments[i2], assignValue);
      }
      return result;
    }
    function extend(a2, b2, thisArg) {
      forEach(b2, function assignValue(val, key) {
        if (thisArg && typeof val === "function") {
          a2[key] = bind(val, thisArg);
        } else {
          a2[key] = val;
        }
      });
      return a2;
    }
    function stripBOM(content) {
      if (content.charCodeAt(0) === 65279) {
        content = content.slice(1);
      }
      return content;
    }
    module2.exports = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData: isFormData2,
      isArrayBufferView,
      isString,
      isNumber,
      isObject,
      isPlainObject,
      isUndefined,
      isDate,
      isFile,
      isBlob: isBlob2,
      isFunction,
      isStream,
      isURLSearchParams,
      isStandardBrowserEnv,
      forEach,
      merge,
      extend,
      trim,
      stripBOM
    };
  }
});

// node_modules/axios/lib/helpers/buildURL.js
var require_buildURL = __commonJS({
  "node_modules/axios/lib/helpers/buildURL.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    function encode(val) {
      return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
    }
    module2.exports = function buildURL(url, params, paramsSerializer) {
      if (!params) {
        return url;
      }
      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];
        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === "undefined") {
            return;
          }
          if (utils.isArray(val)) {
            key = key + "[]";
          } else {
            val = [val];
          }
          utils.forEach(val, function parseValue(v2) {
            if (utils.isDate(v2)) {
              v2 = v2.toISOString();
            } else if (utils.isObject(v2)) {
              v2 = JSON.stringify(v2);
            }
            parts.push(encode(key) + "=" + encode(v2));
          });
        });
        serializedParams = parts.join("&");
      }
      if (serializedParams) {
        var hashmarkIndex = url.indexOf("#");
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }
        url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
      }
      return url;
    };
  }
});

// node_modules/axios/lib/core/InterceptorManager.js
var require_InterceptorManager = __commonJS({
  "node_modules/axios/lib/core/InterceptorManager.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    function InterceptorManager() {
      this.handlers = [];
    }
    InterceptorManager.prototype.use = function use(fulfilled, rejected, options2) {
      this.handlers.push({
        fulfilled,
        rejected,
        synchronous: options2 ? options2.synchronous : false,
        runWhen: options2 ? options2.runWhen : null
      });
      return this.handlers.length - 1;
    };
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h2) {
        if (h2 !== null) {
          fn(h2);
        }
      });
    };
    module2.exports = InterceptorManager;
  }
});

// node_modules/axios/lib/helpers/normalizeHeaderName.js
var require_normalizeHeaderName = __commonJS({
  "node_modules/axios/lib/helpers/normalizeHeaderName.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };
  }
});

// node_modules/axios/lib/core/enhanceError.js
var require_enhanceError = __commonJS({
  "node_modules/axios/lib/core/enhanceError.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function enhanceError(error2, config, code, request, response) {
      error2.config = config;
      if (code) {
        error2.code = code;
      }
      error2.request = request;
      error2.response = response;
      error2.isAxiosError = true;
      error2.toJSON = function toJSON() {
        return {
          message: this.message,
          name: this.name,
          description: this.description,
          number: this.number,
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          config: this.config,
          code: this.code,
          status: this.response && this.response.status ? this.response.status : null
        };
      };
      return error2;
    };
  }
});

// node_modules/axios/lib/core/createError.js
var require_createError = __commonJS({
  "node_modules/axios/lib/core/createError.js"(exports, module2) {
    init_shims();
    "use strict";
    var enhanceError = require_enhanceError();
    module2.exports = function createError(message, config, code, request, response) {
      var error2 = new Error(message);
      return enhanceError(error2, config, code, request, response);
    };
  }
});

// node_modules/axios/lib/core/settle.js
var require_settle = __commonJS({
  "node_modules/axios/lib/core/settle.js"(exports, module2) {
    init_shims();
    "use strict";
    var createError = require_createError();
    module2.exports = function settle(resolve2, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve2(response);
      } else {
        reject(createError("Request failed with status code " + response.status, response.config, null, response.request, response));
      }
    };
  }
});

// node_modules/axios/lib/helpers/cookies.js
var require_cookies = __commonJS({
  "node_modules/axios/lib/helpers/cookies.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = utils.isStandardBrowserEnv() ? function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + "=" + encodeURIComponent(value));
          if (utils.isNumber(expires)) {
            cookie.push("expires=" + new Date(expires).toGMTString());
          }
          if (utils.isString(path)) {
            cookie.push("path=" + path);
          }
          if (utils.isString(domain)) {
            cookie.push("domain=" + domain);
          }
          if (secure === true) {
            cookie.push("secure");
          }
          document.cookie = cookie.join("; ");
        },
        read: function read(name) {
          var match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
          return match ? decodeURIComponent(match[3]) : null;
        },
        remove: function remove(name) {
          this.write(name, "", Date.now() - 864e5);
        }
      };
    }() : function nonStandardBrowserEnv() {
      return {
        write: function write() {
        },
        read: function read() {
          return null;
        },
        remove: function remove() {
        }
      };
    }();
  }
});

// node_modules/axios/lib/helpers/isAbsoluteURL.js
var require_isAbsoluteURL = __commonJS({
  "node_modules/axios/lib/helpers/isAbsoluteURL.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function isAbsoluteURL(url) {
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };
  }
});

// node_modules/axios/lib/helpers/combineURLs.js
var require_combineURLs = __commonJS({
  "node_modules/axios/lib/helpers/combineURLs.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function combineURLs(baseURL, relativeURL) {
      return relativeURL ? baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
    };
  }
});

// node_modules/axios/lib/core/buildFullPath.js
var require_buildFullPath = __commonJS({
  "node_modules/axios/lib/core/buildFullPath.js"(exports, module2) {
    init_shims();
    "use strict";
    var isAbsoluteURL = require_isAbsoluteURL();
    var combineURLs = require_combineURLs();
    module2.exports = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };
  }
});

// node_modules/axios/lib/helpers/parseHeaders.js
var require_parseHeaders = __commonJS({
  "node_modules/axios/lib/helpers/parseHeaders.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var ignoreDuplicateOf = [
      "age",
      "authorization",
      "content-length",
      "content-type",
      "etag",
      "expires",
      "from",
      "host",
      "if-modified-since",
      "if-unmodified-since",
      "last-modified",
      "location",
      "max-forwards",
      "proxy-authorization",
      "referer",
      "retry-after",
      "user-agent"
    ];
    module2.exports = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i2;
      if (!headers) {
        return parsed;
      }
      utils.forEach(headers.split("\n"), function parser(line) {
        i2 = line.indexOf(":");
        key = utils.trim(line.substr(0, i2)).toLowerCase();
        val = utils.trim(line.substr(i2 + 1));
        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === "set-cookie") {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
          }
        }
      });
      return parsed;
    };
  }
});

// node_modules/axios/lib/helpers/isURLSameOrigin.js
var require_isURLSameOrigin = __commonJS({
  "node_modules/axios/lib/helpers/isURLSameOrigin.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = utils.isStandardBrowserEnv() ? function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement("a");
      var originURL;
      function resolveURL(url) {
        var href = url;
        if (msie) {
          urlParsingNode.setAttribute("href", href);
          href = urlParsingNode.href;
        }
        urlParsingNode.setAttribute("href", href);
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, "") : "",
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, "") : "",
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, "") : "",
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: urlParsingNode.pathname.charAt(0) === "/" ? urlParsingNode.pathname : "/" + urlParsingNode.pathname
        };
      }
      originURL = resolveURL(window.location.href);
      return function isURLSameOrigin(requestURL) {
        var parsed = utils.isString(requestURL) ? resolveURL(requestURL) : requestURL;
        return parsed.protocol === originURL.protocol && parsed.host === originURL.host;
      };
    }() : function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    }();
  }
});

// node_modules/axios/lib/cancel/Cancel.js
var require_Cancel = __commonJS({
  "node_modules/axios/lib/cancel/Cancel.js"(exports, module2) {
    init_shims();
    "use strict";
    function Cancel(message) {
      this.message = message;
    }
    Cancel.prototype.toString = function toString() {
      return "Cancel" + (this.message ? ": " + this.message : "");
    };
    Cancel.prototype.__CANCEL__ = true;
    module2.exports = Cancel;
  }
});

// node_modules/axios/lib/adapters/xhr.js
var require_xhr = __commonJS({
  "node_modules/axios/lib/adapters/xhr.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var settle = require_settle();
    var cookies = require_cookies();
    var buildURL = require_buildURL();
    var buildFullPath = require_buildFullPath();
    var parseHeaders = require_parseHeaders();
    var isURLSameOrigin = require_isURLSameOrigin();
    var createError = require_createError();
    var defaults = require_defaults();
    var Cancel = require_Cancel();
    module2.exports = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve2, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;
        var responseType = config.responseType;
        var onCanceled;
        function done() {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(onCanceled);
          }
          if (config.signal) {
            config.signal.removeEventListener("abort", onCanceled);
          }
        }
        if (utils.isFormData(requestData)) {
          delete requestHeaders["Content-Type"];
        }
        var request = new XMLHttpRequest();
        if (config.auth) {
          var username = config.auth.username || "";
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : "";
          requestHeaders.Authorization = "Basic " + btoa(username + ":" + password);
        }
        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);
        request.timeout = config.timeout;
        function onloadend() {
          if (!request) {
            return;
          }
          var responseHeaders = "getAllResponseHeaders" in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request
          };
          settle(function _resolve(value) {
            resolve2(value);
            done();
          }, function _reject(err) {
            reject(err);
            done();
          }, response);
          request = null;
        }
        if ("onloadend" in request) {
          request.onloadend = onloadend;
        } else {
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
              return;
            }
            setTimeout(onloadend);
          };
        }
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }
          reject(createError("Request aborted", config, "ECONNABORTED", request));
          request = null;
        };
        request.onerror = function handleError() {
          reject(createError("Network Error", config, null, request));
          request = null;
        };
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = config.timeout ? "timeout of " + config.timeout + "ms exceeded" : "timeout exceeded";
          var transitional = config.transitional || defaults.transitional;
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, transitional.clarifyTimeoutError ? "ETIMEDOUT" : "ECONNABORTED", request));
          request = null;
        };
        if (utils.isStandardBrowserEnv()) {
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ? cookies.read(config.xsrfCookieName) : void 0;
          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }
        if ("setRequestHeader" in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === "undefined" && key.toLowerCase() === "content-type") {
              delete requestHeaders[key];
            } else {
              request.setRequestHeader(key, val);
            }
          });
        }
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }
        if (responseType && responseType !== "json") {
          request.responseType = config.responseType;
        }
        if (typeof config.onDownloadProgress === "function") {
          request.addEventListener("progress", config.onDownloadProgress);
        }
        if (typeof config.onUploadProgress === "function" && request.upload) {
          request.upload.addEventListener("progress", config.onUploadProgress);
        }
        if (config.cancelToken || config.signal) {
          onCanceled = function(cancel) {
            if (!request) {
              return;
            }
            reject(!cancel || cancel && cancel.type ? new Cancel("canceled") : cancel);
            request.abort();
            request = null;
          };
          config.cancelToken && config.cancelToken.subscribe(onCanceled);
          if (config.signal) {
            config.signal.aborted ? onCanceled() : config.signal.addEventListener("abort", onCanceled);
          }
        }
        if (!requestData) {
          requestData = null;
        }
        request.send(requestData);
      });
    };
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports, module2) {
    init_shims();
    var s3 = 1e3;
    var m2 = s3 * 60;
    var h2 = m2 * 60;
    var d3 = h2 * 24;
    var w2 = d3 * 7;
    var y2 = d3 * 365.25;
    module2.exports = function(val, options2) {
      options2 = options2 || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options2.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
      if (!match) {
        return;
      }
      var n2 = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n2 * y2;
        case "weeks":
        case "week":
        case "w":
          return n2 * w2;
        case "days":
        case "day":
        case "d":
          return n2 * d3;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n2 * h2;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n2 * m2;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n2 * s3;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n2;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d3) {
        return Math.round(ms / d3) + "d";
      }
      if (msAbs >= h2) {
        return Math.round(ms / h2) + "h";
      }
      if (msAbs >= m2) {
        return Math.round(ms / m2) + "m";
      }
      if (msAbs >= s3) {
        return Math.round(ms / s3) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d3) {
        return plural(ms, msAbs, d3, "day");
      }
      if (msAbs >= h2) {
        return plural(ms, msAbs, h2, "hour");
      }
      if (msAbs >= m2) {
        return plural(ms, msAbs, m2, "minute");
      }
      if (msAbs >= s3) {
        return plural(ms, msAbs, s3, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n2, name) {
      var isPlural = msAbs >= n2 * 1.5;
      return Math.round(ms / n2) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/debug/src/common.js"(exports, module2) {
    init_shims();
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash2 = 0;
        for (let i2 = 0; i2 < namespace.length; i2++) {
          hash2 = (hash2 << 5) - hash2 + namespace.charCodeAt(i2);
          hash2 |= 0;
        }
        return createDebug.colors[Math.abs(hash2) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self2 = debug;
          const curr = Number(new Date());
          const ms = curr - (prevTime || curr);
          self2.diff = ms;
          self2.prev = prevTime;
          self2.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format2) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format2];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self2, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self2, args);
          const logFn = self2.log || createDebug.log;
          logFn.apply(self2, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v2) => {
            enableOverride = v2;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        let i2;
        const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
        const len = split.length;
        for (i2 = 0; i2 < len; i2++) {
          if (!split[i2]) {
            continue;
          }
          namespaces = split[i2].replace(/\*/g, ".*?");
          if (namespaces[0] === "-") {
            createDebug.skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
          } else {
            createDebug.names.push(new RegExp("^" + namespaces + "$"));
          }
        }
      }
      function disable() {
        const namespaces = [
          ...createDebug.names.map(toNamespace),
          ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        if (name[name.length - 1] === "*") {
          return true;
        }
        let i2;
        let len;
        for (i2 = 0, len = createDebug.skips.length; i2 < len; i2++) {
          if (createDebug.skips[i2].test(name)) {
            return false;
          }
        }
        for (i2 = 0, len = createDebug.names.length; i2 < len; i2++) {
          if (createDebug.names[i2].test(name)) {
            return true;
          }
        }
        return false;
      }
      function toNamespace(regexp) {
        return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/debug/src/browser.js"(exports, module2) {
    init_shims();
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load5;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c2 = "color: " + this.color;
      args.splice(1, 0, c2, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c2);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error2) {
      }
    }
    function load5() {
      let r2;
      try {
        r2 = exports.storage.getItem("debug");
      } catch (error2) {
      }
      if (!r2 && typeof process !== "undefined" && "env" in process) {
        r2 = process.env.DEBUG;
      }
      return r2;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error2) {
      }
    }
    module2.exports = require_common()(exports);
    var { formatters } = module2.exports;
    formatters.j = function(v2) {
      try {
        return JSON.stringify(v2);
      } catch (error2) {
        return "[UnexpectedJSONParseError]: " + error2.message;
      }
    };
  }
});

// node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "node_modules/supports-color/index.js"(exports, module2) {
    init_shims();
    "use strict";
    var argv = process.argv;
    var terminator = argv.indexOf("--");
    var hasFlag = function(flag) {
      flag = "--" + flag;
      var pos = argv.indexOf(flag);
      return pos !== -1 && (terminator !== -1 ? pos < terminator : true);
    };
    module2.exports = function() {
      if ("FORCE_COLOR" in process.env) {
        return true;
      }
      if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false")) {
        return false;
      }
      if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
        return true;
      }
      if (process.stdout && !process.stdout.isTTY) {
        return false;
      }
      if (process.platform === "win32") {
        return true;
      }
      if ("COLORTERM" in process.env) {
        return true;
      }
      if (process.env.TERM === "dumb") {
        return false;
      }
      if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM)) {
        return true;
      }
      return false;
    }();
  }
});

// node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/debug/src/node.js"(exports, module2) {
    init_shims();
    var tty = require("tty");
    var util = require("util");
    exports.init = init2;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load5;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(() => {
    }, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error2) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_2, k2) => {
        return k2.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c2 = this.color;
        const colorCode = "[3" + (c2 < 8 ? c2 : "8;5;" + c2);
        const prefix = `  ${colorCode};1m${name} [0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return new Date().toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.format(...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load5() {
      return process.env.DEBUG;
    }
    function init2(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i2 = 0; i2 < keys.length; i2++) {
        debug.inspectOpts[keys[i2]] = exports.inspectOpts[keys[i2]];
      }
    }
    module2.exports = require_common()(exports);
    var { formatters } = module2.exports;
    formatters.o = function(v2) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v2, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v2) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v2, this.inspectOpts);
    };
  }
});

// node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/debug/src/index.js"(exports, module2) {
    init_shims();
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// node_modules/follow-redirects/debug.js
var require_debug = __commonJS({
  "node_modules/follow-redirects/debug.js"(exports, module2) {
    init_shims();
    var debug;
    module2.exports = function() {
      if (!debug) {
        try {
          debug = require_src()("follow-redirects");
        } catch (error2) {
        }
        if (typeof debug !== "function") {
          debug = function() {
          };
        }
      }
      debug.apply(null, arguments);
    };
  }
});

// node_modules/follow-redirects/index.js
var require_follow_redirects = __commonJS({
  "node_modules/follow-redirects/index.js"(exports, module2) {
    init_shims();
    var url = require("url");
    var URL2 = url.URL;
    var http2 = require("http");
    var https2 = require("https");
    var Writable = require("stream").Writable;
    var assert = require("assert");
    var debug = require_debug();
    var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
    var eventHandlers = Object.create(null);
    events.forEach(function(event) {
      eventHandlers[event] = function(arg1, arg2, arg3) {
        this._redirectable.emit(event, arg1, arg2, arg3);
      };
    });
    var RedirectionError = createErrorType("ERR_FR_REDIRECTION_FAILURE", "Redirected request failed");
    var TooManyRedirectsError = createErrorType("ERR_FR_TOO_MANY_REDIRECTS", "Maximum number of redirects exceeded");
    var MaxBodyLengthExceededError = createErrorType("ERR_FR_MAX_BODY_LENGTH_EXCEEDED", "Request body larger than maxBodyLength limit");
    var WriteAfterEndError = createErrorType("ERR_STREAM_WRITE_AFTER_END", "write after end");
    function RedirectableRequest(options2, responseCallback) {
      Writable.call(this);
      this._sanitizeOptions(options2);
      this._options = options2;
      this._ended = false;
      this._ending = false;
      this._redirectCount = 0;
      this._redirects = [];
      this._requestBodyLength = 0;
      this._requestBodyBuffers = [];
      if (responseCallback) {
        this.on("response", responseCallback);
      }
      var self2 = this;
      this._onNativeResponse = function(response) {
        self2._processResponse(response);
      };
      this._performRequest();
    }
    RedirectableRequest.prototype = Object.create(Writable.prototype);
    RedirectableRequest.prototype.abort = function() {
      abortRequest(this._currentRequest);
      this.emit("abort");
    };
    RedirectableRequest.prototype.write = function(data, encoding, callback) {
      if (this._ending) {
        throw new WriteAfterEndError();
      }
      if (!(typeof data === "string" || typeof data === "object" && "length" in data)) {
        throw new TypeError("data should be a string, Buffer or Uint8Array");
      }
      if (typeof encoding === "function") {
        callback = encoding;
        encoding = null;
      }
      if (data.length === 0) {
        if (callback) {
          callback();
        }
        return;
      }
      if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
        this._requestBodyLength += data.length;
        this._requestBodyBuffers.push({ data, encoding });
        this._currentRequest.write(data, encoding, callback);
      } else {
        this.emit("error", new MaxBodyLengthExceededError());
        this.abort();
      }
    };
    RedirectableRequest.prototype.end = function(data, encoding, callback) {
      if (typeof data === "function") {
        callback = data;
        data = encoding = null;
      } else if (typeof encoding === "function") {
        callback = encoding;
        encoding = null;
      }
      if (!data) {
        this._ended = this._ending = true;
        this._currentRequest.end(null, null, callback);
      } else {
        var self2 = this;
        var currentRequest = this._currentRequest;
        this.write(data, encoding, function() {
          self2._ended = true;
          currentRequest.end(null, null, callback);
        });
        this._ending = true;
      }
    };
    RedirectableRequest.prototype.setHeader = function(name, value) {
      this._options.headers[name] = value;
      this._currentRequest.setHeader(name, value);
    };
    RedirectableRequest.prototype.removeHeader = function(name) {
      delete this._options.headers[name];
      this._currentRequest.removeHeader(name);
    };
    RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
      var self2 = this;
      function destroyOnTimeout(socket) {
        socket.setTimeout(msecs);
        socket.removeListener("timeout", socket.destroy);
        socket.addListener("timeout", socket.destroy);
      }
      function startTimer(socket) {
        if (self2._timeout) {
          clearTimeout(self2._timeout);
        }
        self2._timeout = setTimeout(function() {
          self2.emit("timeout");
          clearTimer();
        }, msecs);
        destroyOnTimeout(socket);
      }
      function clearTimer() {
        if (self2._timeout) {
          clearTimeout(self2._timeout);
          self2._timeout = null;
        }
        self2.removeListener("abort", clearTimer);
        self2.removeListener("error", clearTimer);
        self2.removeListener("response", clearTimer);
        if (callback) {
          self2.removeListener("timeout", callback);
        }
        if (!self2.socket) {
          self2._currentRequest.removeListener("socket", startTimer);
        }
      }
      if (callback) {
        this.on("timeout", callback);
      }
      if (this.socket) {
        startTimer(this.socket);
      } else {
        this._currentRequest.once("socket", startTimer);
      }
      this.on("socket", destroyOnTimeout);
      this.on("abort", clearTimer);
      this.on("error", clearTimer);
      this.on("response", clearTimer);
      return this;
    };
    [
      "flushHeaders",
      "getHeader",
      "setNoDelay",
      "setSocketKeepAlive"
    ].forEach(function(method) {
      RedirectableRequest.prototype[method] = function(a2, b2) {
        return this._currentRequest[method](a2, b2);
      };
    });
    ["aborted", "connection", "socket"].forEach(function(property) {
      Object.defineProperty(RedirectableRequest.prototype, property, {
        get: function() {
          return this._currentRequest[property];
        }
      });
    });
    RedirectableRequest.prototype._sanitizeOptions = function(options2) {
      if (!options2.headers) {
        options2.headers = {};
      }
      if (options2.host) {
        if (!options2.hostname) {
          options2.hostname = options2.host;
        }
        delete options2.host;
      }
      if (!options2.pathname && options2.path) {
        var searchPos = options2.path.indexOf("?");
        if (searchPos < 0) {
          options2.pathname = options2.path;
        } else {
          options2.pathname = options2.path.substring(0, searchPos);
          options2.search = options2.path.substring(searchPos);
        }
      }
    };
    RedirectableRequest.prototype._performRequest = function() {
      var protocol = this._options.protocol;
      var nativeProtocol = this._options.nativeProtocols[protocol];
      if (!nativeProtocol) {
        this.emit("error", new TypeError("Unsupported protocol " + protocol));
        return;
      }
      if (this._options.agents) {
        var scheme = protocol.substr(0, protocol.length - 1);
        this._options.agent = this._options.agents[scheme];
      }
      var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
      this._currentUrl = url.format(this._options);
      request._redirectable = this;
      for (var e2 = 0; e2 < events.length; e2++) {
        request.on(events[e2], eventHandlers[events[e2]]);
      }
      if (this._isRedirect) {
        var i2 = 0;
        var self2 = this;
        var buffers = this._requestBodyBuffers;
        (function writeNext(error2) {
          if (request === self2._currentRequest) {
            if (error2) {
              self2.emit("error", error2);
            } else if (i2 < buffers.length) {
              var buffer = buffers[i2++];
              if (!request.finished) {
                request.write(buffer.data, buffer.encoding, writeNext);
              }
            } else if (self2._ended) {
              request.end();
            }
          }
        })();
      }
    };
    RedirectableRequest.prototype._processResponse = function(response) {
      var statusCode = response.statusCode;
      if (this._options.trackRedirects) {
        this._redirects.push({
          url: this._currentUrl,
          headers: response.headers,
          statusCode
        });
      }
      var location = response.headers.location;
      if (location && this._options.followRedirects !== false && statusCode >= 300 && statusCode < 400) {
        abortRequest(this._currentRequest);
        response.destroy();
        if (++this._redirectCount > this._options.maxRedirects) {
          this.emit("error", new TooManyRedirectsError());
          return;
        }
        if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
          this._options.method = "GET";
          this._requestBodyBuffers = [];
          removeMatchingHeaders(/^content-/i, this._options.headers);
        }
        var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
        var currentUrlParts = url.parse(this._currentUrl);
        var currentHost = currentHostHeader || currentUrlParts.host;
        var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url.format(Object.assign(currentUrlParts, { host: currentHost }));
        var redirectUrl;
        try {
          redirectUrl = url.resolve(currentUrl, location);
        } catch (cause) {
          this.emit("error", new RedirectionError(cause));
          return;
        }
        debug("redirecting to", redirectUrl);
        this._isRedirect = true;
        var redirectUrlParts = url.parse(redirectUrl);
        Object.assign(this._options, redirectUrlParts);
        if (!(redirectUrlParts.host === currentHost || isSubdomainOf(redirectUrlParts.host, currentHost))) {
          removeMatchingHeaders(/^authorization$/i, this._options.headers);
        }
        if (typeof this._options.beforeRedirect === "function") {
          var responseDetails = { headers: response.headers };
          try {
            this._options.beforeRedirect.call(null, this._options, responseDetails);
          } catch (err) {
            this.emit("error", err);
            return;
          }
          this._sanitizeOptions(this._options);
        }
        try {
          this._performRequest();
        } catch (cause) {
          this.emit("error", new RedirectionError(cause));
        }
      } else {
        response.responseUrl = this._currentUrl;
        response.redirects = this._redirects;
        this.emit("response", response);
        this._requestBodyBuffers = [];
      }
    };
    function wrap(protocols) {
      var exports2 = {
        maxRedirects: 21,
        maxBodyLength: 10 * 1024 * 1024
      };
      var nativeProtocols = {};
      Object.keys(protocols).forEach(function(scheme) {
        var protocol = scheme + ":";
        var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
        var wrappedProtocol = exports2[scheme] = Object.create(nativeProtocol);
        function request(input, options2, callback) {
          if (typeof input === "string") {
            var urlStr = input;
            try {
              input = urlToOptions(new URL2(urlStr));
            } catch (err) {
              input = url.parse(urlStr);
            }
          } else if (URL2 && input instanceof URL2) {
            input = urlToOptions(input);
          } else {
            callback = options2;
            options2 = input;
            input = { protocol };
          }
          if (typeof options2 === "function") {
            callback = options2;
            options2 = null;
          }
          options2 = Object.assign({
            maxRedirects: exports2.maxRedirects,
            maxBodyLength: exports2.maxBodyLength
          }, input, options2);
          options2.nativeProtocols = nativeProtocols;
          assert.equal(options2.protocol, protocol, "protocol mismatch");
          debug("options", options2);
          return new RedirectableRequest(options2, callback);
        }
        function get(input, options2, callback) {
          var wrappedRequest = wrappedProtocol.request(input, options2, callback);
          wrappedRequest.end();
          return wrappedRequest;
        }
        Object.defineProperties(wrappedProtocol, {
          request: { value: request, configurable: true, enumerable: true, writable: true },
          get: { value: get, configurable: true, enumerable: true, writable: true }
        });
      });
      return exports2;
    }
    function noop2() {
    }
    function urlToOptions(urlObject) {
      var options2 = {
        protocol: urlObject.protocol,
        hostname: urlObject.hostname.startsWith("[") ? urlObject.hostname.slice(1, -1) : urlObject.hostname,
        hash: urlObject.hash,
        search: urlObject.search,
        pathname: urlObject.pathname,
        path: urlObject.pathname + urlObject.search,
        href: urlObject.href
      };
      if (urlObject.port !== "") {
        options2.port = Number(urlObject.port);
      }
      return options2;
    }
    function removeMatchingHeaders(regex, headers) {
      var lastValue;
      for (var header in headers) {
        if (regex.test(header)) {
          lastValue = headers[header].toString().trim();
          delete headers[header];
        }
      }
      return lastValue;
    }
    function createErrorType(code, defaultMessage) {
      function CustomError(cause) {
        Error.captureStackTrace(this, this.constructor);
        if (!cause) {
          this.message = defaultMessage;
        } else {
          this.message = defaultMessage + ": " + cause.message;
          this.cause = cause;
        }
      }
      CustomError.prototype = new Error();
      CustomError.prototype.constructor = CustomError;
      CustomError.prototype.name = "Error [" + code + "]";
      CustomError.prototype.code = code;
      return CustomError;
    }
    function abortRequest(request) {
      for (var e2 = 0; e2 < events.length; e2++) {
        request.removeListener(events[e2], eventHandlers[events[e2]]);
      }
      request.on("error", noop2);
      request.abort();
    }
    function isSubdomainOf(subdomain, domain) {
      const dot = subdomain.length - domain.length - 1;
      return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
    }
    module2.exports = wrap({ http: http2, https: https2 });
    module2.exports.wrap = wrap;
  }
});

// node_modules/axios/lib/env/data.js
var require_data = __commonJS({
  "node_modules/axios/lib/env/data.js"(exports, module2) {
    init_shims();
    module2.exports = {
      "version": "0.24.0"
    };
  }
});

// node_modules/axios/lib/adapters/http.js
var require_http = __commonJS({
  "node_modules/axios/lib/adapters/http.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var settle = require_settle();
    var buildFullPath = require_buildFullPath();
    var buildURL = require_buildURL();
    var http2 = require("http");
    var https2 = require("https");
    var httpFollow = require_follow_redirects().http;
    var httpsFollow = require_follow_redirects().https;
    var url = require("url");
    var zlib2 = require("zlib");
    var VERSION = require_data().version;
    var createError = require_createError();
    var enhanceError = require_enhanceError();
    var defaults = require_defaults();
    var Cancel = require_Cancel();
    var isHttps = /https:?/;
    function setProxy(options2, proxy, location) {
      options2.hostname = proxy.host;
      options2.host = proxy.host;
      options2.port = proxy.port;
      options2.path = location;
      if (proxy.auth) {
        var base64 = Buffer.from(proxy.auth.username + ":" + proxy.auth.password, "utf8").toString("base64");
        options2.headers["Proxy-Authorization"] = "Basic " + base64;
      }
      options2.beforeRedirect = function beforeRedirect(redirection) {
        redirection.headers.host = redirection.host;
        setProxy(redirection, proxy, redirection.href);
      };
    }
    module2.exports = function httpAdapter(config) {
      return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
        var onCanceled;
        function done() {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(onCanceled);
          }
          if (config.signal) {
            config.signal.removeEventListener("abort", onCanceled);
          }
        }
        var resolve2 = function resolve3(value) {
          done();
          resolvePromise(value);
        };
        var reject = function reject2(value) {
          done();
          rejectPromise(value);
        };
        var data = config.data;
        var headers = config.headers;
        var headerNames = {};
        Object.keys(headers).forEach(function storeLowerName(name) {
          headerNames[name.toLowerCase()] = name;
        });
        if ("user-agent" in headerNames) {
          if (!headers[headerNames["user-agent"]]) {
            delete headers[headerNames["user-agent"]];
          }
        } else {
          headers["User-Agent"] = "axios/" + VERSION;
        }
        if (data && !utils.isStream(data)) {
          if (Buffer.isBuffer(data)) {
          } else if (utils.isArrayBuffer(data)) {
            data = Buffer.from(new Uint8Array(data));
          } else if (utils.isString(data)) {
            data = Buffer.from(data, "utf-8");
          } else {
            return reject(createError("Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream", config));
          }
          if (!headerNames["content-length"]) {
            headers["Content-Length"] = data.length;
          }
        }
        var auth = void 0;
        if (config.auth) {
          var username = config.auth.username || "";
          var password = config.auth.password || "";
          auth = username + ":" + password;
        }
        var fullPath = buildFullPath(config.baseURL, config.url);
        var parsed = url.parse(fullPath);
        var protocol = parsed.protocol || "http:";
        if (!auth && parsed.auth) {
          var urlAuth = parsed.auth.split(":");
          var urlUsername = urlAuth[0] || "";
          var urlPassword = urlAuth[1] || "";
          auth = urlUsername + ":" + urlPassword;
        }
        if (auth && headerNames.authorization) {
          delete headers[headerNames.authorization];
        }
        var isHttpsRequest = isHttps.test(protocol);
        var agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
        var options2 = {
          path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ""),
          method: config.method.toUpperCase(),
          headers,
          agent,
          agents: { http: config.httpAgent, https: config.httpsAgent },
          auth
        };
        if (config.socketPath) {
          options2.socketPath = config.socketPath;
        } else {
          options2.hostname = parsed.hostname;
          options2.port = parsed.port;
        }
        var proxy = config.proxy;
        if (!proxy && proxy !== false) {
          var proxyEnv = protocol.slice(0, -1) + "_proxy";
          var proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
          if (proxyUrl) {
            var parsedProxyUrl = url.parse(proxyUrl);
            var noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
            var shouldProxy = true;
            if (noProxyEnv) {
              var noProxy = noProxyEnv.split(",").map(function trim(s3) {
                return s3.trim();
              });
              shouldProxy = !noProxy.some(function proxyMatch(proxyElement) {
                if (!proxyElement) {
                  return false;
                }
                if (proxyElement === "*") {
                  return true;
                }
                if (proxyElement[0] === "." && parsed.hostname.substr(parsed.hostname.length - proxyElement.length) === proxyElement) {
                  return true;
                }
                return parsed.hostname === proxyElement;
              });
            }
            if (shouldProxy) {
              proxy = {
                host: parsedProxyUrl.hostname,
                port: parsedProxyUrl.port,
                protocol: parsedProxyUrl.protocol
              };
              if (parsedProxyUrl.auth) {
                var proxyUrlAuth = parsedProxyUrl.auth.split(":");
                proxy.auth = {
                  username: proxyUrlAuth[0],
                  password: proxyUrlAuth[1]
                };
              }
            }
          }
        }
        if (proxy) {
          options2.headers.host = parsed.hostname + (parsed.port ? ":" + parsed.port : "");
          setProxy(options2, proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options2.path);
        }
        var transport;
        var isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true);
        if (config.transport) {
          transport = config.transport;
        } else if (config.maxRedirects === 0) {
          transport = isHttpsProxy ? https2 : http2;
        } else {
          if (config.maxRedirects) {
            options2.maxRedirects = config.maxRedirects;
          }
          transport = isHttpsProxy ? httpsFollow : httpFollow;
        }
        if (config.maxBodyLength > -1) {
          options2.maxBodyLength = config.maxBodyLength;
        }
        if (config.insecureHTTPParser) {
          options2.insecureHTTPParser = config.insecureHTTPParser;
        }
        var req = transport.request(options2, function handleResponse(res) {
          if (req.aborted)
            return;
          var stream = res;
          var lastRequest = res.req || req;
          if (res.statusCode !== 204 && lastRequest.method !== "HEAD" && config.decompress !== false) {
            switch (res.headers["content-encoding"]) {
              case "gzip":
              case "compress":
              case "deflate":
                stream = stream.pipe(zlib2.createUnzip());
                delete res.headers["content-encoding"];
                break;
            }
          }
          var response = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            config,
            request: lastRequest
          };
          if (config.responseType === "stream") {
            response.data = stream;
            settle(resolve2, reject, response);
          } else {
            var responseBuffer = [];
            var totalResponseBytes = 0;
            stream.on("data", function handleStreamData(chunk) {
              responseBuffer.push(chunk);
              totalResponseBytes += chunk.length;
              if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
                stream.destroy();
                reject(createError("maxContentLength size of " + config.maxContentLength + " exceeded", config, null, lastRequest));
              }
            });
            stream.on("error", function handleStreamError(err) {
              if (req.aborted)
                return;
              reject(enhanceError(err, config, null, lastRequest));
            });
            stream.on("end", function handleStreamEnd() {
              var responseData = Buffer.concat(responseBuffer);
              if (config.responseType !== "arraybuffer") {
                responseData = responseData.toString(config.responseEncoding);
                if (!config.responseEncoding || config.responseEncoding === "utf8") {
                  responseData = utils.stripBOM(responseData);
                }
              }
              response.data = responseData;
              settle(resolve2, reject, response);
            });
          }
        });
        req.on("error", function handleRequestError(err) {
          if (req.aborted && err.code !== "ERR_FR_TOO_MANY_REDIRECTS")
            return;
          reject(enhanceError(err, config, null, req));
        });
        if (config.timeout) {
          var timeout = parseInt(config.timeout, 10);
          if (isNaN(timeout)) {
            reject(createError("error trying to parse `config.timeout` to int", config, "ERR_PARSE_TIMEOUT", req));
            return;
          }
          req.setTimeout(timeout, function handleRequestTimeout() {
            req.abort();
            var transitional = config.transitional || defaults.transitional;
            reject(createError("timeout of " + timeout + "ms exceeded", config, transitional.clarifyTimeoutError ? "ETIMEDOUT" : "ECONNABORTED", req));
          });
        }
        if (config.cancelToken || config.signal) {
          onCanceled = function(cancel) {
            if (req.aborted)
              return;
            req.abort();
            reject(!cancel || cancel && cancel.type ? new Cancel("canceled") : cancel);
          };
          config.cancelToken && config.cancelToken.subscribe(onCanceled);
          if (config.signal) {
            config.signal.aborted ? onCanceled() : config.signal.addEventListener("abort", onCanceled);
          }
        }
        if (utils.isStream(data)) {
          data.on("error", function handleStreamError(err) {
            reject(enhanceError(err, config, null, req));
          }).pipe(req);
        } else {
          req.end(data);
        }
      });
    };
  }
});

// node_modules/axios/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/axios/lib/defaults.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var normalizeHeaderName = require_normalizeHeaderName();
    var enhanceError = require_enhanceError();
    var DEFAULT_CONTENT_TYPE = {
      "Content-Type": "application/x-www-form-urlencoded"
    };
    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers["Content-Type"])) {
        headers["Content-Type"] = value;
      }
    }
    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== "undefined") {
        adapter = require_xhr();
      } else if (typeof process !== "undefined" && Object.prototype.toString.call(process) === "[object process]") {
        adapter = require_http();
      }
      return adapter;
    }
    function stringifySafely(rawValue, parser, encoder) {
      if (utils.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils.trim(rawValue);
        } catch (e2) {
          if (e2.name !== "SyntaxError") {
            throw e2;
          }
        }
      }
      return (encoder || JSON.stringify)(rawValue);
    }
    var defaults = {
      transitional: {
        silentJSONParsing: true,
        forcedJSONParsing: true,
        clarifyTimeoutError: false
      },
      adapter: getDefaultAdapter(),
      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, "Accept");
        normalizeHeaderName(headers, "Content-Type");
        if (utils.isFormData(data) || utils.isArrayBuffer(data) || utils.isBuffer(data) || utils.isStream(data) || utils.isFile(data) || utils.isBlob(data)) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, "application/x-www-form-urlencoded;charset=utf-8");
          return data.toString();
        }
        if (utils.isObject(data) || headers && headers["Content-Type"] === "application/json") {
          setContentTypeIfUnset(headers, "application/json");
          return stringifySafely(data);
        }
        return data;
      }],
      transformResponse: [function transformResponse(data) {
        var transitional = this.transitional || defaults.transitional;
        var silentJSONParsing = transitional && transitional.silentJSONParsing;
        var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        var strictJSONParsing = !silentJSONParsing && this.responseType === "json";
        if (strictJSONParsing || forcedJSONParsing && utils.isString(data) && data.length) {
          try {
            return JSON.parse(data);
          } catch (e2) {
            if (strictJSONParsing) {
              if (e2.name === "SyntaxError") {
                throw enhanceError(e2, this, "E_JSON_PARSE");
              }
              throw e2;
            }
          }
        }
        return data;
      }],
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      maxBodyLength: -1,
      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      },
      headers: {
        common: {
          "Accept": "application/json, text/plain, */*"
        }
      }
    };
    utils.forEach(["delete", "get", "head"], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });
    utils.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });
    module2.exports = defaults;
  }
});

// node_modules/axios/lib/core/transformData.js
var require_transformData = __commonJS({
  "node_modules/axios/lib/core/transformData.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var defaults = require_defaults();
    module2.exports = function transformData(data, headers, fns) {
      var context = this || defaults;
      utils.forEach(fns, function transform(fn) {
        data = fn.call(context, data, headers);
      });
      return data;
    };
  }
});

// node_modules/axios/lib/cancel/isCancel.js
var require_isCancel = __commonJS({
  "node_modules/axios/lib/cancel/isCancel.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };
  }
});

// node_modules/axios/lib/core/dispatchRequest.js
var require_dispatchRequest = __commonJS({
  "node_modules/axios/lib/core/dispatchRequest.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var transformData = require_transformData();
    var isCancel = require_isCancel();
    var defaults = require_defaults();
    var Cancel = require_Cancel();
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
      if (config.signal && config.signal.aborted) {
        throw new Cancel("canceled");
      }
    }
    module2.exports = function dispatchRequest(config) {
      throwIfCancellationRequested(config);
      config.headers = config.headers || {};
      config.data = transformData.call(config, config.data, config.headers, config.transformRequest);
      config.headers = utils.merge(config.headers.common || {}, config.headers[config.method] || {}, config.headers);
      utils.forEach(["delete", "get", "head", "post", "put", "patch", "common"], function cleanHeaderConfig(method) {
        delete config.headers[method];
      });
      var adapter = config.adapter || defaults.adapter;
      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);
        response.data = transformData.call(config, response.data, response.headers, config.transformResponse);
        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);
          if (reason && reason.response) {
            reason.response.data = transformData.call(config, reason.response.data, reason.response.headers, config.transformResponse);
          }
        }
        return Promise.reject(reason);
      });
    };
  }
});

// node_modules/axios/lib/core/mergeConfig.js
var require_mergeConfig = __commonJS({
  "node_modules/axios/lib/core/mergeConfig.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = function mergeConfig(config1, config2) {
      config2 = config2 || {};
      var config = {};
      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }
      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          return getMergedValue(void 0, config1[prop]);
        }
      }
      function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(void 0, config2[prop]);
        }
      }
      function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(void 0, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          return getMergedValue(void 0, config1[prop]);
        }
      }
      function mergeDirectKeys(prop) {
        if (prop in config2) {
          return getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          return getMergedValue(void 0, config1[prop]);
        }
      }
      var mergeMap = {
        "url": valueFromConfig2,
        "method": valueFromConfig2,
        "data": valueFromConfig2,
        "baseURL": defaultToConfig2,
        "transformRequest": defaultToConfig2,
        "transformResponse": defaultToConfig2,
        "paramsSerializer": defaultToConfig2,
        "timeout": defaultToConfig2,
        "timeoutMessage": defaultToConfig2,
        "withCredentials": defaultToConfig2,
        "adapter": defaultToConfig2,
        "responseType": defaultToConfig2,
        "xsrfCookieName": defaultToConfig2,
        "xsrfHeaderName": defaultToConfig2,
        "onUploadProgress": defaultToConfig2,
        "onDownloadProgress": defaultToConfig2,
        "decompress": defaultToConfig2,
        "maxContentLength": defaultToConfig2,
        "maxBodyLength": defaultToConfig2,
        "transport": defaultToConfig2,
        "httpAgent": defaultToConfig2,
        "httpsAgent": defaultToConfig2,
        "cancelToken": defaultToConfig2,
        "socketPath": defaultToConfig2,
        "responseEncoding": defaultToConfig2,
        "validateStatus": mergeDirectKeys
      };
      utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
        var merge = mergeMap[prop] || mergeDeepProperties;
        var configValue = merge(prop);
        utils.isUndefined(configValue) && merge !== mergeDirectKeys || (config[prop] = configValue);
      });
      return config;
    };
  }
});

// node_modules/axios/lib/helpers/validator.js
var require_validator = __commonJS({
  "node_modules/axios/lib/helpers/validator.js"(exports, module2) {
    init_shims();
    "use strict";
    var VERSION = require_data().version;
    var validators = {};
    ["object", "boolean", "number", "function", "string", "symbol"].forEach(function(type, i2) {
      validators[type] = function validator(thing) {
        return typeof thing === type || "a" + (i2 < 1 ? "n " : " ") + type;
      };
    });
    var deprecatedWarnings = {};
    validators.transitional = function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
        return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
      }
      return function(value, opt, opts) {
        if (validator === false) {
          throw new Error(formatMessage(opt, " has been removed" + (version ? " in " + version : "")));
        }
        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          console.warn(formatMessage(opt, " has been deprecated since v" + version + " and will be removed in the near future"));
        }
        return validator ? validator(value, opt, opts) : true;
      };
    };
    function assertOptions(options2, schema, allowUnknown) {
      if (typeof options2 !== "object") {
        throw new TypeError("options must be an object");
      }
      var keys = Object.keys(options2);
      var i2 = keys.length;
      while (i2-- > 0) {
        var opt = keys[i2];
        var validator = schema[opt];
        if (validator) {
          var value = options2[opt];
          var result = value === void 0 || validator(value, opt, options2);
          if (result !== true) {
            throw new TypeError("option " + opt + " must be " + result);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw Error("Unknown option " + opt);
        }
      }
    }
    module2.exports = {
      assertOptions,
      validators
    };
  }
});

// node_modules/axios/lib/core/Axios.js
var require_Axios = __commonJS({
  "node_modules/axios/lib/core/Axios.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var buildURL = require_buildURL();
    var InterceptorManager = require_InterceptorManager();
    var dispatchRequest = require_dispatchRequest();
    var mergeConfig = require_mergeConfig();
    var validator = require_validator();
    var validators = validator.validators;
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
      };
    }
    Axios.prototype.request = function request(config) {
      if (typeof config === "string") {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }
      config = mergeConfig(this.defaults, config);
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = "get";
      }
      var transitional = config.transitional;
      if (transitional !== void 0) {
        validator.assertOptions(transitional, {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean)
        }, false);
      }
      var requestInterceptorChain = [];
      var synchronousRequestInterceptors = true;
      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
          return;
        }
        synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      });
      var responseInterceptorChain = [];
      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      });
      var promise;
      if (!synchronousRequestInterceptors) {
        var chain = [dispatchRequest, void 0];
        Array.prototype.unshift.apply(chain, requestInterceptorChain);
        chain = chain.concat(responseInterceptorChain);
        promise = Promise.resolve(config);
        while (chain.length) {
          promise = promise.then(chain.shift(), chain.shift());
        }
        return promise;
      }
      var newConfig = config;
      while (requestInterceptorChain.length) {
        var onFulfilled = requestInterceptorChain.shift();
        var onRejected = requestInterceptorChain.shift();
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error2) {
          onRejected(error2);
          break;
        }
      }
      try {
        promise = dispatchRequest(newConfig);
      } catch (error2) {
        return Promise.reject(error2);
      }
      while (responseInterceptorChain.length) {
        promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
      }
      return promise;
    };
    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, "");
    };
    utils.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url,
          data: (config || {}).data
        }));
      };
    });
    utils.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url,
          data
        }));
      };
    });
    module2.exports = Axios;
  }
});

// node_modules/axios/lib/cancel/CancelToken.js
var require_CancelToken = __commonJS({
  "node_modules/axios/lib/cancel/CancelToken.js"(exports, module2) {
    init_shims();
    "use strict";
    var Cancel = require_Cancel();
    function CancelToken(executor) {
      if (typeof executor !== "function") {
        throw new TypeError("executor must be a function.");
      }
      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve2) {
        resolvePromise = resolve2;
      });
      var token = this;
      this.promise.then(function(cancel) {
        if (!token._listeners)
          return;
        var i2;
        var l2 = token._listeners.length;
        for (i2 = 0; i2 < l2; i2++) {
          token._listeners[i2](cancel);
        }
        token._listeners = null;
      });
      this.promise.then = function(onfulfilled) {
        var _resolve;
        var promise = new Promise(function(resolve2) {
          token.subscribe(resolve2);
          _resolve = resolve2;
        }).then(onfulfilled);
        promise.cancel = function reject() {
          token.unsubscribe(_resolve);
        };
        return promise;
      };
      executor(function cancel(message) {
        if (token.reason) {
          return;
        }
        token.reason = new Cancel(message);
        resolvePromise(token.reason);
      });
    }
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };
    CancelToken.prototype.subscribe = function subscribe(listener) {
      if (this.reason) {
        listener(this.reason);
        return;
      }
      if (this._listeners) {
        this._listeners.push(listener);
      } else {
        this._listeners = [listener];
      }
    };
    CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
      if (!this._listeners) {
        return;
      }
      var index = this._listeners.indexOf(listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    };
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c2) {
        cancel = c2;
      });
      return {
        token,
        cancel
      };
    };
    module2.exports = CancelToken;
  }
});

// node_modules/axios/lib/helpers/spread.js
var require_spread = __commonJS({
  "node_modules/axios/lib/helpers/spread.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function spread2(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };
  }
});

// node_modules/axios/lib/helpers/isAxiosError.js
var require_isAxiosError = __commonJS({
  "node_modules/axios/lib/helpers/isAxiosError.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function isAxiosError(payload) {
      return typeof payload === "object" && payload.isAxiosError === true;
    };
  }
});

// node_modules/axios/lib/axios.js
var require_axios = __commonJS({
  "node_modules/axios/lib/axios.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var bind = require_bind();
    var Axios = require_Axios();
    var mergeConfig = require_mergeConfig();
    var defaults = require_defaults();
    function createInstance(defaultConfig) {
      var context = new Axios(defaultConfig);
      var instance = bind(Axios.prototype.request, context);
      utils.extend(instance, Axios.prototype, context);
      utils.extend(instance, context);
      instance.create = function create(instanceConfig) {
        return createInstance(mergeConfig(defaultConfig, instanceConfig));
      };
      return instance;
    }
    var axios5 = createInstance(defaults);
    axios5.Axios = Axios;
    axios5.Cancel = require_Cancel();
    axios5.CancelToken = require_CancelToken();
    axios5.isCancel = require_isCancel();
    axios5.VERSION = require_data().version;
    axios5.all = function all(promises) {
      return Promise.all(promises);
    };
    axios5.spread = require_spread();
    axios5.isAxiosError = require_isAxiosError();
    module2.exports = axios5;
    module2.exports.default = axios5;
  }
});

// node_modules/axios/index.js
var require_axios2 = __commonJS({
  "node_modules/axios/index.js"(exports, module2) {
    init_shims();
    module2.exports = require_axios();
  }
});

// .svelte-kit/output/server/chunks/__layout-91b7aaf7.js
var layout_91b7aaf7_exports = {};
__export(layout_91b7aaf7_exports, {
  default: () => _layout
});
var import_axios, getAuthorizationHeader, Logo, css$2, Navbar, css$1, Footer, css, _layout;
var init_layout_91b7aaf7 = __esm({
  ".svelte-kit/output/server/chunks/__layout-91b7aaf7.js"() {
    init_shims();
    init_app_f8d6d072();
    init_sha();
    import_axios = __toModule(require_axios2());
    getAuthorizationHeader = function() {
      var AppID = "947333329b9a4c99adc478a8c12c3aa3";
      var AppKey = "Fuzve_DoP8ReM3KD_-12cYjq8_8";
      var GMTString = new Date().toGMTString();
      var ShaObj = new sha_default("SHA-1", "TEXT");
      ShaObj.setHMACKey(AppKey, "TEXT");
      ShaObj.update("x-date: " + GMTString);
      var HMAC = ShaObj.getHMAC("B64");
      var Authorization = `hmac username="${AppID}", algorithm="hmac-sha1", headers="x-date", signature="${HMAC}"`;
      return { Authorization, "X-Date": GMTString };
    };
    Logo = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<a href="${"/"}"><img src="${"/logo-desktop.svg"}" alt="${"\u53F0\u7063\u8D70\u8D70\uFF0ETai Walk"}">
</a>`;
    });
    css$2 = {
      code: "a.svelte-ch7st6{color:#646464}a.svelte-ch7st6:hover{color:#7f977b}.container.svelte-ch7st6{width:100%}@media(min-width: 640px){.container.svelte-ch7st6{max-width:640px}}@media(min-width: 768px){.container.svelte-ch7st6{max-width:768px}}@media(min-width: 1024px){.container.svelte-ch7st6{max-width:1024px}}@media(min-width: 1280px){.container.svelte-ch7st6{max-width:1280px}}@media(min-width: 1536px){.container.svelte-ch7st6{max-width:1536px}}.bg-white.svelte-ch7st6{--tw-bg-opacity:1;background-color:rgba(255, 255, 255, var(--tw-bg-opacity))}.border-b.svelte-ch7st6{border-bottom-width:1px}.flex.svelte-ch7st6{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.hidden.svelte-ch7st6{display:none}.items-center.svelte-ch7st6{-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center}.justify-center.svelte-ch7st6{-webkit-box-pack:center;-ms-flex-pack:center;-webkit-justify-content:center;justify-content:center}.mx-auto.svelte-ch7st6{margin-left:auto;margin-right:auto}.mx-2.svelte-ch7st6{margin-left:0.5rem;margin-right:0.5rem}.p-4.svelte-ch7st6{padding:1rem}.sticky.svelte-ch7st6{position:sticky;position:-webkit-sticky}.top-0.svelte-ch7st6{top:0px}.z-60.svelte-ch7st6{z-index:60}@media(min-width: 640px){.sm\\:flex.svelte-ch7st6{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.sm\\:justify-between.svelte-ch7st6{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between}}@media(min-width: 1024px){.lg\\:max-w-4\\/6.svelte-ch7st6{max-width:66.666667%}}",
      map: null
    };
    Navbar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      const links = [
        { text: "\u63A2\u7D22\u666F\u9EDE", href: "/place" },
        { text: "\u7BC0\u6176\u6D3B\u52D5", href: "/event" },
        { text: "\u54C1\u5690\u7F8E\u98DF", href: "/food" }
      ];
      $$result.css.add(css$2);
      return `<nav class="${"p-4 border-b sticky top-0 bg-white z-60 svelte-ch7st6"}"><div class="${"container flex justify-center sm:justify-between mx-auto lg:max-w-4/6 svelte-ch7st6"}">${validate_component(Logo, "Logo").$$render($$result, {}, {}, {})}
		<div class="${"hidden sm:flex svelte-ch7st6"}">${each(links, (link) => `<a class="${"flex items-center mx-2 svelte-ch7st6"}"${add_attribute("href", link.href, 0)}><span>${escape(link.text)}</span>
				</a>`)}</div></div>
</nav>`;
    });
    css$1 = {
      code: "footer.svelte-e6gm29{background-color:#65895f}.p-4.svelte-e6gm29{padding:1rem}.text-center.svelte-e6gm29{text-align:center}.text-white.svelte-e6gm29{--tw-text-opacity:1;color:rgba(255, 255, 255, var(--tw-text-opacity))}",
      map: null
    };
    Footer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css$1);
      return `<footer class="${"p-4 text-white text-center svelte-e6gm29"}">#The F2E 3rd Week01 #Breakfast</footer>`;
    });
    css = {
      code: `*,::before,::after{-webkit-box-sizing:border-box;box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}*{--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000}:root{-moz-tab-size:4;-o-tab-size:4;tab-size:4}:-moz-focusring{outline:1px dotted ButtonText}:-moz-ui-invalid{box-shadow:none}::moz-focus-inner{border-style:none;padding:0}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}[type='search']{-webkit-appearance:textfield;outline-offset:-2px}abbr[title]{-webkit-text-decoration:underline dotted;text-decoration:underline dotted}body{margin:0;font-family:inherit;line-height:inherit}html{-webkit-text-size-adjust:100%;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";line-height:1.5}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;line-height:1.15;margin:0;padding:0;line-height:inherit;color:inherit}button,select{text-transform:none}button,[type='button'],[type='reset'],[type='submit']{-webkit-appearance:button}blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}button{background-color:transparent;background-image:none}button:focus{outline:1px dotted;outline:5px auto -webkit-focus-ring-color}button,[role="button"]{cursor:pointer}code,kbd,samp,pre{font-size:1em}fieldset{margin:0;padding:0}hr{height:0;color:inherit;border-top-width:1px}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}img{border-style:solid}input::placeholder{opacity:1;color:#9ca3af}input::webkit-input-placeholder{opacity:1;color:#9ca3af}input::-moz-placeholder{opacity:1;color:#9ca3af}input:-ms-input-placeholder{opacity:1;color:#9ca3af}input::-ms-input-placeholder{opacity:1;color:#9ca3af}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}legend{padding:0}ol,ul{list-style:none;margin:0;padding:0}progress{vertical-align:baseline}pre,code,kbd,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-0.25em}sup{top:-0.5em}summary{display:list-item}table{text-indent:0;border-color:inherit;border-collapse:collapse}textarea{resize:vertical}textarea::placeholder{opacity:1;color:#9ca3af}textarea::webkit-input-placeholder{opacity:1;color:#9ca3af}textarea::-moz-placeholder{opacity:1;color:#9ca3af}textarea:-ms-input-placeholder{opacity:1;color:#9ca3af}textarea::-ms-input-placeholder{opacity:1;color:#9ca3af}.container.svelte-hxytxr{width:100%}@media(min-width: 640px){.container.svelte-hxytxr{max-width:640px}}@media(min-width: 768px){.container.svelte-hxytxr{max-width:768px}}@media(min-width: 1024px){.container.svelte-hxytxr{max-width:1024px}}@media(min-width: 1280px){.container.svelte-hxytxr{max-width:1280px}}@media(min-width: 1536px){.container.svelte-hxytxr{max-width:1536px}}.flex.svelte-hxytxr{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.flex-col.svelte-hxytxr{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;-webkit-flex-direction:column;flex-direction:column}.items-center.svelte-hxytxr{-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center}.mx-auto.svelte-hxytxr{margin-left:auto;margin-right:auto}.px-4.svelte-hxytxr{padding-left:1rem;padding-right:1rem}.py-4.svelte-hxytxr{padding-top:1rem;padding-bottom:1rem}.relative.svelte-hxytxr{position:relative}[content~="initial-scale=1.0"].svelte-hxytxr{content:"initial-scale=1.0"}@media(min-width: 640px){.sm\\:py-16.svelte-hxytxr{padding-top:4rem;padding-bottom:4rem}}@media(min-width: 1024px){.lg\\:max-w-4\\/6.svelte-hxytxr{max-width:66.666667%}}`,
      map: null
    };
    import_axios.default.defaults.baseURL = "https://ptx.transportdata.tw/MOTC/v2/Tourism";
    import_axios.default.interceptors.request.use((config) => {
      config.headers = getAuthorizationHeader();
      return config;
    });
    _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css);
      return `${$$result.head += `<script defer src="${"/font-awesome/all.js"}" data-svelte="svelte-11g58vi"><\/script><meta name="${"viewport"}" content="${"width=device-width, initial-scale=1.0"}" class="${"svelte-hxytxr"}" data-svelte="svelte-11g58vi">`, ""}

${validate_component(Navbar, "Navbar").$$render($$result, {}, {}, {})}

<main class="${"relative container flex flex-col items-center px-4 py-4 sm:py-16 mx-auto lg:max-w-4/6 svelte-hxytxr"}">${slots.default ? slots.default({}) : ``}</main>

${validate_component(Footer, "Footer").$$render($$result, {}, {}, {})}`;
    });
  }
});

// .svelte-kit/output/server/chunks/error-a8490e75.js
var error_a8490e75_exports = {};
__export(error_a8490e75_exports, {
  default: () => Error2,
  load: () => load
});
function load({ error: error2, status }) {
  return { props: { error: error2, status } };
}
var Error2;
var init_error_a8490e75 = __esm({
  ".svelte-kit/output/server/chunks/error-a8490e75.js"() {
    init_shims();
    init_app_f8d6d072();
    Error2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { status } = $$props;
      let { error: error2 } = $$props;
      if ($$props.status === void 0 && $$bindings.status && status !== void 0)
        $$bindings.status(status);
      if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
        $$bindings.error(error2);
      return `<h1>${escape(status)}</h1>

<pre>${escape(error2.message)}</pre>



${error2.frame ? `<pre>${escape(error2.frame)}</pre>` : ``}
${error2.stack ? `<pre>${escape(error2.stack)}</pre>` : ``}`;
    });
  }
});

// .svelte-kit/output/server/chunks/ImageCardContainer-7bca39b0.js
var css$6, Carousel, css$5, LocationMarker, css$4, Title, css$3, ExporeMore, css$22, Header, css$12, ImageCard, css2, ImageCardContainer;
var init_ImageCardContainer_7bca39b0 = __esm({
  ".svelte-kit/output/server/chunks/ImageCardContainer-7bca39b0.js"() {
    init_shims();
    init_app_f8d6d072();
    css$6 = {
      code: ".indicator.svelte-tqqw5d{border-radius:9999px;border-width:2px;cursor:pointer;display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex;-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;-webkit-justify-content:center;justify-content:center;height:2rem;padding:0.25rem;--tw-shadow-color:0, 0, 0;--tw-shadow:0 10px 15px -3px rgba(var(--tw-shadow-color), 0.1), 0 4px 6px -2px rgba(var(--tw-shadow-color), 0.05);-webkit-box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);--tw-text-opacity:1;color:rgba(255, 255, 255, var(--tw-text-opacity));width:2rem}@media(min-width: 640px){.indicator.svelte-tqqw5d{height:3rem;width:3rem}}.bg-white.svelte-tqqw5d{--tw-bg-opacity:1;background-color:rgba(255, 255, 255, var(--tw-bg-opacity))}.bg-opacity-40.svelte-tqqw5d{--tw-bg-opacity:0.4}.rounded-xl.svelte-tqqw5d{border-radius:0.75rem}.rounded-full.svelte-tqqw5d{border-radius:9999px}.cursor-pointer.svelte-tqqw5d{cursor:pointer}.flex.svelte-tqqw5d{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.items-center.svelte-tqqw5d{-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center}.self-center.svelte-tqqw5d{-ms-flex-item-align:center;-ms-grid-row-align:center;-webkit-align-self:center;align-self:center}.justify-between.svelte-tqqw5d{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between}.h-full.svelte-tqqw5d{height:100%}.h-2.svelte-tqqw5d{height:0.5rem}.text-xl.svelte-tqqw5d{font-size:1.25rem;line-height:1.75rem}.m-1.svelte-tqqw5d{margin:0.25rem}.object-cover.svelte-tqqw5d{-o-object-fit:cover;object-fit:cover}.object-center.svelte-tqqw5d{-o-object-position:center;object-position:center}.overflow-hidden.svelte-tqqw5d{overflow:hidden}.px-4.svelte-tqqw5d{padding-left:1rem;padding-right:1rem}.absolute.svelte-tqqw5d{position:absolute}.relative.svelte-tqqw5d{position:relative}.inset-y-0.svelte-tqqw5d{top:0px;bottom:0px}.left-0.svelte-tqqw5d{left:0px}.right-0.svelte-tqqw5d{right:0px}.right-4.svelte-tqqw5d{right:1rem}.bottom-2.svelte-tqqw5d{bottom:0.5rem}.shadow.svelte-tqqw5d{--tw-shadow-color:0, 0, 0;--tw-shadow:0 1px 3px 0 rgba(var(--tw-shadow-color), 0.1), 0 1px 2px 0 rgba(var(--tw-shadow-color), 0.06);-webkit-box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)}.text-center.svelte-tqqw5d{text-align:center}.text-white.svelte-tqqw5d{--tw-text-opacity:1;color:rgba(255, 255, 255, var(--tw-text-opacity))}.text-shadow-xl.svelte-tqqw5d{text-shadow:1px 1px 3px rgb(0 0 0 / 29%), 2px 4px 7px rgb(73 64 125 / 35%)}.w-full.svelte-tqqw5d{width:100%}.w-2.svelte-tqqw5d{width:0.5rem}@media(min-width: 640px){.sm\\:h-4.svelte-tqqw5d{height:1rem}.sm\\:text-3xl.svelte-tqqw5d{font-size:1.875rem;line-height:2.25rem}.sm\\:w-4.svelte-tqqw5d{width:1rem}}",
      map: null
    };
    Carousel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { items = [] } = $$props;
      let currentIndex = 0;
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      $$result.css.add(css$6);
      return `<div class="${"relative overflow-hidden w-full h-full rounded-xl svelte-tqqw5d"}">${each(items, (item, idx) => `${idx === currentIndex ? `<a${add_attribute("href", item.href, 0)} class="${"relative flex w-full h-full rounded-xl svelte-tqqw5d"}">${item.label ? `<p class="${"absolute self-center w-full text-center text-white text-shadow-xl text-xl sm:text-3xl svelte-tqqw5d"}">${escape(item.label)}
					</p>` : ``}
				<img class="${"object-cover object-center w-full h-full svelte-tqqw5d"}"${add_attribute("src", item.src || "/picture-holder.png", 0)} alt="${""}">
			</a>` : ``}`)}

	
	${items.length > 1 ? `<div class="${"absolute flex items-center justify-between inset-y-0 left-0 px-4 svelte-tqqw5d"}"><div class="${"indicator svelte-tqqw5d"}"><i class="${"fas fa-chevron-left"}"></i></div></div>
		<div class="${"absolute flex items-center justify-between inset-y-0 right-0 px-4 svelte-tqqw5d"}"><div class="${"indicator svelte-tqqw5d"}"><i class="${"fas fa-chevron-right"}"></i></div></div>` : ``}

	
	${items.length > 1 ? `<div class="${"absolute right-4 bottom-2 flex svelte-tqqw5d"}">${each(items, (_2, idx) => `<div class="${[
        "m-1 bg-white shadow rounded-full h-2 w-2 sm:h-4 sm:w-4 cursor-pointer svelte-tqqw5d",
        idx !== currentIndex ? "bg-opacity-40" : ""
      ].join(" ").trim()}"></div>`)}</div>` : ``}
</div>`;
    });
    css$5 = {
      code: "div.svelte-1krli7{color:#646464}.flex.svelte-1krli7{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.items-center.svelte-1krli7{-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center}.leading-relaxed.svelte-1krli7{line-height:1.625}.mr-2.svelte-1krli7{margin-right:0.5rem}",
      map: null
    };
    LocationMarker = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css$5);
      return `<div class="${"location-marker flex items-center leading-relaxed  svelte-1krli7"}"><img src="${"/map-marker.svg"}" alt="${""}" class="${"mr-2 svelte-1krli7"}">
	${slots.default ? slots.default({}) : ``}
</div>`;
    });
    css$4 = {
      code: "div.svelte-1yw9os{color:#2F2F2F}.font-bold.svelte-1yw9os{font-weight:700}.text-xl.svelte-1yw9os{font-size:1.25rem;line-height:1.75rem}",
      map: null
    };
    Title = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { truncate = true } = $$props;
      if ($$props.truncate === void 0 && $$bindings.truncate && truncate !== void 0)
        $$bindings.truncate(truncate);
      $$result.css.add(css$4);
      return `<div class="${["title font-bold text-xl svelte-1yw9os", truncate ? "truncate" : ""].join(" ").trim()}">${slots.default ? slots.default({}) : ``}
</div>`;
    });
    css$3 = {
      code: "a.orange.svelte-e504ev{color:#ff725e}a.green.svelte-e504ev{color:#7F977B}.font-light.svelte-e504ev{font-weight:300}",
      map: null
    };
    ExporeMore = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { href, color } = $$props;
      if ($$props.href === void 0 && $$bindings.href && href !== void 0)
        $$bindings.href(href);
      if ($$props.color === void 0 && $$bindings.color && color !== void 0)
        $$bindings.color(color);
      $$result.css.add(css$3);
      return `<a${add_attribute("href", href, 0)} class="${"font-light " + escape(color) + " svelte-e504ev"}">${slots.default ? slots.default({}) : ``} <i class="${"fas fa-chevron-right"}"></i>
</a>`;
    });
    css$22 = {
      code: "p.svelte-e9o2ny{color:#1E1E1E}.font-light.svelte-e9o2ny{font-weight:300}.text-3xl.svelte-e9o2ny{font-size:1.875rem;line-height:2.25rem}",
      map: null
    };
    Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css$22);
      return `<p class="${"text-3xl font-light svelte-e9o2ny"}">${slots.default ? slots.default({}) : ``}
</p>`;
    });
    css$12 = {
      code: "a.svelte-1hw0alb:hover>div.svelte-1hw0alb>img.svelte-1hw0alb{--tw-rotate:0;--tw-rotate-x:0;--tw-rotate-y:0;--tw-rotate-z:0;--tw-scale-x:1;--tw-scale-y:1;--tw-scale-z:1;--tw-skew-x:0;--tw-skew-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;-webkit-transform:rotate(var(--tw-rotate)) rotateX(var(--tw-rotate-x)) rotateY(var(--tw-rotate-y)) rotateZ(var(--tw-rotate-z)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)) scaleZ(var(--tw-scale-z)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) translateX(var(--tw-translate-x)) translateY(var(--tw-translate-y)) translateZ(var(--tw-translate-z));-ms-transform:rotate(var(--tw-rotate)) rotateX(var(--tw-rotate-x)) rotateY(var(--tw-rotate-y)) rotateZ(var(--tw-rotate-z)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)) scaleZ(var(--tw-scale-z)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) translateX(var(--tw-translate-x)) translateY(var(--tw-translate-y)) translateZ(var(--tw-translate-z));transform:rotate(var(--tw-rotate)) rotateX(var(--tw-rotate-x)) rotateY(var(--tw-rotate-y)) rotateZ(var(--tw-rotate-z)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)) scaleZ(var(--tw-scale-z)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) translateX(var(--tw-translate-x)) translateY(var(--tw-translate-y)) translateZ(var(--tw-translate-z));--tw-scale-x:1.2;--tw-scale-y:1.2;--tw-scale-z:1.2;-webkit-transition-property:-webkit-transform;-o-transition-property:transform;transition-property:transform, -webkit-transform;-webkit-transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);-o-transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);-webkit-transition-duration:150ms;-o-transition-duration:150ms;transition-duration:150ms;-webkit-transition-duration:500ms;-o-transition-duration:500ms;transition-duration:500ms}.rounded-xl.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{border-radius:0.75rem}.flex.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.flex-col.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;-webkit-flex-direction:column;flex-direction:column}.h-50.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{height:12.5rem}.mb-2.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{margin-bottom:0.5rem}.min-h-50.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{min-height:12.5rem}.min-w-65.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{min-width:16.25rem}.overflow-hidden.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{overflow:hidden}.w-65.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{width:16.25rem}.z-10.svelte-1hw0alb.svelte-1hw0alb.svelte-1hw0alb{z-index:10}",
      map: null
    };
    ImageCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { src: src2, title, location, href } = $$props;
      if ($$props.src === void 0 && $$bindings.src && src2 !== void 0)
        $$bindings.src(src2);
      if ($$props.title === void 0 && $$bindings.title && title !== void 0)
        $$bindings.title(title);
      if ($$props.location === void 0 && $$bindings.location && location !== void 0)
        $$bindings.location(location);
      if ($$props.href === void 0 && $$bindings.href && href !== void 0)
        $$bindings.href(href);
      $$result.css.add(css$12);
      return `<a class="${"flex flex-col w-65 svelte-1hw0alb"}"${add_attribute("href", href, 0)}><div class="${"min-h-50 min-w-65 mb-2 rounded-xl overflow-hidden z-10 svelte-1hw0alb"}"><img${add_attribute("src", src2 || "/picture-holder.png", 0)} alt="${""}" class="${"h-50 w-65 rounded-xl svelte-1hw0alb"}"></div>
	${validate_component(Title, "Title").$$render($$result, {}, {}, { default: () => `${escape(title)}` })}
	${validate_component(LocationMarker, "LocationMarker").$$render($$result, {}, {}, { default: () => `${escape(location)}` })}
</a>`;
    });
    css2 = {
      code: ".hide-scrollbar.svelte-83cnks{scrollbar-width:none;-ms-overflow-style:-ms-autohiding-scrollbar}.hide-scrollbar.svelte-83cnks::-webkit-scrollbar{display:none}.flex.svelte-83cnks{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.justify-start.svelte-83cnks{-webkit-box-pack:start;-ms-flex-pack:start;-webkit-justify-content:flex-start;justify-content:flex-start}.overflow-x-scroll.svelte-83cnks{overflow-x:scroll}.gap-4.svelte-83cnks{grid-gap:1rem;gap:1rem}@media(min-width: 768px){.md\\:justify-between.svelte-83cnks{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between}}",
      map: null
    };
    ImageCardContainer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css2);
      return `<div class="${"flex justify-start md:justify-between gap-4 overflow-x-scroll hide-scrollbar svelte-83cnks"}">${slots.default ? slots.default({}) : ``}
</div>`;
    });
  }
});

// .svelte-kit/output/server/chunks/index-248e85bd.js
var index_248e85bd_exports = {};
__export(index_248e85bd_exports, {
  default: () => Routes
});
function isOutOfViewport(elem) {
  const bounding = elem.getBoundingClientRect();
  const out = {};
  out.top = bounding.top < 0;
  out.left = bounding.left < 0;
  out.bottom = bounding.bottom > (window.innerHeight || document.documentElement.clientHeight);
  out.right = bounding.right > (window.innerWidth || document.documentElement.clientWidth);
  out.any = out.top || out.left || out.bottom || out.right;
  return out;
}
function isItemActive(item, value, optionIdentifier) {
  return value && value[optionIdentifier] === item[optionIdentifier];
}
function isItemFirst(itemIndex) {
  return itemIndex === 0;
}
function isItemHover(hoverItemIndex, item, itemIndex, items) {
  return isItemSelectable(item) && (hoverItemIndex === itemIndex || items.length === 1);
}
function isItemSelectable(item) {
  return item.isGroupHeader && item.isSelectable || item.selectable || !item.hasOwnProperty("selectable");
}
function debounce(func, wait, immediate) {
  let timeout;
  return function executedFunction() {
    let context = this;
    let args = arguments;
    let later = function() {
      timeout = null;
      if (!immediate)
        func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow)
      func.apply(context, args);
  };
}
function convertStringItemsToObjects(_items) {
  return _items.map((item, index) => {
    return { index, value: item, label: `${item}` };
  });
}
var import_axios2, css$f, Item, css$e, List, css$d, Selection, css$c, MultiSelection, css$b, VirtualList, ClearIcon, Object_1, css$a, Select, css$9, Dropdown, css$8, SearchBar, css$7, Button, css$62, HeroSection, css$52, FeatureSection, css$42, EventCard, css$32, RecentEventSection, css$23, PopularPlaceSection, css$13, FoodieSection, css3, Routes;
var init_index_248e85bd = __esm({
  ".svelte-kit/output/server/chunks/index-248e85bd.js"() {
    init_shims();
    init_app_f8d6d072();
    import_axios2 = __toModule(require_axios2());
    init_ImageCardContainer_7bca39b0();
    css$f = {
      code: ".item.svelte-12kv145{cursor:default;height:var(--height, 42px);line-height:var(--height, 42px);padding:var(--itemPadding, 0 20px);color:var(--itemColor, inherit);text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.groupHeader.svelte-12kv145{text-transform:var(--groupTitleTextTransform, uppercase)}.groupItem.svelte-12kv145{padding-left:var(--groupItemPaddingLeft, 40px)}.item.svelte-12kv145:active{background:var(--itemActiveBackground, #b9daff)}.item.active.svelte-12kv145{background:var(--itemIsActiveBG, #007aff);color:var(--itemIsActiveColor, #fff)}.item.notSelectable.svelte-12kv145{color:var(--itemIsNotSelectableColor, #999)}.item.first.svelte-12kv145{border-radius:var(--itemFirstBorderRadius, 4px 4px 0 0)}.item.hover.svelte-12kv145:not(.active){background:var(--itemHoverBG, #e7f2ff);color:var(--itemHoverColor, inherit)}",
      map: null
    };
    Item = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { isActive = false } = $$props;
      let { isFirst = false } = $$props;
      let { isHover = false } = $$props;
      let { isSelectable = false } = $$props;
      let { getOptionLabel = void 0 } = $$props;
      let { item = void 0 } = $$props;
      let { filterText = "" } = $$props;
      let itemClasses = "";
      if ($$props.isActive === void 0 && $$bindings.isActive && isActive !== void 0)
        $$bindings.isActive(isActive);
      if ($$props.isFirst === void 0 && $$bindings.isFirst && isFirst !== void 0)
        $$bindings.isFirst(isFirst);
      if ($$props.isHover === void 0 && $$bindings.isHover && isHover !== void 0)
        $$bindings.isHover(isHover);
      if ($$props.isSelectable === void 0 && $$bindings.isSelectable && isSelectable !== void 0)
        $$bindings.isSelectable(isSelectable);
      if ($$props.getOptionLabel === void 0 && $$bindings.getOptionLabel && getOptionLabel !== void 0)
        $$bindings.getOptionLabel(getOptionLabel);
      if ($$props.item === void 0 && $$bindings.item && item !== void 0)
        $$bindings.item(item);
      if ($$props.filterText === void 0 && $$bindings.filterText && filterText !== void 0)
        $$bindings.filterText(filterText);
      $$result.css.add(css$f);
      {
        {
          const classes = [];
          if (isActive) {
            classes.push("active");
          }
          if (isFirst) {
            classes.push("first");
          }
          if (isHover) {
            classes.push("hover");
          }
          if (item.isGroupHeader) {
            classes.push("groupHeader");
          }
          if (item.isGroupItem) {
            classes.push("groupItem");
          }
          if (!isSelectable) {
            classes.push("notSelectable");
          }
          itemClasses = classes.join(" ");
        }
      }
      return `<div class="${"item " + escape(itemClasses) + " svelte-12kv145"}"><!-- HTML_TAG_START -->${getOptionLabel(item, filterText)}<!-- HTML_TAG_END --></div>`;
    });
    css$e = {
      code: ".listContainer.svelte-hed195{box-shadow:var(--listShadow, 0 2px 3px 0 rgba(44, 62, 80, 0.24));border-radius:var(--listBorderRadius, 4px);max-height:var(--listMaxHeight, 250px);overflow-y:auto;background:var(--listBackground, #fff);border:var(--listBorder, none);position:var(--listPosition, absolute);z-index:var(--listZIndex, 2);width:100%;left:var(--listLeft, 0);right:var(--listRight, 0)}.virtualList.svelte-hed195{height:var(--virtualListHeight, 200px)}.listGroupTitle.svelte-hed195{color:var(--groupTitleColor, #8f8f8f);cursor:default;font-size:var(--groupTitleFontSize, 12px);font-weight:var(--groupTitleFontWeight, 600);height:var(--height, 42px);line-height:var(--height, 42px);padding:var(--groupTitlePadding, 0 20px);text-overflow:ellipsis;overflow-x:hidden;white-space:nowrap;text-transform:var(--groupTitleTextTransform, uppercase)}.empty.svelte-hed195{text-align:var(--listEmptyTextAlign, center);padding:var(--listEmptyPadding, 20px 0);color:var(--listEmptyColor, #78848f)}",
      map: null
    };
    List = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      createEventDispatcher();
      let { container = void 0 } = $$props;
      let { VirtualList: VirtualList2 = null } = $$props;
      let { Item: Item$1 = Item } = $$props;
      let { isVirtualList = false } = $$props;
      let { items = [] } = $$props;
      let { labelIdentifier = "label" } = $$props;
      let { getOptionLabel = (option, filterText2) => {
        if (option)
          return option.isCreator ? `Create "${filterText2}"` : option[labelIdentifier];
      } } = $$props;
      let { getGroupHeaderLabel = null } = $$props;
      let { itemHeight = 40 } = $$props;
      let { hoverItemIndex = 0 } = $$props;
      let { value = void 0 } = $$props;
      let { optionIdentifier = "value" } = $$props;
      let { hideEmptyState = false } = $$props;
      let { noOptionsMessage = "No options" } = $$props;
      let { isMulti = false } = $$props;
      let { activeItemIndex = 0 } = $$props;
      let { filterText = "" } = $$props;
      let { parent = null } = $$props;
      let { listPlacement = null } = $$props;
      let { listAutoWidth = null } = $$props;
      let { listOffset = 5 } = $$props;
      let listStyle;
      function computePlacement() {
        const { top, height, width } = parent.getBoundingClientRect();
        listStyle = "";
        listStyle += `min-width:${width}px;width:${listAutoWidth ? "auto" : "100%"};`;
        if (listPlacement === "top" || listPlacement === "auto" && isOutOfViewport(parent).bottom) {
          listStyle += `bottom:${height + listOffset}px;`;
        } else {
          listStyle += `top:${height + listOffset}px;`;
        }
      }
      if ($$props.container === void 0 && $$bindings.container && container !== void 0)
        $$bindings.container(container);
      if ($$props.VirtualList === void 0 && $$bindings.VirtualList && VirtualList2 !== void 0)
        $$bindings.VirtualList(VirtualList2);
      if ($$props.Item === void 0 && $$bindings.Item && Item$1 !== void 0)
        $$bindings.Item(Item$1);
      if ($$props.isVirtualList === void 0 && $$bindings.isVirtualList && isVirtualList !== void 0)
        $$bindings.isVirtualList(isVirtualList);
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      if ($$props.labelIdentifier === void 0 && $$bindings.labelIdentifier && labelIdentifier !== void 0)
        $$bindings.labelIdentifier(labelIdentifier);
      if ($$props.getOptionLabel === void 0 && $$bindings.getOptionLabel && getOptionLabel !== void 0)
        $$bindings.getOptionLabel(getOptionLabel);
      if ($$props.getGroupHeaderLabel === void 0 && $$bindings.getGroupHeaderLabel && getGroupHeaderLabel !== void 0)
        $$bindings.getGroupHeaderLabel(getGroupHeaderLabel);
      if ($$props.itemHeight === void 0 && $$bindings.itemHeight && itemHeight !== void 0)
        $$bindings.itemHeight(itemHeight);
      if ($$props.hoverItemIndex === void 0 && $$bindings.hoverItemIndex && hoverItemIndex !== void 0)
        $$bindings.hoverItemIndex(hoverItemIndex);
      if ($$props.value === void 0 && $$bindings.value && value !== void 0)
        $$bindings.value(value);
      if ($$props.optionIdentifier === void 0 && $$bindings.optionIdentifier && optionIdentifier !== void 0)
        $$bindings.optionIdentifier(optionIdentifier);
      if ($$props.hideEmptyState === void 0 && $$bindings.hideEmptyState && hideEmptyState !== void 0)
        $$bindings.hideEmptyState(hideEmptyState);
      if ($$props.noOptionsMessage === void 0 && $$bindings.noOptionsMessage && noOptionsMessage !== void 0)
        $$bindings.noOptionsMessage(noOptionsMessage);
      if ($$props.isMulti === void 0 && $$bindings.isMulti && isMulti !== void 0)
        $$bindings.isMulti(isMulti);
      if ($$props.activeItemIndex === void 0 && $$bindings.activeItemIndex && activeItemIndex !== void 0)
        $$bindings.activeItemIndex(activeItemIndex);
      if ($$props.filterText === void 0 && $$bindings.filterText && filterText !== void 0)
        $$bindings.filterText(filterText);
      if ($$props.parent === void 0 && $$bindings.parent && parent !== void 0)
        $$bindings.parent(parent);
      if ($$props.listPlacement === void 0 && $$bindings.listPlacement && listPlacement !== void 0)
        $$bindings.listPlacement(listPlacement);
      if ($$props.listAutoWidth === void 0 && $$bindings.listAutoWidth && listAutoWidth !== void 0)
        $$bindings.listAutoWidth(listAutoWidth);
      if ($$props.listOffset === void 0 && $$bindings.listOffset && listOffset !== void 0)
        $$bindings.listOffset(listOffset);
      $$result.css.add(css$e);
      {
        {
          if (parent && container)
            computePlacement();
        }
      }
      return `

<div class="${["listContainer svelte-hed195", isVirtualList ? "virtualList" : ""].join(" ").trim()}"${add_attribute("style", listStyle, 0)}${add_attribute("this", container, 0)}>${isVirtualList ? `${validate_component(VirtualList2 || missing_component, "svelte:component").$$render($$result, { items, itemHeight }, {}, {
        default: ({ item, i: i2 }) => `<div class="${"listItem"}">${validate_component(Item$1 || missing_component, "svelte:component").$$render($$result, {
          item,
          filterText,
          getOptionLabel,
          isFirst: isItemFirst(i2),
          isActive: isItemActive(item, value, optionIdentifier),
          isHover: isItemHover(hoverItemIndex, item, i2, items),
          isSelectable: isItemSelectable(item)
        }, {}, {})}</div>`
      })}` : `${items.length ? each(items, (item, i2) => `${item.isGroupHeader && !item.isSelectable ? `<div class="${"listGroupTitle svelte-hed195"}">${escape(getGroupHeaderLabel(item))}</div>` : `<div class="${"listItem"}" tabindex="${"-1"}">${validate_component(Item$1 || missing_component, "svelte:component").$$render($$result, {
        item,
        filterText,
        getOptionLabel,
        isFirst: isItemFirst(i2),
        isActive: isItemActive(item, value, optionIdentifier),
        isHover: isItemHover(hoverItemIndex, item, i2, items),
        isSelectable: isItemSelectable(item)
      }, {}, {})}
                </div>`}`) : `${!hideEmptyState ? `<div class="${"empty svelte-hed195"}">${escape(noOptionsMessage)}</div>` : ``}`}`}</div>`;
    });
    css$d = {
      code: ".selection.svelte-shmoh3{text-overflow:ellipsis;overflow-x:hidden;white-space:nowrap}",
      map: null
    };
    Selection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { getSelectionLabel = void 0 } = $$props;
      let { item = void 0 } = $$props;
      if ($$props.getSelectionLabel === void 0 && $$bindings.getSelectionLabel && getSelectionLabel !== void 0)
        $$bindings.getSelectionLabel(getSelectionLabel);
      if ($$props.item === void 0 && $$bindings.item && item !== void 0)
        $$bindings.item(item);
      $$result.css.add(css$d);
      return `<div class="${"selection svelte-shmoh3"}"><!-- HTML_TAG_START -->${getSelectionLabel(item)}<!-- HTML_TAG_END --></div>`;
    });
    css$c = {
      code: ".multiSelectItem.svelte-1kl8nbg.svelte-1kl8nbg{background:var(--multiItemBG, #ebedef);margin:var(--multiItemMargin, 5px 5px 0 0);border-radius:var(--multiItemBorderRadius, 16px);height:var(--multiItemHeight, 32px);line-height:var(--multiItemHeight, 32px);display:flex;cursor:default;padding:var(--multiItemPadding, 0 10px 0 15px);max-width:100%}.multiSelectItem_label.svelte-1kl8nbg.svelte-1kl8nbg{margin:var(--multiLabelMargin, 0 5px 0 0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.multiSelectItem.svelte-1kl8nbg.svelte-1kl8nbg:hover,.multiSelectItem.active.svelte-1kl8nbg.svelte-1kl8nbg{background-color:var(--multiItemActiveBG, #006fff);color:var(--multiItemActiveColor, #fff)}.multiSelectItem.disabled.svelte-1kl8nbg.svelte-1kl8nbg:hover{background:var(--multiItemDisabledHoverBg, #ebedef);color:var(--multiItemDisabledHoverColor, #c1c6cc)}.multiSelectItem_clear.svelte-1kl8nbg.svelte-1kl8nbg{border-radius:var(--multiClearRadius, 50%);background:var(--multiClearBG, #52616f);min-width:var(--multiClearWidth, 16px);max-width:var(--multiClearWidth, 16px);height:var(--multiClearHeight, 16px);position:relative;top:var(--multiClearTop, 8px);text-align:var(--multiClearTextAlign, center);padding:var(--multiClearPadding, 1px)}.multiSelectItem_clear.svelte-1kl8nbg.svelte-1kl8nbg:hover,.active.svelte-1kl8nbg .multiSelectItem_clear.svelte-1kl8nbg{background:var(--multiClearHoverBG, #fff)}.multiSelectItem_clear.svelte-1kl8nbg:hover svg.svelte-1kl8nbg,.active.svelte-1kl8nbg .multiSelectItem_clear svg.svelte-1kl8nbg{fill:var(--multiClearHoverFill, #006fff)}.multiSelectItem_clear.svelte-1kl8nbg svg.svelte-1kl8nbg{fill:var(--multiClearFill, #ebedef);vertical-align:top}",
      map: null
    };
    MultiSelection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      createEventDispatcher();
      let { value = [] } = $$props;
      let { activeValue = void 0 } = $$props;
      let { isDisabled = false } = $$props;
      let { multiFullItemClearable = false } = $$props;
      let { getSelectionLabel = void 0 } = $$props;
      if ($$props.value === void 0 && $$bindings.value && value !== void 0)
        $$bindings.value(value);
      if ($$props.activeValue === void 0 && $$bindings.activeValue && activeValue !== void 0)
        $$bindings.activeValue(activeValue);
      if ($$props.isDisabled === void 0 && $$bindings.isDisabled && isDisabled !== void 0)
        $$bindings.isDisabled(isDisabled);
      if ($$props.multiFullItemClearable === void 0 && $$bindings.multiFullItemClearable && multiFullItemClearable !== void 0)
        $$bindings.multiFullItemClearable(multiFullItemClearable);
      if ($$props.getSelectionLabel === void 0 && $$bindings.getSelectionLabel && getSelectionLabel !== void 0)
        $$bindings.getSelectionLabel(getSelectionLabel);
      $$result.css.add(css$c);
      return `${each(value, (item, i2) => `<div class="${"multiSelectItem " + escape(activeValue === i2 ? "active" : "") + " " + escape(isDisabled ? "disabled" : "") + " svelte-1kl8nbg"}"><div class="${"multiSelectItem_label svelte-1kl8nbg"}"><!-- HTML_TAG_START -->${getSelectionLabel(item)}<!-- HTML_TAG_END --></div>
        ${!isDisabled && !multiFullItemClearable ? `<div class="${"multiSelectItem_clear svelte-1kl8nbg"}"><svg width="${"100%"}" height="${"100%"}" viewBox="${"-2 -2 50 50"}" focusable="${"false"}" aria-hidden="${"true"}" role="${"presentation"}" class="${"svelte-1kl8nbg"}"><path d="${"M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124 l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z"}"></path></svg>
            </div>` : ``}
    </div>`)}`;
    });
    css$b = {
      code: "svelte-virtual-list-viewport.svelte-lwufnu{position:relative;overflow-y:auto;-webkit-overflow-scrolling:touch;display:block}svelte-virtual-list-contents.svelte-lwufnu,svelte-virtual-list-row.svelte-lwufnu{display:block}svelte-virtual-list-row.svelte-lwufnu{overflow:hidden}",
      map: null
    };
    VirtualList = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { items = void 0 } = $$props;
      let { height = "100%" } = $$props;
      let { itemHeight = 40 } = $$props;
      let { hoverItemIndex = 0 } = $$props;
      let { start = 0 } = $$props;
      let { end = 0 } = $$props;
      let viewport;
      let contents;
      let visible;
      let top = 0;
      let bottom = 0;
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      if ($$props.height === void 0 && $$bindings.height && height !== void 0)
        $$bindings.height(height);
      if ($$props.itemHeight === void 0 && $$bindings.itemHeight && itemHeight !== void 0)
        $$bindings.itemHeight(itemHeight);
      if ($$props.hoverItemIndex === void 0 && $$bindings.hoverItemIndex && hoverItemIndex !== void 0)
        $$bindings.hoverItemIndex(hoverItemIndex);
      if ($$props.start === void 0 && $$bindings.start && start !== void 0)
        $$bindings.start(start);
      if ($$props.end === void 0 && $$bindings.end && end !== void 0)
        $$bindings.end(end);
      $$result.css.add(css$b);
      visible = items.slice(start, end).map((data, i2) => {
        return { index: i2 + start, data };
      });
      return `<svelte-virtual-list-viewport style="${"height: " + escape(height) + ";"}" class="${"svelte-lwufnu"}"${add_attribute("this", viewport, 0)}><svelte-virtual-list-contents style="${"padding-top: " + escape(top) + "px; padding-bottom: " + escape(bottom) + "px;"}" class="${"svelte-lwufnu"}"${add_attribute("this", contents, 0)}>${each(visible, (row) => `<svelte-virtual-list-row class="${"svelte-lwufnu"}">${slots.default ? slots.default({
        item: row.data,
        i: row.index,
        hoverItemIndex
      }) : `Missing template`}
            </svelte-virtual-list-row>`)}</svelte-virtual-list-contents></svelte-virtual-list-viewport>`;
    });
    ClearIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<svg width="${"100%"}" height="${"100%"}" viewBox="${"-2 -2 50 50"}" focusable="${"false"}" aria-hidden="${"true"}" role="${"presentation"}"><path fill="${"currentColor"}" d="${"M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124\n    l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z"}"></path></svg>`;
    });
    ({ Object: Object_1 } = globals);
    css$a = {
      code: '.selectContainer.svelte-pcz5l5.svelte-pcz5l5{--internalPadding:0 16px;border:var(--border, 1px solid #d8dbdf);border-radius:var(--borderRadius, 3px);box-sizing:border-box;height:var(--height, 42px);position:relative;display:flex;align-items:center;padding:var(--padding, var(--internalPadding));background:var(--background, #fff);margin:var(--margin, 0)}.selectContainer.svelte-pcz5l5 input.svelte-pcz5l5{cursor:default;border:none;color:var(--inputColor, #3f4f5f);height:var(--height, 42px);line-height:var(--height, 42px);padding:var(--inputPadding, var(--padding, var(--internalPadding)));width:100%;background:transparent;font-size:var(--inputFontSize, 14px);letter-spacing:var(--inputLetterSpacing, -0.08px);position:absolute;left:var(--inputLeft, 0);margin:var(--inputMargin, 0)}.selectContainer.svelte-pcz5l5 input.svelte-pcz5l5::placeholder{color:var(--placeholderColor, #78848f);opacity:var(--placeholderOpacity, 1)}.selectContainer.svelte-pcz5l5 input.svelte-pcz5l5:focus{outline:none}.selectContainer.svelte-pcz5l5.svelte-pcz5l5:hover{border-color:var(--borderHoverColor, #b2b8bf)}.selectContainer.focused.svelte-pcz5l5.svelte-pcz5l5{border-color:var(--borderFocusColor, #006fe8)}.selectContainer.disabled.svelte-pcz5l5.svelte-pcz5l5{background:var(--disabledBackground, #ebedef);border-color:var(--disabledBorderColor, #ebedef);color:var(--disabledColor, #c1c6cc)}.selectContainer.disabled.svelte-pcz5l5 input.svelte-pcz5l5::placeholder{color:var(--disabledPlaceholderColor, #c1c6cc);opacity:var(--disabledPlaceholderOpacity, 1)}.selectedItem.svelte-pcz5l5.svelte-pcz5l5{line-height:var(--height, 42px);height:var(--height, 42px);overflow-x:hidden;padding:var(--selectedItemPadding, 0 20px 0 0)}.selectedItem.svelte-pcz5l5.svelte-pcz5l5:focus{outline:none}.clearSelect.svelte-pcz5l5.svelte-pcz5l5{position:absolute;right:var(--clearSelectRight, 10px);top:var(--clearSelectTop, 11px);bottom:var(--clearSelectBottom, 11px);width:var(--clearSelectWidth, 20px);color:var(--clearSelectColor, #c5cacf);flex:none !important}.clearSelect.svelte-pcz5l5.svelte-pcz5l5:hover{color:var(--clearSelectHoverColor, #2c3e50)}.selectContainer.focused.svelte-pcz5l5 .clearSelect.svelte-pcz5l5{color:var(--clearSelectFocusColor, #3f4f5f)}.indicator.svelte-pcz5l5.svelte-pcz5l5{position:absolute;right:var(--indicatorRight, 10px);top:var(--indicatorTop, 11px);width:var(--indicatorWidth, 20px);height:var(--indicatorHeight, 20px);color:var(--indicatorColor, #c5cacf)}.indicator.svelte-pcz5l5 svg.svelte-pcz5l5{display:inline-block;fill:var(--indicatorFill, currentcolor);line-height:1;stroke:var(--indicatorStroke, currentcolor);stroke-width:0}.spinner.svelte-pcz5l5.svelte-pcz5l5{position:absolute;right:var(--spinnerRight, 10px);top:var(--spinnerLeft, 11px);width:var(--spinnerWidth, 20px);height:var(--spinnerHeight, 20px);color:var(--spinnerColor, #51ce6c);animation:rotate 0.75s linear infinite}.spinner_icon.svelte-pcz5l5.svelte-pcz5l5{display:block;height:100%;transform-origin:center center;width:100%;position:absolute;top:0;bottom:0;left:0;right:0;margin:auto;-webkit-transform:none}.spinner_path.svelte-pcz5l5.svelte-pcz5l5{stroke-dasharray:90;stroke-linecap:round}.multiSelect.svelte-pcz5l5.svelte-pcz5l5{display:flex;padding:var(--multiSelectPadding, 0 35px 0 16px);height:auto;flex-wrap:wrap;align-items:stretch}.multiSelect.svelte-pcz5l5>.svelte-pcz5l5{flex:1 1 50px}.selectContainer.multiSelect.svelte-pcz5l5 input.svelte-pcz5l5{padding:var(--multiSelectInputPadding, 0);position:relative;margin:var(--multiSelectInputMargin, 0)}.hasError.svelte-pcz5l5.svelte-pcz5l5{border:var(--errorBorder, 1px solid #ff2d55);background:var(--errorBackground, #fff)}.a11yText.svelte-pcz5l5.svelte-pcz5l5{z-index:9999;border:0px;clip:rect(1px, 1px, 1px, 1px);height:1px;width:1px;position:absolute;overflow:hidden;padding:0px;white-space:nowrap}[fill~="none"].svelte-pcz5l5.svelte-pcz5l5{fill:none}',
      map: null
    };
    Select = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let filteredItems;
      let showSelectedItem;
      let showClearIcon;
      let placeholderText;
      let showMultiSelect;
      let listProps;
      let ariaSelection;
      let ariaContext;
      const dispatch = createEventDispatcher();
      let { id = null } = $$props;
      let { container = void 0 } = $$props;
      let { input = void 0 } = $$props;
      let { isMulti = false } = $$props;
      let { multiFullItemClearable = false } = $$props;
      let { isDisabled = false } = $$props;
      let { isCreatable = false } = $$props;
      let { isFocused = false } = $$props;
      let { value = null } = $$props;
      let { filterText = "" } = $$props;
      let { placeholder = "Select..." } = $$props;
      let { placeholderAlwaysShow = false } = $$props;
      let { items = null } = $$props;
      let { itemFilter = (label, filterText2, option) => `${label}`.toLowerCase().includes(filterText2.toLowerCase()) } = $$props;
      let { groupBy = void 0 } = $$props;
      let { groupFilter = (groups) => groups } = $$props;
      let { isGroupHeaderSelectable = false } = $$props;
      let { getGroupHeaderLabel = (option) => {
        return option[labelIdentifier] || option.id;
      } } = $$props;
      let { labelIdentifier = "label" } = $$props;
      let { getOptionLabel = (option, filterText2) => {
        return option.isCreator ? `Create "${filterText2}"` : option[labelIdentifier];
      } } = $$props;
      let { optionIdentifier = "value" } = $$props;
      let { loadOptions = void 0 } = $$props;
      let { hasError = false } = $$props;
      let { containerStyles = "" } = $$props;
      let { getSelectionLabel = (option) => {
        if (option)
          return option[labelIdentifier];
        else
          return null;
      } } = $$props;
      let { createGroupHeaderItem = (groupValue) => {
        return { value: groupValue, label: groupValue };
      } } = $$props;
      let { createItem = (filterText2) => {
        return { value: filterText2, label: filterText2 };
      } } = $$props;
      const getFilteredItems = () => {
        return filteredItems;
      };
      let { isSearchable = true } = $$props;
      let { inputStyles = "" } = $$props;
      let { isClearable = true } = $$props;
      let { isWaiting = false } = $$props;
      let { listPlacement = "auto" } = $$props;
      let { listOpen = false } = $$props;
      let { isVirtualList = false } = $$props;
      let { loadOptionsInterval = 300 } = $$props;
      let { noOptionsMessage = "No options" } = $$props;
      let { hideEmptyState = false } = $$props;
      let { inputAttributes = {} } = $$props;
      let { listAutoWidth = true } = $$props;
      let { itemHeight = 40 } = $$props;
      let { Icon = void 0 } = $$props;
      let { iconProps = {} } = $$props;
      let { showChevron = false } = $$props;
      let { showIndicator = false } = $$props;
      let { containerClasses = "" } = $$props;
      let { indicatorSvg = void 0 } = $$props;
      let { listOffset = 5 } = $$props;
      let { ClearIcon: ClearIcon$1 = ClearIcon } = $$props;
      let { Item: Item$1 = Item } = $$props;
      let { List: List$1 = List } = $$props;
      let { Selection: Selection$1 = Selection } = $$props;
      let { MultiSelection: MultiSelection$1 = MultiSelection } = $$props;
      let { VirtualList: VirtualList$1 = VirtualList } = $$props;
      function filterMethod(args) {
        if (args.loadOptions && args.filterText.length > 0)
          return;
        if (!args.items)
          return [];
        if (args.items && args.items.length > 0 && typeof args.items[0] !== "object") {
          args.items = convertStringItemsToObjects(args.items);
        }
        let filterResults = args.items.filter((item) => {
          let matchesFilter = itemFilter(getOptionLabel(item, args.filterText), args.filterText, item);
          if (matchesFilter && args.isMulti && args.value && Array.isArray(args.value)) {
            matchesFilter = !args.value.some((x2) => {
              return x2[args.optionIdentifier] === item[args.optionIdentifier];
            });
          }
          return matchesFilter;
        });
        if (args.groupBy) {
          filterResults = filterGroupedItems(filterResults);
        }
        if (args.isCreatable) {
          filterResults = addCreatableItem(filterResults, args.filterText);
        }
        return filterResults;
      }
      function addCreatableItem(_items, _filterText) {
        if (_filterText.length === 0)
          return _items;
        const itemToCreate = createItem(_filterText);
        if (_items[0] && _filterText === _items[0][labelIdentifier])
          return _items;
        itemToCreate.isCreator = true;
        return [..._items, itemToCreate];
      }
      let { selectedValue = null } = $$props;
      let activeValue;
      let prev_value;
      let prev_filterText;
      let prev_isFocused;
      let hoverItemIndex;
      const getItems = debounce(async () => {
        isWaiting = true;
        let res = await loadOptions(filterText).catch((err) => {
          console.warn("svelte-select loadOptions error :>> ", err);
          dispatch("error", { type: "loadOptions", details: err });
        });
        if (res && !res.cancelled) {
          if (res) {
            if (res && res.length > 0 && typeof res[0] !== "object") {
              res = convertStringItemsToObjects(res);
            }
            filteredItems = [...res];
            dispatch("loaded", { items: filteredItems });
          } else {
            filteredItems = [];
          }
          if (isCreatable) {
            filteredItems = addCreatableItem(filteredItems, filterText);
          }
          isWaiting = false;
          isFocused = true;
          listOpen = true;
        }
      }, loadOptionsInterval);
      function setValue() {
        if (typeof value === "string") {
          value = { [optionIdentifier]: value, label: value };
        } else if (isMulti && Array.isArray(value) && value.length > 0) {
          value = value.map((item) => typeof item === "string" ? { value: item, label: item } : item);
        }
      }
      let _inputAttributes;
      function assignInputAttributes() {
        _inputAttributes = Object.assign({
          autocapitalize: "none",
          autocomplete: "off",
          autocorrect: "off",
          spellcheck: false,
          tabindex: 0,
          type: "text",
          "aria-autocomplete": "list"
        }, inputAttributes);
        if (id) {
          _inputAttributes.id = id;
        }
        if (!isSearchable) {
          _inputAttributes.readonly = true;
        }
      }
      function filterGroupedItems(_items) {
        const groupValues = [];
        const groups = {};
        _items.forEach((item) => {
          const groupValue = groupBy(item);
          if (!groupValues.includes(groupValue)) {
            groupValues.push(groupValue);
            groups[groupValue] = [];
            if (groupValue) {
              groups[groupValue].push(Object.assign(createGroupHeaderItem(groupValue, item), {
                id: groupValue,
                isGroupHeader: true,
                isSelectable: isGroupHeaderSelectable
              }));
            }
          }
          groups[groupValue].push(Object.assign({ isGroupItem: !!groupValue }, item));
        });
        const sortedGroupedItems = [];
        groupFilter(groupValues).forEach((groupValue) => {
          sortedGroupedItems.push(...groups[groupValue]);
        });
        return sortedGroupedItems;
      }
      function dispatchSelectedItem() {
        if (isMulti) {
          if (JSON.stringify(value) !== JSON.stringify(prev_value)) {
            if (checkValueForDuplicates()) {
              dispatch("select", value);
            }
          }
          return;
        }
        {
          dispatch("select", value);
        }
      }
      function setupFocus() {
        if (isFocused || listOpen) {
          handleFocus();
        } else {
          if (input)
            input.blur();
        }
      }
      function setupMulti() {
        if (value) {
          if (Array.isArray(value)) {
            value = [...value];
          } else {
            value = [value];
          }
        }
      }
      function setupFilterText() {
        if (filterText.length === 0)
          return;
        isFocused = true;
        listOpen = true;
        if (loadOptions) {
          getItems();
        } else {
          listOpen = true;
          if (isMulti) {
            activeValue = void 0;
          }
        }
      }
      function checkValueForDuplicates() {
        let noDuplicates = true;
        if (value) {
          const ids = [];
          const uniqueValues = [];
          value.forEach((val) => {
            if (!ids.includes(val[optionIdentifier])) {
              ids.push(val[optionIdentifier]);
              uniqueValues.push(val);
            } else {
              noDuplicates = false;
            }
          });
          if (!noDuplicates)
            value = uniqueValues;
        }
        return noDuplicates;
      }
      function findItem(selection) {
        let matchTo = selection ? selection[optionIdentifier] : value[optionIdentifier];
        return items.find((item) => item[optionIdentifier] === matchTo);
      }
      function updateValueDisplay(items2) {
        if (!items2 || items2.length === 0 || items2.some((item) => typeof item !== "object"))
          return;
        if (!value || (isMulti ? value.some((selection) => !selection || !selection[optionIdentifier]) : !value[optionIdentifier]))
          return;
        if (Array.isArray(value)) {
          value = value.map((selection) => findItem(selection) || selection);
        } else {
          value = findItem() || value;
        }
      }
      function handleFocus() {
        isFocused = true;
        if (input)
          input.focus();
      }
      function handleClear() {
        value = void 0;
        listOpen = false;
        dispatch("clear", value);
        handleFocus();
      }
      let { ariaValues = (values) => {
        return `Option ${values}, selected.`;
      } } = $$props;
      let { ariaListOpen = (label, count) => {
        return `You are currently focused on option ${label}. There are ${count} results available.`;
      } } = $$props;
      let { ariaFocused = () => {
        return `Select is focused, type to refine list, press down to open the menu.`;
      } } = $$props;
      function handleAriaSelection() {
        let selected = void 0;
        if (isMulti && value.length > 0) {
          selected = value.map((v2) => getSelectionLabel(v2)).join(", ");
        } else {
          selected = getSelectionLabel(value);
        }
        return ariaValues(selected);
      }
      function handleAriaContent() {
        if (!isFocused || !filteredItems || filteredItems.length === 0)
          return "";
        let _item = filteredItems[hoverItemIndex];
        if (listOpen && _item) {
          let label = getSelectionLabel(_item);
          let count = filteredItems ? filteredItems.length : 0;
          return ariaListOpen(label, count);
        } else {
          return ariaFocused();
        }
      }
      if ($$props.id === void 0 && $$bindings.id && id !== void 0)
        $$bindings.id(id);
      if ($$props.container === void 0 && $$bindings.container && container !== void 0)
        $$bindings.container(container);
      if ($$props.input === void 0 && $$bindings.input && input !== void 0)
        $$bindings.input(input);
      if ($$props.isMulti === void 0 && $$bindings.isMulti && isMulti !== void 0)
        $$bindings.isMulti(isMulti);
      if ($$props.multiFullItemClearable === void 0 && $$bindings.multiFullItemClearable && multiFullItemClearable !== void 0)
        $$bindings.multiFullItemClearable(multiFullItemClearable);
      if ($$props.isDisabled === void 0 && $$bindings.isDisabled && isDisabled !== void 0)
        $$bindings.isDisabled(isDisabled);
      if ($$props.isCreatable === void 0 && $$bindings.isCreatable && isCreatable !== void 0)
        $$bindings.isCreatable(isCreatable);
      if ($$props.isFocused === void 0 && $$bindings.isFocused && isFocused !== void 0)
        $$bindings.isFocused(isFocused);
      if ($$props.value === void 0 && $$bindings.value && value !== void 0)
        $$bindings.value(value);
      if ($$props.filterText === void 0 && $$bindings.filterText && filterText !== void 0)
        $$bindings.filterText(filterText);
      if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholder !== void 0)
        $$bindings.placeholder(placeholder);
      if ($$props.placeholderAlwaysShow === void 0 && $$bindings.placeholderAlwaysShow && placeholderAlwaysShow !== void 0)
        $$bindings.placeholderAlwaysShow(placeholderAlwaysShow);
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      if ($$props.itemFilter === void 0 && $$bindings.itemFilter && itemFilter !== void 0)
        $$bindings.itemFilter(itemFilter);
      if ($$props.groupBy === void 0 && $$bindings.groupBy && groupBy !== void 0)
        $$bindings.groupBy(groupBy);
      if ($$props.groupFilter === void 0 && $$bindings.groupFilter && groupFilter !== void 0)
        $$bindings.groupFilter(groupFilter);
      if ($$props.isGroupHeaderSelectable === void 0 && $$bindings.isGroupHeaderSelectable && isGroupHeaderSelectable !== void 0)
        $$bindings.isGroupHeaderSelectable(isGroupHeaderSelectable);
      if ($$props.getGroupHeaderLabel === void 0 && $$bindings.getGroupHeaderLabel && getGroupHeaderLabel !== void 0)
        $$bindings.getGroupHeaderLabel(getGroupHeaderLabel);
      if ($$props.labelIdentifier === void 0 && $$bindings.labelIdentifier && labelIdentifier !== void 0)
        $$bindings.labelIdentifier(labelIdentifier);
      if ($$props.getOptionLabel === void 0 && $$bindings.getOptionLabel && getOptionLabel !== void 0)
        $$bindings.getOptionLabel(getOptionLabel);
      if ($$props.optionIdentifier === void 0 && $$bindings.optionIdentifier && optionIdentifier !== void 0)
        $$bindings.optionIdentifier(optionIdentifier);
      if ($$props.loadOptions === void 0 && $$bindings.loadOptions && loadOptions !== void 0)
        $$bindings.loadOptions(loadOptions);
      if ($$props.hasError === void 0 && $$bindings.hasError && hasError !== void 0)
        $$bindings.hasError(hasError);
      if ($$props.containerStyles === void 0 && $$bindings.containerStyles && containerStyles !== void 0)
        $$bindings.containerStyles(containerStyles);
      if ($$props.getSelectionLabel === void 0 && $$bindings.getSelectionLabel && getSelectionLabel !== void 0)
        $$bindings.getSelectionLabel(getSelectionLabel);
      if ($$props.createGroupHeaderItem === void 0 && $$bindings.createGroupHeaderItem && createGroupHeaderItem !== void 0)
        $$bindings.createGroupHeaderItem(createGroupHeaderItem);
      if ($$props.createItem === void 0 && $$bindings.createItem && createItem !== void 0)
        $$bindings.createItem(createItem);
      if ($$props.getFilteredItems === void 0 && $$bindings.getFilteredItems && getFilteredItems !== void 0)
        $$bindings.getFilteredItems(getFilteredItems);
      if ($$props.isSearchable === void 0 && $$bindings.isSearchable && isSearchable !== void 0)
        $$bindings.isSearchable(isSearchable);
      if ($$props.inputStyles === void 0 && $$bindings.inputStyles && inputStyles !== void 0)
        $$bindings.inputStyles(inputStyles);
      if ($$props.isClearable === void 0 && $$bindings.isClearable && isClearable !== void 0)
        $$bindings.isClearable(isClearable);
      if ($$props.isWaiting === void 0 && $$bindings.isWaiting && isWaiting !== void 0)
        $$bindings.isWaiting(isWaiting);
      if ($$props.listPlacement === void 0 && $$bindings.listPlacement && listPlacement !== void 0)
        $$bindings.listPlacement(listPlacement);
      if ($$props.listOpen === void 0 && $$bindings.listOpen && listOpen !== void 0)
        $$bindings.listOpen(listOpen);
      if ($$props.isVirtualList === void 0 && $$bindings.isVirtualList && isVirtualList !== void 0)
        $$bindings.isVirtualList(isVirtualList);
      if ($$props.loadOptionsInterval === void 0 && $$bindings.loadOptionsInterval && loadOptionsInterval !== void 0)
        $$bindings.loadOptionsInterval(loadOptionsInterval);
      if ($$props.noOptionsMessage === void 0 && $$bindings.noOptionsMessage && noOptionsMessage !== void 0)
        $$bindings.noOptionsMessage(noOptionsMessage);
      if ($$props.hideEmptyState === void 0 && $$bindings.hideEmptyState && hideEmptyState !== void 0)
        $$bindings.hideEmptyState(hideEmptyState);
      if ($$props.inputAttributes === void 0 && $$bindings.inputAttributes && inputAttributes !== void 0)
        $$bindings.inputAttributes(inputAttributes);
      if ($$props.listAutoWidth === void 0 && $$bindings.listAutoWidth && listAutoWidth !== void 0)
        $$bindings.listAutoWidth(listAutoWidth);
      if ($$props.itemHeight === void 0 && $$bindings.itemHeight && itemHeight !== void 0)
        $$bindings.itemHeight(itemHeight);
      if ($$props.Icon === void 0 && $$bindings.Icon && Icon !== void 0)
        $$bindings.Icon(Icon);
      if ($$props.iconProps === void 0 && $$bindings.iconProps && iconProps !== void 0)
        $$bindings.iconProps(iconProps);
      if ($$props.showChevron === void 0 && $$bindings.showChevron && showChevron !== void 0)
        $$bindings.showChevron(showChevron);
      if ($$props.showIndicator === void 0 && $$bindings.showIndicator && showIndicator !== void 0)
        $$bindings.showIndicator(showIndicator);
      if ($$props.containerClasses === void 0 && $$bindings.containerClasses && containerClasses !== void 0)
        $$bindings.containerClasses(containerClasses);
      if ($$props.indicatorSvg === void 0 && $$bindings.indicatorSvg && indicatorSvg !== void 0)
        $$bindings.indicatorSvg(indicatorSvg);
      if ($$props.listOffset === void 0 && $$bindings.listOffset && listOffset !== void 0)
        $$bindings.listOffset(listOffset);
      if ($$props.ClearIcon === void 0 && $$bindings.ClearIcon && ClearIcon$1 !== void 0)
        $$bindings.ClearIcon(ClearIcon$1);
      if ($$props.Item === void 0 && $$bindings.Item && Item$1 !== void 0)
        $$bindings.Item(Item$1);
      if ($$props.List === void 0 && $$bindings.List && List$1 !== void 0)
        $$bindings.List(List$1);
      if ($$props.Selection === void 0 && $$bindings.Selection && Selection$1 !== void 0)
        $$bindings.Selection(Selection$1);
      if ($$props.MultiSelection === void 0 && $$bindings.MultiSelection && MultiSelection$1 !== void 0)
        $$bindings.MultiSelection(MultiSelection$1);
      if ($$props.VirtualList === void 0 && $$bindings.VirtualList && VirtualList$1 !== void 0)
        $$bindings.VirtualList(VirtualList$1);
      if ($$props.selectedValue === void 0 && $$bindings.selectedValue && selectedValue !== void 0)
        $$bindings.selectedValue(selectedValue);
      if ($$props.handleClear === void 0 && $$bindings.handleClear && handleClear !== void 0)
        $$bindings.handleClear(handleClear);
      if ($$props.ariaValues === void 0 && $$bindings.ariaValues && ariaValues !== void 0)
        $$bindings.ariaValues(ariaValues);
      if ($$props.ariaListOpen === void 0 && $$bindings.ariaListOpen && ariaListOpen !== void 0)
        $$bindings.ariaListOpen(ariaListOpen);
      if ($$props.ariaFocused === void 0 && $$bindings.ariaFocused && ariaFocused !== void 0)
        $$bindings.ariaFocused(ariaFocused);
      $$result.css.add(css$a);
      let $$settled;
      let $$rendered;
      do {
        $$settled = true;
        filteredItems = filterMethod({
          loadOptions,
          filterText,
          items,
          value,
          isMulti,
          optionIdentifier,
          groupBy,
          isCreatable
        });
        {
          {
            if (selectedValue)
              console.warn("selectedValue is no longer used. Please use value instead.");
          }
        }
        {
          updateValueDisplay(items);
        }
        {
          {
            if (value)
              setValue();
          }
        }
        {
          {
            if (inputAttributes || !isSearchable)
              assignInputAttributes();
          }
        }
        {
          {
            if (isMulti) {
              setupMulti();
            }
          }
        }
        {
          {
            if (isMulti && value && value.length > 1) {
              checkValueForDuplicates();
            }
          }
        }
        {
          {
            if (value)
              dispatchSelectedItem();
          }
        }
        {
          {
            if (!value && isMulti && prev_value) {
              dispatch("select", value);
            }
          }
        }
        {
          {
            if (isFocused !== prev_isFocused) {
              setupFocus();
            }
          }
        }
        {
          {
            if (filterText !== prev_filterText) {
              setupFilterText();
            }
          }
        }
        showSelectedItem = value && filterText.length === 0;
        showClearIcon = showSelectedItem && isClearable && !isDisabled && !isWaiting;
        placeholderText = placeholderAlwaysShow && isMulti ? placeholder : value ? "" : placeholder;
        showMultiSelect = isMulti && value && value.length > 0;
        listProps = {
          Item: Item$1,
          filterText,
          optionIdentifier,
          noOptionsMessage,
          hideEmptyState,
          isVirtualList,
          VirtualList: VirtualList$1,
          value,
          isMulti,
          getGroupHeaderLabel,
          items: filteredItems,
          itemHeight,
          getOptionLabel,
          listPlacement,
          parent: container,
          listAutoWidth,
          listOffset
        };
        ariaSelection = value ? handleAriaSelection() : "";
        ariaContext = handleAriaContent();
        $$rendered = `

<div class="${[
          "selectContainer " + escape(containerClasses) + " svelte-pcz5l5",
          (hasError ? "hasError" : "") + " " + (isMulti ? "multiSelect" : "") + " " + (isDisabled ? "disabled" : "") + " " + (isFocused ? "focused" : "")
        ].join(" ").trim()}"${add_attribute("style", containerStyles, 0)}${add_attribute("this", container, 0)}><span aria-live="${"polite"}" aria-atomic="${"false"}" aria-relevant="${"additions text"}" class="${"a11yText svelte-pcz5l5"}">${isFocused ? `<span id="${"aria-selection"}">${escape(ariaSelection)}</span>
            <span id="${"aria-context"}">${escape(ariaContext)}</span>` : ``}</span>

    ${Icon ? `${validate_component(Icon || missing_component, "svelte:component").$$render($$result, Object_1.assign(iconProps), {}, {})}` : ``}

    ${showMultiSelect ? `${validate_component(MultiSelection$1 || missing_component, "svelte:component").$$render($$result, {
          value,
          getSelectionLabel,
          activeValue,
          isDisabled,
          multiFullItemClearable
        }, {}, {})}` : ``}

    <input${spread([
          { readonly: !isSearchable || null },
          escape_object(_inputAttributes),
          {
            placeholder: escape_attribute_value(placeholderText)
          },
          {
            style: escape_attribute_value(inputStyles)
          },
          { disabled: isDisabled || null }
        ], "svelte-pcz5l5")}${add_attribute("this", input, 0)}${add_attribute("value", filterText, 0)}>

    ${!isMulti && showSelectedItem ? `<div class="${"selectedItem svelte-pcz5l5"}">${validate_component(Selection$1 || missing_component, "svelte:component").$$render($$result, { item: value, getSelectionLabel }, {}, {})}</div>` : ``}

    ${showClearIcon ? `<div class="${"clearSelect svelte-pcz5l5"}" aria-hidden="${"true"}">${validate_component(ClearIcon$1 || missing_component, "svelte:component").$$render($$result, {}, {}, {})}</div>` : ``}

    ${!showClearIcon && (showIndicator || showChevron && !value || !isSearchable && !isDisabled && !isWaiting && (showSelectedItem && !isClearable || !showSelectedItem)) ? `<div class="${"indicator svelte-pcz5l5"}" aria-hidden="${"true"}">${indicatorSvg ? `<!-- HTML_TAG_START -->${indicatorSvg}<!-- HTML_TAG_END -->` : `<svg width="${"100%"}" height="${"100%"}" viewBox="${"0 0 20 20"}" focusable="${"false"}" aria-hidden="${"true"}" class="${"svelte-pcz5l5"}"><path d="${"M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747\n          3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0\n          1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502\n          0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0\n          0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"}"></path></svg>`}</div>` : ``}

    ${isWaiting ? `<div class="${"spinner svelte-pcz5l5"}"><svg class="${"spinner_icon svelte-pcz5l5"}" viewBox="${"25 25 50 50"}"><circle class="${"spinner_path svelte-pcz5l5"}" cx="${"50"}" cy="${"50"}" r="${"20"}" fill="${"none"}" stroke="${"currentColor"}" stroke-width="${"5"}" stroke-miterlimit="${"10"}"></circle></svg></div>` : ``}

    ${listOpen ? `${validate_component(List$1 || missing_component, "svelte:component").$$render($$result, Object_1.assign(listProps, { hoverItemIndex }), {
          hoverItemIndex: ($$value) => {
            hoverItemIndex = $$value;
            $$settled = false;
          }
        }, {})}` : ``}

    ${!isMulti || isMulti && !showMultiSelect ? `<input${add_attribute("name", inputAttributes.name, 0)} type="${"hidden"}"${add_attribute("value", value ? getSelectionLabel(value) : null, 0)} class="${"svelte-pcz5l5"}">` : ``}

    ${isMulti && showMultiSelect ? `${each(value, (item) => `<input${add_attribute("name", inputAttributes.name, 0)} type="${"hidden"}"${add_attribute("value", item ? getSelectionLabel(item) : null, 0)} class="${"svelte-pcz5l5"}">`)}` : ``}</div>`;
      } while (!$$settled);
      return $$rendered;
    });
    css$9 = {
      code: ".themed-svelte-select.svelte-1vio1xv{--itemColor:#2f2f2f;--indicatorColor:#737373;--borderFocusColor:#6e7d60;--itemIsActiveBG:var(--borderFocusColor);--indicatorTop:10px;--itemHoverBG:#6e7d6028;--padding:1.5rem 1rem;color:var(--borderFocusColor)}.flex.svelte-1vio1xv{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.flex-col.svelte-1vio1xv{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;-webkit-flex-direction:column;flex-direction:column}.justify-end.svelte-1vio1xv{-webkit-box-pack:end;-ms-flex-pack:end;-webkit-justify-content:flex-end;justify-content:flex-end}",
      map: null
    };
    Dropdown = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { items = [] } = $$props;
      let { value = null } = $$props;
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      if ($$props.value === void 0 && $$bindings.value && value !== void 0)
        $$bindings.value(value);
      $$result.css.add(css$9);
      return `<div class="${"themed-svelte-select flex flex-col justify-end svelte-1vio1xv"}">${validate_component(Select, "Select").$$render($$result, {
        isClearable: false,
        items,
        value,
        showIndicator: true
      }, {}, {})}
</div>`;
    });
    css$8 = {
      code: "input.svelte-xncue4{background:#f9f9f9;color:#2f2f2f}input.svelte-xncue4:focus{border:1px solid #6e7d60}.rounded.svelte-xncue4{border-radius:0.25rem}.border.svelte-xncue4{border-width:1px}.outline-none.svelte-xncue4{outline:2px solid transparent;outline-offset:2px}.px-4.svelte-xncue4{padding-left:1rem;padding-right:1rem}.py-2.svelte-xncue4{padding-top:0.5rem;padding-bottom:0.5rem}",
      map: null
    };
    SearchBar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { placeholder = "\u641C\u5C0B ..." } = $$props;
      let { value = "" } = $$props;
      if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholder !== void 0)
        $$bindings.placeholder(placeholder);
      if ($$props.value === void 0 && $$bindings.value && value !== void 0)
        $$bindings.value(value);
      $$result.css.add(css$8);
      return `<input type="${"text"}" class="${"px-4 py-2 rounded border outline-none svelte-xncue4"}"${add_attribute("placeholder", placeholder, 0)}${add_attribute("value", value, 0)}>`;
    });
    css$7 = {
      code: "button.svelte-14khgis{background:#7f977b;color:white}button.svelte-14khgis:hover{background:#6e7d60}.rounded.svelte-14khgis{border-radius:0.25rem}.cursor-pointer.svelte-14khgis{cursor:pointer}.block.svelte-14khgis{display:block}.px-4.svelte-14khgis{padding-left:1rem;padding-right:1rem}.py-2.svelte-14khgis{padding-top:0.5rem;padding-bottom:0.5rem}.text-center.svelte-14khgis{text-align:center}.tracking-1\\.5rem.svelte-14khgis{letter-spacing:1.5rem}",
      map: null
    };
    Button = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css$7);
      return `<button class="${"block px-4 py-2 rounded text-center cursor-pointer tracking-1.5rem svelte-14khgis"}">${slots.default ? slots.default({}) : ``}
</button>`;
    });
    css$62 = {
      code: ".slogan-highlight.svelte-4o4p92{border-bottom:2px solid #e0da48}.intro.svelte-4o4p92{color:#646464;font-family:Noto Sans TC}.inline.svelte-4o4p92{display:inline}.flex.svelte-4o4p92{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.grid.svelte-4o4p92{display:-ms-grid;display:grid}.flex-col.svelte-4o4p92{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;-webkit-flex-direction:column;flex-direction:column}.justify-around.svelte-4o4p92{-ms-flex-pack:distribute;-webkit-justify-content:space-around;justify-content:space-around}.justify-evenly.svelte-4o4p92{-webkit-box-pack:space-evenly;-ms-flex-pack:space-evenly;-webkit-justify-content:space-evenly;justify-content:space-evenly}.font-light.svelte-4o4p92{font-weight:300}.text-3xl.svelte-4o4p92{font-size:1.875rem;line-height:2.25rem}.text-lg.svelte-4o4p92{font-size:1.125rem;line-height:1.75rem}.mb-4.svelte-4o4p92{margin-bottom:1rem}.max-w-full.svelte-4o4p92{max-width:100%}.text-center.svelte-4o4p92{text-align:center}.w-full.svelte-4o4p92{width:100%}.gap-4.svelte-4o4p92{grid-gap:1rem;gap:1rem}.gap-2.svelte-4o4p92{grid-gap:0.5rem;gap:0.5rem}@media(min-width: 640px){.sm\\:flex-row.svelte-4o4p92{-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;-webkit-flex-direction:row;flex-direction:row}.sm\\:text-5xl.svelte-4o4p92{font-size:3rem;line-height:1}.sm\\:text-left.svelte-4o4p92{text-align:left}.sm\\:w-sm.svelte-4o4p92{width:24rem}}",
      map: null
    };
    HeroSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      const items = [
        { label: "\u63A2\u7D22\u666F\u9EDE", value: "place" },
        { label: "\u7BC0\u6176\u6D3B\u52D5", value: "event" },
        { label: "\u54C1\u5690\u7F8E\u98DF", value: "food" }
      ];
      const value = items[0];
      let query = "";
      $$result.css.add(css$62);
      let $$settled;
      let $$rendered;
      do {
        $$settled = true;
        $$rendered = `<section class="${"flex flex-col justify-evenly sm:flex-row w-full justify-around gap-4 svelte-4o4p92"}"><div class="${"font-light svelte-4o4p92"}"><div class="${"text-3xl sm:text-5xl text-center sm:text-left svelte-4o4p92"}"><p class="${"mb-4 svelte-4o4p92"}">\u63A2\u7D22<span class="${"slogan-highlight svelte-4o4p92"}">\u53F0\u7063\u4E4B\u7F8E</span></p>
			<p>\u8B93\u6211\u5011\u66F4\u89AA\u8FD1\u9019\u7247\u571F\u5730</p></div>
		<div class="${"intro text-lg text-center sm:text-left svelte-4o4p92"}"><img src="${"/map-pin.svg"}" alt="${""}" class="${"inline svelte-4o4p92"}">
			\u53F0\u7063\u65C5\u904A\u666F\u9EDE\u5C0E\u89A7 Taiwan Travel Guide
		</div></div>

	<div class="${"grid gap-2 max-w-full sm:w-sm svelte-4o4p92"}">${validate_component(Dropdown, "Dropdown").$$render($$result, { items, value }, {}, {})}
		${validate_component(SearchBar, "SearchBar").$$render($$result, {
          placeholder: "\u4F60\u60F3\u53BB\u54EA\u88E1\uFF1F\u8ACB\u8F38\u5165\u95DC\u9375\u5B57",
          value: query
        }, {
          value: ($$value) => {
            query = $$value;
            $$settled = false;
          }
        }, {})}
		${validate_component(Button, "Button").$$render($$result, {}, {}, {
          default: () => `<i class="${"fas fa-search"}"></i>
			\u641C\u5C0B
		`
        })}</div>
</section>`;
      } while (!$$settled);
      return $$rendered;
    });
    css$52 = {
      code: ".flex.svelte-1uusrim{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.justify-center.svelte-1uusrim{-webkit-box-pack:center;-ms-flex-pack:center;-webkit-justify-content:center;justify-content:center}.h-60.svelte-1uusrim{height:15rem}.w-full.svelte-1uusrim{width:100%}@media(min-width: 640px){.sm\\:h-md.svelte-1uusrim{height:28rem}}",
      map: null
    };
    FeatureSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { items = [] } = $$props;
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      $$result.css.add(css$52);
      return `<section class="${"flex justify-center w-full svelte-1uusrim"}"><div class="${"w-full h-60 sm:h-md svelte-1uusrim"}">${validate_component(Carousel, "Carousel").$$render($$result, { items }, {}, {})}</div>
</section>`;
    });
    css$42 = {
      code: ".date.svelte-1wk3x5c{color:#646464}.rounded-xl.svelte-1wk3x5c{border-radius:0.75rem}.rounded-l-xl.svelte-1wk3x5c{border-top-left-radius:0.75rem;border-bottom-left-radius:0.75rem}.rounded-r-xl.svelte-1wk3x5c{border-top-right-radius:0.75rem;border-bottom-right-radius:0.75rem}.flex.svelte-1wk3x5c{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.hidden.svelte-1wk3x5c{display:none}.flex-col.svelte-1wk3x5c{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;-webkit-flex-direction:column;flex-direction:column}.justify-between.svelte-1wk3x5c{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between}.flex-1.svelte-1wk3x5c{-webkit-box-flex:1;-ms-flex:1 1 0%;-webkit-flex:1 1 0%;flex:1 1 0%}.font-light.svelte-1wk3x5c{font-weight:300}.h-full.svelte-1wk3x5c{height:100%}.h-30.svelte-1wk3x5c{height:7.5rem}.text-xs.svelte-1wk3x5c{font-size:0.75rem;line-height:1rem}.min-h-30.svelte-1wk3x5c{min-height:7.5rem}.min-w-30.svelte-1wk3x5c{min-width:7.5rem}.object-cover.svelte-1wk3x5c{-o-object-fit:cover;object-fit:cover}.object-center.svelte-1wk3x5c{-o-object-position:center;object-position:center}.overflow-hidden.svelte-1wk3x5c{overflow:hidden}.px-4.svelte-1wk3x5c{padding-left:1rem;padding-right:1rem}.w-full.svelte-1wk3x5c{width:100%}.w-30.svelte-1wk3x5c{width:7.5rem}.gap-2.svelte-1wk3x5c{grid-gap:0.5rem;gap:0.5rem}@media(min-width: 640px){.sm\\:bg-gray-100.svelte-1wk3x5c{--tw-bg-opacity:1;background-color:rgba(243, 244, 246, var(--tw-bg-opacity))}.sm\\:rounded-r-none.svelte-1wk3x5c{border-top-right-radius:0px;border-bottom-right-radius:0px}.sm\\:rounded-l-xl.svelte-1wk3x5c{border-top-left-radius:0.75rem;border-bottom-left-radius:0.75rem}.sm\\:border.svelte-1wk3x5c{border-width:1px}.sm\\:block.svelte-1wk3x5c{display:block}.sm\\:h-40.svelte-1wk3x5c{height:10rem}.sm\\:text-base.svelte-1wk3x5c{font-size:1rem;line-height:1.5rem}.sm\\:min-h-40.svelte-1wk3x5c{min-height:10rem}.sm\\:min-w-40.svelte-1wk3x5c{min-width:10rem}.sm\\:py-4.svelte-1wk3x5c{padding-top:1rem;padding-bottom:1rem}.sm\\:px-8.svelte-1wk3x5c{padding-left:2rem;padding-right:2rem}.sm\\:w-40.svelte-1wk3x5c{width:10rem}}",
      map: null
    };
    EventCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { src: src2, date, title, location, href } = $$props;
      if ($$props.src === void 0 && $$bindings.src && src2 !== void 0)
        $$bindings.src(src2);
      if ($$props.date === void 0 && $$bindings.date && date !== void 0)
        $$bindings.date(date);
      if ($$props.title === void 0 && $$bindings.title && title !== void 0)
        $$bindings.title(title);
      if ($$props.location === void 0 && $$bindings.location && location !== void 0)
        $$bindings.location(location);
      if ($$props.href === void 0 && $$bindings.href && href !== void 0)
        $$bindings.href(href);
      $$result.css.add(css$42);
      return `<div class="${"flex svelte-1wk3x5c"}"><div class="${"min-h-30 min-w-30 sm:min-h-40 sm:min-w-40 overflow-hidden sm:border rounded-l-xl svelte-1wk3x5c"}"><img${add_attribute("src", src2 || "/picture-holder.png", 0)}${add_attribute("alt", title, 0)} class="${"h-30 w-30 sm:h-40 sm:w-40 rounded-xl sm:rounded-r-none sm:rounded-l-xl object-cover object-center svelte-1wk3x5c"}"></div>
	<div class="${"flex-1 flex flex-col justify-between sm:py-4 px-4 sm:px-8 w-full h-full sm:bg-gray-100 sm:border rounded-r-xl svelte-1wk3x5c"}"><div class="${"flex flex-col gap-2 whitespace-wrap svelte-1wk3x5c"}"><p class="${"date font-light text-xs sm:text-base svelte-1wk3x5c"}">${escape(date)}</p>
      <a${add_attribute("href", href, 0)}>${validate_component(Title, "Title").$$render($$result, { truncate: false }, {}, { default: () => `${escape(title)}` })}</a></div>
		<div class="${"flex justify-between w-full text-xs sm:text-base svelte-1wk3x5c"}">${validate_component(LocationMarker, "LocationMarker").$$render($$result, {}, {}, { default: () => `${escape(location)}` })}
			<div class="${"hidden sm:block svelte-1wk3x5c"}">${validate_component(ExporeMore, "ExporeMore").$$render($$result, { href, color: "green" }, {}, { default: () => `\u8A73\u7D30\u4ECB\u7D39` })}</div></div></div>
</div>`;
    });
    css$32 = {
      code: ".flex.svelte-wp9clu{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.grid.svelte-wp9clu{display:-ms-grid;display:grid}.items-center.svelte-wp9clu{-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center}.justify-between.svelte-wp9clu{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between}.mb-4.svelte-wp9clu{margin-bottom:1rem}.w-full.svelte-wp9clu{width:100%}.gap-8.svelte-wp9clu{grid-gap:2rem;gap:2rem}.grid-cols-1.svelte-wp9clu{grid-template-columns:repeat(1, minmax(0, 1fr))}@media(min-width: 768px){.md\\:grid-cols-2.svelte-wp9clu{grid-template-columns:repeat(2, minmax(0, 1fr))}}",
      map: null
    };
    RecentEventSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { items = [] } = $$props;
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      $$result.css.add(css$32);
      return `<section class="${"w-full svelte-wp9clu"}"><div class="${"flex w-full justify-between items-center mb-4 svelte-wp9clu"}">${validate_component(Header, "Header").$$render($$result, {}, {}, { default: () => `\u8FD1\u671F\u6D3B\u52D5` })}
		${validate_component(ExporeMore, "ExporeMore").$$render($$result, { href: "/event", color: "orange" }, {}, { default: () => `\u67E5\u770B\u66F4\u591A\u6D3B\u52D5` })}</div>
	<div class="${"grid grid-cols-1 md:grid-cols-2 gap-8 svelte-wp9clu"}">${each(items, (event) => `${validate_component(EventCard, "EventCard").$$render($$result, {
        src: event.src,
        date: event.date,
        title: event.name,
        location: event.city,
        href: `/event/${event.id}`
      }, {}, {})}`)}</div>
</section>`;
    });
    css$23 = {
      code: ".flex.svelte-1r1sa6k{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.items-center.svelte-1r1sa6k{-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center}.justify-between.svelte-1r1sa6k{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between}.mb-4.svelte-1r1sa6k{margin-bottom:1rem}.w-full.svelte-1r1sa6k{width:100%}",
      map: null
    };
    PopularPlaceSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let top4Items;
      let { items = [] } = $$props;
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      $$result.css.add(css$23);
      top4Items = items.slice(0, 4);
      return `<section class="${"w-full svelte-1r1sa6k"}"><div class="${"flex justify-between items-center mb-4 svelte-1r1sa6k"}">${validate_component(Header, "Header").$$render($$result, {}, {}, { default: () => `\u71B1\u9580\u6253\u5361\u666F\u9EDE` })}
		${validate_component(ExporeMore, "ExporeMore").$$render($$result, { href: "/place", color: "orange" }, {}, { default: () => `\u67E5\u770B\u66F4\u591A\u666F\u9EDE` })}</div>
	${validate_component(ImageCardContainer, "ImageCardContainer").$$render($$result, {}, {}, {
        default: () => `${each(top4Items, (place) => `${validate_component(ImageCard, "ImageCard").$$render($$result, {
          href: `/place/${place.id}`,
          src: place.src,
          title: place.name,
          location: place.city
        }, {}, {})}`)}`
      })}
</section>`;
    });
    css$13 = {
      code: ".flex.svelte-1r1sa6k{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.items-center.svelte-1r1sa6k{-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center}.justify-between.svelte-1r1sa6k{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between}.mb-4.svelte-1r1sa6k{margin-bottom:1rem}.w-full.svelte-1r1sa6k{width:100%}",
      map: null
    };
    FoodieSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { items = [] } = $$props;
      if ($$props.items === void 0 && $$bindings.items && items !== void 0)
        $$bindings.items(items);
      $$result.css.add(css$13);
      return `<section class="${"w-full svelte-1r1sa6k"}"><div class="${"flex justify-between items-center mb-4 svelte-1r1sa6k"}">${validate_component(Header, "Header").$$render($$result, {}, {}, { default: () => `\u4E00\u518D\u56DE\u8A2A\u7F8E\u98DF` })}
		${validate_component(ExporeMore, "ExporeMore").$$render($$result, { href: "/food", color: "orange" }, {}, { default: () => `\u67E5\u770B\u66F4\u591A\u7F8E\u98DF` })}</div>
	${validate_component(ImageCardContainer, "ImageCardContainer").$$render($$result, {}, {}, {
        default: () => `${each(items, (place) => `${validate_component(ImageCard, "ImageCard").$$render($$result, {
          href: `/food/${place.id}`,
          src: place.src,
          title: place.name,
          location: place.city
        }, {}, {})}`)}`
      })}
</section>`;
    });
    css3 = {
      code: ".grid.svelte-1s3ydcv{display:-ms-grid;display:grid}.w-full.svelte-1s3ydcv{width:100%}.gap-16.svelte-1s3ydcv{grid-gap:4rem;gap:4rem}.grid-cols-1.svelte-1s3ydcv{grid-template-columns:repeat(1, minmax(0, 1fr))}",
      map: null
    };
    Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let featureSpots;
      let popularSpots;
      let foodie;
      let recentEvents;
      let featurePlaces, popularPlaces, foods, events;
      $$result.css.add(css3);
      featureSpots = featurePlaces;
      popularSpots = popularPlaces;
      foodie = foods;
      recentEvents = events;
      return `<div class="${"grid grid-cols-1 gap-16 w-full svelte-1s3ydcv"}">${validate_component(HeroSection, "HeroSection").$$render($$result, {}, {}, {})}
	${validate_component(FeatureSection, "FeatureSection").$$render($$result, { items: featureSpots }, {}, {})}
	${validate_component(RecentEventSection, "RecentEventSection").$$render($$result, { items: recentEvents }, {}, {})}
	${validate_component(PopularPlaceSection, "PopularPlaceSection").$$render($$result, { items: popularSpots }, {}, {})}
	${validate_component(FoodieSection, "FoodieSection").$$render($$result, { items: foodie }, {}, {})}
</div>`;
    });
  }
});

// .svelte-kit/output/server/chunks/index-14aa63ee.js
var index_14aa63ee_exports = {};
__export(index_14aa63ee_exports, {
  default: () => Event
});
var Event;
var init_index_14aa63ee = __esm({
  ".svelte-kit/output/server/chunks/index-14aa63ee.js"() {
    init_shims();
    init_app_f8d6d072();
    Event = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return ``;
    });
  }
});

// .svelte-kit/output/server/chunks/DetailPage-af55ebcd.js
var css$14, Hashtag, css4, DetailPage;
var init_DetailPage_af55ebcd = __esm({
  ".svelte-kit/output/server/chunks/DetailPage-af55ebcd.js"() {
    init_shims();
    init_app_f8d6d072();
    init_ImageCardContainer_7bca39b0();
    css$14 = {
      code: "span.svelte-18ghjeb{color:#bea363;border-color:#bea363}.rounded-full.svelte-18ghjeb{border-radius:9999px}.border.svelte-18ghjeb{border-width:1px}.font-light.svelte-18ghjeb{font-weight:300}.px-2.svelte-18ghjeb{padding-left:0.5rem;padding-right:0.5rem}.py-1.svelte-18ghjeb{padding-top:0.25rem;padding-bottom:0.25rem}",
      map: null
    };
    Hashtag = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css$14);
      return `<span class="${"rounded-full text-md border font-light border px-2 py-1 svelte-18ghjeb"}"># ${slots.default ? slots.default({}) : ``}
</span>`;
    });
    css4 = {
      code: ".bg-gray-100.svelte-10vvdul{--tw-bg-opacity:1;background-color:rgba(243, 244, 246, var(--tw-bg-opacity))}.flex.svelte-10vvdul{display:-webkit-box;display:-ms-flexbox;display:-webkit-flex;display:flex}.grid.svelte-10vvdul{display:-ms-grid;display:grid}.flex-col.svelte-10vvdul{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;-webkit-flex-direction:column;flex-direction:column}.items-center.svelte-10vvdul{-webkit-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center}.justify-center.svelte-10vvdul{-webkit-box-pack:center;-ms-flex-pack:center;-webkit-justify-content:center;justify-content:center}.justify-between.svelte-10vvdul{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between}.font-light.svelte-10vvdul{font-weight:300}.h-60.svelte-10vvdul{height:15rem}.text-lg.svelte-10vvdul{font-size:1.125rem;line-height:1.75rem}.leading-relaxed.svelte-10vvdul{line-height:1.625}.mb-4.svelte-10vvdul{margin-bottom:1rem}.p-4.svelte-10vvdul{padding:1rem}.text-justify.svelte-10vvdul{text-align:justify}.w-full.svelte-10vvdul{width:100%}.w-screen.svelte-10vvdul{width:100vw}.gap-4.svelte-10vvdul{grid-gap:1rem;gap:1rem}.gap-2.svelte-10vvdul{grid-gap:0.5rem;gap:0.5rem}.grid-cols-1.svelte-10vvdul{grid-template-columns:repeat(1, minmax(0, 1fr))}@media(min-width: 640px){.sm\\:bg-transparent.svelte-10vvdul{background-color:transparent}.sm\\:h-md.svelte-10vvdul{height:28rem}.sm\\:w-full.svelte-10vvdul{width:100%}.sm\\:grid-cols-2.svelte-10vvdul{grid-template-columns:repeat(2, minmax(0, 1fr))}}",
      map: null
    };
    DetailPage = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { item } = $$props;
      let { more = [] } = $$props;
      let { moreHeader = "More" } = $$props;
      let { moreText = "More" } = $$props;
      let { category: category4 } = $$props;
      let { categoryZh: categoryZh4 } = $$props;
      if ($$props.item === void 0 && $$bindings.item && item !== void 0)
        $$bindings.item(item);
      if ($$props.more === void 0 && $$bindings.more && more !== void 0)
        $$bindings.more(more);
      if ($$props.moreHeader === void 0 && $$bindings.moreHeader && moreHeader !== void 0)
        $$bindings.moreHeader(moreHeader);
      if ($$props.moreText === void 0 && $$bindings.moreText && moreText !== void 0)
        $$bindings.moreText(moreText);
      if ($$props.category === void 0 && $$bindings.category && category4 !== void 0)
        $$bindings.category(category4);
      if ($$props.categoryZh === void 0 && $$bindings.categoryZh && categoryZh4 !== void 0)
        $$bindings.categoryZh(categoryZh4);
      $$result.css.add(css4);
      return `<section class="${"flex justify-center w-full mb-4 svelte-10vvdul"}"><div class="${"w-full h-60 sm:h-md svelte-10vvdul"}">${validate_component(Carousel, "Carousel").$$render($$result, { items: item.images }, {}, {})}</div></section>


<section class="${"flex flex-col gap-4 w-full font-light mb-4 svelte-10vvdul"}">${validate_component(Header, "Header").$$render($$result, {}, {}, { default: () => `${escape(item.title)}` })}
	<div class="${"flex gap-2 svelte-10vvdul"}">${each(item.tags, (tag) => `${validate_component(Hashtag, "Hashtag").$$render($$result, {}, {}, { default: () => `${escape(tag)}` })}`)}</div>
	${item.description ? `<div>${validate_component(Title, "Title").$$render($$result, {}, {}, {
        default: () => `${escape(categoryZh4)}\u4ECB\u7D39\uFF1A`
      })}
			<p class="${"text-lg leading-relaxed text-justify svelte-10vvdul"}">${escape(item.description)}</p></div>` : ``}</section>


<section class="${"grid grid-cols-1 sm:grid-cols-2 bg-gray-100 sm:bg-transparent w-screen sm:w-full p-4 mb-4 svelte-10vvdul"}">asd
</section>
  

${more.length > 0 ? `<section class="${"w-full svelte-10vvdul"}"><div class="${"flex justify-between items-center mb-4 svelte-10vvdul"}">${validate_component(Header, "Header").$$render($$result, {}, {}, { default: () => `${escape(moreHeader)}` })}
			${validate_component(ExporeMore, "ExporeMore").$$render($$result, { href: "/" + category4, color: "orange" }, {}, { default: () => `${escape(moreText)}` })}</div>
		${validate_component(ImageCardContainer, "ImageCardContainer").$$render($$result, {}, {}, {
        default: () => `${each(more, (recommendation) => `${validate_component(ImageCard, "ImageCard").$$render($$result, Object.assign(recommendation), {}, {})}`)}`
      })}</section>` : ``}`;
    });
  }
});

// .svelte-kit/output/server/chunks/[id]-c869f98f.js
var id_c869f98f_exports = {};
__export(id_c869f98f_exports, {
  default: () => U5Bidu5D,
  load: () => load2
});
async function load2({ page }) {
  const id = page.params.id;
  const result = await import_axios3.default.get("/Activity", { params: { $filter: `ID eq '${id}'` } });
  const event = result.data.pop();
  const nearby = await import_axios3.default.get("/Activity", {
    params: {
      $top: 4,
      $filter: `ID ne '${id}' and Picture/PictureUrl1 ne null`,
      $spatialFilter: `nearby(${event.Position?.PositionLat}, ${event.Position?.PositionLon}, 10000)`
    }
  }).then((res) => res.data);
  if (result.status === 200) {
    return { props: { event, nearby } };
  }
  return {
    status: result.status,
    error: new Error(`Could not load ${id}`)
  };
}
var import_axios3, category, categoryZh, U5Bidu5D;
var init_id_c869f98f = __esm({
  ".svelte-kit/output/server/chunks/[id]-c869f98f.js"() {
    init_shims();
    init_app_f8d6d072();
    import_axios3 = __toModule(require_axios2());
    init_DetailPage_af55ebcd();
    init_ImageCardContainer_7bca39b0();
    category = "event";
    categoryZh = "\u6D3B\u52D5";
    U5Bidu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let city;
      let item;
      let more;
      let { event } = $$props;
      let { nearby = [] } = $$props;
      if ($$props.event === void 0 && $$bindings.event && event !== void 0)
        $$bindings.event(event);
      if ($$props.nearby === void 0 && $$bindings.nearby && nearby !== void 0)
        $$bindings.nearby(nearby);
      city = event.Address.slice(0, 3);
      item = {
        images: [
          { src: event.Picture?.PictureUrl1 },
          { src: event.Picture?.PictureUrl2 },
          { src: event.Picture?.PictureUrl3 }
        ].filter((item2) => !!item2.src),
        title: event.Name,
        tags: [event.Class1, event.Class2, event.Class3].filter((item2) => !!item2),
        description: event.Description
      };
      more = nearby.map((item2) => ({
        href: `/${category}/${item2.ID}`,
        src: item2.Picture?.PictureUrl1 || null,
        title: item2.Name,
        location: item2.Address.slice(0, 3)
      }));
      return `${validate_component(DetailPage, "DetailPage").$$render($$result, {
        item,
        category,
        categoryZh,
        more,
        moreHeader: "\u9084\u6709\u9019\u4E9B\u4E0D\u80FD\u932F\u904E\u7684" + categoryZh,
        moreText: "\u67E5\u770B\u66F4\u591A" + city + categoryZh
      }, {}, {})}`;
    });
  }
});

// .svelte-kit/output/server/chunks/index-5df25970.js
var index_5df25970_exports = {};
__export(index_5df25970_exports, {
  default: () => Place
});
var Place;
var init_index_5df25970 = __esm({
  ".svelte-kit/output/server/chunks/index-5df25970.js"() {
    init_shims();
    init_app_f8d6d072();
    Place = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return ``;
    });
  }
});

// .svelte-kit/output/server/chunks/[id]-3a4af4d2.js
var id_3a4af4d2_exports = {};
__export(id_3a4af4d2_exports, {
  default: () => U5Bidu5D2,
  load: () => load3
});
async function load3({ page }) {
  const id = page.params.id;
  const result = await import_axios4.default.get("/ScenicSpot", { params: { $filter: `ID eq '${id}'` } });
  const place = result.data.pop();
  const nearby = await import_axios4.default.get("/ScenicSpot", {
    params: {
      $top: 4,
      $filter: `ID ne '${id}' and Picture/PictureUrl1 ne null`,
      $spatialFilter: `nearby(${place.Position?.PositionLat}, ${place.Position?.PositionLon}, 10000)`
    }
  }).then((res) => res.data);
  if (result.status === 200) {
    return { props: { place, nearby } };
  }
  return {
    status: result.status,
    error: new Error(`Could not load ${id}`)
  };
}
var import_axios4, category2, categoryZh2, U5Bidu5D2;
var init_id_3a4af4d2 = __esm({
  ".svelte-kit/output/server/chunks/[id]-3a4af4d2.js"() {
    init_shims();
    init_app_f8d6d072();
    import_axios4 = __toModule(require_axios2());
    init_DetailPage_af55ebcd();
    init_ImageCardContainer_7bca39b0();
    category2 = "place";
    categoryZh2 = "\u666F\u9EDE";
    U5Bidu5D2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let city;
      let item;
      let more;
      let { place } = $$props;
      let { nearby = [] } = $$props;
      if ($$props.place === void 0 && $$bindings.place && place !== void 0)
        $$bindings.place(place);
      if ($$props.nearby === void 0 && $$bindings.nearby && nearby !== void 0)
        $$bindings.nearby(nearby);
      city = place.Address.slice(0, 3);
      item = {
        images: [
          { src: place.Picture?.PictureUrl1 },
          { src: place.Picture?.PictureUrl2 },
          { src: place.Picture?.PictureUrl3 }
        ].filter((item2) => !!item2.src),
        title: place.Name,
        tags: [place.Class1, place.Class2, place.Class3].filter((item2) => !!item2),
        description: place.Description
      };
      more = nearby.map((item2) => ({
        href: `/${category2}/${item2.ID}`,
        src: item2.Picture?.PictureUrl1 || null,
        title: item2.Name,
        location: item2.Address.slice(0, 3)
      }));
      return `${validate_component(DetailPage, "DetailPage").$$render($$result, {
        item,
        category: category2,
        categoryZh: categoryZh2,
        more,
        moreHeader: "\u9084\u6709\u9019\u4E9B\u4E0D\u80FD\u932F\u904E\u7684" + categoryZh2,
        moreText: "\u67E5\u770B\u66F4\u591A" + city + categoryZh2
      }, {}, {})}`;
    });
  }
});

// .svelte-kit/output/server/chunks/index-7d7777a9.js
var index_7d7777a9_exports = {};
__export(index_7d7777a9_exports, {
  default: () => Food
});
var Food;
var init_index_7d7777a9 = __esm({
  ".svelte-kit/output/server/chunks/index-7d7777a9.js"() {
    init_shims();
    init_app_f8d6d072();
    Food = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return ``;
    });
  }
});

// .svelte-kit/output/server/chunks/[id]-e443e8b6.js
var id_e443e8b6_exports = {};
__export(id_e443e8b6_exports, {
  default: () => U5Bidu5D3,
  load: () => load4
});
async function load4({ page }) {
  const id = page.params.id;
  const result = await import_axios5.default.get("/Restaurant", { params: { $filter: `ID eq '${id}'` } });
  const restaurant = result.data.pop();
  const nearby = await import_axios5.default.get("/Restaurant", {
    params: {
      $top: 4,
      $filter: `ID ne '${id}' and Picture/PictureUrl1 ne null`,
      $spatialFilter: `nearby(${restaurant.Position?.PositionLat}, ${restaurant.Position?.PositionLon}, 10000)`
    }
  }).then((res) => res.data);
  if (result.status === 200) {
    return { props: { restaurant, nearby } };
  }
  return {
    status: result.status,
    error: new Error(`Could not load ${id}`)
  };
}
var import_axios5, category3, categoryZh3, U5Bidu5D3;
var init_id_e443e8b6 = __esm({
  ".svelte-kit/output/server/chunks/[id]-e443e8b6.js"() {
    init_shims();
    init_app_f8d6d072();
    import_axios5 = __toModule(require_axios2());
    init_DetailPage_af55ebcd();
    init_ImageCardContainer_7bca39b0();
    category3 = "food";
    categoryZh3 = "\u7F8E\u98DF";
    U5Bidu5D3 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let city;
      let item;
      let more;
      let { restaurant } = $$props;
      let { nearby = [] } = $$props;
      if ($$props.restaurant === void 0 && $$bindings.restaurant && restaurant !== void 0)
        $$bindings.restaurant(restaurant);
      if ($$props.nearby === void 0 && $$bindings.nearby && nearby !== void 0)
        $$bindings.nearby(nearby);
      city = restaurant.Address.slice(0, 3);
      item = {
        images: [
          { src: restaurant.Picture?.PictureUrl1 },
          { src: restaurant.Picture?.PictureUrl2 },
          { src: restaurant.Picture?.PictureUrl3 }
        ].filter((item2) => !!item2.src),
        title: restaurant.Name,
        tags: [restaurant.Class],
        description: restaurant.Description
      };
      more = nearby.map((item2) => ({
        href: `/${category3}/${item2.ID}`,
        src: item2.Picture?.PictureUrl1 || null,
        title: item2.Name,
        location: item2.Address.slice(0, 3)
      }));
      return `${validate_component(DetailPage, "DetailPage").$$render($$result, {
        item,
        category: category3,
        categoryZh: categoryZh3,
        more,
        moreHeader: "\u9084\u6709\u9019\u4E9B\u4E0D\u80FD\u932F\u904E\u7684" + categoryZh3,
        moreText: "\u67E5\u770B\u66F4\u591A" + city + categoryZh3
      }, {}, {})}`;
    });
  }
});

// .svelte-kit/output/server/chunks/app-f8d6d072.js
function get_single_valued_header(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function coalesce_to_error(err) {
  return err instanceof Error || err && err.name && err.message ? err : new Error(JSON.stringify(err));
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function error(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s22) {
  return typeof s22 === "string" || s22 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler2 = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler2) {
    return;
  }
  const params = route.params(match);
  const response = await handler2({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a2, b2) {
    return b2[1] - a2[1];
  }).forEach(function(entry, i2) {
    names.set(entry[0], getName(i2));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v2, i2) {
          return i2 in thing ? stringify(v2) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v2, i2) {
            statements_1.push(name + "[" + i2 + "]=" + stringify(v2));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v2) {
            return "add(" + stringify(v2) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k2 = _a[0], v2 = _a[1];
            return "set(" + stringify(k2) + ", " + stringify(v2) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c2) {
  return escaped$1[c2] || c2;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i2 = 0; i2 < str.length; i2 += 1) {
    var char = str.charAt(i2);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i2 + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i2];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop() {
}
function safe_not_equal(a2, b2) {
  return a2 != a2 ? b2 == b2 : a2 !== b2 || (a2 && typeof a2 === "object" || typeof a2 === "function");
}
function writable(value, start = noop) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i2 = 0; i2 < subscriber_queue.length; i2 += 2) {
            subscriber_queue[i2][0](subscriber_queue[i2 + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe };
}
function hash(value) {
  let hash2 = 5381;
  let i2 = value.length;
  if (typeof value === "string") {
    while (i2)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i2);
  } else {
    while (i2)
      hash2 = hash2 * 33 ^ value[--i2];
  }
  return (hash2 >>> 0).toString(36);
}
function escape_json_string_in_html(str) {
  return escape$1(str, escape_json_string_in_html_dict, (code) => `\\u${code.toString(16).toUpperCase()}`);
}
function escape_html_attr(str) {
  return '"' + escape$1(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}
function escape$1(str, dict, unicode_encoder) {
  let result = "";
  for (let i2 = 0; i2 < str.length; i2 += 1) {
    const char = str.charAt(i2);
    const code = char.charCodeAt(0);
    if (char in dict) {
      result += dict[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i2 + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i2];
      } else {
        result += unicode_encoder(code);
      }
    } else {
      result += char;
    }
  }
  return result;
}
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  page
}) {
  const css22 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css22.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i2 = 0; i2 < branch.length; i2 += 1) {
      props[`props_${i2}`] = await branch[i2].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css22).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page && page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${page && page.path ? try_serialize(page.path, (error3) => {
      throw new Error(`Failed to serialize page.path: ${error3.message}`);
    }) : null},
						query: new URLSearchParams(${page && page.query ? s$1(page.query.toString()) : ""}),
						params: ${page && page.params ? try_serialize(page.params, (error3) => {
      throw new Error(`Failed to serialize page.params: ${error3.message}`);
    }) : null}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url=${escape_html_attr(url)}`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(coalesce_to_error(err));
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ ...error2, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  if (loaded.context) {
    throw new Error('You are returning "context" from a load function. "context" was renamed to "stuff", please adjust your code accordingly.');
  }
  return loaded;
}
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  stuff,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module2.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const prefix = options2.paths.assets || options2.paths.base;
        const filename = (resolved.startsWith(prefix) ? resolved.slice(prefix.length) : resolved).slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d22) => d22.file === filename || d22.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = {
            ...opts.headers
          };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, _receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key2 !== "etag") {
                    headers[key2] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s2(response2.statusText)},"headers":${s2(headers)},"body":"${escape_json_string_in_html(body)}"}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      stuff: { ...stuff }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    stuff: loaded.stuff || stuff,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
function resolve(base2, path) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i2 = 0; i2 < pathparts.length; i2 += 1) {
    const part = pathparts[i2];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    stuff: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      stuff: loaded ? loaded.stuff : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {}
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let stuff = {};
      for (let i2 = 0; i2 < nodes.length; i2 += 1) {
        const node = nodes[i2];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              stuff,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i2 === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e2 = coalesce_to_error(err);
            options2.handle_error(e2, request);
            status = 500;
            error2 = e2;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i2--) {
              if (route.b[i2]) {
                const error_node = await options2.load_component(route.b[i2]);
                let node_loaded;
                let j2 = i2;
                while (!(node_loaded = branch[j2])) {
                  j2 -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    stuff: node_loaded.stuff,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j2 + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e2 = coalesce_to_error(err);
                  options2.handle_error(e2, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.stuff) {
          stuff = {
            ...stuff,
            ...loaded.loaded.stuff
          };
        }
      }
    }
  try {
    return with_cookies(await render_response({
      ...opts,
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    }), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return with_cookies(await respond_with_error({
      ...opts,
      status: 500,
      error: error3
    }), set_cookie_headers);
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q2 = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path + (q2 ? `?${q2}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        const decoded = decodeURI(request2.path);
        for (const route of options2.manifest.routes) {
          const match = route.pattern.exec(decoded);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options2, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {}
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e2 = coalesce_to_error(err);
    options2.handle_error(e2, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e2.stack : e2.message
    };
  }
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function custom_event(type, detail, bubbles = false) {
  const e2 = document.createEvent("CustomEvent");
  e2.initCustomEvent(type, bubbles, false, detail);
  return e2;
}
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function createEventDispatcher() {
  const component = get_current_component();
  return (type, detail) => {
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(type, detail);
      callbacks.slice().forEach((fn) => {
        fn.call(component, event);
      });
    }
  };
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
function spread(args, classes_to_add) {
  const attributes = Object.assign({}, ...args);
  if (classes_to_add) {
    if (attributes.class == null) {
      attributes.class = classes_to_add;
    } else {
      attributes.class += " " + classes_to_add;
    }
  }
  let str = "";
  Object.keys(attributes).forEach((name) => {
    if (invalid_attribute_name_character.test(name))
      return;
    const value = attributes[name];
    if (value === true)
      str += " " + name;
    else if (boolean_attributes.has(name.toLowerCase())) {
      if (value)
        str += " " + name;
    } else if (value != null) {
      str += ` ${name}="${value}"`;
    }
  });
  return str;
}
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function escape_attribute_value(value) {
  return typeof value === "string" ? escape(value) : value;
}
function escape_object(obj) {
  const result = {};
  for (const key in obj) {
    result[key] = escape_attribute_value(obj[key]);
  }
  return result;
}
function each(items, fn) {
  let str = "";
  for (let i2 = 0; i2 < items.length; i2 += 1) {
    str += fn(items[i2], i2);
  }
  return str;
}
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(context || (parent_component ? parent_component.$$.context : [])),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css22) => css22.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
function set_paths(paths) {
  base = paths.base;
  assets = paths.assets || base;
}
function set_prerendering(value) {
}
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-f1a1a75c.js",
      css: [assets + "/_app/assets/start-1f089c51.css", assets + "/_app/assets/vendor-33dd9e65.css"],
      js: [assets + "/_app/start-f1a1a75c.js", assets + "/_app/chunks/vendor-9f24c8b6.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
async function load_component(file) {
  const { entry, css: css22, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css22.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender });
}
var __accessCheck, __privateGet, __privateAdd, __privateSet, _map, chars, unsafeChars, reserved, escaped$1, objectProtoOwnPropertyNames, subscriber_queue, escape_json_string_in_html_dict, escape_html_attr_dict, s$1, s2, absolute, ReadOnlyFormData, current_component, globals, boolean_attributes, invalid_attribute_name_character, escaped, missing_component, on_destroy, css5, Root, base, assets, user_hooks, template, options, default_settings, d2, empty, manifest, get_hooks, module_lookup, metadata_lookup;
var init_app_f8d6d072 = __esm({
  ".svelte-kit/output/server/chunks/app-f8d6d072.js"() {
    init_shims();
    __accessCheck = (obj, member, msg) => {
      if (!member.has(obj))
        throw TypeError("Cannot " + msg);
    };
    __privateGet = (obj, member, getter) => {
      __accessCheck(obj, member, "read from private field");
      return getter ? getter.call(obj) : member.get(obj);
    };
    __privateAdd = (obj, member, value) => {
      if (member.has(obj))
        throw TypeError("Cannot add the same private member more than once");
      member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
    };
    __privateSet = (obj, member, value, setter) => {
      __accessCheck(obj, member, "write to private field");
      setter ? setter.call(obj, value) : member.set(obj, value);
      return value;
    };
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
    unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
    reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
    escaped$1 = {
      "<": "\\u003C",
      ">": "\\u003E",
      "/": "\\u002F",
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\0": "\\0",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
    Promise.resolve();
    subscriber_queue = [];
    escape_json_string_in_html_dict = {
      '"': '\\"',
      "<": "\\u003C",
      ">": "\\u003E",
      "/": "\\u002F",
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\0": "\\0",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    escape_html_attr_dict = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    };
    s$1 = JSON.stringify;
    s2 = JSON.stringify;
    absolute = /^([a-z]+:)?\/?\//;
    ReadOnlyFormData = class {
      constructor(map) {
        __privateAdd(this, _map, void 0);
        __privateSet(this, _map, map);
      }
      get(key) {
        const value = __privateGet(this, _map).get(key);
        return value && value[0];
      }
      getAll(key) {
        return __privateGet(this, _map).get(key);
      }
      has(key) {
        return __privateGet(this, _map).has(key);
      }
      *[Symbol.iterator]() {
        for (const [key, value] of __privateGet(this, _map)) {
          for (let i2 = 0; i2 < value.length; i2 += 1) {
            yield [key, value[i2]];
          }
        }
      }
      *entries() {
        for (const [key, value] of __privateGet(this, _map)) {
          for (let i2 = 0; i2 < value.length; i2 += 1) {
            yield [key, value[i2]];
          }
        }
      }
      *keys() {
        for (const [key] of __privateGet(this, _map))
          yield key;
      }
      *values() {
        for (const [, value] of __privateGet(this, _map)) {
          for (let i2 = 0; i2 < value.length; i2 += 1) {
            yield value[i2];
          }
        }
      }
    };
    _map = new WeakMap();
    Promise.resolve();
    globals = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : global;
    boolean_attributes = new Set([
      "allowfullscreen",
      "allowpaymentrequest",
      "async",
      "autofocus",
      "autoplay",
      "checked",
      "controls",
      "default",
      "defer",
      "disabled",
      "formnovalidate",
      "hidden",
      "ismap",
      "loop",
      "multiple",
      "muted",
      "nomodule",
      "novalidate",
      "open",
      "playsinline",
      "readonly",
      "required",
      "reversed",
      "selected"
    ]);
    invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
    escaped = {
      '"': "&quot;",
      "'": "&#39;",
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;"
    };
    missing_component = {
      $$render: () => ""
    };
    css5 = {
      code: "#svelte-announcer.svelte-1r92h5h{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
      map: null
    };
    Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { stores } = $$props;
      let { page } = $$props;
      let { components } = $$props;
      let { props_0 = null } = $$props;
      let { props_1 = null } = $$props;
      let { props_2 = null } = $$props;
      setContext("__svelte__", stores);
      afterUpdate(stores.page.notify);
      if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
        $$bindings.stores(stores);
      if ($$props.page === void 0 && $$bindings.page && page !== void 0)
        $$bindings.page(page);
      if ($$props.components === void 0 && $$bindings.components && components !== void 0)
        $$bindings.components(components);
      if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
        $$bindings.props_0(props_0);
      if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
        $$bindings.props_1(props_1);
      if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
        $$bindings.props_2(props_2);
      $$result.css.add(css5);
      {
        stores.page.set(page);
      }
      return `${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
        default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
          default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
        })}` : ``}`
      })}

${``}`;
    });
    base = "";
    assets = "";
    user_hooks = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      [Symbol.toStringTag]: "Module"
    });
    template = ({ head, body }) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.png" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
    options = null;
    default_settings = { paths: { "base": "", "assets": "" } };
    d2 = (s22) => s22.replace(/%23/g, "#").replace(/%3[Bb]/g, ";").replace(/%2[Cc]/g, ",").replace(/%2[Ff]/g, "/").replace(/%3[Ff]/g, "?").replace(/%3[Aa]/g, ":").replace(/%40/g, "@").replace(/%26/g, "&").replace(/%3[Dd]/g, "=").replace(/%2[Bb]/g, "+").replace(/%24/g, "$");
    empty = () => ({});
    manifest = {
      assets: [{ "file": "favicon.png", "size": 1571, "type": "image/png" }, { "file": "font-awesome/all.js", "size": 1283738, "type": "application/javascript" }, { "file": "font-awesome/all.min.js", "size": 1266345, "type": "application/javascript" }, { "file": "font-awesome/brands.js", "size": 463406, "type": "application/javascript" }, { "file": "font-awesome/brands.min.js", "size": 462136, "type": "application/javascript" }, { "file": "font-awesome/conflict-detection.js", "size": 31760, "type": "application/javascript" }, { "file": "font-awesome/conflict-detection.min.js", "size": 27190, "type": "application/javascript" }, { "file": "font-awesome/fontawesome.js", "size": 75207, "type": "application/javascript" }, { "file": "font-awesome/fontawesome.min.js", "size": 51502, "type": "application/javascript" }, { "file": "font-awesome/regular.js", "size": 109388, "type": "application/javascript" }, { "file": "font-awesome/regular.min.js", "size": 108118, "type": "application/javascript" }, { "file": "font-awesome/solid.js", "size": 636295, "type": "application/javascript" }, { "file": "font-awesome/solid.min.js", "size": 635025, "type": "application/javascript" }, { "file": "font-awesome/v4-shims.js", "size": 18318, "type": "application/javascript" }, { "file": "font-awesome/v4-shims.min.js", "size": 18676, "type": "application/javascript" }, { "file": "logo-desktop.svg", "size": 21118, "type": "image/svg+xml" }, { "file": "map-marker.svg", "size": 2434, "type": "image/svg+xml" }, { "file": "map-pin.svg", "size": 1374, "type": "image/svg+xml" }, { "file": "picture-holder.png", "size": 1890, "type": "image/png" }],
      layout: "src/routes/__layout.svelte",
      error: ".svelte-kit/build/components/error.svelte",
      routes: [
        {
          type: "page",
          pattern: /^\/$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/event\/?$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/event/index.svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/event\/([^/]+?)\/?$/,
          params: (m2) => ({ id: d2(m2[1]) }),
          a: ["src/routes/__layout.svelte", "src/routes/event/[id].svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/place\/?$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/place/index.svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/place\/([^/]+?)\/?$/,
          params: (m2) => ({ id: d2(m2[1]) }),
          a: ["src/routes/__layout.svelte", "src/routes/place/[id].svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/food\/?$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/food/index.svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/food\/([^/]+?)\/?$/,
          params: (m2) => ({ id: d2(m2[1]) }),
          a: ["src/routes/__layout.svelte", "src/routes/food/[id].svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        }
      ]
    };
    get_hooks = (hooks) => ({
      getSession: hooks.getSession || (() => ({})),
      handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
      handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
      externalFetch: hooks.externalFetch || fetch
    });
    module_lookup = {
      "src/routes/__layout.svelte": () => Promise.resolve().then(() => (init_layout_91b7aaf7(), layout_91b7aaf7_exports)),
      ".svelte-kit/build/components/error.svelte": () => Promise.resolve().then(() => (init_error_a8490e75(), error_a8490e75_exports)),
      "src/routes/index.svelte": () => Promise.resolve().then(() => (init_index_248e85bd(), index_248e85bd_exports)),
      "src/routes/event/index.svelte": () => Promise.resolve().then(() => (init_index_14aa63ee(), index_14aa63ee_exports)),
      "src/routes/event/[id].svelte": () => Promise.resolve().then(() => (init_id_c869f98f(), id_c869f98f_exports)),
      "src/routes/place/index.svelte": () => Promise.resolve().then(() => (init_index_5df25970(), index_5df25970_exports)),
      "src/routes/place/[id].svelte": () => Promise.resolve().then(() => (init_id_3a4af4d2(), id_3a4af4d2_exports)),
      "src/routes/food/index.svelte": () => Promise.resolve().then(() => (init_index_7d7777a9(), index_7d7777a9_exports)),
      "src/routes/food/[id].svelte": () => Promise.resolve().then(() => (init_id_e443e8b6(), id_e443e8b6_exports))
    };
    metadata_lookup = { "src/routes/__layout.svelte": { "entry": "pages/__layout.svelte-7c0c6176.js", "css": ["assets/pages/__layout.svelte-6cfa9e99.css", "assets/vendor-33dd9e65.css"], "js": ["pages/__layout.svelte-7c0c6176.js", "chunks/vendor-9f24c8b6.js"], "styles": [] }, ".svelte-kit/build/components/error.svelte": { "entry": "error.svelte-095e4a09.js", "css": ["assets/vendor-33dd9e65.css"], "js": ["error.svelte-095e4a09.js", "chunks/vendor-9f24c8b6.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-3e29780c.js", "css": ["assets/pages/index.svelte-21627872.css", "assets/vendor-33dd9e65.css", "assets/ImageCardContainer-b788c8a3.css"], "js": ["pages/index.svelte-3e29780c.js", "chunks/vendor-9f24c8b6.js", "chunks/ImageCardContainer-30b3de4f.js"], "styles": [] }, "src/routes/event/index.svelte": { "entry": "pages/event/index.svelte-99381052.js", "css": ["assets/vendor-33dd9e65.css"], "js": ["pages/event/index.svelte-99381052.js", "chunks/vendor-9f24c8b6.js"], "styles": [] }, "src/routes/event/[id].svelte": { "entry": "pages/event/[id].svelte-eaab9052.js", "css": ["assets/vendor-33dd9e65.css", "assets/DetailPage-c7c3979f.css", "assets/ImageCardContainer-b788c8a3.css"], "js": ["pages/event/[id].svelte-eaab9052.js", "chunks/vendor-9f24c8b6.js", "chunks/DetailPage-8c6bb976.js", "chunks/ImageCardContainer-30b3de4f.js"], "styles": [] }, "src/routes/place/index.svelte": { "entry": "pages/place/index.svelte-a2a0db7f.js", "css": ["assets/vendor-33dd9e65.css"], "js": ["pages/place/index.svelte-a2a0db7f.js", "chunks/vendor-9f24c8b6.js"], "styles": [] }, "src/routes/place/[id].svelte": { "entry": "pages/place/[id].svelte-0c0ba1fc.js", "css": ["assets/vendor-33dd9e65.css", "assets/DetailPage-c7c3979f.css", "assets/ImageCardContainer-b788c8a3.css"], "js": ["pages/place/[id].svelte-0c0ba1fc.js", "chunks/vendor-9f24c8b6.js", "chunks/DetailPage-8c6bb976.js", "chunks/ImageCardContainer-30b3de4f.js"], "styles": [] }, "src/routes/food/index.svelte": { "entry": "pages/food/index.svelte-faad526e.js", "css": ["assets/vendor-33dd9e65.css"], "js": ["pages/food/index.svelte-faad526e.js", "chunks/vendor-9f24c8b6.js"], "styles": [] }, "src/routes/food/[id].svelte": { "entry": "pages/food/[id].svelte-30d5a478.js", "css": ["assets/vendor-33dd9e65.css", "assets/DetailPage-c7c3979f.css", "assets/ImageCardContainer-b788c8a3.css"], "js": ["pages/food/[id].svelte-30d5a478.js", "chunks/vendor-9f24c8b6.js", "chunks/DetailPage-8c6bb976.js", "chunks/ImageCardContainer-30b3de4f.js"], "styles": [] } };
  }
});

// .svelte-kit/netlify/entry.js
__export(exports, {
  handler: () => handler
});
init_shims();

// .svelte-kit/output/server/app.js
init_shims();
init_app_f8d6d072();

// .svelte-kit/netlify/entry.js
init();
async function handler(event) {
  const { path, httpMethod, headers, rawQuery, body, isBase64Encoded } = event;
  const query = new URLSearchParams(rawQuery);
  const encoding = isBase64Encoded ? "base64" : headers["content-encoding"] || "utf-8";
  const rawBody = typeof body === "string" ? Buffer.from(body, encoding) : body;
  const rendered = await render({
    method: httpMethod,
    headers,
    path,
    query,
    rawBody
  });
  if (!rendered) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }
  const partial_response = {
    statusCode: rendered.status,
    ...split_headers(rendered.headers)
  };
  if (rendered.body instanceof Uint8Array) {
    return {
      ...partial_response,
      isBase64Encoded: true,
      body: Buffer.from(rendered.body).toString("base64")
    };
  }
  return {
    ...partial_response,
    body: rendered.body
  };
}
function split_headers(headers) {
  const h2 = {};
  const m2 = {};
  for (const key in headers) {
    const value = headers[key];
    const target = Array.isArray(value) ? m2 : h2;
    target[key] = value;
  }
  return {
    headers: h2,
    multiValueHeaders: m2
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
/*! fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
