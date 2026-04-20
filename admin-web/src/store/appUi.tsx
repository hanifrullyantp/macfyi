import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const THEME_KEY = "macfyi.admin.theme";

type Theme = "dark" | "light";

type AppUi = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  lastSyncAt: number | null;
  touchSync: () => void;
};

const Ctx = createContext<AppUi | null>(null);

export function AppUiProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const s = localStorage.getItem(THEME_KEY);
      if (s === "light") return "light";
    } catch {
      /* */
    }
    return "dark";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("macfyi.admin.sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* */
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("macfyi.admin.sidebarCollapsed", sidebarCollapsed ? "1" : "0");
    } catch {
      /* */
    }
  }, [sidebarCollapsed]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const touchSync = useCallback(() => setLastSyncAt(Date.now()), []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      sidebarCollapsed,
      setSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      lastSyncAt,
      touchSync,
    }),
    [theme, setTheme, sidebarCollapsed, mobileNavOpen, lastSyncAt, touchSync]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppUi(): AppUi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppUi must be used within AppUiProvider");
  return c;
}
