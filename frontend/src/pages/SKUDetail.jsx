import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, rupee } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Edit3, Package } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export default function SKUDetail() {
  const { id } = useParams();
  const [sku, setSku] = useState(null);
  const [company, setCompany] = useState(null);
  const [category, setCategory] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [damages, setDamages] = useState([]);
  const [editing, setEditing] = useState(null); // { kind, doc }

  const loadTx = async () => {
    const [p, s, d] = await Promise.all([
      api.get(`/purchases?sku_id=${id}`),
      api.get(`/sales?sku_id=${id}`),
      api.get(`/damages?sku_id=${id}`),
    ]);
    setPurchases(p.data);
    setSales(s.data);
    setDamages(d.data);
  };

  useEffect(() => {
    api.get(`/skus?include_archived=true`).then((r) => {
      const found = r.data.find((s) => s.id === id);
      setSku(found);
      if (found?.company_id) api.get("/companies?include_archived=true").then((c) => setCompany(c.data.find((x) => x.id === found.company_id)));
      if (found?.category_id) api.get("/categories").then((c) => setCategory(c.data.find((x) => x.id === found.category_id)));
    });
    loadTx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const remove = async (kind, docId) => {
    if (!window.confirm("Delete this entry? Stock will be recalculated.")) return;
    await api.delete(`/${kind}/${docId}`);
    toast.success("Deleted");
    loadTx();
  };

  const saveEdit = async () => {
    const { kind, doc } = editing;
    let payload = {};
    try {
      if (kind === "purchases") {
        payload = { date: doc.date, boxes: Number(doc.boxes), cost_per_box: Number(doc.cost_per_box) };
      } else if (kind === "sales") {
        payload = { date: doc.date, customer_type: doc.customer_type, quantity: Number(doc.quantity), price_per_unit: Number(doc.price_per_unit) };
      } else if (kind === "damages") {
        payload = { date: doc.date, quantity: Number(doc.quantity), reason: doc.reason, note: doc.note || "" };
      }
      await api.patch(`/${kind}/${doc.id}`, payload);
      toast.success("Updated");
      setEditing(null);
      loadTx();
    } catch { toast.error("Could not update"); }
  };

  if (!sku) return <div className="p-6">Loading…</div>;

  return (
    <div className="px-5 pt-8">
      <PageHeader title={sku.name} subtitle={`${company?.name || sku.brand || ""} · ${category?.name || ""}`} back />

      {/* SKU summary card */}
      <div className="bg-white rounded-2xl border border-border/60 p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="text-primary" size={20} />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div><span className="text-muted-foreground">Pack: </span><span className="font-medium">{sku.pack_size || "—"}</span></div>
            <div><span className="text-muted-foreground">Units/box: </span><span className="font-medium">{sku.units_per_box}</span></div>
            <div><span className="text-muted-foreground">Cost/box: </span><span className="font-medium">{rupee(sku.current_cost_per_box)}</span></div>
            <div><span className="text-muted-foreground">Cost/unit: </span><span className="font-medium">{rupee(sku.current_cost_per_box / sku.units_per_box)}</span></div>
            <div><span className="text-muted-foreground">Wholesale: </span><span className="font-medium">{rupee(sku.default_wholesale_price)}/u</span></div>
            <div><span className="text-muted-foreground">Retail: </span><span className="font-medium">{rupee(sku.default_retail_price)}/u</span></div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList className="grid grid-cols-3 w-full h-11 rounded-xl bg-muted p-1">
          <TabsTrigger data-testid="tab-purchases" value="purchases" className="rounded-lg text-xs">Purchases ({purchases.length})</TabsTrigger>
          <TabsTrigger data-testid="tab-sales" value="sales" className="rounded-lg text-xs">Sales ({sales.length})</TabsTrigger>
          <TabsTrigger data-testid="tab-damages" value="damages" className="rounded-lg text-xs">Damage ({damages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-4">
          <div className="space-y-2">
            {purchases.map((p) => (
              <TxRow key={p.id} testid={`tx-purchase-${p.id}`}
                title={`${p.boxes} box × ${rupee(p.cost_per_box)}`}
                subtitle={`${p.date} · ${Math.round(p.total_units)} units`}
                value={rupee(p.total_value)}
                onEdit={() => setEditing({ kind: "purchases", doc: { ...p } })}
                onDel={() => remove("purchases", p.id)}
              />
            ))}
            {!purchases.length && <Empty text="No purchases yet." />}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <div className="space-y-2">
            {sales.map((s) => (
              <TxRow key={s.id} testid={`tx-sale-${s.id}`}
                title={`${Math.round(s.quantity)}u × ${rupee(s.price_per_unit)}`}
                subtitle={`${s.date} · ${s.customer_type === "wholesaler" ? "Wholesale" : "Retail"}`}
                value={rupee(s.total_value)}
                tone="good"
                onEdit={() => setEditing({ kind: "sales", doc: { ...s } })}
                onDel={() => remove("sales", s.id)}
              />
            ))}
            {!sales.length && <Empty text="No sales yet." />}
          </div>
        </TabsContent>

        <TabsContent value="damages" className="mt-4">
          <div className="space-y-2">
            {damages.map((d) => (
              <TxRow key={d.id} testid={`tx-damage-${d.id}`}
                title={`${Math.round(d.quantity)}u · ${d.reason}`}
                subtitle={`${d.date}${d.note ? ` · ${d.note}` : ""}`}
                value=""
                tone="bad"
                onEdit={() => setEditing({ kind: "damages", doc: { ...d } })}
                onDel={() => remove("damages", d.id)}
              />
            ))}
            {!damages.length && <Empty text="No damage / expiry entries." />}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          {editing && (
            <>
              <DialogHeader><DialogTitle>Edit {editing.kind.slice(0, -1)}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={editing.doc.date} onChange={(e) => setEditing({ ...editing, doc: { ...editing.doc, date: e.target.value } })} data-testid="edit-tx-date" />
                </div>
                {editing.kind === "purchases" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Boxes</Label>
                      <Input type="number" value={editing.doc.boxes} onChange={(e) => setEditing({ ...editing, doc: { ...editing.doc, boxes: e.target.value } })} data-testid="edit-tx-boxes" />
                    </div>
                    <div>
                      <Label>Cost / box</Label>
                      <Input type="number" value={editing.doc.cost_per_box} onChange={(e) => setEditing({ ...editing, doc: { ...editing.doc, cost_per_box: e.target.value } })} data-testid="edit-tx-cost" />
                    </div>
                  </div>
                )}
                {editing.kind === "sales" && (
                  <>
                    <div>
                      <Label>Customer</Label>
                      <Select value={editing.doc.customer_type} onValueChange={(v) => setEditing({ ...editing, doc: { ...editing.doc, customer_type: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wholesaler">Wholesaler</SelectItem>
                          <SelectItem value="retailer">Retailer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" value={editing.doc.quantity} onChange={(e) => setEditing({ ...editing, doc: { ...editing.doc, quantity: e.target.value } })} data-testid="edit-tx-qty" />
                      </div>
                      <div>
                        <Label>Price / unit</Label>
                        <Input type="number" value={editing.doc.price_per_unit} onChange={(e) => setEditing({ ...editing, doc: { ...editing.doc, price_per_unit: e.target.value } })} data-testid="edit-tx-price" />
                      </div>
                    </div>
                  </>
                )}
                {editing.kind === "damages" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" value={editing.doc.quantity} onChange={(e) => setEditing({ ...editing, doc: { ...editing.doc, quantity: e.target.value } })} />
                      </div>
                      <div>
                        <Label>Reason</Label>
                        <Select value={editing.doc.reason} onValueChange={(v) => setEditing({ ...editing, doc: { ...editing.doc, reason: v } })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Expired">Expired</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Note</Label>
                      <Textarea value={editing.doc.note || ""} onChange={(e) => setEditing({ ...editing, doc: { ...editing.doc, note: e.target.value } })} />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button className="w-full h-12 rounded-xl" onClick={saveEdit} data-testid="edit-tx-save">Save changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TxRow = ({ title, subtitle, value, tone, onEdit, onDel, testid }) => (
  <div data-testid={testid} className="bg-white rounded-2xl p-3 border border-border/60 flex items-center gap-2">
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate">{title}</div>
      <div className="text-[11px] text-muted-foreground">{subtitle}</div>
    </div>
    {value && (
      <div className={`text-sm font-heading font-semibold whitespace-nowrap ${tone === "good" ? "text-[hsl(var(--success))]" : tone === "bad" ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
    )}
    <button onClick={onEdit} className="p-2 hover:bg-accent rounded-lg" aria-label="Edit">
      <Edit3 size={15} className="text-muted-foreground" />
    </button>
    <button onClick={onDel} className="p-2 hover:bg-destructive/10 rounded-lg" aria-label="Delete">
      <Trash2 size={15} className="text-destructive" />
    </button>
  </div>
);

const Empty = ({ text }) => <div className="text-center py-8 text-sm text-muted-foreground">{text}</div>;
