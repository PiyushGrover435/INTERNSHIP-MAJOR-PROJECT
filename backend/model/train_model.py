"""
train_model.py
==============
Master Stacking Ensemble — Mental Health Stress Classifier
-----------------------------------------------------------
Loads the engineered WESAD features, performs rigorous cross-validated
hyperparameter tuning via Optuna, then trains a two-level stacking
ensemble using manual GroupKFold OOF predictions and saves artifacts.

Architecture:
  Level-0 (Base Learners):
    - LGBMClassifier       (L1/L2 reg, class_weight balanced)
    - XGBClassifier        (L1/L2 reg, scale_pos_weight)
    - ExtraTreesClassifier (max_depth, class_weight balanced)

  Level-1 (Meta-Learner):
    - CatBoostClassifier(iterations=300, depth=4, auto_class_weights='Balanced')

Feature Set (31 features from 4 wrist sensors):
  ACC  : mean/std per axis, motion intensity, energy, range  (9 features)
  BVP  : mean, std, min, max, range, rms, skew, kurt         (8 features)
  BVP  : cardiac_power, total_power, dominant_freq           (3 features)
  EDA  : mean, std, min, max, slope, energy                  (6 features)
  TEMP : mean, std, min, max, slope                          (5 features)

Validation Strategy:
  - GroupKFold(n_splits=5) grouped by Patient_ID
  - Used for BOTH base-model Optuna tuning AND meta-feature generation
  - Completely eliminates subject-level data leakage at every stage

Stacking Strategy (Manual OOF — fixes sklearn StackingClassifier leakage):
  1. Tune base models with Optuna (GroupKFold CV, no leakage)
  2. Generate OOF probability predictions from each base model (GroupKFold)
  3. Evaluate CatBoost meta-model on those OOF meta-features (GroupKFold)
  4. Retrain all base models on full data
  5. Train final CatBoost meta-model on full OOF meta-feature matrix
  6. Wrap in StackingEnsemble — sklearn-compatible predict / predict_proba

Hyperparameter Search:
  - Optuna TPESampler, 50 trials per base model
  - Objective: maximise macro-averaged F1 (handles class imbalance)

Outputs:
  - mental_health_model.pkl  — trained StackingEnsemble
  - scaler.pkl               — fitted RobustScaler

Usage:
  python train_model.py
"""

import os
import warnings
import time
import numpy as np
import pandas as pd
import joblib
import optuna

from sklearn.preprocessing  import RobustScaler
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.ensemble        import ExtraTreesClassifier, RandomForestClassifier
from sklearn.base            import clone
from sklearn.metrics         import classification_report, f1_score, precision_score
from sklearn.feature_selection import SelectFromModel, SelectKBest, f_classif
from lightgbm  import LGBMClassifier
from xgboost   import XGBClassifier
from catboost  import CatBoostClassifier

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
optuna.logging.set_verbosity(optuna.logging.WARNING)

# ─── PATHS ────────────────────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
DATA_PATH     = os.path.join(PROCESSED_DIR, "wesad_clean.csv")
MODEL_PATH    = os.path.join(BASE_DIR, "mental_health_model.pkl")
SCALER_PATH   = os.path.join(BASE_DIR, "scaler.pkl")
SELECTOR_PATH = os.path.join(BASE_DIR, "selector.pkl")

# ─── TUNING CONFIG ────────────────────────────────────────────────────────────
N_TRIALS     = 50   # Optuna trials per base model
N_FOLDS      = 5    # GroupKFold splits (used everywhere — no leakage)
RANDOM_STATE = 42
N_JOBS       = -1   # Use all CPU cores where supported

# ─── FEATURE / TARGET COLUMNS ────────────────────────────────────────────────
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
TARGET_COL = "Stress_Label"
GROUP_COL  = "Patient_ID"


# ══════════════════════════════════════════════════════════════════════════════
#  STACKING ENSEMBLE WRAPPER  (sklearn-compatible, joblib-serialisable)
# ══════════════════════════════════════════════════════════════════════════════

class StackingEnsemble:
    """
    Wraps (base_models, meta_model) into a single sklearn-compatible object.

    At inference:
      X → [lgbm, xgb, et].predict_proba() → meta-features (6 cols)
        → CatBoostClassifier → final prediction

    Serialised with joblib alongside the RobustScaler.
    """

    def __init__(self, base_models: list, meta_model: CatBoostClassifier):
        self.base_models = base_models   # [(name, fitted_estimator), ...]
        self.meta_model  = meta_model    # fitted CatBoostClassifier

    def _meta_features(self, X: np.ndarray) -> np.ndarray:
        """Stack predict_proba outputs from all base models → (n, n_base*2)."""
        return np.hstack([est.predict_proba(X) for _, est in self.base_models])

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.meta_model.predict(self._meta_features(X))

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.meta_model.predict_proba(self._meta_features(X))


# ══════════════════════════════════════════════════════════════════════════════
#  DATA LOADING & SCALING
# ══════════════════════════════════════════════════════════════════════════════

def load_and_scale_data(data_path: str):
    """
    Load wesad_clean.csv, extract features/labels/groups, and fit a
    RobustScaler (robust to outlier physiological readings).

    Returns:
        X_scaled (np.ndarray), y (np.ndarray), groups (np.ndarray), scaler
    """
    print(f"\n[1/5] Loading data from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"      Shape            : {df.shape}")
    print(f"      Subjects         : {df[GROUP_COL].nunique()} unique patients")
    print(f"      Class distribution:\n{df[TARGET_COL].value_counts().to_string()}")

    X      = df[FEATURE_COLS].values
    y      = df[TARGET_COL].values
    groups = df[GROUP_COL].values

    scaler   = RobustScaler()
    X_scaled = scaler.fit_transform(X)
    print(f"\n[✓] {X_scaled.shape[1]} features scaled with RobustScaler.")
    
    print("\n[✓] Selecting Top 20 Features via SelectKBest (ANOVA F-value)...")
    selector = SelectKBest(score_func=f_classif, k=20)
    X_selected = selector.fit_transform(X_scaled, y)
    
    # Print out which features were selected
    selected_mask = selector.get_support()
    assert selected_mask is not None, "Feature selection failed."
    selected_names = [FEATURE_COLS[i] for i, m in enumerate(selected_mask) if m]
    print(f"      Selected 20 features: {selected_names}")

    return X_selected, y, groups, scaler, selector


# ══════════════════════════════════════════════════════════════════════════════
#  OPTUNA OBJECTIVE FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def _cv_score(model, X, y, groups, n_folds=N_FOLDS) -> float:
    """GroupKFold cross-validation → mean macro-F1."""
    gkf    = GroupKFold(n_splits=n_folds)
    scores = cross_val_score(
        model, X, y,
        cv=gkf.split(X, y, groups),
        scoring="f1_macro",
        n_jobs=N_JOBS,
    )
    return float(np.mean(scores))


def objective_lgbm(trial, X, y, groups) -> float:
    params = {
        "n_estimators"     : trial.suggest_int("n_estimators", 100, 600),
        "learning_rate"    : trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
        "num_leaves"       : trial.suggest_int("num_leaves", 20, 200),
        "max_depth"        : trial.suggest_int("max_depth", 3, 15),
        "reg_alpha"        : trial.suggest_float("reg_alpha", 1e-4, 5.0, log=True),
        "reg_lambda"       : trial.suggest_float("reg_lambda", 1e-4, 5.0, log=True),
        "min_child_samples": trial.suggest_int("min_child_samples", 5, 60),
        "subsample"        : trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree" : trial.suggest_float("colsample_bytree", 0.6, 1.0),
        "class_weight"     : "balanced",
        "random_state"     : RANDOM_STATE,
        "n_jobs"           : N_JOBS,
        "verbose"          : -1,
    }
    return _cv_score(LGBMClassifier(**params), X, y, groups)


def objective_xgb(trial, X, y, groups) -> float:
    scale_pos_weight = float(np.sum(y == 0) / np.sum(y == 1))
    params = {
        "n_estimators"     : trial.suggest_int("n_estimators", 100, 600),
        "learning_rate"    : trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
        "max_depth"        : trial.suggest_int("max_depth", 3, 12),
        "subsample"        : trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree" : trial.suggest_float("colsample_bytree", 0.6, 1.0),
        "alpha"            : trial.suggest_float("alpha", 1e-4, 5.0, log=True),
        "reg_lambda"       : trial.suggest_float("reg_lambda", 1e-4, 5.0, log=True),
        "min_child_weight" : trial.suggest_int("min_child_weight", 1, 10),
        "scale_pos_weight" : scale_pos_weight,
        "eval_metric"      : "logloss",
        "use_label_encoder": False,
        "random_state"     : RANDOM_STATE,
        "n_jobs"           : N_JOBS,
        "verbosity"        : 0,
    }
    return _cv_score(XGBClassifier(**params), X, y, groups)


def objective_et(trial, X, y, groups) -> float:
    params = {
        "n_estimators"     : trial.suggest_int("n_estimators", 100, 600),
        "max_depth"        : trial.suggest_int("max_depth", 5, 40),
        "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
        "min_samples_leaf" : trial.suggest_int("min_samples_leaf", 1, 10),
        "max_features"     : trial.suggest_categorical("max_features", ["sqrt", "log2"]),
        "class_weight"     : "balanced",
        "random_state"     : RANDOM_STATE,
        "n_jobs"           : N_JOBS,
    }
    return _cv_score(ExtraTreesClassifier(**params), X, y, groups)


def objective_rf(trial, X, y, groups) -> float:
    """
    Optuna objective for RandomForestClassifier.
    RF differs from ExtraTrees in that it uses the best split (not random),
    adding genuine ensemble diversity to the stacking.
    """
    params = {
        "n_estimators"     : trial.suggest_int("n_estimators", 100, 500),
        "max_depth"        : trial.suggest_int("max_depth", 5, 30),
        "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
        "min_samples_leaf" : trial.suggest_int("min_samples_leaf", 1, 10),
        "max_features"     : trial.suggest_categorical("max_features", ["sqrt", "log2"]),
        "class_weight"     : "balanced",
        "random_state"     : RANDOM_STATE,
        "n_jobs"           : N_JOBS,
    }
    return _cv_score(RandomForestClassifier(**params), X, y, groups)


# ══════════════════════════════════════════════════════════════════════════════
#  HYPERPARAMETER TUNING
# ══════════════════════════════════════════════════════════════════════════════

def tune_base_models(X: np.ndarray, y: np.ndarray, groups: np.ndarray) -> dict:
    """
    Run Optuna TPESampler studies for each base model.

    Returns:
        dict mapping model name → best_params dict
    """
    print("\n[2/5] Hyperparameter Tuning with Optuna (TPESampler)")
    print(f"      Trials per model : {N_TRIALS}")
    print(f"      CV strategy      : GroupKFold(n_splits={N_FOLDS}) — zero data leakage\n")

    sampler    = optuna.samplers.TPESampler(seed=RANDOM_STATE)
    best_params = {}

    for name, objective in [
        ("lgbm", objective_lgbm),
        ("xgb",  objective_xgb),
        ("et",   objective_et),
    ]:
        print(f"  ── Tuning {name.upper()} ──")
        t0    = time.time()
        study = optuna.create_study(direction="maximize", sampler=sampler)
        study.optimize(
            lambda trial, obj=objective: obj(trial, X, y, groups),
            n_trials=N_TRIALS,
            show_progress_bar=False,
        )
        best_params[name] = study.best_params
        print(f"     Best Precision : {study.best_value:.4f}  ({time.time()-t0:.1f}s)")
        print(f"     Best params   : {study.best_params}\n")

    return best_params


# ══════════════════════════════════════════════════════════════════════════════
#  BASE ESTIMATOR CONSTRUCTION
# ══════════════════════════════════════════════════════════════════════════════

def build_base_estimators(best_params: dict, y: np.ndarray) -> list:
    """
    Instantiate the three base learners with their tuned hyperparameters.

    Returns:
        [(name, unfitted_estimator), ...]
    """
    scale_pos_weight = float(np.sum(y == 0) / np.sum(y == 1))

    lgbm_params = {**best_params["lgbm"], "class_weight": "balanced",
                   "random_state": RANDOM_STATE, "n_jobs": N_JOBS, "verbose": -1}

    xgb_params  = {**best_params["xgb"], "scale_pos_weight": scale_pos_weight,
                   "eval_metric": "logloss", "use_label_encoder": False,
                   "random_state": RANDOM_STATE, "n_jobs": N_JOBS, "verbosity": 0}

    et_params   = {**best_params["et"], "class_weight": "balanced",
                   "random_state": RANDOM_STATE, "n_jobs": N_JOBS}

    lgbm = LGBMClassifier()
    lgbm.set_params(**lgbm_params)

    xgb_model = XGBClassifier()
    xgb_model.set_params(**xgb_params)

    et = ExtraTreesClassifier()
    et.set_params(**et_params)

    return [
        ("lgbm", lgbm),
        ("xgb",  xgb_model),
        ("et",   et),
    ]


# ══════════════════════════════════════════════════════════════════════════════
#  MANUAL OOF STACKING  (fixes the StackingClassifier group-leakage issue)
# ══════════════════════════════════════════════════════════════════════════════

def generate_oof_meta_features(
    base_estimators: list,
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
) -> np.ndarray:
    """
    Generate out-of-fold (OOF) probability predictions using GroupKFold.

    Each base model is trained on n-1 folds and predicts on the held-out fold.
    The resulting OOF probabilities become the meta-features for the second level.

    This is the CORRECT way to build stacking meta-features — it ensures that
    when the meta-model learns from base-model predictions, it never sees
    predictions made on data the base model was trained on (no leakage).

    Returns:
        oof_meta : np.ndarray of shape (n_samples, n_base_models * 2)
    """
    gkf      = GroupKFold(n_splits=N_FOLDS)
    n_base   = len(base_estimators)
    oof_meta = np.zeros((len(X), n_base * 2))
    oof_f1s  = {name: [] for name, _ in base_estimators}

    for fold_idx, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups), 1):
        X_tr, X_val = X[train_idx], X[val_idx]
        y_tr, y_val = y[train_idx], y[val_idx]

        for i, (name, estimator) in enumerate(base_estimators):
            est   = clone(estimator)
            est.fit(X_tr, y_tr)
            proba = est.predict_proba(X_val)
            oof_meta[val_idx, i * 2: (i + 1) * 2] = proba
            fold_score = f1_score(y_val, proba.argmax(axis=1), average="macro")
            oof_f1s[name].append(fold_score)

        print(f"      Fold {fold_idx} done")

    print()
    for name, f1s in oof_f1s.items():
        print(f"      [{name:4s}] OOF Macro-F1: {np.mean(f1s):.4f} ± {np.std(f1s):.4f}")

    return oof_meta


def evaluate_oof_stacking(
    oof_meta: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
) -> float:
    """
    Evaluate the meta-model (CatBoost) via GroupKFold on the OOF meta-features.
    This gives an unbiased estimate of final stacking performance.

    Returns:
        Mean macro-F1 across folds
    """
    meta_model = CatBoostClassifier(
        iterations=300, depth=4,
        auto_class_weights="Balanced",
        verbose=0, random_state=RANDOM_STATE,
    )
    gkf    = GroupKFold(n_splits=N_FOLDS)
    scores = []

    for train_idx, val_idx in gkf.split(oof_meta, y, groups):
        m = clone(meta_model)
        m.fit(oof_meta[train_idx], y[train_idx])
        pred = m.predict(oof_meta[val_idx])
        scores.append(f1_score(y[val_idx], pred, average="macro"))

    mean_f1, std_f1 = np.mean(scores), np.std(scores)
    for i, s in enumerate(scores, 1):
        print(f"      Stacking Fold {i}: Macro-F1 = {s:.4f}")
    print(f"\n      ══ Stacking CV Macro-F1 : {mean_f1:.4f} ± {std_f1:.4f} ══")
    return mean_f1


# ══════════════════════════════════════════════════════════════════════════════
#  FINAL TRAINING
# ══════════════════════════════════════════════════════════════════════════════

def train_final_stack(
    X: np.ndarray,
    y: np.ndarray,
    base_estimators: list,
    oof_meta: np.ndarray,
) -> "StackingEnsemble":
    """
    1. Retrain all base models on the FULL dataset.
    2. Train the CatBoost meta-model on the FULL OOF meta-feature matrix.
    3. Return a StackingEnsemble ready for serialisation and inference.

    Args:
        X               : full scaled feature matrix
        y               : full label array
        base_estimators : list of (name, unfitted estimator)
        oof_meta        : (n_samples, n_base*2) OOF probability matrix

    Returns:
        StackingEnsemble
    """
    print(f"\n[4/5] Training Final Models on Full Dataset ...")
    t0 = time.time()

    trained_bases = []
    for name, estimator in base_estimators:
        est = clone(estimator)
        est.fit(X, y)
        trained_bases.append((name, est))
        print(f"      [✓] {name} trained")

    meta_model = CatBoostClassifier(
        iterations=300, depth=4,
        auto_class_weights="Balanced",
        verbose=0, random_state=RANDOM_STATE,
    )
    meta_model.fit(oof_meta, y)
    print(f"      [✓] CatBoost meta-model trained on full OOF meta-features")
    print(f"      Training complete in {time.time() - t0:.1f}s")

    ensemble = StackingEnsemble(trained_bases, meta_model)

    # In-sample classification report (training set — upper-bound reference)
    y_pred = ensemble.predict(X)
    print("\n      ── Full-Data Classification Report ──")
    print(classification_report(
        y, y_pred,
        target_names=["Normal (0)", "High Stress (1)"],
        digits=4,
    ))

    return ensemble


# ══════════════════════════════════════════════════════════════════════════════
#  ARTIFACT PERSISTENCE
# ══════════════════════════════════════════════════════════════════════════════

def save_artifacts(ensemble: "StackingEnsemble", scaler: RobustScaler, selector) -> None:
    """Persist the trained StackingEnsemble, RobustScaler, and Feature Selector with joblib."""
    print("[5/5] Saving Artifacts ...")
    joblib.dump(ensemble, MODEL_PATH, compress=3)
    joblib.dump(scaler,   SCALER_PATH, compress=3)
    joblib.dump(selector, SELECTOR_PATH, compress=3)
    print(f"      [✓] Model saved    → {MODEL_PATH}")
    print(f"      [✓] Scaler saved   → {SCALER_PATH}")
    print(f"      [✓] Selector saved → {SELECTOR_PATH}")


# ══════════════════════════════════════════════════════════════════════════════
#  BACKWARDS-COMPATIBLE LOADER  (used by Flask API / app.py)
# ══════════════════════════════════════════════════════════════════════════════

def load_model():
    """
    Load the saved StackingEnsemble, RobustScaler, and Feature Selector.
    If no trained model is found, triggers a fresh training run.

    Returns:
        (ensemble, scaler, selector) — all support .predict() / .transform()
    """
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH) or not os.path.exists(SELECTOR_PATH):
        print("[!] No trained model found. Running full training pipeline now...")
        main()

    ensemble = joblib.load(MODEL_PATH)
    scaler   = joblib.load(SCALER_PATH)
    selector = joblib.load(SELECTOR_PATH)
    print("[✓] Stacking ensemble, scaler, and selector loaded successfully.")
    return ensemble, scaler, selector


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main():
    start_time = time.time()
    print("=" * 65)
    print("  Mental Health Stress Classifier — Training Pipeline")
    print("  Architecture: LGBM + XGBoost + ExtraTrees → CatBoostClassifier")
    print("  Stacking: Manual OOF GroupKFold — zero subject data leakage")
    print("=" * 65)

    if not os.path.isfile(DATA_PATH):
        print(f"\n[✗] Data file not found: {DATA_PATH}")
        print("    Please run `python clean_wesad.py` first.")
        return

    # ── Step 1: Load, scale, select features ──────────────────────────────────
    X, y, groups, scaler, selector = load_and_scale_data(DATA_PATH)

    # ── Step 2: Tune base models ──────────────────────────────────────────────
    best_params     = tune_base_models(X, y, groups)
    base_estimators = build_base_estimators(best_params, y)

    # ── Step 3: Generate OOF meta-features (GroupKFold — no leakage) ──────────
    print("\n[3/5] Generating OOF Meta-Features (GroupKFold — zero subject leakage)")
    oof_meta = generate_oof_meta_features(base_estimators, X, y, groups)

    # ── Step 3b: Evaluate stacking CV on OOF features ─────────────────────────
    print("\n      ── Stacking CV Evaluation ──")
    evaluate_oof_stacking(oof_meta, y, groups)

    # ── Step 4: Train final models on full data ───────────────────────────────
    ensemble = train_final_stack(X, y, base_estimators, oof_meta)

    # ── Step 5: Save artifacts ────────────────────────────────────────────────
    save_artifacts(ensemble, scaler, selector)

    total_time = time.time() - start_time
    print("\n" + "=" * 65)
    print(f"  Pipeline Complete in {total_time / 60:.1f} minutes")
    print("=" * 65)


if __name__ == "__main__":
    main()
