import React, { useState, useEffect } from 'react';
import { Filter, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import type { Model, ModelVersion, Deployment } from '../types';

const ModelsRegistry = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<any[]>([]);

  useEffect(() => {
    api.get('/models').then((res) => {
      // Map backend models to UI format
      const fetchedModels = res.data.map((m: Model) => {
        const latestVersionNumber = m.versions?.length ? Math.max(...m.versions.map((v: ModelVersion) => v.versionNumber)) : 0;
        const prevVersionNumber = latestVersionNumber > 1 ? latestVersionNumber - 1 : 0;
        const latestVersion = m.versions?.find(v => v.versionNumber === latestVersionNumber);
        
        let status = 'Draft';
        if (latestVersion) {
          status = latestVersion.status;
          const activeDeployment = latestVersion.deployments?.find(d => d.status === 'running');
          if (activeDeployment) {
            status = 'Deployed';
          }
        }
        
        return {
          id: m.id,
          initials: m.name.substring(0, 2).toUpperCase(),
          name: m.name,
          time: new Date(m.createdAt).toLocaleDateString(),
          type: m.description || 'Unknown',
          version: latestVersionNumber > 0 ? `v${latestVersionNumber}` : '-',
          prevVersion: prevVersionNumber > 0 ? `v${prevVersionNumber}` : '',
          status: status
        };
      });
      setModels(fetchedModels);
    }).catch(console.error);
  }, []);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Models Registry</h1>
          <p className="text-slate-500 mt-1">Manage, version, and deploy your machine learning assets across environments.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-outline">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button onClick={() => navigate('/models/upload')} className="btn-primary">
            <Plus className="w-4 h-4" /> New Model
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
              <span className="font-bold text-lg">⌬</span>
            </div>
            <span className="badge badge-success bg-emerald-50 text-emerald-600 border-none">+12%</span>
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-1">Total Models</p>
          <h2 className="text-2xl font-bold text-slate-900">124</h2>
        </div>
        
        <div className="card">
          <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
            <span className="font-bold">✓</span>
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-1">Production Ready</p>
          <h2 className="text-2xl font-bold text-slate-900">89</h2>
        </div>

        <div className="card">
          <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
            <span className="font-bold">...</span>
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-1">Building</p>
          <h2 className="text-2xl font-bold text-slate-900">14</h2>
        </div>

        <div className="card">
          <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-600 mb-2">
            <span className="font-bold">!</span>
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-1">Failed Runs</p>
          <h2 className="text-2xl font-bold text-slate-900">3</h2>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Model Name</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Versions</th>
                <th className="px-6 py-4 font-semibold">Latest Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {models.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/models/${m.id}`)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs tracking-wider">
                        {m.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.time}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${m.type === 'Classification' ? 'badge-info bg-indigo-50 text-indigo-700' : m.type === 'Regression' ? 'badge-warning bg-amber-50 text-amber-700' : 'badge-neutral bg-slate-100 text-slate-600'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-medium">{m.version}</span>
                      {m.prevVersion && <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs flex items-center justify-center font-medium">{m.prevVersion}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${m.status === 'Ready' ? 'bg-emerald-500' : m.status === 'Building' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium text-slate-700">{m.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* Actions if any */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>Showing {models.length} models</span>
          <div className="flex gap-2">
            <button className="p-1 border border-slate-200 rounded hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
            <button className="p-1 border border-slate-200 rounded hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ModelsRegistry;
