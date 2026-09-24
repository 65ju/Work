import type { Metadata } from "next";
import { TracksView } from "@/features/tracks/TracksView";

export const metadata: Metadata = { title: "Tracks" };

export default function Page() {
  return <TracksView />;
}
