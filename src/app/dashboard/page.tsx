"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { AvailabilityHeatmap } from "@/components/dashboard/AvailabilityHeatmap";
import { ReassignmentPanel } from "@/components/dashboard/ReassignmentPanel";
import { computeWorkloadScore } from "@/lib/workload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, CheckSquare, Zap } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
  high:     { label: "High",     className: "bg-orange-100 text-orange-700 border-orange-200" },
  medium:   { label: "Medium",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low:      { label: "Low",      className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function DashboardPage() {
  useUser();

  const me = useQuery(api.users.getMe);
  const atRiskTasks = useQuery(api.tasks.getAtRiskTasks);
  const allTasks = useQuery(api.tasks.getAllTasks);
  const teamMembers = useQuery(api.users.getTeamMembers);

  const overloadedMembers = (teamMembers ?? []).filter(
    (m) => m.workloadScore > 80
  );

  const activeTasks = (allTasks ?? []).filter((t) => t.status !== "done");

  // computeWorkloadScore used to get live score per member for the risk feed assignee context
  function getMemberLiveScore(memberId: string): number {
    const memberTasks = (allTasks ?? []).filter(
      (t) => (t.assigneeId as string) === memberId
    );
    return computeWorkloadScore(memberTasks);
  }

  const stats = [
    {
      label: "Team Members",
      value: teamMembers?.length ?? "—",
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Active Tasks",
      value: activeTasks.length,
      icon: CheckSquare,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "At-Risk Tasks",
      value: atRiskTasks?.length ?? "—",
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      label: "Overloaded Members",
      value: overloadedMembers.length,
      icon: Zap,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Nobody drops the ball — Coverly keeps your team covered.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Availability heatmap — left 2 cols */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800">
                  Team Availability — Next 2 Weeks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <AvailabilityHeatmap />
              </CardContent>
            </Card>
          </div>

          {/* AI reassignment panel — right 1 col */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm border-blue-200 border-2 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  AI Coverage Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ReassignmentPanel managerId={(me?._id as string) ?? ""} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Deadline risk feed */}
        {atRiskTasks && atRiskTasks.length > 0 && (
          <Card className="bg-white shadow-sm border-red-200 border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Deadline Risk Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {atRiskTasks.map((task) => {
                  const assignee = teamMembers?.find(
                    (m) => (m._id as string) === task.assigneeId
                  );
                  const liveScore = assignee
                    ? getMemberLiveScore(assignee._id as string)
                    : 0;
                  const priority = PRIORITY_CONFIG[task.priority];

                  return (
                    <div
                      key={task._id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                          <span>
                            {assignee?.name ?? "Unassigned"}
                            {assignee && (
                              <span
                                className={`ml-1 font-medium ${
                                  liveScore > 80
                                    ? "text-red-600"
                                    : "text-gray-400"
                                }`}
                              >
                                ({liveScore}%)
                              </span>
                            )}
                          </span>
                          <span>·</span>
                          <span>
                            Due {format(new Date(task.deadline), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`flex-shrink-0 text-xs font-medium border ${priority?.className ?? ""}`}
                      >
                        {priority?.label ?? task.priority}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
