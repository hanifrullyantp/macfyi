import { Link } from "react-router-dom";
import type { AuthFormHint } from "../lib/authErrors";

type AuthFormFeedbackProps = {
  message: string;
  hint?: AuthFormHint;
  onRegister?: () => void;
  onForgot?: () => void;
  forgotHref?: string;
  onForgotNavigate?: () => void;
};

export function AuthFormFeedback({
  message,
  hint,
  onRegister,
  onForgot,
  forgotHref = "/lupa-password",
  onForgotNavigate,
}: AuthFormFeedbackProps) {
  if (!message) return null;

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-100 space-y-2">
      <p>{message}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {hint === "register" && onRegister ? (
          <button type="button" onClick={onRegister} className="text-amber-300 hover:text-amber-200 underline font-medium">
            Belum punya akun? Daftar di sini
          </button>
        ) : null}
        {hint === "register" && !onRegister ? (
          <Link to="/login" className="text-amber-300 hover:text-amber-200 underline font-medium">
            Belum punya akun? Daftar di sini
          </Link>
        ) : null}
        {onForgot ? (
          <button type="button" onClick={onForgot} className="text-white/80 hover:text-white underline">
            Lupa password?
          </button>
        ) : (
          <Link
            to={forgotHref}
            onClick={onForgotNavigate}
            className="text-white/80 hover:text-white underline"
          >
            Lupa password?
          </Link>
        )}
      </div>
    </div>
  );
}
