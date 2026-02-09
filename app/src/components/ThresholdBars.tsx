import type { ThresholdProbabilities } from '../types';

interface Props {
  thresholds: ThresholdProbabilities;
}

export function ThresholdBars({ thresholds }: Props) {
  const bars = [
    {
      label: 'P(< 12 ng/mL)',
      sublabel: 'Severe deficiency',
      value: thresholds.pBelow12,
      color: 'bg-red-500',
      bgColor: 'bg-red-100',
    },
    {
      label: 'P(< 20 ng/mL)',
      sublabel: 'Deficiency',
      value: thresholds.pBelow20,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-100',
    },
    {
      label: 'P(< 30 ng/mL)',
      sublabel: 'Insufficiency',
      value: thresholds.pBelow30,
      color: 'bg-yellow-400',
      bgColor: 'bg-yellow-100',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Threshold Probabilities
      </h3>

      <div className="space-y-4">
        {bars.map(bar => (
          <div key={bar.label}>
            <div className="flex justify-between items-baseline mb-1">
              <div>
                <span className="text-sm font-medium text-gray-700">{bar.label}</span>
                <span className="text-xs text-gray-500 ml-2">{bar.sublabel}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {Math.round(bar.value * 100)}%
              </span>
            </div>
            <div
              className={`h-3 rounded-full ${bar.bgColor} overflow-hidden`}
              role="progressbar"
              aria-valuenow={Math.round(bar.value * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${bar.label}: ${Math.round(bar.value * 100)}%`}
            >
              <div
                className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                style={{ width: `${Math.max(2, bar.value * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
