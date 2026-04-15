import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";

export function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const orderId = useMemo(() => params.get("order_id")?.trim() ?? "", [params]);

  const deepBase = "macfyi://activate";
  const hint = orderId
    ? `Order: ${orderId}. Kunci lisensi dikirim ke email Anda — gunakan email yang sama saat aktivasi.`
    : "Selesaikan pembayaran? Kunci lisensi dikirim ke email checkout Anda.";

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-8 text-center">
        <h1 className="text-2xl font-bold mb-2 text-emerald-100">Terima kasih!</h1>
        <p className="text-sm text-white/65 mb-6">{hint}</p>
        <ol className="text-left text-sm text-white/70 space-y-3 mb-8 list-decimal list-inside">
          <li>Buka email konfirmasi — salin <strong>kunci lisensi</strong>.</li>
          <li>
            Klik{" "}
            <a href={deepBase} className="text-emerald-400 underline">
              Aktifkan di Macfyi
            </a>{" "}
            (deep link) atau buka aplikasi lalu tempel kunci.
          </li>
          <li>Pakai <strong>email yang sama</strong> seperti saat checkout.</li>
        </ol>
        <a
          href={deepBase}
          className="inline-block w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold py-3 mb-3"
        >
          Buka Macfyi — Aktivasi
        </a>
        <Link to="/" className="text-sm text-white/45 underline hover:text-white block">
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
