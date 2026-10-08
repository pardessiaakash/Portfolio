import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import LandingPage from './HomePage';
import PortfolioPage from './PortfolioPage';
import ProjectDetailPage from './ProjectDetailPage';
import { ChatProvider } from './ChatContext';

function App() {
  return (
    <ChatProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/portfolio/:category" element={<ProjectDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ChatProvider>
  );
}

export default App;
