"""
Step 5: Export trained LightGBM models to ONNX format.

Converts 5 quantile models to ONNX for browser inference.
Validates ONNX outputs match LightGBM predictions.
Generates model_meta.json with feature spec and calibration stats.
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
import onnx
import onnxruntime as ort
from onnxmltools import convert_lightgbm
from onnxmltools.convert.common.data_types import FloatTensorType
from config import (
    MODELS_DIR, REPORTS_DIR, QUANTILES, FEATURE_NAMES, TARGET,
    THRESHOLDS, RACE_ETH_MAP, SEX_MAP
)


def export_single_model(model, feature_names: list, output_path: str):
    """Export a single LightGBM model to ONNX."""
    initial_type = [("features", FloatTensorType([None, len(feature_names)]))]
    onnx_model = convert_lightgbm(model, initial_types=initial_type)
    onnx.save_model(onnx_model, output_path)
    return onnx_model


def validate_onnx_model(lgbm_model, onnx_path: str, X_sample: pd.DataFrame, alpha: float):
    """Validate ONNX model outputs match LightGBM predictions."""
    # LightGBM predictions
    lgbm_preds = lgbm_model.predict(X_sample)

    # ONNX predictions
    session = ort.InferenceSession(onnx_path)
    input_name = session.get_inputs()[0].name
    X_np = X_sample.values.astype(np.float32)
    onnx_result = session.run(None, {input_name: X_np})
    onnx_preds = onnx_result[0].flatten()

    max_diff = np.max(np.abs(lgbm_preds - onnx_preds))
    mean_diff = np.mean(np.abs(lgbm_preds - onnx_preds))
    print(f"  Q{int(alpha*100):02d}: max_diff={max_diff:.6f}, mean_diff={mean_diff:.6f}")

    if max_diff > 0.01:
        print(f"  WARNING: Max difference exceeds 0.01 ng/mL for q{int(alpha*100):02d}!")
        return False
    return True


def create_model_meta(models_dir: str, reports_dir: str) -> dict:
    """Create model_meta.json with feature specs and calibration stats."""
    # Load training metadata
    train_meta_path = os.path.join(models_dir, "training_meta.json")
    train_meta = {}
    if os.path.exists(train_meta_path):
        with open(train_meta_path) as f:
            train_meta = json.load(f)

    # Load evaluation report
    eval_path = os.path.join(reports_dir, "evaluation_report.json")
    eval_report = {}
    if os.path.exists(eval_path):
        with open(eval_path) as f:
            eval_report = json.load(f)

    # Load subgroup analysis for sparsity warnings
    subgroup_path = os.path.join(reports_dir, "subgroup_analysis.csv")
    sparse_groups = []
    if os.path.exists(subgroup_path):
        sg = pd.read_csv(subgroup_path)
        sparse = sg[sg["sparse"] == True]
        sparse_groups = sparse[["race_eth", "sex", "age_decade", "n"]].to_dict("records")

    meta = {
        "model_version": "1.1.0",
        "quantiles": QUANTILES,
        "features": [
            {
                "name": "age",
                "type": "continuous",
                "range": [18, 90],
                "description": "Age in years",
            },
            {
                "name": "sex",
                "type": "categorical",
                "values": {str(k): v for k, v in SEX_MAP.items()},
                "description": "Sex (0=male, 1=female)",
            },
            {
                "name": "bmi",
                "type": "continuous",
                "range": [10, 80],
                "description": "Body mass index (kg/m^2)",
            },
            {
                "name": "race_eth",
                "type": "categorical",
                "values": {str(k): v for k, v in RACE_ETH_MAP.items()},
                "description": "Race/ethnicity encoding from NHANES RIDRETH1",
            },
            {
                "name": "exam_season",
                "type": "categorical",
                "values": {"1": "winter (Nov-Apr)", "2": "summer (May-Oct)"},
                "description": "Season of measurement",
            },
            {
                "name": "supplement_cat",
                "type": "ordinal",
                "values": {"0": "none", "1": "trace (<400 IU)", "2": "low (400-999 IU)", "3": "moderate (1000-1999 IU)", "4": "high (2000+ IU)"},
                "description": "Vitamin D supplement dose category",
            },
        ],
        "thresholds_ngml": THRESHOLDS,
        "calibration": eval_report.get("calibration", {}),
        "interval_coverage": eval_report.get("interval_coverage", {}),
        "conformal_adjustments": train_meta.get("conformal_adjustments", {}),
        "temporal_validation": train_meta.get("temporal_validation", {}),
        "random_split_interval_coverage": train_meta.get("random_split_interval_coverage", {}),
        "training_stats": train_meta.get("train_y_stats", {}),
        "sparse_subgroups": sparse_groups,
        "n_train": train_meta.get("n_train", 0),
        "n_test": train_meta.get("n_test", 0),
    }

    return meta


def main():
    # Output directory for ONNX files (will be copied to app/public/models/)
    onnx_dir = os.path.join(MODELS_DIR, "onnx")
    os.makedirs(onnx_dir, exist_ok=True)

    # Load test data for validation
    test_path = os.path.join(MODELS_DIR, "test_set.parquet")
    if not os.path.exists(test_path):
        print("Test set not found. Run 03 and 04 first.", file=sys.stderr)
        sys.exit(1)

    test_df = pd.read_parquet(test_path)
    X_sample = test_df[FEATURE_NAMES].head(100)

    print("=== Exporting ONNX models ===\n")

    all_valid = True
    onnx_sizes = {}

    for alpha in QUANTILES:
        model_path = os.path.join(MODELS_DIR, f"lgbm_q{int(alpha*100):02d}.pkl")
        with open(model_path, "rb") as f:
            model = pickle.load(f)

        onnx_path = os.path.join(onnx_dir, f"quantile_q{int(alpha*100):02d}.onnx")
        print(f"Exporting q{int(alpha*100):02d}...")
        export_single_model(model, FEATURE_NAMES, onnx_path)

        # Validate
        valid = validate_onnx_model(model, onnx_path, X_sample, alpha)
        if not valid:
            all_valid = False

        # Track size
        size_kb = os.path.getsize(onnx_path) / 1024
        onnx_sizes[f"q{int(alpha*100):02d}"] = f"{size_kb:.1f} KB"
        print(f"  Size: {size_kb:.1f} KB")

    print(f"\nTotal ONNX size: {sum(os.path.getsize(os.path.join(onnx_dir, f)) for f in os.listdir(onnx_dir) if f.endswith('.onnx')) / 1024:.1f} KB")

    if all_valid:
        print("\nAll ONNX models validated successfully!")
    else:
        print("\nWARNING: Some models failed validation!", file=sys.stderr)

    # Generate model_meta.json
    print("\n=== Generating model_meta.json ===")
    meta = create_model_meta(MODELS_DIR, REPORTS_DIR)
    meta["onnx_files"] = [f"quantile_q{int(alpha*100):02d}.onnx" for alpha in QUANTILES]
    meta["onnx_sizes"] = onnx_sizes
    meta["validation_passed"] = all_valid

    meta_path = os.path.join(onnx_dir, "model_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Saved model_meta.json to {meta_path}")

    # Generate test fixtures for browser validation
    print("\n=== Generating test fixtures ===")
    fixtures = []
    for i in range(min(20, len(X_sample))):
        row = X_sample.iloc[i]
        preds = {}
        for alpha in QUANTILES:
            model_path = os.path.join(MODELS_DIR, f"lgbm_q{int(alpha*100):02d}.pkl")
            with open(model_path, "rb") as f:
                model = pickle.load(f)
            pred = float(model.predict(pd.DataFrame([row]))[0])
            preds[f"q{int(alpha*100):02d}"] = round(pred, 2)

        fixtures.append({
            "inputs": {k: float(row[k]) for k in FEATURE_NAMES},
            "expected": preds,
        })

    fixtures_path = os.path.join(onnx_dir, "test_fixtures.json")
    with open(fixtures_path, "w") as f:
        json.dump(fixtures, f, indent=2)
    print(f"Saved {len(fixtures)} test fixtures to {fixtures_path}")


if __name__ == "__main__":
    main()
