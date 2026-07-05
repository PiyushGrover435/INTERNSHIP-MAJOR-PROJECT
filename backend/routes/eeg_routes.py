"""
routes/eeg_routes.py
====================
Sentin-Edge AI — /api/simulate/eeg endpoint
--------------------------------------------
Accepts a single row of EEG channel data streamed row-by-row from the
React frontend (which reads eeg_demo_clean.csv as a simulator).

Applies rule-based thresholding to detect High Cognitive Load:
  - Delta band dominance  → deep stress / fatigue
  - Alpha band suppression → sustained cognitive load
  - Beta band elevation   → acute mental stress
  - Theta spikes          → working memory overload
  - Gamma spikes          → sensory overload
"""

from flask import Blueprint, request, jsonify
import math

eeg_bp = Blueprint('eeg_routes', __name__)

# ── Cognitive Load Thresholds ─────────────────────────────────────────────────
THRESHOLDS = {
    'beta_high'  : 15.0,   # High beta → acute mental stress
    'alpha_low'  : 5.0,    # Low alpha → unable to relax, sustained load
    'delta_high' : 20.0,   # High delta → deep fatigue
    'theta_high' : 12.0,   # High theta → working memory overload
    'gamma_high' : 8.0,    # High gamma → sensory overload
}

MESSAGES = {
    'LOW'   : 'Brain activity is calm and within the normal relaxed range. Cognitive load is minimal.',
    'MEDIUM': 'Moderate cognitive engagement detected. Beta and theta activity indicate focused attention.',
    'HIGH'  : 'High cognitive load detected! Elevated beta and suppressed alpha suggest significant mental stress.',
}

RECOMMENDATIONS = {
    'LOW'   : [
        'Maintain your current relaxed state.',
        'Good time for creative or reflective tasks.',
        'Keep up regular mindfulness practice.',
    ],
    'MEDIUM': [
        'Take a 5-minute break every 45 minutes.',
        'Practice box breathing (4-4-4-4 pattern).',
        'Reduce background distractions.',
    ],
    'HIGH'  : [
        '⚠️ Stop cognitively demanding tasks immediately.',
        '⚠️ Practice slow, deep breathing for 2 minutes.',
        '⚠️ Move away from screens — look at something distant.',
        'Drink water and rest your eyes.',
    ],
}


def _safe_float(val, default=0.0) -> float:
    """Safely convert a value to float."""
    try:
        f = float(val)
        return f if math.isfinite(f) else default
    except (TypeError, ValueError):
        return default


def _classify_cognitive_load(row: dict):
    """
    Rule-based EEG cognitive load classifier.
    Supports both named columns (Delta, Alpha...) and generic fields (field1...).
    Returns: (risk_level, confidence, band_summary)
    """
    delta = _safe_float(row.get('Delta', row.get('delta', row.get('field1', 0.0))))
    theta = _safe_float(row.get('Theta', row.get('theta', row.get('field2', 0.0))))
    alpha = _safe_float(row.get('Alpha', row.get('alpha', row.get('field3', 0.0))))
    beta  = _safe_float(row.get('Beta',  row.get('beta',  row.get('field4', 0.0))))
    gamma = _safe_float(row.get('Gamma', row.get('gamma', row.get('field5', 0.0))))

    score = 0

    # High beta → strongest stress marker
    if beta > THRESHOLDS['beta_high']:
        score += 3
    elif beta > THRESHOLDS['beta_high'] * 0.6:
        score += 1

    # Alpha suppression → sustained cognitive load
    if alpha < THRESHOLDS['alpha_low']:
        score += 2
    elif alpha < THRESHOLDS['alpha_low'] * 1.5:
        score += 1

    # Theta elevation → working memory overload
    if theta > THRESHOLDS['theta_high']:
        score += 2
    elif theta > THRESHOLDS['theta_high'] * 0.7:
        score += 1

    # Delta dominance → fatigue under load
    if delta > THRESHOLDS['delta_high']:
        score += 1

    # Gamma spike → intense concentration / sensory overload
    if gamma > THRESHOLDS['gamma_high']:
        score += 1

    if score >= 5:
        risk       = 'HIGH'
        confidence = min(70.0 + score * 3.0, 97.0)
    elif score >= 2:
        risk       = 'MEDIUM'
        confidence = min(55.0 + score * 4.0, 82.0)
    else:
        risk       = 'LOW'
        confidence = max(88.0 - score * 5.0, 72.0)

    band_summary = {
        'delta': round(delta, 3),
        'theta': round(theta, 3),
        'alpha': round(alpha, 3),
        'beta' : round(beta,  3),
        'gamma': round(gamma, 3),
        'score': score,
    }

    return risk, round(confidence, 1), band_summary


# ══════════════════════════════════════════════════════════════════════════════
#  /api/simulate/eeg  — EEG row classification endpoint
# ══════════════════════════════════════════════════════════════════════════════

@eeg_bp.route('/api/simulate/eeg', methods=['POST'])
def simulate_eeg():
    """
    Accept a single EEG CSV row from the React simulator and return
    a cognitive load classification result.

    Expected body:
        { "Delta": 18.2, "Theta": 9.1, "Alpha": 4.3, "Beta": 16.7, "Gamma": 5.2,
          "row_index": 42, "subject_id": "S3" }
    """
    try:
        data = request.get_json(force=True) or {}
        if not data:
            return jsonify({'error': 'Empty request body'}), 400

        risk, confidence, bands = _classify_cognitive_load(data)

        return jsonify({
            'risk'           : risk,
            'confidence'     : confidence,
            'message'        : MESSAGES[risk],
            'recommendations': RECOMMENDATIONS[risk],
            'band_powers'    : bands,
            'row_index'      : data.get('row_index', 0),
            'subject_id'     : data.get('subject_id', 'Demo'),
            'model_used'     : 'rule_based_eeg_threshold',
            'status'         : 'ok',
        })

    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500


@eeg_bp.route('/api/simulate/eeg/health', methods=['GET'])
def eeg_health():
    return jsonify({'status': 'ok', 'endpoint': '/api/simulate/eeg'})
