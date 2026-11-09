'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadModule,state} = require('./helpers.cjs');
const {utils} = loadModule();

// Characterization assertions document observed behavior in this source snapshot.
// No production code is altered; third-party dependencies are replaced with controlled doubles.

test('HTTP methods are normalized to lowercase', () => {
  assert.ok(utils.methods.includes('get')); assert.ok(utils.methods.includes('post'));
  assert.equal(utils.methods.some(x=> x!==x.toLowerCase()),false);
});
test('normalizeType maps common extension through MIME lookup', () => {
  assert.deepEqual(utils.normalizeType('html'), {value:'text/html',params:{}});
});
test('normalizeType maps unknown extension to octet-stream', () => {
  assert.deepEqual(utils.normalizeType('weirdformat'), {value:'application/octet-stream',params:{}});
});
test('normalizeType preserves explicit content type', () => {
  assert.deepEqual(utils.normalizeType('application/json'), {value:'application/json',quality:1,params:{}});
});
test('normalizeType parses q and a custom parameter', () => {
  assert.deepEqual(utils.normalizeType('text/html; q=0.4; level=1'), {value:'text/html',quality:0.4,params:{level:'1'}});
});
test('normalizeType ignores malformed segment missing equals', () => {
  assert.deepEqual(utils.normalizeType('text/plain; broken'), {value:'text/plain',quality:1,params:{}});
});
test('normalizeType skips semicolon before equals in following segment', () => {
  assert.deepEqual(utils.normalizeType('text/html; flag; q=0.3'), {value:'text/html',quality:0.3,params:{}});
});
test('normalizeType accepts empty q value as NaN (suspicious observation)', () => {
  const r=utils.normalizeType('text/html;q='); assert.ok(Number.isNaN(r.quality));
});
test('normalizeType uses last q when repeated (suspicious observation)', () => {
  assert.equal(utils.normalizeType('text/html;q=0.2;q=0.9').quality,0.9);
});
test('normalizeTypes maps an array including empty array', () => {
  assert.deepEqual(utils.normalizeTypes([]),[]);
  assert.deepEqual(utils.normalizeTypes(['html','json']).map(x=>x.value),['text/html','application/json']);
});
test('normalizeType fails for null input', () => {
  assert.throws(()=>utils.normalizeType(null), TypeError);
});
test('compileETag returns an existing custom function unchanged', () => {
  const f=()=> 'custom'; assert.equal(utils.compileETag(f),f);
});
test('compileETag true and weak select weak generator', () => {
  assert.equal(utils.compileETag(true),utils.wetag);
  assert.equal(utils.compileETag('weak'),utils.wetag);
});
test('compileETag strong selects strong generator', () => {
  assert.equal(utils.compileETag('strong'),utils.etag);
});
test('compileETag false disables generator', () => {
  assert.equal(utils.compileETag(false),undefined);
});
test('compileETag rejects unknown values', () => {
  assert.throws(()=>utils.compileETag('invalid'),/unknown value/);
});
test('strong and weak ETag differ and accept Buffer', () => {
  assert.equal(utils.etag('abc'), '"3"');
  assert.equal(utils.wetag(Buffer.from('abc')), 'W/"3"');
  assert.equal(state.etag.at(-1).body,'abc');
});
test('ETag generator accepts explicit encoding', () => {
  assert.equal(utils.etag('6162','hex'),'"2"');
});
test('compileQueryParser accepts user supplied function', () => {
  const fn=()=>({ok:true});assert.equal(utils.compileQueryParser(fn),fn);
});
test('compileQueryParser simple and true use native parser', () => {
  assert.deepEqual(Object.assign({},utils.compileQueryParser(true)('a=1')),{a:'1'});
  assert.deepEqual(Object.assign({},utils.compileQueryParser('simple')('x=2')),{x:'2'});
});
test('compileQueryParser false disables query parsing', () => {
  assert.equal(utils.compileQueryParser(false),undefined);
});
test('compileQueryParser extended delegates with allowPrototypes=true (review)', () => {
  const fn=utils.compileQueryParser('extended');
  assert.deepEqual(fn('a=1'),{a:'1'});
  assert.equal(state.qs.at(-1).options.allowPrototypes,true);
});
test('compileQueryParser invalid option throws', () => {
  assert.throws(()=>utils.compileQueryParser('invalid'),/unknown value/);
});
test('compileTrust returns user supplied function unchanged', () => {
  const f=()=>true; assert.equal(utils.compileTrust(f),f);
});
test('compileTrust true trusts all addresses', () => {
  assert.equal(utils.compileTrust(true)('1.2.3.4'),true);
});
test('compileTrust number trusts hops below threshold', () => {
  const f=utils.compileTrust(2);assert.equal(f('x',0),true);assert.equal(f('x',2),false);
});
test('compileTrust comma separated string trims entries', () => {
  const f=utils.compileTrust(' 127.0.0.1 , 10.0.0.1 ');
  assert.deepEqual(state.trust.at(-1),['127.0.0.1','10.0.0.1']);
  assert.equal(f('127.0.0.1'),true);
});
test('compileTrust false delegates empty list', () => {
  const f=utils.compileTrust(false);assert.deepEqual(state.trust.at(-1),[]);
  assert.equal(f('127.0.0.1'),false);
});
test('compileTrust array forwards original entries', () => {
  utils.compileTrust(['127.0.0.1']);assert.deepEqual(state.trust.at(-1),['127.0.0.1']);
});
test('setCharset returns original if content type missing', () => {
  assert.equal(utils.setCharset('', 'utf-8'),'');
});
test('setCharset returns original if charset missing', () => {
  assert.equal(utils.setCharset('text/html', ''),'text/html');
});
test('setCharset inserts charset', () => {
  assert.equal(utils.setCharset('text/html', 'utf-8'),'text/html; charset=utf-8');
});
test('setCharset overwrites existing charset', () => {
  assert.equal(utils.setCharset('text/html; charset=ascii','utf-8'),'text/html; charset=utf-8');
});
test('setCharset propagates invalid content type error', () => {
  assert.throws(()=>utils.setCharset('not-a-type','utf-8'),TypeError);
});
