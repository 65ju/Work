/** Shared AI assistant contracts (client + server). */

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export type ValidatedSuggestion = {
  title: string;
  artist: string;
  reason: string;
  /** "history" = the AI claims it is from the user's data; verified against the profile. */
  kind: "history" | "new";
  track: {
    id: string;
    name: string;
    artists: string[];
    imageUrl: string | null;
    url: string | null;
  };
};

export type AssistantEvent =
  | { type: "text"; text: string }
  | { type: "suggestions"; items: ValidatedSuggestion[]; discarded: number }
  | { type: "error"; message: string }
  | { type: "done" };

export type AssistantStatus = { enabled: boolean; model: string | null };

export const QUICK_ACTIONS = [
  "Find something new",
  "Analyze my taste",
  "What should I listen to?",
  "Build me a playlist",
  "Why do I like this?",
  "Find similar artists",
] as const;
