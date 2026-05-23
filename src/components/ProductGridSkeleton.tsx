export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl glass-panel"
        >
          <div className="h-56 animate-pulse bg-white/5" />
          <div className="p-6 space-y-4">
            <div className="h-6 w-3/4 animate-pulse rounded-md bg-white/5" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded-md bg-white/5" />
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-white/5" />
            </div>
            <div className="h-10 w-1/3 animate-pulse rounded-md bg-white/5" />
            <div className="space-y-3 pt-2">
              <div className="h-12 animate-pulse rounded-xl bg-white/5" />
              <div className="h-12 animate-pulse rounded-xl bg-white/5" />
            </div>
            <div className="h-14 animate-pulse rounded-xl bg-white/5 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
