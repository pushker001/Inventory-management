import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, rupee, todayIso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export default function SaleEntry() {
  const nav = useNavigate();
  const [skus, setSkus] = useState([]);
  const [form, setForm] = useState({
    date: todayIso(), sku_id: "", customer_type: "wholesaler",
    quantity: "", price_per_unit: "",
  });

  useEffect(() => { api.get("/skus").then((r) => setSkus(r.data)); }, []);
  const sku = skus.find((s) => s.id === form.sku_id);

  // Auto-fill price when SKU or customer type changes
  useEffect(() => {
    if (sku) {
      const p = form.customer_type === "wholesaler" ? sku.default_wholesale_price : sku.default_retail_price;
      setForm((f) => ({ ...f, price_per_unit: String(p || "") }));
    }
  }, [form.sku_id, form.customer_type, sku]);

  const total = useMemo(() => Number(form.quantity || 0) * Number(form.price_per_unit || 0), [form]);

  const submit = async () => {
    if (!form.sku_id || !form.quantity || !form.price_per_unit) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await api.post("/sales", {
        date: form.date, sku_id: form.sku_id,
        customer_type: form.customer_type,
        quantity: Number(form.quantity),
        price_per_unit: Number(form.price_per_unit),
      });
      toast.success(`Sale saved: ${rupee(total)}`);
      nav("/");
    } catch { toast.error("Could not save"); }
  };

  return (
    <div className="px-5 pt-8">
      <PageHeader title="New Sale" subtitle="Log a sale to wholesaler or retailer" back />
      <div className="space-y-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="sale-date" />
        </div>
        <div>
          <Label>Product</Label>
          <Select value={form.sku_id} onValueChange={(v) => setForm({ ...form, sku_id: v })}>
            <SelectTrigger data-testid="sale-sku"><SelectValue placeholder="Choose product" /></SelectTrigger>
            <SelectContent>
              {skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Customer type</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[
              { k: "wholesaler", label: "Wholesaler" },
              { k: "retailer", label: "Retailer" },
            ].map((o) => (
              <button
                key={o.k}
                data-testid={`ctype-${o.k}`}
                onClick={() => setForm({ ...form, customer_type: o.k })}
                className={`h-12 rounded-xl border font-medium text-sm ${form.customer_type === o.k ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-foreground"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantity (units)</Label>
            <Input type="number" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="sale-qty" />
          </div>
          <div>
            <Label>Price / unit (₹)</Label>
            <Input type="number" inputMode="decimal" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} data-testid="sale-price" />
          </div>
        </div>

        <div className="bg-[hsl(146_35%_92%)] rounded-2xl p-4 border border-[hsl(146_35%_75%)]">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Total sale value</span>
            <span data-testid="sale-total" className="text-xl font-heading font-bold text-[hsl(var(--success))]">{rupee(total)}</span>
          </div>
        </div>

        <Button className="w-full h-12 rounded-xl" onClick={submit} data-testid="sale-save">Save Sale</Button>
      </div>
    </div>
  );
}
