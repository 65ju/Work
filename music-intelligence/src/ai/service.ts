import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { MusicProfile } from "@/analytics/types";
import type { MusicDataProvider } from "@/domain/provider";
import type { Track } from "@/domain/types";
import { env } from "@/server/env";
import { profileForAI, SYSTEM_PROMPT } from "./context";
import { FenceFilter, normalize, parseSuggestionBlock, type RawSuggestion } from "./suggestions";
import type { AssistantEvent, AssistantStatus, ChatMessage, ValidatedSuggestion } from "./types";

export function assistantStatus(): AssistantStatus {
  try {
    const e = env();
    return { enabled: Boolean(e.ANTHROPIC_API_KEY), model: e.ANTHROPIC_API_KEY ? e.AI_MODEL : null };
  } catch {
    return { enabled: false, model: null };
  }
}

/**
 * AI Explanation stage of the pipeline: the model reasons over the structured
 * profile, then every track it names is validated against the provider catalog.
 */
export class AIService {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly provider: MusicDataProvider) {
    const e = env();
    if (!e.ANTHROPIC_API_KEY) throw new Error("AI assistant is not configured");
    this.client = new Anthropic({ apiKey: e.ANTHROPIC_API_KEY });
    this.model = e.AI_MODEL;
  }

  async *chat(profile: MusicProfile, history: ChatMessage[], signal: AbortSignal): AsyncGenerator<AssistantEvent> {
    const stream = this.client.beta.messages.stream(
      {
        model: this.model,
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: [
          { type: "text", text: SYSTEM_PROMPT },
          {
            type: "text",
            text: `<music_profile>\n${JSON.stringify(profileForAI(profile))}\n</music_profile>`,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal },
    );

    const filter = new FenceFilter();
    let full = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        full += event.delta.text;
        const visible = filter.push(event.delta.text);
        if (visible) yield { type: "text", text: visible };
      }
    }
    const tail = filter.flush();
    if (tail) yield { type: "text", text: tail };

    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      yield { type: "error", message: "The assistant could not answer this request." };
      return;
    }

    const raw = parseSuggestionBlock(full);
    if (raw.length > 0) {
      const { items, discarded } = await this.validate(raw, profile);
      yield { type: "suggestions", items, discarded };
    }
  }

  /** Drops any suggestion that does not exist in the catalog or falsely claims to be from the user's history. */
  private async validate(raw: RawSuggestion[], profile: MusicProfile) {
    const results = await Promise.all(
      raw.map(async (s): Promise<ValidatedSuggestion | null> => {
        const match = await this.findTrack(s.title, s.artist);
        if (!match) return null;
        if (s.kind === "history" && !profile.tracks[match.id]) return null;
        return {
          title: s.title,
          artist: s.artist,
          reason: s.reason,
          kind: profile.tracks[match.id] ? "history" : "new",
          track: {
            id: match.id,
            name: match.name,
            artists: match.artists.map((a) => a.name),
            imageUrl: match.album.images.at(-2)?.url ?? match.album.images[0]?.url ?? null,
            url: match.url,
          },
        };
      }),
    );
    const seen = new Set<string>();
    const items = results.filter((r): r is ValidatedSuggestion => {
      if (!r || seen.has(r.track.id)) return false;
      seen.add(r.track.id);
      return true;
    });
    return { items, discarded: raw.length - items.length };
  }

  private async findTrack(title: string, artist: string): Promise<Track | null> {
    const q = `track:"${title.replace(/"/g, "")}" artist:"${artist.replace(/"/g, "")}"`;
    const hits = await this.provider.searchTracks(q, 5).catch(() => [] as Track[]);
    const nt = normalize(title);
    const na = normalize(artist);
    return (
      hits.find((t) => normalize(t.name) === nt && t.artists.some((a) => normalize(a.name) === na)) ??
      hits.find((t) => normalize(t.name).includes(nt) && t.artists.some((a) => normalize(a.name).includes(na) || na.includes(normalize(a.name)))) ??
      null
    );
  }
}
