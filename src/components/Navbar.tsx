"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Settings,
  ChevronDown,
  Copy,
  Check,
  CheckCircle2,
  Plus,
  Building2,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user: clerkUser } = useUser();
  const me = useQuery(api.users.getMe, { clerkId: clerkUser?.id });
  const myOrg = useQuery(api.orgs.getMyOrg);
  const myOrgs = useQuery(api.orgs.getMyOrgs);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const switchOrg = useMutation(api.orgs.switchOrg);
  const joinOrg = useMutation(api.orgs.joinOrg);
  const createSubOrg = useMutation(api.orgs.createSubOrg);

  const [isSwitching, setIsSwitching] = useState(false);
  const [copied, setCopied] = useState(false);

  // Join dialog
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Create sub-org dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [subOrgName, setSubOrgName] = useState("");
  const [subOrgDept, setSubOrgDept] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  function handleCopyInvite() {
    if (!myOrg?.inviteCode) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/join/${myOrg.inviteCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSwitchOrg(orgId: string) {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await switchOrg({ orgId });
      window.location.reload();
    } catch {
      setIsSwitching(false);
    }
  }

  function closeJoinDialog() {
    setJoinOpen(false);
    setJoinCode("");
    setJoinError(null);
  }

  async function handleJoinOrg() {
    if (joinCode.length !== 6) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      await joinOrg({ inviteCode: joinCode });
      closeJoinDialog();
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setJoinError(
        msg.includes("Invalid invite code")
          ? "Invalid invite code — check with your manager"
          : "Something went wrong. Please try again."
      );
      setIsJoining(false);
    }
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setSubOrgName("");
    setSubOrgDept("");
  }

  async function handleCreateSubOrg() {
    if (!subOrgName.trim() || !myOrg?._id) return;
    setIsCreating(true);
    try {
      await createSubOrg({
        name: subOrgName.trim(),
        department: subOrgDept.trim() || undefined,
        parentOrgId: myOrg._id as string,
      });
      closeCreateDialog();
    } finally {
      setIsCreating(false);
    }
  }

  const navLink =
    me?.role === "manager"
      ? { href: "/dashboard", label: "Dashboard" }
      : { href: "/my", label: "My Tasks" };

  const isActive = pathname === navLink.href;

  return (
    <>
      <nav className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-4">
        {/* Brand */}
        <span className="text-base font-bold text-gray-900 dark:text-white select-none flex-shrink-0">
          🛡️ Coverly
        </span>

        {/* Org switcher */}
        {myOrg && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors flex-shrink-0 focus:outline-none">
                {isSwitching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="max-w-[140px] truncate">{myOrg.name}</span>
                )}
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="min-w-[260px]">
              <DropdownMenuLabel className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Your Teams
              </DropdownMenuLabel>

              {(myOrgs ?? []).map((org) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const hasParent = !!(org as any).parentOrgId;
                return (
                  <DropdownMenuItem
                    key={org._id as string}
                    onSelect={() => {
                      if (!org.isActive) handleSwitchOrg(org._id as string);
                    }}
                    className="flex items-center justify-between gap-3 cursor-pointer px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {org.name}
                      </p>
                      {hasParent ? (
                        <p className="text-xs text-gray-400">Sub-org</p>
                      ) : org.department ? (
                        <p className="text-xs text-gray-400 truncate">
                          {org.department}
                        </p>
                      ) : null}
                    </div>
                    {org.isActive && (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}

              {/* Invite code for active org */}
              {myOrg.inviteCode && (
                <>
                  <DropdownMenuSeparator />
                  <div className="mx-2 my-1 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Invite Code
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold tracking-[0.2em] text-gray-800 text-sm">
                        {myOrg.inviteCode}
                      </span>
                      <button
                        onClick={handleCopyInvite}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border transition-all flex-shrink-0 ${
                          copied
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {copied ? (
                          <><Check className="h-3 w-3" />Copied!</>
                        ) : (
                          <><Copy className="h-3 w-3" />Copy</>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <DropdownMenuSeparator />

              {/* Manager: create sub-org */}
              {me?.role === "manager" && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setCreateOpen(true);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm text-gray-600">Create sub-org</span>
                </DropdownMenuItem>
              )}

              {/* Join another team */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setJoinOpen(true);
                }}
                className="gap-2 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-600">Join another team</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Nav link */}
        <div className="flex items-center gap-6 flex-1">
          <Link
            href={navLink.href}
            className={`text-sm transition-colors ${
              isActive
                ? "text-blue-600 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {navLink.label}
          </Link>
        </div>

        {/* Right — theme toggle + settings + avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full p-2 text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <Link
            href="/settings"
            className={`transition-colors ${
              pathname === "/settings"
                ? "text-blue-600"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </nav>

      {/* Join another team dialog */}
      <Dialog open={joinOpen} onOpenChange={(open) => { if (!open) closeJoinDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Join another team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500">
              Enter the 6-character invite code from your manager.
            </p>
            <div className="space-y-1.5">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                  setJoinError(null);
                }}
                placeholder="XXXXXX"
                maxLength={6}
                spellCheck={false}
                autoFocus
                className="w-full rounded-md border border-gray-200 px-4 py-3 text-xl font-mono tracking-[0.3em] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center uppercase"
              />
              {joinError && (
                <p className="text-xs text-red-600 font-medium">{joinError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={closeJoinDialog}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={joinCode.length !== 6 || isJoining}
                onClick={handleJoinOrg}
              >
                {isJoining ? "Joining..." : "Join Team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create sub-org dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreateDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create sub-org</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="suborg-name">
                Team name
              </label>
              <input
                id="suborg-name"
                type="text"
                value={subOrgName}
                onChange={(e) => setSubOrgName(e.target.value)}
                placeholder="e.g. Engineering — Backend"
                autoFocus
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="suborg-dept">
                Department <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="suborg-dept"
                type="text"
                value={subOrgDept}
                onChange={(e) => setSubOrgDept(e.target.value)}
                placeholder="e.g. Engineering"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!subOrgName.trim() || isCreating}
                onClick={handleCreateSubOrg}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
