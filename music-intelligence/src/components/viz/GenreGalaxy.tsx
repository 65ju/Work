"use client";

import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import { motion } from "motion/react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type { GenreGraph, GenreNode } from "@/analytics/types";
import { titleCase } from "@/lib/client/format";
import { useZoom } from "./useZoom";

const W = 1000;
const H = 680;

type SimNode = SimulationNodeDatum & { id: string; r: number; node: GenreNode };

export default function GenreGalaxy({
  graph,
  selectedId,
  onSelect,
  visible,
}: {
  graph: GenreGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  visible: Set<string>;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const { svgRef, transform, reset, zoomBy } = useZoom();

  const layout = useMemo(() => {
    const maxShare = Math.max(...graph.nodes.map((n) => n.share), 0.01);
    const nodes: SimNode[] = graph.nodes.map((n, i) => ({
      id: n.id,
      r: 8 + Math.sqrt(n.share / maxShare) * 46,
      node: n,
      x: W / 2 + Math.cos(i * 2.4) * (40 + i * 7),
      y: H / 2 + Math.sin(i * 2.4) * (40 + i * 7),
    }));
    const links = graph.links.map((l) => ({ ...l }));
    const sim = forceSimulation(nodes)
      .force("charge", forceManyBody<SimNode>().strength((d) => -40 - d.r * 4))
      .force(
        "link",
        forceLink<SimNode, (typeof links)[number] & { source: string | SimNode; target: string | SimNode }>(links)
          .id((d) => d.id)
          .distance((l) => 170 - l.strength * 100)
          .strength((l) => (l.reason === "name-similarity" ? 0.08 : 0.25 + l.strength * 0.6)),
      )
      .force("collide", forceCollide<SimNode>().radius((d) => d.r + 22))
      .force("x", forceX(W / 2).strength(0.03))
      .force("y", forceY(H / 2).strength(0.05))
      .stop();
    for (let i = 0; i < 320; i++) sim.tick();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return { nodes, links: graph.links.map((l) => ({ ...l, a: byId.get(l.source)!, b: byId.get(l.target)! })).filter((l) => l.a && l.b) };
  }, [graph]);

  const focus = hover ?? selectedId;
  const neighbors = useMemo(() => {
    const s = new Set<string>();
    if (!focus) return s;
    for (const l of graph.links) {
      if (l.source === focus) s.add(l.target);
      if (l.target === focus) s.add(l.source);
    }
    return s;
  }, [focus, graph.links]);
  const labelled = useMemo(() => new Set(graph.nodes.slice(0, 16).map((n) => n.id)), [graph.nodes]);

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-[min(72vh,680px)] w-full cursor-grab touch-none active:cursor-grabbing" role="img" aria-label="Genre galaxy">
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {layout.links.map((l, i) => {
            const on = focus && (l.source === focus || l.target === focus);
            const shown = visible.has(l.source) && visible.has(l.target);
            return (
              <line
                key={i}
                x1={l.a.x}
                y1={l.a.y}
                x2={l.b.x}
                y2={l.b.y}
                stroke={on ? "var(--accent)" : "rgba(255,255,255,1)"}
                strokeOpacity={!shown ? 0 : on ? 0.7 : focus ? 0.03 : 0.07 + l.strength * 0.12}
                strokeWidth={on ? 1.2 : 0.8}
                strokeDasharray={l.reason === "name-similarity" ? "2 4" : undefined}
                style={{ transition: "stroke-opacity .4s" }}
              />
            );
          })}
          {layout.nodes.map((n, i) => {
            const shown = visible.has(n.id);
            const active = focus === n.id;
            const dim = focus && !active && !neighbors.has(n.id);
            const color = n.node.trend === "rising" ? "var(--accent)" : n.node.trend === "falling" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)";
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: !shown ? 0.04 : dim ? 0.18 : 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.02, type: "spring", stiffness: 180, damping: 18 }}
                style={{ originX: `${n.x}px`, originY: `${n.y}px` }}
                className="cursor-pointer"
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(selectedId === n.id ? null : n.id);
                }}
                role="button"
                tabIndex={shown ? 0 : -1}
                aria-label={`${n.node.name}, ${Math.round(n.node.share * 100)}% of your genre attention`}
                onKeyDown={(e) => e.key === "Enter" && onSelect(n.id)}
              >
                <circle cx={n.x} cy={n.y} r={n.r + 10} fill={color} opacity={active ? 0.16 : 0.05} />
                <circle cx={n.x} cy={n.y} r={n.r} fill={color} fillOpacity={active ? 0.9 : 0.16} stroke={color} strokeOpacity={0.9} strokeWidth={active ? 1.5 : 0.8} />
                {(labelled.has(n.id) || active || neighbors.has(n.id)) && (
                  <text
                    x={n.x}
                    y={(n.y ?? 0) + n.r + 16}
                    textAnchor="middle"
                    className={`pointer-events-none select-none ${active ? "fill-fg" : "fill-fg-2"}`}
                    style={{ fontSize: Math.max(10, Math.min(15, 9 + n.r / 5)) / Math.sqrt(transform.k), letterSpacing: "-0.01em" }}
                  >
                    {titleCase(n.node.name)}
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>
      </svg>
      <div className="absolute right-3 bottom-3 flex gap-1">
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
