import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { EditableText } from "./Editable";
import type { ContentData } from "../types/content";

const STORAGE_KEY = "macfyi_scarcity_until_ms";

function parseDeadline(iso: string): number | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return t;
}

function getVisitorDeadline(minutes: number): number {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw) {
    const t = parseInt(raw, 10);
    if (Number.isFinite(t) && t > Date.now()) return t;
  }
  const end = Date.now() + Math.max(1, minutes) * 60_000;
  try {
    localStorage.setItem(STORAGE_KEY, String(end));
  } catch {
    /* ignore */
  }
  return end;
}

function useScarcityDeadline(scarcity: ContentData["scarcity"], disabled: boolean): number {
  const [end, setEnd] = useState<number>(() => Date.now() + 3600_000);

  useEffect(() => {
    if (disabled) return;
    const fixed = scarcity.countdownEndIso?.trim();
    if (fixed) {
      const t = parseDeadline(fixed);
      if (t && t > Date.now()) {
        setEnd(t);
        return;
      }
    }
    setEnd(getVisitorDeadline(Number(scarcity.visitorCountdownMinutes) || 165));
  }, [scarcity.countdownEndIso, scarcity.visitorCountdownMinutes, disabled]);

  return end;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function ScarcityBand({
  scarcity,
  canEdit,
  updateData,
  promoCountdown,
  promoSlotsDisplay,
}: {
  scarcity: ContentData["scarcity"];
  canEdit: boolean;
  updateData: (path: string, value: unknown) => void;
  /** Countdown global dari server (fase promo aktif) */
  promoCountdown?: { endMs: number; clockOffsetMs: number } | null;
  /** Slot tampilan dari public-config (counter atau slots_initial fase) */
  promoSlotsDisplay?: number | null;
}) {
  const useServerCountdown = Boolean(
    promoCountdown && Number.isFinite(promoCountdown.endMs) && promoCountdown.endMs > 0
  );
  const fallbackDeadline = useScarcityDeadline(scarcity, useServerCountdown);
  const [remain, setRemain] = useState(0);

  useEffect(() => {
    const tick = () => {
      if (useServerCountdown && promoCountdown) {
        const skewedNow = Date.now() + promoCountdown.clockOffsetMs;
        setRemain(Math.max(0, promoCountdown.endMs - skewedNow));
      } else {
        setRemain(Math.max(0, fallbackDeadline - Date.now()));
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [useServerCountdown, promoCountdown, fallbackDeadline]);

  const h = Math.floor(remain / 3600000);
  const m = Math.floor((remain % 3600000) / 60000);
  const s = Math.floor((remain % 60000) / 1000);

  const scrollToPricing = () =>
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section
      id="scarcity"
      className="relative py-14 md:py-20 overflow-hidden border-y-[6px] border-red-600 shadow-[0_0_80px_rgba(220,38,38,0.45)]"
      style={{
        background: "linear-gradient(165deg, #FFF8EE 0%, #FFE4C4 35%, #FFF5E8 70%, #FFECD8 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(239,68,68,0.35),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_12px,rgba(239,68,68,0.04)_12px,rgba(239,68,68,0.04)_24px)]" />

      <div className="container relative z-10 mx-auto px-4 max-w-3xl text-center">
        <EditableText
          as="h2"
          value={scarcity.headline1}
          onSave={(v) => updateData("scarcity.headline1", v)}
          isAdmin={canEdit}
          className="text-[clamp(1.85rem,5.5vw,3.25rem)] font-black text-[#071022] leading-[1.1] tracking-tight drop-shadow-sm block"
        />
        <EditableText
          as="p"
          value={scarcity.headline2}
          onSave={(v) => updateData("scarcity.headline2", v)}
          isAdmin={canEdit}
          className="text-[clamp(1.55rem,4.5vw,2.65rem)] font-black text-[#071022] mt-2 leading-tight block"
        />

        <motion.div
          className="mt-7 inline-flex"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          <div className="rounded-full bg-[#E70000] px-5 py-2.5 md:px-8 md:py-3.5 text-xs md:text-sm font-extrabold text-white shadow-xl shadow-red-600/60 ring-2 ring-white/90">
            <EditableText
              value={scarcity.badge}
              onSave={(v) => updateData("scarcity.badge", v)}
              isAdmin={canEdit}
            />
          </div>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-[#071022] text-lg md:text-xl font-bold">
          <EditableText
            value={scarcity.slotsDash}
            onSave={(v) => updateData("scarcity.slotsDash", v)}
            isAdmin={canEdit}
            className="inline opacity-90"
          />
          <EditableText
            value={scarcity.slotsLabel}
            onSave={(v) => updateData("scarcity.slotsLabel", v)}
            isAdmin={canEdit}
            className="inline"
          />
          <span className="text-4xl md:text-6xl font-black text-[#E70000] tabular-nums leading-none mx-0.5 drop-shadow-[0_2px_8px_rgba(231,0,0,0.35)]">
            {promoSlotsDisplay != null ? (
              <span className="inline">{promoSlotsDisplay}</span>
            ) : (
              <EditableText
                value={scarcity.slotsCount}
                onSave={(v) => updateData("scarcity.slotsCount", v)}
                isAdmin={canEdit}
                className="inline"
              />
            )}
          </span>
          <EditableText
            value={scarcity.slotsDashAfter}
            onSave={(v) => updateData("scarcity.slotsDashAfter", v)}
            isAdmin={canEdit}
            className="inline"
          />
        </div>

        <div className="mt-10 space-y-2">
          <EditableText
            as="p"
            value={scarcity.hargaNormalLabel}
            onSave={(v) => updateData("scarcity.hargaNormalLabel", v)}
            isAdmin={canEdit}
            className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#071022]/70 block"
          />
          <EditableText
            as="p"
            value={scarcity.strikeLargest}
            onSave={(v) => updateData("scarcity.strikeLargest", v)}
            isAdmin={canEdit}
            className="text-3xl md:text-5xl font-black text-red-500/85 line-through decoration-red-600 decoration-4 block"
          />
          <EditableText
            as="p"
            value={scarcity.strikeMedium}
            onSave={(v) => updateData("scarcity.strikeMedium", v)}
            isAdmin={canEdit}
            className="text-2xl md:text-3xl font-bold text-red-600 line-through decoration-2 block"
          />
          <EditableText
            as="p"
            value={scarcity.strikeSmall}
            onSave={(v) => updateData("scarcity.strikeSmall", v)}
            isAdmin={canEdit}
            className="text-lg md:text-xl font-semibold text-red-500/90 line-through block"
          />
        </div>

        <div className="mt-10 grid grid-cols-3 gap-2 md:gap-4 max-w-md mx-auto">
          {[
            { label: "JAM", val: pad2(h) },
            { label: "MENIT", val: pad2(m) },
            { label: "DETIK", val: pad2(s) },
          ].map((u) => (
            <div
              key={u.label}
              className="rounded-2xl bg-[#0a1628] text-white py-4 md:py-5 px-2 shadow-lg border-2 border-[#071022]/20"
            >
              <div className="text-3xl md:text-4xl font-black tabular-nums leading-none">{u.val}</div>
              <div className="text-[10px] md:text-xs font-bold text-white/55 uppercase tracking-widest mt-2">{u.label}</div>
            </div>
          ))}
        </div>

        <EditableText
          as="p"
          value={scarcity.exclusiveLine}
          onSave={(v) => updateData("scarcity.exclusiveLine", v)}
          isAdmin={canEdit}
          multiline
          className="mt-10 text-base md:text-lg font-bold text-[#071022] max-w-xl mx-auto leading-snug block"
        />

        {canEdit && promoSlotsDisplay != null && (
          <p className="mt-4 text-center text-[11px] text-[#071022]/60">
            Angka slot di atas disinkron dari server (jadwal promo). Sunting di Pengaturan → Promo &amp; scarcity.
          </p>
        )}

        {canEdit && !useServerCountdown && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center text-xs text-[#071022]/70">
            <label className="flex items-center gap-2">
              <span>Menit timer (per pengunjung, jika tanggal kosong):</span>
              <input
                type="number"
                min={1}
                className="w-20 rounded border border-[#071022]/30 bg-white px-2 py-1 text-[#071022]"
                defaultValue={scarcity.visitorCountdownMinutes}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n) && n > 0) updateData("scarcity.visitorCountdownMinutes", n);
                }}
              />
            </label>
            <label className="flex flex-col sm:flex-row sm:items-center gap-1 text-left max-w-md">
              <span>Akhir countdown (ISO, opsional):</span>
              <input
                type="text"
                placeholder="2026-12-31T23:59:59+07:00"
                className="flex-1 rounded border border-[#071022]/30 bg-white px-2 py-1 text-[#071022] text-[11px] w-full"
                defaultValue={scarcity.countdownEndIso}
                onBlur={(e) => updateData("scarcity.countdownEndIso", e.target.value.trim())}
              />
            </label>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#E70000]">Ke harga promo di bawah</p>
          <button
            type="button"
            onClick={scrollToPricing}
            className="rounded-full p-2 text-[#E70000] hover:bg-red-600/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            aria-label="Scroll ke daftar harga"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.15, ease: "easeInOut" }}
            >
              <ChevronDown size={48} strokeWidth={3} className="drop-shadow-[0_4px_12px_rgba(231,0,0,0.65)]" />
            </motion.div>
          </button>
        </div>
      </div>
    </section>
  );
}
