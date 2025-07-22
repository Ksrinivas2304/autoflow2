import useAuthStore from '../store/auth';
import { useNavigate } from 'react-router-dom';
import styles from './Profile.module.css';

const Profile = () => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.profileCard}>
      <nav className={styles.navbar}>
        <span className={styles.logo}>Autoflow</span>
        <div className={styles.userSection}>
          <span>{user.name}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
        </div>
      </nav>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {user.name?.charAt(0)}
        </div>
        <div>
          <h2 className={styles.name}>{user.name}</h2>
          <p className={styles.email}>{user.email}</p>
        </div>
      </div>
      <div className={styles.detailsSection}>
        <h3 className={styles.detailsTitle}>Account Details</h3>
        <div className={styles.detailsList}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Full Name</span>
            <span>{user.name}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Email Address</span>
            <span>{user.email}</span>
          </div>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className={styles.logoutButton}
      >
        Logout
      </button>
    </div>
  );
};

export default Profile;
