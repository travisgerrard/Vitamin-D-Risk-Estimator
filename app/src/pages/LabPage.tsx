import { Link } from 'react-router-dom';

export function LabPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        You May Not Need a Vitamin D Blood Test
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        This tool is designed to be a free, instant alternative to a vitamin D lab test
        that could cost you $25 to $300+ depending on your insurance, facility, and whether
        it's bundled with other labs.
      </p>

      <div className="space-y-6">
        {/* Value proposition */}
        <section className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h2 className="text-base font-semibold text-amber-900 mb-2">
            Why This Tool May Be Enough
          </h2>
          <div className="text-sm text-amber-900 space-y-2">
            <p>
              For most people, the decision is straightforward: either you likely have enough
              vitamin D, or you'd benefit from a modest daily supplement. In both cases, a
              blood test may not change what you'd do.
            </p>
            <p>
              A vitamin D supplement costs a few dollars per month. Compare that to the
              uncertainty, expense, and inconvenience of scheduling a lab draw, waiting for
              results, and potentially repeating the test seasonally.
            </p>
            <p>
              If the estimator shows you're likely sufficient, you can feel confident continuing
              as-is. If it shows you're likely deficient, starting a standard supplement dose
              (1,000-2,000 IU/day) is safe, inexpensive, and what most providers would
              recommend anyway.
            </p>
          </div>
        </section>

        {/* When a lab makes sense */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            When a Lab Test Does Make Sense
          </h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p>There are specific situations where a blood test adds real value:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You have a <strong>health condition</strong> that depends on knowing your exact
                vitamin D level (e.g., osteoporosis, malabsorption syndromes, kidney disease)</li>
              <li>You're taking <strong>high-dose supplementation</strong> (&gt;2,000 IU/day)
                and your provider wants to monitor levels</li>
              <li>You've been supplementing and want to <strong>verify your response</strong></li>
              <li>Your estimated risk falls in the <strong>uncertain range</strong> and the
                result would genuinely change your plan</li>
            </ul>
          </div>
        </section>

        {/* Understanding Your Lab Result */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Understanding Your Lab Result
          </h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p>If you do get tested, the standard test is <strong>serum 25-hydroxyvitamin D
              [25(OH)D]</strong>. It's a simple blood draw, no fasting required. Results are
              reported in ng/mL (US) or nmol/L (international).</p>
            <p>
              <strong>Regression to the mean:</strong> A single lab value is a snapshot.
              Vitamin D levels naturally fluctuate by 5-10 ng/mL due to recent sun exposure,
              diet, and biological variability. A single low reading doesn't necessarily
              indicate chronic deficiency.
            </p>
          </div>
          <div className="space-y-2 mt-3">
            {[
              { range: '< 12 ng/mL', label: 'Severe deficiency', color: 'bg-red-100 text-red-800 border-red-200' },
              { range: '12-19 ng/mL', label: 'Deficiency', color: 'bg-red-50 text-red-700 border-red-200' },
              { range: '20-29 ng/mL', label: 'Adequate for most people (Institute of Medicine, IOM)', color: 'bg-green-50 text-green-700 border-green-200' },
              { range: '30-50 ng/mL', label: 'Sufficient by all guidelines', color: 'bg-green-100 text-green-800 border-green-200' },
              { range: '> 50 ng/mL', label: 'May be excessive', color: 'bg-gray-50 text-gray-700 border-gray-200' },
            ].map(level => (
              <div key={level.range} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${level.color}`}>
                <span className="font-mono text-xs font-bold w-24 shrink-0">{level.range}</span>
                <span className="text-sm">{level.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The Institute of Medicine (IOM) considers 20 ng/mL adequate for 97.5% of the population. The Endocrine Society
            uses 30 ng/mL as a target, but this higher threshold is debated for the general population.
          </p>
        </section>

      </div>

      {/* Back link */}
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="flex-1 text-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition text-sm no-underline"
        >
          New Estimate
        </Link>
        <Link
          to="/results"
          className="flex-1 text-center bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg transition text-sm no-underline"
        >
          View Results
        </Link>
      </div>
    </div>
  );
}
