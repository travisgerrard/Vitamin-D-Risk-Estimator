"""
Step 2: Clean NHANES data and create analytical dataset.

Filters: age >= 18, non-pregnant, non-missing vitD.
Encodes features for model training.
"""

import os
import sys
import pandas as pd
import numpy as np
from config import (
    RAW_DIR, PROCESSED_DIR, RACE_ETH_MAP, SEX_MAP, SEASON_MAP,
    SUPPLEMENT_BINS, SUPPLEMENT_LABELS, FEATURE_NAMES, TARGET, WEIGHT_COLUMN
)


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Apply inclusion/exclusion criteria and clean data."""
    n_start = len(df)
    print(f"Starting records: {n_start}")

    # Age >= 18
    df = df[df["age"] >= 18].copy()
    print(f"After age >= 18 filter: {len(df)} ({n_start - len(df)} removed)")

    # Exclude pregnant (RIDEXPRG == 1 means pregnant)
    if "pregnant" in df.columns:
        n_before = len(df)
        df = df[~(df["pregnant"] == 1)].copy()
        print(f"After excluding pregnant: {len(df)} ({n_before - len(df)} removed)")

    # Non-missing vitamin D
    n_before = len(df)
    df = df[df["vitd_ng"].notna()].copy()
    print(f"After non-missing vitD: {len(df)} ({n_before - len(df)} removed)")

    # Non-missing BMI
    n_before = len(df)
    df = df[df["bmi"].notna()].copy()
    print(f"After non-missing BMI: {len(df)} ({n_before - len(df)} removed)")

    # Plausible ranges
    n_before = len(df)
    df = df[(df["vitd_ng"] > 0) & (df["vitd_ng"] < 200)].copy()
    print(f"After vitD range filter (0-200): {len(df)} ({n_before - len(df)} removed)")

    n_before = len(df)
    df = df[(df["bmi"] >= 10) & (df["bmi"] <= 80)].copy()
    print(f"After BMI range filter (10-80): {len(df)} ({n_before - len(df)} removed)")

    return df


def encode_features(df: pd.DataFrame) -> pd.DataFrame:
    """Encode categorical features for model training."""
    # Race/ethnicity encoding
    df["race_eth"] = df["race_eth_raw"].map(RACE_ETH_MAP)
    n_missing = df["race_eth"].isna().sum()
    if n_missing > 0:
        print(f"Warning: {n_missing} records with unmapped race_eth, dropping")
        df = df[df["race_eth"].notna()].copy()
    df["race_eth"] = df["race_eth"].astype(int)

    # Sex encoding
    df["sex"] = df["sex"].map(SEX_MAP)
    df = df[df["sex"].notna()].copy()
    df["sex"] = df["sex"].astype(int)

    # Exam season encoding
    df["exam_season"] = df["exam_season_raw"].map(SEASON_MAP)
    # Fill missing season with winter (conservative)
    df["exam_season"] = df["exam_season"].fillna(1).astype(int)

    # Supplement category (ordinal from dose bins)
    if "supp_vitd_iu" in df.columns:
        df["supplement_cat"] = pd.cut(
            df["supp_vitd_iu"].fillna(0),
            bins=SUPPLEMENT_BINS,
            labels=SUPPLEMENT_LABELS,
            right=False,
            include_lowest=True,
        ).astype(int)
    else:
        df["supplement_cat"] = 0

    return df


def add_sample_weights(df: pd.DataFrame) -> pd.DataFrame:
    """Create pooled NHANES exam weights for multi-cycle analysis."""
    if "sample_weight_raw" in df.columns:
        raw = pd.to_numeric(df["sample_weight_raw"], errors="coerce")
        fallback = float(raw.dropna().median()) if raw.notna().any() else 1.0
        raw = raw.fillna(fallback)
        raw = raw.clip(lower=0)
    else:
        raw = pd.Series(1.0, index=df.index, dtype=float)

    n_cycles = max(1, df["cycle"].nunique())
    df[WEIGHT_COLUMN] = (raw / n_cycles).astype(float)
    return df


def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    input_path = os.path.join(RAW_DIR, "nhanes_combined_raw.parquet")
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}", file=sys.stderr)
        print("Run 01_download_nhanes.py first.", file=sys.stderr)
        sys.exit(1)

    df = pd.read_parquet(input_path)
    print(f"Loaded {len(df)} raw records")

    # Clean
    df = clean_data(df)

    # Encode features
    df = encode_features(df)
    df = add_sample_weights(df)

    # Select final columns
    keep_cols = ["SEQN", "cycle"] + FEATURE_NAMES + [TARGET, WEIGHT_COLUMN]
    # Also keep raw vitd_ng for analysis
    final = df[keep_cols].copy()

    # Summary stats
    print(f"\n--- Final dataset ---")
    print(f"Records: {len(final)}")
    print(f"Cycles: {final['cycle'].value_counts().sort_index().to_dict()}")
    print(f"\nFeature distributions:")
    for feat in FEATURE_NAMES:
        print(f"  {feat}: mean={final[feat].mean():.2f}, std={final[feat].std():.2f}")
    print(f"  {TARGET}: mean={final[TARGET].mean():.2f}, std={final[TARGET].std():.2f}")
    print(f"\nRace/eth distribution:")
    print(final["race_eth"].value_counts().sort_index())

    output_path = os.path.join(PROCESSED_DIR, "analytical_dataset.parquet")
    final.to_parquet(output_path, index=False)
    print(f"\nSaved to {output_path}")


if __name__ == "__main__":
    main()
