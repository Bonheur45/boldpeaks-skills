import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type AuthEventRow = {
  at: number;
  event: string;
  hasSession: boolean;
  expiresAt?: number | null;
  userId?: string | null;
};

type NetEventRow = {
  at: number;
  kind: "auth_refresh";
  url: string;
  method: string;
  status?: number;
  ok?: boolean;
  error?: string;
  bodyPreview?: string;
};

type GuardDebugState = {
  at: number;
  isRehydrating: boolean;
  didRehydrate: boolean;
  needsRehydrate: boolean;
  route: string;
};

const AUTH_DEBUG_LS_KEY = "authDebug";
const AUTH_DEBUG_EVENTS_KEY = "authDebugEvents";
const AUTH_DEBUG_NET_KEY = "authDebugNet";

function isAuthDebugEnabledNow() {
  try {
    const url = new URL(window.location.href);
    const viaQuery = url.searchParams.get("authDebug") === "1";
    const viaStorage = localStorage.getItem(AUTH_DEBUG_LS_KEY) === "1";

    // If user enabled via query param, persist so it survives redirects.
    if (viaQuery) {
      try {
        localStorage.setItem(AUTH_DEBUG_LS_KEY, "1");
      } catch {
        // ignore
      }
      return true;
    }

    return viaStorage;
  } catch {
    return false;
  }
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function cookieNames(): string[] {
  try {
    const raw = document.cookie ?? "";
    if (!raw) return [];
    return raw
      .split(";")
      .map((p) => p.trim())
      .map((p) => p.split("=")[0])
      .filter(Boolean);
  } catch {
    return [];
  }
}

function probeWebStorage(storage: Storage, label: string) {
  const key = `__${label}_probe__${Math.random().toString(16).slice(2)}`;
  try {
    storage.setItem(key, "1");
    const v = storage.getItem(key);
    storage.removeItem(key);
    return { ok: v === "1" };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.name ? `${e.name}: ${e.message ?? ""}` : String(e),
    };
  }
}

function truncate(text: string, max = 240) {
  const t = (text ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function AuthDebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<AuthEventRow[]>([]);
  const [netEvents, setNetEvents] = useState<NetEventRow[]>([]);
  const [guardState, setGuardState] = useState<GuardDebugState | null>(null);
  const location = useLocation();
  const { user, session, userRole, isLoading } = useAuth();

  const originalFetchRef = useRef<typeof window.fetch | null>(null);

  useEffect(() => {
    const next = isAuthDebugEnabledNow();
    setEnabled(next);

    if (next) {
      // restore prior logs (helps when you get redirected before reading the panel)
      const prior = safeJsonParse<AuthEventRow[]>(localStorage.getItem(AUTH_DEBUG_EVENTS_KEY), []);
      const priorNet = safeJsonParse<NetEventRow[]>(localStorage.getItem(AUTH_DEBUG_NET_KEY), []);
      if (prior.length) setEvents(prior);
      if (priorNet.length) setNetEvents(priorNet);
    }

    const onStorage = () => setEnabled(isAuthDebugEnabledNow());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addAuth = (row: AuthEventRow) => {
    setEvents((prev) => {
      const next = [row, ...prev].slice(0, 50);
      try {
        localStorage.setItem(AUTH_DEBUG_EVENTS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const addNet = (row: NetEventRow) => {
    setNetEvents((prev) => {
      const next = [row, ...prev].slice(0, 50);
      try {
        localStorage.setItem(AUTH_DEBUG_NET_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    if (!enabled) return;

    // Initial snapshot
    addAuth({
      at: Date.now(),
      event: "snapshot",
      hasSession: Boolean(session),
      expiresAt: session?.expires_at ?? null,
      userId: user?.id ?? null,
    });

    const { data } = supabase.auth.onAuthStateChange((event, currentSession) => {
      addAuth({
        at: Date.now(),
        event,
        hasSession: Boolean(currentSession),
        expiresAt: currentSession?.expires_at ?? null,
        userId: currentSession?.user?.id ?? null,
      });
    });

    return () => {
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Patch fetch to capture refresh-token calls (platform-layer clue)
  useEffect(() => {
    if (!enabled) return;
    if (originalFetchRef.current) return;

    originalFetchRef.current = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      const url = String(input instanceof Request ? input.url : input);

      const isRefresh = url.includes("/auth/v1/token") && url.includes("grant_type=refresh_token");

      if (!isRefresh) {
        return originalFetchRef.current!(input as any, init);
      }

      const startedAt = Date.now();
      addNet({
        at: startedAt,
        kind: "auth_refresh",
        url,
        method,
      });

      try {
        const res = await originalFetchRef.current!(input as any, init);
        let preview = "";
        try {
          preview = truncate(await res.clone().text(), 400);
        } catch {
          // ignore
        }

        addNet({
          at: Date.now(),
          kind: "auth_refresh",
          url,
          method,
          status: res.status,
          ok: res.ok,
          bodyPreview: preview || undefined,
        });

        return res;
      } catch (e: any) {
        addNet({
          at: Date.now(),
          kind: "auth_refresh",
          url,
          method,
          error: e?.message ? String(e.message) : String(e),
        });
        throw e;
      }
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Poll AuthGuard debug state (keeps AuthGuard unchanged for normal users)
  useEffect(() => {
    if (!enabled) return;
    const t = window.setInterval(() => {
      const s = (window as any).__authGuardDebugState as GuardDebugState | undefined;
      if (s) setGuardState(s);
    }, 500);
    return () => window.clearInterval(t);
  }, [enabled]);

  const storageKeys = useMemo(() => {
    if (!enabled) return [] as { key: string; length: number }[];
    try {
      return Object.keys(localStorage)
        .filter((k) => k.includes("sb-") || k.includes("supabase") || k.includes("auth"))
        .sort()
        .map((key) => ({ key, length: (localStorage.getItem(key) ?? "").length }));
    } catch {
      return [];
    }
  }, [enabled, user?.id, session?.expires_at]);

  const sessionStorageKeys = useMemo(() => {
    if (!enabled) return [] as string[];
    try {
      return Object.keys(sessionStorage).sort();
    } catch {
      return [];
    }
  }, [enabled]);

  const cookieKeyNames = useMemo(() => (enabled ? cookieNames() : []), [enabled]);

  const isIframed = useMemo(() => {
    try {
      return window.top !== window.self;
    } catch {
      return true;
    }
  }, []);

  const storageProbe = useMemo(() => {
    if (!enabled) {
      return {
        localStorage: { ok: false as const },
        sessionStorage: { ok: false as const },
      };
    }

    let local = { ok: false as const, error: "unavailable" as string | undefined };
    let session = { ok: false as const, error: "unavailable" as string | undefined };

    try {
      local = probeWebStorage(window.localStorage, "localStorage") as any;
    } catch (e: any) {
      local = { ok: false as const, error: e?.name ? `${e.name}: ${e.message ?? ""}` : String(e) };
    }

    try {
      session = probeWebStorage(window.sessionStorage, "sessionStorage") as any;
    } catch (e: any) {
      session = { ok: false as const, error: e?.name ? `${e.name}: ${e.message ?? ""}` : String(e) };
    }

    return { localStorage: local, sessionStorage: session };
  }, [enabled]);

  if (!enabled) return null;

  const leaderLock = (() => {
    try {
      return localStorage.getItem("auth_refresh_leader");
    } catch {
      return null;
    }
  })();

  const snapshot = {
    at: new Date().toISOString(),
    route: location.pathname + location.search,
    visibility: document.visibilityState,
    navigator: {
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isIframed,
    },
    auth: {
      isLoading,
      userId: user?.id ?? null,
      hasSession: Boolean(session),
      expires_at: session?.expires_at ?? null,
      userRole: userRole ?? null,
    },
    guard: guardState,
    storage: {
      probe: storageProbe,
      localStorageKeys: storageKeys,
      sessionStorageKeys,
      cookieNames: cookieKeyNames,
      leaderLock,
    },
    recentAuthEvents: events.slice(0, 10),
    recentRefreshRequests: netEvents.slice(0, 10),
  };

  return (
    <aside
      className={cn(
        "fixed bottom-3 right-3 z-[1000] w-[380px] max-w-[calc(100vw-1.5rem)]",
        "rounded-lg border bg-card/95 backdrop-blur p-3 shadow-lg"
      )}
      aria-label="Authentication debug panel"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Auth Debug</p>
          <p className="text-xs text-muted-foreground">route: {location.pathname}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
              } catch {
                // ignore
              }
            }}
            title="Copy a JSON snapshot to clipboard"
          >
            copy
          </button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              try {
                localStorage.setItem(AUTH_DEBUG_LS_KEY, "0");
              } catch {}
              setEnabled(false);
            }}
          >
            close
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">isLoading</div>
          <div className="font-medium">{String(isLoading)}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">user</div>
          <div className="font-medium truncate">{user?.id ?? "null"}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">session</div>
          <div className="font-medium">{session ? "present" : "null"}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">role</div>
          <div className="font-medium">{userRole ?? "null"}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">expires_at</div>
          <div className="font-medium">{session?.expires_at ?? "null"}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">visibility</div>
          <div className="font-medium">{document.visibilityState}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">localStorage</div>
          <div className="font-medium">
            {storageProbe.localStorage.ok ? "ok" : "blocked"}
          </div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">iframe</div>
          <div className="font-medium">{isIframed ? "yes" : "no"}</div>
        </div>
      </div>

      <details className="mt-2" open>
        <summary className="cursor-pointer text-xs text-muted-foreground">AuthGuard state</summary>
        <div className="mt-1 rounded-md bg-muted/30 p-2 text-[11px]">
          {guardState ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-muted-foreground">isRehydrating</div>
                <div className="font-medium">{String(guardState.isRehydrating)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">didRehydrate</div>
                <div className="font-medium">{String(guardState.didRehydrate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">needsRehydrate</div>
                <div className="font-medium">{String(guardState.needsRehydrate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">route</div>
                <div className="font-medium truncate">{guardState.route}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">(no guard data yet)</div>
          )}
        </div>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">storage keys</summary>
        <div className="mt-1 max-h-28 overflow-auto rounded-md bg-muted/30 p-2 text-[11px]">
          {storageKeys.length === 0 ? (
            <div className="text-muted-foreground">(none)</div>
          ) : (
            storageKeys.map((k) => (
              <div key={k.key} className="flex items-center justify-between gap-2">
                <span className="truncate">{k.key}</span>
                <span className="text-muted-foreground">len {k.length}</span>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">sessionStorage keys</summary>
        <div className="mt-1 max-h-20 overflow-auto rounded-md bg-muted/30 p-2 text-[11px]">
          {sessionStorageKeys.length === 0 ? (
            <div className="text-muted-foreground">(none)</div>
          ) : (
            sessionStorageKeys.map((k) => <div key={k}>{k}</div>)
          )}
        </div>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">cookie names</summary>
        <div className="mt-1 max-h-20 overflow-auto rounded-md bg-muted/30 p-2 text-[11px]">
          {cookieKeyNames.length === 0 ? (
            <div className="text-muted-foreground">(none)</div>
          ) : (
            cookieKeyNames.map((k) => <div key={k}>{k}</div>)
          )}
        </div>
      </details>

      <details className="mt-2" open>
        <summary className="cursor-pointer text-xs text-muted-foreground">auth events (latest first)</summary>
        <div className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/30 p-2 text-[11px]">
          {events.map((e) => (
            <div key={`${e.at}-${e.event}`} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {new Date(e.at).toLocaleTimeString()} — {e.event}
              </span>
              <span className="text-muted-foreground">{e.hasSession ? "session" : "null"}</span>
            </div>
          ))}
        </div>
      </details>

      <details className="mt-2" open>
        <summary className="cursor-pointer text-xs text-muted-foreground">refresh-token network (latest first)</summary>
        <div className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/30 p-2 text-[11px]">
          {netEvents.length === 0 ? (
            <div className="text-muted-foreground">(none yet)</div>
          ) : (
            netEvents.map((n) => (
              <div key={`${n.at}-${n.status ?? "x"}-${n.url}`} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{new Date(n.at).toLocaleTimeString()} — {n.method}</span>
                  <span className="text-muted-foreground">
                    {n.status ? `${n.status}${n.ok ? " ok" : ""}` : n.error ? "error" : "…"}
                  </span>
                </div>
                {n.bodyPreview ? <div className="text-muted-foreground">{n.bodyPreview}</div> : null}
                {n.error ? <div className="text-destructive">{n.error}</div> : null}
              </div>
            ))
          )}
        </div>
      </details>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Enable via <code className="px-1">?authDebug=1</code> (persists) or <code className="px-1">localStorage.authDebug=1</code>. Use “copy” and paste here.
      </p>
    </aside>
  );
}
