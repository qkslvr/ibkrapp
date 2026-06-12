"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Bell, RefreshCw, Wifi, WifiOff, Database } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIBKRAuth } from "@/hooks/useIBKRAuth";
import { useQueryClient } from "@tanstack/react-query";

function ConnectionBadge({
  connected,
  hasCachedData,
}: {
  connected: boolean;
  hasCachedData: boolean;
}) {
  if (connected) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[oklch(0.72_0.19_145)]/30 bg-[oklch(0.72_0.19_145)]/10 px-2.5 py-1 text-xs font-medium text-[oklch(0.72_0.19_145)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.72_0.19_145)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.72_0.19_145)]" />
        </span>
        IBKR Live
      </div>
    );
  }

  if (hasCachedData) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"
        title="Showing your last saved portfolio data. Connect IBKR gateway to refresh."
      >
        <Database className="h-3 w-3" />
        Last saved data
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-muted-foreground"
      title="IBKR gateway not connected. Showing demo data."
    >
      <WifiOff className="h-3 w-3" />
      Demo data
    </div>
  );
}

export function Header() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { connected, hasCachedData, loading } = useIBKRAuth();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-md">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search stocks, commands..."
          className="h-9 bg-secondary/50 pl-9 text-sm focus-visible:ring-1"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Connection Status Badge */}
        {!loading && (
          <ConnectionBadge connected={connected} hasCachedData={hasCachedData} />
        )}

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleRefresh}
        >
          <RefreshCw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  IB
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">Account</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Account Settings</DropdownMenuItem>
            <DropdownMenuItem>IBKR Connection</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
