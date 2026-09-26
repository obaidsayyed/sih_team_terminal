import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './Landing';
import Dashboard from './Dashboard';
import GlobalBackground from './components/GlobalBackground';

import RouteTransitionWrapper from './landing/RouteTransitionWrapper';

function App() {
  return (
    <Router>
      <GlobalBackground />
      <RouteTransitionWrapper>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Dashboard />} />
        </Routes>
      </RouteTransitionWrapper>
    </Router>
  );
}

export default App;
