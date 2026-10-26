import { useEffect, useRef, useState } from "react";
import type { ScriptPart } from "../lib/types.ts";
import { useProgress } from "../state/ProgressContext.tsx";

type Support = "checking" | "ok" | "no-voice" | "unsupported";

function germanVoices(): SpeechSynthesisVoice[] {
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de"));
  return [...all.filter((v) => v.localService), ...all.filter((v) => !v.localService)];
}

export function ListeningPlayer({ parts, itemIds }: { parts: ScriptPart[]; itemIds: string[] }) {
  const { progress } = useProgress();
  const [support, setSupport] = useState<Support>("checking");
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const [forceScript, setForceScript] = useState(false);
  const voices = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection runs only in the browser
      setSupport("unsupported");
      return;
    }
    const refresh = () => {
      voices.current = germanVoices();
      setSupport(voices.current.length ? "ok" : "no-voice");
    };
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
      window.speechSynthesis.cancel();
    };
  }, []);

  const answered = itemIds.length > 0 && itemIds.every((id) => {
    const s = progress.items[id]?.status;
    return s === "solved" || s === "revealed";
  });
  const showScript = answered || forceScript;

  const play = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const speakers = [...new Set(parts.flatMap((p) => p.lines.map((l) => l.speaker)))];
    const lines = parts.flatMap((p) => p.lines).filter((l) => !/^\(.*\)$/.test(l.text));
    lines.forEach((line, k) => {
      const u = new SpeechSynthesisUtterance(line.text);
      const idx = Math.max(0, speakers.indexOf(line.speaker));
      const voice = voices.current[idx % Math.max(voices.current.length, 1)];
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "de-DE";
      u.rate = rate;
      if (voices.current.length < 2) u.pitch = idx % 2 ? 0.8 : 1.1;
      if (k === lines.length - 1) u.onend = () => setPlaying(false);
      u.onerror = () => setPlaying(false);
      synth.speak(u);
    });
    setPlaying(true);
    setPlays((n) => n + 1);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  return (
    <div className="player">
      {support === "ok" ? (
        <>
          <div className="row">
            {!playing ? <button type="button" onClick={play}>▶ Play</button> : <button type="button" onClick={stop}>■ Stop</button>}
            <label>
              Speed{" "}
              <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
                <option value={1}>normal</option>
                <option value={0.8}>slower</option>
              </select>
            </label>
            <span className="muted">Played: {plays}×</span>
          </div>
          <p className="muted">Read the questions first, then listen twice. The voice comes from your device or browser.</p>
        </>
      ) : support === "checking" ? (
        <p className="muted">Checking speech output …</p>
      ) : (
        <p className="feedback hint">
          {support === "unsupported" ? "Your browser can't read text aloud." : "No German voice is installed on this device."} Ask someone to read the text aloud
          (the script below is only for the person reading) or install a German voice in your system settings.
        </p>
      )}
      {showScript ? (
        <details lang="de">
          <summary lang="en">Script {answered ? "(after listening: read along and repeat)" : "(for the person reading aloud)"}</summary>
          {parts.map((p, k) => (
            <div key={k}>
              {p.title ? <h4>{p.title}</h4> : null}
              {p.lines.map((l, j) => (
                <p key={j}>
                  {l.speaker ? <strong>{l.speaker}: </strong> : null}
                  {l.text}
                </p>
              ))}
            </div>
          ))}
        </details>
      ) : (
        <button type="button" className="link" onClick={() => setForceScript(true)}>
          Show script (only if someone is reading aloud – reading is not listening)
        </button>
      )}
    </div>
  );
}
