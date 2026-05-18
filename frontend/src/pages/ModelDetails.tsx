import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, UploadCloud, CheckCircle2, FileCode, Trash2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import type { Model, ModelVersion, Deployment } from '../types';

const ModelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);

  // New Version Modal State
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [scalerFile, setScalerFile] = useState<File | null>(null);
  const [preprocessFile, setPreprocessFile] = useState<File | null>(null);
  const [postprocessFile, setPostprocessFile] = useState<File | null>(null);
  const [examplePayload, setExamplePayload] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchModel();
  }, [id]);

  const fetchModel = async () => {
    try {
      const res = await api.get(`/models/${id}`);
      setModel(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (model) {
      const needsPolling = model.versions?.some((v) => {
        if (v.status === 'queued' || v.status === 'building') return true;
        const latestDeployment = v.deployments && v.deployments.length > 0 
          ? [...v.deployments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] 
          : null;
        if (latestDeployment && (latestDeployment.status === 'starting' || latestDeployment.status === 'stopping')) return true;
        return false;
      });

      if (needsPolling) {
        interval = setInterval(() => {
          fetchModel();
        }, 3000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [model]);

  const handleDeploy = async (versionId: string) => {
    try {
      await api.post(`/deployments/version/${versionId}`);
      toast.success('Deployment started!');
      fetchModel();
    } catch (e) {
      console.error(e);
      toast.error('Failed to start deployment');
    }
  };

  const handleStop = async (deploymentId: string) => {
    try {
      await api.post(`/deployments/${deploymentId}/stop`);
      fetchModel();
    } catch (e) {
      console.error(e);
      toast.error('Failed to stop deployment');
    }
  };

  const handleDeleteModel = async () => {
    if (!window.confirm('Are you sure you want to delete this entire model and all its versions?')) return;
    try {
      await api.delete(`/models/${id}`);
      navigate('/models');
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to delete model');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!window.confirm('Are you sure you want to delete this version?')) return;
    try {
      await api.delete(`/models/versions/${versionId}`);
      fetchModel();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to delete version');
    }
  };

  const handleUploadVersion = async () => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      if (modelFile) formData.append('model', modelFile);
      if (scalerFile) formData.append('scaler', scalerFile);
      if (preprocessFile) formData.append('preprocess', preprocessFile);
      if (postprocessFile) formData.append('postprocess', postprocessFile);
      if (examplePayload) formData.append('examplePayload', examplePayload);
      if (expectedResult) formData.append('expectedResult', expectedResult);
      
      await api.post(`/models/${id}/versions`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowVersionModal(false);
      setModelFile(null);
      setScalerFile(null);
      setPreprocessFile(null);
      setPostprocessFile(null);
      toast.success('Version queued for build!');
      fetchModel();
    } catch (e) {
      console.error(e);
      toast.error('Failed to upload new version');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!model) return <div>Model not found</div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{model.name}</h1>
              <span className="badge badge-info bg-indigo-50 text-indigo-700">STABLE</span>
            </div>
            <button onClick={handleDeleteModel} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 font-medium">
              <Trash2 className="w-4 h-4" /> Delete Model
            </button>
          </div>
          <p className="text-slate-600 leading-relaxed mb-6 max-w-3xl">
            {model.description || 'No description provided.'}
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Parameters</p>
              <p className="font-medium text-slate-900">340M</p>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Architecture</p>
              <p className="font-medium text-slate-900">Transformer-XL</p>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Training Epochs</p>
              <p className="font-medium text-slate-900">1,200</p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-72">
          <div className="card h-full">
            <h3 className="font-bold text-slate-800 mb-4">Usage Metrics</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">API Calls (24h)</span>
                <span className="text-slate-900 font-bold">42.8k</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div className="mb-6 flex justify-between items-center text-sm">
              <span className="text-slate-500">Latency (p95)</span>
              <span className="text-slate-900 font-bold">124ms</span>
            </div>
            <button className="btn-outline w-full text-sm">View Analytics</button>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Version History</h3>
          <button onClick={() => setShowVersionModal(true)} className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline">
            <Plus className="w-4 h-4" /> Upload New Version
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Version Number</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold">Accuracy</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {(model.versions || []).map((v: ModelVersion, i: number) => {
                const latestDeployment = v.deployments && v.deployments.length > 0 
                  ? [...v.deployments].sort((a: Deployment, b: Deployment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] 
                  : null;
                
                let displayStatus = v.status as string;
                if (latestDeployment) {
                  displayStatus = latestDeployment.status === 'running' ? 'deployed' : latestDeployment.status;
                }
                
                const hasError = v.status === 'failed' || (latestDeployment && latestDeployment.status === 'failed');
                const errorMessage = v.errorMessage || (latestDeployment && latestDeployment.errorMessage);

                return (
                  <React.Fragment key={i}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-primary-600 mr-2">v{v.versionNumber}</span>
                        <span className="text-slate-400 text-xs">{v.id.substring(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${(displayStatus === 'ready' || displayStatus === 'deployed') ? 'bg-emerald-500' : (displayStatus === 'building' || displayStatus === 'starting') ? 'bg-blue-500 animate-pulse' : hasError ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                            <span className="font-medium text-slate-700 capitalize">{displayStatus}</span>
                            {(displayStatus === 'building' || displayStatus === 'starting') && (
                              <svg className="animate-spin h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                          </div>
                          {(displayStatus === 'building') && (
                            <span className="text-[10px] text-slate-400 leading-tight">Creating container image...<br/>(may take 2-5 mins for large models)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(v.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">--</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {v.status === 'ready' && (!latestDeployment || latestDeployment.status !== 'running') && (
                            <button onClick={() => handleDeploy(v.id)} className="px-4 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 transition-colors">Deploy</button>
                          )}
                          {hasError && (
                            <button className="px-4 py-1.5 border border-slate-200 text-red-600 rounded text-xs font-medium hover:bg-slate-50 transition-colors">Retry</button>
                          )}
                          {latestDeployment && latestDeployment.status === 'running' && (
                            <button onClick={() => handleStop(latestDeployment.id)} className="px-4 py-1.5 border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50 transition-colors">Stop</button>
                          )}
                          <button onClick={() => navigate(`/models/${id}/test`)} disabled={displayStatus !== 'deployed'} className={`px-4 py-1.5 border rounded text-xs font-medium transition-colors ${displayStatus === 'deployed' ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}>
                            Test
                          </button>
                          <button onClick={() => handleDeleteVersion(v.id)} className="px-2 py-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete Version">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {hasError && errorMessage && (
                      <tr className="bg-red-50 border-b border-red-100">
                        <td colSpan={5} className="px-6 py-3 text-xs text-red-600 font-mono break-words">
                          <span className="font-bold mr-2">Error:</span>
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-indigo-700 rounded-xl p-8 text-white relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 opacity-20">
             <span className="text-9xl">☁️</span>
          </div>
          <h3 className="font-bold text-xl mb-3 relative z-10">Cloud Infrastructure</h3>
          <p className="text-indigo-100 mb-8 relative z-10 max-w-sm">
            Optimized for A100 GPU clusters with horizontal autoscaling.
          </p>
          <div className="bg-indigo-900/50 backdrop-blur rounded border border-indigo-500/30 p-3 font-mono text-sm inline-flex items-center gap-3 relative z-10">
            <span className="text-indigo-300">$</span> deploy --cluster=prod-us-east-1
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-8 text-slate-300 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">Interface Configuration</h3>
            <span className="text-xs font-mono text-slate-500">v{(model.versions && model.versions.length > 0 ? [...model.versions].sort((a: ModelVersion, b: ModelVersion) => b.versionNumber - a.versionNumber)[0].versionNumber : 1)}</span>
          </div>
          <div className="flex-1 overflow-auto space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase">Example Payload Input</p>
              <pre className="text-xs font-mono leading-relaxed text-indigo-200 bg-slate-800/50 p-3 rounded border border-slate-800 whitespace-pre-wrap">
                {(model.versions && model.versions.length > 0 && [...model.versions].sort((a: ModelVersion, b: ModelVersion) => b.versionNumber - a.versionNumber)[0].examplePayload) || 'Not provided'}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase">Expected Prediction Result</p>
              <pre className="text-xs font-mono leading-relaxed text-indigo-200 bg-slate-800/50 p-3 rounded border border-slate-800 whitespace-pre-wrap">
                {(model.versions && model.versions.length > 0 && [...model.versions].sort((a: ModelVersion, b: ModelVersion) => b.versionNumber - a.versionNumber)[0].expectedResult) || 'Not provided'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {showVersionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">Upload New Version</h2>
              <button onClick={() => setShowVersionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 mb-4 bg-primary-50 p-3 rounded text-primary-700">
                You only need to upload the files that have changed. Any files left empty will be automatically carried over from the previous version, saving storage and time!
              </p>
              
              <div className={`border border-dashed rounded-lg p-3 flex items-center gap-4 transition-colors relative ${modelFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 hover:bg-slate-50'}`}>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.length) setModelFile(e.target.files[0]); }} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${modelFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {modelFile ? <CheckCircle2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${modelFile ? 'text-emerald-700' : 'text-slate-700'}`}>{modelFile ? `Attached: ${modelFile.name}` : 'Model Bundle (e.g. model.pkl)'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave empty to use previous version's file</p>
                </div>
              </div>

              <div className={`border border-dashed rounded-lg p-3 flex items-center gap-4 transition-colors relative ${scalerFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 hover:bg-slate-50'}`}>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.length) setScalerFile(e.target.files[0]); }} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${scalerFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {scalerFile ? <CheckCircle2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${scalerFile ? 'text-emerald-700' : 'text-slate-700'}`}>{scalerFile ? `Attached: ${scalerFile.name}` : 'Scaler Bundle (e.g. scaler.pkl)'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave empty to use previous version's file</p>
                </div>
              </div>

              <div className={`border border-dashed rounded-lg p-3 flex items-center gap-4 transition-colors relative ${preprocessFile ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-300 hover:bg-slate-50'}`}>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.length) setPreprocessFile(e.target.files[0]); }} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${preprocessFile ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {preprocessFile ? <CheckCircle2 className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${preprocessFile ? 'text-indigo-700' : 'text-slate-700'}`}>{preprocessFile ? `Attached: ${preprocessFile.name}` : 'Pre-processing Script (preprocess.py)'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave empty to use previous version's file</p>
                </div>
              </div>

              <div className={`border border-dashed rounded-lg p-3 flex items-center gap-4 transition-colors relative ${postprocessFile ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-300 hover:bg-slate-50'}`}>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.length) setPostprocessFile(e.target.files[0]); }} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${postprocessFile ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {postprocessFile ? <CheckCircle2 className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${postprocessFile ? 'text-indigo-700' : 'text-slate-700'}`}>{postprocessFile ? `Attached: ${postprocessFile.name}` : 'Post-processing Script (postprocess.py)'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave empty to use previous version's file</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <p className="text-sm font-bold text-slate-800 mb-4">Interface Configuration</p>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="form-label text-xs">Example Payload Input (Optional if unchanged)</label>
                    <textarea className="form-input text-xs font-mono h-24" value={examplePayload} onChange={(e) => setExamplePayload(e.target.value)} placeholder="Leave empty to use previous version's payload..." />
                  </div>
                  <div>
                    <label className="form-label text-xs">Expected Prediction Result (Optional if unchanged)</label>
                    <textarea className="form-input text-xs font-mono h-24" value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} placeholder="Leave empty to use previous version's expected result..." />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowVersionModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
              <button onClick={handleUploadVersion} disabled={isUploading} className={`px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 transition-all ${isUploading ? 'opacity-70 cursor-wait' : ''}`}>
                {isUploading ? 'Uploading...' : <><UploadCloud className="w-4 h-4" /> Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ModelDetails;
