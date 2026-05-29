"use client";

import React from "react";
import { Wallet, CreditCard, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Step 3 of Organization Creation: Financial wallet/ledger accounts overview.
 * Migrated to Shadcn UI components.
 *
 * @returns The React component rendering the ledger summary.
 */
export default function StepFinancialWallet() {
  return (
    <div className="space-y-5 animate-fade-in text-center py-4">
      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-2">
        <Wallet className="w-7 h-7" />
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm mb-1">Unified Ledger Initialization</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Your organization workspace includes dedicated Consumer (spend) and Provider (earn) ledger accounts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mt-2">
        <Card className="border border-slate-200 bg-slate-50 p-0 text-left">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Free Credits</span>
            </div>
            <p className="text-xl font-bold text-slate-800">$100.00</p>
            <p className="text-[9px] text-slate-500 mt-1">Consumer wallet start credit</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-slate-50 p-0 text-left">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Revenue Account</span>
            </div>
            <p className="text-xl font-bold text-slate-800">$0.00</p>
            <p className="text-[9px] text-slate-500 mt-1">Provider revenue withdraws</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
