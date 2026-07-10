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
                    ├── Voice Assistant (Web Speech API)
                    └── 9 Pages
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
| Authentication | Clerk (Sign In / Sign Up) |
| Frontend | React.js (Vite) + Tailwind CSS + Chart.js |
| Voice Assistant | Web Speech API (browser-native) |
| Backend | Flask (Python) + Flask-CORS |
| AI — Main Model | Stacking Ensemble: LightGBM + XGBoost + ExtraTrees → CatBoost |
| AI — EEG | Rule-based EEG threshold classifier |
| AI — Hallucination | Hybrid rule engine (stress + sleep quality) |
| Hyperparameter Tuning | Optuna (TPESampler, 50 trials/model) |
| Feature Scaling | RobustScaler (scikit-learn) |
| Feature Selection | SelectKBest ANOVA F-value (Top 20 of 38) |
| Database (cloud) | Firebase Realtime Database |
| Database (local) | SQLite (`neurowatch.db`) |
| HTTP | Axios |
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
│   │   │   └── eeg.js              # EEG simulation calls
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Layout/             # Sidebar, Header, Footer
│   │   │   ├── Cards/              # MetricCard, AlertCard, DeviceStatusCard
│   │   │   ├── Charts/             # Chart.js components
│   │   │   ├── AI/                 # PredictionPanel, RecommendationPanel
│   │   │   ├── Notifications/      # EmergencyPopup, NotificationPanel
│   │   │   └── Assistant/          # VoiceAssistant (Web Speech API)
│   │   ├── context/                # AppContext (global state)
│   │   ├── pages/                  # 9 pages (see below)
│   │   └── index.css               # Cyberpunk dark theme
│   ├── .env.example
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
    │   └── selector.pkl            # Fitted feature selector (saved)
    ├── routes/
    │   ├── predict.py              # POST /api/predict (main AI endpoint)
    │   ├── eeg_routes.py           # POST /api/simulate/eeg (EEG classifier)
    │   ├── routine_routes.py       # Routine, sleep & hallucination endpoints
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

> 💡 No physical hardware, no microcontroller boards, no sensors needed. Everything runs in simulation.

---

### Step 1 — Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your ThingSpeak, Firebase, and Clerk credentials
npm run dev
```

Frontend runs at: **http://localhost:5173**

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

Since this is a **simulation-based project**, no hardware is needed:

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

---

### Step 6 — Configure Firebase (Optional)

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

## 🌐 Website Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero section, live stats, feature overview |
| Dashboard | `/dashboard` | Live charts + metric cards + AI stress summary |
| Analytics | `/analytics` | Historical trends + CSV/PDF export |
| AI Prediction | `/ai-prediction` | Live Stacking Ensemble prediction + recommendations |
| EEG Simulator | `/eeg-simulator` | Streams Mendeley-derived EEG demo data row-by-row → rule-based cognitive load classification |
| Patient Behaviour | `/patient-behaviour` | Sleep tracking + hallucination risk engine |
| Alert History | `/alert-history` | Firebase alert log with filtering |
| About | `/about` | Project details, simulation setup, tech stack |
| Settings | `/settings` | Save emergency caregiver contact numbers (stored in localStorage) |

---

## 🚨 Alert Thresholds

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Heart Rate | > 110 BPM | 🔴 Critical alert |
| Stress | > 75% | 🔴 Critical alert |
| Motion | > 7 m/s² | 🟡 Warning |
| AI Risk | HIGH | 🔴 Emergency popup |
| Hallucination Risk | ≥ 75% | 🔴 CRITICAL — Voice assistant triggered |

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server + model status |
| POST | `/api/predict` | Stacking Ensemble stress prediction |
| POST | `/api/simulate/eeg` | Rule-based EEG cognitive load classification |
| POST | `/api/hallucination/predict` | Hybrid hallucination risk engine |
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

**Response:**
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

---

## ✨ Features

- 🌑 **Cyberpunk dark theme** with glassmorphism + neon glow effects
- 🔐 **Clerk authentication** — Sign Up / Sign In before accessing the dashboard
- 📊 **Real-time charts** (Heart Rate, Stress, Motion, AI Risk History)
- 🤖 **Stacking Ensemble AI** (LGBM + XGBoost + ExtraTrees → CatBoost) for stress prediction
- 🧠 **EEG Simulator** — brainwave cognitive load classification (Delta, Theta, Alpha, Beta, Gamma)
- 😴 **Sleep Tracker** — automatic sleep detection + quality scoring via SQLite
- 👁️ **Hallucination Risk Engine** — hybrid AI + sleep quality predictor
- 🗣️ **Voice Assistant** — Web Speech API: auto-speaks alerts (TTS) + listens to user mic commands (STT)
- 🚨 **Emergency popup** with shake animation and caregiver alert
- 🔔 **Notification panel** with dismissible alerts
- 🌓 **Dark/Light theme** toggle
- 📥 **CSV export** of sensor history
- 📄 **PDF report** generation (html2canvas + jsPDF)
- 📱 **Mobile responsive** with collapsible sidebar
- ♻️ **Auto-refresh** every 15 seconds
- 🔌 **Graceful fallback** — works with simulated data if ThingSpeak/Firebase not configured

---

## 📝 Credits

Built with ❤️ using **Wokwi IoT Simulator** · ThingSpeak · Clerk · WESAD Dataset · LightGBM · XGBoost · CatBoost · Flask · Firebase · React.js  
**NeuroWatch AI v1.0** — Simulation-Based IoT Mental Health Monitoring System
