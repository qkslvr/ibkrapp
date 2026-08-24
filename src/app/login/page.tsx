"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "email" | "login" | "create";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.allowed) {
        setError("This email is not authorized for access.");
      } else {
        setStep(data.hasPassword ? "login" : "create");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step === "create" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (step === "create" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const endpoint = step === "create" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Unable to sign in.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("email");
    setPassword("");
    setConfirm("");
    setError("");
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-2 text-xs tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground sm:left-10 sm:top-8"
      >
        ← THESEUS CAPITAL
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
            <span className="font-display text-2xl leading-none text-primary">Θ</span>
          </span>
          <h1 className="font-display mt-4 text-2xl">Investor Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "email" && "Enter your email to continue."}
            {step === "login" && "Enter your password to sign in."}
            {step === "create" && "Set a password to finish creating your access."}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xl backdrop-blur-sm">
          {step === "email" ? (
            <form onSubmit={checkEmail} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                autoComplete="email"
                className={inputCls}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Checking…" : "Continue"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                <span className="truncate text-muted-foreground">{email}</span>
                <button type="button" onClick={reset} className="shrink-0 text-xs text-primary hover:underline">
                  Change
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={step === "create" ? "Create a password" : "Password"}
                autoFocus
                autoComplete={step === "create" ? "new-password" : "current-password"}
                className={inputCls}
              />
              {step === "create" && (
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={inputCls}
                />
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading || !password || (step === "create" && !confirm)}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading
                  ? step === "create"
                    ? "Creating…"
                    : "Signing in…"
                  : step === "create"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Access is limited to authorized investors.
        </p>
      </div>
    </main>
  );
}
