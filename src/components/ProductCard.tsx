"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

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
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] = useState<StockItem | null>(
    product.stocks.find((s) => s.available > 0) || null
  );
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAvailable = product.stocks.reduce((sum, s) => sum + s.available, 0);

  function getStockLabel(stock: StockItem) {
    if (stock.available === 0) return "Out of stock";
    if (stock.available <= 2) return `Only ${stock.available} left!`;
    return `${stock.available} available`;
  }

  function getStockClass(available: number) {
    if (available === 0) return "stock-badge-out";
    if (available <= 2) return "stock-badge-low";
    return "stock-badge-available";
  }

  async function handleReserve() {
    if (!selectedWarehouse) return;
    setReserving(true);
    setError(null);

    const idempotencyKey = uuidv4();

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouse.warehouseId,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(`Not enough stock: ${data.error}`);
        onReserved();
        return;
      }

      if (!res.ok) {
        setError(data.error || "Failed to reserve. Please try again.");
        return;
      }

      onReserved();
      router.push(`/checkout/${data.reservation.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setReserving(false);
    }
  }

  return (
    <div className="premium-card glass-panel flex flex-col rounded-2xl">
      {/* Product Image */}
      <div className="relative h-56 overflow-hidden bg-black/40">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-110 opacity-90 hover:opacity-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600">
            <svg className="h-16 w-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-4 right-4">
          <span
            className={`badge-glass rounded-full px-3 py-1 text-xs font-semibold shadow-lg ${
              totalAvailable === 0
                ? "text-red-400"
                : totalAvailable <= 3
                ? "text-yellow-400"
                : "text-green-400"
            }`}
          >
            {totalAvailable === 0
              ? "Sold Out"
              : `${totalAvailable} total left`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <h2 className="mb-2 text-xl font-bold leading-tight text-white font-display">
          {product.name}
        </h2>
        {product.description && (
          <p className="mb-5 line-clamp-2 text-sm text-gray-400">
            {product.description}
          </p>
        )}

        <p className="mb-6 text-3xl font-extrabold text-white flex items-baseline gap-1">
          {formatCurrency(product.price).replace('.00', '')}
          <span className="text-lg text-gray-400 font-medium">.00</span>
        </p>

        {/* Warehouse stock breakdown */}
        <div className="mb-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-3">
            Select Warehouse
          </p>
          {product.stocks.map((stock) => (
            <button
              key={stock.warehouseId}
              onClick={() =>
                stock.available > 0 && setSelectedWarehouse(stock)
              }
              disabled={stock.available === 0}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                selectedWarehouse?.warehouseId === stock.warehouseId
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-100 shadow-[0_0_15px_rgba(79,70,229,0.15)]"
                  : stock.available === 0
                  ? "cursor-not-allowed border-white/5 bg-white/5 opacity-40 text-gray-500"
                  : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold block mb-0.5">{stock.warehouse.name}</span>
                  <span className="text-xs text-gray-400/80">
                    {stock.warehouse.location}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    stock.available === 0 ? 'badge-out' : stock.available <= 2 ? 'badge-low' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}
                >
                  {getStockLabel(stock)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-sm flex items-start gap-2">
            <span className="text-red-400">⚠️</span> {error}
          </div>
        )}

        {/* Reserve button */}
        <button
          onClick={handleReserve}
          disabled={!selectedWarehouse || totalAvailable === 0 || reserving}
          className={`mt-auto w-full rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
            !selectedWarehouse || totalAvailable === 0
              ? "cursor-not-allowed bg-white/5 text-gray-500 border border-white/10"
              : reserving
              ? "cursor-wait bg-indigo-600/50 text-indigo-200 border border-indigo-500/30"
              : "btn-shiny text-white shadow-lg"
          }`}
        >
          {reserving ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Reserving...
            </span>
          ) : totalAvailable === 0 ? (
            "Out of Stock"
          ) : (
            "Reserve Now"
          )}
        </button>
      </div>
    </div>
  );
}
