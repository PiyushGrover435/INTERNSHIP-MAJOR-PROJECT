"""
feature_pipeline.py
===================
IoT → Model Feature Bridge
---------------------------
Converts raw wrist-sensor readings from an IoT device into the 38-dimensional
feature vector, applies RobustScaler, selects the Top 20 features using the 
trained Feature Selector, and runs the trained StackingEnsemble.

This module mirrors the feature extraction logic in clean_wesad.py exactly.

Input window sizes (8-second windows matching the training pipeline):
  ACC  : 256 samples  @ 32 Hz
  BVP  : 512 samples  @ 64 Hz
  EDA  :  32 samples  @ 4  Hz
  TEMP :  32 samples  @ 4  Hz

Usage (Flask API):
    from model.feature_pipeline import predict_stress

    # End-to-end inference
    result = predict_stress(acc, bvp, eda, temp, model, scaler, selector)
"""

import sys
import os
import numpy as np
from scipy import stats as sp_stats
from scipy.signal import find_peaks, butter, filtfilt
from numpy.fft import rfft, rfftfreq

# ─── SENSOR RATES (must match clean_wesad.py exactly) ────────────────────────
ACC_FS  = 32   # Hz
BVP_FS  = 64   # Hz
EDA_FS  = 4    # Hz
TEMP_FS = 4    # Hz

# Window sizes: 8-second windows (matches training pipeline)
WINDOW_SECONDS = 8
ACC_SPW  = ACC_FS  * WINDOW_SECONDS   # 256 samples
BVP_SPW  = BVP_FS  * WINDOW_SECONDS   # 512 samples
EDA_SPW  = EDA_FS  * WINDOW_SECONDS   # 32  samples
TEMP_SPW = TEMP_FS * WINDOW_SECONDS   # 32  samples

# Feature names (38 features)
FEATURE_NAMES = [
    # ACC (9)
    "ACC_mean_x", "ACC_mean_y", "ACC_mean_z",
    "ACC_std_x",  "ACC_std_y",  "ACC_std_z",
    "Motion_Intensity", "ACC_energy", "ACC_range",
    # BVP time-domain (8)
    "BVP_mean", "BVP_std", "BVP_min", "BVP_max", "BVP_range",
    "BVP_rms", "BVP_skew", "BVP_kurt",
    # BVP frequency-domain (3)
    "BVP_cardiac_power", "BVP_total_power", "BVP_dominant_freq",
    # BVP HRV (4)
    "IBI_mean", "IBI_std", "BVP_rmssd", "BVP_pnn50",
    # EDA (6)
    "EDA_mean", "EDA_std", "EDA_min", "EDA_max", "EDA_slope", "EDA_energy",
    # EDA Phasic/Tonic (3)
    "EDA_tonic_mean", "EDA_phasic_std", "EDA_scr_count",
    # TEMP (5)
    "TEMP_mean", "TEMP_std", "TEMP_min", "TEMP_max", "TEMP_slope",
]
N_FEATURES = len(FEATURE_NAMES)   # 38


# ══════════════════════════════════════════════════════════════════════════════
#  INTERNAL SIGNAL PROCESSING (mirrors clean_wesad.py helpers exactly)
# ══════════════════════════════════════════════════════════════════════════════

def _slope(arr: np.ndarray) -> float:
    if len(arr) < 2:
        return 0.0
    x = np.arange(len(arr), dtype=np.float64)
    slope, *_ = np.polyfit(x, arr.astype(np.float64), 1)
    return float(slope)

def _bvp_spectral(bvp_win: np.ndarray) -> tuple:
    n             = len(bvp_win)
    bvp_w         = (bvp_win - np.mean(bvp_win)) * np.hanning(n)
    power         = np.abs(rfft(bvp_w)) ** 2
    freqs         = rfftfreq(n, d=1.0 / BVP_FS)
    cardiac_mask  = (freqs >= 0.5) & (freqs <= 4.0)
    total_mask    = freqs > 0.1
    cardiac_power = float(np.mean(power[cardiac_mask])) if cardiac_mask.any() else 0.0
    total_power   = float(np.mean(power[total_mask]))   if total_mask.any()   else 0.0
    dominant_freq = (
        float(freqs[cardiac_mask][np.argmax(power[cardiac_mask])])
        if cardiac_mask.any() else 0.0
    )
    return cardiac_power, total_power, dominant_freq

def _hrv_features(bvp_win: np.ndarray, fs: int = BVP_FS):
    peaks, _ = find_peaks(bvp_win, distance=fs/4)
    if len(peaks) > 1:
        ibis = np.diff(peaks) / fs
        ibi_mean = np.mean(ibis)
        ibi_std = np.std(ibis)
        diff_ibis = np.diff(ibis)
        rmssd = np.sqrt(np.mean(diff_ibis**2)) if len(diff_ibis) > 0 else 0.0
        pnn50 = np.sum(np.abs(diff_ibis) > 0.05) / len(diff_ibis) if len(diff_ibis) > 0 else 0.0
    else:
        ibi_mean, ibi_std, rmssd, pnn50 = 0.0, 0.0, 0.0, 0.0
    return float(ibi_mean), float(ibi_std), float(rmssd), float(pnn50)

def _eda_phasic_tonic(eda_win: np.ndarray, fs: int = EDA_FS):
    if len(eda_win) < 15:
        return np.mean(eda_win), np.std(eda_win), 0.0
    nyq = 0.5 * fs
    cutoff = 0.05 / nyq
    try:
        b, a = butter(2, cutoff, btype='low')
        tonic = filtfilt(b, a, eda_win)
        phasic = eda_win - tonic
        tonic_mean = np.mean(tonic)
        phasic_std = np.std(phasic)
        peaks, _ = find_peaks(phasic, height=0.01, distance=fs)
        scr_count = len(peaks)
    except ValueError:
        tonic_mean = np.mean(eda_win)
        phasic_std = np.std(eda_win)
        scr_count = 0.0
    return float(tonic_mean), float(phasic_std), float(scr_count)


# ══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════

def extract_features(
    acc:  np.ndarray,
    bvp:  np.ndarray,
    eda:  np.ndarray,
    temp: np.ndarray,
) -> np.ndarray:
    """Compute the 38-feature vector from one 8-second sensor window."""
    acc  = np.asarray(acc,  dtype=np.float64)
    bvp  = np.asarray(bvp,  dtype=np.float64).flatten()
    eda  = np.asarray(eda,  dtype=np.float64).flatten()
    temp = np.asarray(temp, dtype=np.float64).flatten()

    # ── Validate shapes ───────────────────────────────────────────────────────
    if acc.shape != (ACC_SPW, 3):
        raise ValueError(f"acc must be ({ACC_SPW}, 3) — {WINDOW_SECONDS}s @ {ACC_FS}Hz.")
    if len(bvp) != BVP_SPW:
        raise ValueError(f"bvp must have {BVP_SPW} samples — {WINDOW_SECONDS}s @ {BVP_FS}Hz.")
    if len(eda) != EDA_SPW:
        raise ValueError(f"eda must have {EDA_SPW} samples — {WINDOW_SECONDS}s @ {EDA_FS}Hz.")
    if len(temp) != TEMP_SPW:
        raise ValueError(f"temp must have {TEMP_SPW} samples — {WINDOW_SECONDS}s @ {TEMP_FS}Hz.")

    # ── ACC (9 features) ──────────────────────────────────────────────────────
    mags  = np.linalg.norm(acc, axis=1)
    feats = [
        float(np.mean(acc[:, 0])), float(np.mean(acc[:, 1])), float(np.mean(acc[:, 2])),
        float(np.std(acc[:, 0])),  float(np.std(acc[:, 1])),  float(np.std(acc[:, 2])),
        float(np.mean(mags)),          # Motion_Intensity
        float(np.mean(mags ** 2)),     # ACC_energy
        float(np.max(mags) - np.min(mags)),  # ACC_range
    ]

    # ── BVP time-domain (8 features) ─────────────────────────────────────────
    bvp_min, bvp_max = float(np.min(bvp)), float(np.max(bvp))
    feats += [
        float(np.mean(bvp)),
        float(np.std(bvp)),
        bvp_min,
        bvp_max,
        bvp_max - bvp_min,            # BVP_range
        float(np.sqrt(np.mean(bvp ** 2))),  # BVP_rms
        float(sp_stats.skew(bvp)),
        float(sp_stats.kurtosis(bvp)),
    ]

    # ── BVP frequency-domain (3 features) ────────────────────────────────────
    cp, tp, df = _bvp_spectral(bvp)
    feats += [cp, tp, df]

    # ── BVP HRV (4 features) ─────────────────────────────────────────────────
    ibi_m, ibi_s, rmssd, pnn50 = _hrv_features(bvp)
    feats += [ibi_m, ibi_s, rmssd, pnn50]

    # ── EDA (6 features) ──────────────────────────────────────────────────────
    feats += [
        float(np.mean(eda)),
        float(np.std(eda)),
        float(np.min(eda)),
        float(np.max(eda)),
        _slope(eda),                  # EDA_slope
        float(np.mean(eda ** 2)),     # EDA_energy
    ]

    # ── EDA Phasic/Tonic (3 features) ────────────────────────────────────────
    eda_tm, eda_ps, eda_sc = _eda_phasic_tonic(eda)
    feats += [eda_tm, eda_ps, eda_sc]

    # ── TEMP (5 features) ─────────────────────────────────────────────────────
    feats += [
        float(np.mean(temp)),
        float(np.std(temp)),
        float(np.min(temp)),
        float(np.max(temp)),
        _slope(temp),                 # TEMP_slope
    ]

    return np.array(feats, dtype=np.float64)  # shape (38,)


def predict_stress(
    acc:   np.ndarray,
    bvp:   np.ndarray,
    eda:   np.ndarray,
    temp:  np.ndarray,
    model,
    scaler,
    selector,
) -> dict:
    """
    End-to-end convenience function: raw sensor window → stress prediction.
    """
    features = extract_features(acc, bvp, eda, temp)
    
    # 1. Scale all 38 features
    X_scaled = scaler.transform(features.reshape(1, -1))
    
    # 2. Select Top 20 features
    if selector is not None:
        X_selected = selector.transform(X_scaled)
    else:
        X_selected = X_scaled
        
    # 3. Predict
    label    = int(model.predict(X_selected)[0])
    proba    = model.predict_proba(X_selected)[0]

    return {
        "label"        : label,
        "risk"         : "HIGH" if label == 1 else "LOW",
        "confidence"   : round(float(np.max(proba)) * 100, 1),
        "proba_normal" : round(float(proba[0]) * 100, 1),
        "proba_stress" : round(float(proba[1]) * 100, 1),
        "motion_intensity" : float(features[6]),
    }
