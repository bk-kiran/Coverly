"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const me = useQuery(api.users.getMe, { clerkId: user?.id });
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (me === undefined) return; // still loading from Convex
    if (me === null || !me.orgId) {
      router.replace("/onboarding");
      return;
    }
    router.replace(me.role === "manager" ? "/dashboard" : "/my");
  }, [isLoaded, isSignedIn, me, router]);

  return null;
}
