"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { AvailabilityHeatmap } from "@/components/dashboard/AvailabilityHeatmap";
import { ReassignmentPanel } from "@/components/dashboard/ReassignmentPanel";
import { computeWorkloadScore } from "@/lib/workload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Users, CheckSquare, Zap, Plus } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
  high:     { label: "High",     className: "bg-orange-100 text-orange-700 border-orange-200" },
  medium:   { label: "Medium",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low:      { label: "Low",      className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const SKILL_OPTIONS = [
  "frontend", "backend", "design", "data", "client-comms",
  "devops", "mobile", "ai-ml", "project-management", "qa",
] as const;

const todayStr = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  title: "",
  description: "",
  assigneeId: "",
  priority: "medium" as const,
  status: "todo" as const,
  deadline: todayStr(),
  projectTag: "",
  skillRequired: "",
};

export default function DashboardPage() {
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const me = useQuery(api.users.getMe, { clerkId: clerkUser?.id });
  const atRiskTasks = useQuery(api.tasks.getAtRiskTasks);
  const allTasks = useQuery(api.tasks.getAllTasks);
  const teamMembers = useQuery(api.users.getTeamMembers);
  const createTask = useMutation(api.tasks.createTask);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (me === undefined) return;
    if (me === null) { router.replace("/onboarding"); return; }
    if (me.role === "member") { router.replace("/my"); return; }
  }, [me, router]);

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  if (me === null || me.role === "member") return null;

  const overloadedMembers = (teamMembers ?? []).filter(
    (m) => m.workloadScore > 80
  );
  const activeTasks = (allTasks ?? []).filter((t) => t.status !== "done");

  function getMemberLiveScore(memberId: string): number {
    const memberTasks = (allTasks ?? []).filter(
      (t) => (t.assigneeId as string) === memberId
    );
    return computeWorkloadScore(memberTasks);
  }

  function resetAndClose() {
    setForm({ ...EMPTY_FORM });
    setIsOpen(false);
  }

  async function handleSubmit() {
    if (!form.title || !form.description || !form.assigneeId || !form.projectTag) return;
    setIsSaving(true);
    try {
      await createTask({
        title: form.title,
        description: form.description,
        assigneeId: form.assigneeId,
        createdById: (me?._id as string) ?? "",
        priority: form.priority,
        status: form.status,
        deadline: form.deadline,
        projectTag: form.projectTag,
        skillRequired: form.skillRequired || undefined,
      });
      resetAndClose();
    } finally {
      setIsSaving(false);
    }
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Nobody drops the ball — Coverly keeps your team covered.
            </p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="gap-2 flex-shrink-0">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
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
                                  liveScore > 80 ? "text-red-600" : "text-gray-400"
                                }`}
                              >
                                ({liveScore}%)
                              </span>
                            )}
                          </span>
                          <span>·</span>
                          <span>Due {format(new Date(task.deadline), "MMM d, yyyy")}</span>
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

      {/* New Task Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Fix payment gateway bug"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What needs to be done and why..."
                rows={3}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Assignee *</label>
              <Select
                value={form.assigneeId}
                onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers?.map((m) => (
                    <SelectItem key={m._id} value={m._id as string}>
                      {m.name} — {m.workloadScore}% load
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as typeof form.priority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof form.status }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deadline + Project Tag row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Deadline *</label>
                <input
                  type="date"
                  value={form.deadline}
                  min={todayStr()}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Project Tag *</label>
                <input
                  type="text"
                  value={form.projectTag}
                  onChange={(e) => setForm((f) => ({ ...f, projectTag: e.target.value }))}
                  placeholder="e.g. Platform"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Skill Required */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Skill Required
                <span className="ml-1 font-normal text-gray-400">(optional)</span>
              </label>
              <Select
                value={form.skillRequired}
                onValueChange={(v) => setForm((f) => ({ ...f, skillRequired: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={
                isSaving ||
                !form.title ||
                !form.description ||
                !form.assigneeId ||
                !form.projectTag
              }
            >
              {isSaving ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
