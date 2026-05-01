import { useState } from 'react';
import { UploadCloud, FileJson, ArrowRight, ShieldCheck, Database, GitCommit, Box, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const UploadModel = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [scalerFile, setScalerFile] = useState<File | null>(null);
  const [preprocessFile, setPreprocessFile] = useState<File | null>(null);
  const [postprocessFile, setPostprocessFile] = useState<File | null>(null);
  const [preprocessCode, setPreprocessCode] = useState('');
  const [postprocessCode, setPostprocessCode] = useState('');
  const [preprocessMode, setPreprocessMode] = useState<'file' | 'code'>('file');
  const [postprocessMode, setPostprocessMode] = useState<'file' | 'code'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [examplePayload, setExamplePayload] = useState(`{
  "input_data": [
    "features": [
      {
        "name": "transaction_amount",
        "value": 150.25
      },
      {
        "name": "merchant_category",
        "value": "retail"
      }
    ]
  ]
}`);
  const [expectedResult, setExpectedResult] = useState(`{
  "status": "success",
  "predictions": [
    {
      "class": "legit",
      "probability": 0.985,
      "metadata": {
        "model_version": "v1.2.0",
        "latency_ms": 12
      }
    }
  ]
}`);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Upload Model Artifacts</h1>
        <p className="text-slate-500 mt-1">Initialize your production environment by uploading your pre-trained model and support scripts.</p>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className="card border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">1</div>
            <h2 className="text-lg font-bold text-slate-800">General Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="form-label text-xs">Model Name</label>
              <input type="text" className="form-input" placeholder="e.g. demand-forecast-v1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="form-label text-xs">Model Tags</label>
              <input type="text" className="form-input" placeholder="e.g. regression, pytorch, finance" />
            </div>
          </div>
          <div>
            <label className="form-label text-xs">Description</label>
            <textarea className="form-input h-24 resize-none" placeholder="Describe the model's purpose, training data, and intended use cases..." value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
          </div>
        </div>

        {/* Step 2 */}
        <div className="card border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">2</div>
            <h2 className="text-lg font-bold text-slate-800">Artifacts & Scripts</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className={`border border-dashed rounded-xl p-8 flex flex-col items-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group ${modelFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300'}`}>
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.length) setModelFile(e.target.files[0]); }} />
               <div className="absolute top-3 left-4 flex gap-2">
                 <span className="text-[10px] font-bold text-slate-800 tracking-wider">MODEL BUNDLE (model.pkl)</span>
                 <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded">REQUIRED</span>
               </div>
               <span className="absolute top-3 right-4 text-[10px] text-slate-400">Max size: 5GB</span>
               
               <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mt-4 group-hover:scale-110 transition-transform ${modelFile ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-500'}`}>
                 {modelFile ? <ShieldCheck className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
               </div>
               <p className={`text-sm font-semibold ${modelFile ? 'text-emerald-700' : 'text-slate-700'}`}>{modelFile ? `Attached: ${modelFile.name}` : 'Click to upload'}</p>
               <p className="text-xs text-slate-400 mt-1">Pickle, ONNX, or H5 format</p>
            </div>

            <div className={`border border-dashed rounded-xl p-8 flex flex-col items-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group ${scalerFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300'}`}>
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.length) setScalerFile(e.target.files[0]); }} />
               <div className="absolute top-3 left-4 flex gap-2">
                 <span className="text-[10px] font-bold text-slate-800 tracking-wider">SCALER BUNDLE (scaler.pkl)</span>
                 <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">OPTIONAL</span>
               </div>
               <span className="absolute top-3 right-4 text-[10px] text-slate-400">Max size: 500MB</span>
               
               <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mt-4 group-hover:scale-110 transition-transform ${scalerFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                 {scalerFile ? <ShieldCheck className="w-6 h-6" /> : <span className="text-xl">⌛</span>}
               </div>
               <p className={`text-sm font-semibold ${scalerFile ? 'text-emerald-700' : 'text-slate-700'}`}>{scalerFile ? `Attached: ${scalerFile.name}` : 'Upload scaler object'}</p>
               <p className="text-xs text-slate-400 mt-1">Essential for data normalization</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="border border-slate-200 rounded-lg overflow-hidden relative flex flex-col">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-800 tracking-wider">PRE-PROCESSING (preprocess.py)</span>
                  <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                    <button className={`px-3 py-1 text-[10px] font-bold rounded ${preprocessMode === 'file' ? 'bg-primary-50 text-primary-700' : 'text-slate-500'}`} onClick={() => setPreprocessMode('file')}>FILE</button>
                    <button className={`px-3 py-1 text-[10px] font-bold rounded ${preprocessMode === 'code' ? 'bg-primary-50 text-primary-700' : 'text-slate-500'}`} onClick={() => setPreprocessMode('code')}>CODE</button>
                  </div>
                </div>
                {preprocessMode === 'file' ? (
                  <div className={`p-6 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors relative ${preprocessFile ? 'bg-emerald-50/30' : ''}`}>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.length) setPreprocessFile(e.target.files[0]); }} />
                    <div className={`w-10 h-10 rounded border flex items-center justify-center shrink-0 ${preprocessFile ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-500'}`}>
                      {preprocessFile ? <ShieldCheck className="w-5 h-5" /> : <span className="font-mono font-bold text-xs">&lt;/&gt;</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${preprocessFile ? 'text-emerald-700' : 'text-slate-700'}`}>{preprocessFile ? `Attached: ${preprocessFile.name}` : 'Upload preprocess.py'}</p>
                      <p className="text-xs text-slate-400">Define your feature engineering logic here.</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-400">
                      <Plus className="w-3 h-3" />
                    </div>
                  </div>
                ) : (
                  <textarea 
                    className="w-full bg-slate-900 text-indigo-200 font-mono text-xs p-4 h-32 resize-none focus:outline-none" 
                    placeholder="def preprocess(data):&#10;    # Your logic here&#10;    return data"
                    value={preprocessCode}
                    onChange={(e) => setPreprocessCode(e.target.value)}
                  />
                )}
             </div>

             <div className="border border-slate-200 rounded-lg overflow-hidden relative flex flex-col">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-800 tracking-wider">POST-PROCESSING (postprocess.py)</span>
                  <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                    <button className={`px-3 py-1 text-[10px] font-bold rounded ${postprocessMode === 'file' ? 'bg-primary-50 text-primary-700' : 'text-slate-500'}`} onClick={() => setPostprocessMode('file')}>FILE</button>
                    <button className={`px-3 py-1 text-[10px] font-bold rounded ${postprocessMode === 'code' ? 'bg-primary-50 text-primary-700' : 'text-slate-500'}`} onClick={() => setPostprocessMode('code')}>CODE</button>
                  </div>
                </div>
                {postprocessMode === 'file' ? (
                  <div className={`p-6 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors relative ${postprocessFile ? 'bg-emerald-50/30' : ''}`}>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.length) setPostprocessFile(e.target.files[0]); }} />
                    <div className={`w-10 h-10 rounded border flex items-center justify-center shrink-0 ${postprocessFile ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-500'}`}>
                      {postprocessFile ? <ShieldCheck className="w-5 h-5" /> : <FileJson className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${postprocessFile ? 'text-emerald-700' : 'text-slate-700'}`}>{postprocessFile ? `Attached: ${postprocessFile.name}` : 'Upload postprocess.py'}</p>
                      <p className="text-xs text-slate-400">Handle inference results and formatting.</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-400">
                      <Plus className="w-3 h-3" />
                    </div>
                  </div>
                ) : (
                  <textarea 
                    className="w-full bg-slate-900 text-indigo-200 font-mono text-xs p-4 h-32 resize-none focus:outline-none" 
                    placeholder="def postprocess(prediction):&#10;    # Your logic here&#10;    return prediction"
                    value={postprocessCode}
                    onChange={(e) => setPostprocessCode(e.target.value)}
                  />
                )}
             </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="card border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">3</div>
            <h2 className="text-lg font-bold text-slate-800">Interface Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label text-xs mb-3">EXAMPLE PAYLOAD INPUT</label>
              <textarea
                className="w-full bg-slate-900 rounded-xl p-4 text-indigo-200 font-mono text-xs resize-y h-48 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={examplePayload}
                onChange={(e) => setExamplePayload(e.target.value)}
                spellCheck="false"
              />
              <p className="text-[11px] text-slate-400 mt-2">Provide a sample request structure to help users understand the API interface.</p>
            </div>
            
            <div>
              <label className="form-label text-xs mb-3">EXPECTED PREDICTION RESULT</label>
              <textarea
                className="w-full bg-slate-900 rounded-xl p-4 text-indigo-200 font-mono text-xs resize-y h-48 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                spellCheck="false"
              />
              <p className="text-[11px] text-slate-400 mt-2">Define the schema for successful model inference responses.</p>
            </div>
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="mt-8 bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-indigo-900">{uploadStatus}</span>
            <span className="text-sm font-bold text-indigo-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">Your artifacts are being pushed to the background worker queue.</p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          Artifacts will be scanned for security and integrity before deployment.
        </div>
        <div className="flex items-center gap-4">
          <button className="text-slate-600 font-medium px-4 hover:text-slate-800" onClick={() => navigate('/models')} disabled={isUploading}>Cancel</button>
          <button 
            className={`btn-primary py-2.5 px-6 flex items-center gap-2 transition-all ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
            disabled={isUploading || !name || !modelFile}
            onClick={async () => {
              setIsUploading(true);
              setUploadStatus('Initializing model registry entry...');
              setUploadProgress(10);
              try {
                const res = await api.post('/models', { name, description });
                const modelId = res.data.id;
                const formData = new FormData();
                if (modelFile) formData.append('model', modelFile);
                if (scalerFile) formData.append('scaler', scalerFile);
                if (preprocessMode === 'file' && preprocessFile) {
                  formData.append('preprocess', preprocessFile);
                } else if (preprocessMode === 'code' && preprocessCode.trim()) {
                  const blob = new Blob([preprocessCode], { type: 'text/plain' });
                  formData.append('preprocess', blob, 'preprocess.py');
                }
                if (postprocessMode === 'file' && postprocessFile) {
                  formData.append('postprocess', postprocessFile);
                } else if (postprocessMode === 'code' && postprocessCode.trim()) {
                  const blob = new Blob([postprocessCode], { type: 'text/plain' });
                  formData.append('postprocess', blob, 'postprocess.py');
                }
                
                formData.append('examplePayload', examplePayload);
                formData.append('expectedResult', expectedResult);
                
                setUploadStatus('Transferring artifacts to remote storage...');
                await api.post(`/models/${modelId}/versions`, formData, { 
                  headers: { 'Content-Type': 'multipart/form-data' },
                  onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                      const percentCompleted = Math.round((progressEvent.loaded * 80) / progressEvent.total);
                      setUploadProgress(10 + percentCompleted);
                    }
                  }
                });
                
                setUploadStatus('Artifacts queued for containerization!');
                setUploadProgress(100);
                setTimeout(() => navigate(`/models/${modelId}`), 800);
              } catch (e) {
                console.error(e);
                alert('Upload failed');
                setIsUploading(false);
                setUploadProgress(0);
              }
            }}
          >
            {isUploading ? 'Processing...' : 'Submit to Queue'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-200">
        <div className="flex gap-4">
          <div className="text-indigo-600 shrink-0 mt-1"><Database className="w-5 h-5"/></div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Automated Storage</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Files are automatically synced to high-availability S3 buckets for production access.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-indigo-600 shrink-0 mt-1"><GitCommit className="w-5 h-5"/></div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Versioning</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">We automatically generate semantic versions (SemVer) for every unique artifact bundle.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-indigo-600 shrink-0 mt-1"><Box className="w-5 h-5"/></div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Containerized Runtimes</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Scripts are validated against our standard Python 3.10 production runtime images.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default UploadModel;
