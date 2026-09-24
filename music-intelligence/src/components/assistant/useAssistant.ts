"use client";

import { useCallback, useRef, useState } from "react";
import type { AssistantEvent, ChatMessage, ValidatedSuggestion } from "@/ai/types";
import { timezone } from "@/lib/client/api";

export type UiMessage = ChatMessage & {
  id: string;
  suggestions?: ValidatedSuggestion[];
  discarded?: number;
  error?: string;
  streaming?: boolean;
};

export function useAssistant() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const patchLast = (fn: (m: UiMessage) => UiMessage) =>
    setMessages((list) => (list.length ? [...list.slice(0, -1), fn(list.at(-1)!)] : list));

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      const history: ChatMessage[] = [
        ...messages.filter((m) => !m.error && m.content).map(({ role, content }): ChatMessage => ({ role, content })),
        { role: "user", content },
      ];
      setMessages((list) => [
        ...list,
        { id: crypto.randomUUID(), role: "user", content },
        { id: crypto.randomUUID(), role: "assistant", content: "", streaming: true },
      ]);
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tz: timezone(), messages: history }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(body?.error?.message ?? "The assistant is unavailable right now.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const event = JSON.parse(line.slice(5)) as AssistantEvent;
            if (event.type === "text") patchLast((m) => ({ ...m, content: m.content + event.text }));
            else if (event.type === "suggestions") patchLast((m) => ({ ...m, suggestions: event.items, discarded: event.discarded }));
            else if (event.type === "error") patchLast((m) => ({ ...m, error: event.message }));
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") patchLast((m) => ({ ...m, error: (err as Error).message }));
      } finally {
        patchLast((m) => ({ ...m, streaming: false }));
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, busy, send, stop, reset };
}
