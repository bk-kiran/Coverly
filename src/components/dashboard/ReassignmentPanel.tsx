"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ReassignmentSuggestion } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Sparkles,
  FileText,
  X,
  Check,
  Info,
  ChevronDown,
  Undo2,
} from "lucide-react";
import { format } from "date-fns";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
  high:     { label: "High",     className: "bg-orange-100 text-orange-700 border-orange-200" },
  medium:   { label: "Medium",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low:      { label: "Low",      className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const MANUAL_REASONS = [
  "Workload balancing",
  "Skill mismatch",
  "Voluntary",
  "OOO",
] as const;

type Mode = "auto" | "manual";
type AutoResult = { count: number; ids: Id<"reassignments">[] };

export function ReassignmentPanel({
  managerId,
  clerkId,
  focusTaskId,
}: {
  managerId: string;
  clerkId?: string;
  focusTaskId?: string | null;
}) {
  // Core suggestion state
  const [suggestions, setSuggestions] = useState<ReassignmentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReassignmentSuggestion | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Mode & feature toggles
  const [mode, setMode] = useState<Mode>("auto");
  const [manualTaskId, setManualTaskId] = useState<string>("");
  const [manualReason, setManualReason] = useState<string>("Workload balancing");
  const [autoApprove, setAutoApprove] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [autoResult, setAutoResult] = useState<AutoResult | null>(null);

  // Queries
  const atRiskTasks = useQuery(api.tasks.getAtRiskTasks, { clerkId });
  const allTasks = useQuery(api.tasks.getAllTasks, { clerkId });
  const teamMembers = useQuery(api.users.getTeamMembers, { clerkId });

  // Mutations
  const createReassignment = useMutation(api.reassignments.createReassignment);
  const approveReassignment = useMutation(api.reassignments.approveReassignment);
  const revertReassignment = useMutation(api.reassignments.revertReassignment);

  // Pre-load a specific task when focusTaskId changes (e.g. from "Fix Now" in risk alerts)
  useEffect(() => {
    if (!focusTaskId) return;
    setMode("manual");
    setSuggestions([]);
    setAutoResult(null);
    setManualTaskId(focusTaskId);
  }, [focusTaskId]);

  const hasOverloadedMembers = teamMembers?.some((m) => m.workloadScore > 80) ?? false;
  const activeTasks = (allTasks ?? []).filter((t) => t.status !== "done");

  // ─── AI fetch helpers ─────────────────────────────────────────────────────

  async function fetchSuggestions(tasksAtRisk: typeof atRiskTasks) {
    if (!tasksAtRisk?.length || !teamMembers || !allTasks) return [];
    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasksAtRisk, availableMembers: teamMembers, allTasks }),
    });
    const data = await res.json();
    return (data.suggestions ?? []) as ReassignmentSuggestion[];
  }

  async function handleGetSuggestions() {
    if (!atRiskTasks?.length || !teamMembers || !allTasks) return;
    setLoading(true);
    setAutoResult(null);
    try {
      const results = await fetchSuggestions(atRiskTasks);
      if (autoApprove && results.length > 0) {
        await handleAutoApproveAll(results);
      } else {
        setSuggestions(results);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSuggestion() {
    if (!manualTaskId || !teamMembers || !allTasks) return;
    const task = allTasks.find((t) => (t._id as string) === manualTaskId);
    if (!task) return;
    setLoading(true);
    setAutoResult(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await fetchSuggestions([task] as any);
      if (autoApprove && results.length > 0) {
        await handleAutoApproveAll(results);
      } else {
        setSuggestions(results);
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── Approve / reject ─────────────────────────────────────────────────────

  async function handleApprove(suggestion: ReassignmentSuggestion) {
    const toUserId = overrides[suggestion.taskId] ?? suggestion.suggestedAssigneeId;
    const id = await createReassignment({
      taskId: suggestion.taskId,
      fromUserId: suggestion.task.assigneeId,
      toUserId,
      managerId,
      handoffDoc: suggestion.handoffDoc,
      reasoning: suggestion.reasoning,
    });
    await approveReassignment({ id, overrideToUserId: overrides[suggestion.taskId] });
    setSuggestions((prev) => prev.filter((s) => s.taskId !== suggestion.taskId));
    setSelectedSuggestion(null);
  }

  function handleReject(taskId: string) {
    setSuggestions((prev) => prev.filter((s) => s.taskId !== taskId));
  }

  async function handleAutoApproveAll(suggestionsToApprove: ReassignmentSuggestion[]) {
    const ids: Id<"reassignments">[] = [];
    await Promise.all(
      suggestionsToApprove.map(async (suggestion) => {
        const toUserId = overrides[suggestion.taskId] ?? suggestion.suggestedAssigneeId;
        const id = await createReassignment({
          taskId: suggestion.taskId,
          fromUserId: suggestion.task.assigneeId,
          toUserId,
          managerId,
          handoffDoc: suggestion.handoffDoc,
          reasoning: suggestion.reasoning,
        });
        await approveReassignment({ id, overrideToUserId: overrides[suggestion.taskId] });
        ids.push(id);
      })
    );
    setSuggestions([]);
    setAutoResult({ count: suggestionsToApprove.length, ids });
  }

  async function handleUndo() {
    if (!autoResult) return;
    await Promise.all(autoResult.ids.map((id) => revertReassignment({ id })));
    setAutoResult(null);
  }

  // ─── Shared mode switcher ──────────────────────────────────────────────────

  function switchMode(next: Mode) {
    setMode(next);
    setSuggestions([]);
    setAutoResult(null);
    setManualTaskId("");
  }

  return (
    <div className="space-y-3">

      {/* ── Info box ── */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 overflow-hidden">
        <button
          onClick={() => setShowInfo((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-blue-700 dark:text-blue-400 font-medium"
        >
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            How AI Coverage Works
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-150 ${
              showInfo ? "rotate-180" : ""
            }`}
          />
        </button>
        {showInfo && (
          <div className="px-3 pb-3 space-y-1 text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            <p>• Analyzes who is OOO or overloaded</p>
            <p>• Matches tasks to available members by skill and workload</p>
            <p>• Generates handoff docs so nothing gets lost</p>
            <p>• You can approve, tweak, or reject each suggestion</p>
          </div>
        )}
      </div>

      {/* ── Auto-approve toggle ── */}
      <div className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Auto-approve AI suggestions</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Approves all suggestions immediately</p>
        </div>
        <button
          role="switch"
          aria-checked={autoApprove}
          onClick={() => setAutoApprove((v) => !v)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
            autoApprove ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              autoApprove ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* ── Mode tabs ── */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={() => switchMode("auto")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "auto"
              ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Auto Coverage
        </button>
        <button
          onClick={() => switchMode("manual")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "manual"
              ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Reassign Task
        </button>
      </div>

      {/* ── Mode A — Auto Coverage ── */}
      {mode === "auto" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {atRiskTasks === undefined
                ? "Loading..."
                : `${atRiskTasks.length} task${atRiskTasks.length !== 1 ? "s" : ""} at risk`}
            </p>
            <Button
              onClick={handleGetSuggestions}
              disabled={loading || !atRiskTasks?.length}
              size="sm"
              className="gap-1.5 flex-shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loading ? "Thinking..." : "Get AI Suggestions"}
            </Button>
          </div>

          {hasOverloadedMembers && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                One or more members are at &gt;80% capacity — the AI will skip them.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Mode B — Reassign Task ── */}
      {mode === "manual" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Select task</label>
            <Select value={manualTaskId} onValueChange={setManualTaskId}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Choose an active task…" />
              </SelectTrigger>
              <SelectContent>
                {activeTasks.map((task) => (
                  <SelectItem key={task._id as string} value={task._id as string}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Reason</label>
            <Select value={manualReason} onValueChange={setManualReason}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleManualSuggestion}
            disabled={loading || !manualTaskId}
            size="sm"
            className="w-full gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? "Thinking..." : "Get AI Suggestion"}
          </Button>
        </div>
      )}

      {/* ── Auto-approve result banner ── */}
      {autoResult && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Auto-reassigned {autoResult.count} task{autoResult.count !== 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">All suggestions were approved</p>
          </div>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 flex-shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded-md px-2.5 py-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </button>
        </div>
      )}

      {/* ── Suggestion cards ── */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const selectedId = overrides[suggestion.taskId] ?? suggestion.suggestedAssigneeId;
            const selectedMember = teamMembers?.find(
              (m) => (m._id as string) === selectedId
            );
            const workload = selectedMember?.workloadScore ?? 0;
            const isOverloaded = workload > 80;
            const priority = PRIORITY_CONFIG[suggestion.task.priority];

            return (
              <div
                key={suggestion.taskId}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 shadow-sm"
              >
                {/* Task info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate">
                      {suggestion.task.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 dark:text-gray-500">
                      <span>Due {format(new Date(suggestion.task.deadline), "MMM d")}</span>
                      <span>·</span>
                      <span>{suggestion.task.projectTag}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`flex-shrink-0 text-xs font-medium border ${priority?.className ?? ""}`}
                  >
                    {priority?.label ?? suggestion.task.priority}
                  </Badge>
                </div>

                {/* Assignee selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Assign to
                  </label>
                  <Select
                    value={selectedId}
                    onValueChange={(val) =>
                      setOverrides((prev) => ({ ...prev, [suggestion.taskId]: val }))
                    }
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers?.map((member) => (
                        <SelectItem key={member._id as string} value={member._id as string}>
                          {member.name} — {member.workloadScore}% load
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p
                    className={`text-[10px] font-medium ${
                      isOverloaded ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {workload}% workload
                    {isOverloaded ? " — overloaded" : ""}
                  </p>
                </div>

                {/* AI reasoning */}
                <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
                  {suggestion.reasoning}
                </p>

                {/* Confidence */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${suggestion.confidenceScore}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {suggestion.confidenceScore}% confidence
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-gray-600 text-xs"
                    onClick={() => setSelectedSuggestion(suggestion)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Handoff
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs"
                    onClick={() => handleReject(suggestion.taskId)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => handleApprove(suggestion)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Idle / empty state ── */}
      {!loading && suggestions.length === 0 && !autoResult && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          {mode === "auto" ? (
            atRiskTasks?.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No at-risk tasks — great job! 🎉</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Click &ldquo;Get AI Suggestions&rdquo; to generate recommendations.
              </p>
            )
          ) : (
            <p className="text-sm text-gray-400">
              Select a task above and click &ldquo;Get AI Suggestion&rdquo;.
            </p>
          )}
        </div>
      )}

      {/* ── Handoff doc dialog ── */}
      <Dialog
        open={selectedSuggestion !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSuggestion(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug">
              Handoff Doc — {selectedSuggestion?.task.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {selectedSuggestion?.handoffDoc}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSuggestion(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (selectedSuggestion) handleApprove(selectedSuggestion);
                }}
              >
                <Check className="h-3.5 w-3.5" />
                Approve &amp; Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
