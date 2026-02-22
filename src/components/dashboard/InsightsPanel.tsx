"use client";

import { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Users,
  Zap,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type InsightType = "workload" | "risk" | "efficiency" | "capacity" | "calendar";
type InsightPriority = "high" | "medium" | "low";

interface Insight {
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  affectedMembers: string[];
  action?: string;
}

interface InsightsPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teamData: { members: any[]; tasks: any[]; availability: any[] };
}

const TYPE_CONFIG: Record<
  InsightType,
  {
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>;
    bg: string;
    border: string;
    text: string;
    iconColor: string;
  }
> = {
  workload:   { label: "Workload",  icon: Users,          bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    iconColor: "text-blue-500"    },
  risk:       { label: "Risk",      icon: AlertTriangle,  bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     iconColor: "text-red-500"     },
  efficiency: { label: "Efficiency",icon: TrendingUp,     bg: "bg-purple-50",  border: "border-purple-200",  text: "text-purple-700",  iconColor: "text-purple-500"  },
  capacity:   { label: "Capacity",  icon: Zap,            bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", iconColor: "text-emerald-500" },
  calendar:   { label: "Calendar",  icon: Calendar,       bg: "bg-yellow-50",  border: "border-yellow-200",  text: "text-yellow-700",  iconColor: "text-yellow-500"  },
};

const PRIORITY_BADGE: Record<InsightPriority, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-gray-100 text-gray-500",
};

export function InsightsPanel({ teamData }: InsightsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setInsights([]);
    setExpandedIndex(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInsights(data.suggestions ?? []);
    } catch {
      setError("Failed to generate insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          AI-powered analysis of your team&apos;s workload, risks, and opportunities.
        </p>
        <Button
          onClick={handleAnalyze}
          disabled={loading}
          size="sm"
          className="gap-1.5 flex-shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? "Analyzing..." : insights.length > 0 ? "Re-analyze" : "Analyze Team"}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-2 py-10">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-xs text-gray-400">Analyzing your team&hellip;</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Insight cards */}
      {!loading && insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, i) => {
            const config = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.workload;
            const Icon = config.icon;
            const isExpanded = expandedIndex === i;

            return (
              <div
                key={i}
                className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden`}
              >
                {/* Header row — always visible */}
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${config.iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${config.text}`}>
                        {insight.title}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          PRIORITY_BADGE[insight.priority] ?? PRIORITY_BADGE.low
                        }`}
                      >
                        {insight.priority}
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {insight.description}
                      </p>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform duration-150 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2.5">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {insight.description}
                    </p>

                    {insight.affectedMembers?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                          Affects:
                        </span>
                        {insight.affectedMembers.map((name) => (
                          <Badge
                            key={name}
                            className="text-[10px] bg-white border border-gray-200 text-gray-600 font-medium"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {insight.action && (
                      <div className="rounded-md bg-white/70 border border-gray-200 px-3 py-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          Suggested action
                        </p>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {insight.action}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && insights.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <Sparkles className="h-6 w-6 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Click &ldquo;Analyze Team&rdquo; to get AI insights about your team&apos;s
            workload, risks, and opportunities.
          </p>
        </div>
      )}
    </div>
  );
}
