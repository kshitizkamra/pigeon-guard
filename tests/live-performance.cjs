const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
const functions = html.slice(html.indexOf('    function closeViews'), html.indexOf('    async function scanBalcony'));
let mode = 'detail';
const calls = [], draws = [];
const context = { video: {}, setTimeout, document: { getElementById: () => ({ value: mode }) },
  scanCrop: { width: 0, height: 0, getContext: () => ({ drawImage: (...args) => draws.push(args) }) },
  state: { zone: { left: 0.45, right: 0.78, top: 0.44, bottom: 0.66 }, settings: { confidence: 0.28 },
    model: { detect: async (image, count, threshold) => { calls.push({ count, threshold }); return [{ class: 'bird', score: 0.5, bbox: [0, 0, image.width, image.height] }]; } } }
};
vm.createContext(context);
vm.runInContext('let liveScanIndex=0, liveZoneKey="", lastBirdBox=null, lastBirdView=null, activeLiveView=null;\n' + functions, context);
(async () => {
  for (let i=0; i<5; i++) {
    const before = calls.length;
    const predictions = await context.scanLive(1204,1600);
    assert.equal(calls.length-before,1, 'Each live update must run exactly one inference');
    const [x,y,w,h] = predictions[0].bbox;
    assert(x>=1204*0.45-1e-6 && y>=1600*0.44-1e-6);
    assert(x+w<=1204*0.78+1e-6 && y+h<=1600*0.66+1e-6);
  }
  assert(draws.some(d => d[1] !== draws[0][1] || d[3] !== draws[0][3]), 'Views must rotate');
  const recognisedView = draws.at(-1).slice(1,5);
  vm.runInContext('lastBirdBox=[700,850,50,70]; lastBirdView=activeLiveView.slice()',context);
  await context.scanLive(1204,1600);
  const tracked = draws.at(-1);
  assert.deepEqual(tracked.slice(1,5), recognisedView, 'Confirmation must keep the exact crop that recognised the bird');
  context.state.zone = { left: 0, right: 0.2, top: 0, bottom: 0.2 };
  await context.scanLive(1204,1600);
  assert(draws.at(-1)[1]+draws.at(-1)[3]<=1204*0.2+1e-6, 'Zone changes clear old tracking');
  assert(calls.every(c=>c.threshold===0.28));
  mode='full';
  await context.scanLive(1204,1600);
  assert.equal(draws.at(-1)[3],1204);
  console.log('PASS: one inference per live update, rotating views, bird confirmation, zone reset, sensitivity');
})().catch(e=>{console.error(e);process.exitCode=1;});
