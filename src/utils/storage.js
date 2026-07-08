import { useEffect, useState } from "react";

export function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      if (typeof window === "undefined") return { value: initialValue, canWrite: true };
      const stored = window.localStorage.getItem(key);
      return { value: stored ? JSON.parse(stored) : initialValue, canWrite: true };
    } catch {
      return { value: initialValue, canWrite: false };
    }
  });

  useEffect(() => {
    if (!state.canWrite) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state.value));
    } catch {
      // Browsers can block storage in some private modes. The app still works in memory.
    }
  }, [key, state]);

  function setStoredValue(nextValue) {
    setState((current) => ({
      value: typeof nextValue === "function" ? nextValue(current.value) : nextValue,
      canWrite: true,
    }));
  }

  return [state.value, setStoredValue];
}
