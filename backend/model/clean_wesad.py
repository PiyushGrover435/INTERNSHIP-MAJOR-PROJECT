"""
clean_wesad.py
==============
WESAD Data Engineering Pipeline  (v4 — 38-feature set, 8s sliding windows)
------------------------------------------------------------------------
Reads raw WESAD subject .pkl files (S2–S17), extracts wrist-worn sensor
signals (ACC @ 32 Hz, BVP @ 64 Hz, EDA @ 4 Hz, TEMP @ 4 Hz), maps stress
labels, chunks data into overlapping 8-second windows (50% overlap / 4s step),
extracts 38 hand-crafted features (including new HRV and EDA phasic/tonic),
applies per-subject baseline normalization, and saves the result to
processed/wesad_clean.csv.

Features produced per window (38 total):
  ACC  (9): per-axis mean/std × 3, Motion_Intensity, ACC_energy, ACC_range
  BVP  (8): mean, std, min, max, range, rms, skew, kurt          [time-domain]
  BVP  (3): BVP_cardiac_power, BVP_total_power, BVP_dominant_freq [freq-domain]
  BVP  (4): IBI_mean, IBI_std, BVP_rmssd, BVP_pnn50              [HRV features]
  EDA  (6): mean, std, min, max, slope, energy
  EDA  (3): EDA_tonic_mean, EDA_phasic_std, EDA_scr_count        [Phasic/Tonic]
  TEMP (5): mean, std, min, max, slope

Label mapping (from WESAD protocol):
  1 (Baseline)   → 0 (Normal)
  2 (Stress)     → 1 (High Stress)
  3 (Amusement)  → 0 (Normal)
  4 (Meditation) → 0 (Normal)
  0 (transient)  → dropped

Usage:
  python clean_wesad.py
"""

import os
import pickle
import numpy as np
import pandas as pd
from scipy import stats as sp_stats
from scipy.signal import find_peaks, butter, filtfilt
from numpy.fft import rfft, rfftfreq

# ─── PATHS ────────────────────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
WESAD_DIR     = os.path.join(BASE_DIR, "raw", "WESAD")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
OUTPUT_CSV    = os.path.join(PROCESSED_DIR, "wesad_clean.csv")

# ─── SENSOR CONFIGURATION ─────────────────────────────────────────────────────
ACC_FS   = 32    # Hz – Wrist accelerometer
BVP_FS   = 64    # Hz – Wrist BVP/PPG
EDA_FS   = 4     # Hz – Wrist EDA (skin conductance)
TEMP_FS  = 4     # Hz – Wrist skin temperature
LABEL_FS = 700   # Hz – Label signal

WINDOW_SECONDS = 8   # Feature window duration (seconds)
STEP_SECONDS   = 4   # Sliding step (50% overlap)

# ─── LABEL MAPPING ────────────────────────────────────────────────────────────
LABEL_MAP = {1: 0, 2: 1, 3: 0, 4: 0}

# Subject folders (S12 is missing in the original WESAD dataset)
SUBJECTS = [f"S{i}" for i in range(2, 18)]

# ─── FEATURE / COLUMN ORDER (38 features) ─────────────────────────────────────
FEATURE_COLS = [
    # ACC — per-axis statistics (6)
    "ACC_mean_x", "ACC_mean_y", "ACC_mean_z",
    "ACC_std_x",  "ACC_std_y",  "ACC_std_z",
    # ACC — magnitude-level statistics (3)
    "Motion_Intensity", "ACC_energy", "ACC_range",
    # BVP / PPG — time-domain (8)
    "BVP_mean", "BVP_std", "BVP_min", "BVP_max", "BVP_range",
    "BVP_rms", "BVP_skew", "BVP_kurt",
    # BVP / PPG — frequency-domain (3)
    "BVP_cardiac_power", "BVP_total_power", "BVP_dominant_freq",
    # BVP / PPG — HRV features (4 NEW)
    "IBI_mean", "IBI_std", "BVP_rmssd", "BVP_pnn50",
    # EDA — strongest physiological stress biomarker (6 original + 3 NEW)
    "EDA_mean", "EDA_std", "EDA_min", "EDA_max", "EDA_slope", "EDA_energy",
    "EDA_tonic_mean", "EDA_phasic_std", "EDA_scr_count",
    # TEMP — skin temperature (5)
    "TEMP_mean", "TEMP_std", "TEMP_min", "TEMP_max", "TEMP_slope",
]
OUTPUT_COLS = ["Patient_ID"] + FEATURE_COLS + ["Stress_Label"]


# ══════════════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def downsample_labels(labels: np.ndarray, source_fs: int, target_fs: int) -> np.ndarray:
    ratio     = source_fs // target_fs
    n_target  = len(labels) // ratio
    blocks    = labels[: n_target * ratio].reshape(n_target, ratio)
    n_classes = int(labels.max()) + 1
    counts    = np.stack([(blocks == c).sum(axis=1) for c in range(n_classes)])
    return np.argmax(counts, axis=0).astype(labels.dtype)

def _slope(arr: np.ndarray) -> float:
    if len(arr) < 2:
        return 0.0
    x = np.arange(len(arr), dtype=np.float64)
    slope, *_ = np.polyfit(x, arr.astype(np.float64), 1)
    return float(slope)

def _bvp_spectral(bvp_win: np.ndarray, fs: int = BVP_FS):
    n              = len(bvp_win)
    bvp_detrended  = bvp_win - np.mean(bvp_win)
    bvp_windowed   = bvp_detrended * np.hanning(n)
    power_spectrum = np.abs(rfft(bvp_windowed)) ** 2
    freqs          = rfftfreq(n, d=1.0 / fs)

    cardiac_mask  = (freqs >= 0.5) & (freqs <= 4.0)
    total_mask    = freqs > 0.1

    cardiac_power = float(np.mean(power_spectrum[cardiac_mask])) if cardiac_mask.any() else 0.0
    total_power   = float(np.mean(power_spectrum[total_mask]))   if total_mask.any()   else 0.0
    dominant_freq = (
        float(freqs[cardiac_mask][np.argmax(power_spectrum[cardiac_mask])])
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
    # Fallback to simple mean if filter fails due to padding
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
#  PER-SUBJECT FEATURE EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════

def extract_features_for_subject(subject_id: str, pkl_path: str) -> pd.DataFrame:
    print(f"  [→] Loading {subject_id} ...")

    with open(pkl_path, "rb") as f:
        data = pickle.load(f, encoding="latin1")

    wrist    = data["signal"]["wrist"]
    acc_raw  = wrist["ACC"]
    bvp_raw  = wrist["BVP"].flatten()
    eda_raw  = wrist["EDA"].flatten()
    temp_raw = wrist["TEMP"].flatten()
    labels   = data["label"]

    labels_acc  = downsample_labels(labels, LABEL_FS, ACC_FS)
    labels_bvp  = downsample_labels(labels, LABEL_FS, BVP_FS)
    labels_eda  = downsample_labels(labels, LABEL_FS, EDA_FS)
    labels_temp = downsample_labels(labels, LABEL_FS, TEMP_FS)

    acc_spw,  acc_step  = ACC_FS  * WINDOW_SECONDS, ACC_FS  * STEP_SECONDS
    bvp_spw,  bvp_step  = BVP_FS  * WINDOW_SECONDS, BVP_FS  * STEP_SECONDS
    eda_spw,  eda_step  = EDA_FS  * WINDOW_SECONDS, EDA_FS  * STEP_SECONDS
    temp_spw, temp_step = TEMP_FS * WINDOW_SECONDS, TEMP_FS * STEP_SECONDS

    def _n_steps(sig_len, lab_len, spw, step):
        usable = min(sig_len, lab_len) - spw
        return max(0, usable // step + 1)

    n_windows = min(
        _n_steps(len(acc_raw),  len(labels_acc),  acc_spw,  acc_step),
        _n_steps(len(bvp_raw),  len(labels_bvp),  bvp_spw,  bvp_step),
        _n_steps(len(eda_raw),  len(labels_eda),  eda_spw,  eda_step),
        _n_steps(len(temp_raw), len(labels_temp), temp_spw, temp_step),
    )
    print(f"     {WINDOW_SECONDS}s windows, {STEP_SECONDS}s step (50% overlap): {n_windows} windows")

    rows = []
    # To track dominant WESAD labels for baseline normalization
    original_labels = [] 

    for w in range(n_windows):
        acc_s  = w * acc_step;  acc_win  = acc_raw [acc_s  : acc_s  + acc_spw]
        bvp_s  = w * bvp_step;  bvp_win  = bvp_raw [bvp_s  : bvp_s  + bvp_spw]
        eda_s  = w * eda_step;  eda_win  = eda_raw [eda_s  : eda_s  + eda_spw]
        temp_s = w * temp_step; temp_win = temp_raw[temp_s : temp_s + temp_spw]

        win_labels = labels_acc[acc_s : acc_s + acc_spw]
        unique, counts = np.unique(win_labels, return_counts=True)
        dominant_label  = int(unique[np.argmax(counts)])
        if dominant_label not in LABEL_MAP:
            continue
            
        mapped_label = LABEL_MAP[dominant_label]

        # ── ACC features ──────────────────────────────────────────────────────
        mags = np.linalg.norm(acc_win, axis=1)
        bvp_min = float(np.min(bvp_win))
        bvp_max = float(np.max(bvp_win))
        bvp_cp, bvp_tp, bvp_df = _bvp_spectral(bvp_win)
        
        # ── HRV and EDA phasic/tonic features ─────────────────────────────────
        ibi_m, ibi_s, rmssd, pnn50 = _hrv_features(bvp_win)
        eda_tm, eda_ps, eda_sc = _eda_phasic_tonic(eda_win)

        rows.append({
            "Patient_ID"        : subject_id,
            # ACC
            "ACC_mean_x"        : float(np.mean(acc_win[:, 0])),
            "ACC_mean_y"        : float(np.mean(acc_win[:, 1])),
            "ACC_mean_z"        : float(np.mean(acc_win[:, 2])),
            "ACC_std_x"         : float(np.std(acc_win[:, 0])),
            "ACC_std_y"         : float(np.std(acc_win[:, 1])),
            "ACC_std_z"         : float(np.std(acc_win[:, 2])),
            "Motion_Intensity"  : float(np.mean(mags)),
            "ACC_energy"        : float(np.mean(mags ** 2)),
            "ACC_range"         : float(np.max(mags) - np.min(mags)),
            # BVP time-domain
            "BVP_mean"          : float(np.mean(bvp_win)),
            "BVP_std"           : float(np.std(bvp_win)),
            "BVP_min"           : bvp_min,
            "BVP_max"           : bvp_max,
            "BVP_range"         : bvp_max - bvp_min,
            "BVP_rms"           : float(np.sqrt(np.mean(bvp_win ** 2))),
            "BVP_skew"          : float(sp_stats.skew(bvp_win)),
            "BVP_kurt"          : float(sp_stats.kurtosis(bvp_win)),
            # BVP frequency-domain
            "BVP_cardiac_power" : bvp_cp,
            "BVP_total_power"   : bvp_tp,
            "BVP_dominant_freq" : bvp_df,
            # BVP HRV (NEW)
            "IBI_mean"          : ibi_m,
            "IBI_std"           : ibi_s,
            "BVP_rmssd"         : rmssd,
            "BVP_pnn50"         : pnn50,
            # EDA
            "EDA_mean"          : float(np.mean(eda_win)),
            "EDA_std"           : float(np.std(eda_win)),
            "EDA_min"           : float(np.min(eda_win)),
            "EDA_max"           : float(np.max(eda_win)),
            "EDA_slope"         : _slope(eda_win),
            "EDA_energy"        : float(np.mean(eda_win ** 2)),
            # EDA Phasic/Tonic (NEW)
            "EDA_tonic_mean"    : eda_tm,
            "EDA_phasic_std"    : eda_ps,
            "EDA_scr_count"     : eda_sc,
            # TEMP
            "TEMP_mean"         : float(np.mean(temp_win)),
            "TEMP_std"          : float(np.std(temp_win)),
            "TEMP_min"          : float(np.min(temp_win)),
            "TEMP_max"          : float(np.max(temp_win)),
            "TEMP_slope"        : _slope(temp_win),
            # Label
            "Stress_Label"      : mapped_label,
        })
        original_labels.append(dominant_label)

    subject_df = pd.DataFrame(rows)
    if subject_df.empty:
        print(f"     [!] Extracted 0 windows")
        return subject_df

    # ── Per-subject baseline normalization ────────────────────────────────────
    # WESAD Label 1 is Baseline. 
    # Find all windows where dominant_label == 1
    baseline_mask = np.array(original_labels) == 1
    
    if np.sum(baseline_mask) > 0:
        # Calculate mean and std of features during baseline
        baseline_data = subject_df.loc[baseline_mask, FEATURE_COLS]
        baseline_mean = baseline_data.mean()
        baseline_std  = baseline_data.std().replace(0, 1e-8)  # prevent div by zero
        
        # Normalize all windows
        subject_df[FEATURE_COLS] = (subject_df[FEATURE_COLS] - baseline_mean) / baseline_std
        print(f"     [✓] Applied Baseline Normalization (using {np.sum(baseline_mask)} baseline windows)")
    else:
        print(f"     [!] No baseline data (Label 1) found for {subject_id}. Normalization skipped.")

    label_counts = subject_df["Stress_Label"].value_counts().to_dict()
    print(f"     Extracted {len(subject_df)} windows  |  Labels: {label_counts}")
    return subject_df


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 65)
    print("  WESAD Data Engineering Pipeline  (v4 — 38-feature set)")
    print("=" * 65)

    os.makedirs(PROCESSED_DIR, exist_ok=True)
    print(f"\n[✓] Output directory ready: {PROCESSED_DIR}\n")

    all_dfs, missing = [], []

    for subject_id in SUBJECTS:
        pkl_path = os.path.join(WESAD_DIR, subject_id, f"{subject_id}.pkl")
        if not os.path.isfile(pkl_path):
            print(f"  [!] Skipping {subject_id}: .pkl not found at {pkl_path}")
            missing.append(subject_id)
            continue
        try:
            df = extract_features_for_subject(subject_id, pkl_path)
            if not df.empty:
                all_dfs.append(df)
            else:
                print(f"  [!] {subject_id}: No valid windows extracted.")
        except Exception as e:
            print(f"  [✗] ERROR processing {subject_id}: {e}")
            missing.append(subject_id)

    if not all_dfs:
        print("\n[✗] No data extracted. Aborting.")
        return

    final_df = pd.concat(all_dfs, ignore_index=True)[OUTPUT_COLS]
    final_df.to_csv(OUTPUT_CSV, index=False)

    print("\n" + "=" * 65)
    print("  Pipeline Complete — Summary")
    print("=" * 65)
    print(f"  Subjects processed : {len(all_dfs)}")
    if missing:
        print(f"  Subjects skipped   : {missing}")
    print(f"  Total windows      : {len(final_df):,}")
    print(f"  Feature columns    : {len(FEATURE_COLS)}")
    print(f"  Class distribution :\n{final_df['Stress_Label'].value_counts().to_string()}")
    print(f"\n[✓] Saved → {OUTPUT_CSV}")
    print("=" * 65)


if __name__ == "__main__":
    main()
