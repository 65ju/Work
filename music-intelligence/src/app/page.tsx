import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { Wordmark } from "@/components/brand/Wordmark";
import { ConnectButton, LandingBackdrop } from "@/components/landing/LandingClient";
import { QrLogin } from "@/components/landing/QrLogin";
import { pairingAvailability } from "@/server/auth/pairing";
import { readSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Music Intelligence" };

const ERRORS: Record<string, string> = {
  access_denied: "You declined the Spotify permission request. Connect again whenever you are ready.",
  state_mismatch: "The sign-in request expired or was tampered with. Please try again.",
  login_failed: "Spotify sign-in failed. In Development Mode your account must be added to the app's user list.",
  config: "The server is missing its Spotify configuration. See the README for the required environment variables.",
};

export default async function Landing({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await readSession().catch(() => null);
  const errorMessage = error ? (ERRORS[error] ?? ERRORS.login_failed) : null;
  const qrAvailable = !session && pairingAvailability().available;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-6 py-8 sm:px-12 sm:py-10">
      <LandingBackdrop />

      <header className="relative z-10 flex items-center justify-between">
        <Wordmark className="text-base" />
        <span className="hidden items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-muted uppercase sm:flex">
          <SpotifyIcon className="size-3.5 text-spotify" /> Works with Spotify
        </span>
      </header>

      <section className="relative z-10 mt-auto grid gap-12 pt-24 pb-6 lg:grid-cols-[1.25fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">Personal music analytics</p>
          <h1 className="mt-6 text-display font-semibold">
            Your music,
            <br />
            <span className="font-serif font-normal tracking-[-0.02em] italic">understood.</span>
          </h1>
        </div>
        <div className="max-w-md lg:justify-self-end">
          <p className="text-[17px] leading-relaxed text-fg-2">
            Connect Spotify and see your listening as one connected picture: your Music DNA, the artists and genres that define you,
            when you listen and what to discover next.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Every number is labelled by source: data from Spotify, metrics calculated by this app, or recommendations from its own
            algorithm. Nothing is invented.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {session ? (
              <a href="/overview" className="group inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3.5 text-[15px] font-medium text-ink transition hover:opacity-90">
                Continue to your music <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ) : (
              <>
                <ConnectButton />
                {qrAvailable && <QrLogin />}
              </>
            )}
          </div>
          {errorMessage && (
            <p role="alert" className="mt-5 border-l-2 border-danger pl-3 text-sm text-fg-2">
              {errorMessage}
            </p>
          )}
        </div>
      </section>

      <footer className="relative z-10 mt-10 flex flex-col gap-2 border-t border-line pt-5 font-mono text-[10px] tracking-[0.12em] text-faint uppercase sm:flex-row sm:justify-between">
        <span>Read-only access · top items, recent plays, playlists, library</span>
        <span>Not affiliated with Spotify AB</span>
      </footer>
    </main>
  );
}
