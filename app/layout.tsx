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
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="text-xl">📍</span>
              <span className="text-lg tracking-tight">
                find<span className="text-emerald-600">my</span>trainer
              </span>
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                Bengaluru
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium">
              <Link
                href="/activities"
                className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
              >
                Browse
              </Link>
              <Link
                href="/add"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
              >
                + Recommend a trainer
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
          <p>
            Free & crowdsourced. We never sell your data or your number. Sample
            data shown for local development.
          </p>
        </footer>
      </body>
    </html>
  );
}
