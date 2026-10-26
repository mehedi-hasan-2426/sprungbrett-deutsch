export function textKey(text: string): string {
  let h = 0x811c9dc5;
  const s = text.trim().replace(/\s+/g, " ");
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
