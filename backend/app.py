"""
NeuroWatch AI — Flask Backend
AI-powered IoT Mental Health Monitoring System

Endpoints:
  GET  /api/health                 — Server health check
  POST /api/predict                — AI stress prediction (CatBoost Stacking Ensemble)
  POST /api/simulate/eeg           — EEG cognitive load classifier (rule-based)
  POST /api/log                    — Save sensor record to Firebase
  GET  /api/history                — Retrieve sensor history from Firebase
  GET  /api/alerts                 — Retrieve alert history from Firebase
  POST /api/routine/log            — Log sensor data to local SQLite DB
  GET  /api/routine/history        — Retrieve UserRoutine history
  GET  /api/routine/sleep-summary  — Get sleep quality statistics
  POST /api/hallucination/predict  — Hallucination Risk (Hybrid AI + Sleep Engine)
"""

import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ── SQLite Database Init ────────────────────────────────────────
from database import init_db
init_db()

# ── Flask App Setup ─────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=['http://localhost:5173', 'http://localhost:3000', '*'])

# ── Load AI Model ───────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'model'))
try:
    from train_model import load_model, StackingEnsemble
    # Inject StackingEnsemble into __main__ so joblib can deserialise the .pkl
    # (pkl was saved when train_model ran as __main__, this bridges the namespace gap)
    sys.modules['__main__'].StackingEnsemble = StackingEnsemble  # type: ignore
    model, scaler, selector = load_model()    # returns (StackingEnsemble, RobustScaler, SelectFromModel)
    print("✅ AI Model loaded successfully")
    MODEL_LOADED = True
except Exception as e:
    print(f"⚠️  Model load error: {e}")
    model, scaler, selector = None, None, None
    MODEL_LOADED = False

# ── Firebase Admin SDK ──────────────────────────────────────────────────────
db = None
import json, tempfile
FIREBASE_SA_PATH = os.path.join(os.path.dirname(__file__), 'firebase_admin_sdk.json')
FIREBASE_DB_URL = os.getenv('FIREBASE_DATABASE_URL', '')
FIREBASE_CREDS_JSON = os.getenv('FIREBASE_CREDENTIALS_JSON', '')  # fallback for Render

try:
    import firebase_admin
    from firebase_admin import credentials, db as firebase_db

    # If JSON file missing but env var present, write it to a temp file
    if not os.path.exists(FIREBASE_SA_PATH) and FIREBASE_CREDS_JSON:
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        tmp.write(FIREBASE_CREDS_JSON)
        tmp.flush()
        FIREBASE_SA_PATH = tmp.name

    if os.path.exists(FIREBASE_SA_PATH) and FIREBASE_DB_URL:
        cred = credentials.Certificate(FIREBASE_SA_PATH)
        firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DB_URL})
        db = firebase_db
        print("✅ Firebase Admin SDK connected")
    else:
        print("⚠️  Firebase not configured (missing firebase_admin_sdk.json or FIREBASE_DATABASE_URL)")
except Exception as e:
    print(f"⚠️  Firebase error: {e}")

# ── Register Routes ─────────────────────────────────────────────
from routes.predict import predict_bp, set_model
from routes.firebase_routes import firebase_bp, set_db
from routes.eeg_routes import eeg_bp
from routes.routine_routes import routine_bp

# Inject dependencies into route modules
if model and scaler:
    set_model(model, scaler, selector)

if db:
    set_db(db)

app.register_blueprint(predict_bp)
app.register_blueprint(firebase_bp)
app.register_blueprint(eeg_bp)
app.register_blueprint(routine_bp)

# ── Health Check ────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': MODEL_LOADED,
        'firebase': db is not None,
        'version': '1.0.0',
    })

# ── Root ────────────────────────────────────────────────────────
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'name': 'NeuroWatch AI Backend',
        'description': 'IoT Mental Health Monitoring — Flask API',
        'endpoints': [
            '/api/health', '/api/predict', '/api/log', '/api/history', '/api/alerts',
            '/api/routine/log', '/api/routine/history', '/api/routine/sleep-summary',
            '/api/hallucination/predict',
        ],
    })

# ── Run ─────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"\n🚀 NeuroWatch Flask API running on http://localhost:{port}")
    print(f"   Model: {'✅ Ready' if MODEL_LOADED else '❌ Not loaded'}")
    print(f"   Firebase: {'✅ Connected' if db else '⚠️  Not configured'}\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
