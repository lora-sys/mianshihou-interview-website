import Image from "next/image";
import Link from "next/link";
import { Badge, Button } from "@repo/ui";
import { getCurrentUser } from "@/lib/trpc/server";

function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={28}
        height={28}
        className="h-7 w-7 rounded-full border object-cover"
      />
    );
  }
  const letter = (name || "?").slice(0, 1).toUpperCase();
  return (
    <div className="grid h-7 w-7 place-items-center rounded-full border bg-muted text-xs font-semibold">
      {letter}
    </div>
  );
}

export default async function TopNav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src="/logo.png"
              alt="面试猴"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            面试猴
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/explore/question-banks">精选题库</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/explore/questions">精选题目</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/search">搜索</Link>
            </Button>
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard">我的</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/questions">我的题目</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/question-banks">我的题库</Link>
                </Button>
              </>
            ) : null}
            {user?.userRole === "admin" ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin">后台</Link>
              </Button>
            ) : null}
          </nav>
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
            >
              <Link href="/me/security">账号安全</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/me" className="flex items-center gap-2">
                <Avatar
                  name={user.userName || user.email}
                  src={user.userAvatar}
                />
                <span className="max-w-40 truncate">
                  {user.userName || user.email}
                </span>
                {user.userRole === "admin" ? (
                  <Badge variant="secondary" className="hidden lg:inline-flex">
                    管理员
                  </Badge>
                ) : null}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/logout">退出登录</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">登录</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">注册</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
