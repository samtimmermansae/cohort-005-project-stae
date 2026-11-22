import { useState, useEffect, useCallback } from "react";

const AUTOPLAY_KEY = "cadence-autoplay";

export function useAutoplay() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(AUTOPLAY_KEY) === "true");
    } catch {
      // Storage can be blocked (private mode, disabled cookies); autoplay
      // then just stays off.
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTOPLAY_KEY, String(next));
      } catch {
        // The toggle still works for this visit when storage is blocked.
      }
      return next;
    });
  }, []);

  return [enabled, toggle] as const;
}
