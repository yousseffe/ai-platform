import React from "react";
import { Database, GitCommit, Box } from "lucide-react";

/**
 * Renders static features / badges highlighting deployment runtime configurations.
 *
 * @returns The React component layout for deployment system features.
 */
export function FeatureBadges() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-200">
      <div className="flex gap-4">
        <div className="text-indigo-600 shrink-0 mt-1">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Automated Storage</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Files are automatically synced to high-availability S3 buckets for production access.
          </p>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="text-indigo-600 shrink-0 mt-1">
          <GitCommit className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Versioning</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            We automatically generate semantic versions (SemVer) for every unique artifact bundle.
          </p>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="text-indigo-600 shrink-0 mt-1">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Containerized Runtimes</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Scripts are validated against our standard Python 3.10 production runtime images.
          </p>
        </div>
      </div>
    </div>
  );
}
