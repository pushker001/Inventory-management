import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import PinLock from "@/pages/PinLock";
import Dashboard from "@/pages/Dashboard";
import SKUManagement from "@/pages/SKUManagement";
import PurchaseEntry from "@/pages/PurchaseEntry";
import SaleEntry from "@/pages/SaleEntry";
import DamageEntry from "@/pages/DamageEntry";
import ExpenseEntry from "@/pages/ExpenseEntry";
import ProfitReport from "@/pages/ProfitReport";
import ChannelComparison from "@/pages/ChannelComparison";
import StockView from "@/pages/StockView";
import SettingsPage from "@/pages/Settings";
import CompanyManagement from "@/pages/CompanyManagement";
import SKUDetail from "@/pages/SKUDetail";

const Gate = () => {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }
  if (status === "needs-setup" || status === "locked") return <PinLock />;
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="skus" element={<SKUManagement />} />
        <Route path="skus/:id" element={<SKUDetail />} />
        <Route path="companies" element={<CompanyManagement />} />
        <Route path="purchase" element={<PurchaseEntry />} />
        <Route path="sale" element={<SaleEntry />} />
        <Route path="damage" element={<DamageEntry />} />
        <Route path="expense" element={<ExpenseEntry />} />
        <Route path="report" element={<ProfitReport />} />
        <Route path="channels" element={<ChannelComparison />} />
        <Route path="stock" element={<StockView />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
