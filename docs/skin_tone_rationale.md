# Skin Tone Mapping Rationale

## Why Skin Tone Instead of Race?

This tool asks users about their skin tone (Fitzpatrick scale 1-6) rather than their
race or ethnicity. The rationale:

1. **Biological relevance**: Melanin content directly affects cutaneous vitamin D synthesis.
   Fitzpatrick scale correlates with melanin density, making it more biologically relevant
   than self-reported race.

2. **User experience**: Asking about skin tone is less presumptuous than asking about race.
   Many people have mixed heritage or don't fit neatly into census categories.

3. **Clinical precedent**: Dermatology routinely uses Fitzpatrick scale for UV-related
   assessments.

## Why Map to NHANES Race/Ethnicity?

The underlying model was trained on NHANES data, which records self-reported race/ethnicity
using the RIDRETH1 variable (5 categories). The model learned patterns associated with these
categories that capture:

- Melanin-mediated UV synthesis differences
- Dietary patterns (e.g., dairy consumption, fish intake)
- Supplement use patterns
- Cultural behaviors affecting sun exposure
- Genetic factors affecting vitamin D metabolism

## The Mapping

| Fitzpatrick | Label | NHANES Encoding | Rationale |
|-------------|-------|-----------------|-----------|
| 1 | Very Fair | NHW (2) | Predominant in NHW population |
| 2 | Fair | NHW (2) | Predominant in NHW population |
| 3 | Medium | Other/Multi (4) | Spans multiple groups |
| 4 | Olive | Other Hispanic (1) | Mediterranean, Latino populations |
| 5 | Brown | Other/Multi (4) | South Asian, SE Asian populations |
| 6 | Dark | NHB (3) | Predominant in NHB population |

## Known Limitations

- This mapping is many-to-one and loses information
- A fair-skinned person of South Asian descent will be mapped to NHW, inheriting
  dietary/behavioral patterns that may not apply
- The model cannot distinguish between melanin effects and other race-associated factors
- Users should understand this is a population-level approximation
