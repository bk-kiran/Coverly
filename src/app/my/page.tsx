"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { AvailabilityPicker } from "@/components/member/AvailabilityPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  computeWorkloadScore,
  getWorkloadLabel,
  getWorkloadColor,
} from "@/lib/workload";
import { CalendarOff, ClipboardList, Building2, Users } from "lucide-react";
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
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const me = useQuery(api.users.getMe, { clerkId: clerkUser?.id });
  const myTasks = useQuery(
    api.tasks.getTasksByAssignee,
    me ? { assigneeId: me._id as string } : "skip"
  );

  // Org context
  const myOrg = useQuery(api.orgs.getMyOrg);
  const parentOrgTree = useQuery(
    api.orgs.getAllOrgsInTree,
    myOrg?.parentOrgId ? { rootOrgId: myOrg.parentOrgId as string } : "skip"
  );
  const parentOrg = parentOrgTree?.[0] ?? null;

  // Teammates in the user's own org (for banner count)
  const orgMembers = useQuery(
    api.orgs.getOrgMembers,
    myOrg?._id ? { orgId: myOrg._id as string } : "skip"
  );

  // All members from both orgs — used to resolve the org badge per task
  const allOrgMembers = useQuery(api.users.getTeamMembers, { clerkId: clerkUser?.id });

  // All tasks in the org tree (includes sub-org + parent org tasks)
  const allOrgTasks = useQuery(api.tasks.getAllTasks, { clerkId: clerkUser?.id });

  useEffect(() => {
    if (me === undefined) return;
    if (me === null || !me.orgId) { router.replace("/onboarding"); return; }
    if (me.role === "manager") { router.replace("/dashboard"); return; }
  }, [me, router]);

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  if (me === null || me.role === "manager") return null;

  const myId = me._id as string;

  // My personal active tasks
  const activeTasks = (myTasks ?? []).filter((t) => t.status !== "done");
  const workloadScore = computeWorkloadScore(activeTasks);

  // Team tasks (from both orgs, not assigned to me, not done) — shown only when in sub-org
  const teamActiveTasks = myOrg?.parentOrgId
    ? (allOrgTasks ?? []).filter(
        (t) => t.status !== "done" && (t.assigneeId as string) !== myId
      )
    : [];

  // Resolve which org a task belongs to via the assignee's orgId
  function getOrgLabel(assigneeId: string): string {
    const assignee = (allOrgMembers ?? []).find(
      (m) => (m._id as string) === assigneeId
    );
    if (!assignee?.orgId) return myOrg?.name ?? "";
    return (assignee.orgId as string) === (myOrg?._id as string)
      ? (myOrg?.name ?? "")
      : (parentOrg?.name ?? myOrg?.name ?? "");
  }

  const isSubOrg = !!myOrg?.parentOrgId;

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

        {/* Org info banner */}
        {myOrg && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="rounded-lg bg-blue-50 p-1.5 flex-shrink-0">
                <Building2 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {myOrg.name}
                </p>
                {parentOrg && (
                  <p className="text-xs text-gray-400">
                    Sub-org of{" "}
                    <span className="font-medium text-gray-600">
                      {parentOrg.name}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              <span>
                <span className="font-semibold text-gray-900">
                  {orgMembers !== undefined ? orgMembers.length - 1 : "—"}
                </span>{" "}
                teammate{(orgMembers?.length ?? 0) - 1 !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {isSubOrg && (
                <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                  Sub-org
                </Badge>
              )}
              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                Member
              </Badge>
            </div>
          </div>
        )}

        {/* Main 5-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* Left 3 cols — Tasks */}
          <div className="md:col-span-3 space-y-4">

            {/* My Tasks */}
            <Card className="bg-white shadow-sm">
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
                                Due {format(new Date(task.deadline), "MMM d, yyyy")}
                              </span>
                              <span>·</span>
                              <span>{task.projectTag}</span>
                              {myOrg && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                    <Building2 className="h-2.5 w-2.5" />
                                    {myOrg.name}
                                  </span>
                                </>
                              )}
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
                            ⚠️ At risk — you have unavailability near this deadline
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

            {/* Org Tasks — shown only when in a sub-org */}
            {isSubOrg && teamActiveTasks.length > 0 && (
              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    Org Tasks ({teamActiveTasks.length} active)
                    <span className="ml-auto text-xs font-normal text-gray-400">
                      From {myOrg.name} &amp; {parentOrg?.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {teamActiveTasks.map((task) => {
                      const orgLabel = getOrgLabel(task.assigneeId as string);
                      return (
                        <div
                          key={task._id}
                          className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                              <span>
                                Due {format(new Date(task.deadline), "MMM d, yyyy")}
                              </span>
                              <span>·</span>
                              <span>{task.projectTag}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                <Building2 className="h-2.5 w-2.5" />
                                {orgLabel}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
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
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
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
