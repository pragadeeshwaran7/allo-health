import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import UserNav from "@/components/UserNav";
import Link from "next/link";

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
      <body className="font-sans min-h-screen text-gray-100 antialiased selection:bg-white/10 overflow-x-hidden relative">
        <div className="grid-overlay" />
        
        <Providers>
          <div className="flex flex-col min-h-screen w-full items-center relative z-10">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md flex justify-center">
              <div className="w-full max-w-4xl px-6 sm:px-8">
                <div className="flex h-16 items-center justify-between">
                  <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-lg font-bold tracking-tight text-white font-display">
                      Allo <span className="text-gray-400 font-normal">Inventory</span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-5">
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Stock Sync
                    </span>
                    <a
                      href="https://github.com/pragadeeshwaran7/allo-health.git"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors flex items-center"
                      title="GitHub Repository"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                      </svg>
                    </a>
                    <UserNav />
                  </div>
                </div>
              </div>
            </header>
            
            {/* Main Content */}
            <main className="w-full max-w-4xl px-6 sm:px-8 py-12 flex-1">
              {children}
            </main>

            {/* Clean Footer */}
            <footer className="w-full border-t border-white/[0.08] bg-[#09090b]/50 backdrop-blur-sm flex justify-center py-8 mt-12">
              <div className="w-full max-w-4xl px-6 sm:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-gray-500 font-medium">
                <div className="flex flex-wrap justify-center gap-5">
                  <span className="hover:text-gray-300 transition-colors">Distributed Lock</span>
                  <span className="hover:text-gray-300 transition-colors">10m Expiry Hold</span>
                  <span className="hover:text-gray-300 transition-colors">Serializable Transactions</span>
                </div>
                <div className="flex items-center gap-4">
                  <a
                    href="https://github.com/pragadeeshwaran7/allo-health.git"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-gray-300 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub
                  </a>
                  <span>© {new Date().getFullYear()} Allo Health.</span>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
