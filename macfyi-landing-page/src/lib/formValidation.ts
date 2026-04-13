/** Shared client-side validation for landing forms (no server; defense in depth for UX). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Basic RFC-like check; not exhaustive. */
export function isValidEmail(raw: string): boolean {
  const s = normalizeEmail(raw);
  if (s.length < 5 || s.length > 254) return false;
  return EMAIL_RE.test(s);
}

export function validatePersonName(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return { ok: false, message: "Nama wajib diisi." };
  if (t.length < 2) return { ok: false, message: "Nama minimal 2 karakter." };
  if (t.length > 200) return { ok: false, message: "Nama terlalu panjang." };
  return { ok: true, value: t };
}

/** Digits only after strip; Indonesia / international mobile. */
export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Required phone (checkout). */
export function validatePhoneRequired(raw: string): { ok: true; digits: string } | { ok: false; message: string } {
  const d = normalizePhoneDigits(raw);
  if (!d) return { ok: false, message: "Nomor HP wajib diisi." };
  if (d.length < 10 || d.length > 15) return { ok: false, message: "Nomor HP tidak valid (10–15 digit)." };
  return { ok: true, digits: d };
}

/** Optional phone (lead form); empty OK. */
export function validatePhoneOptional(raw: string): { ok: true; digits?: string } | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true };
  const d = normalizePhoneDigits(raw);
  if (d.length < 8 || d.length > 15) return { ok: false, message: "Nomor HP tampak tidak valid (8–15 digit)." };
  return { ok: true, digits: d };
}
