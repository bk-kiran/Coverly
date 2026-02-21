"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvailabilityType } from "@/types";
import { format } from "date-fns";
import { Trash2, PlusCircle } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

const TYPE_CONFIG: Record<AvailabilityType, { label: string; className: string }> = {
  ooo:         { label: "Out of Office",  className: "bg-red-100 text-red-700 border-red-200" },
  partial:     { label: "Partial",        className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  at_capacity: { label: "At Capacity",   className: "bg-orange-100 text-orange-700 border-orange-200" },
};

const today = () => new Date().toISOString().slice(0, 10);

export function AvailabilityPicker({ userId }: { userId: string }) {
  const entries = useQuery(api.availability.getAvailabilityByUser, { userId });
  const setAvailability = useMutation(api.availability.setAvailability);
  const removeAvailability = useMutation(api.availability.removeAvailability);

  const [type, setType] = useState<AvailabilityType>("ooo");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!startDate || !endDate || endDate < startDate) return;
    setSaving(true);
    try {
      await setAvailability({
        userId,
        type,
        startDate,
        endDate,
        note: note.trim() || undefined,
      });
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: Id<"availability">) {
    await removeAvailability({ id });
  }

  return (
    <div className="space-y-5">
      {/* Add new entry */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Add Unavailability
        </p>

        {/* Type */}
        <Select value={type} onValueChange={(v) => setType(v as AvailabilityType)}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_CONFIG) as AvailabilityType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_CONFIG[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 font-medium mb-1 block">
              From
            </label>
            <input
              type="date"
              value={startDate}
              min={today()}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate < e.target.value) setEndDate(e.target.value);
              }}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium mb-1 block">
              To
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Note */}
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <Button
          onClick={handleAdd}
          disabled={saving || !startDate || !endDate || endDate < startDate}
          size="sm"
          className="w-full gap-2"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Add Period"}
        </Button>
      </div>

      {/* Existing entries */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Scheduled Unavailability
        </p>

        {entries === undefined && (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {entries?.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            No unavailability scheduled.
          </p>
        )}

        {entries?.map((entry) => {
          const config = TYPE_CONFIG[entry.type as AvailabilityType];
          return (
            <div
              key={entry._id}
              className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2.5 ${config.className}`}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{config.label}</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {format(new Date(entry.startDate), "MMM d")} —{" "}
                  {format(new Date(entry.endDate), "MMM d, yyyy")}
                </p>
                {entry.note && (
                  <p className="text-[11px] opacity-70 mt-0.5 italic truncate">
                    {entry.note}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemove(entry._id)}
                className="flex-shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
