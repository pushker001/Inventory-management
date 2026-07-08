import React, { useEffect, useState } from "react";
import { api, rupee, monthLabel, currentMonth } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Store, Users } from "lucide-react";

export default function ChannelComparison() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);

  useEffect(() => { api.get(`/reports/channels?month=${month}`).then((r) => setData(r.data)); }, [month]);

  if (!data) return <div className="p-6">Loading…</div>;

  const chartData = [
    { name: "Wholesale", revenue: data.wholesaler.revenue, margin: data.wholesaler.margin },
    { name: "Retail", revenue: data.retailer.revenue, margin: data.retailer.margin },
  ];

  const winner = data.wholesaler.margin > data.retailer.margin ? "Wholesale" : data.retailer.margin > 0 ? "Retail" : null;

  return (
    <div className="px-5 pt-8">
      <PageHeader title="Channel Comparison" subtitle={monthLabel(month)} back />

      <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="cc-month" className="h-11 mb-4" />

      {winner && (
        <div className="bg-secondary/20 border border-secondary/40 rounded-2xl p-4 mb-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Higher earner</div>
          <div data-testid="cc-winner" className="text-lg font-heading font-semibold mt-0.5">{winner}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <ChannelCard icon={Store} title="Wholesale" data={data.wholesaler} testid="cc-wh" />
        <ChannelCard icon={Users} title="Retail" data={data.retailer} testid="cc-rt" />
      </div>

      <div className="mt-5 bg-white rounded-2xl p-4 border border-border/60">
        <h3 className="text-sm font-medium mb-3">Revenue & Margin</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => rupee(v)} />
              <Bar dataKey="revenue" fill="hsl(15 65% 55%)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="margin" fill="hsl(146 45% 45%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const ChannelCard = ({ icon: Icon, title, data, testid }) => (
  <div className="bg-white rounded-2xl p-4 border border-border/60">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Icon size={18} className="text-primary" /></div>
      <div className="font-heading font-semibold">{title}</div>
    </div>
    <Row label="Units" v={Math.round(data.units).toLocaleString("en-IN")} />
    <Row label="Revenue" v={rupee(data.revenue)} testid={`${testid}-revenue`} />
    <Row label="Margin" v={rupee(data.margin)} testid={`${testid}-margin`} strong />
    <Row label="Avg / unit" v={rupee(data.avg_margin_per_unit)} />
  </div>
);

const Row = ({ label, v, strong, testid }) => (
  <div className="flex justify-between py-1.5 border-b last:border-0 border-border/40">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span data-testid={testid} className={`text-sm ${strong ? "font-heading font-semibold text-primary" : "text-foreground"}`}>{v}</span>
  </div>
);
