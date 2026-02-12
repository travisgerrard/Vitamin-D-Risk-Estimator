"""
Step 1: Download NHANES XPT files from CDC for cycles 2001-2018.

Downloads demographics, body measures, vitamin D, and supplement tables.
Applies Sempos et al. crosswalk for pre-2007 RIA assay values.
Converts nmol/L → ng/mL.
"""

import os
import sys
import pandas as pd
import numpy as np
import requests
from io import BytesIO
from config import (
    NHANES_CYCLES, RAW_DIR, RIA_CYCLES, SEMPOS_CROSSWALK,
    NMOL_TO_NGML, VID_VARNAMES, SUPP_VARNAMES
)


def download_xpt(url: str) -> pd.DataFrame:
    """Download and read an XPT (SAS transport) file from a URL."""
    print(f"  Downloading {url}...")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    return pd.read_sas(BytesIO(resp.content), format="xport")


def apply_sempos_crosswalk(values: pd.Series) -> pd.Series:
    """Apply Sempos et al. crosswalk to convert DiaSorin RIA → LC-MS/MS equivalent.

    Input values should be in nmol/L.
    Returns standardized values in nmol/L.
    """
    a = SEMPOS_CROSSWALK["intercept"]
    b = SEMPOS_CROSSWALK["slope"]
    c = SEMPOS_CROSSWALK["quadratic"]
    return a + b * values + c * values ** 2


def process_cycle(cycle: str, urls: dict) -> pd.DataFrame:
    """Download and minimally process one NHANES cycle."""
    print(f"\nProcessing cycle {cycle}...")

    # Download all tables
    demo = download_xpt(urls["DEMO"])
    bmx = download_xpt(urls["BMX"])
    vid = download_xpt(urls["VID"])
    ds1 = download_xpt(urls["DS1TOT"])

    # Extract key variables from DEMO
    demo_cols = ["SEQN", "RIDAGEYR", "RIAGENDR", "RIDRETH1", "RIDEXMON"]
    if "WTMEC2YR" in demo.columns:
        demo_cols.append("WTMEC2YR")
    # Add pregnancy status if available
    if "RIDEXPRG" in demo.columns:
        demo_cols.append("RIDEXPRG")
    demo = demo[demo_cols].copy()

    # Extract BMI from BMX
    bmx = bmx[["SEQN", "BMXBMI"]].copy()

    # Extract vitamin D
    vid_var = VID_VARNAMES[cycle]
    vid_cols = ["SEQN"]
    if vid_var in vid.columns:
        vid_cols.append(vid_var)
    vid = vid[vid_cols].copy()

    # Extract supplement vitamin D
    supp_var = SUPP_VARNAMES[cycle]
    ds1_cols = ["SEQN"]
    if supp_var is not None and supp_var in ds1.columns:
        ds1_cols.append(supp_var)
    ds1 = ds1[ds1_cols].copy()

    # Merge all on SEQN
    df = demo.merge(bmx, on="SEQN", how="left")
    df = df.merge(vid, on="SEQN", how="left")
    df = df.merge(ds1, on="SEQN", how="left")

    # Rename columns to standardized names
    rename_map = {
        "RIDAGEYR": "age",
        "RIAGENDR": "sex",
        "RIDRETH1": "race_eth_raw",
        "RIDEXMON": "exam_season_raw",
        "BMXBMI": "bmi",
        "WTMEC2YR": "sample_weight_raw",
    }
    if vid_var in df.columns:
        rename_map[vid_var] = "vitd_nmol"
    if supp_var is not None and supp_var in df.columns:
        rename_map[supp_var] = "supp_vitd_mcg"
    if "RIDEXPRG" in df.columns:
        rename_map["RIDEXPRG"] = "pregnant"

    df = df.rename(columns=rename_map)

    # Apply Sempos crosswalk for pre-2007 RIA cycles
    if cycle in RIA_CYCLES and "vitd_nmol" in df.columns:
        print(f"  Applying Sempos crosswalk for RIA cycle {cycle}")
        mask = df["vitd_nmol"].notna()
        df.loc[mask, "vitd_nmol"] = apply_sempos_crosswalk(df.loc[mask, "vitd_nmol"])

    # Convert nmol/L → ng/mL
    if "vitd_nmol" in df.columns:
        df["vitd_ng"] = df["vitd_nmol"] / NMOL_TO_NGML

    # Convert supplement mcg → IU (1 mcg = 40 IU)
    if "supp_vitd_mcg" in df.columns:
        df["supp_vitd_iu"] = df["supp_vitd_mcg"] * 40

    df["cycle"] = cycle

    print(f"  {len(df)} records from {cycle}")
    return df


def main():
    os.makedirs(RAW_DIR, exist_ok=True)

    all_dfs = []
    for cycle, urls in NHANES_CYCLES.items():
        try:
            df = process_cycle(cycle, urls)
            all_dfs.append(df)
        except Exception as e:
            print(f"  ERROR processing {cycle}: {e}", file=sys.stderr)
            continue

    if not all_dfs:
        print("No data downloaded!", file=sys.stderr)
        sys.exit(1)

    combined = pd.concat(all_dfs, ignore_index=True)

    output_path = os.path.join(RAW_DIR, "nhanes_combined_raw.parquet")
    combined.to_parquet(output_path, index=False)
    print(f"\nSaved {len(combined)} total records to {output_path}")
    print(f"Columns: {list(combined.columns)}")
    print(f"Cycles: {combined['cycle'].value_counts().to_dict()}")


if __name__ == "__main__":
    main()
