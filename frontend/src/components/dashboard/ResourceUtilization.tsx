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
      <Card className="border border-border bg-card p-0">
        <CardHeader className="p-5 pb-0 border-none">
          <CardTitle className="font-bold text-foreground text-sm font-mono">Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-4 space-y-4 font-mono">
          {/* GPU Clusters */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">GPU Clusters</span>
              <span className="text-foreground font-semibold">78%</span>
            </div>
            <Progress value={78} className="h-2 bg-background border border-border" />
          </div>
          
          {/* Storage S3 */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Storage S3</span>
              <span className="text-foreground font-semibold">42%</span>
            </div>
            <Progress value={42} className="h-2 bg-background border border-border" />
          </div>
        </CardContent>
      </Card>

      {/* Optimizations Alert Box */}
      <Card className="bg-primary/10 border-primary/20 shadow-sm p-0">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1 font-mono">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wide">Optimizations Available</h4>
              <p className="text-[11px] text-muted-foreground mt-1 mb-3 leading-relaxed">
                3 models could be quantized to INT8 format for improved throughput and lower cost.
              </p>
              <Button 
                type="button" 
                variant="outline"
                className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-foreground text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
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
