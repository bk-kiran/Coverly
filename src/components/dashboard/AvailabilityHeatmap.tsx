"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { addDays, format, isSameDay } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { DayStatus } from "@/types";
import {
  computeWorkloadScore,
  getWorkloadLabel,
  getWorkloadColor,
} from "@/lib/workload";

const STATUS_CONFIG: Record<
  DayStatus,
  { bg: string; light: string; label: string; badgeClass: string }
> = {
  available:   { bg: "bg-emerald-500", light: "bg-emerald-100", label: "Available",   badgeClass: "bg-emerald-100 text-emerald-700" },
  partial:     { bg: "bg-yellow-400",  light: "bg-yellow-100",  label: "Partial",     badgeClass: "bg-yellow-100 text-yellow-700" },
  at_capacity: { bg: "bg-orange-500",  light: "bg-orange-100",  label: "At Capacity", badgeClass: "bg-orange-100 text-orange-700" },
  ooo:         { bg: "bg-red-500",     light: "bg-red-100",     label: "OOO",         badgeClass: "bg-red-100 text-red-700" },
};

const PRIORITY_CONFIG: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:      "bg-gray-100 text-gray-600 border-gray-200",
};

const LEGEND_STATUSES: DayStatus[] = ["available", "partial", "at_capacity", "ooo"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AvailEntry = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MemberDoc = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskDoc = Record<string, any>;

type SelectedCell = {
  member: MemberDoc;
  date: Date;
  entry: AvailEntry | null;
};

function getDayStatus(
  userId: string,
  date: Date,
  availability: AvailEntry[]
): DayStatus {
  const dateStr = format(date, "yyyy-MM-dd");
  const entry = availability.find(
    (a) => a.userId === userId && a.startDate <= dateStr && a.endDate >= dateStr
  );
  return entry ? (entry.type as DayStatus) : "available";
}

function getAvailabilityEntry(
  userId: string,
  date: Date,
  availability: AvailEntry[]
): AvailEntry | null {
  const dateStr = format(date, "yyyy-MM-dd");
  return (
    availability.find(
      (a) => a.userId === userId && a.startDate <= dateStr && a.endDate >= dateStr
    ) ?? null
  );
}

function getWorkloadBarColor(score: number): string {
  if (score <= 30) return "bg-emerald-500";
  if (score <= 60) return "bg-yellow-400";
  if (score <= 80) return "bg-orange-500";
  return "bg-red-500";
}

function HeatmapSkeleton() {
  return (
    <div className="animate-pulse p-4 space-y-3">
      <div className="flex items-end">
        <div className="w-40 flex-shrink-0" />
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="flex-1 mx-0.5 space-y-1">
            <div className="h-3 bg-gray-200 rounded mx-1" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div className="w-40 flex-shrink-0 flex items-center gap-2 pr-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-2.5 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
          {Array.from({ length: 14 }).map((_, j) => (
            <div key={j} className="flex-1 mx-0.5 h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AvailabilityHeatmap({
  clerkId,
  onSuggestCoverage,
}: {
  clerkId?: string;
  onSuggestCoverage?: () => void;
}) {
  const members = useQuery(api.users.getTeamMembers, { clerkId });
  const allAvailability = useQuery(api.availability.getAllAvailability, { clerkId });
  const allTasks = useQuery(api.tasks.getAllTasks, { clerkId });

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const isLoading = members === undefined || allAvailability === undefined;

  // Dialog-computed values
  const selectedStatus: DayStatus = selectedCell
    ? getDayStatus(selectedCell.member._id as string, selectedCell.date, allAvailability ?? [])
    : "available";

  const selectedMemberTasks: TaskDoc[] = selectedCell
    ? (allTasks ?? []).filter(
        (t: TaskDoc) =>
          (t.assigneeId as string) === (selectedCell.member._id as string) &&
          t.status !== "done"
      )
    : [];

  const selectedScore: number = selectedCell
    ? computeWorkloadScore(selectedMemberTasks)
    : 0;

  const isUnavailable =
    selectedStatus === "ooo" || selectedStatus === "at_capacity";

  return (
    <TooltipProvider delayDuration={0}>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="min-w-[700px]">
          {isLoading ? (
            <HeatmapSkeleton />
          ) : (
            <div className="p-4 space-y-2">
              {/* Header row */}
              <div className="flex items-end pb-1">
                <div className="w-40 flex-shrink-0" />
                {days.map((day, i) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={i} className="flex-1 mx-0.5 text-center">
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wide ${
                          isToday ? "text-blue-600" : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {format(day, "EEE")}
                      </p>
                      <p
                        className={`text-xs font-bold ${
                          isToday ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {format(day, "d")}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Member rows */}
              {members.map((member) => (
                <div key={member._id as string} className="flex items-center">
                  {/* Member info */}
                  <div className="w-40 flex-shrink-0 flex items-center gap-2 pr-4">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                        {member.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {member.name.split(" ")[0]}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {member.workloadScore}% load
                      </p>
                    </div>
                  </div>

                  {/* Day cells */}
                  {days.map((day, j) => {
                    const memberId = member._id as string;
                    const avail = allAvailability ?? [];
                    const status = getDayStatus(memberId, day, avail);
                    const entry = getAvailabilityEntry(memberId, day, avail);
                    const config = STATUS_CONFIG[status];
                    const isToday = isSameDay(day, today);

                    return (
                      <Tooltip key={j}>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex-1 mx-0.5 rounded-lg overflow-hidden cursor-pointer transition-transform duration-100 hover:scale-105 ${
                              config.light
                            } ${
                              isToday ? "ring-1 ring-blue-400 ring-offset-1" : ""
                            }`}
                            onClick={() =>
                              setSelectedCell({ member, date: day, entry })
                            }
                          >
                            <div className={`h-1.5 ${config.bg}`} />
                            <div className="h-10" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] space-y-1">
                          <p className="font-semibold text-xs">{member.name}</p>
                          <p className="text-gray-400 text-xs">
                            {format(day, "EEEE, MMM d")}
                          </p>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.badgeClass}`}
                          >
                            {config.label}
                          </span>
                          {entry?.note &&
                            (status === "ooo" || status === "at_capacity") && (
                              <p className="text-[10px] text-gray-400">
                                {entry.note}
                              </p>
                            )}
                          <p className="text-[10px] text-gray-400">
                            Workload: {member.workloadScore}/100
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}

              {/* Empty state */}
              {members.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  No team members yet.
                </p>
              )}

              {/* Legend */}
              <div className="flex items-center gap-5 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">
                  Legend
                </span>
                {LEGEND_STATUSES.map((status) => {
                  const config = STATUS_CONFIG[status];
                  return (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className={`h-2.5 w-2.5 rounded-sm ${config.bg}`} />
                      <span className="text-[11px] text-gray-600 dark:text-gray-300">
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cell detail dialog */}
      <Dialog
        open={selectedCell !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCell(null);
        }}
      >
        {selectedCell && (
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCell.member.name} —{" "}
                {format(selectedCell.date, "EEEE, MMM d")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* OOO/At Capacity warning */}
              {isUnavailable && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                    This person is unavailable — consider reassigning their tasks
                  </p>
                </div>
              )}

              {/* Status */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  Status
                </p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CONFIG[selectedStatus].badgeClass}`}
                >
                  {STATUS_CONFIG[selectedStatus].label}
                </span>
              </div>

              {/* Availability entry details */}
              {selectedCell.entry && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Availability Entry
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Date range</span>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                      {format(new Date(selectedCell.entry.startDate + "T00:00:00"), "MMM d")}
                      {" → "}
                      {format(new Date(selectedCell.entry.endDate + "T00:00:00"), "MMM d")}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">Type</span>
                    <span className="text-gray-700 dark:text-gray-200 capitalize">
                      {(selectedCell.entry.type as string).replace(/_/g, " ")}
                    </span>
                    {selectedCell.entry.note && (
                      <>
                        <span className="text-gray-400 dark:text-gray-500">Note</span>
                        <span className="text-gray-700 dark:text-gray-200">
                          {selectedCell.entry.note}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Workload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Workload
                  </p>
                  <span
                    className={`text-xs font-semibold ${getWorkloadColor(selectedScore)}`}
                  >
                    {getWorkloadLabel(selectedScore)} ({selectedScore}/100)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-600 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getWorkloadBarColor(selectedScore)}`}
                    style={{ width: `${selectedScore}%` }}
                  />
                </div>
              </div>

              {/* Open tasks */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  Open Tasks ({selectedMemberTasks.length})
                </p>
                {selectedMemberTasks.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">No open tasks.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedMemberTasks.map((task: TaskDoc) => (
                      <div
                        key={task._id as string}
                        className="flex items-center justify-between gap-2 rounded-md border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5"
                      >
                        <p className="text-xs text-gray-700 dark:text-gray-200 truncate min-w-0">
                          {task.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={`flex-shrink-0 text-[10px] font-medium border ${
                            PRIORITY_CONFIG[task.priority as string] ?? ""
                          }`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              {isUnavailable && onSuggestCoverage && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCell(null);
                    onSuggestCoverage();
                  }}
                >
                  Suggest Coverage
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCell(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </TooltipProvider>
  );
}
