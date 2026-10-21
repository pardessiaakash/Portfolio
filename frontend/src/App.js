import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import LandingPage from './HomePage';
import { ChatProvider } from './ChatContext';
import TechCursor from './TechCursor';

// project pages and the 404 load separately, so the home screen starts sooner
const loadProjects = () => import('./ProjectDetailPage');
const ProjectDetailPage = lazy(loadProjects);
const NotFound = lazy(() => import('./NotFound'));

// A hosted preview may serve the app from a path like /index.html; the
// address it first opens with then counts as home, not as "page not found".
const FIRST_PATH = typeof window !== 'undefined' ? window.location.pathname : '/';
function Unknown() {
  const loc = useLocation();
  if (/\/index\.html$/.test(loc.pathname) || (process.env.REACT_APP_PREVIEW === '1' && loc.pathname === FIRST_PATH)) {
    return <Navigate to="/" replace />;
  }
  return <NotFound />;
}

function App() {
  // fetch the project page code in the background once the browser is idle
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 4000));
    idle(() => { loadProjects(); });
  }, []);
  return (
    <ChatProvider>
      <TechCursor />
      <div className="App">
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#000' }} />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/portfolio" element={<Navigate to={`/portfolio/${encodeURIComponent("UI/UX")}`} replace />} />
          <Route path="/portfolio/:category" element={<ProjectDetailPage />} />
          <Route path="*" element={<Unknown />} />
        </Routes>
        </Suspense>
      </div>
    </ChatProvider>
  );
}

export default App;
