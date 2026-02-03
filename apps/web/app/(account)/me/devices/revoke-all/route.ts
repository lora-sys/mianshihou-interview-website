import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc";
}

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const redirectTo = String(fd.get("redirect") ?? "/me");

  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/auth.revokeAllDevices`);
  url.searchParams.set("batch", "1");

  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
      "x-device-id": req.headers.get("x-device-id") ?? "",
    },
    body: JSON.stringify({ 0: {} }),
  });

  return NextResponse.redirect(new URL(redirectTo, req.url), { status: 303 });
}
