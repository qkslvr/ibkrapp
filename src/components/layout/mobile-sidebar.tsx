"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "./sidebar";
import { cn } from "@/lib/utils";

// Hamburger + slide-in drawer for the sidebar on small screens (lg:hidden).
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change and lock body scroll while open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border/50 bg-sidebar transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-3 h-8 w-8"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>
    </div>
  );
}
