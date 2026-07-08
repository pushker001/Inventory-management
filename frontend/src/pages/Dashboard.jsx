import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, rupee, monthLabel, currentMonth } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowUpRight, ShoppingCart, PackagePlus, Receipt, AlertTriangle, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const TipRender = ({ payload }) =>
  payload && payload[0] ? (
    <div className="bg-white text-foreground text-xs px-2 py-1 rounded-lg shadow">
      ₹{Number(payload[0].value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
    </div>
  ) : null;

const Stat = ({ label, value, tone = "default", testid }) => {
  const tones = {
    default: "text-foreground",
    good: "text-[hsl(var(--success))]",
    bad: "text-destructive",
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-border/60">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div data-testid={testid} className={`text-lg font-heading font-semibold mt-1 ${tones[tone]}`}>{value}</div>
    </div>
  );
};

const QuickAction = ({ label, icon: Icon, color, onClick, testid }) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    data-testid={testid}
    className="flex-1 flex flex-col items-center gap-2 py-4 bg-white rounded-2xl border border-border/60 card-tap"
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} />
    </div>
    <span className="text-xs font-medium text-foreground">{label}</span>
  </motion.button>
);

export default function Dashboard() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [month] = useState(currentMonth());

  useEffect(() => {
    api.get(`/reports/dashboard?month=${month}`).then((r) => setData(r.data));
  }, [month]);

  const seedIfEmpty = async () => {
    await api.post("/seed");
    const r = await api.get(`/reports/dashboard?month=${month}`);
    setData(r.data);
  };

  if (!data) {
    return (
      <div className="p-6 pt-12">
        <div className="animate-pulse text-muted-foreground text-sm">Loading your numbers…</div>
      </div>
    );
  }

  const s = data.current.summary;
  const trend = data.trend.map((t) => ({ ...t, label: monthLabel(t.month).slice(0, 3) }));
  const netProfitPositive = s.net_profit >= 0;
  const prev = data.trend[data.trend.length - 2];
  const delta = prev ? s.net_profit - prev.net_profit : 0;

  return (
    <div className="px-5 pt-8 pb-4">
      <div className="flex justify-between items-start mb-6 stagger-item">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">{monthLabel(month)}</div>
          <h1 className="text-2xl font-heading font-bold mt-1">Namaste 🙏</h1>
        </div>
        <button
          data-testid="seed-btn"
          onClick={seedIfEmpty}
          className="text-xs px-3 py-1.5 rounded-full bg-secondary/20 text-foreground font-medium border border-secondary/40"
          title="Load sample data"
        >
          <Sparkles size={12} className="inline mr-1" /> Sample
        </button>
      </div>

      {/* Net Profit Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-[hsl(15_60%_42%)] rounded-3xl p-6 text-primary-foreground relative overflow-hidden grain"
      >
        <div className="text-xs uppercase tracking-widest opacity-80">Net Profit this month</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span data-testid="net-profit" className="text-4xl font-heading font-bold">{rupee(s.net_profit)}</span>
        </div>
        <div className="flex items-center gap-1 mt-3 text-sm opacity-90">
          {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{delta >= 0 ? "+" : ""}{rupee(Math.abs(delta))} vs last month</span>
        </div>
        <div className="h-20 mt-4 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="np" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="white" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="white" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" hide />
              <Tooltip
                content={TipRender}
              />
              <Area type="monotone" dataKey="net_profit" stroke="white" strokeWidth={2} fill="url(#np)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick add */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        <QuickAction label="Purchase" icon={PackagePlus} color="bg-primary/10 text-primary" onClick={() => nav("/purchase")} testid="qa-purchase" />
        <QuickAction label="Sale" icon={ShoppingCart} color="bg-secondary/25 text-[hsl(30_70%_35%)]" onClick={() => nav("/sale")} testid="qa-sale" />
        <QuickAction label="Expense" icon={Receipt} color="bg-[hsl(146_35%_90%)] text-[hsl(var(--success))]" onClick={() => nav("/expense")} testid="qa-expense" />
        <QuickAction label="Damage" icon={AlertTriangle} color="bg-red-50 text-destructive" onClick={() => nav("/damage")} testid="qa-damage" />
      </div>

      {/* Stats grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Total Sales" value={rupee(s.total_sales)} testid="stat-sales" />
        <Stat label="Cost of Goods" value={rupee(s.total_cogs)} testid="stat-cogs" />
        <Stat label="Gross Profit" value={rupee(s.gross_profit)} tone="good" testid="stat-gross" />
        <Stat label="Expenses" value={rupee(s.total_expenses)} tone="bad" testid="stat-expenses" />
        <Stat label="Damage Loss" value={rupee(s.total_damage_cost)} tone="bad" testid="stat-damage" />
        <Stat label="Net Profit" value={rupee(s.net_profit)} tone={netProfitPositive ? "good" : "bad"} testid="stat-net" />
      </div>

      {/* Insights link */}
      <button
        onClick={() => nav("/channels")}
        data-testid="channel-link"
        className="mt-5 w-full bg-white rounded-2xl p-4 border border-border/60 flex justify-between items-center card-tap"
      >
        <div className="text-left">
          <div className="text-sm font-medium">Compare Wholesale vs Retail</div>
          <div className="text-xs text-muted-foreground mt-0.5">See which channel earns more per unit</div>
        </div>
        <ArrowUpRight className="text-primary" size={20} />
      </button>
    </div>
  );
}
