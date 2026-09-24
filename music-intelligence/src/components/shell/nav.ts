import { AudioLines, Clock3, Compass, Dna, Library, ListMusic, MicVocal, Orbit, Sparkles, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobilePrimary?: boolean };

export const NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: AudioLines, mobilePrimary: true },
  { href: "/dna", label: "Music DNA", icon: Dna, mobilePrimary: true },
  { href: "/artists", label: "Artists", icon: MicVocal, mobilePrimary: true },
  { href: "/tracks", label: "Tracks", icon: ListMusic },
  { href: "/genres", label: "Genres", icon: Orbit },
  { href: "/listening", label: "Listening", icon: Clock3, mobilePrimary: true },
  { href: "/playlists", label: "Playlists", icon: Library },
  { href: "/discovery", label: "Discovery", icon: Compass },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
];
