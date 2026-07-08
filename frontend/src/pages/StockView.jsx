import React, { useEffect, useState, useMemo } from "react";
import { api, rupee } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search } from "lucide-react";

export default function StockView() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/reports/stock").then((r) => setData(r.data)); }, []);

  const grouped = useMemo(() => {
    if (!data) return {};
    const rows = data.rows.filter((r) => r.sku_name.toLowerCase().includes(q.toLowerCase()) && !r.archived);
    return rows.reduce((acc, r) => {
      (acc[r.category] ||= []).push(r);
      return acc;
    }, {});
  }, [data, q]);

  const totalValue = data ? data.rows.filter(r => !r.archived).reduce((a, r) => a + r.value, 0) : 0;

  if (!data) return <div className="p-6">Loading…</div>;

  return (
    <div className="px-5 pt-8">
      <PageHeader title="Stock on Hand" subtitle="What's in your godown right now" />

      <div className="bg-gradient-to-br from-primary to-[hsl(15_60%_42%)] text-primary-foreground rounded-2xl p-5 mb-4">
        <div className="text-xs uppercase tracking-widest opacity-80">Total stock value</div>
        <div data-testid="stock-total" className="text-2xl font-heading font-bold mt-1">{rupee(totalValue)}</div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product" className="pl-9 h-11" data-testid="stock-search" />
      </div>

      {Object.entries(grouped).map(([cat, rows]) => (
        <div key={cat} className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">{cat}</h3>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.sku_id} data-testid={`stock-row-${r.sku_id}`} className="bg-white rounded-2xl p-4 border border-border/60 flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {r.sku_name}
                    {r.is_slow_moving && (
                      <span title="High stock — check movement" className="inline-flex items-center gap-0.5 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">
                        <AlertTriangle size={10} /> High
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {r.brand} · {Math.round(r.units)} units ({(r.units / r.units_per_box).toFixed(1)} boxes)
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-heading font-semibold text-sm">{rupee(r.value)}</div>
                  <div className="text-[10px] text-muted-foreground">@ {rupee(r.avg_cost_per_unit)}/u</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!Object.keys(grouped).length && (
        <div className="text-center text-sm text-muted-foreground py-10">No stock recorded yet. Add a purchase first.</div>
      )}
    </div>
  );
}
