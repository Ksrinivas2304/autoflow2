import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import WorkflowEditor from './pages/WorkflowEditor';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import useAuthStore from './store/auth';
import RunHistory from './pages/RunHistory';
import type { JSX } from 'react';
import './App.css';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore(s => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RedirectIfAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore(s => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppContent() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  return (
    <div>
      <header className="appNavbar">
        <h1>Autoflow</h1>
        {user && (
          <div className="appUserSection">
            <Link to="/profile" className="hover:underline">{user.name || user.email}</Link>
            <button
              className="appLogoutButton"
              onClick={() => { logout(); navigate('/login'); }}
            >
              Logout
            </button>
          </div>
        )}
      </header>
      <main className="appMain">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/editor/:id" element={<RequireAuth><WorkflowEditor /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
          <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
          <Route path="/workflow/:id/runs" element={<RequireAuth><RunHistory /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
