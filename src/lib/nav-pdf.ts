// Client-side monthly NAV report → PDF. jsPDF + autotable are dynamically
// imported so they stay out of the initial page bundle and only load when a
// user actually clicks "Download PDF".
import type { NAVSummary } from "@/types";

function money(n: number, dp = 2) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function num(n: number, dp = 4) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function pct(n: number) {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}
function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function dayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Build and download a one-month NAV report PDF: the fund's month-end summary,
 * the capital subscriptions booked that month (with their FX conversion and
 * units issued), the NAV movement over the month, and the full daily
 * balance/NAV table for the month.
 */
export async function downloadMonthlyReport(nav: NAVSummary, month: string): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const snapshot = nav.monthly.find((m) => m.month === month);
  const monthDeposits = nav.deposits.filter((d) => d.date.startsWith(month));
  const monthDaily = nav.daily
    .filter((d) => d.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));

  const startNav = monthDaily[0]?.nav ?? 100;
  const endNav = monthDaily[monthDaily.length - 1]?.nav ?? snapshot?.nav ?? 100;
  const navChangePct = startNav > 0 ? ((endNav - startNav) / startNav) * 100 : 0;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("Fund NAV Report", marginX, 48);
  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  doc.text(monthLabel(month), marginX, 68);
  doc.setDrawColor(210, 210, 210);
  doc.line(marginX, 78, pageW - marginX, 78);

  // Month-end summary
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const summaryRows: string[][] = [
    ["Month-end portfolio value", snapshot ? money(snapshot.portfolioValue) : "—"],
    ["Units outstanding", snapshot ? num(snapshot.totalUnits) : "—"],
    ["NAV / unit (month end)", snapshot ? money(snapshot.nav) : money(endNav)],
    ["NAV movement over month", `${money(startNav)} → ${money(endNav)}  (${pct(navChangePct)})`],
    ["Return vs base ($100)", snapshot ? pct(snapshot.returnPct) : pct(endNav - 100)],
  ];
  autoTable(doc, {
    startY: 92,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { textColor: [110, 110, 110] }, 1: { halign: "right", fontStyle: "bold" } },
    body: summaryRows,
    margin: { left: marginX, right: marginX },
  });

  // Capital subscriptions booked this month
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Capital Subscriptions", marginX, y);
  autoTable(doc, {
    startY: y + 8,
    head: [["Date", "Amount Invested", "NAV @ Sub", "Units Issued", "Effect on NAV"]],
    body:
      monthDeposits.length > 0
        ? monthDeposits.map((d) => [
            dayLabel(d.date),
            d.originalCurrency && d.originalCurrency !== "USD"
              ? `${money(d.amount)}  (${d.originalCurrency} ${num(d.originalAmount, 2)})`
              : money(d.amount),
            money(d.navAtDeposit),
            num(d.unitsIssued),
            "Neutral (units issued at NAV)",
          ])
        : [["—", "No subscriptions this month", "", "", ""]],
    headStyles: { fillColor: [40, 40, 45], textColor: [245, 245, 245], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: marginX, right: marginX },
  });

  // Daily balance & NAV for the month
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Daily Portfolio Balance & NAV", marginX, y);
  autoTable(doc, {
    startY: y + 8,
    head: [["Date", "Portfolio Balance", "Units Outstanding", "NAV / Unit", "Return vs Base"]],
    body: monthDaily.map((d) => [
      dayLabel(d.date),
      money(d.portfolioValue),
      num(d.totalUnits),
      money(d.nav),
      pct(d.returnPct),
    ]),
    headStyles: { fillColor: [40, 40, 45], textColor: [245, 245, 245], fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: marginX, right: marginX },
    didParseCell: (data) => {
      // colour the return column
      if (data.section === "body" && data.column.index === 4) {
        const val = String(data.cell.raw);
        data.cell.styles.textColor = val.startsWith("-") ? [200, 50, 50] : [30, 150, 70];
      }
    },
  });

  // Footer note
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated ${new Date().toLocaleString("en-US")}. NAV / unit = portfolio balance ÷ units outstanding. Base NAV = $100.`,
    marginX,
    finalY,
  );

  doc.save(`NAV-Report-${month}.pdf`);
}
