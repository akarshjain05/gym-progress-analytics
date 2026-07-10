export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">Overview</h1>
          <p className="text-slate-400 mt-2">Welcome back to your training dashboard.</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Workouts This Week</h3>
          <p className="text-4xl font-heading font-bold text-white mt-3">3</p>
        </div>
        <div className="glass-card relative overflow-hidden group delay-100">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Current Streak</h3>
          <p className="text-4xl font-heading font-bold text-white mt-3 text-emerald-400">5 Days</p>
        </div>
        <div className="glass-card relative overflow-hidden group delay-200">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Volume Lifted</h3>
          <p className="text-4xl font-heading font-bold text-white mt-3">12,450 <span className="text-xl text-slate-500">kg</span></p>
        </div>
      </div>
    </div>
  );
}
