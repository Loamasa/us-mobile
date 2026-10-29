// Exercise the real Metro middleware with deterministic upstream disconnects.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
function proxyResponse(headersSent = false, destroyed = false) {
  const upstream = new EventEmitter();
  const response = {
    headersSent, destroyed, status: null, body: null,
    writeHead(status) { assert.equal(this.headersSent, false, 'headers cannot be sent twice'); this.headersSent = true; this.status = status; },
    end(body) { this.body = body; },
    destroy() { this.destroyed = true; },
  };
  const exports = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../metro.config.js'), 'utf8'), {
    module: exports, __dirname: path.join(__dirname, '..'),
    require(name) {
      if (name === 'expo/metro-config') return { getDefaultConfig: () => ({ server: {}, resolver: {} }) };
      if (name === 'nativewind/metro') return { withNativeWind: config => config };
      if (name === 'http') return { request: () => upstream };
      return require(name);
    },
  });
  exports.exports.server.enhanceMiddleware(() => {}, {})({
    url: '/v1/projects/test', method: 'POST', headers: {}, pipe() {},
  }, response, () => {});
  return { upstream, response };
}
test('Metro proxy returns 502 if emulator is unavailable before headers', () => {
  const { upstream, response } = proxyResponse();
  upstream.emit('error', new Error('connection refused'));
  assert.equal(response.status, 502);
  assert.match(response.body, /Emulator proxy error/);
});
test('Metro proxy closes a partial response when emulator disconnects', () => {
  const { upstream, response } = proxyResponse(true);
  assert.doesNotThrow(() => upstream.emit('error', new Error('connection reset')));
  assert.equal(response.destroyed, true);
  assert.equal(response.body, null);
});
test('Metro proxy tolerates an error after the client has disconnected', () => {
  const { upstream, response } = proxyResponse(false, true);
  assert.doesNotThrow(() => upstream.emit('error', new Error('connection reset')));
  assert.equal(response.status, null);
});
