"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Target, XCircle, Sparkles, ArrowRight, PlayCircle } from "lucide-react";
import { Molecule } from "@/lib/types";
import { GEOMETRY_POOL } from "@/engine/vsepr";
import { formatFormula, formatAXE, cn, seededRandom } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import { Badge, Button, Term } from "@/components/ui";

interface Question {
  prompt: React.ReactNode;
  options: string[];
  answer: string;
  explain: string;
  numeric?: boolean;
}

function shuffled<T>(arr: T[], seed: string): T[] {
  const rng = seededRandom(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildQuestions(m: Molecule): Question[] {
  const distractors = shuffled(
    GEOMETRY_POOL.filter((g) => g !== m.molecularGeometry),
    m.formula,
  ).slice(0, 3);
  const lpOptions = shuffled(
    [String(m.lonePairs), String((m.lonePairs + 1) % 4), String(Math.max(0, m.lonePairs - 1) === m.lonePairs ? 3 : Math.max(0, m.lonePairs - 1))],
    m.formula + "lp",
  );
  return [
    {
      prompt: (
        <>Berapa jumlah <Term id="domain-elektron-pusat">domain elektron di atom pusat</Term> ({m.centralAtom}) pada {formatFormula(m.formula)}?
        <span className="mt-1 block text-xs font-normal text-muted">Petunjuk: domain = jumlah ikatan (rangkap = 1) + PEB pusat.</span></>
      ),
      options: shuffled([String(m.stericNumber), String(m.stericNumber - 1), String(m.stericNumber + 1), String(Math.max(2, m.stericNumber - 2))], m.formula + "sn"),
      answer: String(m.stericNumber),
      explain: `${m.name} punya ${m.bondingPairs} domain ikatan + ${m.lonePairs} PEB di atom pusat = bilangan sterik ${m.stericNumber}.`,
    },
    {
      prompt: <>Menurut teori <Term id="vsepr">VSEPR</Term>, apa <Term id="geometri-molekul">bentuk molekul</Term> {formatFormula(m.formula)}?</>,
      options: shuffled([m.molecularGeometry, ...distractors], m.formula + "geo"),
      answer: m.molecularGeometry,
      explain: `Notasi ${formatAXE(m.vseprType)}: ${m.bondingPairs} ikatan + ${m.lonePairs} PEB → geometri elektron ${m.electronGeometry}, bentuk molekulnya ${m.molecularGeometry}.`,
    },
    {
      prompt: <>Berapa <Term id="peb">pasangan elektron bebas (PEB)</Term> yang ada di ATOM PUSAT {m.centralAtom}?</>,
      options: [...new Set(lpOptions)],
      answer: String(m.lonePairs),
      explain: m.lonePairs > 0
        ? `Atom ${m.centralAtom} menyisakan ${m.lonePairs} PEB setelah berikatan — inilah yang membuat bentuknya berbeda dari ${m.electronGeometry}.`
        : `Semua elektron valensi ${m.centralAtom} dipakai berikatan, jadi tidak ada PEB di atom pusat.`,
    },
  ];
}

export function PredictClient({ molecule }: { molecule: Molecule }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const setQuizScore = useAppStore((s) => s.setQuizScore);

  const questions = useMemo(() => buildQuestions(molecule), [molecule]);
  const q = questions[step];

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    if (opt === q.answer) setScore((s) => s + 1);
  };

  const nextStep = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
      setPicked(null);
    } else {
      setDone(true);
      setQuizScore(molecule.formula, score);
    }
  };

  const resetQuiz = () => {
    setStep(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Target className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Uji Pemahaman: {molecule.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Tebak dulu sebelum melihat jawabannya — kamu akan diajak menonton proses lengkap 10 tahapnya setelah ini.
          </p>
        </div>
      </div>

      {!done ? (
        <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Badge tone="primary">Pertanyaan {step + 1} / {questions.length}</Badge>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <span key={i} className={cn("h-1.5 w-6 rounded-full", i < step ? "bg-primary" : i === step ? "bg-primary/40" : "bg-border")} />
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="font-display text-[17px] font-bold leading-snug">{q.prompt}</p>
              <div className="mt-4 grid gap-2">
                {q.options.map((opt) => {
                  const isAnswer = opt === q.answer;
                  const isPicked = opt === picked;
                  return (
                    <button
                      key={opt}
                      onClick={() => choose(opt)}
                      disabled={!!picked}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all",
                        !picked && "border-border hover:border-primary/60 hover:bg-primary/5",
                        picked && isAnswer && "border-success bg-success/10 text-success",
                        picked && isPicked && !isAnswer && "border-danger bg-danger/10 text-danger",
                        picked && !isPicked && !isAnswer && "border-border opacity-50",
                      )}
                    >
                      <span>{opt}</span>
                      {picked && isAnswer && <CheckCircle2 className="h-5 w-5 shrink-0" />}
                      {picked && isPicked && !isAnswer && <XCircle className="h-5 w-5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {picked && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <p className={cn("rounded-2xl p-3.5 text-[13px] leading-relaxed", picked === q.answer ? "bg-success/10 text-success" : "bg-lonepair/10 text-lonepair")}>
                    <b>{picked === q.answer ? "Tepat! " : "Belum tepat. "}</b>{q.explain}
                  </p>
                  <Button onClick={nextStep} className="mt-3 w-full">
                    {step < questions.length - 1 ? "Pertanyaan berikutnya" : "Lihat hasil"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-primary/35 bg-gradient-to-br from-primary/12 to-secondary/10 p-6 text-center"
        >
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 font-display text-3xl font-bold">{score} / {questions.length}</p>
          <p className="mt-1 text-sm text-muted">
            {score === questions.length
              ? "Sempurna! Kamu sudah berpikir seperti ahli VSEPR."
              : score >= 2
                ? "Bagus! Lihat proses lengkapnya untuk menguatkan intuisimu."
                : "Tidak apa-apa — justru sekarang saat terbaik melihat prosesnya langkah demi langkah."}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button href={`/lab/${molecule.formula}?autoplay=1`}>
              <PlayCircle className="h-4 w-4" /> Tonton Proses 10 Tahap
            </Button>
            <Button onClick={resetQuiz} variant="outline">Ulangi Kuis</Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button href={`/predict/CO2`} variant="ghost" size="sm">Molekul lain →</Button>
            <Button href={`/compare?a=${molecule.formula}`} variant="ghost" size="sm">Bandingkan</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
