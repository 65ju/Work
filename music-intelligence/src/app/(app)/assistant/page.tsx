import type { Metadata } from "next";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "AI Assistant" };

export default function Page() {
  return (
    <div className="flex h-[calc(100dvh-10rem)] flex-col gap-8 lg:h-[calc(100dvh-7rem)]">
      <PageHeader
        eyebrow="✦ AI assistant"
        title={
          <>
            Ask your <span className="font-serif font-normal italic">music</span>
          </>
        }
      >
        The assistant reads a structured summary of your real listening data, not raw API responses. Any track it suggests is looked
        up on Spotify first and removed if it does not exist.
      </PageHeader>
      <div className="min-h-0 flex-1">
        <AssistantPanel variant="page" />
      </div>
    </div>
  );
}
