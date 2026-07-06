"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, ShieldAlert, Calendar, CreditCard, UserCheck, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export interface Subscriber {
  id: string;
  ownerName: string;
  ownerEmail: string;
  tierName: string;
  status: string;
  billingCycle: string;
  price: number;
  lastPaymentAt: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  totalPaidEgp: number;
}

interface SubscribersOverviewProps {
  subscribers: Subscriber[];
}

export default function SubscribersOverview({ subscribers }: SubscribersOverviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = subscribers.filter((sub) => {
    const matchesSearch =
      sub.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.tierName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && sub.status.toUpperCase() === "ACTIVE") ||
      (statusFilter === "SUSPENDED" && sub.status.toUpperCase() === "SUSPENDED") ||
      (statusFilter === "EXPIRING" && sub.daysRemaining !== null && sub.daysRemaining <= 5);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Search and filter controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between font-sans relative z-10">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search subscribers by name, email, plan..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/80 bg-card text-foreground text-xs outline-hidden focus:border-primary transition-all font-sans"
          />
        </div>
        <div className="flex gap-1.5 border border-border/80 rounded-xl p-1 bg-secondary/35 backdrop-blur-md">
          {["ALL", "ACTIVE", "EXPIRING", "SUSPENDED"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer hover-lift active-shrink ${
                statusFilter === f
                  ? "bg-card text-foreground border border-border/80 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Subscribers Table Card */}
      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl overflow-hidden hover-lift transition-all duration-300">
        <CardHeader className="pb-3 border-b border-border/80 bg-muted/20 px-5 py-4 flex flex-row items-center justify-between">
          <div className="text-left space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground">Registered Subscriptions Ledger</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground font-sans">
              Tracking provider plan subscriptions, contract values, and expiration day counters.
            </CardDescription>
          </div>
          <Calendar className="w-4 h-4 text-muted-foreground/50" />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground font-sans text-xs">
              <UserCheck className="w-8 h-8 text-muted-foreground/45 mb-2.5 animate-pulse" />
              <span>No subscriber entries found matching current filter.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-b border-border/80 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <TableHead className="px-5 py-3">Provider Subscriber</TableHead>
                  <TableHead className="px-5 py-3">Plan Definition</TableHead>
                  <TableHead className="px-5 py-3">Rate / Interval</TableHead>
                  <TableHead className="px-5 py-3">Last Payment</TableHead>
                  <TableHead className="px-5 py-3">Expiration Date</TableHead>
                  <TableHead className="px-5 py-3">Days Remaining</TableHead>
                  <TableHead className="px-5 py-3 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => {
                  const daysVal = sub.daysRemaining;
                  const isExpiringSoon = daysVal !== null && daysVal <= 5;
                  const isExpired = daysVal !== null && daysVal === 0;

                  // Initials block for subscriber avatar icon
                  const initials = sub.ownerName
                    ? sub.ownerName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
                    : "U";

                  return (
                    <TableRow key={sub.id} className="hover:bg-muted/25 transition-all">
                      <TableCell className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-foreground">{sub.ownerName}</span>
                            <span className="text-[9px] text-muted-foreground select-all mt-0.5">
                              {sub.ownerEmail}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20 dark:bg-primary/5">
                          {sub.tierName.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-foreground font-bold">
                          <CreditCard className="w-3.5 h-3.5 text-muted-foreground/75" />
                          {sub.price} EGP <span className="text-[9px] text-muted-foreground font-normal">/ {sub.billingCycle.toLowerCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground">
                        {sub.lastPaymentAt ? new Date(sub.lastPaymentAt).toLocaleDateString() : "Never Paid"}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-muted-foreground">
                        {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "Lifetime Plan"}
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        {daysVal === null ? (
                          <span className="text-muted-foreground font-bold">∞</span>
                        ) : isExpired ? (
                          <span className="text-red-500 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="text-amber-500 font-bold flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {daysVal} days left
                          </span>
                        ) : (
                          <span className="text-foreground font-bold">{daysVal} days</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold ${
                            sub.status.toUpperCase() === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25"
                              : "bg-red-500/15 text-red-500 border border-red-500/25"
                          }`}
                        >
                          <span className={`h-1 w-1 rounded-full ${sub.status.toUpperCase() === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"}`} />
                          {sub.status.toUpperCase()}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
