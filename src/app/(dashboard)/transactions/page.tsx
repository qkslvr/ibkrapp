"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransactions } from "@/hooks/useTransactions";
import { Transaction } from "@/types";
import {
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  ArrowLeftRight,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const typeConfig = {
  BUY: {
    icon: ArrowUpRight,
    color: "text-[oklch(0.72_0.19_145)]",
    bgColor: "bg-[oklch(0.72_0.19_145)]",
  },
  SELL: {
    icon: ArrowDownRight,
    color: "text-[oklch(0.65_0.22_25)]",
    bgColor: "bg-[oklch(0.65_0.22_25)]",
  },
  DIVIDEND: {
    icon: Coins,
    color: "text-[oklch(0.7_0.15_250)]",
    bgColor: "bg-[oklch(0.7_0.15_250)]",
  },
  TRANSFER: {
    icon: ArrowLeftRight,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([
    "BUY",
    "SELL",
    "DIVIDEND",
    "TRANSFER",
  ]);

  const { data: transactions = [], isLoading } = useTransactions(365);

  const filteredTransactions = (transactions as Transaction[])
    .filter(
      (tx) =>
        tx.symbol.toLowerCase().includes(search.toLowerCase()) &&
        typeFilter.includes(tx.type)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totals = filteredTransactions.reduce(
    (acc, tx) => {
      if (tx.type === "BUY") acc.bought += tx.total;
      if (tx.type === "SELL") acc.sold += tx.total;
      if (tx.type === "DIVIDEND") acc.dividends += tx.total;
      return acc;
    },
    { bought: 0, sold: 0, dividends: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            View your complete transaction history
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Trade history is sourced from IBKR Flex Activity Query. Dividend transactions are
          sourced from Yahoo Finance based on your current holdings.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-sm text-muted-foreground">Total Bought</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            ${totals.bought.toLocaleString()}
          </p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-sm text-muted-foreground">Total Sold</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[oklch(0.72_0.19_145)]">
            ${totals.sold.toLocaleString()}
          </p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-sm text-muted-foreground">Dividends Received</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[oklch(0.7_0.15_250)]">
            ${totals.dividends.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Type
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {["BUY", "SELL", "DIVIDEND", "TRANSFER"].map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={typeFilter.includes(type)}
                onCheckedChange={(checked) => {
                  setTypeFilter(
                    checked
                      ? [...typeFilter, type]
                      : typeFilter.filter((t) => t !== type)
                  );
                }}
              >
                {type}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Transactions Table */}
      <Card className="border-border/50 bg-card/50">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading transactions...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => {
                  const config = typeConfig[tx.type];
                  const Icon = config.icon;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1", config.color)}
                        >
                          <Icon className="h-3 w-3" />
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{tx.symbol}</TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${tx.price.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono font-medium",
                          tx.type === "SELL" && "text-[oklch(0.72_0.19_145)]",
                          tx.type === "DIVIDEND" && "text-[oklch(0.7_0.15_250)]"
                        )}
                      >
                        {tx.type === "BUY" ? "-" : "+"}$
                        {tx.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
