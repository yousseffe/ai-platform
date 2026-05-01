import { useState, useEffect } from 'react';
import { Upload, Activity, Server, ArrowUpRight, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [recentModels, setRecentModels] = useState<any[]>([]);

  useEffect(() => {
    api.get('/models').then((res) => {
      const fetchedModels = res.data.slice(0, 5).map((m: any) => ({
        name: m.name,
        type: m.description || 'Unknown',
        status: 'LIVE',
        time: new Date(m.createdAt).toLocaleDateString()
      }));
      setRecentModels(fetchedModels);
    }).catch(console.error);
  }, []);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
          <p className="text-slate-500 mt-1">Manage and monitor your machine learning infrastructure.</p>
        </div>
        <button onClick={() => navigate('/models/upload')} className="btn-primary">
          <Upload className="w-4 h-4" />
          Upload Model
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <LayersIcon />
            </div>
            <span className="badge badge-success bg-emerald-50 text-emerald-600 border-none"><ArrowUpRight className="w-3 h-3"/> +4</span>
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Models</p>
          <h2 className="text-3xl font-bold text-slate-900">{recentModels.length > 0 ? 'Loading...' : '0'}</h2>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> LIVE MONITOR
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Deployments</p>
          <h2 className="text-3xl font-bold text-slate-900">12</h2>
        </div>

        <div className="card bg-slate-900 text-white border-none relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {/* simple abstract wave or grid */}
          </div>
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1 relative z-10">Latency Average</p>
          <h2 className="text-4xl font-bold text-white mb-1 relative z-10">42ms</h2>
          <p className="text-xs text-slate-400 relative z-10">Global p95 metrics</p>
          <div className="mt-4 flex items-end gap-1.5 h-10 relative z-10">
            {[40, 30, 45, 25, 50, 35, 60].map((h, i) => (
              <div key={i} className="flex-1 bg-indigo-500 rounded-t-sm opacity-80" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Models Table */}
        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Models</h3>
            <button className="text-sm text-primary-600 font-medium hover:underline">View all &gt;</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Last Trained</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentModels.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Server className="w-4 h-4" />
                      </div>
                      {m.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{m.type}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${m.status === 'LIVE' ? 'badge-success' : m.status === 'TRAINING' ? 'badge-warning' : 'badge-neutral'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{m.time}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resource Utilization */}
        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-5">Resource Utilization</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">GPU Clusters</span>
                <span className="text-slate-900 font-semibold">78%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">Storage S3</span>
                <span className="text-slate-900 font-semibold">42%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
          </div>

          <div className="card bg-indigo-50 border-indigo-100">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Optimizations Available</h4>
                <p className="text-xs text-slate-600 mt-1 mb-3">3 models could be quantized to INT8 for better performance.</p>
                <button className="w-full bg-white border border-indigo-200 text-indigo-700 text-sm font-medium py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                  View Recommendations
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LayersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>
);

export default Dashboard;
