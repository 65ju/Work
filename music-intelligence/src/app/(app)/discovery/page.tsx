import type { Metadata } from "next";
import { DiscoveryView } from "@/features/discovery/DiscoveryView";

export const metadata: Metadata = { title: "Discovery" };

export default function Page() {
  return <DiscoveryView />;
}
