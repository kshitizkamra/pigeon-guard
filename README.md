# 🦅 Pigeon Guard - Standalone On-Device Balcony Deterrent

A 100% self-contained, AI-powered balcony pigeon scare system designed to run directly on an old Android smartphone with **NO Wi-Fi, NO internet, and NO extra hardware required**.

---

## 🚀 Quick Setup Instructions

### Step 1: Open the App on Your Old Android Phone
1. Connect your old phone to your home Wi-Fi just once to load the app.
2. Open **Google Chrome** on your phone.
3. In the address bar, type:
   ```
   https://192.168.29.113:8443
   ```
   *(Note: Because this uses a local self-signed SSL certificate so Chrome allows camera access, Chrome will show a **"Your connection is not private"** warning. Tap **Advanced** ➔ **Proceed to 192.168.29.113**).*

4. Chrome will ask for **Camera permission** — tap **Allow**.

---

### Step 2: Install as an Offline App (PWA)
1. Tap the **3 dots (⋮)** in the top right corner of Chrome.
2. Select **"Add to Home screen"** (or **"Install App"**).
3. An icon named **PigeonGuard** will appear on your phone's home screen just like a regular native Android app.

---

### Step 3: Turn Off Wi-Fi (100% Offline Mode)
* **You can now completely turn off Wi-Fi and Mobile Data!**
* The AI model, camera engine, sounds, and UI are fully cached on your phone's storage. It needs zero network connection to operate.

---

### Step 4: Position on Your Balcony
1. Prop the phone up on your balcony window sill or rail pointing at the ledge where pigeons try to land.
2. Plug the phone into a charger so it stays powered 24/7.
3. Open **Pigeon Guard**.
4. Adjust the **Balcony Railing Zone (ROI)** sliders on the screen so the green box covers just your railing/ledge (birds flying high in the sky outside this box will be ignored).
5. Tap **"START PIGEON GUARD"**:
   * The app will activate the **Screen Wake Lock** (the screen won't turn off).
   * It will begin real-time on-device bird detection.
   * As soon as a pigeon steps into your balcony zone, it blasts the predator sound / alarm from the phone's speaker at maximum volume and logs a timestamped snapshot!

---

## 🛠 Features

* **On-Device AI Vision:** Real-time object detection running locally on the phone's GPU (WebGL) searching specifically for birds/pigeons.
* **Smart Balcony Zone (ROI):** Define your railing boundary with touch sliders to prevent false alarms from distant flying birds.
* **Predator Sound System:**
  * 🦅 **Peregrine Falcon / Hawk Screech:** Natural raptor alarm call that pigeons instinctively flee from.
  * 🚨 **High-Intensity Alarm Burst:** Sudden startle tone.
  * 📡 **Ultrasonic Sweep (14-16kHz):** High-frequency disorienting pulse.
  * 🔀 **Anti-Habituation Randomizer:** Randomly selects sounds so pigeons never get used to one tone.
* **Camera Flash Strobe:** Optional strobe light pulse using the phone's camera flash to scare pigeons in low light.
* **Intruder Photo Gallery:** Automatically saves snapshots of scared pigeons with timestamps directly on the phone.
* **Screen Wake Lock:** Prevents Android from dimming or locking the screen while guarding your balcony.

---

## 💻 Testing on Your PC / Laptop First
You can also open and test the app right on your PC's browser with a webcam:
```
http://localhost:8000
```
Use the **"Test Alarm Sound"** or **"Test Detection"** buttons to verify the predator screams and detection sequence.
