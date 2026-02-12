"""
Step 3: Train quantile regression models using LightGBM.

Trains models at quantiles [0.05, 0.25, 0.50, 0.75, 0.95].
Uses 5-fold CV hyperparameter search and NHANES sample weights.
Exports random-split and temporal-holdout validation metadata.
"""

import os
import sys
import json
import pickle
from itertools import product

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split

from config import (
    FEATURE_NAMES,
    HYPERPARAM_GRID,
    MODELS_DIR,
    PROCESSED_DIR,
    QUANTILES,
    TARGET,
    WEIGHT_COLUMN,
)


def create_stratification_bins(y: pd.Series, n_bins: int = 10) -> pd.Series:
    """Create bins for stratified splitting on a continuous target."""
    return pd.qcut(y, q=n_bins, labels=False, duplicates="drop")


def weighted_mean(values: np.ndarray, sample_weight: np.ndarray) -> float:
    """Weighted mean with safe fallback to unweighted."""
    weights = np.asarray(sample_weight, dtype=float)
    vals = np.asarray(values, dtype=float)
    mask = np.isfinite(vals) & np.isfinite(weights) & (weights >= 0)
    if not np.any(mask):
        return float(np.mean(vals))
    weights = weights[mask]
    vals = vals[mask]
    if np.sum(weights) <= 0:
        return float(np.mean(vals))
    return float(np.average(vals, weights=weights))


def weighted_quantile(
    values: np.ndarray,
    q: float,
    sample_weight: np.ndarray | None = None,
) -> float:
    """Weighted quantile for conformal adjustment estimation."""
    vals = np.asarray(values, dtype=float)
    if sample_weight is None:
        return float(np.quantile(vals, q))

    weights = np.asarray(sample_weight, dtype=float)
    mask = np.isfinite(vals) & np.isfinite(weights) & (weights >= 0)
    if not np.any(mask):
        return float(np.quantile(vals, q))

    vals = vals[mask]
    weights = weights[mask]
    if np.sum(weights) <= 0:
        return float(np.quantile(vals, q))

    order = np.argsort(vals)
    vals = vals[order]
    weights = weights[order]
    cdf = np.cumsum(weights)
    cutoff = q * cdf[-1]
    return float(np.interp(cutoff, cdf, vals))


def train_quantile_model(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    alpha: float,
    params: dict,
    sample_weight: pd.Series | None = None,
) -> lgb.LGBMRegressor:
    """Train a single quantile regression model."""
    model = lgb.LGBMRegressor(
        objective="quantile",
        alpha=alpha,
        num_leaves=params["num_leaves"],
        learning_rate=params["learning_rate"],
        min_child_samples=params["min_child_samples"],
        n_estimators=params["n_estimators"],
        reg_alpha=params.get("reg_alpha", 0.0),
        reg_lambda=params.get("reg_lambda", 0.0),
        random_state=42,
        verbose=-1,
    )
    fit_kwargs = {}
    if sample_weight is not None:
        fit_kwargs["sample_weight"] = sample_weight.values
    model.fit(X_train, y_train, **fit_kwargs)
    return model


def quantile_loss(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    alpha: float,
    sample_weight: np.ndarray | None = None,
) -> float:
    """Pinball (quantile) loss with optional sample weighting."""
    residuals = y_true - y_pred
    losses = np.where(residuals >= 0, alpha * residuals, (alpha - 1) * residuals)
    if sample_weight is None:
        return float(np.mean(losses))
    return weighted_mean(losses, sample_weight)


def cv_evaluate(
    X: pd.DataFrame,
    y: pd.Series,
    sample_weight: pd.Series,
    alpha: float,
    params: dict,
    n_folds: int = 5,
) -> float:
    """5-fold CV evaluation of a quantile model, returns weighted pinball loss."""
    strat_bins = create_stratification_bins(y)
    kf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)

    losses = []
    for train_idx, val_idx in kf.split(X, strat_bins):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]
        w_tr, w_val = sample_weight.iloc[train_idx], sample_weight.iloc[val_idx]

        model = train_quantile_model(X_tr, y_tr, alpha, params, w_tr)
        preds = model.predict(X_val)
        loss = quantile_loss(y_val.values, preds, alpha, w_val.values)
        losses.append(loss)

    return float(np.mean(losses))


def search_hyperparams(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    sample_weight: pd.Series,
    alpha: float,
) -> dict:
    """Grid search for best hyperparameters for a given quantile."""
    param_keys = list(HYPERPARAM_GRID.keys())
    param_values = list(HYPERPARAM_GRID.values())

    best_loss = float("inf")
    best_params = None

    combos = list(product(*param_values))
    print(f"  Searching {len(combos)} parameter combinations for alpha={alpha}...")

    for combo in combos:
        params = dict(zip(param_keys, combo))
        try:
            loss = cv_evaluate(X_train, y_train, sample_weight, alpha, params)
            if loss < best_loss:
                best_loss = loss
                best_params = params.copy()
        except Exception:
            continue

    if best_params is None:
        raise RuntimeError(f"No valid parameter combination found for alpha={alpha}")

    print(f"  Best params: {best_params}, loss: {best_loss:.4f}")
    return best_params


def enforce_monotonicity(predictions: np.ndarray) -> np.ndarray:
    """Enforce quantile monotonicity: q05 <= q25 <= q50 <= q75 <= q95."""
    n_samples, _ = predictions.shape
    n_fixed = 0
    for i in range(n_samples):
        original = predictions[i].copy()
        predictions[i] = np.sort(predictions[i])
        if not np.allclose(original, predictions[i]):
            n_fixed += 1
    if n_fixed > 0:
        print(f"  Fixed quantile crossing in {n_fixed}/{n_samples} samples")
    return predictions


def cycle_start_year(cycle: str) -> int:
    try:
        return int(str(cycle).split("-")[0])
    except Exception:
        return 0


def temporal_validation(
    df: pd.DataFrame,
    best_params_all: dict,
) -> dict:
    """Train on earlier cycles and evaluate on later cycles."""
    cycles_sorted = sorted(df["cycle"].dropna().unique().tolist(), key=cycle_start_year)
    if len(cycles_sorted) < 4:
        return {}

    n_holdout = max(2, len(cycles_sorted) // 3)
    train_cycles = cycles_sorted[:-n_holdout]
    test_cycles = cycles_sorted[-n_holdout:]

    train_df = df[df["cycle"].isin(train_cycles)].copy()
    test_df = df[df["cycle"].isin(test_cycles)].copy()
    if len(train_df) == 0 or len(test_df) == 0:
        return {}

    X_train = train_df[FEATURE_NAMES]
    y_train = train_df[TARGET]
    w_train = train_df[WEIGHT_COLUMN]
    X_test = test_df[FEATURE_NAMES]
    y_test = test_df[TARGET]
    w_test = test_df[WEIGHT_COLUMN].values

    temporal_models = {}
    for alpha in QUANTILES:
        params = best_params_all[str(alpha)]
        temporal_models[alpha] = train_quantile_model(
            X_train,
            y_train,
            alpha,
            params,
            w_train,
        )

    preds = np.column_stack([
        temporal_models[alpha].predict(X_test) for alpha in QUANTILES
    ])
    preds = enforce_monotonicity(preds)

    per_quantile_loss = {}
    for idx, alpha in enumerate(QUANTILES):
        per_quantile_loss[f"q{int(alpha*100):02d}"] = round(
            quantile_loss(y_test.values, preds[:, idx], alpha, w_test),
            4,
        )

    pi90 = weighted_mean(
        ((y_test.values >= preds[:, 0]) & (y_test.values <= preds[:, 4])).astype(float),
        w_test,
    )
    pi50 = weighted_mean(
        ((y_test.values >= preds[:, 1]) & (y_test.values <= preds[:, 3])).astype(float),
        w_test,
    )

    return {
        "train_cycles": train_cycles,
        "test_cycles": test_cycles,
        "per_quantile_pinball_loss": per_quantile_loss,
        "interval_coverage": {
            "pi90": round(pi90, 3),
            "pi50": round(pi50, 3),
        },
    }


def derive_conformal_adjustments(
    y_true: np.ndarray,
    preds: np.ndarray,
    sample_weight: np.ndarray,
) -> dict:
    """Derive asymmetric PI90 widening adjustments from held-out residuals."""
    lower_errors = np.maximum(0, preds[:, 0] - y_true)
    upper_errors = np.maximum(0, y_true - preds[:, 4])
    return {
        "pi90": {
            "lower": round(weighted_quantile(lower_errors, 0.90, sample_weight), 3),
            "upper": round(weighted_quantile(upper_errors, 0.90, sample_weight), 3),
        }
    }


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    input_path = os.path.join(PROCESSED_DIR, "analytical_dataset.parquet")
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_parquet(input_path)
    print(f"Loaded {len(df)} records")

    X = df[FEATURE_NAMES]
    y = df[TARGET]
    if WEIGHT_COLUMN in df.columns:
        sample_weight = pd.to_numeric(df[WEIGHT_COLUMN], errors="coerce").fillna(0).clip(lower=0)
    else:
        sample_weight = pd.Series(1.0, index=df.index, dtype=float)
    cycles = df["cycle"].astype(str)

    # Stratified random train/test split
    strat_bins = create_stratification_bins(y)
    (
        X_train,
        X_test,
        y_train,
        y_test,
        w_train,
        w_test,
        cycle_train,
        cycle_test,
    ) = train_test_split(
        X,
        y,
        sample_weight,
        cycles,
        test_size=0.2,
        random_state=42,
        stratify=strat_bins,
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # Save test set for evaluation/export
    test_df = X_test.copy()
    test_df[TARGET] = y_test.values
    test_df[WEIGHT_COLUMN] = w_test.values
    test_df["cycle"] = cycle_test.values
    test_df.to_parquet(os.path.join(MODELS_DIR, "test_set.parquet"), index=False)

    # Train models for each quantile
    models = {}
    best_params_all = {}

    for alpha in QUANTILES:
        print(f"\n=== Training quantile model for alpha={alpha} ===")
        best_params = search_hyperparams(X_train, y_train, w_train, alpha)
        best_params_all[str(alpha)] = best_params

        model = train_quantile_model(X_train, y_train, alpha, best_params, w_train)
        models[alpha] = model

        train_preds = model.predict(X_train)
        train_loss = quantile_loss(y_train.values, train_preds, alpha, w_train.values)
        print(f"  Final weighted training loss: {train_loss:.4f}")

    # Test predictions and monotonicity enforcement
    test_preds = np.column_stack([
        models[alpha].predict(X_test) for alpha in QUANTILES
    ])
    test_preds = enforce_monotonicity(test_preds)

    random_split_coverage = {
        "pi90": round(
            weighted_mean(
                ((y_test.values >= test_preds[:, 0]) & (y_test.values <= test_preds[:, 4])).astype(float),
                w_test.values,
            ),
            3,
        ),
        "pi50": round(
            weighted_mean(
                ((y_test.values >= test_preds[:, 1]) & (y_test.values <= test_preds[:, 3])).astype(float),
                w_test.values,
            ),
            3,
        ),
    }

    conformal_adjustments = derive_conformal_adjustments(
        y_test.values,
        test_preds,
        w_test.values,
    )

    temporal_results = temporal_validation(df, best_params_all)

    # Save models
    for alpha in QUANTILES:
        model_path = os.path.join(MODELS_DIR, f"lgbm_q{int(alpha*100):02d}.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(models[alpha], f)
        print(f"Saved model: {model_path}")

    # Save metadata
    meta = {
        "quantiles": QUANTILES,
        "feature_names": FEATURE_NAMES,
        "best_params": best_params_all,
        "n_train": len(X_train),
        "n_test": len(X_test),
        "train_y_stats": {
            "mean": float(y_train.mean()),
            "std": float(y_train.std()),
            "min": float(y_train.min()),
            "max": float(y_train.max()),
        },
        "random_split_interval_coverage": random_split_coverage,
        "conformal_adjustments": conformal_adjustments,
        "temporal_validation": temporal_results,
    }
    meta_path = os.path.join(MODELS_DIR, "training_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"\nSaved metadata: {meta_path}")


if __name__ == "__main__":
    main()
