"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Package, LogOut } from "lucide-react";

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
        className="btn-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black rounded-lg shadow-sm"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition-all duration-300 hover:border-white/20 active:scale-95"
      >
        {session.user?.image ? (
          <img src={session.user.image} alt="Avatar" className="h-6 w-6 rounded-full ring-1 ring-white/20" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-300">
            {session.user?.name?.charAt(0) || "U"}
          </div>
        )}
        <span className="text-sm font-medium text-gray-200">{session.user?.name?.split(" ")[0]}</span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl glass-panel p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
            <p className="text-xs text-gray-400 font-semibold truncate">{session.user?.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{session.user?.email}</p>
          </div>
          <Link
            href="/orders"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Package className="h-4 w-4 text-brand-indigo" />
            My Orders
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-400" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
