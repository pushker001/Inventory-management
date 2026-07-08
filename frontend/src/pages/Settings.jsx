import React from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { Lock, Sparkles, PackagePlus, Receipt, AlertTriangle, BarChart3, ShoppingCart, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Item = ({ icon: Icon, label, onClick, testid, tone = "primary" }) => (
  <button onClick={onClick} data-testid={testid} className="w-full bg-white rounded-2xl p-4 border border-border/60 flex items-center gap-3 card-tap">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>
      <Icon size={18} />
    </div>
    <div className="text-sm font-medium flex-1 text-left">{label}</div>
  </button>
);

export default function SettingsPage() {
  const nav = useNavigate();
  const { lock } = useAuth();

  const reseed = async () => {
    if (!window.confirm("Reset & reload sample data? This will delete existing entries.")) return;
    await api.post("/seed?force=true");
    toast.success("Sample data loaded");
    nav("/");
  };

  return (
    <div className="px-5 pt-8">
      <PageHeader title="More" subtitle="Entries & settings" />

      <div className="space-y-2">
        <Item icon={PackagePlus} label="Add Purchase" onClick={() => nav("/purchase")} testid="more-purchase" />
        <Item icon={ShoppingCart} label="Add Sale" onClick={() => nav("/sale")} testid="more-sale" />
        <Item icon={Receipt} label="Add Expense" onClick={() => nav("/expense")} testid="more-expense" />
        <Item icon={AlertTriangle} label="Add Damage / Expiry" onClick={() => nav("/damage")} testid="more-damage" />
        <Item icon={Building2} label="Manage Companies" onClick={() => nav("/companies")} testid="more-companies" />
        <Item icon={BarChart3} label="Channel Comparison" onClick={() => nav("/channels")} testid="more-channels" />
      </div>

      <h3 className="mt-6 mb-2 text-xs uppercase tracking-widest text-muted-foreground font-medium">Data</h3>
      <div className="space-y-2">
        <Item icon={Sparkles} label="Reload sample data" onClick={reseed} testid="more-seed" tone="muted" />
        <Item icon={Lock} label="Lock app" onClick={lock} testid="more-lock" tone="muted" />
      </div>
    </div>
  );
}
