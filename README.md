# NeuroWatch AI — IoT Mental Health Monitoring Dashboard

> An AI-powered, real-time mental health and stress monitoring system using ESP32, ThingSpeak, Flask, Firebase, and React.js

---

## 🧠 Project Overview

This system monitors physiological indicators via an ESP32 (simulated in Wokwi) and predicts mental health risk using a RandomForest AI model.

**Hardware (Wokwi Simulation):**
- ESP32 — WiFi microcontroller
- MPU6050 — Motion/accelerometer sensor (Field 3)
- Potentiometer — Simulates heart rate & stress *(replaces MAX30102)*
- LCD I2C 16×2 — On-device display
- LED + Buzzer — Alert outputs

**ThingSpeak Channel Mapping:**
| Field | Sensor | Description |
|-------|--------|-------------|
| Field 1 | Heart Rate | Potentiometer → 40–200 BPM |
| Field 2 | Stress Score | Derived value 0–100% |
| Field 3 | Motion | MPU6050 accelerometer magnitude |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js (Vite) + Tailwind CSS + Chart.js |
| Backend | Flask (Python) + scikit-learn |
| AI Model | RandomForestClassifier |
| Database | Firebase Realtime Database |
| Cloud IoT | ThingSpeak API |
| HTTP | Axios |

---

## 📁 Project Structure

```
internship/
├── frontend/                  # React.js Vite app
│   ├── src/
│   │   ├── api/               # ThingSpeak, Flask, Firebase API modules
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Layout/        # Sidebar, Header, Footer
│   │   │   ├── Cards/         # MetricCard, AlertCard, DeviceStatusCard
│   │   │   ├── Charts/        # 4 Chart.js components
│   │   │   ├── AI/            # PredictionPanel, RecommendationPanel
│   │   │   └── Notifications/ # EmergencyPopup, NotificationPanel
│   │   ├── context/           # AppContext (global state)
│   │   ├── pages/             # 6 pages
│   │   └── index.css          # Cyberpunk dark theme
│   ├── .env.example
│   └── package.json
│
└── backend/                   # Flask API
    ├── app.py                 # Main Flask application
    ├── model/
    │   └── train_model.py     # RandomForest training
    ├── routes/
    │   ├── predict.py         # POST /api/predict
    │   └── firebase_routes.py # Firebase CRUD routes
    ├── .env.example
    └── requirements.txt
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** v18+ → [nodejs.org](https://nodejs.org)
- **Python** 3.10+ → [python.org](https://python.org)
- **pip** package manager

---

### Step 1 — Clone & Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your ThingSpeak and Firebase credentials
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

> On first start, Flask automatically trains and saves the RandomForest model. No manual steps needed.

---

### Step 3 — Configure ThingSpeak

1. Create a free account at [thingspeak.com](https://thingspeak.com)
2. Create a new channel with 3 fields:
   - Field 1: Heart Rate
   - Field 2: Stress
   - Field 3: Motion
3. Copy your **Channel ID** and **Read API Key**
4. Add to `frontend/.env`:
   ```
   VITE_THINGSPEAK_CHANNEL_ID=your_channel_id
   VITE_THINGSPEAK_API_KEY=your_read_api_key
   ```

---

### Step 4 — Configure Firebase (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Enable **Realtime Database**
3. Go to Project Settings → Service Accounts → Generate private key
4. Save as `backend/firebase_admin_sdk.json`
5. Add database URL to `backend/.env`:
   ```
   FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   ```
6. Add Firebase web config to `frontend/.env`

> **Note:** The app works fully without Firebase — it uses simulated data and local state.

---

## 🌐 Website Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero, live stats, feature overview |
| Dashboard | `/dashboard` | Live charts + metric cards + AI summary |
| Analytics | `/analytics` | Historical trends + CSV/PDF export |
| AI Prediction | `/ai-prediction` | Live prediction panel + custom inputs |
| Alert History | `/alert-history` | Firebase alert log with filtering |
| About | `/about` | Project details, hardware, tech stack |

---

## 🤖 AI Model

**Algorithm:** RandomForestClassifier (scikit-learn)  
**Training Data:** 3,000 synthetic samples  
**Features:** Heart Rate (BPM), Stress (%), Motion (m/s²)  
**Classes:**

| Risk | Heart Rate | Stress | Motion |
|------|-----------|--------|--------|
| LOW | 45–95 BPM | 5–48% | 0.1–3.5 m/s² |
| MEDIUM | 80–115 BPM | 40–78% | 1.5–6.5 m/s² |
| HIGH | >110 BPM | >70% | <0.3 or >7 m/s² |

---

## 🚨 Alert Thresholds

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Heart Rate | > 110 BPM | 🔴 Critical alert |
| Stress | > 75% | 🔴 Critical alert |
| Motion | > 7 m/s² | 🟡 Warning |
| AI Risk | HIGH | 🔴 Emergency popup |

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server + model status |
| POST | `/api/predict` | AI risk prediction |
| POST | `/api/log` | Save record to Firebase |
| GET | `/api/history` | Retrieve sensor history |
| GET | `/api/alerts` | Retrieve alert log |

**POST /api/predict — Request:**
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
  "message": "Moderate stress indicators detected...",
  "recommendations": ["Practice mindfulness...", "..."]
}
```

---

## ✨ Features

- 🌑 **Cyberpunk dark theme** with glassmorphism + neon glow effects
- 📊 **4 real-time charts** (Heart Rate, Stress, Motion, AI Risk History)
- 🤖 **AI prediction** with confidence gauge and recommendations
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

Built with ❤️ using ESP32 · MPU6050 · Potentiometer · ThingSpeak · Flask · Firebase · React.js  
**NeuroWatch AI v1.0** — IoT Mental Health Monitoring System
