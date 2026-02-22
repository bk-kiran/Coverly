"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { SkillTag } from "@/types";
import { Button } from "@/components/ui/button";
import { Building2, Users } from "lucide-react";

const ALL_SKILLS: SkillTag[] = [
  "frontend", "backend", "design", "data", "client-comms",
  "devops", "mobile", "ai-ml", "project-management", "qa",
];

export default function OnboardingPage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const upsertUser = useMutation(api.users.upsertUser);
  const createOrg = useMutation(api.orgs.createOrg);
  const joinOrg = useMutation(api.orgs.joinOrg);
  const me = useQuery(api.users.getMe, { clerkId: user?.id });

  const [step, setStep] = useState<1 | 2>(1);
  const [path, setPath] = useState<"create" | "join" | null>(null);

  // Shared
  const [name, setName] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<SkillTag[]>([]);

  // Create-path
  const [teamName, setTeamName] = useState("");
  const [department, setDepartment] = useState("");

  // Join-path
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill name from Clerk
  useEffect(() => {
    if (user && !name) {
      setName(user.fullName ?? user.username ?? "");
    }
  }, [user, name]);

  // Handle ?invite=CODE — jump straight to join flow
  useEffect(() => {
    const code = searchParams.get("invite");
    if (code) {
      setInviteCode(code.toUpperCase().slice(0, 6));
      setPath("join");
      setStep(2);
    }
  }, [searchParams]);

  // Redirect users who already completed onboarding (have an orgId)
  useEffect(() => {
    if (!me?.orgId) return;
    router.replace(me.role === "manager" ? "/dashboard" : "/my");
  }, [me, router]);

  function toggleSkill(skill: SkillTag) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function handleChoosePath(chosen: "create" | "join") {
    setPath(chosen);
    setStep(2);
  }

  async function handleCreate() {
    if (!user || !teamName.trim() || selectedSkills.length === 0) return;
    setIsSaving(true);
    try {
      // Create user record first (createOrg needs the user in DB)
      await upsertUser({
        clerkId: user.id,
        name: name.trim() || (user.fullName ?? user.username ?? "Unknown"),
        email: user.primaryEmailAddress?.emailAddress ?? "",
        role: "manager",
        skillTags: selectedSkills,
        avatarUrl: user.imageUrl ?? undefined,
        department: department.trim() || undefined,
      });
      // Create the org — patches user with orgId + managedOrgId + role
      await createOrg({
        name: teamName.trim(),
        department: department.trim() || undefined,
      });
      router.replace("/dashboard");
    } catch (err) {
      console.error("createOrg failed:", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleJoin() {
    if (!user || inviteCode.length !== 6 || selectedSkills.length === 0) return;
    setIsSaving(true);
    setInviteError(null);
    try {
      // Create user record first (joinOrg needs the user in DB)
      await upsertUser({
        clerkId: user.id,
        name: name.trim() || (user.fullName ?? user.username ?? "Unknown"),
        email: user.primaryEmailAddress?.emailAddress ?? "",
        role: "member",
        skillTags: selectedSkills,
        avatarUrl: user.imageUrl ?? undefined,
      });
      // Join the org — patches user with orgId + role
      await joinOrg({ inviteCode });
      router.replace("/my");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Invalid invite code")) {
        setInviteError("Invalid invite code — check with your manager");
      } else {
        console.error("joinOrg failed:", err);
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Loading guard
  if (me === undefined || !clerkLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Already onboarded — redirect in progress
  if (me?.orgId) return null;

  const progressPct = step === 1 ? "50%" : "100%";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8 space-y-8">

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Step {step} of 2</span>
            <span>{progressPct}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: progressPct }}
            />
          </div>
        </div>

        {/* ── STEP 1 — Choose path ── */}
        {step === 1 && (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">Welcome to Coverly 👋</h1>
              <p className="text-gray-500 text-sm">How do you want to get started?</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleChoosePath("create")}
                className="group text-left rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-100 p-3 group-hover:bg-blue-200 transition-colors flex-shrink-0">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-base">Create a team</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                      Start a new workspace and invite your team
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleChoosePath("join")}
                className="group text-left rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-emerald-100 p-3 group-hover:bg-emerald-200 transition-colors flex-shrink-0">
                    <Users className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-base">Join a team</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                      Enter an invite code from your manager
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2A — Create a team ── */}
        {step === 2 && path === "create" && (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">Set up your team</h1>
              <p className="text-gray-500 text-sm">
                You&apos;ll be the manager. Members join via invite code.
              </p>
            </div>

            <div className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Team Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Team Name *</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Acme Engineering"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Department
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering, Design, Product"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  Your Skills *
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

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ← Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    !name.trim() ||
                    !teamName.trim() ||
                    selectedSkills.length === 0 ||
                    isSaving
                  }
                  className="flex-1"
                >
                  {isSaving ? "Creating..." : "Create Team →"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2B — Join a team ── */}
        {step === 2 && path === "join" && (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">Join your team</h1>
              <p className="text-gray-500 text-sm">
                Enter the invite code from your manager.
              </p>
            </div>

            <div className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Invite Code */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Invite Code *</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase().slice(0, 6));
                    setInviteError(null);
                  }}
                  placeholder="XXXXXX"
                  maxLength={6}
                  spellCheck={false}
                  className="w-full rounded-md border border-gray-200 px-4 py-3 text-xl font-mono tracking-[0.3em] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center uppercase"
                />
                {inviteError && (
                  <p className="text-xs text-red-600 font-medium">{inviteError}</p>
                )}
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  Your Skills *
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
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ← Back
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={
                    !name.trim() ||
                    inviteCode.length !== 6 ||
                    selectedSkills.length === 0 ||
                    isSaving
                  }
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSaving ? "Joining..." : "Join Team →"}
                </Button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
