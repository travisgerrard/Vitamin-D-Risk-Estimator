import type { CounselingResult } from '../types';

interface Props {
  counseling: CounselingResult;
}

const ZONE_STYLES = {
  low: {
    border: 'border-green-300',
    bg: 'bg-green-50',
    icon: 'text-green-600',
    headlineBg: 'bg-green-100',
    headlineText: 'text-green-800',
    iconSymbol: '\u2714', // checkmark
  },
  uncertain: {
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    headlineBg: 'bg-amber-100',
    headlineText: 'text-amber-800',
    iconSymbol: '?',
  },
  high: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    icon: 'text-red-600',
    headlineBg: 'bg-red-100',
    headlineText: 'text-red-800',
    iconSymbol: '!',
  },
} as const;

export function CounselingCard({ counseling }: Props) {
  const style = ZONE_STYLES[counseling.zone];

  return (
    <div className={`rounded-xl border-2 ${style.border} ${style.bg} p-4 sm:p-6`}>
      {/* Headline */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-full ${style.headlineBg} flex items-center justify-center text-lg font-bold ${style.icon}`}
          aria-hidden="true"
        >
          {style.iconSymbol}
        </div>
        <h3 className={`text-lg font-bold ${style.headlineText}`}>
          {counseling.headline}
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
        {counseling.description}
      </p>

      {/* Recommendation */}
      <div className="bg-white/60 rounded-lg p-3 border border-white">
        <p className="text-sm font-medium text-gray-800">
          {counseling.recommendation}
        </p>
      </div>

      {/* Warnings */}
      {(counseling.wideIntervalWarning || counseling.sparseDataWarning) && (
        <div className="mt-3 space-y-1.5">
          {counseling.wideIntervalWarning && (
            <p className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-amber-500 mt-0.5" aria-hidden="true">*</span>
              <span>
                The prediction interval for your profile is wider than average,
                indicating more uncertainty in this estimate.
              </span>
            </p>
          )}
          {counseling.sparseDataWarning && (
            <p className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-amber-500 mt-0.5" aria-hidden="true">*</span>
              <span>
                Limited training data was available for your demographic combination.
                This estimate may be less reliable.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
