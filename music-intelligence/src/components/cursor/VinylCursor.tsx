"use client";

import { useEffect, useRef } from "react";

type Mode = "default" | "link" | "media" | "text" | "drag";
type Target = { mode: Mode; label: string; rect: DOMRect | null };
type Spark = { x: number; y: number; vx: number; vy: number; life: number };
type Wave = { x: number; y: number; t: number };

const BARS = 48;
const TRAIL = 26;
const TEXT_INPUT = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, [contenteditable="true"]';
const CLICKABLE = 'a[href], button, [role="button"], [role="radio"], select, summary, label[for]';

function classify(el: Element | null): Target {
  if (!el) return { mode: "default", label: "", rect: null };
  const custom = el.closest<HTMLElement>("[data-cursor]");
  if (custom) {
    const mode = (custom.dataset.cursor as Mode) ?? "link";
    return { mode, label: custom.dataset.cursorLabel ?? "", rect: mode === "link" ? custom.getBoundingClientRect() : null };
  }
  if (el.closest(TEXT_INPUT)) return { mode: "text", label: "", rect: null };
  const clickable = el.closest<HTMLElement>(CLICKABLE);
  if (clickable) {
    const href = clickable.getAttribute("href") ?? "";
    const label = href.includes("spotify.com") ? "Spotify" : clickable.tagName === "A" ? "Open" : "";
    return { mode: "link", label, rect: clickable.getBoundingClientRect() };
  }
  if (el.closest(".cursor-grab")) return { mode: "drag", label: "Drag", rect: null };
  if (el.closest("img, picture")) return { mode: "media", label: "View", rect: null };
  return { mode: "default", label: "", rect: null };
}

/**
 * "Vinyl Pulse": a precise dot inside a spinning ring of equalizer bars that
 * react to how fast you move, a light ribbon trailing behind, magnetic hover on
 * controls, a lens over artwork and a shockwave with sparks on click.
 * Mouse-only; touch devices keep their native behaviour.
 */
export function VinylCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("vinyl-cursor");

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const mouse = { x: w / 2, y: h / 2, seen: false };
    const ring = { x: w / 2, y: h / 2, r: 18, press: 1 };
    let velocity = 0;
    let visible = 0;
    let angle = 0;
    let target: Target = { mode: "default", label: "", rect: null };
    let modeBlend = { link: 0, media: 0, text: 0, drag: 0 };
    let accent = "#dcc9a8";
    let pressed = false;
    const trail: { x: number; y: number }[] = [];
    const sparks: Spark[] = [];
    const waves: Wave[] = [];
    const noise = Array.from({ length: BARS }, (_, i) => 0.4 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.6);

    const readAccent = () => {
      accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || accent;
    };
    readAccent();
    const accentTimer = window.setInterval(readAccent, 600);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.seen = true;
      target = classify(e.target as Element);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pressed = true;
      if (reduced) return;
      waves.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 2.5 + Math.random() * 4.5;
        sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1 });
      }
    };
    const onUp = () => (pressed = false);
    const onLeave = () => (mouse.seen = false);
    const onScroll = () => {
      // Element under a still mouse changes while scrolling; refresh the hover state.
      target = classify(document.elementFromPoint(mouse.x, mouse.y));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    let raf = 0;
    let last = performance.now();
    // Frame-rate independent smoothing: `k` is the per-frame factor at 60 fps.
    let frameScale = 1;
    const approach = (v: number, t: number, k: number) => v + (t - v) * (1 - Math.pow(1 - k, frameScale));

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frameScale = dt * 60;
      ctx.clearRect(0, 0, w, h);
      visible = approach(visible, mouse.seen ? 1 : 0, 0.15);

      // Magnetic target: the ring is pulled towards the centre of the hovered control.
      let tx = mouse.x;
      let ty = mouse.y;
      let tr = 18;
      if (target.mode === "link" && target.rect) {
        const cx = target.rect.left + target.rect.width / 2;
        const cy = target.rect.top + target.rect.height / 2;
        tx = mouse.x + (cx - mouse.x) * 0.35;
        ty = mouse.y + (cy - mouse.y) * 0.35;
        tr = Math.min(44, Math.max(26, Math.min(target.rect.width, target.rect.height) / 2 + 10));
      } else if (target.mode === "media") tr = 46;
      else if (target.mode === "drag") tr = 34;

      const dx = mouse.x - ring.x;
      const dy = mouse.y - ring.y;
      const speed = Math.hypot(dx, dy);
      velocity = approach(velocity, Math.min(speed, 120), 0.2);
      ring.x = approach(ring.x, tx, reduced ? 1 : 0.2);
      ring.y = approach(ring.y, ty, reduced ? 1 : 0.2);
      ring.r = approach(ring.r, tr, 0.16);
      ring.press = approach(ring.press, pressed ? 0.78 : 1, 0.25);
      modeBlend = {
        link: approach(modeBlend.link, target.mode === "link" ? 1 : 0, 0.18),
        media: approach(modeBlend.media, target.mode === "media" ? 1 : 0, 0.15),
        text: approach(modeBlend.text, target.mode === "text" ? 1 : 0, 0.25),
        drag: approach(modeBlend.drag, target.mode === "drag" ? 1 : 0, 0.18),
      };
      angle += dt * (reduced ? 0 : 0.7 + velocity * 0.03);

      ctx.globalAlpha = visible;
      ctx.lineCap = "round";

      // 1 · Light ribbon: a tapered curve through the recent positions
      if (!reduced) {
        trail.unshift({ x: mouse.x, y: mouse.y });
        if (trail.length > TRAIL) trail.pop();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = accent;
        for (let i = 2; i < trail.length; i++) {
          const a = trail[i - 2]!;
          const b = trail[i - 1]!;
          const c = trail[i]!;
          const k = 1 - i / trail.length;
          ctx.globalAlpha = visible * k * k * 0.5 * (1 - modeBlend.text);
          ctx.lineWidth = (1.2 + Math.min(velocity, 50) * 0.07) * k;
          ctx.beginPath();
          ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
          ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = visible;
      }

      const ringAlpha = 1 - modeBlend.text;
      const r = ring.r * ring.press;

      // 2 · Lens over artwork
      if (modeBlend.media > 0.01) {
        ctx.globalAlpha = visible * modeBlend.media;
        ctx.fillStyle = "rgba(9,9,10,0.35)";
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
        ctx.fill();
        circularText(ctx, `${target.label || "View"} • `.toUpperCase().repeat(4), ring.x, ring.y, r - 9, -angle * 0.8, accent);
        ctx.globalAlpha = visible;
      }

      // 3 · Spinning equalizer ring ("vinyl")
      if (ringAlpha > 0.01) {
        const beat = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 * 1.6);
        const barScale = 1 - modeBlend.link * 0.7 - modeBlend.media * 0.8;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < BARS; i++) {
          const a = angle + (i / BARS) * Math.PI * 2;
          const wobble = reduced ? 0 : Math.sin(now / 180 + i * 0.9) * 0.5 + 0.5;
          const len = (2 + beat * 2.5 * noise[i]! + Math.min(velocity, 80) * 0.22 * noise[i]! * wobble) * barScale;
          ctx.globalAlpha = visible * ringAlpha * (0.35 + 0.65 * noise[i]!);
          ctx.beginPath();
          ctx.moveTo(ring.x + Math.cos(a) * (r + 1), ring.y + Math.sin(a) * (r + 1));
          ctx.lineTo(ring.x + Math.cos(a) * (r + 1 + Math.max(0.5, len)), ring.y + Math.sin(a) * (r + 1 + Math.max(0.5, len)));
          ctx.stroke();
        }
        // groove circles
        ctx.globalAlpha = visible * ringAlpha * (0.35 + modeBlend.link * 0.55);
        ctx.lineWidth = 1 + modeBlend.link * 0.8;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
        ctx.stroke();
        if (modeBlend.link < 0.5 && modeBlend.media < 0.5) {
          ctx.globalAlpha = visible * ringAlpha * 0.18;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, r * 0.55, angle, angle + Math.PI * 1.2);
          ctx.stroke();
        }
        ctx.globalAlpha = visible;
      }

      // 4 · Label next to the ring (links, drag)
      const labelAlpha = Math.max(modeBlend.link, modeBlend.drag);
      if (labelAlpha > 0.05 && target.label && target.mode !== "media") {
        ctx.globalAlpha = visible * labelAlpha;
        ctx.font = '600 10px ui-monospace, "Geist Mono", monospace';
        ctx.fillStyle = accent;
        ctx.textBaseline = "middle";
        const text = target.label.toUpperCase().split("").join(" ");
        if (target.mode === "drag") {
          ctx.textAlign = "center";
          ctx.fillText(text, ring.x, ring.y);
        } else {
          ctx.textAlign = "left";
          ctx.fillText(text, ring.x + r + 12, ring.y);
        }
        ctx.globalAlpha = visible;
      }

      // 5 · Core dot / text caret
      if (modeBlend.text > 0.01) {
        ctx.globalAlpha = visible * modeBlend.text;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y - 11);
        ctx.lineTo(mouse.x, mouse.y + 11);
        ctx.stroke();
        ctx.globalAlpha = visible;
      }
      const dotR = 3.2 * (1 - modeBlend.text) * (1 - modeBlend.link * 0.4) * (pressed ? 1.6 : 1);
      if (dotR > 0.2) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 6 · Click shockwaves and sparks
      for (let i = waves.length - 1; i >= 0; i--) {
        const wv = waves[i]!;
        const t = (now - wv.t) / 650;
        if (t >= 1) {
          waves.splice(i, 1);
          continue;
        }
        const e = 1 - Math.pow(1 - t, 3);
        ctx.globalAlpha = visible * (1 - t);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.arc(wv.x, wv.y, 8 + e * 70, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.9;
        s.vy *= 0.9;
        s.life -= dt * 1.8;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = visible * s.life;
        ctx.strokeStyle = i % 3 === 0 ? "#ffffff" : accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 2.2, s.y - s.vy * 2.2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(accentTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("vinyl-cursor");
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[2147483647] h-screen w-screen" />;
}

function circularText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, radius: number, rotation: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.font = '600 8px ui-monospace, "Geist Mono", monospace';
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const step = (Math.PI * 2) / text.length;
  for (let i = 0; i < text.length; i++) {
    ctx.save();
    ctx.rotate(i * step);
    ctx.translate(0, -radius);
    ctx.fillText(text[i]!, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
