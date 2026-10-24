"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PlayerFocus = {
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  // true only inside PlayerFocusProvider (match lists)
  enabled: boolean;
};

const NOOP: PlayerFocus = { focusedId: null, setFocusedId: () => {}, enabled: false };
const PlayerFocusContext = createContext<PlayerFocus>(NOOP);

export function PlayerFocusProvider({ children }: { children: ReactNode }) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const value = useMemo(() => ({ focusedId, setFocusedId, enabled: true }), [focusedId]);
  return <PlayerFocusContext.Provider value={value}>{children}</PlayerFocusContext.Provider>;
}

export function usePlayerFocus(): PlayerFocus {
  return useContext(PlayerFocusContext);
}
