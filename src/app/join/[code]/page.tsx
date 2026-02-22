"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter, useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const normalizedCode = (code ?? "").toUpperCase().slice(0, 6);

  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const me = useQuery(
    api.users.getMe,
    isSignedIn && user?.id ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded) return;

    // Not signed in → send to sign-up with invite param
    if (!isSignedIn) {
      router.replace(`/sign-up?invite=${normalizedCode}`);
      return;
    }

    // Still loading Convex user
    if (me === undefined) return;

    // Signed in but no org yet → send to onboarding with invite param
    if (me === null || !me.orgId) {
      router.replace(`/onboarding?invite=${normalizedCode}`);
    }

    // Has an org → fall through to render the "already in a team" card
  }, [isLoaded, isSignedIn, me, normalizedCode, router]);

  // Loading state
  if (!isLoaded || (isSignedIn && me === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Redirect states — render nothing while navigation is in progress
  if (!isSignedIn || !me || !me.orgId) return null;

  // User is already part of a team
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 p-4">
            <Users className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">You&apos;re already on a team</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your account is already part of a workspace. You can&apos;t join another team with
            this link.
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() =>
            router.replace(me.role === "manager" ? "/dashboard" : "/my")
          }
        >
          Go to my dashboard
        </Button>
      </div>
    </div>
  );
}
