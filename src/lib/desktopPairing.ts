import { getDeviceFingerprint } from "./backend";
import { setPairingSession } from "./activation";
import { clearDemoSession } from "./demoSession";

export type ExchangePairingResult = {
  token: string;
  email: string;
  is_pro: boolean;
  license_id: string | null;
};

function exchangeUrl(): string {
  const u = import.meta.env.VITE_EXCHANGE_DESKTOP_PAIRING_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  const base = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (base) return `${base}/functions/v1/exchange-desktop-pairing`;
  return "";
}

export async function exchangeDesktopPairingCode(rawCode: string): Promise<ExchangePairingResult> {
  const url = exchangeUrl();
  if (!url) throw new Error("Configure VITE_SUPABASE_URL or VITE_EXCHANGE_DESKTOP_PAIRING_URL.");
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!anon) throw new Error("VITE_SUPABASE_ANON_KEY is required for desktop pairing.");
  const { fingerprint } = await getDeviceFingerprint();
  const code = rawCode.trim().toUpperCase();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, device_fingerprint: fingerprint }),
  });
  const j = (await res.json().catch(() => ({}))) as ExchangePairingResult & { error?: string };
  if (!res.ok) {
    const err = j.error ?? "exchange_failed";
    if (err === "device_already_bound") throw new Error("Perangkat ini sudah terikat ke Mac lain. Hubungi support untuk reset.");
    if (err === "code_expired" || err === "invalid_code" || err === "code_used") {
      throw new Error("Kode tidak valid atau sudah dipakai. Buat kode baru di web.");
    }
    throw new Error(err);
  }
  if (!j.token || !j.email) throw new Error("Invalid server response.");
  return j;
}

export function applyPairingResult(r: ExchangePairingResult): void {
  clearDemoSession();
  setPairingSession(r.token, r.email, r.is_pro, r.license_id);
}
