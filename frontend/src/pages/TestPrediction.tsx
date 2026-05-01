import React, { useState } from 'react';
import { ArrowLeft, Save, Play, Clock, CheckCircle2, Cpu, ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const TestPrediction = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isRunning, setIsRunning] = useState(false);
  const [payload, setPayload] = useState('{\n  "features": [1.2, 3.4, 5.6]\n}');
  const [result, setResult] = useState('');

  const requestHistory = [
    { time: '2023-10-27 10:20:00', reqId: 'req_4920k92', status: 'SUCCESS', latency: '14.5ms', outcome: 'Non-fraudulent (0.99)' },
    { time: '2023-10-27 10:18:42', reqId: 'req_4919x11', status: 'SUCCESS', latency: '16.2ms', outcome: 'Fraudulent (0.84)' },
    { time: '2023-10-27 10:15:10', reqId: 'req_4918l30', status: 'TIMEOUT', latency: '3000ms', outcome: 'Gateway Timeout' },
  ];

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const parsedPayload = JSON.parse(payload);
      const res = await api.post(`/models/${id}/predict`, parsedPayload);
      setResult(JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      setResult(JSON.stringify(err.response?.data || err.message, null, 2));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-12">
      <button 
        onClick={() => navigate(`/models/${id}`)} 
        className="flex items-center gap-2 text-primary-600 font-bold text-xs tracking-wider uppercase mb-6 hover:text-primary-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Models
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test Prediction</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-slate-500">Environment:</span>
            <span className="badge badge-info bg-indigo-50 text-indigo-700 border-none">STAGING-V2</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-outline">
            <Save className="w-4 h-4" /> Save Request
          </button>
          <button onClick={handleRun} className="btn-primary" disabled={isRunning}>
            <Play className="w-4 h-4" /> {isRunning ? 'Running...' : 'Run Prediction'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payload Input */}
        <div className="card p-0 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
            <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
              <ExternalLink className="w-4 h-4 text-slate-400" /> Payload Input
            </div>
            <span className="text-xs font-bold text-slate-400 tracking-wider">APPLICATION/JSON</span>
          </div>
          <textarea
            className="flex-1 bg-[#111827] text-indigo-200 font-mono text-sm p-6 overflow-auto resize-none focus:outline-none"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </div>

        {/* Prediction Result */}
        <div className="card p-0 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
            <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
              <ExternalLink className="w-4 h-4 text-slate-400" /> Prediction Result
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 tracking-wider">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 200 OK
            </div>
          </div>
          <div className="flex-1 bg-[#111827] text-indigo-200 font-mono text-sm p-6 overflow-auto">
            <pre>{result || 'Run a prediction to see the result...'}</pre>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="card flex items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">Response Time</p>
            <p className="text-2xl font-bold text-slate-900">14.5ms</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">Model Confidence</p>
            <p className="text-2xl font-bold text-slate-900">99.82%</p>
          </div>
        </div>
        <div className="card flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">Peak Memory</p>
              <p className="text-2xl font-bold text-slate-900">442MB</p>
            </div>
          </div>
          <div className="flex -space-x-2">
             <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-800"></div>
             <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-700"></div>
             <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">+3</div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Request History</h3>
          <button className="text-sm font-semibold text-primary-600 hover:underline">View all logs</button>
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">Request ID</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Latency</th>
                  <th className="px-6 py-4 font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {requestHistory.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{r.time}</td>
                    <td className="px-6 py-4 font-mono text-slate-900">{r.reqId}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${r.status === 'SUCCESS' ? 'badge-success' : 'badge-danger bg-red-100 text-red-800'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{r.latency}</td>
                    <td className={`px-6 py-4 ${r.status === 'TIMEOUT' ? 'text-red-600' : 'text-slate-600'}`}>{r.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPrediction;
