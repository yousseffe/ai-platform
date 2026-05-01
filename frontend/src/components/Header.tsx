import React from "react";
import { Search, Bell, HelpCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();

  const getBreadcrumb = () => {
    if (location.pathname === "/") return "Dashboard";
    if (location.pathname.startsWith("/models/upload"))
      return "Models / Upload New Model";
    if (location.pathname.startsWith("/models/")) return "Models / Details";
    if (location.pathname === "/models") return "Models Registry";
    return "Dashboard";
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="font-semibold text-slate-800 tracking-wide text-sm hidden md:block">
        {/* We can place breadcrumbs here if needed, or leave it empty */}
      </div>

      <div className="flex-1 flex justify-center max-w-2xl px-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search models, experiments, or deployments..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 ml-2 cursor-pointer">
          <img
            src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff"
            alt="User"
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
