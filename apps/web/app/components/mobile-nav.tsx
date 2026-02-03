"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@repo/ui";
import { Menu, X } from "lucide-react";

type NavItem = { href: string; label: string };

function buildItems({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}): NavItem[] {
  const items: NavItem[] = [
    { href: "/explore/question-banks", label: "精选题库" },
    { href: "/explore/questions", label: "精选题目" },
    { href: "/search", label: "搜索" },
  ];
  if (isLoggedIn) {
    items.push(
      { href: "/dashboard", label: "我的" },
      { href: "/questions", label: "我的题目" },
      { href: "/question-banks", label: "我的题库" },
      { href: "/me/security", label: "账号安全" },
    );
  }
  if (isAdmin) items.push({ href: "/admin", label: "后台" });
  return items;
}

export function MobileNav({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const items = useMemo(
    () => buildItems({ isLoggedIn, isAdmin }),
    [isLoggedIn, isAdmin],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="打开菜单"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {mounted && open && portalTarget
        ? createPortal(
            <div className="fixed inset-0 z-50 md:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setOpen(false)}
              />
              <div className="absolute inset-x-0 top-0 border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                  <div className="text-sm font-semibold">菜单</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen(false)}
                    aria-label="关闭菜单"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mx-auto max-w-6xl px-4 pb-4">
                  <div className="grid gap-2">
                    {items.map((it) => (
                      <Button
                        key={it.href}
                        asChild
                        variant="ghost"
                        className="h-11 justify-start rounded-xl border bg-background"
                        onClick={() => setOpen(false)}
                      >
                        <Link href={it.href}>{it.label}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}
