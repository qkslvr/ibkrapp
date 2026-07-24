"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  LineChart,
  Wallet,
  History,
  Eye,
  Settings,
  TrendingUp,
  Building2,
  Filter,
} from "lucide-react";

export const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Performance", href: "/performance", icon: LineChart },
  { name: "Income", href: "/income", icon: Wallet },
  { name: "Transactions", href: "/transactions", icon: History },
  { name: "Fund NAV", href: "/nav", icon: Building2 },
  { name: "Watchlist", href: "/watchlist", icon: Eye },
  { name: "Screener", href: "/screener", icon: Filter },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Shared inner content — used by the desktop rail and the mobile drawer.
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.72_0.15_255)] to-[oklch(0.62_0.2_285)] shadow-lg shadow-[oklch(0.72_0.15_255)]/20">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Portfolio</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Connection Status */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-[oklch(0.72_0.19_145)]" />
          <span>IBKR Connected</span>
        </div>
      </div>
    </>
  );
}

// Desktop rail — hidden below the lg breakpoint (mobile uses the drawer).
export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border/50 bg-sidebar lg:flex">
      <SidebarContent />
    </aside>
  );
}
