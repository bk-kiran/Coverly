"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import { AlertTriangle, Sparkles, FileText, X, Check } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
  high:     { label: "High",     className: "bg-orange-100 text-orange-700 border-orange-200" },
  medium:   { label: "Medium",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low:      { label: "Low",      className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function ReassignmentPanel({ managerId }: { managerId: string }) {
  const [suggestions, setSuggestions] = useState<ReassignmentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReassignmentSuggestion | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const atRiskTasks = useQuery(api.tasks.getAtRiskTasks);
  const allTasks = useQuery(api.tasks.getAllTasks);
  const teamMembers = useQuery(api.users.getTeamMembers);

  const createReassignment = useMutation(api.reassignments.createReassignment);
  const approveReassignment = useMutation(api.reassignments.approveReassignment);

  const hasOverloadedMembers = teamMembers?.some((m) => m.workloadScore > 80) ?? false;

  async function handleGetSuggestions() {
    if (!atRiskTasks?.length || !teamMembers || !allTasks) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasksAtRisk: atRiskTasks,
          availableMembers: teamMembers,
          allTasks,
        }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } finally {
      setLoading(false);
    }
  }

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
    await approveReassignment({
      id,
      overrideToUserId: overrides[suggestion.taskId],
    });
    setSuggestions((prev) => prev.filter((s) => s.taskId !== suggestion.taskId));
    setSelectedSuggestion(null);
  }

  function handleReject(taskId: string) {
    setSuggestions((prev) => prev.filter((s) => s.taskId !== taskId));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reassignment Panel</h2>
          <p className="text-sm text-gray-500">
            {atRiskTasks === undefined
              ? "Loading..."
              : `${atRiskTasks.length} task${atRiskTasks.length !== 1 ? "s" : ""} at risk`}
          </p>
        </div>
        <Button
          onClick={handleGetSuggestions}
          disabled={loading || !atRiskTasks?.length}
          className="gap-2 flex-shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Thinking..." : "Get AI Suggestions"}
        </Button>
      </div>

      {/* Overloaded warning */}
      {hasOverloadedMembers && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            One or more team members are at &gt;80% capacity. The AI will avoid suggesting
            them for new assignments.
          </span>
        </div>
      )}

      {/* Suggestion cards */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const selectedId =
              overrides[suggestion.taskId] ?? suggestion.suggestedAssigneeId;
            const selectedMember = teamMembers?.find(
              (m) => (m._id as string) === selectedId
            );
            const workload = selectedMember?.workloadScore ?? 0;
            const isOverloaded = workload > 80;
            const priority = PRIORITY_CONFIG[suggestion.task.priority];

            return (
              <div
                key={suggestion.taskId}
                className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm"
              >
                {/* Task info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-snug">
                      {suggestion.task.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">
                    Assign to
                  </label>
                  <Select
                    value={selectedId}
                    onValueChange={(val) =>
                      setOverrides((prev) => ({ ...prev, [suggestion.taskId]: val }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers?.map((member) => (
                        <SelectItem key={member._id} value={member._id as string}>
                          {member.name} — {member.workloadScore}% load
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p
                    className={`text-xs font-medium ${
                      isOverloaded ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {workload}% workload
                    {isOverloaded ? " — this person is overloaded" : ""}
                  </p>
                </div>

                {/* AI reasoning */}
                <p className="text-sm text-gray-500 italic leading-relaxed">
                  {suggestion.reasoning}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-gray-600"
                    onClick={() => setSelectedSuggestion(suggestion)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Handoff
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleReject(suggestion.taskId)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
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

      {/* Empty / idle state */}
      {!loading && suggestions.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-1">
          {atRiskTasks?.length === 0 ? (
            <p className="text-sm text-gray-400">
              No at-risk tasks right now — great job! 🎉
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Click &ldquo;Get AI Suggestions&rdquo; to generate reassignment recommendations.
            </p>
          )}
        </div>
      )}

      {/* Handoff doc dialog */}
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
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
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
