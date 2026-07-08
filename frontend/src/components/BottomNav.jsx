import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, BarChart3, Boxes, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: LayoutDashboard, testid: "nav-home" },
  { to: "/stock", label: "Stock", icon: Boxes, testid: "nav-stock" },
  { to: "/report", label: "Profit", icon: BarChart3, testid: "nav-profit" },
  { to: "/skus", label: "SKUs", icon: Package, testid: "nav-skus" },
  { to: "/settings", label: "More", icon: Settings, testid: "nav-more" },
];

export const BottomNav = () => (
  <nav
    data-testid="bottom-nav"
    className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white/85 backdrop-blur-lg border-t border-border"
  >
    <div className="grid grid-cols-5">
      {items.map(({ to, label, icon: Icon, testid }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          data-testid={testid}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-2.5 gap-1 text-[11px] font-medium ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);
