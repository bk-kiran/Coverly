"use client";

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
import { DayStatus } from "@/types";

const STATUS_CONFIG: Record<DayStatus, { bg: string; light: string; label: string }> = {
  available:   { bg: "bg-emerald-500", light: "bg-emerald-100", label: "Available" },
  partial:     { bg: "bg-yellow-400",  light: "bg-yellow-100",  label: "Partial" },
  at_capacity: { bg: "bg-orange-500",  light: "bg-orange-100",  label: "At Capacity" },
  ooo:         { bg: "bg-red-500",     light: "bg-red-100",     label: "OOO" },
};

const LEGEND_STATUSES: DayStatus[] = ["available", "partial", "at_capacity", "ooo"];

function getDayStatus(
  userId: string,
  date: Date,
  availability: Array<{ userId: string; type: string; startDate: string; endDate: string }>
): DayStatus {
  const dateStr = format(date, "yyyy-MM-dd");
  const entry = availability.find(
    (a) => a.userId === userId && a.startDate <= dateStr && a.endDate >= dateStr
  );
  return entry ? (entry.type as DayStatus) : "available";
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

export function AvailabilityHeatmap() {
  const members = useQuery(api.users.getTeamMembers);
  const allAvailability = useQuery(api.availability.getAllAvailability);

  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const isLoading = members === undefined || allAvailability === undefined;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                          isToday ? "text-blue-600" : "text-gray-400"
                        }`}
                      >
                        {format(day, "EEE")}
                      </p>
                      <p
                        className={`text-xs font-bold ${
                          isToday ? "text-blue-600" : "text-gray-500"
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
                <div key={member._id} className="flex items-center">
                  {/* Member info */}
                  <div className="w-40 flex-shrink-0 flex items-center gap-2 pr-4">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {member.name.split(" ")[0]}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {member.workloadScore}% load
                      </p>
                    </div>
                  </div>

                  {/* Day cells */}
                  {days.map((day, j) => {
                    const status = getDayStatus(member._id, day, allAvailability);
                    const config = STATUS_CONFIG[status];
                    const isToday = isSameDay(day, today);

                    return (
                      <Tooltip key={j}>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex-1 mx-0.5 rounded-lg overflow-hidden cursor-default transition-transform duration-100 hover:scale-105 ${
                              config.light
                            } ${
                              isToday
                                ? "ring-1 ring-blue-400 ring-offset-1"
                                : ""
                            }`}
                          >
                            <div className={`h-1.5 ${config.bg}`} />
                            <div className="h-10" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="font-semibold text-xs">{member.name}</p>
                          <p className="text-gray-400 text-xs">
                            {format(day, "MMM d, yyyy")}
                          </p>
                          <p className="text-xs font-medium mt-0.5">
                            {config.label}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}

              {/* Empty state */}
              {members.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  No team members yet.
                </p>
              )}

              {/* Legend */}
              <div className="flex items-center gap-5 pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
                  Legend
                </span>
                {LEGEND_STATUSES.map((status) => {
                  const config = STATUS_CONFIG[status];
                  return (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className={`h-2.5 w-2.5 rounded-sm ${config.bg}`} />
                      <span className="text-[11px] text-gray-600">
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
    </TooltipProvider>
  );
}
