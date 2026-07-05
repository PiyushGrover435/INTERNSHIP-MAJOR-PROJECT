"""
clean_eeg.py
============
EEG Demo Data Preparation Pipeline
------------------------------------
Reads the Mendeley Multi-channel Wireless EEG .mat files, extracts EEG
channel data, cleans it, and saves a lightweight CSV file for use by the
Flask API as a frontend upload demonstration dataset.

Dataset structure (each .mat file):
  - Variables vary by file, but typically contain EEG channel arrays.
  - Files come in two variants: 'DSub' (Drowsy subjects) and 'DCSub' 
    (Drowsy+Caffeine subjects), indicating alertness vs. fatigue states.
  - This script maps them to a binary label:
      DC (caffeine/alert) → 0 (Normal/Alert)
      D  (drowsy)         → 1 (Stress/Fatigue)

Output:
  processed/eeg_demo_clean.csv  – A lightweight ~500-row representative 
  sample ready for Flask API demonstrations.

Usage:
  python clean_eeg.py
"""

import os
import re
import numpy as np
import pandas as pd
import scipy.io as sio

# ─── PATHS ────────────────────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
EEG_DIR       = os.path.join(BASE_DIR, "raw", "Multi-channel Wireless EEG Recordings of Young Adu")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
OUTPUT_CSV    = os.path.join(PROCESSED_DIR, "eeg_demo_clean.csv")

# ─── EXTRACTION CONFIG ────────────────────────────────────────────────────────
ROWS_PER_SUBJECT = 40   # Samples to take from each subject (keeps file lightweight)
MAX_SUBJECTS     = 15   # Cap on total subjects to process (5 DC + 5 D minimum)
TARGET_ROWS      = 600  # Approximate target rows for the final demo file
EEG_CHANNELS     = 14   # Expected number of EEG channels (Emotiv EPOC headset)

# Standard Emotiv EPOC 14-channel names (fallback column names if unnamed)
DEFAULT_CHANNEL_NAMES = [
    "AF3", "F7", "F3", "FC5", "T7", "P7", "O1",
    "O2",  "P8", "T8", "FC6", "F4", "F8", "AF4"
]


def load_mat_eeg(filepath: str) -> np.ndarray | None:
    """
    Load a .mat EEG file and extract the primary numeric data array.

    The Mendeley dataset stores EEG recordings as MATLAB matrices.
    This function handles both older MAT v5 and newer HDF5-based formats,
    and intelligently finds the largest numeric array in the file.

    Args:
        filepath : absolute path to the .mat file

    Returns:
        numpy array of shape (n_samples, n_channels), or None on failure.
    """
    try:
        mat = sio.loadmat(filepath, squeeze_me=True)
    except Exception as e:
        print(f"     [!] Could not read {os.path.basename(filepath)}: {e}")
        return None

    # Filter out MATLAB metadata keys (start with '__')
    data_keys = [k for k in mat.keys() if not k.startswith("__")]

    if not data_keys:
        print(f"     [!] No data keys found in {os.path.basename(filepath)}")
        return None

    # Pick the largest 2-D numeric array (most likely the EEG matrix)
    best_array = None
    best_size  = 0
    for key in data_keys:
        val = mat[key]
        if isinstance(val, np.ndarray) and val.ndim >= 2:
            if val.size > best_size:
                best_array = val
                best_size  = val.size

    if best_array is None:
        # Try 1-D arrays as a fallback (single-channel or metadata arrays)
        for key in data_keys:
            val = mat[key]
            if isinstance(val, np.ndarray) and val.ndim == 1 and val.size > best_size:
                best_array = val.reshape(-1, 1)
                best_size  = val.size

    if best_array is None:
        print(f"     [!] No suitable numeric array in {os.path.basename(filepath)}")
        return None

    # Ensure 2-D: (samples, channels)
    if best_array.ndim == 1:
        best_array = best_array.reshape(-1, 1)
    # Transpose if channels > samples (i.e., data is stored as channels × samples)
    if best_array.shape[0] < best_array.shape[1]:
        best_array = best_array.T

    return best_array.astype(np.float64)


def extract_features_from_eeg(eeg_data: np.ndarray) -> pd.DataFrame:
    """
    Compute per-channel statistical features from raw EEG data.

    Instead of returning raw time-series (very large), we compute a compact
    feature vector per time window. This keeps the demo CSV lightweight while
    preserving signal characteristics.

    Features per channel:
        - Mean amplitude
        - Standard deviation (power proxy)
        - Peak-to-peak range

    Args:
        eeg_data : (n_samples, n_channels) EEG array

    Returns:
        DataFrame where each row is a 1-second window of computed features.
    """
    n_samples, n_channels = eeg_data.shape
    window_size = 128  # ~1 second at common EEG rates (128–256 Hz)
    step        = window_size  # Non-overlapping windows

    # Determine channel column names
    if n_channels == len(DEFAULT_CHANNEL_NAMES):
        ch_names = DEFAULT_CHANNEL_NAMES
    else:
        ch_names = [f"CH{i+1}" for i in range(n_channels)]

    feature_cols = []
    for ch in ch_names:
        feature_cols += [f"{ch}_mean", f"{ch}_std", f"{ch}_ptp"]

    rows = []
    for start in range(0, n_samples - window_size, step):
        window = eeg_data[start: start + window_size]
        row = []
        for c in range(n_channels):
            ch_data = window[:, c]
            row.append(float(np.mean(ch_data)))
            row.append(float(np.std(ch_data)))
            row.append(float(np.ptp(ch_data)))  # peak-to-peak
        rows.append(row)

    return pd.DataFrame(rows, columns=feature_cols)


def main():
    print("=" * 65)
    print("  EEG Demo Data Preparation Pipeline")
    print("=" * 65)

    # ── Ensure output directory exists ────────────────────────────────────────
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    print(f"\n[✓] Output directory ready: {PROCESSED_DIR}")

    # ── Discover all .mat files in EEG_DIR ───────────────────────────────────
    all_mat_files = sorted([
        f for f in os.listdir(EEG_DIR) if f.endswith(".mat")
    ])
    print(f"[✓] Found {len(all_mat_files)} .mat files in EEG directory.\n")

    if not all_mat_files:
        print(f"[✗] No .mat files found in: {EEG_DIR}")
        print("    Please check the EEG_Demo directory path.")
        return

    # ── Separate DC (alert) and D (drowsy/fatigue) subjects ──────────────────
    dc_files = [f for f in all_mat_files if f.startswith("DCSub")]
    d_files  = [f for f in all_mat_files if f.startswith("DSub")]
    print(f"    Alert (DC) subjects : {len(dc_files)}")
    print(f"    Drowsy (D) subjects : {len(d_files)}\n")

    all_dfs = []
    files_processed = 0

    def process_files(file_list: list, label: int, label_str: str):
        nonlocal files_processed
        for filename in file_list:
            if files_processed >= MAX_SUBJECTS:
                break

            filepath = os.path.join(EEG_DIR, filename)
            print(f"  [→] Processing {filename}  (label={label} / {label_str})")

            eeg_data = load_mat_eeg(filepath)
            if eeg_data is None:
                continue

            print(f"       Raw EEG shape : {eeg_data.shape}")

            # ── Drop constant (dead) channels ─────────────────────────────────
            n_before = eeg_data.shape[1]
            eeg_data = eeg_data[:, eeg_data.std(axis=0) > 1e-6]
            n_after  = eeg_data.shape[1]
            if n_before != n_after:
                print(f"       Dropped {n_before - n_after} constant channel(s).")

            # ── Fill any NaN values with column mean ──────────────────────────
            col_means = np.nanmean(eeg_data, axis=0)
            nan_mask  = np.isnan(eeg_data)
            eeg_data[nan_mask] = np.take(col_means, np.where(nan_mask)[1])

            if eeg_data.shape[0] < 128:
                print(f"       [!] Not enough samples ({eeg_data.shape[0]}), skipping.")
                continue

            # ── Extract windowed features ─────────────────────────────────────
            feat_df = extract_features_from_eeg(eeg_data)

            # Take a representative subset (cap per subject)
            feat_df = feat_df.head(ROWS_PER_SUBJECT)

            # Add subject metadata
            subject_id = re.sub(r"\.mat$", "", filename)
            feat_df.insert(0, "Subject_ID", subject_id)
            feat_df["EEG_Label"] = label  # 0=Alert, 1=Drowsy/Fatigue

            all_dfs.append(feat_df)
            files_processed += 1
            print(f"       Feature windows extracted: {len(feat_df)}")

    # Process alert (DC) subjects first, then drowsy (D) subjects
    process_files(dc_files, label=0, label_str="Alert/Normal")
    process_files(d_files,  label=1, label_str="Drowsy/Fatigue")

    if not all_dfs:
        print("\n[✗] No data could be extracted. Aborting.")
        return

    # ── Combine all subjects ──────────────────────────────────────────────────
    combined_df = pd.concat(all_dfs, ignore_index=True)
    print(f"\n[✓] Combined dataset shape before cleaning: {combined_df.shape}")

    # ── Drop entirely empty (all-NaN) columns ────────────────────────────────
    before_cols = combined_df.shape[1]
    combined_df.dropna(axis=1, how="all", inplace=True)
    after_cols = combined_df.shape[1]
    if before_cols != after_cols:
        print(f"[✓] Dropped {before_cols - after_cols} fully-empty columns.")

    # ── Fill remaining NaNs with column means ────────────────────────────────
    numeric_cols = combined_df.select_dtypes(include=[np.number]).columns
    combined_df[numeric_cols] = combined_df[numeric_cols].fillna(
        combined_df[numeric_cols].mean()
    )

    # ── Cap at TARGET_ROWS for a lightweight demo file ───────────────────────
    if len(combined_df) > TARGET_ROWS:
        combined_df = combined_df.sample(
            n=TARGET_ROWS, random_state=42
        ).reset_index(drop=True)
        print(f"[✓] Sampled down to {TARGET_ROWS} rows for lightweight demo.")

    # ── Save ──────────────────────────────────────────────────────────────────
    combined_df.to_csv(OUTPUT_CSV, index=False)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 65)
    print("  Pipeline Complete — Summary")
    print("=" * 65)
    print(f"  Subjects processed  : {files_processed}")
    print(f"  Final dataset shape : {combined_df.shape}")
    print(f"  Columns             : {list(combined_df.columns[:6])} ... (+{max(0, len(combined_df.columns)-6)} more)")
    print(f"  Label distribution  :\n{combined_df['EEG_Label'].value_counts().to_string()}")
    print(f"\n[✓] Saved → {OUTPUT_CSV}")
    print("=" * 65)


if __name__ == "__main__":
    main()
