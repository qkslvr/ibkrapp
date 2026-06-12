"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChangeIndicator } from "@/components/dashboard/change-indicator";
import { usePositions } from "@/hooks/usePositions";
import { useTransactions } from "@/hooks/useTransactions";
import { useStockQuote } from "@/hooks/useStockQuote";
import { useStockFundamentals } from "@/hooks/useStockFundamentals";
import { useStockAnalysts } from "@/hooks/useStockAnalysts";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Bell,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge as BadgeComponent } from "@/components/ui/badge";

export default function StockDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string).toUpperCase();

  const { data: positions } = usePositions();
  const { data: allTransactions } = useTransactions();
  const { data: quote, isLoading: quoteLoading } = useStockQuote(symbol);
  const { data: fundamentalsData, isLoading: fundamentalsLoading } = useStockFundamentals(symbol);
  const { data: analyst, isLoading: analystLoading } = useStockAnalysts(symbol);

  const position = positions?.find((p) => p.symbol === symbol);
  const stockTransactions = allTransactions?.filter((t) => t.symbol === symbol) ?? [];

  const fundamentals = fundamentalsData?.fundamentals;
  const dividend = fundamentalsData?.dividend;

  const isPositive = (quote?.change ?? 0) >= 0;
  const totalRatings = analyst ? analyst.buy + analyst.hold + analyst.sell : 0;

  return (
    <div className="space-y-6">
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portfolio
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Bell className="mr-2 h-4 w-4" />
            Set Alert
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add to Watchlist
          </Button>
        </div>
      </div>

      {/* Stock Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-xl font-bold">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{symbol}</h1>
              <BadgeComponent variant="secondary">
                {position?.sector ?? quote?.name ? "—" : "—"}
              </BadgeComponent>
            </div>
            <p className="text-muted-foreground">
              {quote?.name ?? position?.name ?? symbol}
            </p>
          </div>
        </div>

        <div className="text-right">
          {quoteLoading ? (
            <div className="h-10 w-32 animate-pulse rounded bg-secondary" />
          ) : quote ? (
            <>
              <p className="text-3xl font-bold">${quote.price.toFixed(2)}</p>
              <div
                className={cn(
                  "flex items-center justify-end gap-2 text-lg font-medium",
                  isPositive
                    ? "text-[oklch(0.72_0.19_145)]"
                    : "text-[oklch(0.65_0.22_25)]"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span>
                  {isPositive ? "+" : ""}${quote.change.toFixed(2)} (
                  {isPositive ? "+" : ""}
                  {quote.changePercent.toFixed(2)}%)
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time · Finnhub
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No quote available</p>
          )}
        </div>
      </div>

      {/* Position Card (if owned) */}
      {position && (
        <Card className="border-border/50 bg-card/50 p-6">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Your Position
          </h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-6">
            <div>
              <p className="text-xs text-muted-foreground">Shares</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {position.shares}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Cost</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                ${position.avgCost.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost Basis</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                ${position.costBasis.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Market Value</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                ${position.marketValue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Return</p>
              <ChangeIndicator
                value={position.unrealizedPL}
                percentage={position.unrealizedPLPercent}
                className="mt-1 text-lg"
                size="md"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Portfolio Weight</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {position.weight.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Price Stats */}
            <Card className="border-border/50 bg-card/50 p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Price Statistics
              </h3>
              {quoteLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-5 animate-pulse rounded bg-secondary" />
                  ))}
                </div>
              ) : quote ? (
                <div className="space-y-3">
                  {[
                    { label: "Open", value: `$${quote.open.toFixed(2)}` },
                    { label: "Previous Close", value: `$${quote.prevClose.toFixed(2)}` },
                    { label: "Day High", value: `$${quote.high.toFixed(2)}` },
                    { label: "Day Low", value: `$${quote.low.toFixed(2)}` },
                    { label: "52W High", value: quote.high52w ? `$${quote.high52w.toFixed(2)}` : "—" },
                    { label: "52W Low", value: quote.low52w ? `$${quote.low52w.toFixed(2)}` : "—" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-mono text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </Card>

            {/* Volume & Market Cap */}
            <Card className="border-border/50 bg-card/50 p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Volume & Market Cap
              </h3>
              {quoteLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-5 animate-pulse rounded bg-secondary" />
                  ))}
                </div>
              ) : quote ? (
                <>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Avg Volume",
                        value: quote.avgVolume
                          ? (quote.avgVolume / 1_000_000).toFixed(2) + "M"
                          : "—",
                      },
                      {
                        label: "Market Cap",
                        value: quote.marketCap
                          ? "$" + (quote.marketCap / 1_000_000_000_000).toFixed(2) + "T"
                          : "—",
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="font-mono text-sm">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* 52W Range Bar */}
                  {quote.high52w > 0 && quote.low52w > 0 && (
                    <div className="mt-6">
                      <p className="mb-2 text-sm text-muted-foreground">
                        52 Week Range
                      </p>
                      <div className="relative h-2 rounded-full bg-secondary">
                        <div
                          className="absolute h-2 rounded-full bg-primary"
                          style={{
                            left: `${
                              ((quote.price - quote.low52w) /
                                (quote.high52w - quote.low52w)) *
                              100
                            }%`,
                            width: "4px",
                          }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span>${quote.low52w.toFixed(2)}</span>
                        <span>${quote.high52w.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Fundamentals Tab */}
        <TabsContent value="fundamentals" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/50 bg-card/50 p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Valuation
              </h3>
              {fundamentalsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-5 animate-pulse rounded bg-secondary" />
                  ))}
                </div>
              ) : fundamentals ? (
                <div className="space-y-3">
                  {[
                    { label: "P/E Ratio (TTM)", value: fundamentals.peRatio > 0 ? fundamentals.peRatio.toFixed(2) : "—" },
                    { label: "Forward P/E", value: fundamentals.forwardPE > 0 ? fundamentals.forwardPE.toFixed(2) : "—" },
                    { label: "EPS (TTM)", value: fundamentals.eps !== 0 ? `$${fundamentals.eps.toFixed(2)}` : "—" },
                    { label: "EPS Growth", value: fundamentals.epsGrowth !== 0 ? `${fundamentals.epsGrowth.toFixed(1)}%` : "—" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-mono text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </Card>

            <Card className="border-border/50 bg-card/50 p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Profitability
              </h3>
              {fundamentalsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-5 animate-pulse rounded bg-secondary" />
                  ))}
                </div>
              ) : fundamentals ? (
                <div className="space-y-3">
                  {[
                    { label: "Revenue Growth", value: fundamentals.revenueGrowth !== 0 ? `${fundamentals.revenueGrowth.toFixed(1)}%` : "—" },
                    { label: "Profit Margin", value: fundamentals.profitMargin !== 0 ? `${fundamentals.profitMargin.toFixed(1)}%` : "—" },
                    { label: "ROE", value: fundamentals.roe !== 0 ? `${fundamentals.roe.toFixed(1)}%` : "—" },
                    { label: "ROA", value: fundamentals.roa !== 0 ? `${fundamentals.roa.toFixed(1)}%` : "—" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-mono text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </Card>

            <Card className="border-border/50 bg-card/50 p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                Dividends
              </h3>
              {fundamentalsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-5 animate-pulse rounded bg-secondary" />
                  ))}
                </div>
              ) : dividend ? (
                <div className="space-y-3">
                  {[
                    { label: "Dividend Yield", value: dividend.yield > 0 ? `${dividend.yield.toFixed(2)}%` : "—" },
                    { label: "Annual Dividend", value: dividend.annualDividend > 0 ? `$${dividend.annualDividend.toFixed(2)}` : "—" },
                    { label: "Payout Ratio", value: dividend.payoutRatio > 0 ? `${dividend.payoutRatio.toFixed(1)}%` : "—" },
                    { label: "Debt/Equity", value: fundamentals?.debtEquity ? fundamentals.debtEquity.toFixed(2) : "—" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-mono text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No dividend data</p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card className="border-border/50 bg-card/50 p-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Analyst Ratings
            </h3>

            {analystLoading ? (
              <div className="h-24 animate-pulse rounded bg-secondary" />
            ) : analyst ? (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Rating Distribution */}
                <div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[oklch(0.72_0.19_145)]">
                        {analyst.buy}
                      </p>
                      <p className="text-xs text-muted-foreground">Buy</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{analyst.hold}</p>
                      <p className="text-xs text-muted-foreground">Hold</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[oklch(0.65_0.22_25)]">
                        {analyst.sell}
                      </p>
                      <p className="text-xs text-muted-foreground">Sell</p>
                    </div>
                  </div>

                  {totalRatings > 0 && (
                    <>
                      <div className="mt-4 flex h-3 overflow-hidden rounded-full">
                        <div
                          className="bg-[oklch(0.72_0.19_145)]"
                          style={{ width: `${(analyst.buy / totalRatings) * 100}%` }}
                        />
                        <div
                          className="bg-muted-foreground"
                          style={{ width: `${(analyst.hold / totalRatings) * 100}%` }}
                        />
                        <div
                          className="bg-[oklch(0.65_0.22_25)]"
                          style={{ width: `${(analyst.sell / totalRatings) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Based on {totalRatings} analysts
                      </p>
                    </>
                  )}
                </div>

                {/* Price Targets */}
                <div>
                  <h4 className="mb-3 text-sm font-medium">Price Targets</h4>
                  <div className="space-y-2">
                    {[
                      { label: "Low", value: analyst.targetLow },
                      { label: "Average", value: analyst.targetMean },
                      { label: "High", value: analyst.targetHigh },
                    ].map((target) => (
                      <div key={target.label} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          {target.label}
                        </span>
                        <span className="font-mono text-sm">
                          {target.value > 0 ? `$${target.value.toFixed(2)}` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {analyst.targetMean > 0 && quote && (
                    <div className="mt-4 rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        Upside to Average Target
                      </p>
                      <p className="font-mono text-lg font-semibold text-[oklch(0.72_0.19_145)]">
                        +
                        {(
                          ((analyst.targetMean - quote.price) / quote.price) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No analyst data available</p>
            )}
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card className="border-border/50 bg-card/50 p-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Transaction History
            </h3>

            {stockTransactions.length > 0 ? (
              <div className="space-y-3">
                {stockTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg bg-secondary/30 p-3"
                  >
                    <div>
                      <Badge
                        variant={tx.type === "BUY" ? "default" : "secondary"}
                      >
                        {tx.type}
                      </Badge>
                      <p className="mt-1 text-sm">
                        {tx.shares} shares @ ${tx.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium">
                        ${tx.total.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                No transactions for this stock
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* External Links */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <a
          href={`https://finance.yahoo.com/quote/${symbol}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground"
        >
          Yahoo Finance <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={`https://www.tradingview.com/symbols/${symbol}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground"
        >
          TradingView <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
