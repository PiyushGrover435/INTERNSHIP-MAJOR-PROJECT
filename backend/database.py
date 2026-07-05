"""
database.py
===========
NeuroWatch AI — SQLite Database Layer
--------------------------------------
Manages the local SQLite database for:
 - UserRoutine: daily activity, motion, heart rate, and sleep status tracking.

Schema:
  UserRoutine(id, timestamp, heart_rate, stress, motion_level, sleep_status, sleep_quality_score)
"""

import sqlite3
import os
from datetime import datetime, timedelta, timezone

DB_FILE = os.path.join(os.path.dirname(__file__), 'neurowatch.db')


def get_conn():
    """Return a new SQLite connection (thread-safe with check_same_thread=False)."""
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row  # Rows behave like dicts
    return conn


def init_db():
    """Initialize the database and create all required tables."""
    conn = get_conn()
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS UserRoutine (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp          TEXT    NOT NULL,
            heart_rate         REAL    DEFAULT 0,
            stress             REAL    DEFAULT 0,
            motion_level       REAL    DEFAULT 0,
            sleep_status       TEXT    DEFAULT "AWAKE",
            sleep_quality_score REAL   DEFAULT 0
        )
    ''')

    conn.commit()
    conn.close()
    print(f"✅ SQLite database ready at {DB_FILE}")


# ── Sleep Detection Logic ───────────────────────────────────────
def _calculate_sleep_status(heart_rate: float, motion: float, stress: float):
    """
    Simple physiological rules to determine sleep status.

    Sleep is inferred when:
      - Motion is very low  (< 0.8 — person is still)
      - Heart rate is low   (< 65  — resting rate)

    Sleep Quality Score (0–100):
      - Starts at 100
      - Reduced by elevated stress during supposed sleep (stress × 1.2)
      - Reduced if heart rate is slightly elevated during sleep
    """
    if motion < 0.8 and heart_rate < 65:
        sleep_status = "SLEEPING"
        quality = 100.0
        quality -= stress * 1.2          # High stress during sleep → poor quality
        quality -= max(0, heart_rate - 55) * 1.5  # Elevated HR during sleep → reduces quality
        sleep_quality_score = round(max(0.0, min(100.0, quality)), 2)
    else:
        sleep_status = "AWAKE"
        sleep_quality_score = 0.0

    return sleep_status, sleep_quality_score


# ── Write ───────────────────────────────────────────────────────
def log_routine_data(heart_rate: float, stress: float, motion: float):
    """
    Log one sensor reading into UserRoutine table.
    Returns the inferred sleep status and quality score.
    """
    sleep_status, sleep_quality_score = _calculate_sleep_status(heart_rate, motion, stress)

    conn = get_conn()
    c = conn.cursor()
    c.execute(
        '''INSERT INTO UserRoutine
             (timestamp, heart_rate, stress, motion_level, sleep_status, sleep_quality_score)
           VALUES (?, ?, ?, ?, ?, ?)''',
        (datetime.now(timezone.utc).isoformat(), heart_rate, stress, motion, sleep_status, sleep_quality_score)
    )
    conn.commit()
    conn.close()
    return sleep_status, sleep_quality_score


# ── Read ─────────────────────────────────────────────────────────
def get_sleep_summary(hours: int = 24) -> dict:
    """
    Fetch sleep statistics from the last `hours` hours.
    Used by the hallucination risk engine.

    Returns:
        avg_sleep_quality     : 0–100 (higher = better)
        sleep_deficit_flag    : True if avg quality < 40 (sleep-deprived)
        total_sleep_readings  : count of SLEEPING entries
        total_readings        : total entries in window
    """
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    conn = get_conn()
    c = conn.cursor()

    c.execute(
        '''SELECT sleep_status, sleep_quality_score
             FROM UserRoutine
            WHERE timestamp >= ?''',
        (since,)
    )
    rows = c.fetchall()
    conn.close()

    total = len(rows)
    sleep_rows = [r for r in rows if r['sleep_status'] == 'SLEEPING']
    sleep_count = len(sleep_rows)

    if sleep_count == 0:
        avg_quality = 0.0
    else:
        avg_quality = round(sum(r['sleep_quality_score'] for r in sleep_rows) / sleep_count, 2)

    return {
        'avg_sleep_quality'   : avg_quality,
        'sleep_deficit_flag'  : avg_quality < 40,
        'total_sleep_readings': sleep_count,
        'total_readings'      : total,
        'window_hours'        : hours,
    }


def get_routine_history(limit: int = 100) -> list:
    """Return recent UserRoutine records as a list of dicts."""
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        '''SELECT * FROM UserRoutine
           ORDER BY timestamp DESC LIMIT ?''',
        (limit,)
    )
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows
