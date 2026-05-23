export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
        >
          <div className="h-48 animate-pulse bg-gray-800" />
          <div className="p-5 space-y-3">
            <div className="h-5 w-3/4 animate-pulse rounded-md bg-gray-800" />
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-800" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-gray-800" />
            <div className="h-8 w-1/3 animate-pulse rounded-md bg-gray-800" />
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-lg bg-gray-800" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-800" />
            </div>
            <div className="h-11 animate-pulse rounded-xl bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
