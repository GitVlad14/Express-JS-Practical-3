'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadModule} = require('./helpers.cjs');
test('baseline: module can be loaded, no behavior assertions yet', () => {
  assert.ok(loadModule().utils);
});
