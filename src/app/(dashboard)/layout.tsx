import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { IBKRGate } from "@/components/layout/ibkr-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IBKRGate>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <Header />
          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </IBKRGate>
  );
}
