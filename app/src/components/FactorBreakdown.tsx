import type { ModelFeatures } from '../types';
import { SKIN_TONE_MAP } from '../data/skinToneMap';

interface Props {
  features: ModelFeatures;
  uvIndex?: number;
}

export function FactorBreakdown({ features, uvIndex }: Props) {
  const skinTone = SKIN_TONE_MAP.find(s => s.raceEthEncoding === features.race_eth);

  const factors = [
    {
      label: 'Age',
      value: `${features.age} years`,
      impact: features.age > 65 ? 'negative' : features.age < 40 ? 'positive' : 'neutral',
      note: features.age > 65 ? 'Reduced synthesis with age' : undefined,
    },
    {
      label: 'Sex',
      value: features.sex === 0 ? 'Male' : 'Female',
      impact: 'neutral' as const,
    },
    {
      label: 'BMI',
      value: `${features.bmi.toFixed(1)} kg/m\u00B2`,
      impact: features.bmi > 30 ? 'negative' : features.bmi < 25 ? 'positive' : 'neutral',
      note: features.bmi > 30 ? 'Higher BMI associated with lower levels' : undefined,
    },
    {
      label: 'Skin Tone',
      value: skinTone?.label ?? 'Unknown',
      impact: features.race_eth === 3 ? 'negative' : features.race_eth === 2 ? 'positive' : 'neutral',
      note: features.race_eth === 3 ? 'Darker skin reduces UV synthesis' : undefined,
    },
    {
      label: 'Season',
      value: features.exam_season === 1 ? 'Winter (Nov-Apr)' : 'Summer (May-Oct)',
      impact: features.exam_season === 1 ? 'negative' : 'positive',
      note: features.exam_season === 1 ? 'Lower UV in winter months' : undefined,
    },
    {
      label: 'Supplements',
      value: ['None', '<400 IU', '400-999 IU', '1000-1999 IU', '2000+ IU'][features.supplement_cat],
      impact: features.supplement_cat >= 3 ? 'positive' : features.supplement_cat === 0 ? 'neutral' : 'neutral',
    },
  ];

  if (uvIndex !== undefined) {
    factors.push({
      label: 'UV Index',
      value: uvIndex.toFixed(1),
      impact: uvIndex < 3 ? 'negative' : uvIndex >= 5 ? 'positive' : 'neutral',
      note: uvIndex < 3 ? 'Low UV limits skin synthesis' : undefined,
    });
  }

  const impactColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  };

  const impactIcons = {
    positive: '\u2191',
    negative: '\u2193',
    neutral: '\u2013',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-3">
        Factor Breakdown
      </h3>
      <div className="space-y-2.5">
        {factors.map(f => (
          <div key={f.label} className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">{f.label}</span>
              {f.note && (
                <span className="text-xs text-gray-400 ml-2">{f.note}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900">{f.value}</span>
              <span
                className={`text-sm font-bold ${impactColors[f.impact as keyof typeof impactColors]}`}
                aria-label={`Impact: ${f.impact}`}
              >
                {impactIcons[f.impact as keyof typeof impactIcons]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
