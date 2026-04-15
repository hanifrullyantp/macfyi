/** Template HTML email (Bahasa Indonesia) — dipakai Edge Functions (SMTP). */

export function withdrawalRequestAdminEmail(opts: {
  amountIdr: number;
  feeIdr: number;
  method: string;
  affiliateSlug: string;
  affiliateEmail?: string;
  accountSummary: string;
}): { subject: string; html: string } {
  const subject = `[Macfyi] Permintaan penarikan affiliate — ${opts.affiliateSlug}`;
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5">
    <h2>Penarikan baru</h2>
    <p><strong>Affiliate:</strong> ${escapeHtml(opts.affiliateSlug)}${opts.affiliateEmail ? ` (${escapeHtml(opts.affiliateEmail)})` : ""}</p>
    <p><strong>Jumlah:</strong> Rp ${opts.amountIdr.toLocaleString("id-ID")}</p>
    <p><strong>Biaya:</strong> Rp ${opts.feeIdr.toLocaleString("id-ID")}</p>
    <p><strong>Metode:</strong> ${escapeHtml(opts.method)}</p>
    <p><strong>Rekening / detail:</strong><br/>${escapeHtml(opts.accountSummary)}</p>
    <p style="color:#666;font-size:13px">Proses dari panel admin Macfyi.</p>
  </div>`;
  return { subject, html };
}

export function withdrawalProcessedAffiliateEmail(opts: {
  status: string;
  amountIdr: number;
  note?: string;
}): { subject: string; html: string } {
  const subject =
    opts.status === "completed"
      ? "Penarikan Macfyi selesai diproses"
      : opts.status === "rejected"
        ? "Penarikan Macfyi ditolak"
        : "Status penarikan Macfyi diperbarui";
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5">
    <h2>${escapeHtml(subject)}</h2>
    <p><strong>Jumlah:</strong> Rp ${opts.amountIdr.toLocaleString("id-ID")}</p>
    <p><strong>Status:</strong> ${escapeHtml(opts.status)}</p>
    ${opts.note ? `<p><strong>Catatan:</strong> ${escapeHtml(opts.note)}</p>` : ""}
    <p style="color:#666;font-size:13px">Login ke area member untuk detail.</p>
  </div>`;
  return { subject, html };
}

export function saleReferralAffiliateEmail(opts: {
  amountIdr: number;
  orderId: string;
  buyerName: string;
}): { subject: string; html: string } {
  const subject = "Anda mendapat komisi referral Macfyi";
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5">
    <h2>Penjualan referral</h2>
    <p>${escapeHtml(opts.buyerName)} — order <code>${escapeHtml(opts.orderId)}</code></p>
    <p>Komisi perkiraan: <strong>Rp ${opts.amountIdr.toLocaleString("id-ID")}</strong> (akan dikonfirmasi setelah masa tahan).</p>
  </div>`;
  return { subject, html };
}

export function commissionConfirmedAffiliateEmail(opts: { amountIdr: number; orderId: string }): { subject: string; html: string } {
  const subject = "Komisi Macfyi siap dicairkan";
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5">
    <h2>Komisi dikonfirmasi</h2>
    <p>Order <code>${escapeHtml(opts.orderId)}</code>: Rp ${opts.amountIdr.toLocaleString("id-ID")} sudah masuk saldo tersedia.</p>
  </div>`;
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
