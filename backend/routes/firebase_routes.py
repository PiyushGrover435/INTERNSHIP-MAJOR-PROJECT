from flask import Blueprint, request, jsonify
import os

firebase_bp = Blueprint('firebase_routes', __name__)

# Firebase Admin SDK — loaded by app.py
db = None

def set_db(database):
    global db
    db = database


@firebase_bp.route('/api/log', methods=['POST'])
def log_record():
    """Save a sensor + prediction record to Firebase."""
    try:
        data = request.get_json(force=True)
        
        if db is None:
            return jsonify({'status': 'skipped', 'reason': 'Firebase not configured'}), 200

        record = {
            'timestamp': data.get('timestamp'),
            'heartRate': data.get('heart_rate'),
            'stress': data.get('stress'),
            'motion': data.get('motion'),
            'risk': data.get('risk'),
            'confidence': data.get('confidence'),
            'alerts': data.get('alerts', []),
        }

        ref = db.reference('records')
        new_key = ref.push(record)
        
        # Log alerts separately
        if record.get('alerts'):
            alert_ref = db.reference('alerts')
            for alert in record['alerts']:
                alert_ref.push({**alert, **record})

        return jsonify({'status': 'saved', 'id': new_key.key})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@firebase_bp.route('/api/history', methods=['GET'])
def get_history():
    """Retrieve recent records from Firebase."""
    try:
        limit = int(request.args.get('limit', 100))

        if db is None:
            return jsonify({'records': [], 'source': 'not_configured'})

        ref = db.reference('records')
        data = ref.order_by_child('timestamp').limit_to_last(limit).get()

        records = []
        if data:
            for key, value in data.items():
                records.append({'id': key, **value})
            records.reverse()

        return jsonify({'records': records, 'count': len(records)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@firebase_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Retrieve recent alerts from Firebase."""
    try:
        limit = int(request.args.get('limit', 50))

        if db is None:
            return jsonify({'alerts': [], 'source': 'not_configured'})

        ref = db.reference('alerts')
        data = ref.order_by_child('timestamp').limit_to_last(limit).get()

        alerts = []
        if data:
            for key, value in data.items():
                alerts.append({'id': key, **value})
            alerts.reverse()

        return jsonify({'alerts': alerts, 'count': len(alerts)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
