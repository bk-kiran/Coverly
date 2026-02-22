"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Settings, ChevronDown, Copy, Check, Users, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const { user: clerkUser } = useUser();
  const me = useQuery(api.users.getMe, { clerkId: clerkUser?.id });
  const myOrg = useQuery(api.orgs.getMyOrg);
  const orgMembers = useQuery(
    api.orgs.getOrgMembers,
    myOrg?._id ? { orgId: myOrg._id as string } : "skip"
  );
  const pathname = usePathname();

  const [orgOpen, setOrgOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOrgOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleCopyInvite() {
    if (!myOrg?.inviteCode) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/join/${myOrg.inviteCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const navLink =
    me?.role === "manager"
      ? { href: "/dashboard", label: "Dashboard" }
      : { href: "/my", label: "My Tasks" };

  const isActive = pathname === navLink.href;

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
      {/* Brand */}
      <span className="text-base font-bold text-gray-900 select-none flex-shrink-0">
        🛡️ Coverly
      </span>

      {/* Org pill */}
      {myOrg && (
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setOrgOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 hover:bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors"
          >
            <span className="max-w-[140px] truncate">{myOrg.name}</span>
            <ChevronDown
              className={`h-3 w-3 flex-shrink-0 transition-transform duration-150 ${
                orgOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {orgOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-white border border-gray-200 shadow-lg py-3 z-50">
              {/* Org header */}
              <div className="px-4 pb-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {myOrg.name}
                </p>
                {myOrg.department && (
                  <p className="text-xs text-gray-400 mt-0.5">{myOrg.department}</p>
                )}
              </div>

              {/* Invite code row */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
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
                      <><Check className="h-3 w-3" /> Copied!</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy link</>
                    )}
                  </button>
                </div>
              </div>

              {/* Manager: manage sub-orgs link */}
              {me?.role === "manager" && (
                <Link
                  href="/dashboard"
                  onClick={() => setOrgOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-gray-400" />
                  Manage sub-orgs
                </Link>
              )}

              {/* Member: teammate count */}
              {me?.role === "member" && (
                <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  Your team:{" "}
                  <span className="font-semibold text-gray-800 ml-0.5">
                    {orgMembers !== undefined ? orgMembers.length : "—"} member
                    {(orgMembers?.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nav links */}
      <div className="flex items-center gap-6 flex-1">
        <Link
          href={navLink.href}
          className={`text-sm transition-colors ${
            isActive
              ? "text-blue-600 font-medium"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {navLink.label}
        </Link>
      </div>

      {/* Right — settings + user */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className={`transition-colors ${
            pathname === "/settings"
              ? "text-blue-600"
              : "text-gray-400 hover:text-gray-700"
          }`}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </nav>
  );
}
