import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CheckoutForm } from "../components/CheckoutForm";
import { useToast } from "../components/ToastProvider";
import { DEFAULT_SITE_SETTINGS, type ContentData } from "../types/content";
import { fetchLandingContentBlob } from "../lib/loadLandingBlob";
import {
  fetchMacfyiPublicConfigRaw,
  type CheckoutGateway,
  type MacfyiPublicCheckout,
} from "../lib/macfyiPublicConfig";
import { firePixelStep } from "../lib/conversionPixels";
import { queueSiteEvent } from "../lib/siteAnalytics";

export function CheckoutPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<ContentData["settings"]>(DEFAULT_SITE_SETTINGS);
  const [checkoutSnap, setCheckoutSnap] = useState<MacfyiPublicCheckout | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let mergedSettings: ContentData["settings"] = DEFAULT_SITE_SETTINGS;
      const blob = await fetchLandingContentBlob();
      if (blob?.settings) {
        mergedSettings = { ...DEFAULT_SITE_SETTINGS, ...blob.settings };
        setSettings(mergedSettings);
      }
      const raw = await fetchMacfyiPublicConfigRaw();
      const ch = raw?.checkout;
      const gw = (ch as { gateway?: string } | undefined)?.gateway;
      const gateway: CheckoutGateway | undefined =
        gw === "lynk" || gw === "external" || gw === "midtrans" ? gw : undefined;
      if (ch && typeof ch.base_lifetime_idr === "number") {
        setCheckoutSnap({
          compare_at_idr: ch.compare_at_idr ?? null,
          base_lifetime_idr: ch.base_lifetime_idr,
          auto_coupon: ch.auto_coupon ?? null,
          final_with_auto_idr: ch.final_with_auto_idr ?? null,
          gateway,
        });
      } else if (raw?.pricing?.lifetime_price_idr && typeof raw.pricing.lifetime_price_idr === "number") {
        const idr = raw.pricing.lifetime_price_idr;
        setCheckoutSnap({
          compare_at_idr: raw.promo?.compare_at_idr ?? null,
          base_lifetime_idr: idr,
          auto_coupon: null,
          final_with_auto_idr: null,
          gateway,
        });
      }
      if (!cancelled) {
        firePixelStep(mergedSettings, "checkout_route_view", {});
        queueSiteEvent("checkout_page_view", {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
        >
          <ArrowLeft size={16} /> Kembali ke beranda
        </Link>
      </div>
      <CheckoutForm
        settings={settings}
        productLabel={`${settings.siteName} — Lifetime`}
        toast={toast}
        initialCheckout={checkoutSnap}
      />
    </div>
  );
}
