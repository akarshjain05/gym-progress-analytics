import { Link } from 'react-router-dom';
import { Home, Activity, Calendar, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();
  
  return (
    <aside className="w-64 glass border-r-0 border-white/5 flex flex-col hidden md:flex m-4 rounded-3xl z-20 shadow-2xl relative overflow-hidden">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"></div>
      
      <div className="p-8">
        <h1 className="text-3xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-tight">IRONLOG</h1>
      </div>
      <nav className="flex-1 px-4 space-y-3">
        <Link to="/dashboard" className="flex items-center space-x-4 px-4 py-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300 group">
          <Home size={22} className="group-hover:scale-110 group-hover:text-cyan-400 transition-transform duration-300" />
          <span className="font-medium">Dashboard</span>
        </Link>
        <Link to="/workouts" className="flex items-center space-x-4 px-4 py-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300 group">
          <Activity size={22} className="group-hover:scale-110 group-hover:text-cyan-400 transition-transform duration-300" />
          <span className="font-medium">Workouts</span>
        </Link>
        <Link to="/analytics" className="flex items-center space-x-4 px-4 py-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300 group">
          <Calendar size={22} className="group-hover:scale-110 group-hover:text-cyan-400 transition-transform duration-300" />
          <span className="font-medium">Analytics</span>
        </Link>
        <Link to="/settings" className="flex items-center space-x-4 px-4 py-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300 group">
          <Settings size={22} className="group-hover:scale-110 group-hover:text-cyan-400 transition-transform duration-300" />
          <span className="font-medium">Settings</span>
        </Link>
      </nav>
      <div className="p-4 mt-auto">
        <button onClick={logout} className="flex items-center space-x-4 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all duration-300 group">
          <LogOut size={22} className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-medium">Log out</span>
        </button>
      </div>
    </aside>
  );
}
