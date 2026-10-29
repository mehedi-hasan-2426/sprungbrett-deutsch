import { useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  window.addEventListener("sprungbrett:appearance-changed", notify);
  return () => window.removeEventListener("sprungbrett:appearance-changed", notify);
}

function snapshot() {
  const value = document.documentElement.dataset.appearance;
  return value === "light" || value === "dark" ? value : "system";
}

export function AppearancePicker() {
  const appearance = useSyncExternalStore(subscribe, snapshot, () => "system");
  return (
    <label className="appearance-picker">
      <span>Appearance</span>
      <select value={appearance} onChange={(event) => window.dispatchEvent(new CustomEvent("sprungbrett:appearance-set", { detail: event.target.value }))}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}