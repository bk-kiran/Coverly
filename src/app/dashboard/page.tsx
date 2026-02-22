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
import { AlertTriangle, Users, CheckSquare, Zap, Plus, Copy, Check, Building2 } from "lucide-react";
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
  const atRiskTasks = useQuery(api.tasks.getAtRiskTasks, { clerkId: clerkUser?.id });
  const allTasks = useQuery(api.tasks.getAllTasks, { clerkId: clerkUser?.id });
  const teamMembers = useQuery(api.users.getTeamMembers, { clerkId: clerkUser?.id });
  const myOrg = useQuery(api.orgs.getMyManagedOrg);
  const subOrgs = useQuery(
    api.orgs.getSubOrgs,
    myOrg?._id ? { parentOrgId: myOrg._id as string } : "skip"
  );
  const createTask = useMutation(api.tasks.createTask);
  const createSubOrg = useMutation(api.orgs.createSubOrg);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);

  // Org management state
  const [copied, setCopied] = useState(false);
  const [isSubOrgOpen, setIsSubOrgOpen] = useState(false);
  const [subOrgForm, setSubOrgForm] = useState({ name: "", department: "" });
  const [isCreatingSubOrg, setIsCreatingSubOrg] = useState(false);
  const [newSubOrgCode, setNewSubOrgCode] = useState<string | null>(null);

  function handleCopyInvite() {
    if (!myOrg?.inviteCode) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/join/${myOrg.inviteCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCreateSubOrg() {
    if (!myOrg?._id || !subOrgForm.name.trim()) return;
    setIsCreatingSubOrg(true);
    try {
      const result = await createSubOrg({
        name: subOrgForm.name.trim(),
        department: subOrgForm.department.trim() || undefined,
        parentOrgId: myOrg._id as string,
      });
      setNewSubOrgCode((result as { subOrgId: string; inviteCode: string }).inviteCode);
      setSubOrgForm({ name: "", department: "" });
    } finally {
      setIsCreatingSubOrg(false);
    }
  }

  function handleCloseSubOrgDialog() {
    setIsSubOrgOpen(false);
    setNewSubOrgCode(null);
    setSubOrgForm({ name: "", department: "" });
  }

  useEffect(() => {
    if (me === undefined) return;
    if (me === null || !me.orgId) { router.replace("/onboarding"); return; }
    if (me.role === "member") { router.replace("/my"); return; }
  }, [me, router]);

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  if (me === null || !me.orgId || me.role === "member") return null;

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

        {/* Org management card */}
        {myOrg && (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-gray-100">

                {/* LEFT — Org info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{myOrg.name}</p>
                      {myOrg.department && (
                        <p className="text-xs text-gray-400">{myOrg.department}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Invite Code
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold tracking-[0.2em] text-gray-900">
                        {myOrg.inviteCode}
                      </span>
                      <button
                        onClick={handleCopyInvite}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-all ${
                          copied
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy link
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      Share this code or link so members can join your team.
                    </p>
                  </div>
                </div>

                {/* RIGHT — Sub-orgs */}
                <div className="space-y-3 md:pl-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Sub-orgs
                    </p>
                    <button
                      onClick={() => setIsSubOrgOpen(true)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Create
                    </button>
                  </div>

                  {subOrgs === undefined ? (
                    <p className="text-xs text-gray-400">Loading...</p>
                  ) : subOrgs.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      No sub-orgs yet. Create one to split your team into departments.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {subOrgs.map((sub) => (
                        <div
                          key={sub._id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {sub.name}
                            </p>
                            {sub.department && (
                              <p className="text-xs text-gray-400">{sub.department}</p>
                            )}
                          </div>
                          <span className="font-mono text-xs text-gray-500 flex-shrink-0 ml-3">
                            {sub.inviteCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                <AvailabilityHeatmap clerkId={clerkUser?.id} />
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
                <ReassignmentPanel managerId={(me?._id as string) ?? ""} clerkId={clerkUser?.id} />
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

      {/* Create Sub-org Dialog */}
      <Dialog open={isSubOrgOpen} onOpenChange={(open) => { if (!open) handleCloseSubOrgDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Sub-org</DialogTitle>
          </DialogHeader>

          {newSubOrgCode ? (
            /* Success state */
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="rounded-full bg-emerald-100 p-3">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <p className="font-semibold text-emerald-900">Sub-org created!</p>
                <div className="space-y-1">
                  <p className="text-xs text-emerald-700">Invite code</p>
                  <p className="font-mono text-2xl font-bold tracking-[0.2em] text-emerald-900">
                    {newSubOrgCode}
                  </p>
                </div>
                <p className="text-xs text-emerald-700">
                  Share this code (or{" "}
                  <button
                    className="underline font-medium"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/join/${newSubOrgCode}`
                      );
                    }}
                  >
                    copy the link
                  </button>
                  ) with the members who should join this sub-org.
                </p>
              </div>
              <Button className="w-full" onClick={handleCloseSubOrgDialog}>
                Done
              </Button>
            </div>
          ) : (
            /* Form state */
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Sub-org Name *</label>
                <input
                  type="text"
                  value={subOrgForm.name}
                  onChange={(e) => setSubOrgForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Frontend Team"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Department
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={subOrgForm.department}
                  onChange={(e) => setSubOrgForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Engineering"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={handleCloseSubOrgDialog}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateSubOrg}
                  disabled={!subOrgForm.name.trim() || isCreatingSubOrg}
                >
                  {isCreatingSubOrg ? "Creating..." : "Create Sub-org"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
