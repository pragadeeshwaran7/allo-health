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
    <div className="card-hover flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
      {/* Product Image */}
      <div className="relative h-48 overflow-hidden bg-gray-800">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600">
            <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              totalAvailable === 0
                ? "stock-badge-out"
                : totalAvailable <= 3
                ? "stock-badge-low"
                : "stock-badge-available"
            }`}
          >
            {totalAvailable === 0
              ? "Sold Out"
              : `${totalAvailable} total left`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="mb-1 text-lg font-bold leading-tight text-white">
          {product.name}
        </h2>
        {product.description && (
          <p className="mb-4 line-clamp-2 text-sm text-gray-400">
            {product.description}
          </p>
        )}

        <p className="mb-4 text-2xl font-bold text-blue-400">
          {formatCurrency(product.price)}
        </p>

        {/* Warehouse stock breakdown */}
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Select Warehouse
          </p>
          {product.stocks.map((stock) => (
            <button
              key={stock.warehouseId}
              onClick={() =>
                stock.available > 0 && setSelectedWarehouse(stock)
              }
              disabled={stock.available === 0}
              className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                selectedWarehouse?.warehouseId === stock.warehouseId
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : stock.available === 0
                  ? "cursor-not-allowed border-gray-800 bg-gray-800/50 opacity-50 text-gray-500"
                  : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-750"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{stock.warehouse.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {stock.warehouse.location}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStockClass(stock.available)}`}
                >
                  {getStockLabel(stock)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        {/* Reserve button */}
        <button
          onClick={handleReserve}
          disabled={!selectedWarehouse || totalAvailable === 0 || reserving}
          className={`mt-auto w-full rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
            !selectedWarehouse || totalAvailable === 0
              ? "cursor-not-allowed bg-gray-800 text-gray-500"
              : reserving
              ? "cursor-wait bg-blue-700 text-blue-200"
              : "gradient-brand text-white hover:opacity-90 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
          }`}
        >
          {reserving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Reserving...
            </span>
          ) : totalAvailable === 0 ? (
            "Out of Stock"
          ) : (
            "Reserve Now →"
          )}
        </button>
      </div>
    </div>
  );
}
