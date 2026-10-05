// YOLOX ONNX inference, using the upstream BGR / 0..255 preprocessing.
// Runs off the UI thread. Model weights: Megvii YOLOX, Apache-2.0.
importScripts('ort.wasm.min.js');
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = new URL('./', self.location.href).href;
let session;
const side = 416;
const canvas = new OffscreenCanvas(side, side);
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const labels = 'person,bicycle,car,motorcycle,airplane,bus,train,truck,boat,traffic light,fire hydrant,stop sign,parking meter,bench,bird,cat,dog,horse,sheep,cow,elephant,bear,zebra,giraffe,backpack,umbrella,handbag,tie,suitcase,frisbee,skis,snowboard,sports ball,kite,baseball bat,baseball glove,skateboard,surfboard,tennis racket,bottle,wine glass,cup,fork,knife,spoon,bowl,banana,apple,sandwich,orange,broccoli,carrot,hot dog,pizza,donut,cake,chair,couch,potted plant,bed,dining table,toilet,tv,laptop,mouse,remote,keyboard,cell phone,microwave,oven,toaster,sink,refrigerator,book,clock,vase,scissors,teddy bear,hair drier,toothbrush'.split(',');

function overlap(a, b) {
  const [ax, ay, aw, ah] = a, [bx, by, bw, bh] = b;
  const intersection = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx)) *
    Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  return intersection / (aw * ah + bw * bh - intersection || 1);
}

function decode(output, width, height, ratio, threshold, maxBoxes) {
  if (output.dims.join(',') !== '1,3549,85') throw new Error('Unexpected YOLOX output shape');
  const predictions = [];
  let index = 0;
  for (const stride of [8, 16, 32]) {
    const grid = side / stride;
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++, index++) {
      const offset = index * 85, data = output.data;
      let best = 0, cls = 0;
      for (let c = 0; c < 80; c++) {
        const score = data[offset + 4] * data[offset + 5 + c];
        if (score > best) { best = score; cls = c; }
      }
      if (best < threshold) continue;
      const cx = (data[offset] + x) * stride / ratio;
      const cy = (data[offset + 1] + y) * stride / ratio;
      const w = Math.exp(data[offset + 2]) * stride / ratio;
      const h = Math.exp(data[offset + 3]) * stride / ratio;
      const left = Math.max(0, cx - w / 2), top = Math.max(0, cy - h / 2);
      const right = Math.min(width, cx + w / 2), bottom = Math.min(height, cy + h / 2);
      if (right <= left || bottom <= top) continue;
      predictions.push({ class: labels[cls], score: best, bbox: [left, top, right - left, bottom - top] });
    }
  }
  const kept = [];
  for (const p of predictions.sort((a, b) => b.score - a.score)) {
    if (kept.some(k => k.class === p.class && overlap(k.bbox, p.bbox) > 0.45)) continue;
    kept.push(p);
    if (kept.length >= maxBoxes) break;
  }
  return kept;
}

self.onmessage = async ({ data }) => {
  const { id, type, bitmap } = data;
  try {
    if (type === 'load') {
      session = await ort.InferenceSession.create(new URL('yolox_tiny.onnx', self.location.href).href,
        { executionProviders: ['wasm'] });
      self.postMessage({ id, result: true });
      return;
    }
    const width = bitmap.width, height = bitmap.height;
    const ratio = Math.min(side / width, side / height);
    ctx.fillStyle = 'rgb(114,114,114)';
    ctx.fillRect(0, 0, side, side);
    ctx.drawImage(bitmap, 0, 0, Math.floor(width * ratio), Math.floor(height * ratio));
    const pixels = ctx.getImageData(0, 0, side, side).data;
    const input = new Float32Array(3 * side * side);
    for (let channel = 0; channel < 3; channel++) for (let i = 0; i < side * side; i++) {
      input[channel * side * side + i] = pixels[i * 4 + 2 - channel];
    }
    const output = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, side, side]) });
    self.postMessage({ id, result: decode(output[session.outputNames[0]], width, height, ratio, data.threshold, data.maxBoxes) });
  } catch (error) { self.postMessage({ id, error: error.message }); }
  finally { bitmap?.close(); }
};
