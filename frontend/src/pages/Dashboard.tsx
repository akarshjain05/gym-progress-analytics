export default function Dashboard() {
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
