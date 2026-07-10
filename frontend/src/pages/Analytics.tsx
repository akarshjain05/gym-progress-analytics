import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../utils/api';

interface AnalyticsData {
  date: string;
  weight: number;
}

export default function Analytics() {
  const { data, isLoading } = useQuery<AnalyticsData[]>({
    queryKey: ['analytics_weight'],
    queryFn: async () => {
      // Mocking data if backend isn't ready, or fetching real data
      try {
        const res = await api.get('/analytics/weight-progress');
        return res.data;
      } catch (err) {
        return [
          { date: '2023-01-01', weight: 80 },
          { date: '2023-02-01', weight: 79 },
          { date: '2023-03-01', weight: 78.5 },
          { date: '2023-04-01', weight: 77.2 },
        ];
      }
    }
  });

  if (isLoading) return <div className="text-text">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text">Analytics</h1>
      
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h3 className="text-xl font-bold text-text mb-6">Weight Progression</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                itemStyle={{ color: 'var(--text)' }}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
