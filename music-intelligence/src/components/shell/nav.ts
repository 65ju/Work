import { AudioLines, BarChart3, Clock3, Compass, Dna, GalleryVerticalEnd, Layers, Library, ListMusic, MicVocal, Orbit, Sparkles, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobilePrimary?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "You",
    items: [
      { href: "/overview", label: "Overview", icon: AudioLines, mobilePrimary: true },
      { href: "/wrapped", label: "Wrapped", icon: GalleryVerticalEnd, mobilePrimary: true },
      { href: "/numbers", label: "Numbers", icon: BarChart3, mobilePrimary: true },
      { href: "/phases", label: "Phases", icon: Layers },
      { href: "/dna", label: "Music DNA", icon: Dna },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/artists", label: "Artists", icon: MicVocal, mobilePrimary: true },
      { href: "/tracks", label: "Tracks", icon: ListMusic },
      { href: "/genres", label: "Genres", icon: Orbit },
      { href: "/listening", label: "Listening", icon: Clock3 },
      { href: "/playlists", label: "Playlists", icon: Library },
    ],
  },
  {
    label: "Discover",
    items: [
      { href: "/discovery", label: "Discovery", icon: Compass },
      { href: "/assistant", label: "AI Assistant", icon: Sparkles },
    ],
  },
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
