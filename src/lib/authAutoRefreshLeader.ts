/**
 * Single-tab auto-refresh leader election
 *
 * Some environments end up with multiple hidden/duplicate tabs (or extensions) all running
 * the auth auto-refresh timer, which can cause refresh-token storms (429) and forced sign-outs.
 *
 * This helper elects one "leader" tab that keeps auth auto-refresh enabled.
 * All other tabs stop their auto-refresh and rely on storage/broadcast sync.
 */

type AutoRefreshControls = {
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
};

type LeaderRecord = {
  owner: string;
  expiresAt: number; // ms epoch
};

const LS_KEY = "auth_refresh_leader";
const HEARTBEAT_MS = 4000;
const STALE_MS = 12000;

function safeParse(value: string | null): LeaderRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as LeaderRecord;
    if (!parsed || typeof parsed.owner !== "string" || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function randomId() {
  // crypto.randomUUID isn't available in all older environments.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export function initAuthAutoRefreshLeader(controls: AutoRefreshControls) {
  const tabId = randomId();
  let isLeader = false;
  let interval: number | null = null;

  const setLeader = (next: boolean) => {
    if (next === isLeader) return;
    isLeader = next;
    if (isLeader) controls.startAutoRefresh();
    else controls.stopAutoRefresh();
  };

  const writeRecord = (rec: LeaderRecord) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rec));
    } catch {
      // ignore
    }
  };

  const readRecord = () => {
    try {
      return safeParse(localStorage.getItem(LS_KEY));
    } catch {
      return null;
    }
  };

  const tryAcquire = () => {
    const now = Date.now();
    const current = readRecord();

    // If nobody holds the lock, or it is stale, acquire.
    if (!current || current.expiresAt <= now || current.owner === tabId) {
      writeRecord({ owner: tabId, expiresAt: now + STALE_MS });
      setLeader(true);
      return;
    }

    // Someone else is the leader.
    setLeader(false);
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key !== LS_KEY) return;
    tryAcquire();
  };

  const onBeforeUnload = () => {
    // Best-effort release to speed up re-election.
    try {
      const current = readRecord();
      if (current?.owner === tabId) localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
  };

  // Initial election + heartbeat
  tryAcquire();
  interval = window.setInterval(tryAcquire, HEARTBEAT_MS);
  window.addEventListener("storage", onStorage);
  window.addEventListener("beforeunload", onBeforeUnload);

  return () => {
    if (interval) window.clearInterval(interval);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("beforeunload", onBeforeUnload);
    // When unmounting, stop auto refresh in this tab.
    controls.stopAutoRefresh();
  };
}
