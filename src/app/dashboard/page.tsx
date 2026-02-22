"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { AvailabilityHeatmap } from "@/components/dashboard/AvailabilityHeatmap";
import { ReassignmentPanel } from "@/components/dashboard/ReassignmentPanel";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
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
import { AlertTriangle, Users, CheckSquare, Zap, Plus, Copy, Check, Building2, CalendarCheck, Sparkles, Scale, Pencil, Trash2 } from "lucide-react";
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
  const allAvailability = useQuery(api.availability.getAllAvailability, { clerkId: clerkUser?.id });
  const subOrgs = useQuery(
    api.orgs.getSubOrgs,
    myOrg?._id ? { parentOrgId: myOrg._id as string } : "skip"
  );
  const createTask = useMutation(api.tasks.createTask);
  const createSubOrg = useMutation(api.orgs.createSubOrg);
  const renameOrg = useMutation(api.orgs.renameOrg);
  const deleteOrg = useMutation(api.orgs.deleteOrg);
  const createReassignment = useMutation(api.reassignments.createReassignment);
  const approveReassignment = useMutation(api.reassignments.approveReassignment);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);

  // AI assignment state
  const [assignMode, setAssignMode] = useState<"manual" | "ai">("manual");
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggestedAssigneeId: string;
    assigneeReasoning: string;
    suggestedDeadline: string;
    suggestedPriority: string;
    confidenceScore: number;
  } | null>(null);
  const [isFetchingAI, setIsFetchingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHints, setAiHints] = useState<{
    suggestedDeadline: string;
    suggestedPriority: string;
  } | null>(null);
  const [isFetchingHints, setIsFetchingHints] = useState(false);

  // Rebalance state
  type RebalanceSuggestion = {
    taskId: string;
    taskTitle: string;
    fromMemberId: string;
    fromMemberName: string;
    toMemberId: string;
    toMemberName: string;
    reasoning: string;
  };
  type RebalancePhase = "idle" | "loading" | "results" | "success";
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [rebalancePhase, setRebalancePhase] = useState<RebalancePhase>("idle");
  const [rebalanceData, setRebalanceData] = useState<{
    summary: string;
    suggestions: RebalanceSuggestion[];
    expectedOutcome: string;
  } | null>(null);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [rebalanceCount, setRebalanceCount] = useState(0);
  const [isApprovingRebalance, setIsApprovingRebalance] = useState(false);
  const [rebalanceError, setRebalanceError] = useState<string | null>(null);

  // Risk alerts state
  type AiRisk = {
    type: string;
    severity: "critical" | "high" | "medium";
    taskId: string;
    taskTitle: string;
    memberId: string;
    memberName: string;
    description: string;
    suggestedAction: string;
  };
  const [aiRisks, setAiRisks] = useState<AiRisk[]>([]);
  const [risksChecked, setRisksChecked] = useState(false);
  const [riskFocusTaskId, setRiskFocusTaskId] = useState<string | null>(null);

  // Org management state
  const [copied, setCopied] = useState(false);
  const [isSubOrgOpen, setIsSubOrgOpen] = useState(false);
  const [subOrgForm, setSubOrgForm] = useState({ name: "", department: "" });
  const [isCreatingSubOrg, setIsCreatingSubOrg] = useState(false);
  const [newSubOrgCode, setNewSubOrgCode] = useState<string | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    orgId: string;
    name: string;
    department: string;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ orgId: string; name: string } | null>(null);
  const [isRenamingOrg, setIsRenamingOrg] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [orgActionError, setOrgActionError] = useState<string | null>(null);

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

  function openRenameOrgDialog(org: { _id: string; name: string; department?: string }) {
    setOrgActionError(null);
    setRenameDialog({
      orgId: org._id,
      name: org.name,
      department: org.department ?? "",
    });
  }

  function openDeleteOrgDialog(org: { _id: string; name: string }) {
    setOrgActionError(null);
    setDeleteDialog({ orgId: org._id, name: org.name });
  }

  async function handleRenameOrg() {
    if (!renameDialog || !renameDialog.name.trim()) return;
    setIsRenamingOrg(true);
    setOrgActionError(null);
    try {
      await renameOrg({
        orgId: renameDialog.orgId,
        name: renameDialog.name.trim(),
        department: renameDialog.department.trim() || undefined,
      });
      setRenameDialog(null);
    } catch (err: unknown) {
      setOrgActionError(err instanceof Error ? err.message : "Failed to rename organization");
    } finally {
      setIsRenamingOrg(false);
    }
  }

  async function handleDeleteOrg() {
    if (!deleteDialog) return;
    setIsDeletingOrg(true);
    setOrgActionError(null);
    try {
      await deleteOrg({ orgId: deleteDialog.orgId });
      const deletedActiveOrg = deleteDialog.orgId === (myOrg?._id as string | undefined);
      setDeleteDialog(null);
      if (deletedActiveOrg) {
        router.refresh();
      }
    } catch (err: unknown) {
      setOrgActionError(err instanceof Error ? err.message : "Failed to delete organization");
    } finally {
      setIsDeletingOrg(false);
    }
  }

  useEffect(() => {
    if (me === undefined) return;
    if (me === null || !me.orgId) { router.replace("/onboarding"); return; }
    if (me.role === "member") { router.replace("/my"); return; }
  }, [me, router]);

  // Run AI risk check once per session after data loads
  useEffect(() => {
    if (risksChecked || !allTasks || !teamMembers || !allAvailability) return;
    if (allTasks.length === 0) return;
    setRisksChecked(true);
    fetch("/api/ai/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: allTasks, members: teamMembers, availability: allAvailability }),
    })
      .then((r) => r.json())
      .then((data) => setAiRisks(data.risks ?? []))
      .catch(() => {});
  }, [allTasks, teamMembers, allAvailability, risksChecked]);

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingApprovalCount = (allTasks ?? []).filter((t) => (t as any).completionStatus === "pending_approval").length;

  // Set of member IDs who have at least one calendar-imported availability entry
  const calendarSyncedIds = new Set(
    (allAvailability ?? [])
      .filter((a) => a.note?.startsWith("Imported from calendar"))
      .map((a) => a.userId as string)
  );
  const calendarSyncedCount = (teamMembers ?? []).filter((m) =>
    calendarSyncedIds.has(m._id as string)
  ).length;

  function getMemberLiveScore(memberId: string): number {
    const memberTasks = (allTasks ?? []).filter(
      (t) => (t.assigneeId as string) === memberId
    );
    return computeWorkloadScore(memberTasks);
  }

  function resetAndClose() {
    setForm({ ...EMPTY_FORM });
    setIsOpen(false);
    setAssignMode("manual");
    setAiSuggestion(null);
    setAiError(null);
    setAiHints(null);
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

  async function handleGetAIAssignment() {
    if (!form.title || !form.description || !form.projectTag) return;
    setIsFetchingAI(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: {
            title: form.title,
            description: form.description,
            priority: form.priority,
            deadline: form.deadline,
            skillRequired: form.skillRequired || undefined,
            projectTag: form.projectTag,
          },
          teamMembers: teamMembers ?? [],
          allTasks: allTasks ?? [],
          allAvailability: allAvailability ?? [],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiSuggestion(data);
    } catch {
      setAiError("AI couldn't generate a suggestion. Please try again.");
    } finally {
      setIsFetchingAI(false);
    }
  }

  async function handleUseAISuggestion() {
    if (!aiSuggestion) return;
    setIsSaving(true);
    try {
      await createTask({
        title: form.title,
        description: form.description,
        assigneeId: aiSuggestion.suggestedAssigneeId,
        createdById: (me?._id as string) ?? "",
        priority: (aiSuggestion.suggestedPriority as typeof form.priority) || form.priority,
        status: form.status,
        deadline: aiSuggestion.suggestedDeadline || form.deadline,
        projectTag: form.projectTag,
        skillRequired: form.skillRequired || undefined,
      });
      resetAndClose();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGetHints() {
    if (!form.title || !form.description) return;
    setIsFetchingHints(true);
    try {
      const res = await fetch("/api/ai/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: {
            title: form.title,
            description: form.description,
            priority: form.priority,
            deadline: form.deadline,
            skillRequired: form.skillRequired || undefined,
            projectTag: form.projectTag || "General",
          },
          teamMembers: teamMembers ?? [],
          allTasks: allTasks ?? [],
          allAvailability: allAvailability ?? [],
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setAiHints({
          suggestedDeadline: data.suggestedDeadline,
          suggestedPriority: data.suggestedPriority,
        });
      }
    } finally {
      setIsFetchingHints(false);
    }
  }

  async function handleRebalance() {
    setRebalancePhase("loading");
    setRebalanceError(null);
    try {
      const res = await fetch("/api/ai/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: teamMembers ?? [],
          tasks: allTasks ?? [],
          availability: allAvailability ?? [],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRebalanceData(data);
      setSelectedSuggestionIds(new Set((data.suggestions ?? []).map((s: { taskId: string }) => s.taskId)));
      setRebalancePhase("results");
    } catch {
      setRebalanceError("Failed to generate suggestions. Please try again.");
      setRebalancePhase("idle");
    }
  }

  async function handleApproveRebalance(ids: Set<string>) {
    if (!rebalanceData) return;
    setIsApprovingRebalance(true);
    const toApprove = rebalanceData.suggestions.filter((s) => ids.has(s.taskId));
    let count = 0;
    try {
      await Promise.all(
        toApprove.map(async (s) => {
          const id = await createReassignment({
            taskId: s.taskId,
            fromUserId: s.fromMemberId,
            toUserId: s.toMemberId,
            managerId: (me?._id as string) ?? "",
            handoffDoc: `Reassigned from ${s.fromMemberName} to ${s.toMemberName} as part of team workload rebalancing. ${s.reasoning}`,
            reasoning: s.reasoning,
          });
          await approveReassignment({ id });
          count++;
        })
      );
    } finally {
      setRebalanceCount(count);
      setRebalancePhase("success");
      setIsApprovingRebalance(false);
    }
  }

  const suggestedMember = aiSuggestion
    ? (teamMembers ?? []).find((m) => (m._id as string) === aiSuggestion.suggestedAssigneeId)
    : null;

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Nobody drops the ball — Coverly keeps your team covered.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => { setRebalanceOpen(true); setRebalancePhase("idle"); setRebalanceData(null); setRebalanceError(null); }}
              className="gap-2"
            >
              <Scale className="h-4 w-4" />
              Rebalance Team
            </Button>
            <Button onClick={() => setIsOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Pending approval banner */}
        {pendingApprovalCount > 0 && (
          <button
            onClick={() => router.push("/dashboard/team?tab=pending")}
            className="w-full text-left rounded-xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 flex items-center gap-3 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
          >
            <span className="text-base">🔔</span>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              {pendingApprovalCount} task{pendingApprovalCount !== 1 ? "s" : ""} awaiting your approval
            </span>
            <span className="ml-auto text-xs text-yellow-600 dark:text-yellow-400 font-medium">View →</span>
          </button>
        )}

        {/* Org management card */}
        {myOrg && (
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-gray-100 dark:md:divide-gray-700">

                {/* LEFT — Org info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{myOrg.name}</p>
                      {myOrg.department && (
                        <p className="text-xs text-gray-400">{myOrg.department}</p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        openRenameOrgDialog({
                          _id: myOrg._id as string,
                          name: myOrg.name,
                          department: myOrg.department,
                        })
                      }
                      className="ml-auto flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Rename
                    </button>
                    <button
                      onClick={() =>
                        openDeleteOrgDialog({
                          _id: myOrg._id as string,
                          name: myOrg.name,
                        })
                      }
                      className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Invite Code
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold tracking-[0.2em] text-gray-900 dark:text-white">
                        {myOrg.inviteCode}
                      </span>
                      <button
                        onClick={handleCopyInvite}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-all ${
                          copied
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
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

                  {/* Calendar sync status */}
                  <div className="flex items-center gap-2">
                    <CalendarCheck className={`h-3.5 w-3.5 flex-shrink-0 ${calendarSyncedCount > 0 ? "text-emerald-500" : "text-gray-300"}`} />
                    <p className="text-xs text-gray-500">
                      <span className={`font-semibold ${calendarSyncedCount > 0 ? "text-emerald-600" : "text-gray-400"}`}>
                        {calendarSyncedCount}
                      </span>
                      {" / "}
                      <span className="font-semibold text-gray-700">{teamMembers?.length ?? "—"}</span>
                      {" "}members have synced their calendar
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
                          className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {sub.name}
                            </p>
                            {sub.department && (
                              <p className="text-xs text-gray-400">{sub.department}</p>
                            )}
                          </div>
                          <span className="font-mono text-xs text-gray-500 flex-shrink-0 ml-3">
                            {sub.inviteCode}
                          </span>
                          <div className="ml-3 flex items-center gap-1">
                            <button
                              onClick={() =>
                                openRenameOrgDialog({
                                  _id: sub._id as string,
                                  name: sub.name,
                                  department: sub.department,
                                })
                              }
                              className="rounded border border-gray-200 p-1 text-gray-500 hover:bg-white transition-colors"
                              aria-label={`Rename ${sub.name}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() =>
                                openDeleteOrgDialog({
                                  _id: sub._id as string,
                                  name: sub.name,
                                })
                              }
                              className="rounded border border-red-200 p-1 text-red-500 hover:bg-red-50 transition-colors"
                              aria-label={`Delete ${sub.name}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
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
            <Card key={stat.label} className="bg-white dark:bg-gray-800 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Risk Alerts */}
        {aiRisks.length > 0 && (
          <Card className="bg-white dark:bg-gray-800 shadow-sm border-orange-200 dark:border-orange-900 border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                AI Risk Alerts
                <span className="ml-auto text-xs font-normal text-gray-400">Detected on page load</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {aiRisks.map((risk, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-4 py-3"
                  >
                    <span className="flex-shrink-0 text-base mt-0.5">
                      {risk.severity === "critical" ? "🔴" : risk.severity === "high" ? "🟡" : "⚪"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{risk.taskTitle}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{risk.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{risk.suggestedAction}</p>
                    </div>
                    <button
                      onClick={() => {
                        setRiskFocusTaskId(risk.taskId);
                        document
                          .getElementById("ai-panel")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="flex-shrink-0 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                    >
                      Fix Now
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-gray-800 shadow-sm h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  Team Availability — Next 2 Weeks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <AvailabilityHeatmap
                  clerkId={clerkUser?.id}
                  onSuggestCoverage={() => {
                    document
                      .getElementById("ai-panel")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <div id="ai-panel" className="lg:col-span-1">
            <Card className="bg-white dark:bg-gray-800 shadow-sm border-blue-200 dark:border-blue-900 border-2 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  AI Coverage Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ReassignmentPanel
                  managerId={(me?._id as string) ?? ""}
                  clerkId={clerkUser?.id}
                  focusTaskId={riskFocusTaskId}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Team Insights */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Team Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InsightsPanel
              teamData={{
                members: teamMembers ?? [],
                tasks: allTasks ?? [],
                availability: allAvailability ?? [],
              }}
            />
          </CardContent>
        </Card>

        {/* Deadline risk feed */}
        {atRiskTasks && atRiskTasks.length > 0 && (
          <Card className="bg-white dark:bg-gray-800 shadow-sm border-red-200 dark:border-red-900 border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
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
                      className="flex items-center justify-between gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            {assignee?.name ?? "Unassigned"}
                            {assignee && (
                              <span
                                className={`font-medium ${
                                  liveScore > 80 ? "text-red-600" : "text-gray-400"
                                }`}
                              >
                                ({liveScore}%)
                              </span>
                            )}
                            {assignee && calendarSyncedIds.has(assignee._id as string) && (
                              <CalendarCheck className="h-3 w-3 text-emerald-500" aria-label="Calendar synced" />
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

      {/* Rebalance Team Dialog */}
      <Dialog
        open={!!renameDialog}
        onOpenChange={(open) => {
          if (!open && !isRenamingOrg) {
            setRenameDialog(null);
            setOrgActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Organization name</label>
              <input
                type="text"
                value={renameDialog?.name ?? ""}
                onChange={(e) =>
                  setRenameDialog((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Department <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={renameDialog?.department ?? ""}
                onChange={(e) =>
                  setRenameDialog((prev) =>
                    prev ? { ...prev, department: e.target.value } : prev
                  )
                }
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {orgActionError && (
              <p className="text-xs text-red-600">{orgActionError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRenameDialog(null);
                setOrgActionError(null);
              }}
              disabled={isRenamingOrg}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRenameOrg}
              disabled={isRenamingOrg || !renameDialog?.name.trim()}
            >
              {isRenamingOrg ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open && !isDeletingOrg) {
            setDeleteDialog(null);
            setOrgActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              This will permanently delete{" "}
              <span className="font-semibold text-gray-900">{deleteDialog?.name}</span>.
            </p>
            <p className="text-xs text-gray-500">
              You can only delete orgs that have no sub-orgs.
            </p>
            {orgActionError && (
              <p className="text-xs text-red-600">{orgActionError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteDialog(null);
                setOrgActionError(null);
              }}
              disabled={isDeletingOrg}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteOrg}
              disabled={isDeletingOrg}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingOrg ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rebalanceOpen}
        onOpenChange={(open) => {
          if (!open && !isApprovingRebalance) {
            setRebalanceOpen(false);
            setRebalancePhase("idle");
            setRebalanceData(null);
            setRebalanceError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-500" />
              Rebalance Team Workload
            </DialogTitle>
          </DialogHeader>

          {/* Loading */}
          {rebalancePhase === "idle" && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-500">
                AI will analyze your team&apos;s current workload and suggest task reassignments to
                distribute work more evenly.
              </p>
              {rebalanceError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {rebalanceError}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setRebalanceOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleRebalance} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Analyze &amp; Suggest
                </Button>
              </DialogFooter>
            </div>
          )}

          {rebalancePhase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="h-7 w-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-400">Analyzing team workload&hellip;</p>
            </div>
          )}

          {rebalancePhase === "results" && rebalanceData && (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-600 leading-relaxed">{rebalanceData.summary}</p>
              </div>

              {/* Suggestion cards */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Suggested moves
                </p>
                {rebalanceData.suggestions.map((s) => {
                  const isSelected = selectedSuggestionIds.has(s.taskId);
                  return (
                    <div
                      key={s.taskId}
                      className={`rounded-xl border px-4 py-3 space-y-2 transition-colors ${
                        isSelected
                          ? "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedSuggestionIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(s.taskId);
                              else next.delete(s.taskId);
                              return next;
                            });
                          }}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.taskTitle}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{s.fromMemberName}</span>
                            {" → "}
                            <span className="font-medium text-blue-700 dark:text-blue-400">{s.toMemberName}</span>
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">{s.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expected outcome */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">
                  Expected outcome
                </p>
                <p className="text-xs text-emerald-800 leading-relaxed">{rebalanceData.expectedOutcome}</p>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRebalanceOpen(false)}
                  disabled={isApprovingRebalance}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApproveRebalance(selectedSuggestionIds)}
                  disabled={isApprovingRebalance || selectedSuggestionIds.size === 0}
                >
                  {isApprovingRebalance ? "Approving…" : `Approve Selected (${selectedSuggestionIds.size})`}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    handleApproveRebalance(
                      new Set(rebalanceData.suggestions.map((s) => s.taskId))
                    )
                  }
                  disabled={isApprovingRebalance}
                  className="gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isApprovingRebalance ? "Approving…" : "Approve All"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {rebalancePhase === "success" && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="rounded-full bg-emerald-100 p-3">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <p className="font-semibold text-emerald-900">Rebalanced!</p>
                <p className="text-sm text-emerald-700">
                  {rebalanceCount} task{rebalanceCount !== 1 ? "s" : ""} reassigned across the team.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setRebalanceOpen(false);
                  setRebalancePhase("idle");
                  setRebalanceData(null);
                }}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Fix payment gateway bug"
                className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What needs to be done and why..."
                rows={3}
                className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Assignment mode toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 bg-gray-50 dark:bg-gray-700">
              <button
                type="button"
                onClick={() => { setAssignMode("manual"); setAiSuggestion(null); setAiError(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  assignMode === "manual"
                    ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Assign manually
              </button>
              <button
                type="button"
                onClick={() => { setAssignMode("ai"); setAiHints(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  assignMode === "ai"
                    ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Let AI assign ✨
              </button>
            </div>

            {/* Assignee — conditional on mode */}
            {assignMode === "manual" ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assignee *</label>
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
            ) : aiSuggestion && suggestedMember ? (
              /* AI suggestion preview card */
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                    AI Suggestion
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700">
                      {suggestedMember.name
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{suggestedMember.name}</p>
                    <p className="text-xs text-gray-500">{suggestedMember.workloadScore}% current load</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {aiSuggestion.confidenceScore}% confident
                  </span>
                </div>
                <p className="text-xs text-gray-600 italic leading-relaxed">
                  {aiSuggestion.assigneeReasoning}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-white border border-blue-100 px-2.5 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Suggested deadline</p>
                    <p className="text-xs font-medium text-gray-800 mt-0.5">{aiSuggestion.suggestedDeadline}</p>
                  </div>
                  <div className="rounded-md bg-white border border-blue-100 px-2.5 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Suggested priority</p>
                    <p className="text-xs font-medium text-gray-800 capitalize mt-0.5">{aiSuggestion.suggestedPriority}</p>
                  </div>
                </div>
                {aiError && (
                  <p className="text-xs text-red-600">{aiError}</p>
                )}
              </div>
            ) : (
              /* AI pending — info box */
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI will suggest the best person
                </p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Based on skills, workload, and availability — fill in the task details above then click &ldquo;Get AI Assignment&rdquo;.
                </p>
                {aiError && (
                  <p className="text-xs text-red-600 mt-1">{aiError}</p>
                )}
              </div>
            )}

            {/* Priority + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
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
                {assignMode === "manual" && aiHints?.suggestedPriority && (
                  <p className="text-[11px] text-blue-600 flex items-center gap-1 mt-0.5">
                    💡 Suggested:{" "}
                    <span className="font-semibold capitalize">{aiHints.suggestedPriority}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          priority: aiHints.suggestedPriority as typeof f.priority,
                        }))
                      }
                      className="underline text-blue-500 hover:text-blue-700 ml-0.5"
                    >
                      Apply
                    </button>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deadline *</label>
                <input
                  type="date"
                  value={form.deadline}
                  min={todayStr()}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {assignMode === "manual" && (
                  aiHints?.suggestedDeadline ? (
                    <p className="text-[11px] text-blue-600 flex items-center gap-1 mt-0.5">
                      💡 Based on team workload:{" "}
                      <span className="font-semibold">{aiHints.suggestedDeadline}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, deadline: aiHints!.suggestedDeadline }))
                        }
                        className="underline text-blue-500 hover:text-blue-700 ml-0.5"
                      >
                        Apply
                      </button>
                    </p>
                  ) : form.title && form.description ? (
                    <button
                      type="button"
                      onClick={handleGetHints}
                      disabled={isFetchingHints}
                      className="mt-0.5 flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      {isFetchingHints ? "Getting hints…" : "💡 Get AI hints for deadline & priority"}
                    </button>
                  ) : null
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Project Tag *</label>
                <input
                  type="text"
                  value={form.projectTag}
                  onChange={(e) => setForm((f) => ({ ...f, projectTag: e.target.value }))}
                  placeholder="e.g. Platform"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Skill Required */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
            <Button
              variant="outline"
              size="sm"
              onClick={resetAndClose}
              disabled={isSaving || isFetchingAI}
            >
              Cancel
            </Button>

            {assignMode === "ai" && aiSuggestion ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAiSuggestion(null); setAssignMode("manual"); }}
                  disabled={isSaving}
                >
                  Choose manually
                </Button>
                <Button
                  size="sm"
                  onClick={handleUseAISuggestion}
                  disabled={isSaving}
                >
                  {isSaving ? "Creating..." : "Use this suggestion"}
                </Button>
              </>
            ) : assignMode === "ai" ? (
              <Button
                size="sm"
                onClick={handleGetAIAssignment}
                disabled={
                  isFetchingAI ||
                  !form.title ||
                  !form.description ||
                  !form.projectTag
                }
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isFetchingAI ? "Thinking…" : "Get AI Assignment"}
              </Button>
            ) : (
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
            )}
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sub-org Name *</label>
                <input
                  type="text"
                  value={subOrgForm.name}
                  onChange={(e) => setSubOrgForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Frontend Team"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={subOrgForm.department}
                  onChange={(e) => setSubOrgForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Engineering"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
