import { useEffect, useRef } from 'react';

export function restoreWindowScroll(targetY: number, maxAttempts: number = 24) {
  let attempts = 0;

  const tryRestore = () => {
    window.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
    const maxY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);

    if (window.scrollY < targetY && maxY < targetY && attempts < maxAttempts) {
      attempts++;
      requestAnimationFrame(tryRestore);
    }
  };

  requestAnimationFrame(tryRestore);
}

/**
 * Saves window scroll position to sessionStorage under `key` while mounted,
 * and restores it once `ready` becomes true (e.g. after data has loaded).
 *
 * Restoration is retried across several animation frames so that late-rendering
 * content (images, accordions, async data) doesn't cause the page to settle at
 * a smaller scrollY than what was saved.
 */
export function useScrollRestoration(key: string, ready: boolean = true) {
  const restoredRef = useRef(false);

  // Save on scroll (but suppress saves while we're still trying to restore,
  // otherwise our own programmatic scrollTo writes 0 over the real value).
  useEffect(() => {
    if (!key) return;
    const onScroll = () => {
      if (!restoredRef.current) return;
      sessionStorage.setItem(key, String(window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [key]);

  // Restore once ready — retry across frames to handle late-mounting content.
  useEffect(() => {
    if (!key || !ready) return;
    const saved = sessionStorage.getItem(key);
    if (saved === null) {
      restoredRef.current = true;
      return;
    }
    const targetY = parseInt(saved, 10);
    if (Number.isNaN(targetY)) {
      restoredRef.current = true;
      return;
    }

    let cancelled = false;
    const tryRestore = () => {
      if (cancelled) return;
      window.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
      const maxY = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0
      );
      // If the page is still too short to reach targetY, retry next frame.
      if (window.scrollY < targetY && maxY < targetY && attempts < maxAttempts) {
        attempts++;
        requestAnimationFrame(tryRestore);
      } else {
        // Give one more frame, then start tracking scroll again.
        requestAnimationFrame(() => {
          if (!cancelled) restoredRef.current = true;
        });
      }
    };

    let attempts = 0;
    const maxAttempts = 20; // ~333ms at 60fps

    requestAnimationFrame(tryRestore);

    return () => {
      cancelled = true;
    };
  }, [key, ready]);
}
