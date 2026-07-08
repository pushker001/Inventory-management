import React, { useEffect, useState } from "react";
import { api, rupee, monthLabel, currentMonth } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

const csvEscape = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function ProfitReport() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/reports/monthly?month=${month}`).then((r) => setData(r.data));
  }, [month]);

  const download = () => {
    if (!data) return;
    const headers = ["SKU", "Category", "Brand", "Opening Units", "Opening Value", "Purchased Units", "Purchased Value", "Sold WH Units", "Sold WH Value", "Sold RT Units", "Sold RT Value", "Damaged Units", "Damage Cost", "COGS", "Closing Units", "Closing Value", "Gross Profit"];
    const lines = [headers.join(",")];
    for (const r of data.rows) {
      lines.push([
        r.sku_name, r.category, r.brand,
        r.opening_units.toFixed(2), r.opening_value.toFixed(2),
        r.purchased_units.toFixed(2), r.purchased_value.toFixed(2),
        r.sold_units_wh.toFixed(2), r.sold_value_wh.toFixed(2),
        r.sold_units_rt.toFixed(2), r.sold_value_rt.toFixed(2),
        r.damaged_units.toFixed(2), r.damage_cost.toFixed(2),
        r.cogs.toFixed(2), r.closing_units.toFixed(2), r.closing_value.toFixed(2),
        r.gross_profit.toFixed(2),
      ].map(csvEscape).join(","));
    }
    lines.push("");
    lines.push(`Summary,${month}`);
    lines.push(`Total Sales,${data.summary.total_sales.toFixed(2)}`);
    lines.push(`Total COGS,${data.summary.total_cogs.toFixed(2)}`);
    lines.push(`Gross Profit,${data.summary.gross_profit.toFixed(2)}`);
    lines.push(`Expenses,${data.summary.total_expenses.toFixed(2)}`);
    lines.push(`Damage Loss,${data.summary.total_damage_cost.toFixed(2)}`);
    lines.push(`Net Profit,${data.summary.net_profit.toFixed(2)}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  if (!data) return <div className="p-6">Loading…</div>;
  const s = data.summary;

  return (
    <div className="px-5 pt-8">
      <PageHeader title="Monthly Profit" subtitle={monthLabel(month)} />

      <div className="flex gap-2 items-center mb-4">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="report-month" className="h-11" />
        <Button variant="outline" onClick={download} data-testid="export-csv" className="h-11 rounded-xl">
          <Download size={16} className="mr-1" /> CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-primary to-[hsl(15_60%_42%)] text-primary-foreground">
          <div className="text-xs uppercase tracking-widest opacity-80">Net Profit</div>
          <div data-testid="report-net-profit" className="text-3xl font-heading font-bold mt-1">{rupee(s.net_profit)}</div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/40">
          <SumCell label="Sales" v={s.total_sales} />
          <SumCell label="COGS" v={s.total_cogs} />
          <SumCell label="Gross Profit" v={s.gross_profit} tone="good" />
          <SumCell label="Expenses" v={s.total_expenses} tone="bad" />
          <SumCell label="Damage Loss" v={s.total_damage_cost} tone="bad" />
          <SumCell label="Net" v={s.net_profit} tone={s.net_profit >= 0 ? "good" : "bad"} />
        </div>
      </div>

      {/* Per-SKU rows */}
      <h3 className="mt-6 mb-3 font-heading font-semibold text-lg">By product</h3>
      <div className="space-y-2">
        {data.rows.map((r) => (
          <div key={r.sku_id} data-testid={`report-row-${r.sku_id}`} className="bg-white rounded-2xl p-4 border border-border/60">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{r.sku_name}</div>
                <div className="text-[11px] text-muted-foreground">{r.brand} • {r.category}</div>
              </div>
              <div className={`text-right ${r.gross_profit >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                <div className="text-xs text-muted-foreground">Profit</div>
                <div className="font-heading font-semibold text-sm">{rupee(r.gross_profit)}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
              <MicroStat label="Opening" v={`${Math.round(r.opening_units)}u`} />
              <MicroStat label="Bought" v={`${Math.round(r.purchased_units)}u`} />
              <MicroStat label="Sold" v={`${Math.round(r.sold_units_wh + r.sold_units_rt)}u`} />
              <MicroStat label="Closing" v={`${Math.round(r.closing_units)}u`} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>WH: {Math.round(r.sold_units_wh)}u · {rupee(r.sold_value_wh)}</span>
              <span>RT: {Math.round(r.sold_units_rt)}u · {rupee(r.sold_value_rt)}</span>
            </div>
          </div>
        ))}
        {!data.rows.length && (
          <div className="text-center text-sm text-muted-foreground py-10 flex flex-col items-center">
            <FileText className="mb-2 text-muted-foreground" />
            No transactions this month yet.
          </div>
        )}
      </div>
    </div>
  );
}

const SumCell = ({ label, v, tone }) => {
  const cls = tone === "good" ? "text-[hsl(var(--success))]" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="bg-white p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-heading font-semibold ${cls}`}>{rupee(v)}</div>
    </div>
  );
};

const MicroStat = ({ label, v }) => (
  <div className="bg-muted/50 rounded-lg py-1.5 px-2">
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-xs font-medium">{v}</div>
  </div>
);
