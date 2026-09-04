"use client";

import React from "react";
import { Sparkles, Repeat, AlertTriangle, Gift, Building2, Recycle } from "lucide-react";

export type SectionTab = 
  | "manage-waste"
  | "circular-exchange"
  | "report-issue"
  | "eco-rewards"
  | "recycler-dashboard"
  | "municipality-dashboard";

interface NavigationTabsProps {
  activeTab: SectionTab;
  onSelectTab: (tab: SectionTab) => void;
  currentRole: "citizen" | "recycler" | "municipality";
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const tabs = [
    {
      id: "manage-waste" as SectionTab,
      label: "Manage My Waste",
      icon: Sparkles,
      description: "AI Decision: REUSE, RECYCLE, or SAFE DISPOSAL",
      badge: "AI Action",
      role: "citizen",
    },
    {
      id: "circular-exchange" as SectionTab,
      label: "Circular Exchange",
      icon: Repeat,
      description: "Give away & request usable pre-loved items",
      role: "citizen",
    },
    {
      id: "report-issue" as SectionTab,
      label: "Report Waste Issue",
      icon: AlertTriangle,
      description: "Photo report dumping to municipal team",
      badge: "+50 Pts",
      role: "citizen",
    },
    {
      id: "eco-rewards" as SectionTab,
      label: "Eco Points & Rewards",
      icon: Gift,
      description: "Track eco score & redeem vouchers",
      role: "citizen",
    },
    {
      id: "recycler-dashboard" as SectionTab,
      label: "Recycler Dashboard",
      icon: Recycle,
      description: "Recycler portal for accepting plastic & metal pickups",
      badge: "Recyclers",
      role: "recycler",
    },
    {
      id: "municipality-dashboard" as SectionTab,
      label: "Municipality Dashboard",
      icon: Building2,
      description: "Authority triage, maps & safe disposal queue",
      badge: "Authority",
      role: "municipality",
    },
  ];

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-2.5 scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/50"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? "text-emerald-100" : "text-slate-400 group-hover:text-emerald-400"
                  }`}
                />
                <span className="whitespace-nowrap">{tab.label}</span>

                {tab.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? "bg-emerald-800/80 text-emerald-100"
                        : "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {isActive && (
                  <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-400 rounded-t-full hidden sm:block" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
