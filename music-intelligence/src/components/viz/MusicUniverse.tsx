"use client";

import { Html, Line, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ArtistStat, MusicProfile } from "@/analytics/types";
import { TIER_LABEL } from "@/components/viz/ArtistNetworkGraph";
import { pickImage, titleCase } from "@/lib/client/format";

const MAX_PLANETS = 18;

type Planet = {
  stat: ArtistStat;
  radius: number;
  size: number;
  speed: number;
  phase: number;
  tilt: number;
  image: string | null;
};

function readAccent(): THREE.Color {
  const raw = typeof window === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  try {
    return new THREE.Color(raw || "#dcc9a8");
  } catch {
    return new THREE.Color("#dcc9a8");
  }
}

/**
 * The user's music as a small solar system: they are the light at the centre,
 * top artists orbit closer the more they matter, and genres hang as constellations.
 */
export default function MusicUniverse({ profile, onSelectArtist }: { profile: MusicProfile; onSelectArtist: (id: string) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const planets = useMemo<Planet[]>(() => {
    const stats = Object.values(profile.artists)
      .filter((a) => a.ranks.short || a.ranks.medium || a.ranks.long)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PLANETS);
    const max = stats[0]?.score ?? 1;
    return stats.map((stat, i) => ({
      stat,
      radius: 2.4 + i * 0.42,
      size: 0.16 + (stat.score / max) * 0.34,
      speed: 0.22 / Math.sqrt(1 + i * 0.6),
      phase: i * 2.399,
      tilt: ((i % 5) - 2) * 0.07,
      image: pickImage(stat.artist.images, 160),
    }));
  }, [profile.artists]);

  const constellations = useMemo(
    () =>
      profile.genres.nodes.slice(0, 9).map((g, i) => {
        const theta = (i / 9) * Math.PI * 2 + 0.4;
        const phi = 0.9 + (i % 3) * 0.35;
        const r = 17;
        const center = new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.8, r * Math.sin(phi) * Math.sin(theta));
        const stars = Array.from({ length: 4 + Math.round(g.share * 30) }, (_, k) => {
          const a = k * 2.1 + i;
          return center.clone().add(new THREE.Vector3(Math.cos(a) * (0.6 + (k % 3) * 0.5), Math.sin(a * 1.3) * 0.9, Math.sin(a) * (0.6 + (k % 2) * 0.6)));
        });
        return { id: g.id, name: titleCase(g.name), share: g.share, center, stars };
      }),
    [profile.genres.nodes],
  );

  return (
    <div ref={wrap} className="relative h-full w-full" aria-label="Your music universe: top artists orbiting you, genres as constellations" role="img">
      <Canvas flat frameloop={visible ? "always" : "never"} dpr={[1, 1.75]} camera={{ position: [0, 14, 42], fov: 45, near: 0.1, far: 200 }} gl={{ antialias: true, alpha: true }}>
        <IntroCamera reduced={reduced} />
        <ambientLight intensity={0.3} />
        <hemisphereLight args={["#ffffff", "#20202a", 0.35]} />
        <pointLight position={[0, 0, 0]} intensity={45} distance={40} decay={1.5} color="#fff4e0" />
        <Stars radius={60} depth={40} count={2200} factor={3} saturation={0} fade speed={reduced ? 0 : 0.6} />
        <Core name={profile.user.displayName} />
        {planets.map((p) => (
          <PlanetMesh key={p.stat.artist.id} planet={p} reduced={reduced} onSelect={onSelectArtist} />
        ))}
        {constellations.map((c) => (
          <group key={c.id}>
            <Line points={c.stars} color="#ffffff" transparent opacity={0.16} lineWidth={0.6} />
            {c.stars.map((s, k) => (
              <mesh key={k} position={s}>
                <sphereGeometry args={[0.05 + (k === 0 ? 0.05 : 0), 8, 8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
              </mesh>
            ))}
            <Html position={c.center} center distanceFactor={22} zIndexRange={[5, 0]}>
              <span className="pointer-events-none font-mono text-[11px] tracking-[0.16em] whitespace-nowrap text-white/55 uppercase">{c.name}</span>
            </Html>
          </group>
        ))}
        <OrbitControls enablePan={false} enableZoom minDistance={7} maxDistance={34} autoRotate={!reduced} autoRotateSpeed={0.25} maxPolarAngle={Math.PI * 0.62} minPolarAngle={Math.PI * 0.18} />
      </Canvas>
    </div>
  );
}

function IntroCamera({ reduced }: { reduced: boolean }) {
  const { camera } = useThree();
  const t = useRef(reduced ? 1 : 0);
  const from = useMemo(() => new THREE.Vector3(0, 14, 42), []);
  const to = useMemo(() => new THREE.Vector3(0, 4.2, 13.5), []);
  useFrame((_, dt) => {
    if (t.current >= 1) return;
    t.current = Math.min(1, t.current + dt / 2.8);
    const e = 1 - Math.pow(1 - t.current, 4);
    camera.position.lerpVectors(from, to, e);
    camera.lookAt(0, 0, 0);
  });
  useEffect(() => {
    if (reduced) camera.position.copy(to);
  }, [reduced, camera, to]);
  return null;
}

/** Soft radial falloff drawn once to a canvas; used for additive glow sprites. */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(0.6, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
}

function Core({ name }: { name: string }) {
  const accent = useMemo(readAccent, []);
  const glowTexture = useGlowTexture();
  const glow = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.scale.setScalar(5.2 + Math.sin(clock.elapsedTime * 1.2) * 0.35);
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.62, 48, 48]} />
        <meshBasicMaterial color={accent.clone().lerp(new THREE.Color("#ffffff"), 0.35)} />
      </mesh>
      <sprite ref={glow} scale={5.2}>
        <spriteMaterial map={glowTexture} color={accent} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.9} />
      </sprite>
      <Sparkles count={60} scale={4} size={2.2} speed={0.3} color={accent} opacity={0.7} />
      <Html position={[0, -1.35, 0]} center distanceFactor={12}>
        <span className="pointer-events-none font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-white/70 uppercase">{name}</span>
      </Html>
    </group>
  );
}

function useArtworkTexture(url: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        if (alive) setTexture(t);
      },
      undefined,
      (err) => console.warn("Artwork texture unavailable; using plain planet", err), // e.g. no CORS
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return texture;
}

function PlanetMesh({ planet, reduced, onSelect }: { planet: Planet; reduced: boolean; onSelect: (id: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const texture = useArtworkTexture(planet.image);
  const orbit = useMemo(
    () =>
      Array.from({ length: 97 }, (_, i) => {
        const a = (i / 96) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * planet.radius, Math.sin(a) * planet.radius * planet.tilt, Math.sin(a) * planet.radius);
      }),
    [planet.radius, planet.tilt],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const a = planet.phase + (reduced ? 0 : clock.elapsedTime * planet.speed * (hover ? 0.15 : 1));
    ref.current.position.set(Math.cos(a) * planet.radius, Math.sin(a) * planet.radius * planet.tilt, Math.sin(a) * planet.radius);
    ref.current.rotation.y += 0.004;
    const target = hover ? 1.35 : 1;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.15);
  });

  const s = planet.stat;
  const rank = s.ranks.short ?? s.ranks.medium ?? s.ranks.long;
  return (
    <>
      <Line points={orbit} color="#ffffff" transparent opacity={hover ? 0.28 : 0.06} lineWidth={0.5} />
      <group ref={ref}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(s.artist.id);
          }}
        >
          <sphereGeometry args={[planet.size, 40, 40]} />
          {texture ? (
            // Keyed so a new material (and shader with USE_MAP) is created once the artwork arrives.
            // The artwork also feeds the emissive channel so it stays readable on the night side.
            <meshStandardMaterial key={texture.uuid} map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.3} roughness={0.75} metalness={0.05} />
          ) : (
            <meshStandardMaterial key="plain" color="#8a8680" emissive="#3a3834" roughness={0.8} />
          )}
        </mesh>
        {hover && (
          <Html position={[0, planet.size + 0.35, 0]} center zIndexRange={[20, 10]}>
            <div className="pointer-events-none w-52 -translate-y-1/2 rounded-md border border-white/15 bg-black/75 p-3 text-left backdrop-blur-xl">
              <p className="text-[15px] leading-tight font-semibold text-white">{s.artist.name}</p>
              <p className="mt-1 font-mono text-[9px] tracking-[0.16em] text-[var(--accent)] uppercase">{TIER_LABEL[s.tier]}</p>
              <p className="mt-2 font-mono text-[10px] text-white/60">
                {rank ? `#${rank} · ` : ""}
                {s.topTrackCount} top tracks · {s.recentPlays} recent plays
              </p>
              <p className="mt-1 text-[10px] text-white/45">Click for details</p>
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
