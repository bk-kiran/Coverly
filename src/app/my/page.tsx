"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useConvex } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { AvailabilityPicker } from "@/components/member/AvailabilityPicker";
import { TaskComments } from "@/components/TaskComments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  computeWorkloadScore,
  getWorkloadLabel,
  getWorkloadColor,
} from "@/lib/workload";
import { parseICSFile } from "@/lib/icsParser";
import {
  CalendarOff,
  ClipboardList,
  Building2,
  Users,
  Upload,
  CheckCircle,
  AlertCircle,
  Calendar,
  ChevronDown,
  MessageSquare,
  Clock,
} from "lucide-react";
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
  const myOrgs = useQuery(api.orgs.getMyOrgs);
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

  const convex = useConvex();

  // Mutations
  const setAvailability = useMutation(api.availability.setAvailability);
  const removeAvailability = useMutation(api.availability.removeAvailability);
  const requestCompletion = useMutation(api.tasks.requestCompletion);

  // Calendar sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; events: string[] } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [isClearning, setIsClearning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedEvents, setParsedEvents] = useState<import("@/lib/icsParser").ParsedCalendarEvent[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [eventTypes, setEventTypes] = useState<Record<number, "ooo" | "partial" | "at_capacity">>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string | "all">("all");
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());

  function toggleComments(taskId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function openComments(taskId: string) {
    setExpandedComments((prev) => new Set(prev).add(taskId));
  }

  useEffect(() => {
    if (me === undefined) return;
    if (me === null || !me.activeOrgId) { router.replace("/onboarding"); return; }
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

  // My personal active tasks — includes approval-workflow tasks so completion states are visible
  const activeTasks = (myTasks ?? []).filter(
    (t) => t.status !== "done" || !!t.completionStatus
  );
  const workloadScore = computeWorkloadScore(activeTasks.filter((t) => t.status !== "done"));

  // Build creatorId → activeOrgId map for org filtering
  const creatorOrgMap = new Map<string, string>();
  for (const member of allOrgMembers ?? []) {
    if (member.activeOrgId) {
      creatorOrgMap.set(member._id as string, member.activeOrgId as string);
    }
  }

  const filteredTasks =
    selectedOrgFilter === "all"
      ? activeTasks
      : activeTasks.filter(
          (t) => creatorOrgMap.get(t.createdById as string) === selectedOrgFilter
        );

  // Count unique orgs represented in my tasks
  const uniqueTaskOrgIds = new Set(
    activeTasks.map((t) => creatorOrgMap.get(t.createdById as string)).filter(Boolean)
  );
  const taskOrgCount = uniqueTaskOrgIds.size || 1;

  // Team tasks (from both orgs, not assigned to me, not done) — shown only when in sub-org
  const teamActiveTasks = myOrg?.parentOrgId
    ? (allOrgTasks ?? []).filter(
        (t) => t.status !== "done" && (t.assigneeId as string) !== myId
      )
    : [];

  // Resolve which org a task belongs to via the assignee's activeOrgId
  function getOrgLabel(assigneeId: string): string {
    const assignee = (allOrgMembers ?? []).find(
      (m) => (m._id as string) === assigneeId
    );
    if (!assignee?.activeOrgId) return myOrg?.name ?? "";
    return (assignee.activeOrgId as string) === (myOrg?._id as string)
      ? (myOrg?.name ?? "")
      : (parentOrg?.name ?? myOrg?.name ?? "");
  }

  // Resolve org name for a given orgId
  function getOrgName(orgId: string): string {
    return (myOrgs ?? []).find((o) => (o._id as string) === orgId)?.name ?? "";
  }

  async function handleRequestCompletion(taskId: string) {
    setCompletingTaskIds((prev) => new Set(prev).add(taskId));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await requestCompletion({ taskId: taskId as any });
    } finally {
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  const isSubOrg = !!myOrg?.parentOrgId;

  function resetCalendarSync() {
    setSyncResult(null);
    setSyncError(null);
    setParsedEvents([]);
    setSelectedIndices(new Set());
    setEventTypes({});
  }

  function handleICSUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncError(null);
    setSyncResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const events = parseICSFile(content);

        if (events.length === 0) {
          setSyncError("No events found in this calendar file.");
          return;
        }

        // Pre-select OOO events; default type based on isOOO
        const defaultSelected = new Set(
          events.map((_, i) => i).filter((i) => events[i].isOOO)
        );
        const defaultTypes: Record<number, "ooo" | "partial" | "at_capacity"> = {};
        events.forEach((ev, i) => {
          defaultTypes[i] = ev.isOOO ? "ooo" : "partial";
        });

        setParsedEvents(events);
        setSelectedIndices(defaultSelected);
        setEventTypes(defaultTypes);
      } catch {
        setSyncError("Invalid file. Please upload a valid .ics file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImportSelected() {
    const indices = Array.from(selectedIndices);
    if (indices.length === 0) return;
    setSyncing(true);
    try {
      await Promise.all(
        indices.map((i) =>
          setAvailability({
            userId: myId,
            type: eventTypes[i] ?? "ooo",
            startDate: parsedEvents[i].startDate,
            endDate: parsedEvents[i].endDate,
            note: `Imported from calendar: ${parsedEvents[i].title}`,
          })
        )
      );
      setSyncResult({
        synced: indices.length,
        events: indices.map((i) => parsedEvents[i].title),
      });
      setParsedEvents([]);
    } catch {
      setSyncError("Failed to import events. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleClearImported() {
    if (!me) return;
    setIsClearning(true);
    try {
      const entries = await convex.query(api.availability.getAvailabilityByUser, {
        userId: me._id as string,
      });
      const imported = entries.filter((e) =>
        e.note?.startsWith("Imported from calendar")
      );
      await Promise.all(imported.map((e) => removeAvailability({ id: e._id })));
      setSyncResult(null);
      setSyncError(null);
      setCleared(true);
      setTimeout(() => setCleared(false), 2000);
    } finally {
      setIsClearning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hey, {me?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your workload:{" "}
            <span className={`font-semibold ${getWorkloadColor(workloadScore)}`}>
              {getWorkloadLabel(workloadScore)} ({workloadScore}/100)
            </span>
          </p>
        </div>

        {/* Active workspace slim banner */}
        {myOrg && (
          <div className="bg-blue-50 text-blue-700 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Active workspace:{" "}
              <span className="font-semibold">{myOrg.name}</span>
            </span>
          </div>
        )}

        {/* Org info banner */}
        {myOrg && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-1.5 flex-shrink-0">
                <Building2 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {myOrg.name}
                </p>
                {parentOrg && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Sub-org of{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {parentOrg.name}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              <span>
                <span className="font-semibold text-gray-900 dark:text-white">
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

            {/* Org filter bar */}
            {(myOrgs ?? []).length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedOrgFilter("all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedOrgFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  All Orgs
                </button>
                {(myOrgs ?? []).map((org) => (
                  <button
                    key={org._id as string}
                    onClick={() => setSelectedOrgFilter(org._id as string)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedOrgFilter === (org._id as string)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}

            {/* My Tasks */}
            <Card className="bg-white dark:bg-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  My Tasks ({filteredTasks.filter((t) => t.status !== "done").length} active
                  {taskOrgCount > 1 && selectedOrgFilter === "all"
                    ? ` across ${taskOrgCount} orgs`
                    : ""}
                  )
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {filteredTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No active tasks — you&apos;re all clear! 🎉
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => {
                      const taskOrgId = creatorOrgMap.get(task.createdById as string);
                      const taskOrgName = taskOrgId ? getOrgName(taskOrgId) : (myOrg?.name ?? "");
                      return (
                      <div
                        key={task._id}
                        className={`rounded-lg border p-4 space-y-2 ${
                          task.isAtRisk
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900"
                            : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${task.status === "done" ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                              <span>
                                Due {format(new Date(task.deadline), "MMM d, yyyy")}
                              </span>
                              <span>·</span>
                              <span>{task.projectTag}</span>
                              {taskOrgName && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-300">
                                    <Building2 className="h-2.5 w-2.5" />
                                    {taskOrgName}
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
                          <div className="space-y-1">
                            <p className="text-xs text-red-600 font-medium">
                              ⚠️ At risk — you have unavailability near this deadline
                            </p>
                            <button
                              onClick={() => openComments(task._id as string)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Leave a comment to help whoever covers this task →
                            </button>
                          </div>
                        )}

                        {/* Handoff doc */}
                        {task.handoffDoc && (
                          <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
                            <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                              Handoff note:
                            </p>
                            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                              {task.handoffDoc}
                            </p>
                          </div>
                        )}

                        {/* Completion action */}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(task as any).completionStatus === "pending_approval" ? (
                          <div className="space-y-1 py-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs font-medium text-yellow-700">
                              <Clock className="h-3 w-3" />
                              ⏳ Awaiting approval
                            </span>
                            <p className="text-xs text-gray-400 pl-1">Waiting for manager to review</p>
                          </div>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ) : (task as any).completionStatus === "needs_improvement" ? (
                          <div className="space-y-2 py-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-700">
                              ❌ Needs improvement
                            </span>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(task as any).completionNote && (
                              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">Manager&apos;s feedback:</p>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <p className="text-xs text-red-800 leading-relaxed">{(task as any).completionNote}</p>
                              </div>
                            )}
                            <button
                              onClick={() => handleRequestCompletion(task._id as string)}
                              disabled={completingTaskIds.has(task._id as string)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {completingTaskIds.has(task._id as string) ? "Submitting..." : "Resubmit for approval →"}
                            </button>
                          </div>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ) : (task as any).completionStatus === "approved" ? (
                          <div className="py-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                              ✅ Approved
                            </span>
                          </div>
                        ) : (
                          <div className="py-1">
                            <button
                              onClick={() => handleRequestCompletion(task._id as string)}
                              disabled={completingTaskIds.has(task._id as string)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white dark:bg-gray-700 dark:border-emerald-700 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {completingTaskIds.has(task._id as string) ? "Submitting..." : "Mark Complete"}
                            </button>
                          </div>
                        )}

                        {/* Comments toggle */}
                        <div className="pt-1 border-t border-gray-100 dark:border-gray-600">
                          <button
                            onClick={() => toggleComments(task._id as string)}
                            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Comments
                            <ChevronDown
                              className={`h-3 w-3 transition-transform duration-150 ${
                                expandedComments.has(task._id as string) ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {expandedComments.has(task._id as string) && (
                            <div className="mt-3">
                              <TaskComments
                                taskId={task._id as string}
                                currentUserId={me._id as string}
                                currentUserName={me.name}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Org Tasks — shown only when in a sub-org */}
            {isSubOrg && teamActiveTasks.length > 0 && (
              <Card className="bg-white dark:bg-gray-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    Org Tasks ({teamActiveTasks.length} active)
                    <span className="ml-auto text-xs font-normal text-gray-400 dark:text-gray-500">
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
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 flex items-center gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                              <span>
                                Due {format(new Date(task.deadline), "MMM d, yyyy")}
                              </span>
                              <span>·</span>
                              <span>{task.projectTag}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-300">
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

          {/* Right 2 cols — Calendar Sync + Availability */}
          <div className="md:col-span-2 space-y-4">

            {/* Calendar Sync Card */}
            <Card className="bg-white dark:bg-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Import Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Subtext */}
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Upload your .ics file to auto-populate your availability.
                  Works with Google Calendar, Apple Calendar, and Outlook.
                </p>

                {/* How-to toggle */}
                <button
                  onClick={() => setShowInstructions((v) => !v)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  How do I export my calendar?
                  <ChevronDown
                    className={`h-3 w-3 transition-transform duration-150 ${
                      showInstructions ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showInstructions && (
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 px-3 py-2.5 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <p>🗓 <span className="font-medium">Google Calendar:</span> Settings → Import &amp; Export → Export</p>
                    <p>🍎 <span className="font-medium">Apple Calendar:</span> File → Export → Export</p>
                    <p>📧 <span className="font-medium">Outlook:</span> File → Open &amp; Export → Import/Export</p>
                  </div>
                )}

                {/* Upload / status area */}
                {syncing ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <p className="text-xs text-gray-500">Importing calendar events...</p>
                  </div>
                ) : syncResult ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Synced {syncResult.synced} event{syncResult.synced !== 1 ? "s" : ""} from your calendar
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {syncResult.events.map((title, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-gray-100 dark:bg-gray-600 px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-300 font-medium"
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={resetCalendarSync}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Import another file
                    </button>
                  </div>
                ) : syncError ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{syncError}</p>
                    </div>
                    <button
                      onClick={resetCalendarSync}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Try again
                    </button>
                  </div>
                ) : parsedEvents.length > 0 ? (
                  /* Event selection screen */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {parsedEvents.length} event{parsedEvents.length !== 1 ? "s" : ""} found
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedIndices(new Set(parsedEvents.map((_, i) => i)))}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-gray-200">|</span>
                        <button
                          onClick={() => setSelectedIndices(new Set())}
                          className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                      {parsedEvents.map((event, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 rounded-lg border p-2 ${
                            selectedIndices.has(i)
                              ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIndices.has(i)}
                            onChange={(e) =>
                              setSelectedIndices((prev) => {
                                const next = new Set(prev);
                                e.target.checked ? next.add(i) : next.delete(i);
                                return next;
                              })
                            }
                            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 accent-blue-600"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                              {event.title}
                              {event.isOOO && (
                                <span className="ml-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-600">
                                  OOO
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {event.startDate} → {event.endDate}
                            </p>
                          </div>
                          <select
                            value={eventTypes[i] ?? (event.isOOO ? "ooo" : "partial")}
                            onChange={(e) =>
                              setEventTypes((prev) => ({
                                ...prev,
                                [i]: e.target.value as "ooo" | "partial" | "at_capacity",
                              }))
                            }
                            className="text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-1 py-0.5 text-gray-600 dark:text-gray-300 flex-shrink-0 focus:outline-none"
                          >
                            <option value="ooo">OOO</option>
                            <option value="partial">Partial</option>
                            <option value="at_capacity">At Capacity</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleImportSelected}
                        disabled={selectedIndices.size === 0}
                        className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Import {selectedIndices.size > 0 ? selectedIndices.size : ""} Selected
                      </button>
                      <button
                        onClick={resetCalendarSync}
                        className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Drop your .ics file here or click to browse
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">.ics files only</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ics"
                      className="hidden"
                      onChange={handleICSUpload}
                    />
                  </div>
                )}

                {/* Clear imported events */}
                <button
                  onClick={handleClearImported}
                  disabled={isClearning}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {isClearning ? "Clearing..." : cleared ? "✓ Cleared!" : "Clear imported events"}
                </button>
              </CardContent>
            </Card>

            {/* Availability Card */}
            <Card className="bg-white dark:bg-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <CalendarOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
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
