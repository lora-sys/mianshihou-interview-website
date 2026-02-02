import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc";
}

export async function GET(req: NextRequest) {
  if (
    req.nextUrl.hostname !== "localhost" &&
    req.nextUrl.hostname !== "127.0.0.1"
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/auth.promoteMeToAdmin`);
  url.searchParams.set("batch", "1");

  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ 0: { force: true } }),
  });

  return NextResponse.redirect(new URL("/admin", req.url));
}
