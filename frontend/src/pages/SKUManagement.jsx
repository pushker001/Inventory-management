import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Archive, Edit3, Plus, Package, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

const emptySku = { name: "", category_id: "", company_id: "", brand: "", pack_size: "", units_per_box: "", current_cost_per_box: "", default_wholesale_price: "", default_retail_price: "" };

export default function SKUManagement() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [skus, setSkus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [form, setForm] = useState(emptySku);
  const [editingId, setEditingId] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const companyFilter = params.get("company") || "all";
  const setCompanyFilter = (v) => {
    const p = new URLSearchParams(params);
    if (v === "all") p.delete("company");
    else p.set("company", v);
    setParams(p, { replace: true });
  };

  const load = async () => {
    const [s, c, co] = await Promise.all([
      api.get(`/skus?include_archived=${showArchived}`),
      api.get("/categories"),
      api.get("/companies"),
    ]);
    setSkus(s.data);
    setCategories(c.data);
    setCompanies(co.data);
  };
  useEffect(() => { load(); }, [showArchived]);

  const openCreate = () => {
    const preCompany = companyFilter !== "all" ? companyFilter : "";
    setForm({ ...emptySku, company_id: preCompany });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (sku) => {
    setForm({
      name: sku.name, category_id: sku.category_id, company_id: sku.company_id || "",
      brand: sku.brand, pack_size: sku.pack_size,
      units_per_box: String(sku.units_per_box),
      current_cost_per_box: String(sku.current_cost_per_box),
      default_wholesale_price: String(sku.default_wholesale_price || 0),
      default_retail_price: String(sku.default_retail_price || 0),
    });
    setEditingId(sku.id);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.category_id || !form.units_per_box) {
      toast.error("Fill name, category, units per box");
      return;
    }
    // If company_id is set, also copy to brand for display fallback
    const chosen = companies.find((c) => c.id === form.company_id);
    const payload = {
      ...form,
      brand: chosen ? chosen.name : form.brand,
      company_id: form.company_id || null,
      units_per_box: Number(form.units_per_box),
      current_cost_per_box: Number(form.current_cost_per_box || 0),
      default_wholesale_price: Number(form.default_wholesale_price || 0),
      default_retail_price: Number(form.default_retail_price || 0),
    };
    try {
      if (editingId) {
        await api.patch(`/skus/${editingId}`, payload);
        toast.success("SKU updated");
      } else {
        await api.post("/skus", payload);
        toast.success("SKU added");
      }
      setDialogOpen(false);
      load();
    } catch { toast.error("Could not save"); }
  };

  const toggleArchive = async (sku) => {
    await api.patch(`/skus/${sku.id}`, { archived: !sku.archived });
    toast.success(sku.archived ? "Restored" : "Archived");
    load();
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    await api.post("/categories", { name: newCat.trim() });
    setNewCat(""); setCatDialogOpen(false); load();
    toast.success("Category added");
  };

  const addCompany = async () => {
    if (!newCompany.trim()) return;
    const r = await api.post("/companies", { name: newCompany.trim() });
    setForm((f) => ({ ...f, company_id: r.data.id }));
    setNewCompany(""); setCompanyDialogOpen(false);
    const co = await api.get("/companies");
    setCompanies(co.data);
    toast.success("Company added");
  };

  const filtered = useMemo(() => {
    return skus.filter((s) => {
      if (catFilter !== "all" && s.category_id !== catFilter) return false;
      if (companyFilter !== "all" && s.company_id !== companyFilter) return false;
      return true;
    });
  }, [skus, catFilter, companyFilter]);

  const companyName = (id) => companies.find((c) => c.id === id)?.name;

  return (
    <div className="px-5 pt-8">
      <PageHeader title="Products (SKUs)" subtitle="Tap a product to view its transactions" />

      <div className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Category</div>
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        <Chip label="All" active={catFilter === "all"} onClick={() => setCatFilter("all")} testid="filter-cat-all" />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} active={catFilter === c.id} onClick={() => setCatFilter(c.id)} testid={`filter-cat-${c.id}`} />
        ))}
        <Chip label="+ Cat" dashed onClick={() => setCatDialogOpen(true)} />
      </div>

      <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Company</div>
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        <Chip label="All" active={companyFilter === "all"} onClick={() => setCompanyFilter("all")} testid="filter-co-all" />
        {companies.map((c) => (
          <Chip key={c.id} label={c.name} active={companyFilter === c.id} onClick={() => setCompanyFilter(c.id)} testid={`filter-co-${c.id}`} />
        ))}
        <Chip label="Manage" dashed onClick={() => nav("/companies")} testid="manage-companies" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} id="show-archived" data-testid="toggle-archived" />
          <Label htmlFor="show-archived" className="text-xs text-muted-foreground">Show archived</Label>
        </div>
        <Button size="sm" onClick={openCreate} data-testid="add-sku-btn" className="rounded-full h-9 px-4">
          <Plus size={16} className="mr-1" /> Add SKU
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.map((sku) => {
          const cat = categories.find((c) => c.id === sku.category_id);
          const co = companyName(sku.company_id) || sku.brand;
          return (
            <div key={sku.id} data-testid={`sku-row-${sku.id}`} className={`bg-white rounded-2xl p-4 border border-border/60 flex items-center gap-3 ${sku.archived ? "opacity-60" : ""}`}>
              <button onClick={() => nav(`/skus/${sku.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="text-primary" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{sku.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {co ? `${co} · ` : ""}{cat?.name} · {sku.units_per_box}/box
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ₹{sku.current_cost_per_box}/box · WH ₹{sku.default_wholesale_price} · RT ₹{sku.default_retail_price}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </button>
              <button onClick={() => openEdit(sku)} className="p-2 hover:bg-accent rounded-lg" data-testid={`edit-sku-${sku.id}`}>
                <Edit3 size={16} className="text-muted-foreground" />
              </button>
              <button onClick={() => toggleArchive(sku)} className="p-2 hover:bg-accent rounded-lg" data-testid={`archive-sku-${sku.id}`}>
                <Archive size={16} className={sku.archived ? "text-primary" : "text-muted-foreground"} />
              </button>
            </div>
          );
        })}
        {!filtered.length && <div className="text-center text-sm text-muted-foreground py-10">No SKUs match this filter.</div>}
      </div>

      {/* SKU Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit SKU" : "New SKU"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input data-testid="sku-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Garam Masala 50g" />
            </div>
            <div>
              <Label>Company</Label>
              <div className="flex gap-2">
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger data-testid="sku-company" className="flex-1"><SelectValue placeholder="Choose company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(true)} data-testid="quick-add-company">+</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger data-testid="sku-category"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pack size</Label>
                <Input value={form.pack_size} onChange={(e) => setForm({ ...form, pack_size: e.target.value })} placeholder="50g" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Units per box</Label>
                <Input data-testid="sku-upb" type="number" value={form.units_per_box} onChange={(e) => setForm({ ...form, units_per_box: e.target.value })} />
              </div>
              <div>
                <Label>Cost / box (₹)</Label>
                <Input type="number" value={form.current_cost_per_box} onChange={(e) => setForm({ ...form, current_cost_per_box: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Wholesale ₹/unit</Label>
                <Input type="number" value={form.default_wholesale_price} onChange={(e) => setForm({ ...form, default_wholesale_price: e.target.value })} />
              </div>
              <div>
                <Label>Retail ₹/unit</Label>
                <Input type="number" value={form.default_retail_price} onChange={(e) => setForm({ ...form, default_retail_price: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} data-testid="sku-save-btn" className="w-full h-12 rounded-xl">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Soap" data-testid="new-cat-input" />
          <DialogFooter>
            <Button onClick={addCategory} data-testid="new-cat-save" className="w-full">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader><DialogTitle>New Company</DialogTitle></DialogHeader>
          <Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="e.g. Rakesh Masala" data-testid="new-company-input" />
          <DialogFooter>
            <Button onClick={addCompany} data-testid="new-company-save" className="w-full">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Chip = ({ label, active, dashed, onClick, testid }) => (
  <button
    onClick={onClick}
    data-testid={testid}
    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
      active ? "bg-primary text-primary-foreground" :
      dashed ? "bg-white border border-dashed border-border text-muted-foreground" :
      "bg-white border border-border text-foreground"
    }`}
  >
    {label}
  </button>
);
