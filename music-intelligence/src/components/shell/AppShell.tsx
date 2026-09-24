"use client";

import { AnimatePresence, motion } from "motion/react";
import { LogOut, MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AssistantLauncher } from "@/components/assistant/AssistantLauncher";
import { Wordmark } from "@/components/brand/Wordmark";
import { Artwork } from "@/components/ui/Artwork";
import { ErrorState } from "@/components/ui/States";
import { useProfile } from "@/lib/client/queries";
import { Portal } from "@/components/ui/Portal";
import { AmbientBackground, AmbientController } from "./Ambient";
import { AnalyzingSequence } from "./AnalyzingSequence";
import { MiniPlayer } from "./MiniPlayer";
import { NAV, NAV_GROUPS } from "./nav";
import { RecorderStatus } from "./RecorderStatus";

export function AppShell({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const [sequenceDone, setSequenceDone] = useState(false);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("welcome")) {
      setWelcome(true);
      url.searchParams.delete("welcome");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  const finish = useCallback(() => setSequenceDone(true), []);
  const showSequence = !profile.isError && (!sequenceDone || !profile.data);

  return (
    <>
      <AmbientBackground />
      <AmbientController />
      <AnimatePresence>
        {showSequence && <AnalyzingSequence key="seq" ready={Boolean(profile.data)} onFinished={finish} minimumMs={welcome ? 3600 : 900} />}
      </AnimatePresence>

      {profile.isError && !profile.data ? (
        <main className="mx-auto max-w-3xl px-6">
          <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
        </main>
      ) : profile.data && sequenceDone ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none", transform: "none" } }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:grid lg:grid-cols-[248px_1fr]"
        >
          <SideNav />
          <MobileTopBar />
          <main className="min-w-0 px-5 pt-6 pb-40 sm:px-8 lg:px-14 lg:pt-14 lg:pb-24">
            <div className="mx-auto max-w-[1240px]">{children}</div>
          </main>
          <MobileNav />
          <AssistantLauncher />
        </motion.div>
      ) : null}
    </>
  );
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

function SideNav() {
  const isActive = useActive();
  const { data } = useProfile();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ink/40 px-5 pt-8 pb-6 backdrop-blur-xl lg:flex">
      <Link href="/overview" className="px-2 text-fg">
        <Wordmark />
      </Link>
      <nav className="scrollbar-none mt-8 flex min-h-0 flex-col gap-4 overflow-y-auto" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 font-mono text-[9.5px] tracking-[0.18em] text-faint uppercase">{group.label}</p>
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-md px-3 py-[5px] text-[13.5px] transition-colors ${
                    active ? "text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-md bg-white/[0.06]"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  {active && (
                    <motion.span
                      layoutId="nav-bar"
                      className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-[var(--accent)]"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <Icon className="relative size-4 opacity-80" strokeWidth={1.6} />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <RecorderStatus />
        <MiniPlayer />
        {data && (
          <div className="flex items-center gap-3 border-t border-line px-2 pt-4">
            <Artwork images={data.user.images} alt={data.user.displayName} size={28} rounded="rounded-full" kind="artist" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-fg-2">{data.user.displayName}</span>
            <form action="/api/auth/logout" method="post">
              <button className="rounded p-1.5 text-muted transition hover:bg-white/5 hover:text-fg" aria-label="Sign out" title="Sign out">
                <LogOut className="size-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const { data } = useProfile();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/70 px-5 py-3.5 backdrop-blur-xl lg:hidden">
      <Link href="/overview">
        <Wordmark className="text-[15px]" />
      </Link>
      {data && <Artwork images={data.user.images} alt={data.user.displayName} size={28} rounded="rounded-full" kind="artist" />}
    </header>
  );
}

function MobileNav() {
  const isActive = useActive();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const primary = NAV.filter((n) => n.mobilePrimary);
  const secondary = NAV.filter((n) => !n.mobilePrimary);
  const moreActive = secondary.some((n) => isActive(n.href));

  return (
    <>
      <Portal>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden">
        <MiniPlayer variant="bar" />
        <nav className="grid grid-cols-5" aria-label="Main">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center gap-1 py-2.5">
                {active && <motion.span layoutId="mnav" className="absolute top-0 h-[2px] w-8 rounded-full bg-[var(--accent)]" />}
                <Icon className={`size-[18px] ${active ? "text-fg" : "text-muted"}`} strokeWidth={1.6} />
                <span className={`text-[10px] ${active ? "text-fg" : "text-muted"}`}>{item.label.replace("Music ", "")}</span>
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="relative flex flex-col items-center gap-1 py-2.5" aria-expanded={open} aria-controls="more-sheet">
            {moreActive && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-[var(--accent)]" />}
            <MoreHorizontal className={`size-[18px] ${moreActive ? "text-fg" : "text-muted"}`} strokeWidth={1.6} />
            <span className={`text-[10px] ${moreActive ? "text-fg" : "text-muted"}`}>More</span>
          </button>
        </nav>
      </div>
      </Portal>
      <Portal>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              id="more-sheet"
              role="dialog"
              aria-label="More sections"
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line bg-ink-1 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+24px)] lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">More</span>
                <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-2 text-muted hover:text-fg">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {secondary.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg border border-line px-4 py-4 ${isActive(item.href) ? "bg-white/[0.06] text-fg" : "text-fg-2"}`}>
                      <Icon className="size-4" strokeWidth={1.6} />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <form action="/api/auth/logout" method="post" className="mt-6">
                <button className="flex items-center gap-2 text-sm text-muted">
                  <LogOut className="size-4" /> Sign out
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </Portal>
    </>
  );
}
