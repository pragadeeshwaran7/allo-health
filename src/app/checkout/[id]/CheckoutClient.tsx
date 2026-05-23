"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatTimeRemaining, getTimeRemainingPercent } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    description: string | null;
  };
}

type PageState =
  | { kind: "loading" }
  | { kind: "error"; code: number; message: string }
  | { kind: "loaded"; reservation: Reservation }
  | { kind: "confirmed"; reservation: Reservation }
  | { kind: "cancelled" }
  | { kind: "expired" };

export default function CheckoutClient({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [timeLeft, setTimeLeft] = useState("");
  const [percent, setPercent] = useState(100);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations?id=${reservationId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (res.status === 410) {
        setState({ kind: "expired" });
        return;
      }

      if (!res.ok) {
        setState({ kind: "error", code: res.status, message: data.error || "Failed to load reservation." });
        return;
      }

      setState({ kind: "loaded", reservation: data.reservation });
    } catch {
      setState({ kind: "error", code: 500, message: "Network error loading reservation." });
    }
  }, [reservationId]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  // Countdown timer
  useEffect(() => {
    if (state.kind !== "loaded") return;
    const { expiresAt } = state.reservation;

    const tick = () => {
      const remaining = formatTimeRemaining(expiresAt);
      const pct = getTimeRemainingPercent(expiresAt);
      setTimeLeft(remaining);
      setPercent(pct);

      if (remaining === "Expired") {
        setState({ kind: "expired" });
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  async function handleConfirm() {
    if (state.kind !== "loaded") return;
    setConfirming(true);
    setActionError(null);

    const idempotencyKey = uuidv4();

    try {
      const res = await fetch(`/api/reservations/${reservationId}/confirm`, {
        method: "PATCH",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const data = await res.json();

      if (res.status === 410) {
        setState({ kind: "expired" });
        return;
      }

      if (!res.ok) {
        setActionError(data.error || "Failed to confirm purchase.");
        return;
      }

      setState({ kind: "confirmed", reservation: data.reservation });
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancel() {
    if (state.kind !== "loaded") return;
    setCancelling(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to cancel reservation.");
        return;
      }

      setState({ kind: "cancelled" });
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  // ---- Render states ----

  if (state.kind === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        <p className="text-gray-400">Loading reservation...</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <span className="text-3xl">⚠</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">
          {state.code === 404 ? "Reservation Not Found" : "Something Went Wrong"}
        </h1>
        <p className="mb-6 text-gray-400">{state.message}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl gradient-brand px-6 py-3 text-sm font-bold text-white hover:opacity-90"
        >
          Back to Products
        </button>
      </div>
    );
  }

  if (state.kind === "expired") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
          <span className="text-3xl">⏰</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Reservation Expired</h1>
        <p className="mb-2 text-gray-400">
          Your 10-minute hold has ended and the units have been returned to available stock.
        </p>
        <p className="mb-6 text-sm text-orange-400 font-medium">
          HTTP 410 — Reservation Expired
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl gradient-brand px-6 py-3 text-sm font-bold text-white hover:opacity-90"
        >
          Reserve Again
        </button>
      </div>
    );
  }

  if (state.kind === "confirmed") {
    const { reservation } = state;
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full gradient-success shadow-lg shadow-green-500/30">
          <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-2 text-3xl font-extrabold text-white">Order Confirmed!</h1>
        <p className="mb-1 text-gray-400">
          Your purchase of <span className="font-semibold text-white">{reservation.product.name}</span> is confirmed.
        </p>
        <p className="mb-6 text-2xl font-bold text-green-400">
          {formatCurrency(reservation.product.price * reservation.quantity)}
        </p>
        <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 px-5 py-4 text-left text-sm text-gray-400">
          <div className="flex justify-between mb-2">
            <span>Order ID</span>
            <span className="font-mono text-xs text-gray-300">{reservation.id}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Quantity</span>
            <span className="text-white">{reservation.quantity}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span className="font-semibold text-green-400">CONFIRMED</span>
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl gradient-brand px-6 py-3 text-sm font-bold text-white hover:opacity-90"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  if (state.kind === "cancelled") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-700/50">
          <span className="text-3xl">✕</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Reservation Cancelled</h1>
        <p className="mb-6 text-gray-400">
          Your hold has been released. The units are now available to other shoppers.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl gradient-brand px-6 py-3 text-sm font-bold text-white hover:opacity-90"
        >
          Back to Products
        </button>
      </div>
    );
  }

  // ---- Main checkout view ----
  const { reservation } = state;
  const isUrgent = percent < 25;

  return (
    <div className="mx-auto max-w-4xl relative">
      {/* Background glow for checkout */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="mb-10 relative z-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-3 tracking-tight">Complete <span className="gradient-text">Checkout</span></h1>
        <p className="text-gray-400 text-lg">Secure your items before the reservation expires.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-5 relative z-10">
        {/* Order summary - Left Column */}
        <div className="md:col-span-3 flex flex-col gap-6">
          {/* Countdown */}
          <div
            className={`glass-panel rounded-2xl p-6 overflow-hidden relative transition-colors duration-500 ${
              isUrgent
                ? "bg-red-500/10 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                : "border-indigo-500/20"
            }`}
          >
            {isUrgent && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
            
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`flex items-center justify-center w-10 h-10 rounded-full ${isUrgent ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  {isUrgent ? '⚠️' : '⏱'}
                </span>
                <span className="text-sm font-semibold text-gray-300">
                  {isUrgent ? "Hurry! Reservation expiring soon" : "Time remaining to complete purchase"}
                </span>
              </div>
              <span
                className={`text-3xl font-display font-bold tabular-nums tracking-wider ${
                  isUrgent ? "text-red-400 countdown-urgent" : "text-indigo-400"
                }`}
              >
                {timeLeft}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-black/40 relative z-10">
              <div
                className={`h-full rounded-full transition-all duration-1000 relative overflow-hidden ${
                  isUrgent ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : percent < 50 ? "bg-indigo-400 shadow-[0_0_10px_#818cf8]" : "bg-indigo-500"
                }`}
                style={{ width: `${percent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[translateX_2s_infinite]" style={{ transform: 'translateX(-100%)' }} />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-8">
            <h2 className="mb-6 text-xl font-bold text-white font-display border-b border-white/10 pb-4">Order Summary</h2>
            <div className="flex flex-col sm:flex-row gap-6">
              {reservation.product.imageUrl ? (
                <img
                  src={reservation.product.imageUrl}
                  alt={reservation.product.name}
                  className="h-32 w-32 rounded-xl object-cover flex-shrink-0 shadow-lg"
                />
              ) : (
                <div className="h-32 w-32 rounded-xl bg-white/5 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-white mb-2 font-display">
                  {reservation.product.name}
                </h3>
                {reservation.product.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                    {reservation.product.description}
                  </p>
                )}
                <div className="flex items-end justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Quantity</span>
                    <span className="text-lg font-medium text-white">{reservation.quantity}</span>
                  </div>
                  <span className="text-3xl font-extrabold text-white">
                    {formatCurrency(reservation.product.price * reservation.quantity).replace('.00', '')}
                    <span className="text-lg text-gray-400">.00</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions - Right Column */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full blur-[30px]" />
            <h2 className="mb-6 text-xl font-bold text-white font-display border-b border-white/10 pb-4 relative z-10">Payment Details</h2>
            
            <div className="mb-8 space-y-4 text-sm text-gray-400 relative z-10">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="text-white font-medium">{formatCurrency(reservation.product.price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Shipping</span>
                <span className="badge-glass px-2 py-0.5 rounded text-green-400 text-xs">Free</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-4 text-xl font-bold text-white mt-2">
                <span>Total</span>
                <span className="text-indigo-400">{formatCurrency(reservation.product.price * reservation.quantity)}</span>
              </div>
            </div>

            {actionError && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-sm flex items-start gap-2">
                <span className="text-red-400">⚠️</span> {actionError}
              </div>
            )}

            <button
              id="confirm-purchase-btn"
              onClick={handleConfirm}
              disabled={confirming || cancelling}
              className={`relative z-10 w-full rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all duration-300 mb-4 ${
                confirming
                  ? "cursor-wait bg-indigo-600/50 text-indigo-200 border border-indigo-500/30"
                  : "btn-shiny text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
              }`}
            >
              {confirming ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Complete Purchase"
              )}
            </button>

            <button
              id="cancel-reservation-btn"
              onClick={handleCancel}
              disabled={confirming || cancelling}
              className={`relative z-10 w-full rounded-xl px-6 py-3.5 text-sm font-bold transition-all duration-200 border ${
                cancelling
                  ? "cursor-wait bg-white/5 text-gray-500 border-transparent"
                  : "border-white/10 bg-transparent text-gray-400 hover:bg-white/5 hover:text-white hover:border-white/20"
              }`}
            >
              {cancelling ? "Releasing hold..." : "Cancel Reservation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
