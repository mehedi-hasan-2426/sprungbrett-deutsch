import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const QUERY = "(prefers-color-scheme: dark)";

function subscribe(notify: () => void) {
  const media = window.matchMedia(QUERY);
  window.addEventListener("sprungbrett:appearance-changed", notify);
  media.addEventListener("change", notify);
  return () => {
    window.removeEventListener("sprungbrett:appearance-changed", notify);
    media.removeEventListener("change", notify);
  };
}

function snapshot(): Theme {
  const value = document.documentElement.dataset.appearance;
  if (value === "light" || value === "dark") return value;
  return window.matchMedia(QUERY).matches ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, (): Theme => "light");
  const dark = theme === "dark";
  const next = dark ? "Light mode" : "Dark mode";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      className="theme-switch tip"
      data-tip={next}
      onClick={() => window.dispatchEvent(new CustomEvent("sprungbrett:appearance-set", { detail: dark ? "light" : "dark" }))}
    >
      <span className="theme-thumb">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          {dark ? <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
        </svg>
      </span>
    </button>
  );
}
