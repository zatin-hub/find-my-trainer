import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find My Trainer — Bengaluru's crowdsourced trainer map",
  description:
    "Find a fitness trainer your neighbours actually rate — anonymously, on a map, with no spam calls. Free.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-200 antialiased">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070b]/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="text-xl">📍</span>
              <span className="text-lg tracking-tight text-white">
                find<span className="text-emerald-400">my</span>trainer
              </span>
              <span className="ml-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-400">
                Bengaluru
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium">
              <Link href="/activities" className="btn-ghost">
                Browse
              </Link>
              <Link href="/add" className="btn-primary">
                + Recommend a trainer
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-12 border-t border-white/10 py-8 text-center text-xs text-slate-500">
          <p>
            Free &amp; crowdsourced. We never sell your data or your number.
            Sample data shown for local development.
          </p>
        </footer>
      </body>
    </html>
  );
}
