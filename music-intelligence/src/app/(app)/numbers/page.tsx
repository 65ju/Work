import type { Metadata } from "next";
import { NumbersView } from "@/features/numbers/NumbersView";

export const metadata: Metadata = { title: "Numbers" };

export default function Page() {
  return <NumbersView />;
}
