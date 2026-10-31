import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; r: number; vx: number; vy: number; life: number; max: number };

const COUNT = 36;

function sprite(color: string): HTMLCanvasElement {
  const s = document.createElement("canvas");
  s.width = s.height = 32;
  const g = s.getContext("2d");
  if (!g) return s;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return s;
}

export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const color = getComputedStyle(canvas).color || "rgb(90,160,255)";
    const glow = sprite(color);
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (d?: Dot): Dot => {
      const next = d ?? ({} as Dot);
      next.x = w * (0.15 + Math.random() * 0.7);
      next.y = h * (0.55 + Math.random() * 0.4);
      next.r = 3 + Math.random() * 7;
      next.vx = (Math.random() - 0.5) * 0.25;
      next.vy = -(0.15 + Math.random() * 0.45);
      next.max = 140 + Math.random() * 160;
      next.life = d ? 0 : Math.random() * next.max;
      return next;
    };
    resize();
    const dots = Array.from({ length: COUNT }, () => spawn());
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const d of dots) {
        d.life += 1;
        d.x += d.vx;
        d.y += d.vy;
        if (d.life >= d.max || d.y < -d.r) spawn(d);
        ctx.globalAlpha = Math.sin((d.life / d.max) * Math.PI) * 0.8;
        ctx.drawImage(glow, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
      }
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
