/** Load Midtrans Snap.js once and open payment popup. Client key is public by design. */

type SnapPayOptions = {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: SnapPayOptions) => void;
    };
  }
}

const SCRIPT_ID = "midtrans-snap-js";

export async function loadMidtransSnapScript(isProduction: boolean, clientKey: string): Promise<void> {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.getAttribute("data-client-key") === clientKey) {
    return;
  }
  if (existing) {
    existing.remove();
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    s.setAttribute("data-client-key", clientKey);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Gagal memuat Midtrans Snap."));
    document.body.appendChild(s);
  });
}

export function payWithSnap(token: string, options: SnapPayOptions): void {
  if (!window.snap?.pay) {
    options.onError?.({ message: "snap_unavailable" });
    return;
  }
  window.snap.pay(token, options);
}
