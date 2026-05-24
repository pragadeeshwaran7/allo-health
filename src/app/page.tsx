import { Suspense } from "react";
import ProductGrid from "@/components/ProductGrid";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";
import { Clock, Zap, Shield, Cpu, Layers } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Header */}
      <div className="relative mb-16 pt-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-white/[0.08] bg-white/[0.02] text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          Transactional Safety Engine
        </div>
        
        <h1 className="mb-6 text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-normal">
          Real-Time <br />
          <span className="gradient-text">Inventory Reservation</span>
        </h1>
        
        <p className="mx-auto max-w-2xl text-center text-sm md:text-base text-gray-400 leading-relaxed">
          A high-concurrency reservation engine designed to guarantee inventory allocation. Lock items for <span className="font-semibold text-white">10 minutes</span> to check out securely without database race conditions.
        </p>
      </div>

      {/* Clean Technical Metrics Grid */}
      <div className="mb-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.08] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="bg-[#121214] p-5 flex flex-col gap-1.5">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Distributed Lock</span>
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-gray-400" />
            Redis Lock
          </span>
          <span className="text-[11px] text-gray-400">Mutex Exclusion active</span>
        </div>

        <div className="bg-[#121214] p-5 flex flex-col gap-1.5">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">DB Isolation</span>
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-gray-400" />
            Serializable
          </span>
          <span className="text-[11px] text-gray-400">Prisma Serializable Level</span>
        </div>

        <div className="bg-[#121214] p-5 flex flex-col gap-1.5">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Hold Duration</span>
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-gray-400" />
            10-Min Limit
          </span>
          <span className="text-[11px] text-gray-400">Automated Cron Cleanup</span>
        </div>

        <div className="bg-[#121214] p-5 flex flex-col gap-1.5">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Allocation Policy</span>
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-gray-400" />
            Guaranteed
          </span>
          <span className="text-[11px] text-gray-400">Over-allocation Prevented</span>
        </div>
      </div>

      {/* Technical Highlights Panel */}
      <div className="mb-12 rounded-2xl border border-white/[0.08] bg-[#121214] p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>10 Minute Allocation Hold</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-500" />
            <span>Sub-millisecond Lock Acquisition</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-500" />
            <span>Strict Transaction Consistency</span>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="relative z-10">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </div>
    </div>
  );
}
