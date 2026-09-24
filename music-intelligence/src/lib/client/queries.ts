"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AssistantStatus } from "@/ai/types";
import type { MusicProfile } from "@/analytics/types";
import type { Playback } from "@/domain/types";
import type { DiscoveryResult } from "@/recommendations/types";
import { apiGet, ClientApiError, timezone } from "./api";

const retry = (count: number, err: unknown) =>
  !(err instanceof ClientApiError && ["session_expired", "forbidden", "config"].includes(err.code)) && count < 2;

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => apiGet<MusicProfile>(`/api/music/profile?tz=${encodeURIComponent(timezone())}`, signal),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry,
  });
}

/** Most views need the profile; this narrows it once loaded (the shell guarantees it). */
export function useLoadedProfile(): MusicProfile {
  const { data } = useProfile();
  if (!data) throw new Error("useLoadedProfile used before the profile loaded");
  return data;
}

function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible;
}

export function useNowPlaying() {
  const visible = usePageVisible();
  return useQuery({
    queryKey: ["now-playing"],
    queryFn: ({ signal }) => apiGet<{ playback: Playback | null; unavailable?: boolean }>("/api/music/now-playing", signal),
    refetchInterval: visible ? 15_000 : false,
    staleTime: 10_000,
    retry: false,
  });
}

export function useDiscovery(enabled = true) {
  return useQuery({
    queryKey: ["discovery"],
    queryFn: ({ signal }) => apiGet<DiscoveryResult>(`/api/music/discovery?tz=${encodeURIComponent(timezone())}`, signal),
    staleTime: 15 * 60_000,
    enabled,
    retry,
  });
}

export function useAssistantStatus() {
  return useQuery({
    queryKey: ["assistant-status"],
    queryFn: ({ signal }) => apiGet<AssistantStatus>("/api/ai/status", signal),
    staleTime: Infinity,
  });
}
