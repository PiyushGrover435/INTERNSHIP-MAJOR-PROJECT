"""
routes/routine_routes.py
========================
NeuroWatch AI — /api/routine & /api/hallucination endpoints
------------------------------------------------------------
Endpoints:
  POST /api/routine/log           — Save real-time sensor snapshot to SQLite
  GET  /api/routine/history       — Fetch UserRoutine history from SQLite
  GET  /api/routine/sleep-summary — Return sleep quality stats
  POST /api/hallucination/predict — Hallucination risk prediction (Hybrid Engine)
"""

import os
import sys
from flask import Blueprint, request, jsonify

# Database layer
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database import log_routine_data, get_sleep_summary, get_routine_history

routine_bp = Blueprint('routine', __name__)


# ── Therapeutic Recommendation Engine ──────────────────────────────
THERAPEUTIC_ACTIONS = {
    'critical': {
        'actions': [
            {'type': 'voice',   'label': 'Voice Assistant',     'message': 'I noticed you might be feeling overwhelmed. I am here for you. Let us take a slow, deep breath together.'},
            {'type': 'music',   'label': 'Play Calming Music',   'url': 'https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u'},
            {'type': 'breathe', 'label': 'Deep Breathing (4-4-6)', 'duration': 120},
            {'type': 'contact', 'label': 'Contact Caregiver',    'message': 'Please reach out to your caregiver or a trusted person.'},
        ],
        'voice_trigger': True,
        'alert_level': 'CRITICAL',
    },
    'high': {
        'actions': [
            {'type': 'voice',   'label': 'Voice Assistant',      'message': 'You seem stressed. Would you like to listen to some calming music or try a breathing exercise?'},
            {'type': 'music',   'label': 'Play Relaxing Music',   'url': 'https://open.spotify.com/playlist/37i9dQZF1DX3Oj2zHAUYiE'},
            {'type': 'breathe', 'label': 'Mindful Breathing',     'duration': 60},
            {'type': 'walk',    'label': 'Take a Short Walk',     'message': 'A 5-minute walk can significantly reduce stress hormones.'},
        ],
        'voice_trigger': True,
        'alert_level': 'HIGH',
    },
    'medium': {
        'actions': [
            {'type': 'music',   'label': 'Lo-fi Focus Music',    'url': 'https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4edens9'},
            {'type': 'breathe', 'label': 'Box Breathing (4-4-4-4)', 'duration': 30},
            {'type': 'journal', 'label': 'Journal Your Thoughts', 'message': 'Writing down feelings helps reduce mental load.'},
        ],
        'voice_trigger': False,
        'alert_level': 'MEDIUM',
    },
    'low': {
        'actions': [
            {'type': 'info',  'label': 'All Clear',              'message': 'Your mental health indicators are within the healthy range. Keep it up!'},
            {'type': 'water', 'label': 'Stay Hydrated',          'message': 'Remember to drink water regularly.'},
        ],
        'voice_trigger': False,
        'alert_level': 'LOW',
    },
}


def _get_hallucination_probability(risk: str, confidence: float, sleep_summary: dict) -> float:
    """
    Hybrid Rule-Based Hallucination Risk Engine.

    Inputs:
      risk          : 'LOW' | 'MEDIUM' | 'HIGH' from CatBoost model
      confidence    : model confidence (0–100)
      sleep_summary : dict from database.get_sleep_summary()

    Logic:
      Base probability comes from AI stress risk level.
      Sleep deprivation is the PRIMARY amplifier of hallucination risk.
      Research shows: sleep debt > 24h can cause hallucinations in healthy adults.

    Returns:
      hallucination_probability : float 0–100
    """
    # Base score from AI risk
    base = {'LOW': 10.0, 'MEDIUM': 35.0, 'HIGH': 65.0}.get(risk, 10.0)

    # Confidence-weighted adjustment
    if risk == 'HIGH':
        base += (confidence - 70) * 0.3  # Higher confidence → higher risk
    elif risk == 'LOW':
        base -= (confidence - 70) * 0.2  # Higher confidence in LOW → lower risk

    # Sleep deprivation amplifier (most important factor)
    avg_quality = sleep_summary.get('avg_sleep_quality', 50.0)
    sleep_deficit = sleep_summary.get('sleep_deficit_flag', False)

    if sleep_deficit:
        # Significant amplification for sleep-deprived users
        sleep_penalty = (40 - avg_quality) * 0.8
        base += sleep_penalty

    # Clamp to [0, 100]
    return round(min(100.0, max(0.0, base)), 1)


# ════════════════════════════════════════════════════════════════════
# Routes
# ════════════════════════════════════════════════════════════════════

@routine_bp.route('/api/routine/log', methods=['POST'])
def log_routine():
    """Log real-time sensor snapshot into SQLite UserRoutine table."""
    try:
        data = request.get_json(force=True) or {}
        heart_rate = float(data.get('heart_rate') or data.get('heartRate') or 72)
        stress     = float(data.get('stress') or 35)
        motion     = float(data.get('motion') or 1.5)

        sleep_status, sleep_quality_score = log_routine_data(heart_rate, stress, motion)

        return jsonify({
            'status': 'logged',
            'sleep_status': sleep_status,
            'sleep_quality_score': sleep_quality_score,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@routine_bp.route('/api/routine/history', methods=['GET'])
def routine_history():
    """Return last N UserRoutine records."""
    try:
        limit = int(request.args.get('limit', 100))
        rows = get_routine_history(limit)
        return jsonify({'data': rows, 'count': len(rows)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@routine_bp.route('/api/routine/sleep-summary', methods=['GET'])
def sleep_summary():
    """Return sleep quality summary for the last N hours."""
    try:
        hours = int(request.args.get('hours', 24))
        summary = get_sleep_summary(hours)
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@routine_bp.route('/api/hallucination/predict', methods=['POST'])
def hallucination_predict():
    """
    Advanced Hallucination Risk Endpoint.

    Accepts:
      {
        "risk": "HIGH",
        "confidence": 85,
        "heart_rate": 112,
        "stress": 78,
        "motion": 0.5
      }

    Returns:
      hallucination_risk      : float 0-100
      hallucination_level     : "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      sleep_summary           : object (sleep quality data)
      recommendations         : list of therapeutic actions
      voice_trigger           : bool (should frontend speak?)
      voice_message           : str (text for Web Speech API)
    """
    try:
        data = request.get_json(force=True) or {}
        risk = str(data.get('risk', 'LOW')).upper()
        confidence = float(data.get('confidence', 70))
        heart_rate = float(data.get('heart_rate') or data.get('heartRate') or 72)
        stress     = float(data.get('stress') or 35)
        motion     = float(data.get('motion') or 1.5)

        # Step 1: Log this data point into SQLite
        sleep_status, sleep_quality = log_routine_data(heart_rate, stress, motion)

        # Step 2: Get historical sleep summary
        summary = get_sleep_summary(hours=24)

        # Step 3: Calculate hallucination risk
        hall_prob = _get_hallucination_probability(risk, confidence, summary)

        # Step 4: Map probability to level
        if hall_prob >= 75:
            level = 'CRITICAL'
        elif hall_prob >= 50:
            level = 'HIGH'
        elif hall_prob >= 25:
            level = 'MEDIUM'
        else:
            level = 'LOW'

        # Step 5: Get therapeutic recommendations
        therapy = THERAPEUTIC_ACTIONS.get(level.lower(), THERAPEUTIC_ACTIONS['low'])
        voice_msg = ''
        for action in therapy['actions']:
            if action['type'] == 'voice':
                voice_msg = action.get('message', '')
                break

        return jsonify({
            'hallucination_risk'  : hall_prob,
            'hallucination_level' : level,
            'sleep_status'        : sleep_status,
            'sleep_quality_score' : sleep_quality,
            'sleep_summary'       : summary,
            'recommendations'     : therapy['actions'],
            'voice_trigger'       : therapy['voice_trigger'],
            'voice_message'       : voice_msg,
            'ai_risk'             : risk,
            'ai_confidence'       : confidence,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
