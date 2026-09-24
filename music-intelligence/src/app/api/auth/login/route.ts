import { NextResponse, type NextRequest } from "next/server";
import { codeChallenge } from "@/server/auth/pkce";
import { cookieOptions, OAUTH_COOKIE, randomToken, seal } from "@/server/auth/session";
import { authorizeUrl } from "@/server/auth/spotify-oauth";
import { ConfigurationError } from "@/server/env";

export async function GET(req: NextRequest) {
  try {
    const state = randomToken(16);
    const verifier = randomToken(48);
    const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
    const res = NextResponse.redirect(authorizeUrl(state, await codeChallenge(verifier)));
    res.cookies.set(OAUTH_COOKIE, await seal({ state, verifier, returnTo }, 600), cookieOptions(600));
    return res;
  } catch (err) {
    const code = err instanceof ConfigurationError ? "config" : "login_failed";
    if (err instanceof ConfigurationError) console.error(err.message);
    return NextResponse.redirect(new URL(`/?error=${code}`, req.url));
  }
}

function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/overview";
}
