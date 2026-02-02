import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/questions",
  "/question-banks",
  "/me",
  "/admin",
];
const AUTH_PAGES = ["/login", "/register"];
const SESSION_COOKIE = "mianshihou.session_token";

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const session = req.cookies.get(SESSION_COOKIE)?.value;

  if (isProtectedPath(pathname) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "redirect",
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );
    return NextResponse.redirect(url);
  }

  if (isAuthPage(pathname) && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
