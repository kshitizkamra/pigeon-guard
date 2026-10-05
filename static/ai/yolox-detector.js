// Model adapter shared by the existing live and photo detection paths.
window.YoloXDetector = class {
  constructor() {
    this.worker = new Worker('static/ai/yolox-worker.js');
    this.requests = new Map();
    this.nextId = 0;
    this.disposed = false;
    this.worker.onmessage = ({ data }) => {
      const request = this.requests.get(data.id);
      if (!request) return;
      clearTimeout(request.timer);
      this.requests.delete(data.id);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(data.result);
    };
    this.worker.onerror = event => this.fail(new Error(event.message || 'AI worker failed'));
  }
  fail(error) {
    for (const request of this.requests.values()) { clearTimeout(request.timer); request.reject(error); }
    this.requests.clear();
    this.worker.terminate();
    this.disposed = true;
  }
  send(message, transfers = []) {
    if (this.disposed) return Promise.reject(new Error('AI worker stopped; select the model again'));
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => this.fail(new Error('AI worker timed out; select the model again')), 120000);
      this.requests.set(id, { resolve, reject, timer });
      try { this.worker.postMessage({ ...message, id }, transfers); }
      catch (error) { clearTimeout(timer); this.requests.delete(id); reject(error); }
    });
  }
  static async load() {
    const detector = new window.YoloXDetector();
    try { await detector.send({ type: 'load' }); return detector; }
    catch (error) { detector.dispose(); throw error; }
  }
  async detect(source, maxBoxes = 20, threshold = 0.28) {
    const bitmap = await createImageBitmap(source);
    return this.send({ type: 'detect', bitmap, maxBoxes, threshold }, [bitmap]);
  }
  dispose() { this.fail(new Error('Model changed')); }
};
