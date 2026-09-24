"use client";

import { Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MusicProfile } from "@/analytics/types";
import type { Track } from "@/domain/types";
import { TIER_LABEL } from "@/components/viz/ArtistNetworkGraph";
import { artistNames, pickImage, titleCase } from "@/lib/client/format";

const ARM_TWIST = 0.42;
const GALAXY_RADIUS = 14;

type Card =
  | { kind: "artist"; id: string; title: string; subtitle: string; image: string | null; size: number; position: THREE.Vector3; artistId: string }
  | { kind: "album"; id: string; title: string; subtitle: string; image: string | null; size: number; position: THREE.Vector3; url: string | null };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

function accentColor(): THREE.Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  try {
    return new THREE.Color(raw || "#dcc9a8");
  } catch {
    return new THREE.Color("#dcc9a8");
  }
}

/** Position on a spiral arm: `t` 0 = core, 1 = rim. */
function spiralPoint(arm: number, arms: number, t: number, jitter: number, seed: number): THREE.Vector3 {
  const r = 1.6 + t * (GALAXY_RADIUS - 2.5);
  const angle = (arm / arms) * Math.PI * 2 + r * ARM_TWIST + (seed - 0.5) * jitter;
  return new THREE.Vector3(Math.cos(angle) * r, (hash(`${seed}y`) - 0.5) * 0.9, Math.sin(angle) * r);
}

/**
 * Your listening as a spiral galaxy: every arm is one of your top genres, artist
 * portraits and album covers float along the arms — the more they matter, the
 * closer to the bright core. Scrolling flies the camera into the galaxy.
 */
export default function CoverGalaxy({
  profile,
  progress,
  onSelectArtist,
}: {
  profile: MusicProfile;
  progress: MotionValue<number>;
  onSelectArtist: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const drag = useRef({ active: false, lastX: 0, velocity: 0, offset: 0 });

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { arms, cards } = useMemo(() => {
    const genreArms = profile.genres.nodes.slice(0, 5).map((g) => g.name);
    const armCount = Math.max(genreArms.length, 4);
    const armOf = (genres: string[], key: string) => {
      const idx = genres.map((g) => genreArms.indexOf(g)).find((i) => i >= 0);
      return idx ?? Math.floor(hash(key) * armCount);
    };

    const artists = Object.values(profile.artists)
      .filter((a) => a.ranks.short || a.ranks.medium || a.ranks.long)
      .sort((a, b) => b.score - a.score)
      .slice(0, 36);
    const maxScore = artists[0]?.score ?? 1;
    const artistArm = new Map<string, number>();
    const list: Card[] = artists.map((a, i) => {
      const arm = armOf(a.artist.genres, a.artist.id);
      artistArm.set(a.artist.id, arm);
      const t = Math.pow(i / Math.max(artists.length - 1, 1), 0.8);
      const rank = a.ranks.short ?? a.ranks.medium ?? a.ranks.long;
      return {
        kind: "artist",
        id: `a:${a.artist.id}`,
        title: a.artist.name,
        subtitle: `${TIER_LABEL[a.tier]}${rank ? ` · #${rank}` : ""}`,
        image: pickImage(a.artist.images, 200),
        size: 0.75 + (a.score / maxScore) * 0.75,
        position: spiralPoint(arm, armCount, t, 0.35, hash(a.artist.id)),
        artistId: a.artist.id,
      };
    });

    const seenAlbums = new Set<string>();
    const albums: Track[] = [];
    for (const r of ["short", "medium", "long"] as const)
      for (const id of profile.rankings.tracks[r]) {
        const t = profile.tracks[id]?.track;
        if (t && !seenAlbums.has(t.album.id)) {
          seenAlbums.add(t.album.id);
          albums.push(t);
        }
      }
    albums.slice(0, 44).forEach((t, i, all) => {
      const primary = t.artists[0]?.id ?? t.id;
      const arm = artistArm.get(primary) ?? armOf([], primary);
      const tt = Math.min(1, Math.pow(i / Math.max(all.length - 1, 1), 0.85) * 0.95 + hash(t.id) * 0.08);
      list.push({
        kind: "album",
        id: `t:${t.album.id}`,
        title: t.album.name || t.name,
        subtitle: artistNames(t.artists),
        image: pickImage(t.album.images, 200),
        size: 0.62,
        position: spiralPoint(arm, armCount, tt, 0.6, hash(t.album.id)),
        url: t.url,
      });
    });
    return { arms: genreArms.length ? genreArms : [], cards: list };
  }, [profile]);

  return (
    <div
      ref={wrap}
      className="size-full cursor-grab touch-pan-y active:cursor-grabbing"
      role="img"
      aria-label="Your music as a galaxy of artist portraits and album covers"
      onPointerDown={(e) => {
        drag.current.active = true;
        drag.current.lastX = e.clientX;
      }}
      onPointerMove={(e) => {
        if (!drag.current.active) return;
        const dx = e.clientX - drag.current.lastX;
        drag.current.lastX = e.clientX;
        drag.current.velocity = dx * 0.0045;
      }}
      onPointerUp={() => (drag.current.active = false)}
      onPointerLeave={() => (drag.current.active = false)}
    >
      <Canvas flat frameloop={visible ? "always" : "never"} dpr={[1, 1.75]} camera={{ position: [0, 40, 38], fov: 50, near: 0.1, far: 300 }} gl={{ antialias: true, alpha: true }}>
        <CameraRig progress={progress} reduced={reduced} />
        <Galaxy arms={Math.max(arms.length, 4)} drag={drag} reduced={reduced}>
          {cards.map((c) => (
            <CoverCard key={c.id} card={c} onSelectArtist={onSelectArtist} />
          ))}
          {arms.map((name, i) => {
            const p = spiralPoint(i, Math.max(arms.length, 4), 1.02, 0, 0.5);
            return (
              <Html key={name} position={[p.x * 1.08, 0.6, p.z * 1.08]} center distanceFactor={26} zIndexRange={[5, 0]}>
                <span className="pointer-events-none font-mono text-[12px] tracking-[0.22em] whitespace-nowrap text-white/60 uppercase">{titleCase(name)}</span>
              </Html>
            );
          })}
        </Galaxy>
      </Canvas>
    </div>
  );
}

/** Scroll-driven flight: from a high overview down into the spiral arms. */
function CameraRig({ progress, reduced }: { progress: MotionValue<number>; reduced: boolean }) {
  const { camera } = useThree();
  const intro = useRef(reduced ? 1 : 0);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 21, 17),
        new THREE.Vector3(3, 11, 15),
        new THREE.Vector3(9, 4.5, 9),
        new THREE.Vector3(7.5, 1.6, 2.5),
      ]),
    [],
  );
  const look = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const start = useMemo(() => new THREE.Vector3(0, 46, 44), []);

  useFrame((_, dt) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1);
    curve.getPointAt(p, target);
    if (intro.current < 1) {
      intro.current = Math.min(1, intro.current + dt / 2.6);
      const e = 1 - Math.pow(1 - intro.current, 4);
      target.lerpVectors(start, target, e);
      camera.position.copy(target);
    } else {
      camera.position.lerp(target, reduced ? 1 : 0.075);
    }
    look.lerp(new THREE.Vector3(-p * 2.5, 0, -p * 1.5), 0.08);
    camera.lookAt(look);
  });
  return null;
}

function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
}

function Galaxy({ arms, drag, reduced, children }: { arms: number; drag: React.RefObject<{ active: boolean; velocity: number; offset: number; lastX: number }>; reduced: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const glow = useGlowTexture();
  const accent = useMemo(accentColor, []);

  const { positions, colors } = useMemo(() => {
    const count = 11000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const core = accent.clone().lerp(new THREE.Color("#fff6e8"), 0.55);
    const rim = new THREE.Color("#5b73ff").lerp(accent, 0.25);
    const tmp = new THREE.Color();
    let seed = 1;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    for (let i = 0; i < count; i++) {
      const inCore = i < 2200;
      const r = inCore ? Math.pow(rnd(), 2) * 3 : 0.8 + Math.pow(rnd(), 0.75) * GALAXY_RADIUS;
      const arm = Math.floor(rnd() * arms);
      const spread = inCore ? Math.PI * 2 * rnd() : gauss() * (0.28 + r * 0.025);
      const angle = (inCore ? 0 : (arm / arms) * Math.PI * 2 + r * ARM_TWIST) + spread;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = gauss() * (inCore ? 0.45 : 0.22) * (1.1 - r / (GALAXY_RADIUS + 2));
      pos[i * 3 + 2] = Math.sin(angle) * r;
      tmp.copy(core).lerp(rim, Math.min(1, r / GALAXY_RADIUS));
      const bright = 0.55 + rnd() * 0.45;
      col[i * 3] = tmp.r * bright;
      col[i * 3 + 1] = tmp.g * bright;
      col[i * 3 + 2] = tmp.b * bright;
    }
    return { positions: pos, colors: col };
  }, [arms, accent]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const d = drag.current!;
    d.offset += d.velocity;
    d.velocity *= 0.92;
    group.current.rotation.y = d.offset + (reduced ? 0 : clock.elapsedTime * 0.018);
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.16} sizeAttenuation vertexColors map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <sprite scale={9}>
        <spriteMaterial map={glow} color={accent.clone().lerp(new THREE.Color("#ffffff"), 0.4)} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.85} />
      </sprite>
      {children}
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
        t.anisotropy = 4;
        if (alive) setTexture(t);
      },
      undefined,
      () => undefined, // Artwork without CORS: the card keeps its placeholder face.
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return texture;
}

function CoverCard({ card, onSelectArtist }: { card: Card; onSelectArtist: (id: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const texture = useArtworkTexture(card.image);
  const { camera } = useThree();
  const scale = useMemo(() => new THREE.Vector3(), []);
  const bob = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.quaternion.copy(camera.quaternion); // always face the viewer
    g.position.set(card.position.x, card.position.y + Math.sin(clock.elapsedTime * 0.8 + bob) * 0.12, card.position.z);
    const s = hover ? 1.9 : 1;
    scale.set(s, s, s);
    g.scale.lerp(scale, 0.18);
  });

  const w = card.size;
  return (
    <group ref={ref} renderOrder={hover ? 10 : 1}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w * 1.08, w * 1.08]} />
        <meshBasicMaterial color={hover ? "#ffffff" : "#ffffff"} transparent opacity={hover ? 0.9 : card.kind === "artist" ? 0.22 : 0.1} depthWrite={false} />
      </mesh>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (card.kind === "artist") onSelectArtist(card.artistId);
          else if (card.url) window.open(card.url, "_blank", "noopener,noreferrer");
        }}
      >
        <planeGeometry args={[w, w]} />
        {texture ? (
          // Keyed so the shader is rebuilt with the texture once it has loaded.
          <meshBasicMaterial key={texture.uuid} map={texture} transparent opacity={hover ? 1 : 0.92} />
        ) : (
          <meshBasicMaterial key="placeholder" color="#26262b" transparent opacity={0.9} />
        )}
      </mesh>
      {hover && (
        <Html position={[0, -w * 0.5 - 0.12, 0]} center zIndexRange={[30, 20]}>
          <div className="pointer-events-none mt-10 w-56 rounded-md border border-white/15 bg-black/75 p-3 text-left backdrop-blur-xl">
            <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--accent)] uppercase">{card.kind === "artist" ? "Artist" : "Album"}</p>
            <p className="mt-1 text-[15px] leading-tight font-semibold text-white">{card.title}</p>
            <p className="mt-1 truncate text-[11px] text-white/60">{card.subtitle}</p>
            <p className="mt-2 text-[10px] text-white/45">{card.kind === "artist" ? "Click for details" : "Click to open in Spotify"}</p>
          </div>
        </Html>
      )}
    </group>
  );
}
