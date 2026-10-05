# Balcony detector: training and independent device

The app now offers YOLOX Tiny as an experimental alternative to COCO SSD. It
uses pretrained COCO weights and the general `bird` class. No custom training
has taken place. Model changes alone have not reliably recognised all the
supplied balcony scenes.

## Collect usable training data

Use **Save camera photo for training** to download unannotated, full-resolution
camera frames. Nothing is uploaded automatically. Capture:

- Pigeons sitting sideways, facing the camera, walking, landing and partly hidden.
- The left ledge, railing, far corner and floor, including small/distant birds.
- Different daylight, shadows and camera positions.
- Empty balcony scenes and confusing objects such as rails, chairs and buildings.

As an initial collection target, aim for a few hundred distinct images (for
example 200–500), spread across several days and visits. This is a starting
target, not a guarantee of accuracy. Hundreds of almost identical adjacent
video frames do not provide the same variety. Keep the original resolution.

Draw a bounding box around **every visible pigeon** and label it `pigeon`.
Empty images need no boxes, but must remain in the dataset. Export annotations
in COCO detection format, as supported by YOLOX's
[custom-data guide](https://github.com/Megvii-BaseDetection/YOLOX/blob/main/docs/train_custom_data.md).

Split by recording session/day, not randomly by neighbouring video frames:
about 70% training, 15% validation and 15% untouched testing is a reasonable
starting split. Keep the supplied failure scenes in the test set rather than
training on them and counting them as evidence of generalisation.

## Fine-tune and evaluate

Train on a GPU-equipped workstation or a GPU notebook, starting from pretrained
YOLOX weights. Configure one class and use the official custom-data workflow.
Train off the deployed device; inference then runs locally on the device.

Compare the trained model with both current detectors on the same untouched
videos. Measure missed pigeon arrivals, false alarms per hour, and seconds from
arrival to confirmed detection. Include at least one long empty-balcony video.
Choose the confidence threshold using validation data, then freeze it for the
test. Do not treat a higher training score as proof of working balcony detection.

Export the chosen checkpoint to ONNX using YOLOX's export tool. A one-class
model changes the output dimensions and class mapping: the browser worker
currently expects 80 COCO classes. Update its decoder and repeat browser/device
tests before replacing the shipped file. Training is not an automatic drop-in
replacement for the bundled pretrained model.

## Independent hardware

An independent system needs these parts:

1. Camera aimed so perched pigeons occupy enough pixels.
2. Processor running the detector, such as a Raspberry Pi-class computer.
3. microSD storage for the operating system, model, settings and recordings.
4. Powered speaker or an amplifier plus passive speaker.
5. Continuous power and protection appropriate to the mounting location.

The processing board captures frames, checks the balcony region, requires
repeated detections and plays the local sound with a cooldown. The phone is
optional for setup; a laptop/cloud service need not remain switched on.

A conventional Wi-Fi camera with a speaker and memory card is not automatically
programmable. It needs supported custom-model execution, or a separate local
processing board receiving its video. Audio playback also needs a documented
interface. Confirm both before choosing a camera.

The app's ONNX file can be evaluated using ONNX Runtime on a processing board,
but the current browser interface is **not yet a boot-at-startup hardware
service**. Measure sustained inference speed, temperature and detection delay
on the actual board before purchasing an accelerator or promising continuous
operation. A camera's/accelerator's custom-model format may require conversion;
an ONNX file cannot necessarily run directly inside it. See Raspberry Pi's
[AI Camera documentation](https://www.raspberrypi.com/documentation/accessories/ai-camera.html)
for one programmable camera option and its model conversion requirements.
