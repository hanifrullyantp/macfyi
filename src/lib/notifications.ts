import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

async function ensurePermission(): Promise<boolean> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const p = await requestPermission();
      granted = p === "granted";
    }
    return granted;
  } catch {
    return false;
  }
}

export async function notifyScanComplete(title: string, body: string): Promise<void> {
  if (!(await ensurePermission())) return;
  try {
    await sendNotification({ title, body });
  } catch {
    /* optional */
  }
}

export async function notifyCleanComplete(title: string, body: string): Promise<void> {
  if (!(await ensurePermission())) return;
  try {
    await sendNotification({ title, body });
  } catch {
    /* optional */
  }
}
