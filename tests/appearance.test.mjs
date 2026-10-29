import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new globalThis.URL("../public/appearance.js", import.meta.url), "utf8");
const key = "sprungbrett.appearance";

function browser(initial, blocked = false) {
  const values = new Map(initial ? [[key, initial]] : []);
  values.set("sprungbrett.progress.synthetic", "unchanged progress");
  const storage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
  };
  const target = new globalThis.EventTarget();
  const root = { dataset: {} };
  const notifications = [];
  target.addEventListener("sprungbrett:appearance-changed", () => notifications.push(root.dataset.appearance));
  const context = {
    document: { documentElement: root },
    Event: globalThis.Event,
    addEventListener: target.addEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  Object.defineProperty(context, "localStorage", {
    get() {
      if (blocked) throw new Error("Storage is blocked");
      return storage;
    },
  });
  runInNewContext(source, context);
  const dispatch = (name, fields) => target.dispatchEvent(Object.assign(new globalThis.Event(name), fields));
  return { root, values, storage, dispatch, notifications };
}

test("appearance defaults to the system preference without changing progress", () => {
  const { root, values } = browser();
  assert.equal(root.dataset.appearance, "system");
  assert.equal(values.get("sprungbrett.progress.synthetic"), "unchanged progress");
  assert.equal(values.has(key), false);
});

test("appearance restores each supported saved preference before interaction", () => {
  for (const preference of ["light", "dark", "system"]) {
    assert.equal(browser(preference).root.dataset.appearance, preference);
  }
});

test("appearance ignores malformed stored preferences", () => {
  for (const preference of ["DARK", "auto", "<script>", '{"mode":"dark"}']) {
    assert.equal(browser(preference).root.dataset.appearance, "system");
  }
});

test("appearance changes and persists only its own preference", () => {
  const { root, values, dispatch } = browser();
  for (const preference of ["light", "dark", "system"]) {
    dispatch("sprungbrett:appearance-set", { detail: preference });
    assert.equal(root.dataset.appearance, preference);
    assert.equal(values.get(key), preference);
    assert.equal(values.get("sprungbrett.progress.synthetic"), "unchanged progress");
    assert.equal(values.size, 2);
  }
});

test("appearance rejects unrecognized change events", () => {
  const { root, values, dispatch } = browser("dark");
  for (const detail of [undefined, null, {}, "LIGHT", "unexpected"]) {
    dispatch("sprungbrett:appearance-set", { detail });
    assert.equal(root.dataset.appearance, "dark");
    assert.equal(values.get(key), "dark");
  }
});

test("appearance still works in this tab when localStorage access is denied", () => {
  const { root, dispatch } = browser(undefined, true);
  assert.equal(root.dataset.appearance, "system");
  dispatch("sprungbrett:appearance-set", { detail: "dark" });
  assert.equal(root.dataset.appearance, "dark");
});

test("appearance still changes when storage writes fail", () => {
  const { root, storage, dispatch } = browser("light");
  storage.setItem = () => { throw new Error("Storage is full"); };
  dispatch("sprungbrett:appearance-set", { detail: "dark" });
  assert.equal(root.dataset.appearance, "dark");
});

test("appearance follows changes and resets from another tab", () => {
  const { root, storage, dispatch } = browser("light");
  dispatch("storage", { key, newValue: "dark", storageArea: storage });
  assert.equal(root.dataset.appearance, "dark");
  dispatch("storage", { key, newValue: null, storageArea: storage });
  assert.equal(root.dataset.appearance, "system");
  dispatch("storage", { key: null, newValue: null, storageArea: storage });
  assert.equal(root.dataset.appearance, "system");
});

test("appearance ignores other storage keys and sessionStorage events", () => {
  const { root, storage, dispatch } = browser("light");
  dispatch("storage", { key: "sprungbrett.progress.synthetic", newValue: "dark", storageArea: storage });
  dispatch("storage", { key, newValue: "dark", storageArea: {} });
  assert.equal(root.dataset.appearance, "light");
});

test("appearance notifies hydrated controls without writing inline styles", () => {
  const { root, dispatch, notifications } = browser();
  dispatch("sprungbrett:appearance-set", { detail: "light" });
  assert.deepEqual(notifications, ["system", "light"]);
  assert.deepEqual(Object.keys(root), ["dataset"]);
  assert.equal(root.dataset.appearance, "light");
  assert.doesNotMatch(source, /\.style\b|innerHTML|fetch\(|console\./);
});