import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fd = await req.formData();
  const status = String(fd.get("status") ?? "active");
  const redirectTo = String(fd.get("redirect") ?? `/admin/users/${id}`);

  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/users.setStatus`);
  url.searchParams.set("batch", "1");

  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ 0: { id, status } }),
  });

  return NextResponse.redirect(new URL(redirectTo, req.url));
}
