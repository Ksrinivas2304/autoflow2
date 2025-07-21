import { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/auth';
import { Link } from 'react-router-dom';

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
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="New workflow name"
          className="p-2 rounded bg-gray-800 border border-gray-700 flex-1"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
        />
        <button type="submit" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 font-bold" disabled={creating}>
          {creating ? 'Creating...' : 'Create'}
        </button>
      </form>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-400 mb-2">{error}</div>}
      <ul className="space-y-2">
        {workflows.map(wf => (
          <li key={wf.id} className="p-4 bg-gray-800 rounded flex items-center justify-between">
            <span>{wf.name}</span>
            <div className="flex gap-2">
              <Link to={`/editor/${wf.id}`} className="text-blue-400 hover:underline">Edit</Link>
              <button
                className="text-red-400 hover:underline"
                onClick={() => handleDelete(wf.id)}
                disabled={deletingId === wf.id}
              >
                {deletingId === wf.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard; 