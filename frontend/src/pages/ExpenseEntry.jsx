import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, todayIso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

const EXPENSE_CATEGORIES = ["Salary", "Fuel/Van", "Godown Rent", "Loading Labor", "Phone/Data", "Other"];

export default function ExpenseEntry() {
  const nav = useNavigate();
  const [form, setForm] = useState({ date: todayIso(), category: "Fuel/Van", amount: "", note: "" });

  const submit = async () => {
    if (!form.amount) return toast.error("Enter an amount");
    await api.post("/expenses", { ...form, amount: Number(form.amount) });
    toast.success("Expense saved");
    nav("/");
  };

  return (
    <div className="px-5 pt-8">
      <PageHeader title="New Expense" subtitle="Track operating costs" back />
      <div className="space-y-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="expense-date" />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger data-testid="expense-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount (₹)</Label>
          <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="expense-amount" />
        </div>
        <div>
          <Label>Note</Label>
          <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} data-testid="expense-note" />
        </div>
        <Button className="w-full h-12 rounded-xl" onClick={submit} data-testid="expense-save">Save Expense</Button>
      </div>
    </div>
  );
}
