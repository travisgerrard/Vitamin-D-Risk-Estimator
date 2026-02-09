"""Configuration for NHANES Vitamin D training pipeline."""

import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
MODELS_DIR = os.path.join(DATA_DIR, "models")
REPORTS_DIR = os.path.join(DATA_DIR, "reports")

# NHANES cycles and their XPT file URLs
# Tables needed: DEMO (demographics), BMX (body measures), VID (vitamin D), DS1TOT (supplements)
_BASE = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public"

NHANES_CYCLES = {
    "2001-2002": {
        "DEMO": f"{_BASE}/2001/DataFiles/DEMO_B.XPT",
        "BMX": f"{_BASE}/2001/DataFiles/BMX_B.XPT",
        "VID": f"{_BASE}/2001/DataFiles/L06VID_B.XPT",
        "DS1TOT": f"{_BASE}/2001/DataFiles/DSQ1_B.XPT",
    },
    "2003-2004": {
        "DEMO": f"{_BASE}/2003/DataFiles/DEMO_C.XPT",
        "BMX": f"{_BASE}/2003/DataFiles/BMX_C.XPT",
        "VID": f"{_BASE}/2003/DataFiles/L06VID_C.XPT",
        "DS1TOT": f"{_BASE}/2003/DataFiles/DSQ1_C.XPT",
    },
    "2005-2006": {
        "DEMO": f"{_BASE}/2005/DataFiles/DEMO_D.XPT",
        "BMX": f"{_BASE}/2005/DataFiles/BMX_D.XPT",
        "VID": f"{_BASE}/2005/DataFiles/VID_D.XPT",
        "DS1TOT": f"{_BASE}/2005/DataFiles/DSQ1_D.XPT",
    },
    "2007-2008": {
        "DEMO": f"{_BASE}/2007/DataFiles/DEMO_E.XPT",
        "BMX": f"{_BASE}/2007/DataFiles/BMX_E.XPT",
        "VID": f"{_BASE}/2007/DataFiles/VID_E.XPT",
        "DS1TOT": f"{_BASE}/2007/DataFiles/DS1TOT_E.XPT",
    },
    "2009-2010": {
        "DEMO": f"{_BASE}/2009/DataFiles/DEMO_F.XPT",
        "BMX": f"{_BASE}/2009/DataFiles/BMX_F.XPT",
        "VID": f"{_BASE}/2009/DataFiles/VID_F.XPT",
        "DS1TOT": f"{_BASE}/2009/DataFiles/DS1TOT_F.XPT",
    },
    "2011-2012": {
        "DEMO": f"{_BASE}/2011/DataFiles/DEMO_G.XPT",
        "BMX": f"{_BASE}/2011/DataFiles/BMX_G.XPT",
        "VID": f"{_BASE}/2011/DataFiles/VID_G.XPT",
        "DS1TOT": f"{_BASE}/2011/DataFiles/DS1TOT_G.XPT",
    },
    "2013-2014": {
        "DEMO": f"{_BASE}/2013/DataFiles/DEMO_H.XPT",
        "BMX": f"{_BASE}/2013/DataFiles/BMX_H.XPT",
        "VID": f"{_BASE}/2013/DataFiles/VID_H.XPT",
        "DS1TOT": f"{_BASE}/2013/DataFiles/DS1TOT_H.XPT",
    },
    "2015-2016": {
        "DEMO": f"{_BASE}/2015/DataFiles/DEMO_I.XPT",
        "BMX": f"{_BASE}/2015/DataFiles/BMX_I.XPT",
        "VID": f"{_BASE}/2015/DataFiles/VID_I.XPT",
        "DS1TOT": f"{_BASE}/2015/DataFiles/DS1TOT_I.XPT",
    },
    "2017-2018": {
        "DEMO": f"{_BASE}/2017/DataFiles/DEMO_J.XPT",
        "BMX": f"{_BASE}/2017/DataFiles/BMX_J.XPT",
        "VID": f"{_BASE}/2017/DataFiles/VID_J.XPT",
        "DS1TOT": f"{_BASE}/2017/DataFiles/DS1TOT_J.XPT",
    },
}

# Sempos et al. crosswalk: cycles using RIA assay that need conversion to LC-MS/MS equivalent
# Pre-2007 cycles used DiaSorin RIA; 2007+ used standardized LC-MS/MS (VDSP)
RIA_CYCLES = ["2001-2002", "2003-2004", "2005-2006"]

# Sempos crosswalk equation: LC-MS/MS = a + b * RIA + c * RIA^2
# Coefficients from Sempos et al. 2013 (simplified linear approximation)
# For DiaSorin RIA → standardized LC-MS/MS
SEMPOS_CROSSWALK = {
    "intercept": 3.6589,
    "slope": 0.7932,
    "quadratic": 0.001433,
}

# nmol/L to ng/mL conversion factor
NMOL_TO_NGML = 2.496

# Feature names for model
FEATURE_NAMES = ["age", "sex", "bmi", "race_eth", "exam_season", "supplement_cat"]
TARGET = "vitd_ng"

# Race/ethnicity coding (NHANES RIDRETH1 → integer)
RACE_ETH_MAP = {
    1: 0,  # Mexican American
    2: 1,  # Other Hispanic
    3: 2,  # Non-Hispanic White
    4: 3,  # Non-Hispanic Black
    5: 4,  # Other/Multi-racial
}

# Sex coding (NHANES RIAGENDR)
SEX_MAP = {
    1: 0,  # Male
    2: 1,  # Female
}

# Exam season: based on 6-month period of exam date (RIDEXMON)
# 1 = November-April (winter), 2 = May-October (summer)
SEASON_MAP = {
    1: 1,  # Nov-Apr → winter
    2: 2,  # May-Oct → summer
}

# Supplement dose bins → ordinal categories
# Based on total daily vitamin D intake from supplements (IU)
SUPPLEMENT_BINS = [0, 1, 400, 1000, 2000, float("inf")]
SUPPLEMENT_LABELS = [0, 1, 2, 3, 4]  # none, trace, low, moderate, high

# Quantile levels for training
QUANTILES = [0.05, 0.25, 0.50, 0.75, 0.95]

# Model hyperparameter search space
HYPERPARAM_GRID = {
    "num_leaves": [31, 63],
    "learning_rate": [0.05, 0.1],
    "min_child_samples": [20, 50],
    "n_estimators": [300],
    "reg_alpha": [0.0],
    "reg_lambda": [0.0, 1.0],
}

# Clinical thresholds (ng/mL)
THRESHOLDS = {
    "severe_deficiency": 12,
    "deficiency": 20,
    "insufficiency": 30,
}

# Vitamin D variable names across NHANES cycles
# These vary by cycle - the download script handles the mapping
VID_VARNAMES = {
    "2001-2002": "LBXVID",    # 25OHD in nmol/L (RIA, DiaSorin)
    "2003-2004": "LBDVID",    # 25OHD in nmol/L (RIA, DiaSorin)
    "2005-2006": "LBDVIDMS",  # 25OHD in nmol/L (RIA, DiaSorin)
    "2007-2008": "LBXVIDMS",  # Standardized LC-MS/MS (VDSP)
    "2009-2010": "LBXVIDMS",
    "2011-2012": "LBXVIDMS",
    "2013-2014": "LBXVIDMS",
    "2015-2016": "LBXVIDMS",
    "2017-2018": "LBXVIDMS",
}

# Supplement variable: total daily vitamin D from supplements (mcg)
# Convert mcg → IU: multiply by 40
SUPP_VARNAMES = {
    "2001-2002": None,     # DSQ1_B lacks individual nutrient totals
    "2003-2004": None,     # DSQ1_C lacks individual nutrient totals
    "2005-2006": None,     # DSQ1_D lacks individual nutrient totals
    "2007-2008": "DS1TVD",
    "2009-2010": "DS1TVD",
    "2011-2012": "DS1TVD",
    "2013-2014": "DS1TVD",
    "2015-2016": "DS1TVD",
    "2017-2018": "DS1TVD",
}
