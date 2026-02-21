"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

const HIDDEN_PATHS = ["/sign-in", "/sign-up", "/onboarding"];

export function NavbarWrapper() {
  const pathname = usePathname();

  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (isHidden) return null;

  return <Navbar />;
}
