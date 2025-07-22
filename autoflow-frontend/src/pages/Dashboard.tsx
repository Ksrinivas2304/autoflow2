import { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/auth';
import { Link } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencilAlt, HiOutlineLightningBolt } from 'react-icons/hi';
import styles from './Dashboard.module.css';

interface Workflow {
  id: string;
  name: string;
  createdAt: string;
}

const Dashboard = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const token = useAuthStore(s => s.token);

  const fetchWorkflows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/workflows', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkflows(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    // eslint-disable-next-line
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await axios.post('/api/workflows', { name: newName, data: { nodes: [], edges: [] } }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewName('');
      fetchWorkflows();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this workflow?')) return;
    setDeletingId(id);
    setError('');
    try {
      await axios.delete(`/api/workflows/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWorkflows();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete workflow');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.pageBg}>
      {/* Hero Header */}
      <div className={styles.heroHeader}>
        <div className={styles.heroContent}>
          <div className={styles.heroIconWrap}>
            <span className={styles.heroIconBg}>
              <HiOutlineLightningBolt className={styles.heroIcon} />
            </span>
          </div>
          <h1 className={styles.heroTitle}>Autoflow Dashboard</h1>
          <p className={styles.heroSubtitle}>Visual automation for everyone. Build, run, and manage your workflows with ease.</p>
        </div>
        <div className={styles.heroGradient} />
      </div>
      {/* Floating Card for Workflows */}
      <div className={styles.cardPanel}>
        <div className={styles.card}>
          {/* Create Workflow */}
          <form onSubmit={handleCreate} className={styles.createForm}>
            <input
              type="text"
              placeholder="New workflow name"
              className={styles.createInput}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              disabled={creating}
            />
            <button
              type="submit"
              className={styles.createButton}
              disabled={creating}
            >
              <HiOutlinePlus className={styles.createButtonIcon} />
              {creating ? 'Creating...' : 'Create'}
            </button>
          </form>
          {/* Feedback */}
          {loading && (
            <div className={styles.loadingText}>Loading workflows...</div>
          )}
          {error && (
            <div className={styles.errorBox}>{error}</div>
          )}
          {/* Empty State */}
          {!loading && workflows.length === 0 && !error && (
            <div className={styles.emptyState}>
              <HiOutlineLightningBolt className={styles.emptyIcon} />
              <div className={styles.emptyTitle}>No workflows yet</div>
              <div className={styles.emptySubtitle}>Start by creating your first workflow above!</div>
            </div>
          )}
          {/* Workflow List */}
          <div className={styles.workflowList}>
            {workflows.map(wf => (
              <div
                key={wf.id}
                className={styles.workflowItem}
              >
                <div className={styles.workflowInfo}>
                  <span className={styles.workflowIcon}>
                    <HiOutlinePencilAlt className={styles.workflowIconSvg} />
                  </span>
                  <div>
                    <div className={styles.workflowName}>{wf.name}</div>
                    <div className={styles.workflowDate}>Created {new Date(wf.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className={styles.workflowActions}>
                  <Link
                    to={`/editor/${wf.id}`}
                    className={styles.editButton}
                  >
                    <HiOutlinePencilAlt className={styles.editButtonIcon} /> Edit
                  </Link>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(wf.id)}
                    disabled={deletingId === wf.id}
                  >
                    <HiOutlineTrash className={styles.deleteButtonIcon} />
                    {deletingId === wf.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 