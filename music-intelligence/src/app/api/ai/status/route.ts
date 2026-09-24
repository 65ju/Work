import { NextResponse } from "next/server";
import { assistantStatus } from "@/ai/service";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(assistantStatus());
}
