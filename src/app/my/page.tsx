"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AvailabilityPicker } from "@/components/member/AvailabilityPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  computeWorkloadScore,
  getWorkloadLabel,
  getWorkloadColor,
} from "@/lib/workload";
import { CalendarOff, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_CONFIG: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:      "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_CONFIG: Record<string, string> = {
  todo:        "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  blocked:     "bg-red-100 text-red-700",
  done:        "bg-emerald-100 text-emerald-700",
};

const STATUS_LABELS: Record<string, string> = {
  todo:        "To Do",
  in_progress: "In Progress",
  blocked:     "Blocked",
  done:        "Done",
};

export default function MyPage() {
  const me = useQuery(api.users.getMe);
  const myTasks = useQuery(
    api.tasks.getTasksByAssignee,
    me ? { assigneeId: me._id as string } : "skip"
  );

  const activeTasks = (myTasks ?? []).filter((t) => t.status !== "done");
  const workloadScore = computeWorkloadScore(activeTasks);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {me?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your workload:{" "}
            <span className={`font-semibold ${getWorkloadColor(workloadScore)}`}>
              {getWorkloadLabel(workloadScore)} ({workloadScore}/100)
            </span>
          </p>
        </div>

        {/* 5-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left 3 cols — My Tasks */}
          <div className="md:col-span-3">
            <Card className="bg-white shadow-sm h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-gray-500" />
                  My Tasks ({activeTasks.length} active)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {activeTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-400">
                      No active tasks — you&apos;re all clear! 🎉
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTasks.map((task) => (
                      <div
                        key={task._id}
                        className={`rounded-lg border p-4 space-y-2 ${
                          task.isAtRisk
                            ? "bg-red-50 border-red-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                              <span>
                                Due{" "}
                                {format(new Date(task.deadline), "MMM d, yyyy")}
                              </span>
                              <span>·</span>
                              <span>{task.projectTag}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium border ${
                                PRIORITY_CONFIG[task.priority] ?? ""
                              }`}
                            >
                              {task.priority}
                            </Badge>
                            <Badge
                              className={`text-xs font-medium border-0 ${
                                STATUS_CONFIG[task.status] ?? ""
                              }`}
                            >
                              {STATUS_LABELS[task.status] ?? task.status}
                            </Badge>
                          </div>
                        </div>

                        {/* At-risk warning */}
                        {task.isAtRisk && (
                          <p className="text-xs text-red-600 font-medium">
                            ⚠️ At risk — you have unavailability near this
                            deadline
                          </p>
                        )}

                        {/* Handoff doc */}
                        {task.handoffDoc && (
                          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">
                              Handoff note:
                            </p>
                            <p className="text-xs text-blue-800 leading-relaxed">
                              {task.handoffDoc}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right 2 cols — Availability */}
          <div className="md:col-span-2">
            <Card className="bg-white shadow-sm h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <CalendarOff className="h-4 w-4 text-gray-500" />
                  My Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {me && <AvailabilityPicker userId={me._id as string} />}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
