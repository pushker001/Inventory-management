import React from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Toaster } from "sonner";

export const AppLayout = () => (
  <div className="w-full max-w-md mx-auto min-h-screen bg-background relative pb-24 shadow-[0_0_60px_rgba(120,60,20,0.06)]">
    <Outlet />
    <BottomNav />
    <Toaster position="top-center" richColors />
  </div>
);
