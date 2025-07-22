import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/auth';
import axios from 'axios';
import styles from './Login.module.css';

// Simple placeholder logo icon
const Logo = () => (
  <span className={styles.logoIcon}>
    <svg viewBox="0 0 24 24" fill="none" className={styles.logoSvg}>
      <circle cx="12" cy="12" r="10" fill="#3b82f6" />
      <path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageBg}>
      {/* Top navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>
          <Logo />
          <span className={styles.brandText}>AutoFlow</span>
        </div>
      </nav>
      {/* Centered form */}
      <div className={styles.formPanel}>
        <form
          onSubmit={handleSubmit}
          className={styles.formCard}
        >
          <h2 className={styles.formTitle}>Welcome back</h2>
          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className={styles.inputLabel}>
              Email
            </label>
            <input
              type="email"
              id="email"
              className={styles.inputField}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className={styles.inputLabel}>
              Password
            </label>
            <input
              type="password"
              id="password"
              className={styles.inputField}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
          <div className={styles.registerText}>
            Don’t have an account?{' '}
            <Link to="/register" className={styles.registerLink}>
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
