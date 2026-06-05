import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  id?: string;
};

export function PasswordInput({
  value,
  onChange,
  autoComplete,
  className = "mt-1 relative",
  inputClassName = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 pr-10 text-white",
  disabled,
  id,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={className}>
      <input
        id={id}
        type={show ? "text" : "password"}
        className={inputClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 p-1"
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        disabled={disabled}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
