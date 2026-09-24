import type { Metadata } from "next";
import { GenresView } from "@/features/genres/GenresView";

export const metadata: Metadata = { title: "Genres" };

export default function Page() {
  return <GenresView />;
}
