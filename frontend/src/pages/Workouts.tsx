import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Plus, Dumbbell } from 'lucide-react';

interface WorkoutTemplate {
  id: number;
  name: string;
  description: string;
}

export default function Workouts() {
  const { data: templates, isLoading } = useQuery<WorkoutTemplate[]>({
    queryKey: ['workout_templates'],
    queryFn: async () => {
      const res = await api.get('/workout-templates');
      return res.data;
    }
  });

  if (isLoading) return <div className="text-text">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text">Workouts</h1>
        <button className="flex items-center space-x-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors">
          <Plus size={20} />
          <span>New Template</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
          <div key={template.id} className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-background rounded-lg text-primary">
                  <Dumbbell size={24} />
                </div>
                <h3 className="text-xl font-bold text-text">{template.name}</h3>
              </div>
              <p className="text-text-muted">{template.description || 'No description provided.'}</p>
            </div>
            <div className="mt-6 flex space-x-3">
              <button className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary-hover transition-colors">
                Start
              </button>
              <button className="flex-1 bg-background text-text py-2 rounded-lg hover:bg-border transition-colors border border-border">
                Edit
              </button>
            </div>
          </div>
        ))}
        {(!templates || templates.length === 0) && (
          <div className="col-span-full text-center py-12 text-text-muted">
            No workout templates found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
