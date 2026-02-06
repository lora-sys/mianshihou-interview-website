"use client";

import dynamic from "next/dynamic";

const MobileNavDynamic = dynamic(
  () => import("@/components/mobile-nav").then((m) => m.MobileNav),
  { ssr: false },
);

export function MobileNavLoader({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  return <MobileNavDynamic isLoggedIn={isLoggedIn} isAdmin={isAdmin} />;
}
