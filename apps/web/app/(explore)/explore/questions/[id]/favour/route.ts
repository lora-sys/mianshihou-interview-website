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
  const questionId = Number(idRaw);
  const fd = await req.formData();
  const redirectTo = String(
    fd.get("redirect") ?? `/explore/questions/${idRaw}`,
  );

  if (!Number.isFinite(questionId) || questionId <= 0) {
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/questionFavours.toggle`);
  url.searchParams.set("batch", "1");

  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ 0: { questionId } }),
  });

  return NextResponse.redirect(new URL(redirectTo, req.url), { status: 303 });
}
