"use client";

import { useState } from "react";
import { useIBKRAuth } from "@/hooks/useIBKRAuth";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Database } from "lucide-react";

const GATEWAY_LOGIN_URL =
  process.env.NEXT_PUBLIC_GATEWAY_LOGIN_URL ??
  "https://localhost:5001/sso/Login?forwardTo=22&RL=1&ip2loc=on";

function ConnectScreen({
  hasCachedData,
  onUseCached,
}: {
  hasCachedData: boolean;
  onUseCached: () => void;
}) {
  const handleOpen = () => {
    window.open(GATEWAY_LOGIN_URL, "_blank", "width=520,height=680");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex flex-col items-center gap-8 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <span className="text-3xl font-bold text-primary">IB</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">IBKR Dashboard</h1>
          <p className="text-muted-foreground">
            Connect to Interactive Brokers to view your live portfolio
          </p>
        </div>

        {/* Primary action */}
        <div className="flex flex-col items-center gap-3">
          <Button size="lg" className="h-12 gap-2 px-8 text-base" onClick={handleOpen}>
            <ExternalLink className="h-5 w-5" />
            Open IBKR Login
          </Button>
          <p className="max-w-xs text-xs text-muted-foreground">
            Sign in with your IBKR credentials and approve the 2FA prompt on your
            phone. This page detects the connection automatically.
          </p>
        </div>

        {/* Polling indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for connection...
        </div>

        {/* Steps */}
        <div className="flex gap-10 text-xs text-muted-foreground">
          {[
            { step: "1", label: "Click Open IBKR Login" },
            { step: "2", label: "Sign in + approve 2FA" },
            { step: "3", label: "Return here — auto connects" },
          ].map(({ step, label }) => (
            <div key={step} className="flex flex-col items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {step}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Cached data bypass */}
        {hasCachedData && (
          <button
            onClick={onUseCached}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Database className="h-4 w-4" />
            Continue with last saved data instead
          </button>
        )}
      </div>
    </div>
  );
}

export function IBKRGate({ children }: { children: React.ReactNode }) {
  const { connected, hasCachedData, loading } = useIBKRAuth();
  const [useCached, setUseCached] = useState(false);

  // First load — checking auth
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <span className="text-2xl font-bold text-primary">IB</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </div>
        </div>
      </div>
    );
  }

  // Connected live, or user chose to use cached data
  if (connected || useCached) {
    return <>{children}</>;
  }

  // Not connected — show connect screen
  return (
    <ConnectScreen
      hasCachedData={hasCachedData}
      onUseCached={() => setUseCached(true)}
    />
  );
}
