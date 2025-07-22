import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth';
import styles from './RunHistory.module.css';

interface Run {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  result?: any;
}

const RunHistory = () => {
  const { id } = useParams();
  const token = useAuthStore(s => s.token);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRuns = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/workflows/${id}/runs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch run history');
        const data = await res.json();
        setRuns(data.runs || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch run history');
      } finally {
        setLoading(false);
      }
    };
    if (id && token) fetchRuns();
  }, [id, token]);

  return (
    <div className={styles.pageBg}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/dashboard')}
        >
           Dashboard
        </button>
        <h2 className={styles.title}>Run History</h2>
        <div />
      </div>
      <div className={styles.panel}>
        <div className={styles.card}>
          {loading && <div className={styles.loading}>Loading run history...</div>}
          {error && <div className={styles.errorBox}>{error}</div>}
          {!loading && runs.length === 0 && !error && (
            <div className={styles.empty}>No runs found for this workflow.</div>
          )}
          <div className={styles.runList}>
            {runs.map(run => (
              <div
                key={run.id}
                className={styles.runItem}
              >
                <div className={styles.runMeta}>
                  <span className={
                    run.status === 'completed'
                      ? styles.statusDotCompleted
                      : styles.statusDotFailed
                  }></span>
                  <span className={styles.statusText}>{run.status.charAt(0).toUpperCase() + run.status.slice(1)}</span>
                  <span className={styles.startedAt}>Started: {new Date(run.startedAt).toLocaleString()}</span>
                  {run.finishedAt && <span className={styles.finishedAt}>Finished: {new Date(run.finishedAt).toLocaleString()}</span>}
                </div>
                <div className={styles.resultLabel}>Result:
                  <pre className={styles.resultBox}>
                    {run.result && typeof run.result === 'object' && 'body' in run.result
                      ? JSON.stringify(run.result.body, null, 2)
                      : JSON.stringify(run.result, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunHistory; 