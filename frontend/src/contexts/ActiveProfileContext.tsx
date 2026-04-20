"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { Profile } from "@/components/ProfileSelector";

interface ActiveProfileValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  /** True while initial profile list is loading */
  loading: boolean;
  /** Set the active profile (by id). Persists to localStorage. */
  setActiveProfileId: (id: string | null) => void;
  /** Re-fetch the profile list (call after create/edit/delete). */
  refetch: () => Promise<void>;
  /** Convenience: has the user saved their own kundli yet? */
  hasOwnProfile: boolean;
}

const ActiveProfileContext = createContext<ActiveProfileValue | null>(null);

const STORAGE_KEY = "jyotish.activeProfileId";

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load active profile id from localStorage on mount (client only)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setActiveProfileIdState(stored);
    } catch {
      // ignore
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (status !== "authenticated") {
      setProfiles([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const data = (await res.json()) as Profile[];
        setProfiles(data);

        // Seed active profile if not yet chosen OR the stored one no longer exists
        setActiveProfileIdState((prev) => {
          if (prev && data.some((p) => p.id === prev)) return prev;
          const own = data.find((p) => p.isOwn);
          const next = own?.id ?? data[0]?.id ?? null;
          return next;
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Persist active profile to localStorage
  useEffect(() => {
    try {
      if (activeProfileId) {
        window.localStorage.setItem(STORAGE_KEY, activeProfileId);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [activeProfileId]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const hasOwnProfile = useMemo(
    () => profiles.some((p) => p.isOwn),
    [profiles],
  );

  const value: ActiveProfileValue = {
    profiles,
    activeProfile,
    loading,
    setActiveProfileId: setActiveProfileIdState,
    refetch: fetchProfiles,
    hasOwnProfile,
  };

  return (
    <ActiveProfileContext.Provider value={value}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile(): ActiveProfileValue {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) {
    // Provide a graceful no-op default if the hook is used outside the
    // provider (e.g. in public pages). Prevents hard crashes.
    return {
      profiles: [],
      activeProfile: null,
      loading: false,
      setActiveProfileId: () => {},
      refetch: async () => {},
      hasOwnProfile: false,
    };
  }
  return ctx;
}
