# NeuroWatch AI — IoT Mental Health Monitoring Dashboard

> An AI-powered, real-time mental health and stress monitoring system using **IoT Simulation** (Wokwi + ThingSpeak), a **Stacking Ensemble ML model** (LGBM + XGBoost + ExtraTrees → CatBoost), Flask, Firebase, and React.js

---

## 🧠 Project Overview

**NeuroWatch AI** is a fully **simulation-based IoT project** — no physical hardware is required. IoT sensor data is simulated using **Wokwi** (an online IoT simulator), streamed to **ThingSpeak** (a cloud IoT platform), and then processed by a **Flask backend** with a **Stacking Ensemble AI model** trained on the real **WESAD wearable stress dataset** to predict mental health risk levels in real time.

> ⚠️ **This project does NOT use any physical hardware.** All sensors are simulated digitally using the Wokwi IoT simulator.

**Simulation Components (Wokwi):**
- **ESP32** — Simulated WiFi microcontroller (runs virtually inside Wokwi)
- **MPU6050** — Simulated motion/accelerometer sensor
- **Potentiometer** — Simulates heart rate & stress values
- **LCD I2C 16×2** — Simulated on-device display
- **LED + Buzzer** — Simulated alert outputs

**ThingSpeak Channel Mapping:**
| Field | Simulated Sensor | Description |
|-------|-----------------|-------------|
| Field 1 | Heart Rate (Potentiometer) | Simulated 40–200 BPM |
| Field 2 | Stress Score | Simulated derived value 0–100% |
| Field 3 | Motion (MPU6050) | Simulated accelerometer magnitude |

---

## 🏗️ How the Simulation Works

```
Wokwi Simulator (Browser)
    └── Simulated ESP32 + Sensors
            │
            ▼  (HTTP POST via simulated WiFi)
        ThingSpeak Cloud IoT
            │
            ▼  (REST API polling)
        Flask Backend (Python)
            │
            ├── Stacking Ensemble AI ──▶ Stress Risk Prediction (LOW/MEDIUM/HIGH)
            ├── Rule-Based EEG Engine ──▶ Cognitive Load Classification
            ├── Hallucination Engine  ──▶ Hallucination Risk Score
            ├── Firebase Realtime DB  ──▶ Alert Logging
            └── SQLite (local DB)     ──▶ Sleep & Routine Tracking
                        │
                        ▼
                React.js Frontend (Dashboard)
                    ├── Clerk Auth (Sign In / Sign Up)
                    ├── Voice Assistant (Web Speech API + Gemini AI)  [NEW]
                    ├── Facial Emotion Recognition (face-api.js)       [NEW]
                    ├── 3D Brain Visualisation (React Three Fiber)     [NEW]
                    ├── Live Location Tracking (Google Maps API)       [NEW]
                    └── 10 Pages
```

---

## 🤖 AI Models Used

### 1. Stacking Ensemble — Main Stress Classifier

The core AI model is a **2-level Stacking Ensemble** trained on the **WESAD (Wearable Stress and Affect Detection)** dataset — a real physiological dataset from wrist-worn sensors.

**Level 0 — Base Learners:**
| Model | Library | Role |
|-------|---------|------|
| `LGBMClassifier` | LightGBM | Base learner |
| `XGBClassifier` | XGBoost | Base learner |
| `ExtraTreesClassifier` | scikit-learn | Base learner |

**Level 1 — Meta-Learner (final decision maker):**
| Model | Library | Role |
|-------|---------|------|
| `CatBoostClassifier` | CatBoost | Combines base model outputs → final prediction |

**How Stacking Works:**
1. The 3 base models each produce probability scores
2. Those scores become **meta-features** fed into CatBoost
3. CatBoost makes the **final stress classification**

**Training Details:**
- **Dataset:** WESAD — real physiological wrist sensor data
- **Features:** 38 features → Top 20 selected via `SelectFromModel`
- **Validation:** `GroupKFold(5 splits)` grouped by Patient ID — zero data leakage
- **Hyperparameter Tuning:** Optuna TPESampler, 50 trials per base model
- **Scaling:** `RobustScaler` (robust to physiological outliers)
- **Output Classes:** Normal / High Stress → mapped to LOW / MEDIUM / HIGH risk

**Feature Set (38 features from 4 wrist sensors):**
| Sensor | Features |
|--------|----------|
| ACC (Accelerometer) | mean/std per axis, motion intensity, energy, range (9 features) |
| BVP (Blood Volume Pulse) | mean, std, min, max, range, rms, skew, kurt, cardiac power, dominant freq, HRV (IBI, RMSSD, pNN50) (15 features) |
| EDA (Electrodermal Activity) | mean, std, min, max, slope, energy, tonic, phasic, SCR count (9 features) |
| TEMP (Skin Temperature) | mean, std, min, max, slope (5 features) |

**Prediction Modes:**
- **Mode A (Full Sensor Arrays):** Raw ACC/BVP/EDA/TEMP arrays → 38 features → Stacking Ensemble → HIGH accuracy
- **Mode B (Simple Fallback):** heart_rate + stress + motion → Rule-based thresholding (for basic devices)

---

### 2. Rule-Based EEG Cognitive Load Classifier

A threshold-based classifier for EEG brainwave data, used in the **EEG Simulator** page.

**EEG Band Thresholds:**
| Band | Threshold | Meaning |
|------|-----------|---------|
| Beta > 15.0 | High | Acute mental stress |
| Alpha < 5.0 | Low | Sustained cognitive load |
| Theta > 12.0 | High | Working memory overload |
| Delta > 20.0 | High | Deep fatigue |
| Gamma > 8.0 | High | Sensory overload |

**Output:** LOW / MEDIUM / HIGH cognitive load

---

### 3. Hybrid Hallucination Risk Engine

A rule-based hybrid engine that combines:
- AI stress risk output (from CatBoost model)
- Historical **sleep quality data** (from SQLite)

**Logic:**
- Base probability from stress risk (LOW=10%, MEDIUM=35%, HIGH=65%)
- **Sleep deprivation** is the primary amplifier — avg sleep quality < 40 triggers significant penalty
- Output: Hallucination probability (0–100%) → LOW / MEDIUM / HIGH / CRITICAL

---

### 4. ✨ NEW — Facial Emotion Recognition (face-api.js)

A **real-time, in-browser AI** facial emotion detection system powered by **face-api.js** (TensorFlow.js under the hood).

**How it works:**
- Uses `TinyFaceDetector` + `FaceExpressionNet` loaded from CDN — no server required
- Webcam feed is analysed at **1-second intervals** using the browser's camera
- Detects 7 emotions: `happy`, `sad`, `angry`, `fearful`, `surprised`, `disgusted`, `neutral`
- Overlays face bounding boxes + expression labels directly on the video canvas
- Shows emoji, colour-coded label, and confidence progress bar on the Dashboard
- Fires an `onEmotionDetected(emotion, confidence%)` callback to the parent page

**Integration:** Embedded in the **Dashboard** as a live widget alongside the 3D Brain Model.

---

### 5. ✨ NEW — Gemini AI-Powered Voice Assistant (Upgraded)

The Voice Assistant was upgraded from a simple TTS/STT system to a **full conversational AI** powered by **Google Gemini 1.5 Flash**.

**What's new:**
- User speech input → transcribed via `SpeechRecognition` (STT)
- Transcript sent to **Gemini 1.5 Flash** with a mental-health-specific empathetic system prompt
- Gemini's response is spoken back via `SpeechSynthesis` (TTS)
- Prefers a calm female voice (Samantha / Victoria / Google UK English Female) if available
- If the user says "music" or "song", automatically opens a curated **Spotify calming playlist**
- **Audio unlock banner** — prompts user to click once (browser autoplay policy workaround)
- Pending auto-speech queued until user grants audio permission

---

## 🏛️ ML Architecture — Stacking Ensemble Pipeline

### Full Training Pipeline (5 Steps)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WESAD Dataset (wesad_clean.csv)                  │
│           Real wrist sensor data — grouped by Patient_ID            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1 — Feature Engineering & Preprocessing                       │
│                                                                     │
│  Raw sensors → 38 engineered features                               │
│    ACC  (9)  : mean/std per axis, motion intensity, energy, range   │
│    BVP  (15) : time-domain stats + HRV (IBI, RMSSD, pNN50) + FFT   │
│    EDA  (9)  : mean/std/slope + tonic/phasic decomposition + SCR    │
│    TEMP (5)  : mean, std, min, max, slope                           │
│                                                                     │
│  RobustScaler → normalize (resistant to physiological outliers)     │
│  SelectKBest (ANOVA F-value) → Top 20 of 38 features selected      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2 — Hyperparameter Tuning (Optuna TPESampler)                 │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ LGBM         │  │ XGBoost      │  │ ExtraTrees               │  │
│  │ 50 trials    │  │ 50 trials    │  │ 50 trials                │  │
│  │ GroupKFold-5 │  │ GroupKFold-5 │  │ GroupKFold-5             │  │
│  │ Metric: F1   │  │ Metric: F1   │  │ Metric: F1               │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
│  Objective: Maximise macro-averaged F1 (handles class imbalance)    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3 — Manual OOF Meta-Feature Generation (GroupKFold-5)         │
│                                                                     │
│  For each fold:                                                     │
│    Train LGBM, XGB, ExtraTrees on n-1 folds                        │
│    Predict probabilities on held-out fold → [P(Normal), P(Stress)]  │
│                                                                     │
│  Result: OOF meta-matrix (n_samples × 6 cols)                      │
│    [LGBM_P0, LGBM_P1, XGB_P0, XGB_P1, ET_P0, ET_P1]              │
│                                                                     │
│  ✅ No subject-level data leakage at any stage                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4 — Final Training on Full Data                               │
│                                                                     │
│  • Retrain LGBM + XGBoost + ExtraTrees on full dataset              │
│  • Train CatBoostClassifier (iterations=300, depth=4,               │
│    auto_class_weights=Balanced) on full OOF meta-feature matrix     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5 — Save Artifacts                                            │
│    mental_health_model.pkl  — StackingEnsemble                      │
│    scaler.pkl               — RobustScaler                          │
│    selector.pkl             — SelectKBest (Top 20 features)         │
│    label_encoder.pkl        — LabelEncoder  [NEW]                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Inference Pipeline (at Runtime)

```
IoT Data (Wokwi → ThingSpeak)
        │
        ▼
  Raw sensor arrays
  ACC[256×3], BVP[512], EDA[32], TEMP[32]
        │
        ▼  feature_pipeline.py
  38 engineered features
        │
        ▼  RobustScaler.transform()
  Scaled features
        │
        ▼  SelectKBest.transform()
  Top 20 features
        │
     ┌──┴──────────────────────────────────┐
     │                                     │
     ▼                                     ▼
  LGBM         XGBoost         ExtraTrees
  P(Normal)    P(Normal)       P(Normal)
  P(Stress)    P(Stress)       P(Stress)
     │                                     │
     └──────────────┬──────────────────────┘
                    │
                    ▼
          Meta-features [6 values]
                    │
                    ▼
          CatBoostClassifier
                    │
                    ▼
         ┌──────────────────┐
         │  Final Output    │
         │  Normal / Stress │
         │  + Confidence %  │
         └──────────────────┘
                    │
                    ▼
    Risk Mapping (predict.py):
    Stress + conf ≥ 80% → HIGH
    Stress + conf < 80% → MEDIUM
    Normal + proba < 35% → LOW
    Motion filter: if motion > 1.5 → override to LOW
```

---

### Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Validation strategy | `GroupKFold(5)` by Patient ID | Prevents subject-level data leakage |
| Stacking method | Manual OOF (not sklearn's) | sklearn `StackingClassifier` leaks group data |
| Scaling | `RobustScaler` | Physiological signals have outliers |
| Feature selection | `SelectKBest` (ANOVA F-value, k=20) | Removes noisy/redundant features |
| Class imbalance | `class_weight="balanced"` + `auto_class_weights` | WESAD is imbalanced (more normal than stress) |
| Tuning objective | Macro-averaged F1 | Treats both classes equally |
| Meta-learner | CatBoost (depth=4, 300 trees) | Handles tabular meta-features well, built-in class balancing |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| IoT Simulation | Wokwi (Simulated ESP32 + MPU6050 + Potentiometer) |
| Cloud IoT | ThingSpeak API |
| Authentication | Clerk (Sign In / Sign Up) — contacts saved to Clerk account metadata |
| Frontend | React.js (Vite) + Tailwind CSS + Chart.js |
| Voice Assistant | Web Speech API (TTS + STT) + **Google Gemini 1.5 Flash** *(NEW)* |
| Facial Emotion | **face-api.js** (TinyFaceDetector + FaceExpressionNet) *(NEW)* |
| 3D Visualisation | **React Three Fiber + drei** (animated 3D brain model) *(NEW)* |
| Live Location | **Google Maps API** (@react-google-maps/api) *(NEW)* |
| Animations | **Framer Motion** *(NEW)* |
| Backend | Flask (Python) + Flask-CORS |
| HTTPS Dev Server | **@vitejs/plugin-basic-ssl** (self-signed SSL for camera/mic APIs) *(NEW)* |
| AI — Main Model | Stacking Ensemble: LightGBM + XGBoost + ExtraTrees → CatBoost |
| AI — EEG | Rule-based EEG threshold classifier |
| AI — Hallucination | Hybrid rule engine (stress + sleep quality) |
| AI — Emotion | face-api.js in-browser facial expression recognition *(NEW)* |
| AI — Voice NLP | Google Gemini 1.5 Flash (`@google/generative-ai`) *(NEW)* |
| Hyperparameter Tuning | Optuna (TPESampler, 50 trials/model) |
| Feature Scaling | RobustScaler (scikit-learn) |
| Feature Selection | SelectKBest ANOVA F-value (Top 20 of 38) |
| Database (cloud) | Firebase Realtime Database |
| Database (local) | SQLite (`neurowatch.db`) |
| HTTP | Axios |
| Push Notifications | **Web Push API + Service Worker** (`/sw.js`) *(NEW)* |
| Device Vibration | **Navigator Vibrate API** *(NEW)* |
| Deployment | Frontend: Vercel & Backend: Render |

---

## 📁 Project Structure

```
internship/
├── frontend/                       # React.js Vite app
│   ├── src/
│   │   ├── api/                    # API modules
│   │   │   ├── thingspeak.js       # ThingSpeak IoT data fetching
│   │   │   ├── flask.js            # Flask backend calls
│   │   │   ├── firebase.js         # Firebase CRUD
│   │   │   ├── eeg.js              # EEG simulation calls
│   │   │   └── notifications.js    # Web Push + Service Worker + Vibration API [NEW]
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Layout/             # Sidebar, Header, Footer, AppFooter
│   │   │   ├── Cards/              # MetricCard, AlertCard, DeviceStatusCard
│   │   │   ├── Charts/             # Chart.js components
│   │   │   │   └── BrainModel3D.jsx  # Animated 3D brain (React Three Fiber) [NEW]
│   │   │   ├── AI/                 # PredictionPanel, RecommendationPanel
│   │   │   │   └── EmotionCamera.jsx # face-api.js facial emotion widget [NEW]
│   │   │   ├── Notifications/      # EmergencyPopup, NotificationPanel
│   │   │   └── Assistant/          # VoiceAssistant (Web Speech API + Gemini AI)
│   │   ├── context/                # AppContext (global state)
│   │   ├── pages/                  # 10 pages (see below)
│   │   └── index.css               # Cyberpunk dark theme
│   ├── .env.example
│   ├── vite.config.js              # HTTPS dev server (basicSsl plugin) [NEW]
│   └── package.json
│
└── backend/                        # Flask API
    ├── app.py                      # Main Flask application
    ├── database.py                 # SQLite layer (sleep + routine tracking)
    ├── model/
    │   ├── train_model.py          # Stacking Ensemble training (LGBM+XGB+ET → CatBoost)
    │   ├── feature_pipeline.py     # IoT → 38 features → Top 20 → prediction
    │   ├── clean_wesad.py          # WESAD dataset preprocessing
    │   ├── clean_eeg.py            # EEG dataset preprocessing
    │   ├── mental_health_model.pkl # Trained StackingEnsemble (saved)
    │   ├── scaler.pkl              # Fitted RobustScaler (saved)
    │   ├── selector.pkl            # Fitted feature selector (saved)
    │   └── label_encoder.pkl       # Fitted LabelEncoder (saved) [NEW]
    ├── routes/
    │   ├── predict.py              # POST /api/predict (main AI endpoint)
    │   ├── eeg_routes.py           # POST /api/simulate/eeg (EEG classifier)
    │   ├── routine_routes.py       # Routine, sleep, hallucination + therapeutic actions [UPGRADED]
    │   └── firebase_routes.py      # Firebase CRUD routes
    ├── render.yaml                 # Render.com deployment config
    ├── .env.example
    └── requirements.txt
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** v18+ → [nodejs.org](https://nodejs.org)
- **Python** 3.10+ → [python.org](https://python.org)
- **pip** package manager
- **Wokwi account** (free) → [wokwi.com](https://wokwi.com) *(IoT simulation)*
- **ThingSpeak account** (free) → [thingspeak.com](https://thingspeak.com) *(cloud IoT data)*
- **Clerk account** (free) → [clerk.com](https://clerk.com) *(authentication)*
- **Google Gemini API key** (free) → [aistudio.google.com](https://aistudio.google.com) *(voice NLP)* *(NEW)*
- **Google Maps API key** → [console.cloud.google.com](https://console.cloud.google.com) *(location page)* *(NEW)*

> 💡 No physical hardware, no microcontroller boards, no sensors needed. Everything runs in simulation.

---

### Step 1 — Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your ThingSpeak, Firebase, Clerk, Gemini, and Google Maps credentials
npm run dev
```

Frontend runs at: **https://localhost:5173** *(HTTPS — required for webcam + microphone APIs)*

> ⚠️ The Vite dev server now runs over **HTTPS** (`@vitejs/plugin-basic-ssl`). Your browser may show a self-signed certificate warning — click "Proceed" to continue. HTTPS is required for `getUserMedia` (webcam) and `SpeechRecognition` (microphone) APIs.

---

### Step 2 — Setup Backend

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

python app.py
```

Backend runs at: **http://localhost:5000**

> On first start, Flask loads the pre-trained Stacking Ensemble model from `mental_health_model.pkl`.

---

### Step 3 — Run the IoT Simulation (Wokwi)

1. Go to [wokwi.com](https://wokwi.com) and open the project simulation
2. The simulated ESP32 automatically sends sensor data to ThingSpeak
3. Adjust the **potentiometer** slider in Wokwi to change simulated heart rate & stress
4. The **MPU6050** in Wokwi generates simulated motion data

> 💡 No soldering. No physical sensors. No microcontroller boards. 100% virtual.

---

### Step 4 — Configure ThingSpeak

1. Create a free account at [thingspeak.com](https://thingspeak.com)
2. Create a channel with 3 fields: Heart Rate, Stress, Motion
3. Copy your **Channel ID** and **Read API Key**
4. Add to `frontend/.env`:
   ```
   VITE_THINGSPEAK_CHANNEL_ID=your_channel_id
   VITE_THINGSPEAK_API_KEY=your_read_api_key
   ```

---

### Step 5 — Configure Clerk (Authentication)

1. Create a free account at [clerk.com](https://clerk.com)
2. Create an application → copy **Publishable Key**
3. Add to `frontend/.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=your_publishable_key
   ```

> **New in v2:** Caregiver phone numbers are now saved to **Clerk account metadata** (`unsafeMetadata`) — not just localStorage. They sync across all devices where the user logs in.

---

### Step 6 — Configure Gemini AI *(NEW)*

Get a free API key from [aistudio.google.com](https://aistudio.google.com):
```
VITE_GEMINI_API_KEY=your_gemini_api_key
```

> Used by the Voice Assistant to generate empathetic conversational responses.

---

### Step 7 — Configure Google Maps *(NEW)*

Enable **Maps JavaScript API** in [Google Cloud Console](https://console.cloud.google.com):
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

> Used by the **Location** page to display patient's live GPS on a dark-themed map.

---

### Step 8 — Configure Firebase (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Enable **Realtime Database**
3. Go to Project Settings → Service Accounts → Generate private key
4. Save as `backend/firebase_admin_sdk.json`
5. Add to `backend/.env`:
   ```
   FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   ```

> **Note:** The app works without Firebase — it falls back to local SQLite and simulated data.

---

## 🌐 Website Pages (10 Pages)

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero section, live stats, feature overview |
| Dashboard | `/dashboard` | Live charts + metric cards + AI stress summary + **3D Brain Model** + **Facial Emotion Camera** *(NEW)* |
| Analytics | `/analytics` | Historical trends + CSV/PDF export |
| AI Prediction | `/ai-prediction` | Live Stacking Ensemble prediction + recommendations |
| EEG Simulator | `/eeg-simulator` | Streams Mendeley-derived EEG demo data row-by-row → rule-based cognitive load classification |
| Patient Behaviour | `/patient-behaviour` | Sleep tracking + hallucination risk engine + **Therapeutic Action Recommendations** *(NEW)* |
| Location | `/location` | **Live GPS map** with dark cyberpunk theme (Google Maps) *(NEW)* |
| Alert History | `/alert-history` | Firebase alert log with filtering |
| About | `/about` | Project details, simulation setup, tech stack |
| Settings | `/settings` | Emergency contacts saved to **Clerk account** (cross-device sync) *(UPGRADED)* |

---

## 🚨 Alert Thresholds

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Heart Rate | > 110 BPM | 🔴 Critical alert |
| Stress | > 75% | 🔴 Critical alert |
| Motion | > 7 m/s² | 🟡 Warning |
| AI Risk | HIGH | 🔴 Emergency popup + siren + vibration |
| Hallucination Risk | ≥ 75% | 🔴 CRITICAL — Voice assistant auto-triggered |

### 🆕 Emergency Popup — Upgraded Features
- **Siren Audio:** Web Audio API square-wave oscillator alternates 800 Hz ↔ 1200 Hz
- **Device Vibration:** `navigator.vibrate([500, 200, 500, ...])` pattern (Android browsers)
- **Web Push Notification:** Service Worker push (fires even when app tab is backgrounded)
- **Live GPS Location:** Fetches `navigator.geolocation` on popup open
- **SMS with Location:** `sms:` URI sends Google Maps GPS link to Caregiver 1
- **WhatsApp with Location:** `wa.me` link sends GPS coordinates to Caregiver 1 via WhatsApp
- **Auto-dismiss:** Popup auto-closes after 30 seconds

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server + model status |
| POST | `/api/predict` | Stacking Ensemble stress prediction |
| POST | `/api/simulate/eeg` | Rule-based EEG cognitive load classification |
| POST | `/api/hallucination/predict` | Hybrid hallucination risk engine + therapeutic actions *(UPGRADED)* |
| POST | `/api/log` | Save sensor record to Firebase |
| GET | `/api/history` | Retrieve sensor history from Firebase |
| GET | `/api/alerts` | Retrieve alert log from Firebase |
| POST | `/api/routine/log` | Log sensor snapshot to SQLite |
| GET | `/api/routine/history` | Retrieve routine history from SQLite |
| GET | `/api/routine/sleep-summary` | Get sleep quality statistics |

**POST /api/predict — Mode A (Full Sensor Arrays):**
```json
{
  "acc":  [[x,y,z], ...],
  "bvp":  [v1, v2, ...],
  "eda":  [e1, e2, ...],
  "temp": [t1, t2, ...]
}
```

**POST /api/predict — Mode B (Simple Fallback):**
```json
{
  "heart_rate": 95,
  "stress": 68,
  "motion": 3.5
}
```

**Prediction Response:**
```json
{
  "risk": "MEDIUM",
  "confidence": 87.3,
  "message": "Moderate stress indicators detected.",
  "recommendations": ["Practice mindfulness...", "..."],
  "probabilities": { "Normal": 12.7, "High_Stress": 87.3 },
  "model_used": "stacking_ensemble_top_20_features",
  "simple_mode": false
}
```

**POST /api/hallucination/predict — Upgraded Response (with therapeutic actions):**
```json
{
  "hallucination_risk": 68,
  "hallucination_level": "HIGH",
  "sleep_quality_score": 32,
  "sleep_status": "AWAKE",
  "voice_trigger": true,
  "voice_message": "You seem stressed. Would you like calming music or a breathing exercise?",
  "recommendations": ["..."],
  "actions": [
    { "type": "voice",   "label": "Voice Assistant",    "message": "..." },
    { "type": "music",   "label": "Play Relaxing Music", "url": "https://open.spotify.com/..." },
    { "type": "breathe", "label": "Mindful Breathing",   "duration": 60 },
    { "type": "walk",    "label": "Take a Short Walk",   "message": "..." }
  ]
}
```

---

## ✨ Features

### Core Features (Original v1.0)
- 🌑 **Cyberpunk dark theme** with glassmorphism + neon glow effects
- 🔐 **Clerk authentication** — Sign Up / Sign In before accessing the dashboard
- 📊 **Real-time charts** (Heart Rate, Stress, Motion, AI Risk History)
- 🤖 **Stacking Ensemble AI** (LGBM + XGBoost + ExtraTrees → CatBoost) for stress prediction
- 🧠 **EEG Simulator** — brainwave cognitive load classification (Delta, Theta, Alpha, Beta, Gamma)
- 😴 **Sleep Tracker** — automatic sleep detection + quality scoring via SQLite
- 👁️ **Hallucination Risk Engine** — hybrid AI + sleep quality predictor
- 🗣️ **Voice Assistant** — Web Speech API TTS + STT
- 🚨 **Emergency popup** with shake animation and caregiver alert
- 🔔 **Notification panel** with dismissible alerts
- 🌓 **Dark/Light theme** toggle
- 📥 **CSV export** of sensor history
- 📄 **PDF report** generation (html2canvas + jsPDF)
- 📱 **Mobile responsive** with collapsible sidebar
- ♻️ **Auto-refresh** every 15 seconds
- 🔌 **Graceful fallback** — works with simulated data if ThingSpeak/Firebase not configured

### 🆕 New Features Added in v2.0
- 😊 **Facial Emotion Recognition** — Real-time webcam-based emotion detection using **face-api.js** (TinyFaceDetector + FaceExpressionNet); detects 7 emotions with confidence % shown on the Dashboard
- 🧬 **3D Animated Brain Model** — Interactive Three.js brain sphere on the Dashboard; colour and distortion level dynamically reflect the AI risk level (LOW=cyan, MEDIUM=amber, HIGH=red)
- 🗣️ **Gemini AI Voice Assistant** — Full conversational AI (STT → Gemini 1.5 Flash → TTS); empathetic mental health responses + Spotify playlist integration on voice command
- 📍 **Live Location Page** — Google Maps with custom dark theme and live GPS marker showing real-time patient location
- 💊 **Therapeutic Action Engine** — Backend returns structured action recommendations (voice, music, breathe, journal, walk, contact) per risk level alongside the hallucination prediction
- 📲 **Web Push Notifications** — Service Worker integration: push alerts fire even when the app tab is backgrounded
- 📳 **Device Vibration** — `navigator.vibrate` aggressive pattern on HIGH risk (Android browsers)
- 🔊 **Emergency Siren** — Web Audio API oscillator plays alternating 800/1200 Hz during emergency
- 📱 **WhatsApp + SMS Location Alert** — Emergency popup sends patient GPS to caregivers via `sms:` URI and WhatsApp `wa.me` link
- 🔐 **Account-Synced Caregiver Contacts** — Stored in **Clerk `unsafeMetadata`** (syncs across devices); locked UI prevents accidental edits
- 🔒 **HTTPS Dev Server** — `@vitejs/plugin-basic-ssl` enables HTTPS in Vite dev mode (required for webcam + mic)
- 🎵 **Music Integration** — Voice assistant opens calming Spotify playlists when user says "music" or "song"
- 📊 **Doughnut Sleep Status Chart** — Patient Behaviour page now shows a Sleeping vs Awake ratio pie chart
- ⚡ **Audio Unlock Banner** — Floating banner prompts user to click once to enable auto-speech (browser autoplay policy fix)

---

## 📝 Environment Variables Summary

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_THINGSPEAK_CHANNEL_ID` | Frontend | ThingSpeak channel ID |
| `VITE_THINGSPEAK_API_KEY` | Frontend | ThingSpeak read API key |
| `VITE_FLASK_URL` | Frontend | Flask backend URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | Clerk auth key |
| `VITE_FIREBASE_*` | Frontend | Firebase client config (6 vars) |
| `VITE_GEMINI_API_KEY` | Frontend *(NEW)* | Gemini AI voice NLP |
| `VITE_GOOGLE_MAPS_API_KEY` | Frontend *(NEW)* | Google Maps location page |
| `FIREBASE_DATABASE_URL` | Backend | Firebase Realtime DB URL |
| `FIREBASE_CREDENTIALS_JSON` | Backend *(NEW)* | Firebase service account JSON (Render deployment env fallback) |

---

## 📝 Credits

Built with ❤️ using **Wokwi IoT Simulator** · ThingSpeak · Clerk · WESAD Dataset · LightGBM · XGBoost · CatBoost · Flask · Firebase · React.js · face-api.js · Google Gemini AI · React Three Fiber · Google Maps API  
**NeuroWatch AI v2.0** — Simulation-Based IoT Mental Health Monitoring System
