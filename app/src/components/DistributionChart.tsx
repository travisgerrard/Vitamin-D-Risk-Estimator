import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { InferenceResult } from '../types';
import { THRESHOLDS } from '../data/constants';

interface Props {
  result: InferenceResult;
}

export function DistributionChart({ result }: Props) {
  const { densityPoints } = result.cdf;
  const { q05, q50, q95 } = result.quantiles;

  // Two-zone coloring: below 20 (deficient) vs 20+ (adequate)
  // The 20-30 "insufficient" label is debated; IOM considers 20 adequate for most people
  const chartData = densityPoints.map(p => ({
    x: p.x,
    y: p.y,
    deficient: p.x < THRESHOLDS.DEFICIENCY ? p.y : 0,
    adequate: p.x >= THRESHOLDS.DEFICIENCY ? p.y : 0,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        Estimated Vitamin D Distribution
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Shaded areas show the likelihood of your level falling in each range
      </p>

      <div className="h-56 sm:h-64" role="img" aria-label={`Estimated vitamin D distribution chart. Median: ${Math.round(q50)} ng/mL. 90% prediction interval: ${Math.round(q05)} to ${Math.round(q95)} ng/mL.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={v => `${v}`}
              label={{ value: 'Vitamin D (ng/mL)', position: 'insideBottom', offset: -5, fontSize: 12 }}
              fontSize={11}
            />
            <YAxis hide />
            <Tooltip
              formatter={(value: number | undefined) => [value?.toFixed(4) ?? '', 'Density']}
              labelFormatter={v => `${v} ng/mL`}
            />

            {/* Key threshold line at 20 ng/mL */}
            <ReferenceLine x={THRESHOLDS.DEFICIENCY} stroke="#DC2626" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '20', position: 'top', fontSize: 10 }} />

            {/* Median line */}
            <ReferenceLine x={q50} stroke="#374151" strokeWidth={2} label={{ value: `Median: ${Math.round(q50)}`, position: 'top', fontSize: 11, fontWeight: 600 }} />

            {/* Colored areas: below 20 = concern, 20+ = adequate */}
            <Area type="monotone" dataKey="deficient" fill="#FEE2E2" stroke="none" fillOpacity={0.8} />
            <Area type="monotone" dataKey="adequate" fill="#D1FAE5" stroke="none" fillOpacity={0.8} />

            {/* Overall density outline */}
            <Area type="monotone" dataKey="y" fill="none" stroke="#6B7280" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-200" aria-hidden="true" />
          <span>&lt;20: Deficient</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-200" aria-hidden="true" />
          <span>20+: Adequate (IOM)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-gray-700" aria-hidden="true" />
          <span>Median estimate</span>
        </div>
      </div>

      {/* 90% PI text */}
      <p className="text-xs text-gray-500 mt-2">
        90% prediction interval: {Math.round(q05)} - {Math.round(q95)} ng/mL
      </p>
    </div>
  );
}
