import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc";
}

export async function GET(req: NextRequest) {
  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/auth.signOut`);
  url.searchParams.set("batch", "1");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ 0: {} }),
  });

  const redirectUrl = new URL("/login", req.url);
  const out = NextResponse.redirect(redirectUrl);

  const getSetCookie = (res.headers as any).getSetCookie as
    | undefined
    | (() => string[]);
  const setCookies =
    typeof getSetCookie === "function" ? getSetCookie.call(res.headers) : null;
  if (setCookies && setCookies.length > 0) {
    for (const c of setCookies) out.headers.append("set-cookie", c);
  } else {
    const single = res.headers.get("set-cookie");
    if (single) out.headers.append("set-cookie", single);
  }

  return out;
}
