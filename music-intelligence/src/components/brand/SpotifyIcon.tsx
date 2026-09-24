/** Spotify icon used for attribution and "Open in Spotify" links, per Spotify's branding guidelines. */
export function SpotifyIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .25c-2.85-1.74-6.43-2.13-10.66-1.17a.75.75 0 1 1-.33-1.46c4.62-1.05 8.6-.6 11.74 1.33.36.21.47.68.25 1.05Zm1.47-3.26a.94.94 0 0 1-1.29.31c-3.26-2-8.23-2.59-12.09-1.42a.94.94 0 1 1-.54-1.8c4.4-1.33 9.88-.68 13.61 1.62.44.27.58.85.31 1.29Zm.13-3.4C15.2 8.33 8.76 8.12 5.03 9.25a1.12 1.12 0 1 1-.65-2.15c4.28-1.3 11.4-1.05 15.9 1.62a1.12 1.12 0 1 1-1.18 1.92Z" />
    </svg>
  );
}

export function OpenInSpotify({ href, label = "Open in Spotify", compact = false }: { href: string | null; label?: string; compact?: boolean }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-fg-2 transition hover:border-line-strong hover:text-fg"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    >
      <SpotifyIcon className="size-3.5 text-spotify" />
      {!compact && <span>{label}</span>}
    </a>
  );
}
