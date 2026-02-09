import { Link } from 'react-router-dom';
import type { InferenceResult } from '../types';
import { DistributionChart } from '../components/DistributionChart';
import { ThresholdBars } from '../components/ThresholdBars';
import { CounselingCard } from '../components/CounselingCard';
import { FactorBreakdown } from '../components/FactorBreakdown';

interface Props {
  result: InferenceResult | null;
}

export function ResultsPage({ result }: Props) {
  if (!result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">No Results Yet</h2>
        <p className="text-gray-600 mb-6">
          Enter your information on the input page to get an estimate.
        </p>
        <Link
          to="/"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-6 rounded-lg transition text-sm no-underline"
        >
          Go to Input Page
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Results</h1>
        <p className="text-sm text-gray-500">
          Based on population-level NHANES data. Not a medical diagnosis.
        </p>
      </div>

      {/* Block C: Counseling card (most important, goes first) */}
      <CounselingCard counseling={result.counseling} />

      {/* Block A: Distribution chart */}
      <DistributionChart result={result} />

      {/* Block B: Threshold bars */}
      <ThresholdBars thresholds={result.thresholds} />

      {/* Factor breakdown */}
      <FactorBreakdown features={result.features} uvIndex={result.uvIndex} />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Link
          to="/"
          className="flex-1 text-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition text-sm no-underline"
        >
          Adjust Inputs
        </Link>
        <Link
          to="/lab"
          className="flex-1 text-center bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg transition text-sm no-underline"
        >
          Learn About Lab Testing
        </Link>
      </div>
    </div>
  );
}
