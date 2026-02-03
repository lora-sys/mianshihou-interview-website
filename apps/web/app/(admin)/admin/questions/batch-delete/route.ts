import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc";
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const ids = formData
    .getAll("ids")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);

  const redirectTo = String(formData.get("redirect") ?? "/admin/questions");
  const redirectUrl = new URL(redirectTo, req.url);
  if (ids.length === 0) {
    redirectUrl.searchParams.set("notice", "no-selection");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/question.batchDelete`);
  url.searchParams.set("batch", "1");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
      "x-device-id": req.headers.get("x-device-id") ?? "",
    },
    body: JSON.stringify({ 0: { ids } }),
  });

  if (!res.ok) {
    redirectUrl.searchParams.set("error", "batch-delete-failed");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  redirectUrl.searchParams.set("notice", "batch-deleted");
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
