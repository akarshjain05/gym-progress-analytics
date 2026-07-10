import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Temporary mock login for setup phase
      login('dummy_token');
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && <div className="text-error text-sm text-center">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text">Email</label>
          <input type="email" required className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-text focus:outline-none focus:ring-primary focus:border-primary" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text">Password</label>
          <input type="password" required className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-text focus:outline-none focus:ring-primary focus:border-primary" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
      </div>
      <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
        Sign in
      </button>
      <div className="text-center text-sm">
        <Link to="/register" className="text-primary hover:text-primary-hover">Don't have an account? Sign up</Link>
      </div>
    </form>
  );
}
