"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { UserRole, SkillTag } from "@/types";

const ALL_SKILLS: SkillTag[] = [
  "frontend",
  "backend",
  "design",
  "data",
  "client-comms",
  "devops",
  "mobile",
  "ai-ml",
  "project-management",
  "qa",
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

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const upsertUser = useMutation(api.users.upsertUser);

  const [role, setRole] = useState<UserRole>("member");
  const [selectedSkills, setSelectedSkills] = useState<SkillTag[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function toggleSkill(skill: SkillTag) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function handleSubmit() {
    if (!user || selectedSkills.length === 0) return;

    setIsSaving(true);
    try {
      await upsertUser({
        clerkId: user.id,
        name: user.fullName ?? user.username ?? "Unknown",
        email: user.primaryEmailAddress?.emailAddress ?? "",
        role,
        skillTags: selectedSkills,
        avatarUrl: user.imageUrl ?? undefined,
      });

      if (role === "manager") {
        router.push("/dashboard");
      } else {
        router.push("/my");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8 space-y-8">
        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to Coverly 👋
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Nobody drops the ball here. Tell us your role and we&apos;ll handle
            the rest.
          </p>
        </div>

        {/* Role selector */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">
            Your Role
          </label>
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
                  <p
                    className={`font-semibold text-sm ${
                      isSelected ? "text-blue-700" : "text-gray-800"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      isSelected ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
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
            <span className="ml-1 font-normal text-gray-400">
              (select all that apply)
            </span>
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

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={selectedSkills.length === 0 || isSaving}
          className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-semibold transition-all hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? "Setting up..." : "Get Started →"}
        </button>
      </div>
    </div>
  );
}
