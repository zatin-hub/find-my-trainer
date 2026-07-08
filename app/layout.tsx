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
        {/* Near-opaque: content scrolling underneath must not bleed through. */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0812]/95 backdrop-blur-xl">
          <div className="flex w-full items-center justify-between gap-2 px-3 py-3 md:gap-4 md:px-5">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-1.5 font-bold md:gap-2">
                <span className="text-lg max-[359px]:hidden md:text-xl">📍</span>
                <span className="text-sm tracking-tight text-white md:text-lg">
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
            <nav className="flex shrink-0 items-center gap-2 text-sm font-medium">
              <Link
                href="/alert"
                aria-label="Get a match alert"
                className="btn-outline whitespace-nowrap px-2 md:px-3.5"
              >
                🔔<span className="hidden md:inline"> Get a match alert</span>
              </Link>
              <Link href="/add" className="btn-primary whitespace-nowrap px-3 md:px-4">
                <span className="hidden md:inline">Recommend a trainer</span>
                <span className="md:hidden">+ Add</span>
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
