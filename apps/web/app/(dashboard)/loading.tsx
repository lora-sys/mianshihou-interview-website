import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-card/60 p-2 shadow-sm backdrop-blur space-y-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur md:p-6 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </main>
      </div>
    </div>
  );
}
