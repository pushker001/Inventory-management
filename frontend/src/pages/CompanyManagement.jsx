import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, Archive, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export default function CompanyManagement() {
  const nav = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [skus, setSkus] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", note: "" });

  const load = async () => {
    const [c, s] = await Promise.all([
      api.get(`/companies?include_archived=${showArchived}`),
      api.get("/skus?include_archived=true"),
    ]);
    setCompanies(c.data);
    setSkus(s.data);
  };
  useEffect(() => { load(); }, [showArchived]);

  const openCreate = () => { setForm({ name: "", note: "" }); setEditingId(null); setOpen(true); };
  const openEdit = (c) => { setForm({ name: c.name, note: c.note || "" }); setEditingId(c.id); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Enter a name");
    try {
      if (editingId) {
        await api.patch(`/companies/${editingId}`, form);
        toast.success("Company updated");
      } else {
        await api.post("/companies", form);
        toast.success("Company added");
      }
      setOpen(false);
      load();
    } catch { toast.error("Could not save"); }
  };

  const toggleArchive = async (c) => {
    await api.patch(`/companies/${c.id}`, { archived: !c.archived });
    toast.success(c.archived ? "Restored" : "Archived");
    load();
  };

  const skuCount = (cid) => skus.filter((s) => s.company_id === cid && !s.archived).length;

  return (
    <div className="px-5 pt-8">
      <PageHeader title="Companies" subtitle="Suppliers whose products you sell" back />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} id="show-arch-co" data-testid="toggle-archived-co" />
          <Label htmlFor="show-arch-co" className="text-xs text-muted-foreground">Show archived</Label>
        </div>
        <Button size="sm" onClick={openCreate} data-testid="add-company-btn" className="rounded-full h-9 px-4">
          <Plus size={16} className="mr-1" /> Add Company
        </Button>
      </div>

      <div className="space-y-2">
        {companies.map((c) => (
          <div key={c.id} data-testid={`company-row-${c.id}`} className={`bg-white rounded-2xl p-4 border border-border/60 flex items-center gap-3 ${c.archived ? "opacity-60" : ""}`}>
            <button onClick={() => nav(`/skus?company=${c.id}`)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-secondary/25 flex items-center justify-center">
                <Building2 className="text-[hsl(30_70%_35%)]" size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {skuCount(c.id)} product{skuCount(c.id) === 1 ? "" : "s"}
                  {c.note ? ` · ${c.note}` : ""}
                </div>
              </div>
            </button>
            <button onClick={() => openEdit(c)} className="p-2 hover:bg-accent rounded-lg" data-testid={`edit-company-${c.id}`}>
              <Edit3 size={16} className="text-muted-foreground" />
            </button>
            <button onClick={() => toggleArchive(c)} className="p-2 hover:bg-accent rounded-lg" data-testid={`archive-company-${c.id}`}>
              <Archive size={16} className={c.archived ? "text-primary" : "text-muted-foreground"} />
            </button>
          </div>
        ))}
        {!companies.length && <div className="text-center text-sm text-muted-foreground py-10">No companies yet. Add JO, Rakesh Masala, etc.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Edit Company" : "New Company"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rakesh Masala" data-testid="company-name" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Sales rep, terms, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl" onClick={save} data-testid="company-save-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
