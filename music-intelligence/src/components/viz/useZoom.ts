"use client";

import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { useCallback, useEffect, useRef, useState } from "react";

/** d3-zoom bound to an SVG; returns the current transform for a wrapping <g>. */
export function useZoom(extent: [number, number] = [0.5, 4]) {
  const svgRef = useRef<SVGSVGElement>(null);
  const behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent(extent)
      .on("zoom", (e) => setTransform({ x: e.transform.x, y: e.transform.y, k: e.transform.k }));
    behavior.current = z;
    select(svg).call(z).on("dblclick.zoom", null);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, [extent]);

  const reset = useCallback(() => {
    if (svgRef.current && behavior.current) select(svgRef.current).call(behavior.current.transform, zoomIdentity);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    if (svgRef.current && behavior.current) select(svgRef.current).call(behavior.current.scaleBy, factor);
  }, []);

  return { svgRef, transform, reset, zoomBy };
}
