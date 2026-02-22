"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import { computeWorkloadScore } from "@/lib/workload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, Clock, Check, X } from "lucide-react";
import { format } from "date-fns";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function workloadBarColor(score: number): string {
  if (score <= 30) return "bg-emerald-400";
  if (score <= 60) return "bg-yellow-400";
  if (score <= 80) return "bg-orange-400";
  return "bg-red-500";
}

const PRIORITY_CLASSES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

// ─── types ────────────────────────────────────────────────────────────────────

type PendingRoleChange = { userId: string; name: string; newRole: "manager" | "member" };
type RejectDialog = { taskId: string; memberName: string; note: string };
type TaskFilter = "all" | "todo" | "in_progress" | "blocked" | "done" | "pending";

const TABS: { key: TaskFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
  { key: "pending", label: "Pending Approval" },
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const me = useQuery(api.users.getMe, { clerkId: clerkUser?.id });
  const members = useQuery(api.users.getTeamMembers, { clerkId: clerkUser?.id });
  const allTasks = useQuery(api.tasks.getAllTasks, { clerkId: clerkUser?.id });

  const updateMemberRole = useMutation(api.users.updateMemberRole);
  const updateTask = useMutation(api.tasks.updateTask);
  const approveCompletion = useMutation(api.tasks.approveCompletion);
  const rejectCompletion = useMutation(api.tasks.rejectCompletion);
  const directComplete = useMutation(api.tasks.directComplete);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<RejectDialog | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [approvingTaskIds, setApprovingTaskIds] = useState<Set<string>>(new Set());
  const [directCompletingIds, setDirectCompletingIds] = useState<Set<string>>(new Set());
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<string>>(new Set());
  const [reassignDialog, setReassignDialog] = useState<{ taskId: string } | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    if (me === undefined) return;
    if (me === null || me.role !== "manager") router.replace("/my");
  }, [me, router]);

  if (me === undefined || members === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading team...</p>
      </div>
    );
  }
  if (me === null || me.role !== "manager") return null;

  // ── Derived data ──────────────────────────────────────────────────────────

  const selectedMember = members.find((m) => (m._id as string) === selectedMemberId) ?? null;

  const memberTasks = selectedMember
    ? (allTasks ?? []).filter((t) => (t.assigneeId as string) === (selectedMember._id as string))
    : [];

  const today = new Date().toISOString().slice(0, 10);

  const stats = {
    total: memberTasks.length,
    completed: memberTasks.filter((t) => t.status === "done").length,
    blocked: memberTasks.filter((t) => t.status === "blocked").length,
    overdue: memberTasks.filter((t) => t.status !== "done" && t.deadline < today).length,
  };

  const tabCounts: Record<TaskFilter, number> = {
    all: memberTasks.length,
    todo: memberTasks.filter((t) => t.status === "todo").length,
    in_progress: memberTasks.filter((t) => t.status === "in_progress").length,
    blocked: memberTasks.filter((t) => t.status === "blocked").length,
    done: memberTasks.filter((t) => t.status === "done").length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending: memberTasks.filter((t) => (t as any).completionStatus === "pending_approval").length,
  };

  const filteredTasks =
    taskFilter === "all"
      ? memberTasks
      : taskFilter === "pending"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? memberTasks.filter((t) => (t as any).completionStatus === "pending_approval")
      : memberTasks.filter((t) => t.status === taskFilter);

  // Per-member workload for the left column
  const workloadByMember = new Map<string, number>();
  for (const m of members) {
    const mTasks = (allTasks ?? []).filter(
      (t) => (t.assigneeId as string) === (m._id as string) && t.status !== "done"
    );
    workloadByMember.set(m._id as string, computeWorkloadScore(mTasks));
  }

  const taskCountByMember = new Map<string, number>();
  for (const t of allTasks ?? []) {
    if (t.status !== "done") {
      const id = t.assigneeId as string;
      taskCountByMember.set(id, (taskCountByMember.get(id) ?? 0) + 1);
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleRoleChange() {
    if (!pendingRoleChange) return;
    setIsUpdatingRole(true);
    try {
      await updateMemberRole({ targetUserId: pendingRoleChange.userId, newRole: pendingRoleChange.newRole });
      setPendingRoleChange(null);
    } finally {
      setIsUpdatingRole(false);
    }
  }

  async function handleStatusChange(
    taskId: string,
    status: "todo" | "in_progress" | "blocked" | "done"
  ) {
    setUpdatingStatusIds((prev) => new Set(prev).add(taskId));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateTask({ id: taskId as any, status });
    } finally {
      setUpdatingStatusIds((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
    }
  }

  async function handleCheckbox(task: typeof memberTasks[number]) {
    const taskId = task._id as string;
    if (task.status === "done") {
      await handleStatusChange(taskId, "in_progress");
    } else {
      setDirectCompletingIds((prev) => new Set(prev).add(taskId));
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await directComplete({ taskId: taskId as any });
      } finally {
        setDirectCompletingIds((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
      }
    }
  }

  async function handleApprove(taskId: string) {
    setApprovingTaskIds((prev) => new Set(prev).add(taskId));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await approveCompletion({ taskId: taskId as any });
    } finally {
      setApprovingTaskIds((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
    }
  }

  async function handleRejectSubmit() {
    if (!rejectDialog || rejectDialog.note.trim().length < 10) return;
    setIsRejecting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await rejectCompletion({ taskId: rejectDialog.taskId as any, note: rejectDialog.note.trim() });
      setRejectDialog(null);
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleReassign() {
    if (!reassignDialog || !reassignTo) return;
    setIsReassigning(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateTask({ id: reassignDialog.taskId as any, assigneeId: reassignTo });
      setReassignDialog(null);
      setReassignTo("");
    } finally {
      setIsReassigning(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            Team Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select a member to view and manage their tasks
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-5" style={{ minHeight: 600 }}>

          {/* LEFT: Member list */}
          <div className="w-72 flex-shrink-0 space-y-2">
            {members.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Users className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No team members yet.</p>
              </div>
            ) : (
              members.map((member) => {
                const memberId = member._id as string;
                const isSelected = selectedMemberId === memberId;
                const score = workloadByMember.get(memberId) ?? 0;
                const taskCount = taskCountByMember.get(memberId) ?? 0;

                return (
                  <button
                    key={memberId}
                    onClick={() => {
                      setSelectedMemberId(memberId);
                      setTaskFilter("all");
                    }}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 border-l-[3px] border-l-blue-500"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-[3px] border-l-transparent"
                    }`}
                  >
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 mb-3">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-blue-600">
                            {getInitials(member.name)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{member.email}</p>
                      </div>
                      <Badge
                        className={`text-[10px] font-medium border-0 flex-shrink-0 ${
                          member.role === "manager"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {member.role}
                      </Badge>
                    </div>

                    {/* Workload bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 dark:text-gray-500">Workload {score}/100</span>
                        <span className={`font-medium ${taskCount > 0 ? "text-gray-600 dark:text-gray-300" : "text-gray-300 dark:text-gray-600"}`}>
                          {taskCount} active
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`h-1.5 rounded-full ${workloadBarColor(score)}`}
                          style={{ width: `${Math.min(score, 100)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT: Task panel */}
          <div className="flex-1 min-w-0">
            {!selectedMember ? (
              <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <Users className="h-10 w-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">← Select a member to view their tasks</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 600 }}>

                {/* Panel header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {selectedMember.avatarUrl ? (
                      <img
                        src={selectedMember.avatarUrl}
                        alt={selectedMember.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600">
                          {getInitials(selectedMember.name)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedMember.name}&apos;s Tasks
                      </h2>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{selectedMember.email}</p>
                    </div>
                  </div>

                  {/* Role selector */}
                  <select
                    value={selectedMember.role}
                    onChange={(e) => {
                      const newRole = e.target.value as "manager" | "member";
                      if (newRole !== selectedMember.role) {
                        setPendingRoleChange({
                          userId: selectedMember._id as string,
                          name: selectedMember.name,
                          newRole,
                        });
                      }
                    }}
                    className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-700 border-b border-gray-100 dark:border-gray-700">
                  {[
                    { label: "Total", value: stats.total, color: "text-gray-900 dark:text-white" },
                    { label: "Completed", value: stats.completed, color: "text-emerald-600" },
                    { label: "Blocked", value: stats.blocked, color: "text-red-600" },
                    { label: "Overdue", value: stats.overdue, color: "text-orange-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="px-4 py-3 text-center">
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                  {TABS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTaskFilter(key)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                        taskFilter === key
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {label}
                      {tabCounts[key] > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-tight min-w-[18px] text-center ${
                            key === "pending"
                              ? "bg-red-500 text-white"
                              : taskFilter === key
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {tabCounts[key]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Task list */}
                <div className="flex-1 divide-y divide-gray-50 dark:divide-gray-700">
                  {filteredTasks.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        {taskFilter === "all"
                          ? `${selectedMember.name.split(" ")[0]} has no tasks yet 🎉`
                          : `No ${STATUS_LABELS[taskFilter] ?? taskFilter} tasks`}
                      </p>
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      const taskId = task._id as string;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const completionStatus = (task as any).completionStatus as string | undefined;
                      const isPending = completionStatus === "pending_approval";
                      const isDone = task.status === "done";
                      const isOverdue = task.status !== "done" && task.deadline < today;
                      const isApproving = approvingTaskIds.has(taskId);
                      const isDirecting = directCompletingIds.has(taskId);
                      const isUpdatingStatus = updatingStatusIds.has(taskId);

                      return (
                        <div
                          key={taskId}
                          className={`px-5 py-3.5 flex items-start gap-3 ${
                            isPending ? "bg-yellow-50 dark:bg-yellow-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          } transition-colors`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleCheckbox(task)}
                            disabled={isDirecting || isUpdatingStatus}
                            className="mt-1 h-4 w-4 flex-shrink-0 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                          />

                          {/* Main content */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {/* Title + pending badge */}
                            <div className="flex items-start gap-2 flex-wrap">
                              <p
                                className={`text-sm font-medium flex-1 min-w-0 ${
                                  isDone ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {task.title}
                              </p>
                              {isPending && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-[10px] font-medium text-yellow-700 flex-shrink-0">
                                  <Clock className="h-2.5 w-2.5" />
                                  ⏳ Pending approval
                                </span>
                              )}
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-medium border ${PRIORITY_CLASSES[task.priority] ?? ""}`}
                              >
                                {task.priority}
                              </Badge>
                              <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                {task.projectTag}
                              </span>
                              <span
                                className={`text-[10px] font-medium ${
                                  isOverdue ? "text-red-500" : "text-gray-400 dark:text-gray-500"
                                }`}
                              >
                                {isOverdue ? "⚠ " : ""}
                                Due {format(new Date(task.deadline), "MMM d")}
                              </span>
                            </div>

                            {/* Pending approval action buttons */}
                            {isPending && (
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(taskId)}
                                  disabled={isApproving}
                                  className="h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  {isApproving ? "Approving..." : "Approve"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setRejectDialog({
                                      taskId,
                                      memberName: selectedMember.name,
                                      note: "",
                                    })
                                  }
                                  disabled={isApproving}
                                  className="h-6 px-2.5 text-[10px] border-red-200 text-red-600 hover:bg-red-50 gap-1"
                                >
                                  <X className="h-2.5 w-2.5" />
                                  Needs Improvement
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Right-side controls */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  taskId,
                                  e.target.value as "todo" | "in_progress" | "blocked" | "done"
                                )
                              }
                              disabled={isUpdatingStatus || isDirecting}
                              className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-[10px] font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="done">Done</option>
                            </select>
                            <button
                              onClick={() => { setReassignDialog({ taskId }); setReassignTo(""); }}
                              className="rounded-md border border-gray-200 dark:border-gray-600 px-2 py-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              Reassign
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role change confirmation dialog */}
      <Dialog
        open={!!pendingRoleChange}
        onOpenChange={(open) => { if (!open && !isUpdatingRole) setPendingRoleChange(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300 py-2">
            Make{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pendingRoleChange?.name}</span>{" "}
            a{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pendingRoleChange?.newRole}</span>?
            {pendingRoleChange?.newRole === "manager" && (
              <span className="block mt-1.5 text-xs text-amber-600 font-medium">
                They will gain manager access to this org.
              </span>
            )}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingRoleChange(null)}
              disabled={isUpdatingRole}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleRoleChange} disabled={isUpdatingRole}>
              {isUpdatingRole ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject / needs-improvement dialog */}
      <Dialog
        open={!!rejectDialog}
        onOpenChange={(open) => { if (!open && !isRejecting) setRejectDialog(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request improvement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Tell{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{rejectDialog?.memberName}</span>{" "}
              what needs to improve...
            </p>
            <textarea
              value={rejectDialog?.note ?? ""}
              onChange={(e) =>
                setRejectDialog((d) => d ? { ...d, note: e.target.value } : null)
              }
              placeholder="Describe what needs to be improved..."
              rows={4}
              className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {rejectDialog && rejectDialog.note.trim().length > 0 && rejectDialog.note.trim().length < 10 && (
              <p className="text-xs text-red-500">Please provide at least 10 characters.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectDialog(null)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRejectSubmit}
              disabled={isRejecting || !rejectDialog || rejectDialog.note.trim().length < 10}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRejecting ? "Sending..." : "Send Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign dialog */}
      <Dialog
        open={!!reassignDialog}
        onOpenChange={(open) => {
          if (!open && !isReassigning) { setReassignDialog(null); setReassignTo(""); }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign task</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a team member...</option>
              {members.map((m) => (
                <option key={m._id as string} value={m._id as string}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setReassignDialog(null); setReassignTo(""); }}
              disabled={isReassigning}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReassign}
              disabled={!reassignTo || isReassigning}
            >
              {isReassigning ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
