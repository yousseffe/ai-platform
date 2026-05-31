"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

/**
 * ContributionsHeatmap component rendering a Git-style heatmap grid.
 * Simulates inference requests and model training operations over a rolling year.
 *
 * @returns The React component showing execution logs visually.
 */
export default function ContributionsHeatmap() {
  // Generate 53 weeks x 7 days = 371 cells
  const data = useMemo(() => {
    const cells = [];
    const seed = 0.65; // bias towards some activity
    for (let i = 0; i < 371; i++) {
      // Pure deterministic pseudo-random generator
      const x = Math.sin(i + 12345) * 10000;
      const rand = x - Math.floor(x);
      
      let level = 0;
      if (rand > seed) {
        if (rand > 0.95) level = 4;
        else if (rand > 0.85) level = 3;
        else if (rand > 0.75) level = 2;
        else level = 1;
      }
      cells.push(level);
    }
    return cells;
  }, []);

  const totalExecutions = useMemo(() => {
    // sum up mock execution quantities
    return data.reduce((acc, level) => {
      const multiplier = level === 4 ? 42 : level === 3 ? 24 : level === 2 ? 12 : level === 1 ? 4 : 0;
      return acc + multiplier;
    }, 0) + 1240; // baseline offset
  }, [data]);

  // Color mappings matching GitHub Dark contribution grids
  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-[#0e4429]"; // L1 Green
      case 2:
        return "bg-[#006d32]"; // L2 Green
      case 3:
        return "bg-[#26a641]"; // L3 Green
      case 4:
        return "bg-[#39d353]"; // L4 Green (brightest)
      default:
        return "bg-[#ebedf0] dark:bg-background border border-[#d0d7de]/20 dark:border-border/20"; // Empty cell
    }
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className="border border-border p-0 overflow-hidden">
      <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="font-bold text-foreground text-sm flex items-center gap-1.5 font-mono">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Platform Inference Activity
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            Rolling metrics for model version executions and deployment workloads.
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-emerald-400 font-mono">
            {totalExecutions.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground block font-mono">inferences this year</span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex gap-2 items-start overflow-x-auto pb-2 scrollbar-thin">
          {/* Day Labels */}
          <div className="grid grid-rows-7 gap-[3px] text-[9px] text-muted-foreground pr-1 pt-4 font-mono select-none">
            {days.map((d, i) => (
              <div key={d} className="h-[9px] leading-[9px] flex items-center justify-end">
                {i % 2 === 1 ? d : ""}
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          <div className="flex flex-col gap-1 w-full">
            {/* Months labels */}
            <div className="flex justify-between text-[9px] text-muted-foreground px-2 font-mono select-none mb-1">
              <span>Jun</span>
              <span>Aug</span>
              <span>Oct</span>
              <span>Dec</span>
              <span>Feb</span>
              <span>Apr</span>
              <span>Jun</span>
            </div>

            <div className="grid grid-flow-col grid-rows-7 gap-[3px] auto-cols-max">
              {data.map((level, idx) => (
                <div
                  key={idx}
                  className={`w-[9px] h-[9px] rounded-[1.5px] transition-all hover:scale-125 hover:ring-1 hover:ring-primary ${getCellColor(
                    level
                  )}`}
                  title={`Level ${level} activity`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 text-[9px] text-muted-foreground mt-4 font-mono select-none">
          <span>Less</span>
          <div className="w-[9px] h-[9px] rounded-[1.5px] bg-[#ebedf0] dark:bg-background border border-[#d0d7de]/20 dark:border-border/20" />
          <div className="w-[9px] h-[9px] rounded-[1.5px] bg-[#0e4429]" />
          <div className="w-[9px] h-[9px] rounded-[1.5px] bg-[#006d32]" />
          <div className="w-[9px] h-[9px] rounded-[1.5px] bg-[#26a641]" />
          <div className="w-[9px] h-[9px] rounded-[1.5px] bg-[#39d353]" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
