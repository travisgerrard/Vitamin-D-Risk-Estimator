import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { InferenceResult } from './types';
import { usePersistedState } from './hooks/usePersistedState';
import { Header } from './components/Header';
import { Disclaimer } from './components/Disclaimer';
import { InputPage } from './pages/InputPage';

const ResultsPage = lazy(async () => {
  const module = await import('./pages/ResultsPage');
  return { default: module.ResultsPage };
});

const LabPage = lazy(async () => {
  const module = await import('./pages/LabPage');
  return { default: module.LabPage };
});

function App() {
  const [result, setResult] = usePersistedState<InferenceResult | null>('result', null);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-8 text-sm text-gray-500">Loading...</div>}>
          <Routes>
            <Route path="/" element={<InputPage onResult={setResult} />} />
            <Route path="/results" element={<ResultsPage result={result} />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Disclaimer />
    </div>
  );
}

export default App;
