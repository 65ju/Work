import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AIService, assistantStatus } from "@/ai/service";
import type { AssistantEvent } from "@/ai/types";
import { handleApiError, spotifyForRequest } from "@/server/auth/spotify-session";
import { loadProfile, sanitizeTimezone } from "@/server/profile";

export const dynamic = "force-dynamic";

const body = z.object({
  tz: z.string().optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(30)
    .refine((m) => m[0]?.role === "user" && m.at(-1)?.role === "user", "Conversation must start and end with a user message"),
});

export async function POST(req: NextRequest) {
  if (!assistantStatus().enabled) {
    return NextResponse.json({ error: { code: "config", message: "The assistant is not enabled." } }, { status: 503 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "unknown", message: "Invalid request." } }, { status: 400 });
  }

  let profile;
  let service;
  try {
    service = await spotifyForRequest();
    profile = await loadProfile(service, sanitizeTimezone(parsed.data.tz ?? null));
  } catch (err) {
    return handleApiError(err);
  }

  const ai = new AIService(service);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AssistantEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        for await (const event of ai.chat(profile, parsed.data.messages, req.signal)) send(event);
      } catch (err) {
        if (!req.signal.aborted) {
          console.error(err);
          send({ type: "error", message: "The assistant is unavailable right now." });
        }
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" },
  });
}
