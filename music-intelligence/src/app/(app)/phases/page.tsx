import type { Metadata } from "next";
import { PhasesView } from "@/features/phases/PhasesView";

export const metadata: Metadata = { title: "Phases" };

export default function Page() {
  return <PhasesView />;
}
