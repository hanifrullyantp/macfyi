import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MessageTree } from "./locales/en";
import { en } from "./locales/en";
import { id } from "./locales/id";

const LOCALE_KEY = "macfyi.locale";

export type LocaleCode = "en" | "id";

const bundles: Record<LocaleCode, MessageTree> = { en, id };

function getNested(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : path;
}

/** Replace {key} placeholders */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    try {
      const s = localStorage.getItem(LOCALE_KEY);
      if (s === "id" || s === "en") return s;
    } catch {
      /* */
    }
    return "en";
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* */
    }
    document.documentElement.lang = locale === "id" ? "id" : "en";
  }, [locale]);

  const setLocale = useCallback((l: LocaleCode) => {
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const tree = bundles[locale] as unknown as Record<string, unknown>;
      const raw = getNested(tree, key);
      return interpolate(raw, vars);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useOptionalI18n(): I18nContextValue | null {
  return useContext(I18nContext);
}
