"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function UserNav() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="h-8 w-24 animate-pulse rounded-lg bg-white/5"></div>;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="btn-shiny px-4 py-2 text-sm font-bold text-white rounded-xl shadow-lg"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition-colors"
      >
        {session.user?.image ? (
          <img src={session.user.image} alt="Avatar" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
            {session.user?.name?.charAt(0) || "U"}
          </div>
        )}
        <span className="text-sm font-medium text-gray-200">{session.user?.name?.split(" ")[0]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#030712]/95 backdrop-blur-xl p-2 shadow-2xl z-50">
          <Link
            href="/orders"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            📦 My Orders
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full text-left rounded-lg px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
