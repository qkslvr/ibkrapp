"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Link2,
  Bell,
  Palette,
  Database,
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your dashboard preferences and connections
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* IBKR Connection */}
          <Card className="border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">IBKR Connection</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[oklch(0.72_0.19_145)]" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Gateway: localhost:5000
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[oklch(0.72_0.19_145)]">
                  Active
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Gateway URL
                  </label>
                  <Input
                    defaultValue="https://localhost:5000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Account ID
                  </label>
                  <Input defaultValue="U******7" className="mt-1" disabled />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
                <Button variant="outline" className="text-destructive">
                  Disconnect
                </Button>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>

            <div className="mt-4 space-y-4">
              {[
                {
                  title: "Price Alerts",
                  description: "Get notified when stocks hit target prices",
                  enabled: true,
                },
                {
                  title: "Dividend Notifications",
                  description: "Alerts for upcoming dividend payments",
                  enabled: true,
                },
                {
                  title: "Large Position Changes",
                  description: "Notify when positions change by >5%",
                  enabled: false,
                },
                {
                  title: "Daily Summary",
                  description: "Daily portfolio summary email",
                  enabled: false,
                },
              ].map((notification, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-4"
                >
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {notification.description}
                    </p>
                  </div>
                  <Button
                    variant={notification.enabled ? "default" : "outline"}
                    size="sm"
                  >
                    {notification.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Display Preferences */}
          <Card className="border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Display Preferences</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Theme</label>
                <div className="mt-2 flex gap-2">
                  <Button variant="default" size="sm">
                    Dark
                  </Button>
                  <Button variant="outline" size="sm">
                    Light
                  </Button>
                  <Button variant="outline" size="sm">
                    System
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm text-muted-foreground">
                  Default Chart Timeframe
                </label>
                <div className="mt-2 flex gap-2">
                  {["1D", "1W", "1M", "3M", "YTD", "1Y"].map((tf) => (
                    <Button
                      key={tf}
                      variant={tf === "1M" ? "default" : "outline"}
                      size="sm"
                    >
                      {tf}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Currency Display
                  </label>
                  <Input defaultValue="USD ($)" className="mt-1" disabled />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Number Format
                  </label>
                  <Input defaultValue="1,234.56" className="mt-1" disabled />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Data Status */}
          <Card className="border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Data Status</h2>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Sync</span>
                <span>2 min ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Positions</span>
                <span>10 holdings</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transactions</span>
                <span>156 records</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cache Size</span>
                <span>2.4 MB</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <RefreshCw className="mr-2 h-3 w-3" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Clear Cache
              </Button>
            </div>
          </Card>

          {/* Security */}
          <Card className="border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Security</h2>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[oklch(0.72_0.19_145)]">
                <CheckCircle2 className="h-4 w-4" />
                <span>HTTPS Connection</span>
              </div>
              <div className="flex items-center gap-2 text-[oklch(0.72_0.19_145)]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Local Gateway Only</span>
              </div>
              <div className="flex items-center gap-2 text-[oklch(0.72_0.19_145)]">
                <CheckCircle2 className="h-4 w-4" />
                <span>No Data Stored Remotely</span>
              </div>
            </div>
          </Card>

          {/* Version */}
          <Card className="border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">About</h2>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <Badge variant="secondary">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Build</span>
                <span className="font-mono text-xs">2026.02.18</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
