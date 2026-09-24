import type { Metadata } from "next";
import { DnaView } from "@/features/dna/DnaView";

export const metadata: Metadata = { title: "Music DNA" };

export default function Page() {
  return <DnaView />;
}
