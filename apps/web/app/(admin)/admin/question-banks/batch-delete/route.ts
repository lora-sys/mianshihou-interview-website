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

  const redirectTo = String(
    formData.get("redirect") ?? "/admin/question-banks",
  );
  if (ids.length === 0)
    return NextResponse.redirect(new URL(redirectTo, req.url));

  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/questionBank.batchDelete`);
  url.searchParams.set("batch", "1");

  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ 0: { ids } }),
  });

  return NextResponse.redirect(new URL(redirectTo, req.url));
}
