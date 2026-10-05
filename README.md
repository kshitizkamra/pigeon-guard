# Pigeon Guard

An experimental balcony bird detector with local alarms. Open the
[phone app](https://kshitizkamra.github.io/pigeon-guard/) in Chrome, allow camera
access, and choose **Install Pigeon Guard** or Chrome's **Add to home screen**.

The camera, detection and audio run locally. First use needs internet to save
the app and the selected model. Check the offline-storage status before relying
on offline operation; browser storage can be cleared or evicted.

## Trying the detectors

**Detection model** switches between YOLOX Tiny (new experimental default) and
COCO SSD (previous detector). Neither has been trained specifically on this
balcony. Both use the general `bird` class and can miss pigeons or produce false
positives. A model being ready does not establish detection accuracy.

YOLOX uses ONNX Runtime in a worker, keeping inference off the UI thread. Its
initial model/runtime download is about 32 MB. Models are cached separately from
the app so normal page updates can retain them. The app displays the exact
release version and provides **Check for updates** / **Restart to use update**.

Set the green region around the relevant ledge/floor, leaving space for the
whole pigeon. Detail mode rotates through close views, one inference at a time,
and confirms birds using the same crop on a fresh frame. Full-view mode is
faster but can miss small birds. **Test a balcony photo** checks a frozen photo
without sounding the alarm. Arm the app separately when testing actual alarms.

## Training and independent camera hardware

**Save camera photo for training** downloads an unannotated camera frame locally.
It does not upload the image or train a model. See
[the collection, training and independent-device plan](docs/training-and-device.md).
A separate camera/speaker/microSD system also needs a processor to run detection.
The current browser app is not yet a hardware service that starts at boot.

## Development

Serve this folder over HTTP on localhost or HTTPS on a phone. Camera access on
a remote device needs a secure context. GitHub Pages publishes a versioned copy
using `scripts/prepare-release.cjs`, with `GITHUB_SHA` supplied by Actions.

Run `node tests/detection.cjs`, `node tests/live-performance.cjs`, and
`node tests/yolox.cjs` for detection plumbing/decoder checks. Browser tests
`tests/offline-browser.cjs` and `tests/model-browser.cjs` need Playwright and
Chrome (`BROWSER_EXECUTABLE` can override its default Windows path). The latter
loads and executes the actual YOLOX model and checks offline inference and
model switching. These checks do not replace accuracy testing on unseen video
or speed testing on the deployed device.

Model/runtime provenance and licence notices are in [static/ai](static/ai/README.md).
