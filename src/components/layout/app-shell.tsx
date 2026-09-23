"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sidebarCollapsed";

// Client shell that owns the desktop sidebar's show/hide state so the sidebar,
// the content offset, and the header toggle button all stay in sync. The choice
// is remembered across reloads.
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        <Header />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
