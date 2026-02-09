import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserInputs } from '../types';
import { useInference } from '../hooks/useInference';
import { useZipLookup } from '../hooks/useZipLookup';
import { SKIN_TONE_MAP } from '../data/skinToneMap';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  onResult: (result: NonNullable<ReturnType<typeof useInference>['result']>) => void;
}

export function InputPage({ onResult }: Props) {
  const navigate = useNavigate();
  const { runInference, running } = useInference();
  const { loadZipData, lookup } = useZipLookup();

  // Basic inputs
  const [age, setAge] = useState(40);
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [bmi, setBmi] = useState(27);
  const [skinTone, setSkinTone] = useState(2);
  const [zipCode, setZipCode] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Advanced inputs
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sunExposure, setSunExposure] = useState(15);
  const [clothing, setClothing] = useState<'minimal' | 'moderate' | 'full'>('moderate');
  const [sunscreen, setSunscreen] = useState<'never' | 'sometimes' | 'always'>('sometimes');
  const [supplementDose, setSupplementDose] = useState(0);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load ZIP data lazily
  useEffect(() => {
    loadZipData();
  }, [loadZipData]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (age < 18 || age > 120) newErrors.age = 'Age must be 18-120';
    if (bmi < 10 || bmi > 80) newErrors.bmi = 'BMI must be 10-80';
    if (zipCode && !/^\d{5}$/.test(zipCode)) newErrors.zipCode = 'Enter a 5-digit ZIP code';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const inputs: UserInputs = {
      age,
      sex,
      bmi,
      skinTone,
      zipCode,
      month,
      ...(showAdvanced && {
        sunExposureMinutes: sunExposure,
        clothingCoverage: clothing,
        sunscreenUse: sunscreen,
        supplementDoseIU: supplementDose,
      }),
    };

    const location = zipCode ? lookup(zipCode) : undefined;
    const result = await runInference(inputs, location ?? undefined);

    if (result) {
      onResult(result);
      navigate('/results');
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Vitamin D Risk Estimator
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Estimate your risk of vitamin D deficiency based on demographic and lifestyle factors.
          This tool uses a model trained on NHANES population data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Age */}
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            Age
          </label>
          <input
            id="age"
            type="number"
            min={18}
            max={120}
            value={age}
            onChange={e => setAge(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            aria-describedby={errors.age ? 'age-error' : undefined}
          />
          {errors.age && <p id="age-error" className="text-red-600 text-xs mt-1">{errors.age}</p>}
        </div>

        {/* Sex */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">Sex</legend>
          <div className="flex gap-3">
            {(['male', 'female'] as const).map(s => (
              <label
                key={s}
                className={`flex-1 text-center py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition ${
                  sex === s
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="sex"
                  value={s}
                  checked={sex === s}
                  onChange={() => setSex(s)}
                  className="sr-only"
                />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>

        {/* BMI */}
        <div>
          <label htmlFor="bmi" className="block text-sm font-medium text-gray-700 mb-1">
            BMI
          </label>
          <div className="flex items-center gap-3">
            <input
              id="bmi"
              type="range"
              min={15}
              max={50}
              step={0.5}
              value={bmi}
              onChange={e => setBmi(Number(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-sm font-bold text-amber-600 w-10 text-right">{bmi}</span>
          </div>
          {errors.bmi && <p className="text-red-600 text-xs mt-1">{errors.bmi}</p>}
        </div>

        {/* Skin Tone */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">
            Skin Tone (Fitzpatrick Scale)
          </legend>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SKIN_TONE_MAP.map(tone => (
              <label
                key={tone.fitzpatrick}
                className={`text-center py-2 px-1 rounded-lg border text-xs font-medium cursor-pointer transition ${
                  skinTone === tone.fitzpatrick
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                title={tone.description}
              >
                <input
                  type="radio"
                  name="skinTone"
                  value={tone.fitzpatrick}
                  checked={skinTone === tone.fitzpatrick}
                  onChange={() => setSkinTone(tone.fitzpatrick)}
                  className="sr-only"
                />
                <div className="font-bold">{tone.fitzpatrick}</div>
                <div className="text-[10px] leading-tight mt-0.5">{tone.label}</div>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Used to approximate vitamin D synthesis capacity. Not a measure of race or ethnicity.
          </p>
        </fieldset>

        {/* ZIP Code */}
        <div>
          <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code <span className="text-gray-400 font-normal">(optional, for UV estimate)</span>
          </label>
          <input
            id="zip"
            type="text"
            maxLength={5}
            pattern="\d{5}"
            value={zipCode}
            onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="e.g. 10001"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            aria-describedby={errors.zipCode ? 'zip-error' : undefined}
          />
          {errors.zipCode && <p id="zip-error" className="text-red-600 text-xs mt-1">{errors.zipCode}</p>}
        </div>

        {/* Month */}
        <div>
          <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
            Month
          </label>
          <select
            id="month"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-amber-600 font-medium hover:text-amber-700 transition"
        >
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </button>

        {/* Advanced inputs */}
        {showAdvanced && (
          <div className="space-y-5 bg-gray-50 rounded-lg p-4 border border-gray-200">
            {/* Sun exposure */}
            <div>
              <label htmlFor="sun" className="block text-sm font-medium text-gray-700 mb-1">
                Daily sun exposure (minutes)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="sun"
                  type="range"
                  min={0}
                  max={120}
                  step={5}
                  value={sunExposure}
                  onChange={e => setSunExposure(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-sm font-bold text-amber-600 w-12 text-right">{sunExposure} min</span>
              </div>
            </div>

            {/* Clothing */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-1">
                Typical clothing outdoors
              </legend>
              <div className="flex gap-2">
                {([
                  { value: 'minimal', label: 'Minimal' },
                  { value: 'moderate', label: 'Moderate' },
                  { value: 'full', label: 'Full coverage' },
                ] as const).map(opt => (
                  <label
                    key={opt.value}
                    className={`flex-1 text-center py-2 rounded-lg border text-xs font-medium cursor-pointer transition ${
                      clothing === opt.value
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clothing"
                      value={opt.value}
                      checked={clothing === opt.value}
                      onChange={() => setClothing(opt.value)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Sunscreen */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-1">
                Sunscreen use
              </legend>
              <div className="flex gap-2">
                {([
                  { value: 'never', label: 'Never' },
                  { value: 'sometimes', label: 'Sometimes' },
                  { value: 'always', label: 'Always' },
                ] as const).map(opt => (
                  <label
                    key={opt.value}
                    className={`flex-1 text-center py-2 rounded-lg border text-xs font-medium cursor-pointer transition ${
                      sunscreen === opt.value
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sunscreen"
                      value={opt.value}
                      checked={sunscreen === opt.value}
                      onChange={() => setSunscreen(opt.value)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Supplement dose */}
            <div>
              <label htmlFor="supp" className="block text-sm font-medium text-gray-700 mb-1">
                Daily vitamin D supplement (IU)
              </label>
              <select
                id="supp"
                value={supplementDose}
                onChange={e => setSupplementDose(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
              >
                <option value={0}>None</option>
                <option value={400}>400 IU (typical multivitamin)</option>
                <option value={1000}>1,000 IU</option>
                <option value={2000}>2,000 IU</option>
                <option value={4000}>4,000 IU</option>
                <option value={5000}>5,000 IU</option>
              </select>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={running}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition text-sm shadow-sm min-h-[44px]"
        >
          {running ? 'Estimating...' : 'Estimate My Risk'}
        </button>
      </form>

      {/* Privacy notice */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Your inputs stay in your browser. Nothing is sent to a server.
        </p>
      </div>
    </div>
  );
}
