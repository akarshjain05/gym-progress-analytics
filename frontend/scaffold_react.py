import os

files = {
    "src/App.tsx": """import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import { AuthProvider } from './context/AuthContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Other routes will go here */}
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
""",
    "src/context/AuthContext.tsx": """import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
  }, []);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
""",
    "src/layouts/AuthLayout.tsx": """import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-xl shadow-lg border border-border">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-text">IRONLOG</h2>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
""",
    "src/layouts/MainLayout.tsx": """import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function MainLayout() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
""",
    "src/components/Sidebar.tsx": """import { Link } from 'react-router-dom';
import { Home, Activity, Calendar, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();
  
  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">IRONLOG</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link to="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background text-text transition-colors">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        <Link to="/workouts" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background text-text transition-colors">
          <Activity size={20} />
          <span>Workouts</span>
        </Link>
        <Link to="/history" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background text-text transition-colors">
          <Calendar size={20} />
          <span>History</span>
        </Link>
        <Link to="/settings" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background text-text transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </nav>
      <div className="p-4 border-t border-border">
        <button onClick={logout} className="flex items-center space-x-3 p-3 w-full rounded-lg hover:bg-background text-error transition-colors">
          <LogOut size={20} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
""",
    "src/pages/Login.tsx": """import { useState } from 'react';
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
""",
    "src/pages/Register.tsx": """import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div className="text-center text-text">
      <p>Registration coming soon.</p>
      <Link to="/login" className="text-primary hover:text-primary-hover mt-4 block">Back to Login</Link>
    </div>
  );
}
""",
    "src/pages/Dashboard.tsx": """export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-text-muted text-sm font-medium">Workouts This Week</h3>
          <p className="text-3xl font-bold text-text mt-2">3</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-text-muted text-sm font-medium">Current Streak</h3>
          <p className="text-3xl font-bold text-text mt-2">5 Days</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-text-muted text-sm font-medium">Volume Lifted</h3>
          <p className="text-3xl font-bold text-text mt-2">12,450 kg</p>
        </div>
      </div>
    </div>
  );
}
"""
}

os.makedirs('src/components', exist_ok=True)
os.makedirs('src/pages', exist_ok=True)
os.makedirs('src/layouts', exist_ok=True)
os.makedirs('src/context', exist_ok=True)

for path, content in files.items():
    with open(path, 'w') as f:
        f.write(content)
