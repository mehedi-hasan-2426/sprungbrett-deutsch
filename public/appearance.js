(() => {
  const key = "sprungbrett.appearance";
  const root = globalThis.document.documentElement;
  const valid = (value) => value === "light" || value === "dark" || value === "system";
  const apply = (value) => {
    root.dataset.appearance = valid(value) ? value : "system";
    globalThis.dispatchEvent(new globalThis.Event("sprungbrett:appearance-changed"));
  };

  let initial;
  try {
    initial = globalThis.localStorage.getItem(key);
  } catch {
    initial = "system";
  }
  apply(initial);

  globalThis.addEventListener("sprungbrett:appearance-set", (event) => {
    if (!valid(event.detail)) return;
    apply(event.detail);
    try {
      globalThis.localStorage.setItem(key, event.detail);
    } catch {
      return;
    }
  });

  globalThis.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    try {
      if (event.storageArea !== globalThis.localStorage) return;
    } catch {
      return;
    }
    apply(event.newValue);
  });
})();