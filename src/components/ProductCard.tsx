"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { MapPin, Warehouse, Lock, AlertCircle, Sparkles } from "lucide-react";

interface StockItem {
  id: string;
  warehouseId: string;
  total: number;
  reserved: number;
  available: number;
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stocks: StockItem[];
}

interface ProductCardProps {
  product: Product;
  onReserved: () => void;
}

export default function ProductCard({ product, onReserved }: ProductCardProps) {
  const { data: session } = useSession();
  const [selectedWarehouse, setSelectedWarehouse] = useState<StockItem | null>(
    product.stocks.find((s) => s.available > 0) || null
  );
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAvailable = product.stocks.reduce((sum, s) => sum + s.available, 0);

  function getStockLabel(stock: StockItem) {
    if (stock.available === 0) return "Out of Stock";
    if (stock.available <= 2) return `${stock.available} Left!`;
    return `${stock.available} Units`;
  }

  async function handleReserve() {
    if (!session) {
      signIn("google");
      return;
    }

    if (!selectedWarehouse) return;
    setReserving(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouse.warehouseId,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reserve. Please try again.");
        return;
      }

      onReserved();
      window.location.href = `/checkout/${data.reservation.id}`;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setReserving(false);
    }
  }

  return (
    <div className="premium-card flex flex-col rounded-2xl overflow-hidden">
      {/* Product Image Container */}
      <div className="relative h-60 overflow-hidden bg-black/30 group/img">
        {product.imageUrl ? (
          <>
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/img:scale-102 opacity-90"
            />
            {/* Vignette Shadow Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-black/10 pointer-events-none" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-700 bg-white/[0.01]">
            <Warehouse className="h-12 w-12 opacity-20 stroke-[1]" />
          </div>
        )}
        
        {/* Stock Badge Overlay */}
        <div className="absolute top-4 right-4">
          <span
            className={`badge-glass text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 shadow-md flex items-center gap-1.5 ${
              totalAvailable === 0
                ? "text-red-400 border-red-500/10 bg-red-500/5"
                : totalAvailable <= 3
                ? "text-amber-400 border-amber-500/10 bg-amber-500/5"
                : "text-emerald-400 border-emerald-500/10 bg-emerald-500/5"
            }`}
          >
            {totalAvailable === 0 ? "Sold Out" : `${totalAvailable} Units in Stock`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <h2 className="mb-2 text-lg font-bold text-white tracking-tight">
          {product.name}
        </h2>
        {product.description && (
          <p className="mb-5 line-clamp-2 text-xs text-gray-400 leading-relaxed font-sans">
            {product.description}
          </p>
        )}

        <div className="mb-6 flex items-baseline">
          <span className="text-xl font-bold text-white font-display tracking-tight">
            ₹{product.price.toLocaleString("en-IN")}.00
          </span>
        </div>

        {/* Warehouse stock breakdown */}
        <div className="mb-6 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
            Fulfillment Center
          </p>
          {product.stocks.map((stock) => {
            const isSelected = selectedWarehouse?.warehouseId === stock.warehouseId;
            const isOut = stock.available === 0;
            return (
              <button
                key={stock.warehouseId}
                onClick={() => !isOut && setSelectedWarehouse(stock)}
                disabled={isOut}
                className={`w-full rounded-xl border text-left transition-all duration-200 relative overflow-hidden ${
                  isSelected
                    ? "border-white/30 bg-white/5 text-white"
                    : isOut
                    ? "cursor-not-allowed border-white/[0.02] bg-white/[0.01] opacity-30 text-gray-500"
                    : "border-white/[0.05] bg-white/[0.01] text-gray-300 hover:border-white/15 hover:bg-white/[0.03]"
                }`}
              >
                <div className="px-3.5 py-2.5 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2.5">
                    {/* Minimal Selection Dot */}
                    {!isOut && (
                      <span className={`h-1.5 w-1.5 rounded-full transition-all ${
                        isSelected ? "bg-white" : "bg-transparent border border-white/20"
                      }`} />
                    )}
                    <div>
                      <span className="font-semibold text-xs block leading-tight">{stock.warehouse.name}</span>
                      <span className="text-[9px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2 w-2" />
                        {stock.warehouse.location}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                      isOut 
                        ? 'badge-out' 
                        : stock.available <= 2 
                        ? 'badge-low' 
                        : 'badge-glass'
                    }`}
                  >
                    {getStockLabel(stock)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/10 bg-red-500/5 px-3 py-2 text-[11px] text-red-400 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Reserve button */}
        <button
          onClick={handleReserve}
          disabled={(!!selectedWarehouse && totalAvailable === 0) || reserving}
          className={`mt-auto w-full rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            (!!selectedWarehouse && totalAvailable === 0)
              ? "cursor-not-allowed bg-white/[0.02] text-gray-500 border border-white/[0.05]"
              : reserving
              ? "cursor-wait bg-white/20 text-white flex items-center justify-center gap-2"
              : "btn-primary text-black flex items-center justify-center gap-2"
          }`}
        >
          {reserving ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Holding Unit...</span>
            </>
          ) : totalAvailable === 0 ? (
            "Out of Stock"
          ) : !session ? (
            <>
              <Lock className="h-3.5 w-3.5" />
              <span>Sign In to Reserve</span>
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" />
              <span>Reserve Hold</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
