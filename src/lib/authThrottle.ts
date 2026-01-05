/**
 * Auth Throttle Utility
 * Prevents refresh token storms by ensuring only one refresh operation runs at a time
 * and enforcing minimum intervals between refresh attempts.
 */

let isRefreshing = false;
let lastRefreshAt = 0;
const MIN_REFRESH_INTERVAL_MS = 10_000; // 10 seconds minimum between refreshes

interface RefreshResult {
  allowed: boolean;
  reason?: 'already_refreshing' | 'too_soon' | 'allowed';
}

export function canRefresh(): RefreshResult {
  if (isRefreshing) {
    return { allowed: false, reason: 'already_refreshing' };
  }
  
  const now = Date.now();
  if (now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) {
    return { allowed: false, reason: 'too_soon' };
  }
  
  return { allowed: true, reason: 'allowed' };
}

export function startRefresh(): boolean {
  const check = canRefresh();
  if (!check.allowed) {
    return false;
  }
  
  isRefreshing = true;
  lastRefreshAt = Date.now();
  return true;
}

export function endRefresh(): void {
  isRefreshing = false;
}

export function getRefreshState() {
  return {
    isRefreshing,
    lastRefreshAt,
    timeSinceLastRefresh: Date.now() - lastRefreshAt,
  };
}
