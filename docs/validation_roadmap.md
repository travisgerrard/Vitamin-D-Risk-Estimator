# Validation Roadmap

A phased plan for validating the Vitamin D Risk Estimator and studying whether it reduces unnecessary lab ordering.

---

## Phase 1: Technical Validation

**Goal**: Confirm model accuracy against known vitamin D results.

- Run held-out NHANES test set through the deployed ONNX model and compare to Python training outputs (quantile predictions should match within floating-point tolerance).
- Verify calibration: for each quantile (5th, 25th, 50th, 75th, 95th), the fraction of true values below the predicted quantile should match the nominal rate.
- Confirm threshold probabilities (P < 12, P < 20, P < 30 ng/mL) are well-calibrated across demographic subgroups.
- Document any subgroups with sparse training data and wider-than-expected prediction intervals.

**Output**: Technical validation report with calibration plots and subgroup analysis.

---

## Phase 2: Clinical Face Validity

**Goal**: Get clinician feedback on whether the tool's outputs and recommendations make clinical sense.

- Share the tool with 3-5 colleagues (primary care, endocrinology, preventive medicine).
- Collect structured feedback on:
  - Whether the risk zones (low / uncertain / high) align with their clinical intuition for representative patient profiles.
  - Whether the counseling language is appropriate and non-alarmist.
  - Whether the "when to get a lab test" guidance matches their practice patterns.
- Iterate on counseling text and thresholds based on feedback.

**Output**: Summary of clinician feedback and any changes made.

---

## Phase 3: Pilot Study

**Goal**: Measure whether the tool changes lab ordering behavior in a real clinical setting.

- Design a pre/post study at 1-2 primary care clinics.
- **Pre-period** (3-6 months): Measure baseline rate of vitamin D lab orders per patient visit.
- **Intervention**: Introduce the tool to providers and patients. Patients complete the estimator before or during their visit.
- **Post-period** (3-6 months): Measure the rate of vitamin D lab orders per patient visit.
- Track whether patients who use the tool and fall in the "low risk" zone skip the lab test.
- Track whether patients in the "uncertain" or "high risk" zone appropriately get tested.

**Output**: Pre/post comparison of lab ordering rates, patient satisfaction survey.

---

## Phase 4: Key Metrics

**Goal**: Define success criteria for broader adoption.

- **Primary outcome**: Reduction in vitamin D lab orders for patients where the estimator shows clearly low or clearly high risk (target: 20-40% reduction in unnecessary orders).
- **Safety metric**: No increase in missed severe deficiency (< 12 ng/mL) among patients who skip the lab based on the tool.
- **Patient satisfaction**: >80% of patients who use the tool report it was helpful and easy to understand.
- **Provider confidence**: >70% of participating providers say they'd use the tool in routine practice.
- **Cost savings**: Estimated per-patient savings from avoided lab draws (lab cost minus supplement cost for those who start supplementing empirically).

---

## Phase 5: Scale

**Goal**: Expand the tool's reach beyond the pilot.

- Publish the pilot results (even if preliminary) to establish credibility.
- Integrate the tool into EHR workflows (e.g., as a pre-visit questionnaire or point-of-care link).
- Explore partnerships with health systems interested in reducing low-value testing.
- Consider extending the model to other common "screen-then-decide" lab tests where population-level prediction might reduce unnecessary ordering.
- Open-source the training pipeline and model for independent validation by other institutions.
