"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { UserRole, SkillTag } from "@/types";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const ALL_SKILLS: SkillTag[] = [
  "frontend", "backend", "design", "data", "client-comms",
  "devops", "mobile", "ai-ml", "project-management", "qa",
];

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  {
    value: "member",
    label: "Member",
    description: "I'm an individual contributor managing my own tasks.",
  },
  {
    value: "manager",
    label: "Manager",
    description: "I oversee the team and handle task reassignments.",
  },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function SettingsPage() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const router = useRouter();
  const me = useQuery(api.users.getMe, { clerkId: clerkUser?.id });
  const upsertUser = useMutation(api.users.upsertUser);

  const [role, setRole] = useState<UserRole>("member");
  const [selectedSkills, setSelectedSkills] = useState<SkillTag[]>([]);
  const [department, setDepartment] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [weeklyCapacity, setWeeklyCapacity] = useState(40);
  const [currentFocus, setCurrentFocus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-fill from existing values once me loads
  useEffect(() => {
    if (!me) return;
    setRole(me.role as UserRole);
    setSelectedSkills((me.skillTags ?? []) as SkillTag[]);
    setDepartment((me as any).department ?? "");
    setTimezone((me as any).timezone ?? "America/New_York");
    setWeeklyCapacity((me as any).weeklyCapacity ?? 40);
    setCurrentFocus((me as any).currentFocus ?? "");
  }, [me]);

  function toggleSkill(skill: SkillTag) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function handleSave() {
    if (!clerkUser || !me) return;
    setIsSaving(true);
    setSaved(false);
    try {
      await upsertUser({
        clerkId: clerkUser.id,
        name: clerkUser.fullName ?? clerkUser.username ?? "Unknown",
        email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
        role,
        skillTags: selectedSkills,
        avatarUrl: clerkUser.imageUrl ?? undefined,
        department: department.trim() || undefined,
        timezone,
        weeklyCapacity,
        currentFocus: currentFocus.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => {
        router.replace(role === "manager" ? "/dashboard" : "/my");
      }, 800);
    } finally {
      setIsSaving(false);
    }
  }

  if (me === undefined || !clerkLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (me === null) {
    router.replace("/onboarding");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8 space-y-8">
        {/* Heading */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2">
            <Settings className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-sm text-gray-500">Update your profile and preferences</p>
          </div>
        </div>

        {/* Role warning */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          ⚠️ Changing your role will change what you see in Coverly.
        </div>

        {/* Role selector */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Your Role</label>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((option) => {
              const isSelected = role === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setRole(option.value)}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className={`font-semibold text-sm ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                    {option.label}
                  </p>
                  <p className={`text-xs mt-1 leading-relaxed ${isSelected ? "text-blue-600" : "text-gray-500"}`}>
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Skill tags */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">
            Your Skills
            <span className="ml-1 font-normal text-gray-400">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Department</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Engineering, Design, Product"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Timezone + Weekly capacity row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Weekly Capacity (hrs)</label>
            <input
              type="number"
              min={1}
              max={80}
              value={weeklyCapacity}
              onChange={(e) => setWeeklyCapacity(Number(e.target.value))}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Current focus */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Current Focus
            <span className="ml-1 font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={currentFocus}
            onChange={(e) => setCurrentFocus(e.target.value)}
            placeholder="What are you mainly working on right now?"
            rows={2}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={isSaving || selectedSkills.length === 0}
          className="w-full"
        >
          {saved ? "Saved! Redirecting..." : isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
