import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import WorkflowEditor from './pages/WorkflowEditor';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import useAuthStore from './store/auth';

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

function AppContent({ dark, setDark }: { dark: boolean, setDark: (d: boolean) => void }) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Autoflow</h1>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <Link to="/profile" className="hover:underline">{user.name || user.email}</Link>
              <button
                className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm"
                onClick={() => { logout(); navigate('/login'); }}
              >
                Logout
              </button>
            </>
          )}
          <button
            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>
      <main className="p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/editor/:id" element={<RequireAuth><WorkflowEditor /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
          <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [dark, setDark] = useState(true);
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');

  return (
    <Router>
      <AppContent dark={dark} setDark={setDark} />
    </Router>
  );
}

export default App;
