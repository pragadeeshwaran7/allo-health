import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { 
  ShoppingBag, 
  ArrowLeft, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  Clock, 
  XCircle 
} from "lucide-react";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const reservations = await prisma.reservation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      warehouse: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl relative">
      {/* Back button */}
      <div className="mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          My Orders
        </h1>
        <p className="text-gray-400 text-xs">Review your reservation holds, confirmations, and transaction logs.</p>
      </div>

      <div className="space-y-6">
        {reservations.length === 0 ? (
          <div className="border border-white/10 bg-[#121214] rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-center text-gray-500 mb-4">
              <ShoppingBag className="h-6 w-6 stroke-[1]" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2 font-display">No reservations found</h2>
            <p className="text-gray-400 text-xs max-w-xs leading-relaxed mb-6">
              You haven&apos;t reserved or purchased any items yet.
            </p>
            <Link
              href="/"
              className="btn-primary rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider text-black bg-white"
            >
              Go to Catalog
            </Link>
          </div>
        ) : (
          <div className="border border-white/10 bg-[#121214] rounded-xl overflow-hidden divide-y divide-white/[0.06]">
            {reservations.map((res) => {
              const isConfirmed = res.status === "CONFIRMED";
              const isPending = res.status === "PENDING";
              const isReleased = res.status === "RELEASED";

              return (
                <div 
                  key={res.id} 
                  className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {res.product.imageUrl ? (
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                        <img
                          src={res.product.imageUrl}
                          alt={res.product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-center text-gray-600 flex-shrink-0">
                        <ShoppingBag className="h-5 w-5 stroke-[1]" />
                      </div>
                    )}
                    
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white truncate">
                        {res.product.name}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="text-gray-500">Center:</span>
                        <span className="text-gray-300 font-semibold">{res.warehouse.name}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">{res.warehouse.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-right w-full md:w-auto">
                    <div className="min-w-[80px]">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Date</p>
                      <p className="text-gray-300 font-medium">{res.createdAt.toLocaleDateString()}</p>
                    </div>
                    <div className="min-w-[50px]">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Qty</p>
                      <p className="text-gray-300 font-bold">{res.quantity}</p>
                    </div>
                    <div className="min-w-[100px]">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total</p>
                      <p className="text-white font-bold">
                        {formatCurrency(res.product.price * res.quantity)}
                      </p>
                    </div>
                    <div className="min-w-[100px] font-mono">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Hold ID</p>
                      <p className="text-gray-500 text-[10px] truncate max-w-[80px]" title={res.id}>
                        {res.id}
                      </p>
                    </div>
                    <div className="min-w-[100px] flex md:justify-end">
                      <span 
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          isConfirmed 
                            ? "badge-success" 
                            : isPending 
                            ? "badge-low" 
                            : "badge-out"
                        }`}
                      >
                        {isConfirmed && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {isPending && <Clock className="h-2.5 w-2.5 animate-pulse" />}
                        {isReleased && <XCircle className="h-2.5 w-2.5" />}
                        {res.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
