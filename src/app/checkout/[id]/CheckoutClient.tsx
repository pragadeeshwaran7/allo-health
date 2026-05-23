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
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/")}
          className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back to products
        </button>
        <h1 className="text-3xl font-extrabold text-white">Checkout</h1>
        <p className="text-gray-400">Complete your purchase before your reservation expires.</p>
      </div>

      {/* Countdown */}
      <div
        className={`mb-6 rounded-2xl border p-5 ${
          isUrgent
            ? "border-red-500/30 bg-red-500/5"
            : "border-yellow-500/20 bg-yellow-500/5"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-300">
            {isUrgent ? "⚠ Hurry! Reservation expiring soon" : "⏱ Time remaining to complete purchase"}
          </span>
          <span
            className={`text-2xl font-mono font-bold tabular-nums ${
              isUrgent ? "text-red-400 countdown-urgent" : "text-yellow-400"
            }`}
          >
            {timeLeft}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isUrgent ? "bg-red-500" : percent < 50 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Expires at {new Date(reservation.expiresAt).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Order summary */}
        <div className="md:col-span-3 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Order Summary</h2>
          <div className="flex gap-4">
            {reservation.product.imageUrl && (
              <img
                src={reservation.product.imageUrl}
                alt={reservation.product.name}
                className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-white leading-tight">
                {reservation.product.name}
              </h3>
              {reservation.product.description && (
                <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                  {reservation.product.description}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  Qty: {reservation.quantity}
                </span>
                <span className="text-xl font-bold text-blue-400">
                  {formatCurrency(reservation.product.price * reservation.quantity)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2 border-t border-gray-800 pt-4 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Reservation ID</span>
              <span className="font-mono text-xs text-gray-300 truncate ml-4">{reservation.id}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Status</span>
              <span className="text-yellow-400 font-semibold">PENDING</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Complete Purchase</h2>
            <div className="mb-4 space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white">{formatCurrency(reservation.product.price)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-green-400">Free</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2 text-base font-bold text-white">
                <span>Total</span>
                <span>{formatCurrency(reservation.product.price * reservation.quantity)}</span>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                ⚠ {actionError}
              </div>
            )}

            <button
              id="confirm-purchase-btn"
              onClick={handleConfirm}
              disabled={confirming || cancelling}
              className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
                confirming
                  ? "cursor-wait bg-green-700 text-green-200"
                  : "gradient-success text-white hover:opacity-90 hover:shadow-lg hover:shadow-green-500/25 active:scale-95"
              }`}
            >
              {confirming ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Confirming...
                </span>
              ) : (
                "✓ Confirm Purchase"
              )}
            </button>

            <button
              id="cancel-reservation-btn"
              onClick={handleCancel}
              disabled={confirming || cancelling}
              className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                cancelling
                  ? "cursor-wait bg-gray-800 text-gray-400"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {cancelling ? "Cancelling..." : "✕ Cancel Reservation"}
            </button>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-xs text-gray-500">
            <p className="mb-1 font-semibold text-gray-400">What happens next?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Confirming permanently places your order</li>
              <li>Cancelling returns units to available stock</li>
              <li>Expiry auto-releases units after 10 min</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
