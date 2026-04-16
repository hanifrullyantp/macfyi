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
      className="relative py-12 md:py-16 overflow-hidden border-y-[6px] border-red-600 shadow-[0_0_80px_rgba(220,38,38,0.35)]"
      style={{
        background:
          "linear-gradient(165deg, #050812 0%, #070B14 28%, #0B1022 46%, #090C16 62%, #050812 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_0%,rgba(220,38,38,0.30),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_100%,rgba(239,68,68,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-52deg,transparent,transparent_14px,rgba(239,68,68,0.03)_14px,rgba(239,68,68,0.03)_28px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

      <div className="container relative z-10 mx-auto px-4 max-w-3xl text-center">
        <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.06] via-black/60 to-black/55 px-4 py-10 md:px-10 md:py-12 shadow-[0_24px_90px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-md">
          <div className="pointer-events-none absolute -inset-px rounded-[2rem] bg-gradient-to-b from-red-500/12 via-transparent to-red-950/25 opacity-90" />

          <div className="relative">
        <EditableText
          as="h2"
          value={scarcity.headline1}
          onSave={(v) => updateData("scarcity.headline1", v)}
          isAdmin={canEdit}
          className="text-[clamp(1.85rem,5.5vw,3.25rem)] font-black text-white leading-[1.1] tracking-tight [text-shadow:0_2px_28px_rgba(0,0,0,0.75),0_0_40px_rgba(220,38,38,0.16)] block"
        />
        <EditableText
          as="p"
          value={scarcity.headline2}
          onSave={(v) => updateData("scarcity.headline2", v)}
          isAdmin={canEdit}
          className="text-[clamp(1.55rem,4.5vw,2.65rem)] font-black text-white/90 mt-2 leading-tight [text-shadow:0_2px_22px_rgba(0,0,0,0.70)] block"
        />

        <motion.div
          className="mt-7 inline-flex"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          <div className="rounded-full bg-gradient-to-b from-red-600 to-[#b91c1c] px-5 py-2.5 md:px-8 md:py-3.5 text-xs md:text-sm font-extrabold text-white shadow-xl shadow-red-900/70 ring-2 ring-amber-400/35">
            <EditableText
              value={scarcity.badge}
              onSave={(v) => updateData("scarcity.badge", v)}
              isAdmin={canEdit}
            />
          </div>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-white/85 text-lg md:text-xl font-bold">
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
            className="text-sm font-extrabold uppercase tracking-[0.2em] text-white/50 block"
          />
          <EditableText
            as="p"
            value={scarcity.strikeLargest}
            onSave={(v) => updateData("scarcity.strikeLargest", v)}
            isAdmin={canEdit}
            className="text-3xl md:text-5xl font-black text-orange-400/95 line-through decoration-red-500 decoration-[3px] [text-shadow:0_0_28px_rgba(239,68,68,0.25)] block"
          />
          <EditableText
            as="p"
            value={scarcity.strikeMedium}
            onSave={(v) => updateData("scarcity.strikeMedium", v)}
            isAdmin={canEdit}
            className="text-2xl md:text-3xl font-bold text-red-400 line-through decoration-red-500/90 decoration-2 block"
          />
          <EditableText
            as="p"
            value={scarcity.strikeSmall}
            onSave={(v) => updateData("scarcity.strikeSmall", v)}
            isAdmin={canEdit}
            className="text-lg md:text-xl font-semibold text-red-400/85 line-through block"
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
              className="rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#020617] text-white py-4 md:py-5 px-2 shadow-[0_12px_32px_rgba(0,0,0,0.5)] border border-amber-500/20 ring-1 ring-red-500/15"
            >
              <div className="text-3xl md:text-4xl font-black tabular-nums leading-none [text-shadow:0_0_20px_rgba(251,146,60,0.2)]">{u.val}</div>
              <div className="text-[10px] md:text-xs font-bold text-amber-200/50 uppercase tracking-widest mt-2">{u.label}</div>
            </div>
          ))}
        </div>

        <EditableText
          as="p"
          value={scarcity.exclusiveLine}
          onSave={(v) => updateData("scarcity.exclusiveLine", v)}
          isAdmin={canEdit}
          multiline
          className="mt-10 text-base md:text-lg font-bold text-amber-50/95 max-w-xl mx-auto leading-snug block"
        />

        {canEdit && promoSlotsDisplay != null && (
          <p className="mt-4 text-center text-[11px] text-amber-200/55">
            Angka slot di atas disinkron dari server (jadwal promo). Sunting di Pengaturan → Promo &amp; scarcity.
          </p>
        )}

        {canEdit && !useServerCountdown && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center text-xs text-amber-200/70">
            <label className="flex items-center gap-2">
              <span>Menit timer (per pengunjung, jika tanggal kosong):</span>
              <input
                type="number"
                min={1}
                className="w-20 rounded border border-white/15 bg-white/10 px-2 py-1 text-amber-50"
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
                className="flex-1 rounded border border-white/15 bg-white/10 px-2 py-1 text-amber-50 text-[11px] w-full placeholder:text-amber-200/40"
                defaultValue={scarcity.countdownEndIso}
                onBlur={(e) => updateData("scarcity.countdownEndIso", e.target.value.trim())}
              />
            </label>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-red-400 [text-shadow:0_0_20px_rgba(248,113,113,0.35)]">Ke harga promo di bawah</p>
          <button
            type="button"
            onClick={scrollToPricing}
            className="rounded-full p-2 text-red-400 hover:bg-red-500/15 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-label="Scroll ke daftar harga"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.15, ease: "easeInOut" }}
            >
              <ChevronDown size={48} strokeWidth={3} className="drop-shadow-[0_4px_16px_rgba(248,113,113,0.55)]" />
            </motion.div>
          </button>
        </div>
          </div>
        </div>
      </div>
    </section>
  );
}
