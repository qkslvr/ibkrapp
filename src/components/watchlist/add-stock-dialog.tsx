"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAddToWatchlist } from "@/hooks/useWatchlist";
import { Plus, Loader2 } from "lucide-react";

export function AddStockDialog({ existing }: { existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const addToWatchlist = useAddToWatchlist();

  const reset = () => {
    setValue("");
    setError(null);
    setValidating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (!symbol) return;

    if (existing.includes(symbol)) {
      setError(`${symbol} is already in your watchlist`);
      return;
    }

    setError(null);
    setValidating(true);
    try {
      // Validate the symbol exists by checking it returns a live quote.
      const res = await fetch(`/api/market/quote/${symbol}`);
      const quote = res.ok ? await res.json() : null;
      if (!quote || !quote.price) {
        setError(`Couldn't find a quote for "${symbol}"`);
        return;
      }
      await addToWatchlist.mutateAsync(symbol);
      reset();
      setOpen(false);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to watchlist</DialogTitle>
          <DialogDescription>
            Enter a ticker symbol to track its live price.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            autoFocus
            placeholder="e.g. NVDA"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            className="uppercase"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={validating || !value.trim()}>
              {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
