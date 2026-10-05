# Detector assets

- `yolox_tiny.onnx`: unmodified pretrained COCO YOLOX Tiny from the official
  [YOLOX release 0.1.1rc0](https://github.com/Megvii-BaseDetection/YOLOX/releases/tag/0.1.1rc0).
  Apache-2.0; see `YOLOX-LICENSE.txt`.
- ONNX Runtime Web 1.20.1 WASM distribution: `ort.wasm.min.js`,
  `ort-wasm-simd-threaded.mjs`, `ort-wasm-simd-threaded.wasm`.
  MIT; see `ONNXRUNTIME-LICENSE.txt`.
- `yolox-worker.js` and `yolox-detector.js`: this application's adapter.

The model input is `[1,3,416,416]`, BGR float32 in 0..255 with top-left
letterboxing (padding 114). The output is `[1,3549,85]`, decoded using strides
8/16/32, objectness multiplied by class probability, and class-aware NMS at 0.45.
WASM inference runs in a worker with one thread, so cross-origin isolation is
not required. No GPU-specific speed is assumed.

This is a general bird detector, not a trained pigeon detector. Do not replace
this asset with a custom model without updating/validating class mapping and
output shape. In particular, a one-class pigeon model will have a different
output shape and needs an updated decoder.
