import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/auth';
import axios from 'axios';
import styles from './Register.module.css';

const Logo = () => (
  <span className={styles.logoIcon}>
    <svg viewBox="0 0 24 24" fill="none" className={styles.logoSvg}>
      <circle cx="12" cy="12" r="10" fill="#3b82f6" />
      <path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', { email, password, name });
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageBg}>
      {/* Left Side - Branding */}
      <div className={styles.leftPanel}>
        <div className={styles.brandingBox}>
          <Logo />
          <h1 className={styles.brandingTitle}>Welcome to AutoFlow</h1>
          <p className={styles.brandingSubtitle}>
            Simplify your workflow with our intuitive automation tools.
          </p>
        </div>
      </div>
      {/* Right Side - Form */}
      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Create Account</h2>
            <p className={styles.formSubtitle}>Join us and start automating today</p>
          </div>
          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className={styles.formBody}>
            <div>
              <label htmlFor="name" className={styles.inputLabel}>Name</label>
              <input
                id="name"
                type="text"
                className={styles.inputField}
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className={styles.inputLabel}>Email</label>
              <input
                id="email"
                type="email"
                className={styles.inputField}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className={styles.inputLabel}>Password</label>
              <input
                id="password"
                type="password"
                className={styles.inputField}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
          <p className={styles.loginText}>
            Already have an account?{' '}
            <Link to="/login" className={styles.loginLink}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
