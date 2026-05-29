import React from "react";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

/**
 * Renders cluster hardware metrics and active model quantization recommendations using Shadcn UI.
 *
 * @returns The React component layout showing GPU and storage resource utilization.
 */
export function ResourceUtilization() {
  return (
    <div className="flex flex-col gap-6">
      {/* Resource Utilization Cards */}
      <Card className="border border-slate-200 shadow-sm p-0">
        <CardHeader className="p-5 pb-0 border-none">
          <CardTitle className="font-bold text-slate-800 text-base">Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-4 space-y-4">
          {/* GPU Clusters */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600 font-medium">GPU Clusters</span>
              <span className="text-slate-900 font-semibold">78%</span>
            </div>
            <Progress value={78} className="h-2 bg-slate-100" />
          </div>
          
          {/* Storage S3 */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600 font-medium">Storage S3</span>
              <span className="text-slate-900 font-semibold">42%</span>
            </div>
            <Progress value={42} className="h-2 bg-slate-100" />
          </div>
        </CardContent>
      </Card>

      {/* Optimizations Alert Box */}
      <Card className="bg-indigo-50 border-indigo-100 shadow-sm p-0">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">Optimizations Available</h4>
              <p className="text-xs text-slate-600 mt-1 mb-3">3 models could be quantized to INT8 for better performance.</p>
              <Button 
                type="button" 
                variant="outline"
                className="w-full bg-white border border-indigo-200 text-indigo-700 text-sm font-medium py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                View Recommendations
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
