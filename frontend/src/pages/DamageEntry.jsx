import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, todayIso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export default function DamageEntry() {
  const nav = useNavigate();
  const [skus, setSkus] = useState([]);
  const [form, setForm] = useState({ date: todayIso(), sku_id: "", quantity: "", reason: "Expired", note: "" });

  useEffect(() => { api.get("/skus").then((r) => setSkus(r.data)); }, []);

  const submit = async () => {
    if (!form.sku_id || !form.quantity) return toast.error("Fill SKU & quantity");
    await api.post("/damages", { ...form, quantity: Number(form.quantity) });
    toast.success("Damage recorded");
    nav("/");
  };

  return (
    <div className="px-5 pt-8">
      <PageHeader title="Damage / Expiry" subtitle="Remove unsellable stock" back />
      <div className="space-y-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="damage-date" />
        </div>
        <div>
          <Label>Product</Label>
          <Select value={form.sku_id} onValueChange={(v) => setForm({ ...form, sku_id: v })}>
            <SelectTrigger data-testid="damage-sku"><SelectValue placeholder="Choose product" /></SelectTrigger>
            <SelectContent>
              {skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantity (units)</Label>
            <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="damage-qty" />
          </div>
          <div>
            <Label>Reason</Label>
            <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
              <SelectTrigger data-testid="damage-reason"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Damaged">Damaged</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Note (optional)</Label>
          <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} data-testid="damage-note" />
        </div>
        <Button className="w-full h-12 rounded-xl" onClick={submit} data-testid="damage-save">Save</Button>
      </div>
    </div>
  );
}
