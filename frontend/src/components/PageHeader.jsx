import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export const PageHeader = ({ title, subtitle, back = false }) => {
  const nav = useNavigate();
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        {back && (
          <button
            data-testid="page-back"
            onClick={() => nav(-1)}
            className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center hover:bg-accent"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className="text-2xl font-heading font-bold">{title}</h1>
      </div>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
};
