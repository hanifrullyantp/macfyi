"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useInView as useInViewNative } from "framer-motion";
import { useRef } from "react";

function useInView(options: any) {
  const ref = useRef(null);
  const inView = useInViewNative(ref, options);
  return { ref, inView };
}
import {
  ArrowRight, Atom, AudioLines, Accessibility, Compass, FlaskRound, Grid3X3,
  Layers, MousePointer2, PlayCircle, Scale, Sparkles, Target, X, Check, GraduationCap, BookOpen,
} from "lucide-react";
import { MOLECULES, getMolecule } from "@/data/molecules";
import { useAppStore } from "@/store/app";
import { formatFormula } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";
import { BRAND } from "@/config/brand";

const MoleculeCanvas = dynamic(() => import("@/three/MoleculeCanvas"), { ssr: false });

const noop = () => {};

function HeroMolecule() {
  const theme = useAppStore((s) => s.theme);
  const mol = getMolecule("CH4")!;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-border shadow-2xl">
      <MoleculeCanvas
        molecule={mol}
        stageId="molecular-shape-3d"
        showLigandElectrons={false}
        hideLonePairs
        showAngles={false}
        autoRotate
        viewMode="ball-stick"
        theme={theme}
        onPopup={noop}
        resetToken={0}
        rotateSpeed={1.4}
      />
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
        <span className="rounded-full glass px-3 py-1.5 text-[11px] font-bold text-muted">
          <MousePointer2 className="mr-1 inline h-3 w-3 text-primary" /> seret untuk memutar · CH₄ tetrahedral
        </span>
      </div>
    </div>
  );
}

const FLOW = [
  { icon: Grid3X3, title: "Tabel Periodik", desc: "Kenali unsur penyusunnya & golongannya." },
  { icon: Atom, title: "Elektron Valensi", desc: "Titik elektron terluar muncul di tiap atom." },
  { icon: Layers, title: "Struktur Lewis", desc: "Elektron berpasangan — fondasi yang benar." },
  { icon: Sparkles, title: "PEI & PEB", desc: "Pasangan ikatan vs pasangan bebas diidentifikasi." },
  { icon: FlaskRound, title: "Tolakan VSEPR", desc: "Domain di atom pusat saling tolak sampai stabil." },
  { icon: PlayCircle, title: "Geometri 3D", desc: "Bentuk molekul akhir terungkap & dieksplorasi." },
];

const FEATURES = [
  {
    icon: FlaskRound, title: "Lab Molekul 10 Tahap", href: "/lab/H2O",
    desc: "Satu-satunya yang menampilkan proses kimia lengkap: bukan atom langsung terhubung garis, melainkan elektron → pasangan → PEI/PEB → garis ikatan → VSEPR.",
    cta: "Coba dengan air",
  },
  {
    icon: Grid3X3, title: "Tabel Periodik Interaktif", href: "/periodic-table",
    desc: "Jelajahi semua unsur golongan utama periode 1–5. Elektron valensi setiap molekul selalu di-lookup dari sini — konsepnya nyambung dari hulu ke hilir.",
    cta: "Jelajahi unsur",
  },
  {
    icon: AudioLines, title: "Narasi Audio Indonesia", href: "/lab/CO2?autoplay=1",
    desc: "Setiap tahap dinarasikan otomatis dalam Bahasa Indonesia yang sederhana, dengan caption. Bisa diputar otomatis dari awal sampai kesimpulan.",
    cta: "Dengarkan",
  },
  {
    icon: Accessibility, title: "Aksesibel untuk Semua", href: "/glossary",
    desc: "Perbedaan elektron tak hanya lewat warna: dot solid vs bercincin tetap jelas saat grayscale. Mode terang/gelap, keyboard nav, dan hormati reduced-motion.",
    cta: "Lihat glosarium",
  },
  {
    icon: Compass, title: "25 Molekul Kurikulum", href: "/explorer",
    desc: "Dari CO₂ sampai XeF₄ — lengkap dengan data Lewis akurat (orde ikatan & PEB tiap ligan), contoh dunia nyata, dan analogi sederhana.",
    cta: "Lihat semua",
  },
  {
    icon: Target, title: "Uji & Bandingkan", href: "/compare",
    desc: "Kuis prediksi bentuk + perbandingan dua molekul berdampingan untuk melatih intuisi AXE sebelum ujian.",
    cta: "Latihan",
  },
];

const STATS = [
  { value: 10, suffix: "", label: "Tahap pembelajaran bertahap" },
  { value: 25, suffix: "+", label: "Molekul interaktif 3D" },
  { value: 20, suffix: "+", label: "Istilah glosarium terpadu" },
  { value: 55, suffix: "", label: "Unsur tabel periodik" },
];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, margin: "-100px 0px" });

  useEffect(() => {
    if (inView) {
      let start = 0;
      const end = value;
      const duration = 2000;
      let startTime: number | null = null;

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * (end - start) + start));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [inView, value]);

  return (
    <span ref={ref} className="font-display text-4xl font-bold text-primary">
      {count}{suffix}
    </span>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

export default function LandingPage() {
  const showcase = ["H2O", "CO2", "NH3", "SF6"].map((f) => getMolecule(f)!);

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Badge tone="primary" className="mb-4">Media Pembelajaran Kimia Interaktif</Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[3.6rem]"
          >
            {BRAND.appTagline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base"
          >
            <b>{BRAND.appName}</b> merupakan platform laboratorium virtual yang dirancang untuk memvisualisasikan pembentukan ikatan kovalen dan geometri molekul secara bertahap. Melalui pendekatan berbasis data periodik, platform ini menyajikan proses kimia yang akurat sesuai prinsip pedagogi.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-7 flex flex-wrap gap-3"
          >
            <Button href="/lab" size="lg">
              Masuk Laboratorium Virtual <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/periodic-table" size="lg" variant="outline">
              <Grid3X3 className="h-4 w-4" /> Buka Tabel Periodik Unsur
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2"
          >
            {["Akses Terbuka", "Narasi Pedagogis Indonesia", "Optimasi Visual Tema"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Check className="h-3.5 w-3.5 text-success" /> {t}
              </span>
            ))}
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 120, damping: 18 }}
          className="h-[380px] sm:h-[460px]"
        >
          <HeroMolecule />
        </motion.div>
      </section>

      {/* ============ FLOW ============ */}
      <section className="border-y border-border bg-surface/60 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Metodologi Alur Pembelajaran</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">
              Setiap pemodelan mengikuti standar 10 tahap sistematis untuk menjamin pemahaman struktur yang komprehensif.
            </p>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {FLOW.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ delay: i * 0.06 }} className="relative">
                <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-4">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <p className="font-display text-[13.5px] font-bold">{i + 1}. {f.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{f.desc}</p>
                </div>
                {i < FLOW.length - 1 && (
                  <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-primary/50 lg:block" aria-hidden />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <motion.div {...fadeUp} className="mb-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Fitur Utama Laboratorium Virtual</h2>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fadeUp} transition={{ delay: i * 0.05 }}>
              <Link
                href={f.href}
                className="group flex h-full flex-col rounded-3xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary transition-transform group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </span>
                <p className="font-display text-[15.5px] font-bold">{f.title}</p>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-muted">{f.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-primary">
                  Akses Fitur <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ PEDAGOGI ============ */}
      <section className="border-y border-border bg-surface/60 py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <motion.div {...fadeUp} className="rounded-3xl border border-danger/30 bg-danger/5 p-6">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-danger">
              <X className="h-5 w-5" /> Pendekatan Konvensional
            </p>
            <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-foreground/80">
              <li>• Representasi molekul ditampilkan secara instan tanpa asal-usul elektron.</li>
              <li>• Pengabaian perhitungan elektron valensi dalam proses visualisasi.</li>
              <li>• Definisi PEI & PEB bersifat hafalan statis tanpa proses pembentukan.</li>
              <li>• Geometri molekul dianggap sebagai luaran tabel, bukan hasil interaksi domain.</li>
            </ul>
          </motion.div>
          <motion.div {...fadeUp} className="rounded-3xl border border-success/30 bg-success/5 p-6">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-success">
              <Check className="h-5 w-5" /> Pendekatan Metodis {BRAND.appName}
            </p>
            <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-foreground/80">
              <li>• Identifikasi valensi berbasis data <b>Tabel Periodik Unsur</b> secara akurat.</li>
              <li>• Visualisasi proses <b>pembentukan pasangan elektron</b> (Pairing) yang dinamis.</li>
              <li>• Transformasi pasangan elektron menjadi <b>garis ikatan</b> (Struktur Lewis).</li>
              <li>• Penentuan geometri berdasarkan <b>interaksi tolak-menolak domain</b> atom pusat.</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ============ SHOWCASE ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <motion.div {...fadeUp} className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Mulai dari molekul yang familiar</h2>
          <Button href="/explorer" variant="ghost" size="sm">Semua 25 molekul <ArrowRight className="h-3.5 w-3.5" /></Button>
        </motion.div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {showcase.map((m, i) => (
            <motion.div key={m.formula} {...fadeUp} transition={{ delay: i * 0.05 }}>
              <Link href={`/lab/${m.formula}`} className="group block rounded-3xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                <p className="font-display text-3xl font-bold">{formatFormula(m.formula)}</p>
                <p className="text-sm font-semibold text-muted">{m.name}</p>
                <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted">{m.simpleAnalogy}</p>
                <div className="mt-3 flex gap-1.5">
                  <Badge tone="primary">{m.molecularGeometry}</Badge>
                  <Badge>{m.bondAngle}</Badge>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="border-y border-border bg-gradient-to-r from-primary/10 via-surface to-secondary/10 py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:px-6 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }} className="text-center">
              <p className="font-display">
                <Counter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <motion.div {...fadeUp}>
          <GraduationCap className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h2 className="mx-auto max-w-xl font-display text-2xl font-bold sm:text-3xl">
            Eksplorasi Geometri Molekul Secara Interaktif
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
            Platform berbasis web ini dapat diakses secara terbuka untuk mendukung kegiatan belajar mengajar kimia di tingkat menengah.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/lab" size="lg"><FlaskRound className="h-4 w-4" /> Masuk Laboratorium Virtual</Button>
            <Button href="/periodic-table" size="lg" variant="outline"><Grid3X3 className="h-4 w-4" /> Tabel Periodik Unsur</Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
