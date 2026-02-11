import { Routes, Route } from 'react-router-dom';
import type { InferenceResult } from './types';
import { usePersistedState } from './hooks/usePersistedState';
import { Header } from './components/Header';
import { Disclaimer } from './components/Disclaimer';
import { InputPage } from './pages/InputPage';
import { ResultsPage } from './pages/ResultsPage';
import { LabPage } from './pages/LabPage';

function App() {
  const [result, setResult] = usePersistedState<InferenceResult | null>('result', null);

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
