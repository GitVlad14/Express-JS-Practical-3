'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');
const state = {etag: [], trust: [], qs: []};
const stubs = {
  'content-type': {
    parse(value) {
      if (typeof value !== 'string' || !value.includes('/')) throw new TypeError('invalid content-type');
      const [main, ...attrs] = value.split(';'); const parameters = {};
      for (const item of attrs) {const idx = item.indexOf('='); if(idx>=0) parameters[item.slice(0,idx).trim().toLowerCase()] = item.slice(idx+1).trim();}
      return {type: main.trim().toLowerCase(), parameters};
    },
    format(value) {
      return value.type + Object.entries(value.parameters).map(([k,v])=>`; ${k}=${v}`).join('');
    }
  },
  'etag': (buffer, options) => {
    state.etag.push({body: buffer.toString('utf8'), options});
    return (options.weak ? 'W/' : '') + '"' + buffer.length + '"';
  },
  'mime-types': {lookup(type) {
    return ({html: 'text/html', json:'application/json', txt:'text/plain', '.html':'text/html'})[type] || false;
  }},
  'proxy-addr': {compile(value) {
    state.trust.push(value);return function mockTrust(address) {return Array.isArray(value) && value.includes(address);};
  }},
  'qs': {parse(value, opts) {
    state.qs.push({value, options: opts});
    return Object.fromEntries(new URLSearchParams(value));
  }}
};
function loadModule() {
  // The real Express file can be supplied by EXPRESS_UTILS_PATH. The bundled snapshot
  // was extracted from the previous ESLint result and retains the original MIT header.
  const file = path.resolve(process.env.EXPRESS_UTILS_PATH || path.join(__dirname,'../source_snapshot/utils.js'));
  const contents = fs.readFileSync(file, 'utf8');
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  const baseRequire = mod.require.bind(mod);
  mod.require = (id) => Object.prototype.hasOwnProperty.call(stubs,id) ? stubs[id] : baseRequire(id);
  mod._compile(contents, file);
  return {utils: mod.exports, file, sha256: crypto.createHash('sha256').update(contents).digest('hex')};
}
module.exports = {loadModule,state};
