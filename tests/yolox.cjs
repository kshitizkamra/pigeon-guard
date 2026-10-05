const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = { importScripts() {}, ort: { env: { wasm: {} } }, self: { location: { href: 'http://localhost/static/ai/yolox-worker.js' } },
  URL, OffscreenCanvas: class { getContext() { return {}; } }, Math };
vm.createContext(context);
vm.runInContext(fs.readFileSync('static/ai/yolox-worker.js', 'utf8'), context);
const data = new Float32Array(3549 * 85);
function prediction(index, cls, score) {
  const offset = index * 85;
  data[offset] = 10 - index;
  data[offset + 1] = 10;
  data[offset + 2] = data[offset + 3] = Math.log(4);
  data[offset + 4] = 0.9;
  data[offset + 5 + cls] = score;
}
prediction(0, 14, 0.9);
prediction(1, 14, 0.8); // Same bird, suppressed.
prediction(2, 0, 0.8); // Different class, retained.
const result = context.decode({ dims: [1,3549,85], data }, 832,832,0.5,0.28,20);
assert.equal(result.length,2);
assert.equal(result[0].class,'bird');
assert(Math.abs(result[0].score-0.81)<1e-6);
assert(Math.abs(result[0].bbox[0]-128)<1e-5);
assert(Math.abs(result[0].bbox[2]-64)<1e-5);
assert.equal(context.decode({dims:[1,3549,85],data},832,832,.5,.9,20).length,0);
assert.throws(()=>context.decode({dims:[1,8400,85],data},832,832,.5,.28,20),/shape/);
console.log('PASS: YOLOX decode, source scaling, class-aware suppression, confidence and incompatible model rejection');
