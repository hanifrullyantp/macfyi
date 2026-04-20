import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_LEGAL, type ContentData } from "../types/content";
import { fetchLandingContentBlob } from "../lib/loadLandingBlob";

export function LegalPage() {
  const { pathname } = useLocation();
  const isPrivacy = pathname.includes("privacy");
  const [legal, setLegal] = useState<ContentData["legal"]>(DEFAULT_LEGAL);

  useEffect(() => {
    void (async () => {
      const blob = await fetchLandingContentBlob();
      if (blob?.legal) {
        setLegal({ ...DEFAULT_LEGAL, ...blob.legal });
      }
    })();
  }, []);

  const title = isPrivacy ? legal.privacyTitle : legal.termsTitle;
  const html = isPrivacy ? legal.privacyHtml : legal.termsHtml;

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-8"
        >
          <ArrowLeft size={16} /> Beranda
        </Link>
        <h1 className="text-3xl font-bold mb-8">{title}</h1>
        <div
          className="prose prose-invert prose-sm max-w-none text-white/80 [&_a]:text-red-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 space-y-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
