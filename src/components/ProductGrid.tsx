"use client";

import { useEffect, useState, useCallback } from "react";
import ProductCard from "./ProductCard";
import { RefreshCw } from "lucide-react";

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

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products);
    } catch {
      setError("Failed to load products. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Avoid calling setState synchronously within the effect body to satisfy eslint rule.
    const timer = setTimeout(() => {
      fetchProducts();
    }, 0);

    // Refresh every 30 seconds to show updated stock
    const interval = setInterval(fetchProducts, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchProducts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-indigo" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center max-w-md mx-auto">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchProducts}
          className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400">
        <p>No products available in the catalog.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{products.length} products found</p>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5 text-gray-400 group-hover:rotate-180 transition-transform duration-500" />
          <span>Refresh</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onReserved={fetchProducts} />
        ))}
      </div>
    </div>
  );
}
