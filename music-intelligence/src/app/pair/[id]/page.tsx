import { ArrowRight, Check, Clock } from "lucide-react";
import type { Metadata } from "next";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { Wordmark } from "@/components/brand/Wordmark";
import { AmbientBackground } from "@/components/shell/Ambient";
import { getPairing } from "@/server/auth/pairing";

export const metadata: Metadata = { title: "Log in on your computer" };
export const dynamic = "force-dynamic";

/** Opened on the phone after scanning the QR code shown on the computer. */
export default async function PairPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const { id } = await params;
  const { done } = await searchParams;
  const record = await getPairing(id).catch(() => null);

  return (
    <main className="relative flex min-h-dvh flex-col px-6 py-8">
      <AmbientBackground intensity={0.7} />
      <Wordmark className="text-base" />
      <section className="mt-auto mb-auto flex flex-col gap-6 pt-16">
        {done || record?.status === "approved" ? (
          <>
            <span className="grid size-12 place-items-center rounded-full bg-[var(--accent)] text-ink">
              <Check className="size-6" />
            </span>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight">
              You&apos;re in. <span className="font-serif font-normal italic">Look at your computer.</span>
            </h1>
            <p className="text-fg-2">Your music is loading there now. You can close this page.</p>
          </>
        ) : !record ? (
          <>
            <Clock className="size-8 text-muted" />
            <h1 className="text-4xl leading-tight font-semibold tracking-tight">This code has expired</h1>
            <p className="text-fg-2">Codes are valid for 5 minutes. Create a new one on your computer and scan it again.</p>
          </>
        ) : (
          <>
            <p className="eyebrow">Log in on your computer</p>
            <p className="text-fg-2">Check that your computer shows this code:</p>
            <p className="numeric text-6xl tracking-[0.08em] text-fg">{record.code}</p>
            <p className="text-sm leading-relaxed text-muted">
              Only continue if you started this login yourself. Whoever shows this code gets access to your listening data in Music
              Intelligence.
            </p>
            <a
              href={`/api/auth/login?pair=${encodeURIComponent(id)}`}
              className="mt-2 inline-flex items-center justify-center gap-3 rounded-full bg-fg px-6 py-4 text-[15px] font-medium text-ink"
            >
              <SpotifyIcon className="size-5 text-[#1db954]" /> Codes match, continue with Spotify <ArrowRight className="size-4" />
            </a>
          </>
        )}
      </section>
    </main>
  );
}
