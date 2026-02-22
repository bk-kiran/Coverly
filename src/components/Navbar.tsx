"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { user: clerkUser } = useUser();
  const me = useQuery(api.users.getMe, { clerkId: clerkUser?.id });
  const pathname = usePathname();

  const navLink =
    me?.role === "manager"
      ? { href: "/dashboard", label: "Dashboard" }
      : { href: "/my", label: "My Tasks" };

  const isActive = pathname === navLink.href;

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Left — brand */}
      <span className="text-base font-bold text-gray-900 select-none">
        🛡️ Coverly
      </span>

      {/* Middle — nav links */}
      <div className="flex items-center gap-6">
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

      {/* Right — user */}
      <UserButton afterSignOutUrl="/sign-in" />
    </nav>
  );
}
