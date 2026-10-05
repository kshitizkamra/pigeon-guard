const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
const body = html.match(/async function scanBalcony\(w, h, source = video\) \{([\s\S]*?)\n    let photoTesting/)[0].replace(/\n    let photoTesting$/, '');
let mode = 'detail';
const calls = [];
const draws = [];
const makeCanvas = () => ({ width: 0, height: 0, getContext: () => ({ drawImage: (...args) => draws.push(args) }) });
const context = {
  document: { getElementById: () => ({ value: mode }) },
  video: {}, scanFrame: makeCanvas(), scanCrop: makeCanvas(),
  state: { settings: { confidence: 0.28 }, zone: { left: 0.04, right: 0.34, top: 0.14, bottom: 0.48 },
    model: { detect: async (image, count, threshold) => {
      calls.push({ count, threshold });
      return [{ class: 'bird', score: 0.3, bbox: [0, 0, image.width, image.height] }];
    } } }
};
vm.createContext(context);
vm.runInContext(body, context);
(async () => {
  const predictions = await context.scanBalcony(1204, 1600);
  assert(calls.length > 1, 'Detail mode must inspect crops');
  assert(calls.every(c => c.threshold === 0.28 && c.count === 20), 'Sensitivity must reach every model call');
  for (const p of predictions.slice(1)) {
    const [x,y,w,h] = p.bbox;
    assert(x >= 1204 * 0.04 - 1e-6 && y >= 1600 * 0.14 - 1e-6);
    assert(x+w <= 1204 * 0.34 + 1e-6 && y+h <= 1600 * 0.48 + 1e-6, 'Mapped boxes must stay in ledge zone');
  }
  assert.equal(draws.filter(d => d.length === 5).length, 1, 'One frozen frame per scan');
  const cropSizes = draws.filter(d => d.length === 9).map(d => d[3]);
  assert(Math.min(...cropSizes) < Math.max(...cropSizes), 'Detail scan must use both context and close scales');
  draws.length = 0;
  const photo = {};
  await context.scanBalcony(1204, 1600, photo);
  assert.equal(draws[0][0], photo, 'Photo test must scan the supplied photo rather than the live video');
  calls.length = 0;
  mode = 'full';
  await context.scanBalcony(1204, 1600);
  assert.equal(calls.length, 1, 'Fast mode needs only one inference');
  for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  console.log('PASS: sensitivity forwarding, crop mapping, frozen frame, fast mode, script syntax');
})().catch(error => { console.error(error); process.exitCode = 1; });
