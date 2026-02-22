"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  Plus,
  LayoutDashboard,
  ClipboardList,
  Users,
  CalendarDays,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const { user: clerkUser } = useUser();
  const me = useQuery(api.users.getMe, { clerkId: clerkUser?.id });
  const myOrgs = useQuery(api.orgs.getMyOrgs);
  const myOrg = useQuery(api.orgs.getMyOrg);
  const pathname = usePathname();

  const switchOrg = useMutation(api.users.switchOrg);
  const joinOrg = useMutation(api.orgs.joinOrg);
  const createSubOrg = useMutation(api.orgs.createSubOrg);

  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);

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

  async function handleSwitchOrg(orgId: string) {
    if (switchingOrgId) return;
    setSwitchingOrgId(orgId);
    try {
      await switchOrg({ orgId });
      window.location.reload();
    } catch {
      setSwitchingOrgId(null);
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

  const isManager = me?.role === "manager";

  const navLinks = isManager
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/team", label: "Team", icon: Users },
      ]
    : [
        { href: "/my", label: "My Tasks", icon: ClipboardList },
        { href: "/my/availability", label: "Availability", icon: CalendarDays },
      ];

  return (
    <>
      <aside className="w-56 flex-shrink-0 h-screen sticky top-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col overflow-y-auto">

        {/* ORGANIZATIONS section */}
        <div className="px-3 pt-5 pb-2">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
            Organizations
          </p>

          <div className="space-y-0.5">
            {(() => {
              const allOrgs = myOrgs ?? [];
              // Build a map for quick lookup
              const orgMap = new Map(allOrgs.map((o) => [o._id as string, o]));

              // Separate top-level orgs from sub-orgs
              // A sub-org whose parent is also in the user's list is nested; otherwise shown top-level
              const subOrgsByParent = new Map<string, typeof allOrgs>();
              const topLevelOrgs: typeof allOrgs = [];

              for (const o of allOrgs) {
                const parentId = o.parentOrgId as string | undefined;
                if (parentId && orgMap.has(parentId)) {
                  if (!subOrgsByParent.has(parentId)) subOrgsByParent.set(parentId, []);
                  subOrgsByParent.get(parentId)!.push(o);
                } else {
                  topLevelOrgs.push(o);
                }
              }

              return topLevelOrgs.map((org) => {
                const orgId = org._id as string;
                const isActive = org.isActive;
                const isSwitchingThis = switchingOrgId === orgId;
                const children = subOrgsByParent.get(orgId) ?? [];

                return (
                  <div key={orgId}>
                    {/* Top-level org row */}
                    <button
                      onClick={() => { if (!isActive) handleSwitchOrg(orgId); }}
                      disabled={!!switchingOrgId}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors disabled:opacity-60 ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500 text-blue-700 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent"
                      }`}
                    >
                      {isSwitchingThis ? (
                        <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-blue-400" />
                      ) : (
                        <Building2
                          className={`h-3.5 w-3.5 flex-shrink-0 ${
                            isActive ? "text-blue-500" : "text-gray-400"
                          }`}
                        />
                      )}
                      <span className="text-xs font-medium truncate flex-1">
                        {org.name}
                      </span>
                    </button>

                    {/* Nested sub-orgs */}
                    {children.length > 0 && (
                      <div className="ml-3 mt-0.5 mb-0.5 border-l border-gray-200 dark:border-gray-700 pl-2 space-y-0.5">
                        {children.map((sub) => {
                          const subId = sub._id as string;
                          const subActive = sub.isActive;
                          const subSwitching = switchingOrgId === subId;

                          return (
                            <button
                              key={subId}
                              onClick={() => { if (!subActive) handleSwitchOrg(subId); }}
                              disabled={!!switchingOrgId}
                              className={`w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors disabled:opacity-60 ${
                                subActive
                                  ? "bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-400 text-blue-700 dark:text-blue-400"
                                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent"
                              }`}
                            >
                              {subSwitching ? (
                                <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-blue-400" />
                              ) : (
                                <span className={`text-[10px] flex-shrink-0 font-medium ${subActive ? "text-blue-400" : "text-gray-400"}`}>
                                  ↳
                                </span>
                              )}
                              <span className="text-[11px] font-medium truncate flex-1">
                                {sub.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}

            {/* Loading skeleton when orgs not yet loaded */}
            {myOrgs === undefined && (
              <div className="space-y-1 px-2 py-1">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-8 rounded-lg bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Join org button */}
          <button
            onClick={() => setJoinOpen(true)}
            className="mt-2 w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Join org
          </button>

          {/* Create sub-org (managers only) */}
          {isManager && (
            <button
              onClick={() => setCreateOpen(true)}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create sub-org
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="mx-3 my-1 h-px bg-gray-100 dark:bg-gray-800" />

        {/* NAVIGATION section */}
        <div className="px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
            Navigation
          </p>
          <nav className="space-y-0.5">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      active ? "text-blue-500" : "text-gray-400"
                    }`}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* BOTTOM — active workspace */}
        {myOrg && (
          <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
              You&apos;re viewing
            </p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate mt-0.5">
              {myOrg.name}
            </p>
          </div>
        )}
      </aside>

      {/* Join org dialog */}
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
              <label className="text-sm font-medium text-gray-700" htmlFor="sb-name">
                Team name
              </label>
              <input
                id="sb-name"
                type="text"
                value={subOrgName}
                onChange={(e) => setSubOrgName(e.target.value)}
                placeholder="e.g. Engineering — Backend"
                autoFocus
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="sb-dept">
                Department{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="sb-dept"
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
