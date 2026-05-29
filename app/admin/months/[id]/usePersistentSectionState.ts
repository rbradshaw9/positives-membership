"use client";

import { useCallback, useSyncExternalStore } from "react";

const SECTION_STATE_EVENT = "admin-section-state-change";

function readStoredValue(key: string, defaultValue: boolean) {
  if (typeof window === "undefined") return defaultValue;
  const stored = window.localStorage.getItem(key);
  if (stored === "open") return true;
  if (stored === "closed") return false;
  return defaultValue;
}

export function usePersistentSectionState(key: string, defaultValue: boolean) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function handleChange(event: Event) {
        if (event instanceof StorageEvent && event.key !== key) return;
        if (event instanceof CustomEvent && event.detail?.key !== key) return;
        onStoreChange();
      }

      window.addEventListener("storage", handleChange);
      window.addEventListener(SECTION_STATE_EVENT, handleChange);

      return () => {
        window.removeEventListener("storage", handleChange);
        window.removeEventListener(SECTION_STATE_EVENT, handleChange);
      };
    },
    [key]
  );

  const value = useSyncExternalStore(
    subscribe,
    () => readStoredValue(key, defaultValue),
    () => defaultValue
  );

  function updateValue(nextValue: boolean | ((current: boolean) => boolean)) {
    const current = readStoredValue(key, defaultValue);
    const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;
    window.localStorage.setItem(key, resolved ? "open" : "closed");
    window.dispatchEvent(new CustomEvent(SECTION_STATE_EVENT, { detail: { key } }));
  }

  return [value, updateValue] as const;
}
