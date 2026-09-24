"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { AmbientBackground } from "@/components/shell/Ambient";
import { LandingVisual } from "@/components/viz/LandingVisual";
import { ParticleField } from "@/components/viz/ParticleField";

export function LandingBackdrop() {
  return (
    <>
      <AmbientBackground intensity={0.8} />
      <motion.div
        className="pointer-events-none absolute top-1/2 right-[-20vmin] -translate-y-[58%] sm:right-[-6vmin]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <LandingVisual className="size-[min(110vmin,980px)]" />
      </motion.div>
      <ParticleField className="absolute inset-0 size-full" count={120} />
    </>
  );
}

export function ConnectButton() {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  return (
    <motion.a
      ref={ref}
      href="/api/auth/login"
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - r.left - r.width / 2) * 0.2);
        y.set((e.clientY - r.top - r.height / 2) * 0.3);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="group inline-flex items-center gap-3 rounded-full bg-fg py-3.5 pr-6 pl-4 text-[15px] font-medium text-ink shadow-[0_20px_60px_-20px_var(--accent)] transition-shadow hover:shadow-[0_24px_80px_-16px_var(--accent)]"
    >
      <SpotifyIcon className="size-6 text-[#1db954]" />
      Connect Spotify
    </motion.a>
  );
}
