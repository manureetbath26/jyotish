"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { RegisterInterestModal } from "./RegisterInterestModal";

export function Navbar() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  return (
    <>
      {/* Announcement banner */}
      {!bannerDismissed && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-center px-4 py-2 flex items-center justify-center gap-3 relative">
          <p className="text-xs text-amber-300">
            <span className="font-semibold">Jyotish is free for 1 month</span>
            {" — "}
            Register your interest to stay informed about future access.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1 rounded-md transition-colors whitespace-nowrap"
          >
            Register Interest
          </button>
          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute right-3 text-amber-500/60 hover:text-amber-400 transition-colors text-base leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-amber-400">
            <span className="text-xl">☿</span>
            <span>Jyotish</span>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              New Chart
            </Link>

            {session ? (
              <>
                <Link href="/charts" className="text-slate-300 hover:text-white transition-colors">
                  My Charts
                </Link>
                <span className="text-slate-500">{session.user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-medium px-3 py-1.5 rounded-md transition-colors"
                >
                  Register Interest
                </button>
                <span
                  title="Sign in is not available during the free trial period"
                  className="bg-slate-800/50 text-slate-600 font-medium px-3 py-1.5 rounded-md text-xs cursor-not-allowed border border-slate-800 select-none"
                >
                  Sign in
                </span>
              </>
            )}
          </div>
        </div>
      </nav>

      {showModal && <RegisterInterestModal onClose={() => setShowModal(false)} />}
    </>
  );
}
