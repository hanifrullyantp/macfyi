import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchReleaseState,
  publishNow,
  rejectStaging,
  rollbackRelease,
  scheduleRelease,
  syncStagingFromStorage,
  type ReleaseStateRow,
} from "../lib/releasesClient";

const PLATFORMS = [
  { id: "macos-arm64" as const, label: "macOS Apple Silicon (M1/M2/M3/M4)", active: true },
  { id: "macos-intel" as const, label: "macOS Intel (belum ada build)", active: false },
];
type PlatformId = (typeof PLATFORMS)[number]["id"];

function fmtBytes(n: number | null): string {
  if (!n || n <= 0) return "—";
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export default function ReleasesPage() {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<PlatformId>("macos-arm64");
  const [notes, setNotes] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [busy, setBusy] = useState<null | "publish" | "schedule" | "reject" | "sync" | string>(null);

  const platformMeta = PLATFORMS.find((p) => p.id === platform)!;

  const query = useQuery({
    queryKey: ["release-state", platform],
    queryFn: () => fetchReleaseState(platform),
  });

  const staging = query.data?.staging ?? null;
  const live = query.data?.live ?? [];

  useEffect(() => {
    if (!staging) return;
    setNotes(staging.release_notes ?? "");
    setMandatory(staging.is_mandatory === true);
    setScheduleAt(staging.scheduled_publish_at ? staging.scheduled_publish_at.slice(0, 16) : "");
  }, [staging]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["release-state", platform] });
  };

  async function onPublishNow() {
    setBusy("publish");
    try {
      await publishNow({ platform, releaseNotes: notes, mandatory });
      toast.success("Staging published to live");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSchedule() {
    if (!scheduleAt) {
      toast.error("Choose schedule time first");
      return;
    }
    setBusy("schedule");
    try {
      await scheduleRelease({
        platform,
        releaseNotes: notes,
        mandatory,
        scheduledPublishAt: new Date(scheduleAt).toISOString(),
      });
      toast.success("Release scheduled");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setBusy(null);
    }
  }

  async function onReject() {
    setBusy("reject");
    try {
      await rejectStaging(platform);
      toast.success("Staging build rejected");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSyncStaging() {
    setBusy("sync");
    try {
      const res = await syncStagingFromStorage(platform);
      if (!res.ok) throw new Error(res.message ?? res.error ?? "Sync failed");
      toast.success("Staging disinkronkan dari Storage");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal sinkronkan staging");
    } finally {
      setBusy(null);
    }
  }

  async function onRollback(version: string) {
    setBusy(`rb-${version}`);
    try {
      await rollbackRelease(platform, version);
      toast.success(`Rolled back to ${version}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rollback failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Releases</h1>
          <p className="text-white/40 font-medium">Staging → publish ke live (maks. 5 riwayat).</p>
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as PlatformId)}
          className="rounded-xl border border-white/10 bg-[#16161C] px-3 py-2 text-sm text-white max-w-xs"
        >
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {!platformMeta.active ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Build CI belum tersedia untuk Mac Intel. Pilih <strong>macOS Apple Silicon</strong> di dropdown — DMG saat ini
          hanya di-build untuk chip M1/M2/M3/M4.
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/5 bg-[#16161C] p-6 space-y-4">
        <h2 className="text-xl font-black text-white">Staging</h2>
        {!staging ? (
          <div className="space-y-3 text-sm text-white/55">
            <p>Belum ada build staging untuk platform ini.</p>
            {platformMeta.active ? (
              <>
                <p className="text-white/45">Langkah membuat staging:</p>
                <ol className="list-decimal list-inside space-y-1 text-white/50">
                  <li>GitHub → Actions → <strong className="text-white/70">Upload DMG to Supabase</strong> → Run workflow</li>
                  <li>Pastikan secrets <code className="text-white/60">SUPABASE_URL</code> dan{" "}
                    <code className="text-white/60">SUPABASE_SERVICE_ROLE_KEY</code> sudah diisi</li>
                  <li>Kembali ke halaman ini, pilih <strong className="text-white/70">macOS Apple Silicon</strong>, lalu refresh</li>
                </ol>
                <button
                  type="button"
                  onClick={() => void onSyncStaging()}
                  disabled={busy !== null}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
                >
                  Sinkronkan dari Storage (jika DMG sudah ter-upload)
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div><span className="text-white/45">Version:</span> <span className="text-white">{staging.version}</span></div>
              <div><span className="text-white/45">File size:</span> <span className="text-white">{fmtBytes(staging.file_size)}</span></div>
              <div><span className="text-white/45">Checksum:</span> <span className="text-white break-all">{staging.checksum ?? "—"}</span></div>
              <div><span className="text-white/45">Uploaded:</span> <span className="text-white">{new Date(staging.created_at).toLocaleString()}</span></div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Release notes..."
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-[#0E0E11] p-3 text-sm text-white outline-none focus:border-red-500/40"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
                Mandatory update
              </label>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0E0E11] px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void onPublishNow()}
                disabled={busy !== null}
                className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                Publish Now
              </button>
              <button
                type="button"
                onClick={() => void onSchedule()}
                disabled={busy !== null}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
              >
                Schedule Release
              </button>
              <button
                type="button"
                onClick={() => void onReject()}
                disabled={busy !== null}
                className="rounded-xl border border-red-500/40 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-60"
              >
                Reject Build
              </button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-white/5 bg-[#16161C] p-6 space-y-4">
        <h2 className="text-xl font-black text-white">Live Releases (max 5)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/45">
                <th className="py-2 text-left">Version</th>
                <th className="py-2 text-left">Published</th>
                <th className="py-2 text-left">Downloads</th>
                <th className="py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {(live as ReleaseStateRow[]).map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2 text-white">{row.version}</td>
                  <td className="py-2 text-white/70">{row.published_at ? new Date(row.published_at).toLocaleString() : "—"}</td>
                  <td className="py-2 text-white/70">{Number(row.download_count ?? 0).toLocaleString()}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => void onRollback(row.version)}
                      disabled={busy !== null}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/10 disabled:opacity-60"
                    >
                      Rollback
                    </button>
                  </td>
                </tr>
              ))}
              {live.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-sm text-white/45">
                    Belum ada rilis live. Publish staging terlebih dahulu.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
