"""
routes/predict.py
=================
NeuroWatch AI — /api/predict endpoint
--------------------------------------
Accepts raw wrist-sensor arrays from an IoT device, computes the 31-feature
vector via feature_pipeline.py, runs the trained StackingEnsemble, and returns
a structured stress risk response.

Supported input modes
─────────────────────
Mode A — Full Sensor Arrays (recommended, highest accuracy):
  POST /api/predict
  {
    "acc":  [[x,y,z], ...],   // 128 samples @ 32 Hz = 4 s
    "bvp":  [v1, v2, ...],    // 256 samples @ 64 Hz = 4 s
    "eda":  [e1, e2, ...],    //  16 samples @ 4  Hz = 4 s
    "temp": [t1, t2, ...]     //  16 samples @ 4  Hz = 4 s
  }

Mode B — Simple Values (fallback for basic smartwatches):
  POST /api/predict
  {
    "heart_rate": 95,
    "stress": 60,
    "motion": 2.1
  }
  Returns rule-based prediction with "simple_mode": true.
"""

import sys
import os
import numpy as np
from flask import Blueprint, request, jsonify

# Feature pipeline lives in the model directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'model'))
from feature_pipeline import predict_stress, extract_features, ACC_SPW, BVP_SPW, EDA_SPW, TEMP_SPW

predict_bp = Blueprint('predict', __name__)

# Injected by app.py after model loading
model  = None
scaler = None
selector = None


RECOMMENDATIONS = {
    'LOW': [
        'Maintain regular breathing exercises daily.',
        'Stay hydrated — aim for 8 glasses of water.',
        'Take short breaks every 45 minutes.',
        'Continue your healthy sleep schedule.',
    ],
    'MEDIUM': [
        'Practice 5-10 minutes of mindfulness or meditation.',
        'Reduce screen exposure and blue light after 9 PM.',
        'Take a short walk to reset your stress levels.',
        'Consider journaling your thoughts and feelings.',
        'Limit caffeine and sugary snacks.',
    ],
    'HIGH': [
        '⚠️ Take deep, slow breaths immediately (4-4-6 pattern).',
        '⚠️ Move to a quiet, calm environment right now.',
        '⚠️ Contact your caregiver or support person.',
        '⚠️ Do NOT drive or operate machinery in this state.',
        'Drink a glass of cold water and sit down.',
    ],
}

MESSAGES = {
    'LOW'   : 'All vitals are within the normal healthy range. Keep up the great wellness habits!',
    'MEDIUM': 'Moderate stress indicators detected. Consider taking a mindfulness break.',
    'HIGH'  : 'Critical stress and physiological anomalies detected. Immediate attention recommended.',
}


def set_model(m, s, sel):
    global model, scaler, selector
    model  = m
    scaler = s
    selector = sel


# ══════════════════════════════════════════════════════════════════════════════
#  /api/predict  — Main prediction endpoint
# ══════════════════════════════════════════════════════════════════════════════

@predict_bp.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True) or {}

        # Mode A: Full sensor arrays → ML model
        if any(k in data for k in ('bvp', 'acc', 'eda', 'temp')):
            return _predict_full_sensor(data)

        # Mode B: Simple values → rule-based fallback
        return _predict_simple(data)

    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500


def _predict_full_sensor(data: dict):
    """Mode A: raw sensor arrays → 31 features → stacking model."""
    if model is None or scaler is None:
        return jsonify({'error': 'Model not loaded', 'status': 'error'}), 503

    try:
        acc  = np.array(data['acc'],  dtype=np.float64)
        bvp  = np.array(data['bvp'],  dtype=np.float64).flatten()
        eda  = np.array(data['eda'],  dtype=np.float64).flatten()
        temp = np.array(data['temp'], dtype=np.float64).flatten()
    except (KeyError, ValueError) as e:
        return jsonify({
            'error': f'Missing or invalid sensor array: {e}',
            'expected': {
                'acc':  f'array of shape ({ACC_SPW}, 3) — 4s @ 32 Hz',
                'bvp':  f'array of length {BVP_SPW} — 4s @ 64 Hz',
                'eda':  f'array of length {EDA_SPW} — 4s @ 4 Hz',
                'temp': f'array of length {TEMP_SPW} — 4s @ 4 Hz',
            }
        }), 400

    try:
        result = predict_stress(acc, bvp, eda, temp, model, scaler, selector)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    # Map binary label + confidence → LOW / MEDIUM / HIGH
    if result['label'] == 1:
        risk = 'HIGH' if result['confidence'] >= 80 else 'MEDIUM'
    else:
        risk = 'MEDIUM' if result['proba_stress'] >= 35 else 'LOW'

    # 🔥 OPTION 2: Motion Filter to improve Precision
    # If the user is physically moving a lot (e.g. walking/exercising), 
    # force the stress risk to LOW to prevent false alarms.
    # Note: Threshold depends on the raw accelerometer units from the smartwatch.
    # We use a placeholder generic threshold here.
    if result.get('motion_intensity', 0) > 1.5:  
        risk = 'LOW'

    return jsonify({
        'risk'           : risk,
        'confidence'     : result['confidence'],
        'message'        : MESSAGES.get(risk, ''),
        'recommendations': RECOMMENDATIONS.get(risk, []),
        'probabilities'  : {
            'Normal'     : result['proba_normal'],
            'High_Stress': result['proba_stress'],
        },
        'model_used' : 'stacking_ensemble_top_20_features',
        'simple_mode': False,
    })


def _predict_simple(data: dict):
    """Mode B: rule-based fallback for basic smartwatches."""
    heart_rate = float(data.get('heart_rate', 72))
    stress     = float(data.get('stress', 35))
    motion     = float(data.get('motion', 1.5))

    heart_rate = max(30,  min(220, heart_rate))
    stress     = max(0,   min(100, stress))
    motion     = max(0,   min(20,  motion))

    if heart_rate > 110 or stress > 75:
        risk, confidence = 'HIGH', 82.0
    elif heart_rate > 90 or stress > 50:
        risk, confidence = 'MEDIUM', 71.0
    else:
        risk, confidence = 'LOW', 88.0

    return jsonify({
        'risk'           : risk,
        'confidence'     : confidence,
        'message'        : MESSAGES.get(risk, ''),
        'recommendations': RECOMMENDATIONS.get(risk, []),
        'input'          : {
            'heart_rate': heart_rate,
            'stress'    : stress,
            'motion'    : motion,
        },
        'model_used' : 'rule_based',
        'simple_mode': True,
    })
