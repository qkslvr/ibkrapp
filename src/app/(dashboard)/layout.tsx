import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No IBKR connect gate — login is handled by the app password (middleware);
  // IBKR is connected out-of-band via the SSH tunnel. The dashboard renders
  // straight away, using live data when the gateway is up and the last saved
  // data otherwise. The header badge shows which. AppShell owns the desktop
  // sidebar's show/hide state.
  return <AppShell>{children}</AppShell>;
}
