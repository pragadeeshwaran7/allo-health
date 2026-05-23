import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import UserNav from "@/components/UserNav";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Allo Inventory | Premium Stock Reservation",
  description:
    "Reserve products across multiple warehouses with real-time stock management. Next-gen premium aesthetic.",
  keywords: ["inventory", "reservation", "stock", "warehouse", "ecommerce"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans min-h-screen bg-[#030712] text-gray-100 antialiased selection:bg-indigo-500/30 overflow-x-hidden relative">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <Providers>
          <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl">
            <div className="mx-auto max-w-4xl px-8 lg:px-12">
              <div className="flex h-16 items-center justify-between">
                <a href="/" className="flex items-center gap-3 group">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] group-hover:shadow-[0_0_25px_rgba(79,70,229,0.8)] transition-all">
                    <span className="text-sm font-bold font-display">A</span>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-white font-display">
                    Allo <span className="text-indigo-400">Inventory</span>
                  </span>
                </a>
                <div className="flex items-center gap-4">
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400 ring-1 ring-green-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
                    Live Stock
                  </span>
                  <UserNav />
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-4xl px-8 py-12 lg:px-12 relative z-10 flex-1">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
