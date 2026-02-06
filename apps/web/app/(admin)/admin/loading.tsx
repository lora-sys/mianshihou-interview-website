import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-12 w-full" />
        <div className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
