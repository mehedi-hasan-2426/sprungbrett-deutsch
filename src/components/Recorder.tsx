import { useEffect, useRef, useState } from "react";

type RecState = "idle" | "recording" | "done" | "denied" | "unsupported";

export function Recorder() {
  const [state, setState] = useState<RecState>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        window.clearInterval(timer.current);
        setUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
        setState("done");
      };
      recorder.current = rec;
      rec.start();
      setSeconds(0);
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      setState("recording");
    } catch {
      setState("denied");
    }
  };

  return (
    <div className="recorder">
      <p className="muted">
        Optional: record yourself and listen back. The recording stays in this tab only and is never saved or uploaded. The microphone is used only after you click.
      </p>
      <div className="row">
        {state === "recording" ? (
          <button type="button" onClick={() => recorder.current?.stop()}>■ Stop ({seconds} s)</button>
        ) : (
          <button type="button" onClick={start}>● {state === "done" ? "Record again" : "Record"}</button>
        )}
      </div>
      {state === "done" && url ? <audio controls src={url} /> : null}
      {state === "denied" ? <p className="feedback hint">No access to the microphone. You can use your phone's voice memo app instead.</p> : null}
      {state === "unsupported" ? <p className="feedback hint">Your browser can't record. Use your phone's voice memo app.</p> : null}
    </div>
  );
}
