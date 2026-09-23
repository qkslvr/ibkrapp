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
  Building2,
  Filter,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Performance", href: "/performance", icon: LineChart },
  { name: "Income", href: "/income", icon: Wallet },
  { name: "Transactions", href: "/transactions", icon: History },
  { name: "Fund NAV", href: "/nav", icon: Building2 },
  { name: "Watchlist", href: "/watchlist", icon: Eye },
  { name: "Screener", href: "/screener", icon: Filter },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Shared inner content — used by the desktop rail and the mobile drawer.
// When `collapsed`, it becomes an icon-only rail: labels hide, icons center, and
// hovering an icon highlights it (with the name as a tooltip).
export function SidebarContent({
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-border/50",
          collapsed ? "justify-center px-0" : "px-6"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <span className="font-display text-lg leading-none text-primary">M</span>
        </div>
        {!collapsed && <span className="font-display text-base tracking-wide">Metallic Capital</span>}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 py-4", collapsed ? "px-2" : "px-3")}>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.name : undefined}
              className={cn(
                "relative flex items-center rounded-lg text-sm font-medium transition-all",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer: collapse toggle (desktop) + connection status */}
      <div className={cn("space-y-1.5 border-t border-border/50 py-3", collapsed ? "px-2" : "px-3")}>
        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center rounded-lg text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                Collapse
              </>
            )}
          </button>
        )}
        <div
          className={cn(
            "flex items-center gap-2 px-3 text-xs text-muted-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="h-2 w-2 shrink-0 rounded-full bg-[oklch(0.72_0.19_145)]" />
          {!collapsed && <span>IBKR Connected</span>}
        </div>
      </div>
    </>
  );
}

// Desktop rail — hidden below the lg breakpoint (mobile uses the drawer).
// `collapsed` narrows it to an icon rail; the AppShell shrinks the content offset.
export function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border/50 bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} onToggle={onToggle} />
    </aside>
  );
}
