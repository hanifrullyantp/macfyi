import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Ctx = {
  /** Register a short human-readable line for the footer; pass `null` to clear this id. */
  registerActivity: (id: string, message: string | null) => void;
  /** Combined line for the status strip (up to two messages). */
  footerLine: string | null;
};

const AppActivityContext = createContext<Ctx | null>(null);

export function AppActivityProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<Record<string, string>>({});

  const registerActivity = useCallback((id: string, message: string | null) => {
    setMap((prev) => {
      const next = { ...prev };
      if (message == null || message.trim() === "") {
        delete next[id];
      } else {
        next[id] = message.trim();
      }
      return next;
    });
  }, []);

  const footerLine = useMemo(() => {
    const vals = Object.values(map);
    if (vals.length === 0) return null;
    if (vals.length === 1) return vals[0];
    return `${vals[0]} · ${vals[1]}`;
  }, [map]);

  const value = useMemo(
    () => ({ registerActivity, footerLine }),
    [registerActivity, footerLine]
  );

  return <AppActivityContext.Provider value={value}>{children}</AppActivityContext.Provider>;
}

export function useAppActivity(): Ctx {
  const c = useContext(AppActivityContext);
  if (!c) {
    throw new Error("useAppActivity must be used within AppActivityProvider");
  }
  return c;
}
