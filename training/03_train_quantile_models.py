"""
Step 3: Train quantile regression models using LightGBM.

Trains models at quantiles [0.05, 0.25, 0.50, 0.75, 0.95].
Uses 5-fold CV hyperparameter search.
Enforces post-hoc quantile monotonicity.
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import StratifiedKFold, train_test_split
from itertools import product
from config import (
    PROCESSED_DIR, MODELS_DIR, FEATURE_NAMES, TARGET,
    QUANTILES, HYPERPARAM_GRID
)


def create_stratification_bins(y: pd.Series, n_bins: int = 10) -> pd.Series:
    """Create bins for stratified splitting on a continuous target."""
    return pd.qcut(y, q=n_bins, labels=False, duplicates="drop")


def train_quantile_model(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    alpha: float,
    params: dict,
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
    model.fit(X_train, y_train)
    return model


def quantile_loss(y_true: np.ndarray, y_pred: np.ndarray, alpha: float) -> float:
    """Pinball (quantile) loss."""
    residuals = y_true - y_pred
    return np.mean(np.where(residuals >= 0, alpha * residuals, (alpha - 1) * residuals))


def cv_evaluate(
    X: pd.DataFrame,
    y: pd.Series,
    alpha: float,
    params: dict,
    n_folds: int = 5,
) -> float:
    """5-fold CV evaluation of a quantile model, returns mean pinball loss."""
    strat_bins = create_stratification_bins(y)
    kf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)

    losses = []
    for train_idx, val_idx in kf.split(X, strat_bins):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = train_quantile_model(X_tr, y_tr, alpha, params)
        preds = model.predict(X_val)
        loss = quantile_loss(y_val.values, preds, alpha)
        losses.append(loss)

    return np.mean(losses)


def search_hyperparams(
    X_train: pd.DataFrame,
    y_train: pd.Series,
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
            loss = cv_evaluate(X_train, y_train, alpha, params)
            if loss < best_loss:
                best_loss = loss
                best_params = params.copy()
        except Exception as e:
            continue

    print(f"  Best params: {best_params}, loss: {best_loss:.4f}")
    return best_params


def enforce_monotonicity(predictions: np.ndarray) -> np.ndarray:
    """Enforce quantile monotonicity: q05 <= q25 <= q50 <= q75 <= q95.

    For each sample, sort predictions if quantile crossing occurs.
    """
    n_samples, n_quantiles = predictions.shape
    n_fixed = 0
    for i in range(n_samples):
        original = predictions[i].copy()
        predictions[i] = np.sort(predictions[i])
        if not np.allclose(original, predictions[i]):
            n_fixed += 1
    if n_fixed > 0:
        print(f"  Fixed quantile crossing in {n_fixed}/{n_samples} samples")
    return predictions


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

    # Stratified train/test split
    strat_bins = create_stratification_bins(y)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=strat_bins
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # Save test set for evaluation
    test_df = pd.concat([X_test, y_test], axis=1)
    test_df.to_parquet(os.path.join(MODELS_DIR, "test_set.parquet"), index=False)

    # Train models for each quantile
    models = {}
    best_params_all = {}

    for alpha in QUANTILES:
        print(f"\n=== Training quantile model for alpha={alpha} ===")
        best_params = search_hyperparams(X_train, y_train, alpha)
        best_params_all[str(alpha)] = best_params

        # Train final model on full training set with best params
        model = train_quantile_model(X_train, y_train, alpha, best_params)
        models[alpha] = model

        # Training loss
        train_preds = model.predict(X_train)
        train_loss = quantile_loss(y_train.values, train_preds, alpha)
        print(f"  Final training loss: {train_loss:.4f}")

    # Test predictions and monotonicity enforcement
    test_preds = np.column_stack([
        models[alpha].predict(X_test) for alpha in QUANTILES
    ])
    test_preds = enforce_monotonicity(test_preds)

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
    }
    meta_path = os.path.join(MODELS_DIR, "training_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"\nSaved metadata: {meta_path}")


if __name__ == "__main__":
    main()
