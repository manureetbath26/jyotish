"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ReportLockValue {
  locked: boolean;
  lockReason: string | null;
  lock: (reason?: string) => void;
  unlock: () => void;
}

const ReportLockContext = createContext<ReportLockValue | null>(null);

/**
 * Provides a simple global flag that report pages can set while a generated
 * report is being viewed. Other UI (like the profile tab switcher) reads
 * this flag to disable navigation that would cause the report's chart to
 * swap out under the user.
 */
export function ReportLockProvider({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);

  const lock = (reason?: string) => {
    setLocked(true);
    setLockReason(reason ?? null);
  };
  const unlock = () => {
    setLocked(false);
    setLockReason(null);
  };

  return (
    <ReportLockContext.Provider value={{ locked, lockReason, lock, unlock }}>
      {children}
    </ReportLockContext.Provider>
  );
}

export function useReportLock(): ReportLockValue {
  const ctx = useContext(ReportLockContext);
  if (!ctx) {
    // Graceful fallback if a component outside the provider calls the hook.
    return { locked: false, lockReason: null, lock: () => {}, unlock: () => {} };
  }
  return ctx;
}
