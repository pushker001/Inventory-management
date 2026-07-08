import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, rupee, todayIso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export default function PurchaseEntry() {
  const nav = useNavigate();
  const [skus, setSkus] = useState([]);
  const [form, setForm] = useState({
    date: todayIso(), sku_id: "", boxes: "", cost_per_box: "",
  });

  useEffect(() => { api.get("/skus").then((r) => setSkus(r.data)); }, []);

  const sku = skus.find((s) => s.id === form.sku_id);

  useEffect(() => {
    if (sku && !form.cost_per_box) {
      setForm((f) => ({ ...f, cost_per_box: String(sku.current_cost_per_box || "") }));
    }
  }, [form.sku_id, form.cost_per_box, sku]);

  const preview = useMemo(() => {
    const upb = sku?.units_per_box || 0;
    const boxes = Number(form.boxes || 0);
    const cost = Number(form.cost_per_box || 0);
    return {
      total_units: boxes * upb,
      total_value: boxes * cost,
      cost_per_unit: upb ? cost / upb : 0,
    };
  }, [form, sku]);

  const submit = async () => {
    if (!form.sku_id || !form.boxes || !form.cost_per_box) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await api.post("/purchases", {
        date: form.date, sku_id: form.sku_id,
        boxes: Number(form.boxes), cost_per_box: Number(form.cost_per_box),
      });
      toast.success(`Purchase saved: ${preview.total_units} units`);
      nav("/");
    } catch { toast.error("Could not save"); }
  };

  return (
    <div className="px-5 pt-8">
      <PageHeader title="New Purchase" subtitle="Record stock received from company" back />
      <div className="space-y-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="purchase-date" />
        </div>
        <div>
          <Label>Product</Label>
          <Select value={form.sku_id} onValueChange={(v) => setForm({ ...form, sku_id: v, cost_per_box: "" })}>
            <SelectTrigger data-testid="purchase-sku"><SelectValue placeholder="Choose product" /></SelectTrigger>
            <SelectContent>
              {skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Boxes</Label>
            <Input type="number" inputMode="decimal" value={form.boxes} onChange={(e) => setForm({ ...form, boxes: e.target.value })} data-testid="purchase-boxes" />
          </div>
          <div>
            <Label>Cost / box (₹)</Label>
            <Input type="number" inputMode="decimal" value={form.cost_per_box} onChange={(e) => setForm({ ...form, cost_per_box: e.target.value })} data-testid="purchase-cost" />
          </div>
        </div>

        {sku && (
          <div className="bg-secondary/15 rounded-2xl p-4 border border-secondary/30">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Preview</div>
            <div className="mt-2 flex justify-between text-sm"><span>Units per box</span><span className="font-medium">{sku.units_per_box}</span></div>
            <div className="flex justify-between text-sm"><span>Total units</span><span data-testid="preview-units" className="font-medium">{preview.total_units}</span></div>
            <div className="flex justify-between text-sm"><span>Cost per unit</span><span className="font-medium">{rupee(preview.cost_per_unit)}</span></div>
            <div className="flex justify-between text-base mt-2 pt-2 border-t border-secondary/30"><span className="font-semibold">Total cost</span><span data-testid="preview-total" className="font-heading font-bold text-primary">{rupee(preview.total_value)}</span></div>
          </div>
        )}

        <Button className="w-full h-12 rounded-xl" onClick={submit} data-testid="purchase-save">Save Purchase</Button>
      </div>
    </div>
  );
}
