"""
Step 4: Evaluate trained quantile models.

Generates calibration curves, interval coverage, sharpness metrics.
Subgroup analysis by race_eth x sex x age_decade.
Edge case checks at boundary inputs.
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from config import MODELS_DIR, REPORTS_DIR, QUANTILES, FEATURE_NAMES, TARGET, WEIGHT_COLUMN


def weighted_mean(values: np.ndarray, sample_weight: np.ndarray | None) -> float:
    if sample_weight is None:
        return float(np.mean(values))
    weights = np.asarray(sample_weight, dtype=float)
    vals = np.asarray(values, dtype=float)
    mask = np.isfinite(vals) & np.isfinite(weights) & (weights >= 0)
    if not np.any(mask):
        return float(np.mean(vals))
    vals = vals[mask]
    weights = weights[mask]
    if np.sum(weights) <= 0:
        return float(np.mean(vals))
    return float(np.average(vals, weights=weights))


def load_models() -> dict:
    """Load trained quantile models."""
    models = {}
    for alpha in QUANTILES:
        path = os.path.join(MODELS_DIR, f"lgbm_q{int(alpha*100):02d}.pkl")
        with open(path, "rb") as f:
            models[alpha] = pickle.load(f)
    return models


def predict_quantiles(models: dict, X: pd.DataFrame) -> np.ndarray:
    """Get predictions from all quantile models, enforce monotonicity."""
    preds = np.column_stack([models[alpha].predict(X) for alpha in QUANTILES])
    # Enforce monotonicity
    for i in range(len(preds)):
        preds[i] = np.sort(preds[i])
    return preds


def calibration_analysis(
    y_true: np.ndarray,
    preds: np.ndarray,
    sample_weight: np.ndarray | None = None,
) -> dict:
    """Check calibration: actual coverage at each quantile level."""
    results = {}
    for i, alpha in enumerate(QUANTILES):
        actual_coverage = weighted_mean((y_true <= preds[:, i]).astype(float), sample_weight)
        results[f"q{int(alpha*100):02d}"] = {
            "nominal": alpha,
            "actual": float(actual_coverage),
            "diff": float(actual_coverage - alpha),
        }
    return results


def interval_coverage(
    y_true: np.ndarray,
    preds: np.ndarray,
    sample_weight: np.ndarray | None = None,
) -> dict:
    """Compute coverage and width of prediction intervals."""
    # 90% PI: q05 to q95
    pi90_coverage = weighted_mean(((y_true >= preds[:, 0]) & (y_true <= preds[:, 4])).astype(float), sample_weight)
    pi90_width = weighted_mean(preds[:, 4] - preds[:, 0], sample_weight)

    # 50% PI: q25 to q75
    pi50_coverage = weighted_mean(((y_true >= preds[:, 1]) & (y_true <= preds[:, 3])).astype(float), sample_weight)
    pi50_width = weighted_mean(preds[:, 3] - preds[:, 1], sample_weight)

    return {
        "pi90": {
            "coverage": float(pi90_coverage),
            "target": 0.90,
            "mean_width": float(pi90_width),
        },
        "pi50": {
            "coverage": float(pi50_coverage),
            "target": 0.50,
            "mean_width": float(pi50_width),
        },
    }


def subgroup_analysis(
    X: pd.DataFrame, y: pd.Series, preds: np.ndarray
) -> pd.DataFrame:
    """Subgroup analysis by race_eth x sex x age_decade."""
    df = X.copy()
    df["y_true"] = y.values
    df["q05"] = preds[:, 0]
    df["q95"] = preds[:, 4]
    df["age_decade"] = (df["age"] // 10) * 10

    results = []
    for (race, sex, age_dec), group in df.groupby(["race_eth", "sex", "age_decade"]):
        n = len(group)
        if n < 5:
            continue
        coverage = np.mean(
            (group["y_true"] >= group["q05"]) & (group["y_true"] <= group["q95"])
        )
        width = np.mean(group["q95"] - group["q05"])
        results.append({
            "race_eth": int(race),
            "sex": int(sex),
            "age_decade": int(age_dec),
            "n": n,
            "pi90_coverage": round(coverage, 3),
            "pi90_width": round(width, 1),
            "sparse": n < 50,
        })

    return pd.DataFrame(results)


def plot_calibration(calibration: dict, output_path: str):
    """Plot calibration curve."""
    fig, ax = plt.subplots(figsize=(6, 6))
    nominals = [v["nominal"] for v in calibration.values()]
    actuals = [v["actual"] for v in calibration.values()]

    ax.plot([0, 1], [0, 1], "k--", alpha=0.5, label="Perfect calibration")
    ax.scatter(nominals, actuals, s=100, zorder=5, color="steelblue")
    ax.plot(nominals, actuals, color="steelblue", alpha=0.7)

    for n, a in zip(nominals, actuals):
        ax.annotate(f"  q{int(n*100)}: {a:.3f}", (n, a), fontsize=9)

    ax.set_xlabel("Nominal Quantile Level")
    ax.set_ylabel("Actual Coverage")
    ax.set_title("Quantile Calibration")
    ax.set_xlim(-0.05, 1.05)
    ax.set_ylim(-0.05, 1.05)
    ax.legend()
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print(f"Saved calibration plot: {output_path}")


def plot_interval_widths(preds: np.ndarray, output_path: str):
    """Plot distribution of 90% PI widths."""
    widths = preds[:, 4] - preds[:, 0]
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.hist(widths, bins=50, color="steelblue", alpha=0.7, edgecolor="white")
    ax.axvline(np.median(widths), color="red", linestyle="--", label=f"Median: {np.median(widths):.1f}")
    ax.set_xlabel("90% Prediction Interval Width (ng/mL)")
    ax.set_ylabel("Count")
    ax.set_title("Sharpness: Distribution of 90% PI Widths")
    ax.legend()
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print(f"Saved interval width plot: {output_path}")


def edge_case_check(models: dict) -> dict:
    """Check predictions at boundary inputs."""
    edge_cases = {
        "young_thin": {"age": 18, "sex": 0, "bmi": 18, "race_eth": 2, "exam_season": 2, "supplement_cat": 0},
        "old_obese": {"age": 90, "sex": 1, "bmi": 50, "race_eth": 3, "exam_season": 1, "supplement_cat": 0},
        "typical_male": {"age": 40, "sex": 0, "bmi": 27, "race_eth": 2, "exam_season": 2, "supplement_cat": 1},
        "typical_female": {"age": 40, "sex": 1, "bmi": 27, "race_eth": 2, "exam_season": 2, "supplement_cat": 1},
        "supplemented": {"age": 50, "sex": 1, "bmi": 30, "race_eth": 2, "exam_season": 1, "supplement_cat": 4},
    }

    results = {}
    for name, inputs in edge_cases.items():
        X = pd.DataFrame([inputs])
        preds = predict_quantiles(models, X)
        results[name] = {
            "inputs": inputs,
            "q05": round(float(preds[0, 0]), 1),
            "q25": round(float(preds[0, 1]), 1),
            "q50": round(float(preds[0, 2]), 1),
            "q75": round(float(preds[0, 3]), 1),
            "q95": round(float(preds[0, 4]), 1),
            "pi90_width": round(float(preds[0, 4] - preds[0, 0]), 1),
        }
        print(f"  {name}: median={results[name]['q50']}, PI90=[{results[name]['q05']}, {results[name]['q95']}]")

    return results


def main():
    os.makedirs(REPORTS_DIR, exist_ok=True)

    # Load models and test data
    models = load_models()
    test_path = os.path.join(MODELS_DIR, "test_set.parquet")
    if not os.path.exists(test_path):
        print(f"Test set not found: {test_path}", file=sys.stderr)
        sys.exit(1)

    test_df = pd.read_parquet(test_path)
    X_test = test_df[FEATURE_NAMES]
    y_test = test_df[TARGET]
    sample_weight = test_df[WEIGHT_COLUMN].values if WEIGHT_COLUMN in test_df.columns else None
    print(f"Test set: {len(X_test)} records")

    # Predictions
    preds = predict_quantiles(models, X_test)

    # Calibration
    print("\n=== Calibration Analysis ===")
    cal = calibration_analysis(y_test.values, preds, sample_weight)
    for k, v in cal.items():
        print(f"  {k}: nominal={v['nominal']:.2f}, actual={v['actual']:.3f}, diff={v['diff']:+.3f}")

    # Interval coverage
    print("\n=== Interval Coverage ===")
    coverage = interval_coverage(y_test.values, preds, sample_weight)
    for k, v in coverage.items():
        print(f"  {k}: coverage={v['coverage']:.3f} (target {v['target']:.2f}), width={v['mean_width']:.1f}")

    # Subgroup analysis
    print("\n=== Subgroup Analysis ===")
    subgroups = subgroup_analysis(X_test, y_test, preds)
    sparse_groups = subgroups[subgroups["sparse"]]
    if len(sparse_groups) > 0:
        print(f"  {len(sparse_groups)} subgroups with < 50 test samples (sparse)")
    subgroups.to_csv(os.path.join(REPORTS_DIR, "subgroup_analysis.csv"), index=False)
    print(f"  Saved subgroup analysis")

    # Edge cases
    print("\n=== Edge Case Check ===")
    edge = edge_case_check(models)

    # Plots
    plot_calibration(cal, os.path.join(REPORTS_DIR, "calibration_plot.png"))
    plot_interval_widths(preds, os.path.join(REPORTS_DIR, "interval_widths.png"))

    # Save full report
    report = {
        "calibration": cal,
        "interval_coverage": coverage,
        "n_subgroups_total": len(subgroups),
        "n_subgroups_sparse": len(sparse_groups),
        "edge_cases": edge,
    }
    report_path = os.path.join(REPORTS_DIR, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report saved to {report_path}")


if __name__ == "__main__":
    main()
