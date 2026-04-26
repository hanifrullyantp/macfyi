import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getAdminPageTitle } from "../../lib/adminRouteMeta";

type AdminPageFrameProps = {
  children: ReactNode;
  /** Subjudul / penjelasan singkat (boleh string atau node dengan <code> dll.) */
  description?: ReactNode;
  /** Default: judul dari peta rute; set jika butuh teks khusus */
  title?: string;
  className?: string;
};

export function AdminPageFrame({ children, description, title, className }: AdminPageFrameProps) {
  const { pathname } = useLocation();
  const heading = title ?? getAdminPageTitle(pathname);

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${className ?? ""}`.trim()}>
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">{heading}</h1>
        {description != null ? (
          <div className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-white/35 [&_code]:rounded-md [&_code]:bg-white/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:text-white/55">
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
