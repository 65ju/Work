import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createPairing, PAIR_COOKIE, PAIR_TTL_SECONDS, pairingAvailability } from "@/server/auth/pairing";
import { cookieOptions, seal } from "@/server/auth/session";
import { publicOrigin } from "@/server/env";

export const dynamic = "force-dynamic";

/** Starts a QR login on this (desktop) browser. Only this browser can later collect the session. */
export async function POST() {
  const availability = pairingAvailability();
  if (!availability.available) {
    return NextResponse.json({ error: { code: "config", message: availability.reason } }, { status: 503 });
  }
  try {
    const { id, record } = await createPairing();
    const url = `${publicOrigin()}/pair/${id}`;
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#09090aff", light: "#eeede9ff" },
    });
    const res = NextResponse.json({ code: record.code, svg, expiresAt: record.createdAt + PAIR_TTL_SECONDS * 1000 });
    res.cookies.set(PAIR_COOKIE, await seal({ id }, PAIR_TTL_SECONDS), cookieOptions(PAIR_TTL_SECONDS));
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: { code: "unknown", message: "Could not start QR login." } }, { status: 500 });
  }
}
