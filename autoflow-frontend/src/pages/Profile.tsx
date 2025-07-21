import useAuthStore from '../store/auth';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-gray-900 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Profile</h2>
      <div className="mb-4">
        <div><span className="font-semibold">Name:</span> {user.name}</div>
        <div><span className="font-semibold">Email:</span> {user.email}</div>
      </div>
      <button
        className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 font-bold"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
};

export default Profile; 