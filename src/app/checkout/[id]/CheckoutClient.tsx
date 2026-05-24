"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatCurrency, formatTimeRemaining, getTimeRemainingPercent } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { 
  CreditCard, 
  Calendar, 
  ShieldAlert, 
  Check, 
  ShoppingBag, 
  X, 
  Lock, 
  Timer, 
  ArrowRight, 
  RefreshCw 
} from "lucide-react";

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
  const { data: session } = useSession();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [timeLeft, setTimeLeft] = useState("");
  const [percent, setPercent] = useState(100);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Credit Card Form States
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

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
      // Pre-fill card name from session
      if (session?.user?.name) {
        setCardName(session.user.name);
      }
    } catch {
      setState({ kind: "error", code: 500, message: "Network error loading reservation." });
    }
  }, [reservationId, session]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReservation();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchReservation]);

  // Set card name when session resolves
  useEffect(() => {
    if (session?.user?.name && !cardName) {
      const timer = setTimeout(() => {
        setCardName(session.user.name!);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session, cardName]);

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

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    // Clean card number
    const cleanNumber = cardNumber.replace(/\s+/g, "");
    if (cleanNumber.length !== 16 || !/^\d+$/.test(cleanNumber)) {
      errors.cardNumber = "Must be a valid 16-digit card number";
    }

    if (!cardName.trim()) {
      errors.cardName = "Cardholder name is required";
    }

    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      errors.cardExpiry = "Expiry date must be in MM/YY format";
    } else {
      const [month] = cardExpiry.split("/").map(Number);
      if (month < 1 || month > 12) {
        errors.cardExpiry = "Month must be between 01 and 12";
      }
    }

    if (cardCvv.length !== 3 || !/^\d+$/.test(cardCvv)) {
      errors.cardCvv = "CVV must be 3 digits";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "loaded") return;

    // Validate the payment inputs
    if (!validateForm()) return;

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

  // Formatting helpers for inputs
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ").slice(0, 19);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    setCardExpiry(value.slice(0, 5));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCardCvv(value.slice(0, 3));
  };

  // ---- Render states ----

  if (state.kind === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-brand-indigo" />
        <p className="text-gray-400 font-medium tracking-wide">Retrieving secured lock allocation...</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white font-display">
          {state.code === 404 ? "Reservation Not Found" : "Retrieval Fault"}
        </h1>
        <p className="mb-8 text-gray-400 leading-relaxed text-sm">{state.message}</p>
        <button
          onClick={() => router.push("/")}
          className="btn-primary rounded-lg px-6 py-3 text-xs font-bold uppercase tracking-wider text-black"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  if (state.kind === "expired") {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Timer className="h-8 w-8 animate-pulse" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white font-display">Lock Expiry Triggered</h1>
        <p className="mb-4 text-gray-400 text-sm leading-relaxed">
          The 10-minute hold window has completed. The allocated units have been released back to stock to ensure concurrency fairness.
        </p>
        <p className="mb-8 text-xs text-brand-pink font-mono">
          HTTP 410 — RESERVATION_EXPIRED
        </p>
        <button
          onClick={() => router.push("/")}
          className="btn-primary rounded-lg px-6 py-3 text-xs font-bold uppercase tracking-wider text-black"
        >
          Reserve Another Unit
        </button>
      </div>
    );
  }

  if (state.kind === "confirmed") {
    const { reservation } = state;
    return (
      <div className="mx-auto max-w-lg py-16 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Check className="h-8 w-8 stroke-[2.5]" />
        </div>
        
        <h1 className="mb-2 text-3xl font-black text-white font-display tracking-tight">Order Confirmed!</h1>
        <p className="mb-2 text-gray-400 text-sm leading-relaxed">
          Your allocation of <span className="font-semibold text-white">{reservation.product.name}</span> has been processed successfully.
        </p>
        
        <p className="mb-8 text-3xl font-black text-brand-emerald">
          {formatCurrency(reservation.product.price * reservation.quantity)}
        </p>
        
        <div className="mb-8 rounded-xl border border-white/10 bg-[#121214] p-5 text-left text-xs text-gray-400 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold uppercase tracking-wider text-gray-500">Secure Order Hash</span>
            <span className="font-mono text-gray-300 select-all">{reservation.id}</span>
          </div>
          <div className="w-full h-px bg-white/[0.04]" />
          <div className="flex justify-between items-center">
            <span className="font-semibold uppercase tracking-wider text-gray-500">Quantity</span>
            <span className="text-white font-bold">{reservation.quantity} Unit(s)</span>
          </div>
          <div className="w-full h-px bg-white/[0.04]" />
          <div className="flex justify-between items-center">
            <span className="font-semibold uppercase tracking-wider text-gray-500">Fulfillment Status</span>
            <span className="font-bold text-brand-emerald flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald animate-ping" />
              CONFIRMED
            </span>
          </div>
        </div>
        
        <button
          onClick={() => router.push("/orders")}
          className="btn-primary w-full rounded-lg px-6 py-3 text-xs font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2"
        >
          <span>View My Orders</span>
          <ArrowRight className="h-4.5 w-4.5 text-black" />
        </button>
      </div>
    );
  }

  if (state.kind === "cancelled") {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gray-400">
          <X className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white font-display">Hold Released</h1>
        <p className="mb-8 text-gray-400 text-sm leading-relaxed">
          Your lock has been cleared. The reserved unit has been returned immediately to the pool.
        </p>
        <button
          onClick={() => router.push("/")}
          className="btn-primary rounded-lg px-6 py-3 text-xs font-bold uppercase tracking-wider text-black"
        >
          Back to Catalog
        </button>
      </div>
    );
  }

  // ---- Main checkout view ----
  const { reservation } = state;
  const isUrgent = percent < 25;

  return (
    <div className="mx-auto max-w-4xl relative">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Checkout</h1>
        <p className="text-gray-400 text-sm">Verify your stock allocation hold and enter simulated payment details.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Left Column (Order details and Timer) */}
        <div className="md:col-span-7 flex flex-col gap-6">
          {/* Countdown timer banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all duration-300 ${
              isUrgent
                ? "bg-red-500/10 border-red-500/20 text-red-400 countdown-urgent"
                : "bg-amber-500/10 border-amber-500/20 text-amber-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>{isUrgent ? "Your reservation hold is expiring soon" : "Stock temporarily held for you"}</span>
            </span>
            <span className="font-mono text-sm font-bold">{timeLeft}</span>
          </div>

          {/* Product details */}
          <div className="border border-white/5 bg-[#121214] rounded-2xl p-6">
            <h2 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-gray-500 pb-2 border-b border-white/[0.04]">
              Inventory Details
            </h2>
            <div className="flex flex-col sm:flex-row gap-6">
              {reservation.product.imageUrl ? (
                <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-black/25 flex-shrink-0">
                  <img
                    src={reservation.product.imageUrl}
                    alt={reservation.product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-24 w-24 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-center text-gray-700 flex-shrink-0">
                  <ShoppingBag className="h-6 w-6 stroke-[1]" />
                </div>
              )}
              
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight">
                  {reservation.product.name}
                </h3>
                {reservation.product.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                    {reservation.product.description}
                  </p>
                )}
                <div className="flex items-end justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Quantity</span>
                    <span className="text-xs font-bold text-white">{reservation.quantity} Unit(s)</span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    ₹{reservation.product.price.toLocaleString("en-IN")}.00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Credit Card details & Confirmation) */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <form onSubmit={handleConfirm} className="border border-white/5 bg-[#121214] rounded-2xl p-6">
            <h2 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-gray-500 pb-2 border-b border-white/[0.04]">
              Payment details
            </h2>

            {/* Interactive Credit Card Widget Preview */}
            <div className="mb-6">
              <div className="credit-card-widget rounded-2xl p-5 h-44 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <div className="credit-card-chip" />
                  <CreditCard className="h-7 w-7 text-white/50" />
                </div>
                
                {/* Simulated Number */}
                <div className="font-mono text-lg tracking-widest my-2 select-none h-6 flex items-center">
                  {cardNumber ? (
                    <span>
                      {cardNumber}
                      {focusedField === "cardNumber" && <span className="blink-cursor" />}
                    </span>
                  ) : (
                    <span className="text-white/20">•••• •••• •••• ••••</span>
                  )}
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex-1 min-w-0 pr-4">
                    <span className="text-[9px] uppercase tracking-wider text-white/40 block">Cardholder</span>
                    <span className="text-xs font-bold tracking-wider truncate block uppercase h-4">
                      {cardName ? (
                        <span>
                          {cardName}
                          {focusedField === "cardName" && <span className="blink-cursor" />}
                        </span>
                      ) : (
                        <span className="text-white/20">Name Surname</span>
                      )}
                    </span>
                  </div>
                  
                  <div className="w-14 text-right">
                    <span className="text-[9px] uppercase tracking-wider text-white/40 block">Expiry</span>
                    <span className="text-xs font-mono font-bold tracking-wider block h-4">
                      {cardExpiry ? (
                        <span>
                          {cardExpiry}
                          {focusedField === "cardExpiry" && <span className="blink-cursor" />}
                        </span>
                      ) : (
                        <span className="text-white/20">MM/YY</span>
                      )}
                    </span>
                  </div>

                  <div className="w-10 text-right ml-2">
                    <span className="text-[9px] uppercase tracking-wider text-white/40 block">CVV</span>
                    <span className="text-xs font-mono font-bold tracking-wider block h-4">
                      {cardCvv ? (
                        <span>
                          {focusedField === "cardCvv" ? cardCvv : "•••"}
                          {focusedField === "cardCvv" && <span className="blink-cursor" />}
                        </span>
                      ) : (
                        <span className="text-white/20">•••</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs grid */}
            <div className="space-y-4 mb-6">
              {/* Cardholder Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  onFocus={() => setFocusedField("cardName")}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full rounded-xl border bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-300 ${
                    formErrors.cardName
                      ? "border-red-500/50 focus:border-red-500 focus:bg-red-500/[0.02]"
                      : "border-white/5 focus:border-brand-indigo focus:bg-brand-indigo/[0.02]"
                  }`}
                />
                {formErrors.cardName && (
                  <p className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> {formErrors.cardName}
                  </p>
                )}
              </div>

              {/* Card Number */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    onFocus={() => setFocusedField("cardNumber")}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full rounded-xl border bg-white/[0.02] pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-gray-600 outline-none transition-all duration-300 ${
                      formErrors.cardNumber
                        ? "border-red-500/50 focus:border-red-500 focus:bg-red-500/[0.02]"
                        : "border-white/5 focus:border-brand-indigo focus:bg-brand-indigo/[0.02]"
                    }`}
                  />
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                </div>
                {formErrors.cardNumber && (
                  <p className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> {formErrors.cardNumber}
                  </p>
                )}
              </div>

              {/* Expiry & CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Expiry Date
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      onFocus={() => setFocusedField("cardExpiry")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full rounded-xl border bg-white/[0.02] pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-gray-600 outline-none transition-all duration-300 ${
                        formErrors.cardExpiry
                          ? "border-red-500/50 focus:border-red-500 focus:bg-red-500/[0.02]"
                          : "border-white/5 focus:border-brand-indigo focus:bg-brand-indigo/[0.02]"
                      }`}
                    />
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  </div>
                  {formErrors.cardExpiry && (
                    <p className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> {formErrors.cardExpiry}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Security CVV
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="•••"
                      value={cardCvv}
                      onChange={handleCvvChange}
                      onFocus={() => setFocusedField("cardCvv")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full rounded-xl border bg-white/[0.02] pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-gray-600 outline-none transition-all duration-300 ${
                        formErrors.cardCvv
                          ? "border-red-500/50 focus:border-red-500 focus:bg-red-500/[0.02]"
                          : "border-white/5 focus:border-brand-indigo focus:bg-brand-indigo/[0.02]"
                      }`}
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  </div>
                  {formErrors.cardCvv && (
                    <p className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> {formErrors.cardCvv}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="mb-6 space-y-3.5 text-xs text-gray-400">
              <div className="flex justify-between items-center">
                <span>Items Subtotal</span>
                <span className="text-white font-medium">
                  {formatCurrency(reservation.product.price)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hold Guarantee Fee</span>
                <span className="badge-glass px-2.5 py-0.5 rounded-full text-brand-emerald text-[10px] font-bold uppercase">
                  Free
                </span>
              </div>
              <div className="w-full h-px bg-white/[0.06] my-1" />
              <div className="flex justify-between items-center text-sm font-bold text-white">
                <span>Grand Total</span>
                <span className="text-brand-indigo text-lg font-black font-display">
                  {formatCurrency(reservation.product.price * reservation.quantity)}
                </span>
              </div>
            </div>

            {actionError && (
              <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-xs text-red-300 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{actionError}</span>
              </div>
            )}

            {/* Actions */}
            <button
              type="submit"
              id="confirm-purchase-btn"
              disabled={confirming || cancelling}
              className={`w-full rounded-lg px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 mb-3 ${
                confirming
                  ? "cursor-wait bg-white/20 text-white flex items-center justify-center gap-2 border border-white/10"
                  : "btn-primary text-black flex items-center justify-center gap-2"
              }`}
            >
              {confirming ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Verifying Transaction...</span>
                </>
              ) : (
                <span>Complete Purchase</span>
              )}
            </button>

            <button
              type="button"
              id="cancel-reservation-btn"
              onClick={handleCancel}
              disabled={confirming || cancelling}
              className={`w-full rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                cancelling
                  ? "cursor-wait bg-white/[0.02] text-gray-500 border-transparent"
                  : "border-white/10 bg-transparent text-gray-400 hover:bg-white/[0.02] hover:text-white hover:border-white/20"
              }`}
            >
              {cancelling ? "Releasing unit..." : "Release Hold"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
