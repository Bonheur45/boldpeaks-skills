/**
 * Patches the backend auth client's refresh to prevent refresh-token storms.
 *
 * Why: in some environments, the built-in auto refresh can enter a tight loop
 * (many refresh calls per second), quickly hitting rate limits and forcing sign-outs.
 *
 * This patch deduplicates concurrent refresh calls and enforces a minimum interval.
 */

import { supabase } from "@/integrations/supabase/client";

let isPatched = false;
let inflight: Promise<any> | null = null;
let lastAt = 0;
let lastResult: any | null = null;

export function patchSupabaseAuthRefreshSession(options?: { minIntervalMs?: number }) {
  if (isPatched) return;
  isPatched = true;

  const minIntervalMs = options?.minIntervalMs ?? 30_000;

  const authAny = supabase.auth as any;
  const original = authAny?.refreshSession?.bind(supabase.auth);
  if (typeof original !== "function") return;

  authAny.refreshSession = async (...args: any[]) => {
    const now = Date.now();

    // If a refresh is already running, reuse it.
    if (inflight) return inflight;

    // If we refreshed recently, reuse the previous result instead of calling network again.
    if (lastResult && now - lastAt < minIntervalMs) {
      return lastResult;
    }

    inflight = (async () => {
      try {
        const res = await original(...args);
        lastAt = Date.now();
        lastResult = res;
        return res;
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  };
}

export function getSupabaseAuthRefreshPatchState() {
  return {
    isPatched,
    inflight: Boolean(inflight),
    lastAt,
    ageMs: lastAt ? Date.now() - lastAt : null,
  };
}
