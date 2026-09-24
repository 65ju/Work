import type { Metadata } from "next";
import { ListeningView } from "@/features/listening/ListeningView";

export const metadata: Metadata = { title: "Listening" };

export default function Page() {
  return <ListeningView />;
}
