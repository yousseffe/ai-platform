import React from "react";
import { Activity } from "lucide-react";

/**
 * Renders cluster hardware metrics and active model quantization recommendations.
 *
 * @returns The React component layout showing GPU and storage resource utilization.
 */
export function ResourceUtilization() {
  return (
    <div className="flex flex-col gap-6">
      {/* Resource Utilization Cards */}
      <div className="card">
        <h3 className="font-bold text-slate-800 mb-5">Resource Utilization</h3>
        
        {/* GPU Clusters */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600 font-medium">GPU Clusters</span>
            <span className="text-slate-900 font-semibold">78%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-primary-500 h-2 rounded-full" style={{ width: "78%" }}></div>
          </div>
        </div>
        
        {/* Storage S3 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600 font-medium">Storage S3</span>
            <span className="text-slate-900 font-semibold">42%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-primary-500 h-2 rounded-full" style={{ width: "42%" }}></div>
          </div>
        </div>
      </div>

      {/* Optimizations Alert Box */}
      <div className="card bg-indigo-50 border-indigo-100">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Optimizations Available</h4>
            <p className="text-xs text-slate-600 mt-1 mb-3">3 models could be quantized to INT8 for better performance.</p>
            <button 
              type="button" 
              className="w-full bg-white border border-indigo-200 text-indigo-700 text-sm font-medium py-2 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              View Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
