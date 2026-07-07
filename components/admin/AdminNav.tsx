"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavBadges {
  reports: number;
  pendingRecs: number;
  pendingTrainers: number;
}

const ITEMS = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/trainers", label: "Trainers", icon: "🏋️", badge: "pendingTrainers" as const },
  { href: "/admin/recommendations", label: "Recommendations", icon: "💬", badge: "pendingRecs" as const },
  { href: "/admin/reports", label: "Reports", icon: "🚩", badge: "reports" as const },
  { href: "/admin/alerts", label: "Match alerts", icon: "🔔" },
  { href: "/admin/map", label: "Map & usage", icon: "🗺️" },
  { href: "/admin/audit", label: "Audit log", icon: "📜" },
];

export default function AdminNav({ badges }: { badges: NavBadges }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 overflow-x-auto lg:w-52 lg:shrink-0 lg:flex-col lg:overflow-visible"
    >
      {ITEMS.map((it) => {
        const active =
          it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
        const count = it.badge ? badges[it.badge] : 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-pink-500/15 text-pink-200"
                : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span aria-hidden>{it.icon}</span>
            <span className="whitespace-nowrap">{it.label}</span>
            {count > 0 && (
              <span className="ml-auto rounded-full bg-rose-500/80 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
