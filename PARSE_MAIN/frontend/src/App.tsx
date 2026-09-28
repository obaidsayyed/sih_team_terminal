import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './Landing';
import Dashboard from './Dashboard';
import GlobalBackground from './components/GlobalBackground';

import RouteTransitionWrapper from './landing/RouteTransitionWrapper';
import VaultPreview from './components/VaultPreview';

import ReportPage from './ReportPage';

function App() {
  return (
    <Router>
      <GlobalBackground />
      <RouteTransitionWrapper>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/vault-preview" element={<VaultPreview />} />
          <Route path="/app" element={<Dashboard />} />
          <Route path="/report/:id" element={<ReportPage />} />
        </Routes>
      </RouteTransitionWrapper>
    </Router>
  );
}

export default App;
