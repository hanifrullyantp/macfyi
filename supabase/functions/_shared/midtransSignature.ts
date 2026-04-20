/** Midtrans HTTP notification: SHA512(order_id + status_code + gross_amount + server_key) */

async function sha512hex(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyMidtransSignature(
  payload: Record<string, unknown>,
  serverKey: string
): Promise<boolean> {
  const orderId = String(payload.order_id ?? "");
  const statusCode = String(payload.status_code ?? "");
  const grossAmount = String(payload.gross_amount ?? "");
  const sig = String(payload.signature_key ?? "").toLowerCase();
  if (!orderId || !statusCode || !grossAmount || !sig) return false;
  const raw = orderId + statusCode + grossAmount + serverKey;
  const hex = await sha512hex(raw);
  return hex.toLowerCase() === sig;
}
