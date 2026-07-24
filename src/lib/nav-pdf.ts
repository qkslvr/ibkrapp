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

// jsPDF type is imported dynamically; use a minimal structural type here.
type Doc = {
  setDrawColor: (r: number, g: number, b: number) => void;
  setFillColor: (r: number, g: number, b: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setFontSize: (n: number) => void;
  setLineWidth: (n: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  text: (t: string, x: number, y: number, opts?: unknown) => void;
};

// Simple NAV line chart drawn with primitives (no chart lib in the PDF).
function drawNavChart(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  points: { date: string; nav: number }[],
) {
  // frame
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h);
  if (points.length === 0) return;

  const navs = points.map((p) => p.nav);
  let min = Math.min(...navs, 100);
  let max = Math.max(...navs, 100);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;

  const px = (i: number) => x + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const py = (v: number) => y + h - ((v - min) / (max - min)) * h;

  // base-$100 reference line (dashed-ish)
  if (100 >= min && 100 <= max) {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    const yb = py(100);
    for (let gx = x; gx < x + w; gx += 6) doc.line(gx, yb, Math.min(gx + 3, x + w), yb);
  }

  // NAV polyline
  doc.setDrawColor(30, 120, 200);
  doc.setLineWidth(1.2);
  for (let i = 1; i < points.length; i++) {
    doc.line(px(i - 1), py(navs[i - 1]), px(i), py(navs[i]));
  }

  // min/max labels
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("$" + max.toFixed(2), x + 2, y + 8);
  doc.text("$" + min.toFixed(2), x + 2, y + h - 3);
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
  // Weighted-average subscription cost per unit — the reference the fund's
  // money-weighted return is measured against (not the $100 base).
  const avgCost = nav.avgCostPerUnit || 100;
  const retVsAvg = (v: number) => (avgCost > 0 ? ((v - avgCost) / avgCost) * 100 : 0);

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
    ["NAV movement over month", `${money(startNav)} -> ${money(endNav)}  (${pct(navChangePct)})`],
    ["Average cost / unit", money(avgCost)],
    ["Return vs avg cost", pct(retVsAvg(endNav))],
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

  // NAV movement line chart for the month
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("NAV per Unit — Movement", marginX, y);
  drawNavChart(
    doc as unknown as Doc,
    marginX,
    y + 8,
    pageW - marginX * 2,
    110,
    monthDaily.map((d) => ({ date: d.date, nav: d.nav })),
  );
  y += 8 + 110;

  // Capital subscriptions booked this month
  y += 24;
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
    head: [["Date", "Portfolio Balance", "Units Outstanding", "NAV / Unit", "Daily Chg", "Return vs Avg Cost"]],
    body: monthDaily.map((d) => [
      dayLabel(d.date),
      money(d.portfolioValue),
      num(d.totalUnits),
      money(d.nav),
      pct(d.navChangePct ?? 0),
      pct(retVsAvg(d.nav)),
    ]),
    headStyles: { fillColor: [40, 40, 45], textColor: [245, 245, 245], fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: marginX, right: marginX },
    didParseCell: (data) => {
      // colour the daily-change and return columns
      if (data.section === "body" && (data.column.index === 4 || data.column.index === 5)) {
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
