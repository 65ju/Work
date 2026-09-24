import type { Metadata } from "next";
import { WrappedView } from "@/features/wrapped/WrappedView";

export const metadata: Metadata = { title: "Wrapped" };

export default function Page() {
  return <WrappedView />;
}
