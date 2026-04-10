"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompatibilityTab } from "@/components/CompatibilityTab";
import { PremiumLock } from "@/components/PremiumLock";

export default function CompatibilityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">Compatibility</h1>
        <p className="text-slate-500 text-sm mt-1">
          Friends, Partners &amp; Family Compatibility Analysis
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <PremiumLock>
          <CompatibilityTab />
        </PremiumLock>
      </div>
    </div>
  );
}
