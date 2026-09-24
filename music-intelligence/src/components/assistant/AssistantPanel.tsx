"use client";

import { motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QUICK_ACTIONS } from "@/ai/types";
import { OpenInSpotify } from "@/components/brand/SpotifyIcon";
import { ProvenanceTag } from "@/components/ui/ProvenanceTag";
import { useAssistantStatus, useProfile } from "@/lib/client/queries";
import { useAssistant, type UiMessage } from "./useAssistant";

export function AssistantPanel({ variant = "panel" }: { variant?: "panel" | "page" }) {
  const status = useAssistantStatus();
  const enabled = status.data?.enabled ?? false;
  const { messages, busy, send, stop } = useAssistant();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: profile } = useProfile();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = (text: string) => {
    if (!enabled) return;
    send(text);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className={`min-h-0 flex-1 overflow-y-auto ${variant === "panel" ? "px-6" : ""}`}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end pb-6">
            <p className="eyebrow">Ask your music</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
              {enabled ? (
                <>
                  What do you want to <span className="font-serif font-normal italic">hear</span>?
                </>
              ) : (
                <>
                  Your AI music assistant is <span className="font-serif font-normal italic">coming soon</span>.
                </>
              )}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-2">
              {enabled
                ? `Answers are grounded in ${profile ? `${profile.user.displayName}'s` : "your"} real listening profile. Every suggested track is checked against the Spotify catalog before it is shown.`
                : "The assistant will answer from your structured music profile, never from invented listening history, and every track it suggests will be verified against Spotify. It turns on once an AI provider is configured on the server."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q}
                  disabled={!enabled}
                  onClick={() => submit(q)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-fg-2 transition enabled:hover:border-line-strong enabled:hover:text-fg disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 py-6">
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className={`border-t border-line pt-4 pb-5 ${variant === "panel" ? "px-6" : ""}`}
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-ink-2/80 p-2 focus-within:border-line-strong">
          <label htmlFor="assistant-input" className="sr-only">
            Message
          </label>
          <textarea
            id="assistant-input"
            rows={1}
            value={draft}
            disabled={!enabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            placeholder={enabled ? "Ask about your music…" : "Assistant not enabled yet"}
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] placeholder:text-faint focus:outline-none disabled:cursor-not-allowed"
          />
          {busy ? (
            <button type="button" onClick={stop} className="grid size-9 place-items-center rounded-lg bg-white/10 text-fg" aria-label="Stop">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="submit" disabled={!enabled || !draft.trim()} className="grid size-9 place-items-center rounded-lg bg-fg text-ink transition disabled:opacity-30" aria-label="Send">
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <ProvenanceTag kind="ai" label="AI answers · tracks verified with Spotify search" />
          {status.data?.model && <span className="font-mono text-[10px] text-faint">{status.data.model}</span>}
        </div>
      </form>
    </div>
  );
}

function Message({ message }: { message: UiMessage }) {
  if (message.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-white/[0.07] px-4 py-2.5 text-[15px]">
        {message.content}
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
      <ProvenanceTag kind="ai" />
      <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-fg">
        {message.content}
        {message.streaming && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[var(--accent)]" />}
      </div>
      {message.suggestions && message.suggestions.length > 0 && (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {message.suggestions.map((s, i) => (
            <motion.li
              key={s.track.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 py-3"
            >
              {s.track.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.track.imageUrl} alt="" width={40} height={40} className="size-10 rounded-[3px] bg-ink-2" />
              ) : (
                <div className="size-10 rounded-[3px] bg-ink-2" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.track.name}</p>
                <p className="truncate text-xs text-muted">
                  {s.track.artists.join(", ")} · {s.kind === "history" ? "from your listening" : "new to you"}
                </p>
                {s.reason && <p className="mt-1 text-xs text-fg-2">{s.reason}</p>}
              </div>
              <OpenInSpotify href={s.track.url} compact />
            </motion.li>
          ))}
        </ul>
      )}
      {message.discarded ? (
        <p className="font-mono text-[10px] tracking-wide text-faint uppercase">
          {message.discarded} suggestion{message.discarded > 1 ? "s" : ""} removed — not found on Spotify or not in your history
        </p>
      ) : null}
      {message.error && <p className="text-sm text-danger">{message.error}</p>}
    </motion.div>
  );
}
