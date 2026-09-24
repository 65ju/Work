"use client";

import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ArtistNetwork, ArtistTier, NetworkNode } from "@/analytics/types";
import { useZoom } from "./useZoom";

const W = 1000;
const H = 700;

export const TIER_LABEL: Record<ArtistTier, string> = {
  core: "Core artist",
  rising: "Rising",
  longtime: "Long-time favourite",
  steady: "In rotation",
  occasional: "Occasional",
};

type SimNode = SimulationNodeDatum & NetworkNode & { r: number };

export default function ArtistNetworkGraph({
  network,
  selectedId,
  onSelect,
}: {
  network: ArtistNetwork;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const { svgRef, transform, reset, zoomBy } = useZoom([0.6, 3.5]);

  const layout = useMemo(() => {
    const nodes: SimNode[] = network.nodes.map((n, i) => ({
      ...n,
      r: 14 + n.weight * 30,
      x: W / 2 + Math.cos(i) * 200,
      y: H / 2 + Math.sin(i) * 200,
    }));
    const links = network.links.map((l) => ({ ...l }));
    const sim = forceSimulation(nodes)
      .force("charge", forceManyBody<SimNode>().strength(-260))
      .force(
        "link",
        forceLink<SimNode, (typeof links)[number] & { source: string | SimNode; target: string | SimNode }>(links)
          .id((d) => d.id)
          .distance((l) => 170 - Math.min(l.weight, 2) * 45),
      )
      .force("collide", forceCollide<SimNode>().radius((d) => d.r + 10))
      .force("x", forceX(W / 2).strength(0.05))
      .force("y", forceY(H / 2).strength(0.07))
      .stop();
    for (let i = 0; i < 300; i++) sim.tick();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return { nodes, byId, links: network.links.map((l) => ({ ...l, a: byId.get(l.source)!, b: byId.get(l.target)! })).filter((l) => l.a && l.b) };
  }, [network]);

  const focus = selectedId ?? hover?.id ?? null;
  const neighbors = useMemo(() => {
    const s = new Set<string>();
    if (!focus) return s;
    for (const l of network.links) {
      if (l.source === focus) s.add(l.target);
      if (l.target === focus) s.add(l.source);
    }
    return s;
  }, [focus, network.links]);

  const hovered = hover ? layout.byId.get(hover.id) : null;

  return (
    <div ref={wrap} className="relative" onClick={() => onSelect(null)}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-[min(74vh,700px)] w-full cursor-grab touch-none active:cursor-grabbing" role="img" aria-label="Artist network">
        <defs>
          {layout.nodes.map((n) => (
            <clipPath key={n.id} id={`clip-${n.id}`}>
              <circle cx={n.x} cy={n.y} r={n.r} />
            </clipPath>
          ))}
        </defs>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {layout.links.map((l, i) => {
            const on = focus && (l.source === focus || l.target === focus);
            return (
              <line
                key={i}
                x1={l.a.x}
                y1={l.a.y}
                x2={l.b.x}
                y2={l.b.y}
                stroke={on ? "var(--accent)" : "white"}
                strokeOpacity={on ? 0.75 : focus ? 0.03 : 0.06 + Math.min(l.weight, 2) * 0.06}
                strokeWidth={on ? 1.5 : 0.5 + Math.min(l.weight, 2) * 0.5}
                style={{ transition: "stroke-opacity .35s" }}
              />
            );
          })}
          {layout.nodes.map((n, i) => {
            const active = focus === n.id;
            const dim = focus && !active && !neighbors.has(n.id);
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: dim ? 0.15 : 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.025, type: "spring", stiffness: 200, damping: 20 }}
                style={{ originX: `${n.x}px`, originY: `${n.y}px` }}
                className="cursor-pointer"
                onPointerEnter={(e) => {
                  const r = wrap.current?.getBoundingClientRect();
                  if (r) setHover({ id: n.id, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onPointerLeave={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(selectedId === n.id ? null : n.id);
                }}
                role="button"
                tabIndex={0}
                aria-label={`${n.name}, ${TIER_LABEL[n.tier]}`}
                onKeyDown={(e) => e.key === "Enter" && onSelect(n.id)}
              >
                <circle cx={n.x} cy={n.y} r={n.r + 3} fill="none" stroke={active ? "var(--accent)" : n.tier === "core" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.12)"} strokeWidth={active ? 2 : 1} />
                {n.image ? (
                  <image href={n.image.url} x={n.x! - n.r} y={n.y! - n.r} width={n.r * 2} height={n.r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${n.id})`} />
                ) : (
                  <circle cx={n.x} cy={n.y} r={n.r} fill="var(--color-ink-3)" />
                )}
                {(n.weight > 0.45 || active || neighbors.has(n.id)) && (
                  <text x={n.x} y={n.y! + n.r + 15} textAnchor="middle" className="pointer-events-none fill-fg-2 text-[11px]" style={{ fontSize: 11 / Math.sqrt(transform.k) }}>
                    {n.name}
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>
      </svg>

      <AnimatePresence>
        {hovered && hover && !selectedId && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute z-10 w-56 rounded-md border border-line-strong bg-ink-1/95 p-4 backdrop-blur-xl"
            style={{ left: Math.min(hover.x + 16, (wrap.current?.clientWidth ?? 800) - 240), top: hover.y + 16 }}
          >
            <p className="text-lg leading-tight font-semibold tracking-tight">{hovered.name}</p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-[var(--accent)] uppercase">{TIER_LABEL[hovered.tier]}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>
                <dt className="text-faint">Top tracks</dt>
                <dd className="text-fg">{hovered.topTrackCount}</dd>
              </div>
              <div>
                <dt className="text-faint">Last 50 plays</dt>
                <dd className="text-fg">{hovered.recentPlays}</dd>
              </div>
            </dl>
            {hovered.genres.length > 0 && <p className="mt-3 truncate text-xs text-muted">{hovered.genres.slice(0, 3).join(" · ")}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute right-3 bottom-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
        {[
          { icon: Plus, label: "Zoom in", fn: () => zoomBy(1.4) },
          { icon: Minus, label: "Zoom out", fn: () => zoomBy(1 / 1.4) },
          { icon: RotateCcw, label: "Reset view", fn: reset },
        ].map(({ icon: Icon, label, fn }) => (
          <button key={label} onClick={fn} aria-label={label} className="grid size-8 place-items-center rounded-md border border-line bg-ink-1/80 text-muted backdrop-blur transition hover:text-fg">
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
