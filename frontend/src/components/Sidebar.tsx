import { Link } from 'react-router-dom';
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
