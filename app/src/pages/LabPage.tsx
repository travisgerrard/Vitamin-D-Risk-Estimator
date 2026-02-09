import { Link } from 'react-router-dom';

export function LabPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        If You Want a Lab Test
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Information about vitamin D blood testing to discuss with your healthcare provider.
      </p>

      <div className="space-y-6">
        {/* What to expect */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            What to Expect
          </h2>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
            <li>The standard test is <strong>serum 25-hydroxyvitamin D [25(OH)D]</strong></li>
            <li>It's a simple blood draw, no fasting required</li>
            <li>Results are typically reported in ng/mL (US) or nmol/L (international)</li>
            <li>Cost varies: $20-$75 out of pocket; often covered by insurance when medically indicated</li>
          </ul>
        </section>

        {/* When testing adds value */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            When Testing Adds Value
          </h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p>A blood test is most useful when:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your estimated risk falls in the <strong>uncertain range</strong> (neither clearly low nor clearly high risk)</li>
              <li>You have <strong>specific health conditions</strong> that depend on vitamin D status (e.g., osteoporosis, malabsorption, kidney disease)</li>
              <li>You're considering <strong>high-dose supplementation</strong> (&gt;2000 IU/day) and want to confirm your baseline</li>
              <li>You've been supplementing and want to <strong>verify your response</strong></li>
            </ul>
            <p className="mt-3">
              A test is <strong>less useful</strong> when your risk is clearly low or clearly high, because the management decision (whether to supplement moderately) doesn't change much with a precise number.
            </p>
          </div>
        </section>

        {/* Regression to the mean */}
        <section className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h2 className="text-base font-semibold text-amber-900 mb-2">
            Understanding Your Lab Result
          </h2>
          <div className="text-sm text-amber-900 space-y-2">
            <p>
              <strong>Regression to the mean:</strong> A single lab value is a snapshot.
              Vitamin D levels naturally fluctuate by 5-10 ng/mL due to recent sun exposure,
              diet, and biological variability. If your first test is unusually low (or high),
              a repeat test will often be closer to your true average.
            </p>
            <p>
              This means a single low reading doesn't necessarily indicate chronic deficiency,
              and a single normal reading doesn't guarantee long-term adequacy.
            </p>
          </div>
        </section>

        {/* When to retest */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            When to Retest
          </h2>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
            <li><strong>After starting supplementation:</strong> Wait 2-3 months for levels to stabilize, then retest</li>
            <li><strong>Seasonal check:</strong> If your winter level was low, retesting in late summer shows your peak</li>
            <li><strong>Dose adjustment:</strong> If adjusting supplement dose, retest 2-3 months after the change</li>
            <li><strong>Routine monitoring:</strong> For most people, annual testing during winter (February-March) captures the likely nadir</li>
          </ul>
        </section>

        {/* Interpreting levels */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Interpreting Levels
          </h2>
          <div className="space-y-2">
            {[
              { range: '< 12 ng/mL', label: 'Severe deficiency', color: 'bg-red-100 text-red-800 border-red-200' },
              { range: '12-19 ng/mL', label: 'Deficiency', color: 'bg-red-50 text-red-700 border-red-200' },
              { range: '20-29 ng/mL', label: 'Insufficiency', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { range: '30-50 ng/mL', label: 'Sufficient', color: 'bg-green-50 text-green-700 border-green-200' },
              { range: '> 50 ng/mL', label: 'May be excessive', color: 'bg-gray-50 text-gray-700 border-gray-200' },
            ].map(level => (
              <div key={level.range} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${level.color}`}>
                <span className="font-mono text-xs font-bold w-24 shrink-0">{level.range}</span>
                <span className="text-sm">{level.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Based on Endocrine Society and IOM guidelines. Specific targets may vary by health condition.
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
