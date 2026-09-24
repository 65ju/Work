import { z } from "zod";

export const SUGGESTION_FENCE = "```suggestions";

const schema = z.array(
  z.object({
    title: z.string().min(1).max(200),
    artist: z.string().min(1).max(200),
    reason: z.string().max(400).default(""),
    kind: z.enum(["history", "new"]).default("new"),
  }),
);

export type RawSuggestion = z.infer<typeof schema>[number];

export function parseSuggestionBlock(fullText: string): RawSuggestion[] {
  const start = fullText.indexOf(SUGGESTION_FENCE);
  if (start === -1) return [];
  const body = fullText.slice(start + SUGGESTION_FENCE.length);
  const end = body.indexOf("```");
  const json = (end === -1 ? body : body.slice(0, end)).trim();
  try {
    const parsed = schema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data.slice(0, 10) : [];
  } catch {
    return [];
  }
}

/**
 * Streams visible text while withholding the machine-readable suggestion block.
 * Keeps a small tail buffer so a fence split across chunks is never leaked.
 */
export class FenceFilter {
  private buffer = "";
  private hidden = false;

  push(chunk: string): string {
    if (this.hidden) return "";
    this.buffer += chunk;
    const idx = this.buffer.indexOf(SUGGESTION_FENCE);
    if (idx !== -1) {
      this.hidden = true;
      const out = this.buffer.slice(0, idx);
      this.buffer = "";
      return out;
    }
    const safe = Math.max(0, this.buffer.length - SUGGESTION_FENCE.length);
    const out = this.buffer.slice(0, safe);
    this.buffer = this.buffer.slice(safe);
    return out;
  }

  flush(): string {
    if (this.hidden) return "";
    const out = this.buffer;
    this.buffer = "";
    return out;
  }
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*[(\[].*?[)\]]/g, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
