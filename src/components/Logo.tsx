export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" width="28" height="28" fill="none" strokeLinecap="round" strokeWidth="9" aria-hidden="true" focusable="false">
      <path className="logo-bar-top" d="M27 19 51 14" />
      <path stroke="#ef3b24" d="M18 33 40 28.5" />
      <path stroke="#f8b81c" d="M13 48 51 40" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-word">Sprungbrett</span>
    </span>
  );
}
