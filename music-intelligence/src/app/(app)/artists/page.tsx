import type { Metadata } from "next";
import { ArtistsView } from "@/features/artists/ArtistsView";

export const metadata: Metadata = { title: "Artists" };

export default function Page() {
  return <ArtistsView />;
}
