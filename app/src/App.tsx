import { Routes, Route } from 'react-router-dom';
import type { InferenceResult } from './types';
import { useModel } from './hooks/useModel';
import { usePersistedState } from './hooks/usePersistedState';
import { Header } from './components/Header';
import { Disclaimer } from './components/Disclaimer';
import { InputPage } from './pages/InputPage';
import { ResultsPage } from './pages/ResultsPage';
import { LabPage } from './pages/LabPage';

function App() {
  const { loading } = useModel();
  const [result, setResult] = usePersistedState<InferenceResult | null>('result', null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading model...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<InputPage onResult={setResult} />} />
          <Route path="/results" element={<ResultsPage result={result} />} />
          <Route path="/lab" element={<LabPage />} />
        </Routes>
      </main>
      <Disclaimer />
    </div>
  );
}

export default App;
