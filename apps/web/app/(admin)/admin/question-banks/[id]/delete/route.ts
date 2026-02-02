import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);

  const formData = await req.formData();
  const redirectTo = String(
    formData.get("redirect") ?? "/admin/question-banks",
  );

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/questionBanks.delete`);
  url.searchParams.set("batch", "1");

  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ 0: { id } }),
  });

  return NextResponse.redirect(new URL(redirectTo, req.url));
}
