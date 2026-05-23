import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

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
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="mb-10 relative z-10">
        <h1 className="text-4xl font-extrabold text-white font-display mb-2">My <span className="gradient-text">Orders</span></h1>
        <p className="text-gray-400">View your purchased items and reservation history.</p>
      </div>

      <div className="space-y-6 relative z-10">
        {reservations.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4 opacity-50">🛍️</div>
            <h2 className="text-xl font-bold text-white mb-2">No orders yet</h2>
            <p className="text-gray-400">You haven't made any reservations or purchases.</p>
          </div>
        ) : (
          reservations.map((res) => (
            <div key={res.id} className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row gap-6">
              {res.product.imageUrl ? (
                <img
                  src={res.product.imageUrl}
                  alt={res.product.name}
                  className="h-24 w-24 rounded-xl object-cover shadow-lg"
                />
              ) : (
                <div className="h-24 w-24 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 text-xs">
                  No Image
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white font-display">{res.product.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    res.status === "CONFIRMED" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                    res.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                    "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                  }`}>
                    {res.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-400 mb-4 line-clamp-1">
                  Reserved from <span className="text-gray-300 font-medium">{res.warehouse.name}</span>
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-white/5 pt-4">
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Date</p>
                    <p className="text-white">{res.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Qty</p>
                    <p className="text-white">{res.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Total</p>
                    <p className="text-white font-bold">{formatCurrency(res.product.price * res.quantity)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Order ID</p>
                    <p className="text-gray-400 font-mono text-xs truncate" title={res.id}>{res.id.split('-')[0]}...</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
