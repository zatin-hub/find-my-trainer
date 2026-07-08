import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CitySwitcher from "@/components/CitySwitcher";
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
        <header className="glass sticky top-0 z-50 rounded-none border-x-0 border-t-0 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2 font-bold">
                <span className="text-xl">📍</span>
                <span className="text-lg tracking-tight text-white">
                  find<span className="text-pink-400">my</span>trainer
                </span>
              </Link>
              <Suspense
                fallback={
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-400">
                    Bengaluru
                  </span>
                }
              >
                <CitySwitcher />
              </Suspense>
            </div>
            <nav className="flex items-center gap-2 text-sm font-medium">
              <Link href="/alert" className="btn-outline">
                🔔 Get a match alert
              </Link>
              <Link href="/add" className="btn-primary">
                Recommend a trainer
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-12 border-t border-white/10 py-8 text-center text-xs text-slate-500">
          <p>Free &amp; crowdsourced. We never sell your data or your number.</p>
          <p className="mt-1">
            <a href="/privacy" className="underline hover:text-slate-300">
              Privacy Policy
            </a>{" "}
            ·{" "}
            <a href="/terms" className="underline hover:text-slate-300">
              Terms of Use
            </a>
          </p>
          <p className="mt-1">
            Map data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-300"
            >
              OpenStreetMap contributors
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
