"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

const SIDEBAR_PATHS = ["/dashboard", "/my"];

const HIDDEN_PATHS = ["/sign-in", "/sign-up", "/onboarding"];

export function SidebarWrapper() {
  const pathname = usePathname();

  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (isHidden) return null;

  const isVisible = SIDEBAR_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isVisible) return null;

  return <Sidebar />;
}
