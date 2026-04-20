/** Cek unduhan update (Tauri plugin-updater). Di browser / dev tanpa updater, fungsi no-op. */

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export type PendingUpdateInfo = { version: string };

/** Mengembalikan info versi baru jika tersedia; null jika tidak ada atau updater tidak aktif. */
export async function checkForAppUpdate(): Promise<PendingUpdateInfo | null> {
  if (!isTauriRuntime()) return null;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update?.available && update.version) {
      return { version: update.version };
    }
  } catch {
    /* updater nonaktif, pubkey kosong, atau jaringan */
  }
  return null;
}

/** Unduh pemasangan lalu restart aplikasi. */
export async function downloadAndRelaunchUpdate(): Promise<void> {
  if (!isTauriRuntime()) return;
  const { check } = await import("@tauri-apps/plugin-updater");
  const { relaunch } = await import("@tauri-apps/plugin-process");
  const update = await check();
  if (!update?.available) throw new Error("no_update");
  await update.downloadAndInstall();
  await relaunch();
}
