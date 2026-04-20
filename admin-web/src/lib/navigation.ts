import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookUser,
  Calendar,
  CreditCard,
  FileText,
  Globe,
  Key,
  LayoutDashboard,
  Megaphone,
  Settings,
  Shield,
  SlidersHorizontal,
  Tag,
  UserCog,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "withdrawals" | "payments";
};

export type NavGroup = { id: string; label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/live", label: "Live Activity", icon: Activity, badgeKey: "payments" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { to: "/licenses", label: "Licenses", icon: Key },
      { to: "/transactions", label: "Transactions", icon: CreditCard },
      { to: "/promo-pricing", label: "Promo & Pricing", icon: Tag },
      { to: "/affiliates", label: "Affiliates", icon: Users },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { to: "/landing", label: "Landing Page Editor", icon: Globe },
      { to: "/app-settings", label: "App Settings", icon: Settings },
      { to: "/marketing", label: "Public Config", icon: SlidersHorizontal },
      { to: "/events", label: "Promo events", icon: Calendar },
      { to: "/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { to: "/withdrawals", label: "Withdrawals", icon: Wallet, badgeKey: "withdrawals" },
      { to: "/crm", label: "CRM Contacts", icon: BookUser },
      { to: "/platform", label: "Platform Settings", icon: Shield },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { to: "/edge-functions", label: "Edge Functions", icon: Zap },
      { to: "/logs", label: "Logs", icon: FileText },
      { to: "/admin-users", label: "Admin Users", icon: UserCog },
    ],
  },
];

/** Legacy Indonesian paths → new English routes */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/analitik": "/analytics",
  "/penarikan": "/withdrawals",
  "/transaksi": "/transactions",
  "/acara": "/events",
  "/pengumuman": "/announcements",
  "/wa-templates": "/wa-templates",
};

/** Strip query/hash and trailing slash so breadcrumbs match NAV routes. */
export function normalizePathname(pathname: string): string {
  let p = pathname.split(/[?#]/)[0] ?? pathname;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

export function breadcrumbFromPath(pathname: string): string[] {
  const map: Record<string, string> = {
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/analytics": "Analytics",
    "/live": "Live Activity",
    "/licenses": "Licenses",
    "/transactions": "Transactions",
    "/promo-pricing": "Promo & Pricing",
    "/affiliates": "Affiliates",
    "/landing": "Landing Page Editor",
    "/app-settings": "App Settings",
    "/marketing": "Public Config",
    "/withdrawals": "Withdrawals",
    "/crm": "CRM Contacts",
    "/platform": "Platform Settings",
    "/edge-functions": "Edge Functions",
    "/logs": "Logs",
    "/admin-users": "Admin Users",
    "/events": "Promo events",
    "/announcements": "Announcements",
    "/wa-templates": "WA Templates",
  };
  return ["Admin", map[pathname] ?? "Page"];
}
