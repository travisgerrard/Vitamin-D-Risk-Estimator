# Model Card: Vitamin D Deficiency Risk Estimator

## Model Details
- **Model type**: LightGBM quantile regression ensemble
- **Quantiles predicted**: 5th, 25th, 50th, 75th, 95th percentiles
- **Target variable**: Serum 25-hydroxyvitamin D [25(OH)D] in ng/mL
- **Training data**: NHANES 2001-2018 (9 cycles)
- **Assay standardization**: Sempos et al. crosswalk applied to pre-2007 RIA values

## Intended Use
- Patient-facing educational tool for estimating vitamin D deficiency risk
- NOT intended for clinical diagnosis or treatment decisions
- Designed to inform conversations with healthcare providers

## Features
| Feature | Type | Description |
|---------|------|-------------|
| age | Continuous (18-90) | Age in years |
| sex | Binary (0/1) | Male/Female |
| bmi | Continuous (10-80) | Body mass index |
| race_eth | Categorical (0-4) | NHANES race/ethnicity encoding |
| exam_season | Binary (1/2) | Winter (Nov-Apr) / Summer (May-Oct) |
| supplement_cat | Ordinal (0-4) | Vitamin D supplement dose category |

## Limitations
- Trained on US population data; may not generalize to other populations
- Self-reported race/ethnicity is used as a proxy for multiple biological and behavioral factors
- Skin tone → race/ethnicity mapping is an approximation
- Supplement reporting in NHANES may be inaccurate
- Does not account for individual-level UV exposure, diet, or medical conditions
- Subgroups with sparse training data may have unreliable predictions

## Evaluation
- Calibration: Quantile coverage within ±5% of nominal levels
- 90% prediction interval target coverage: 88-92%
- Subgroup analysis identifies groups with <50 test samples

## Ethical Considerations
- Skin tone is collected as a proxy for melanin-mediated UV synthesis, not as a racial classification
- Users are informed about the mapping and its limitations
- No data is stored or transmitted; all inference runs in-browser
