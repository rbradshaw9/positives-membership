"use client";

import { useState } from "react";

export function usePersistentSectionState(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    const stored = window.localStorage.getItem(key);
    if (stored === "open") return true;
    if (stored === "closed") return false;
    return defaultValue;
  });

  function updateValue(nextValue: boolean | ((current: boolean) => boolean)) {
    setValue((current) => {
      const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;
      window.localStorage.setItem(key, resolved ? "open" : "closed");
      return resolved;
    });
  }

  return [value, updateValue] as const;
}
