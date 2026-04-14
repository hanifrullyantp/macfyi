import type { AiRequest, AiRiskLabel } from "../types";
import { redactPaths } from "./redaction";

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

function riskText(label: AiRiskLabel): string {
  if (label === "SAFE") return "SAFE — biasanya aman dibersihkan.";
  if (label === "REVIEW") return "REVIEW — perlu dicek dulu sebelum dibersihkan.";
  return "HIGH — risiko tinggi. Jangan hapus kalau belum yakin.";
}

function riskAdvice(label: AiRiskLabel): string[] {
  if (label === "SAFE") {
    return [
      "Utamakan item yang direkomendasikan terlebih dulu.",
      "Kalau ragu, exclude dulu — Anda bisa rescan kapan saja.",
    ];
  }
  if (label === "REVIEW") {
    return [
      "Buka pratinjau / reveal dulu, pastikan bukan data kerja penting.",
      "Exclude item yang Anda belum yakin, lalu lanjut bersihkan yang SAFE.",
    ];
  }
  return [
    "Jangan bersihkan massal. Review satu per satu.",
    "Pastikan ada backup / Anda paham dampaknya sebelum menghapus.",
  ];
}

function categoryKb(category: string): { what: string; why: string; impact: string } {
  switch (category) {
    case "cache":
    case "logs":
    case "mail_attachments":
    case "downloads_old":
    case "developer":
      return {
        what: "File sementara seperti cache/log/lampiran. Biasanya dibuat ulang oleh aplikasi.",
        why: "Umumnya aman karena bukan file asli Anda, melainkan data sementara yang menumpuk.",
        impact: "Aplikasi mungkin butuh waktu sedikit lebih lama saat pertama dibuka setelah dibersihkan (cache dibuat ulang).",
      };
    case "duplicates":
      return {
        what: "Beberapa file yang isinya/namanya mirip sehingga diduga duplikat.",
        why: "Menghapus duplikat menghemat ruang tanpa mengubah versi yang Anda pilih untuk disimpan.",
        impact: "Risiko terjadi jika Anda menghapus versi yang ternyata dibutuhkan. Review dulu mana yang ingin disimpan.",
      };
    case "large_files":
      return {
        what: "File atau folder besar yang memakan ruang signifikan.",
        why: "Target paling terasa untuk mengosongkan storage, tapi perlu keputusan manusia.",
        impact: "Jika file besar ini masih dibutuhkan, menghapusnya bisa mengganggu pekerjaan/proyek. Pertimbangkan pindah ke external drive/cloud.",
      };
    case "backups":
      return {
        what: "Backup lama (mis. iPhone/iPad, arsip) yang biasanya ukurannya besar.",
        why: "Backup sering menumpuk dan jarang disadari; sebagian bisa redundant.",
        impact: "Jika backup yang dibutuhkan terhapus, pemulihan data bisa sulit. Review ekstra.",
      };
    case "app_leftovers":
      return {
        what: "Sisa file dari aplikasi yang sudah di-uninstall (support files, caches, containers).",
        why: "Sering aman dibersihkan karena aplikasinya sudah tidak dipakai, tapi kadang dipakai aplikasi lain.",
        impact: "Jika aplikasi terkait masih dipakai, menghapus leftovers bisa mereset pengaturan/cache.",
      };
    default:
      return {
        what: "Item yang terdeteksi memakan ruang atau dianggap tidak penting.",
        why: "Dikelompokkan agar Anda bisa review dan memilih dengan aman.",
        impact: "Dampak tergantung jenis file. Review sebelum bersihkan.",
      };
  }
}

function headerLine(req: AiRequest): string {
  const c = req.itemContext;
  const parts: string[] = [];
  parts.push(`Kategori: ${c.category}`);
  if (c.appHint) parts.push(`App: ${redactPaths(c.appHint)}`);
  parts.push(`Ukuran: ${formatSize(c.sizeBytes)}`);
  parts.push(`Risk: ${c.riskLabel}`);
  if (c.basenameHint) parts.push(`Nama: ${redactPaths(c.basenameHint)}`);
  return parts.join(" · ");
}

/**
 * Deterministic, template-first answer. No hallucination risk.
 * Use this when:
 * - model not installed / disabled
 * - memory pressure high
 * - generation times out
 */
export function kbAnswer(req: AiRequest): string {
  const safeReq: AiRequest = {
    ...req,
    customQuestion: req.customQuestion ? redactPaths(req.customQuestion) : undefined,
    itemContext: {
      ...req.itemContext,
      appHint: req.itemContext.appHint ? redactPaths(req.itemContext.appHint) : undefined,
      basenameHint: req.itemContext.basenameHint ? redactPaths(req.itemContext.basenameHint) : undefined,
      shortExplanation: req.itemContext.shortExplanation ? redactPaths(req.itemContext.shortExplanation) : undefined,
    },
  };

  const kb = categoryKb(safeReq.itemContext.category);
  const risk = safeReq.itemContext.riskLabel;

  const lines: string[] = [];
  lines.push(headerLine(safeReq));
  lines.push("");
  lines.push("Apa ini");
  lines.push(`- ${kb.what}`);
  if (safeReq.itemContext.shortExplanation) {
    lines.push(`- Catatan: ${safeReq.itemContext.shortExplanation}`);
  }
  lines.push("");
  lines.push("Kenapa muncul / disarankan");
  lines.push(`- ${kb.why}`);
  lines.push("");
  lines.push("Risiko");
  lines.push(`- ${riskText(risk)}`);
  lines.push("");

  if (safeReq.questionType === "impact") {
    lines.push("Dampak yang mungkin terjadi");
    lines.push(`- ${kb.impact}`);
    lines.push("");
  }

  lines.push("Saran aman");
  for (const a of riskAdvice(risk)) lines.push(`- ${a}`);

  if (safeReq.questionType === "custom" && safeReq.customQuestion?.trim()) {
    lines.push("");
    lines.push("Pertanyaan Anda");
    lines.push(`- ${safeReq.customQuestion.trim()}`);
    lines.push("");
    lines.push("Jawaban singkat");
    lines.push("- Untuk pertanyaan detail, gunakan AI lokal jika tersedia. Jika ragu, exclude dulu dan bersihkan item SAFE.");
  }

  return lines.join("\n");
}

