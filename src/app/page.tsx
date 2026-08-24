import Link from "next/link";

export const metadata = {
  title: "Theseus Capital",
  description: "An AI-focused fund.",
};

function Monogram({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full border border-primary/40 bg-primary/10 ${className}`}
      aria-hidden
    >
      <span className="font-display leading-none text-primary">Θ</span>
    </span>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* faint vignette to seat the content */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, transparent 55%, oklch(0.1 0.004 75 / 0.55) 100%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Monogram className="h-8 w-8 text-lg" />
          <span className="font-display text-sm tracking-[0.28em] text-foreground/90">
            THESEUS&nbsp;CAPITAL
          </span>
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-medium tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:text-sm"
        >
          Investor Login
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-6 text-center">
        <p
          className="text-xs tracking-[0.32em] text-primary/90"
          data-anim
          style={{ animation: "theseus-rise 0.9s ease both", animationDelay: "0.95s" }}
        >
          AI-FOCUSED FUND
        </p>
        <h1
          className="font-display mt-6 text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-7xl"
          data-anim
          style={{ animation: "theseus-rise 0.9s ease both", animationDelay: "1.05s" }}
        >
          Theseus Capital
        </h1>
        <p
          className="font-display mt-6 max-w-xl text-balance text-lg italic text-muted-foreground sm:text-xl"
          data-anim
          style={{ animation: "theseus-rise 0.9s ease both", animationDelay: "1.2s" }}
        >
          Investing at the intersection of markets and machine intelligence.
        </p>
        <Link
          href="/login"
          className="group mt-10 inline-flex items-center gap-2 text-sm tracking-wide text-primary"
          data-anim
          style={{ animation: "theseus-rise 0.9s ease both", animationDelay: "1.35s" }}
        >
          <span className="border-b border-primary/40 pb-0.5 transition-colors group-hover:border-primary">
            Investor Login
          </span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-6 pb-8 text-center text-xs tracking-wide text-muted-foreground/70">
        © {new Date().getFullYear()} Theseus Capital · By invitation only
      </footer>

      {/* Loader veil — the mark appears centered on every load, then lifts */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background: "oklch(0.12 0.005 75)",
          animation: "theseus-veil-out 1.9s ease forwards",
        }}
        data-anim
      >
        <div
          className="flex flex-col items-center"
          style={{ animation: "theseus-mark-in 1.3s ease both" }}
        >
          <Monogram className="h-16 w-16 text-4xl" />
          <p className="font-display mt-5 text-xs tracking-[0.5em] text-foreground/70">
            THESEUS CAPITAL
          </p>
        </div>
      </div>
    </main>
  );
}
