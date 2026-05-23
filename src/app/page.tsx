import { Suspense } from "react";
import ProductGrid from "@/components/ProductGrid";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Real-time{" "}
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Inventory
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-400">
          Browse products across multiple warehouses. Reserve your items for{" "}
          <span className="font-semibold text-blue-400">10 minutes</span> while
          you complete checkout — your spot is held just for you.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-8 rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-4">
        <div className="flex flex-wrap gap-6 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-green-400">●</span>
            <span>Reserve a unit to hold it for 10 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">●</span>
            <span>
              Unreserved stock is visible to all shoppers simultaneously
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400">●</span>
            <span>Only confirmed purchases permanently decrement stock</span>
          </div>
        </div>
      </div>

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </div>
  );
}
