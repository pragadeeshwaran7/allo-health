import { Suspense } from "react";
import ProductGrid from "@/components/ProductGrid";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";

export default function HomePage() {
  return (
    <div className="relative">
      {/* Cinematic Glowing Orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero */}
      <div className="relative mb-16 pt-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full glass-panel text-sm text-indigo-300 font-medium tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Global Stock Synchronized
        </div>
        
        <h1 className="mb-6 text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
          Next-Gen <br />
          <span className="gradient-text">Inventory Experience</span>
        </h1>
        
        <p className="mx-auto max-w-3xl text-center text-lg md:text-xl text-gray-400 leading-relaxed">
          Browse our curated collection. Lock in your items for <span className="font-semibold text-indigo-400">10 minutes</span><br className="hidden sm:block" />
          while you complete checkout — guaranteed no race conditions.
        </p>
      </div>

      {/* Info banner - Premium Glass Style */}
      <div className="mb-12 rounded-2xl glass-panel p-6">
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-sm text-gray-300 font-medium">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">⏱️</div>
            <span>Reserve for 10 minutes</span>
          </div>
          <div className="hidden md:block w-px h-8 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">⚡</div>
            <span>Live visibility for all</span>
          </div>
          <div className="hidden md:block w-px h-8 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">🔒</div>
            <span>Guaranteed Allocation</span>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </div>
    </div>
  );
}
