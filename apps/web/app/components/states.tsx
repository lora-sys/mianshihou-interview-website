"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[360px]">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
        <div className="text-sm">{label ?? "加载中..."}</div>
      </div>
    </div>
  );
}

export function PageMessage({
  title,
  description,
  actionLabel,
  actionHref,
  tone = "neutral",
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="flex items-center justify-center min-h-[360px]">
      <Card className="w-full max-w-lg shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className={tone === "danger" ? "text-destructive" : ""}>
            {title}
          </CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
        {actionLabel && actionHref ? (
          <CardContent className="flex justify-center">
            <Button asChild variant={tone === "danger" ? "outline" : "default"}>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </CardContent>
        ) : (
          <CardContent />
        )}
      </Card>
    </div>
  );
}
