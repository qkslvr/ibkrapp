import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No IBKR connect gate — login is handled by the app password (middleware);
  // IBKR is connected out-of-band via the SSH tunnel. The dashboard renders
  // straight away, using live data when the gateway is up and the last saved
  // data otherwise. The header badge shows which.
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
