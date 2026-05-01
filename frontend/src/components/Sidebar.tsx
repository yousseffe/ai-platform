import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Layers,
  Settings,
  BookOpen,
  HelpCircle,
  LogOut,
} from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/auth/login");
  };

  return (
    <div className="w-64 bg-sidebar border-r border-slate-200 flex flex-col h-screen">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-transparent">
        <div className="flex items-center gap-2 text-primary-600 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          ModelOps AI
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 flex flex-col gap-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
              isActive && window.location.pathname === "/"
                ? "bg-primary-50 text-primary-600"
                : "text-slate-600 hover:bg-slate-50"
            }`
          }
        >
          <LayoutGrid className="w-5 h-5" />
          Dashboard
        </NavLink>

        <NavLink
          to="/models"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
              isActive || window.location.pathname.startsWith("/models")
                ? "bg-primary-50 text-primary-600"
                : "text-slate-600 hover:bg-slate-50"
            }`
          }
        >
          <Layers className="w-5 h-5" />
          Models
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
              isActive
                ? "bg-primary-50 text-primary-600"
                : "text-slate-600 hover:bg-slate-50"
            }`
          }
        >
          <Settings className="w-5 h-5" />
          Settings
        </NavLink>
      </div>

      <div className="px-6 pb-6">
        <NavLink
          to="/models/upload"
          className="btn-primary w-full shadow-sm shadow-primary-500/20"
        >
          + Deploy Model
        </NavLink>
      </div>

      {/* Footer Links */}
      <div className="p-4 border-t border-slate-100 flex flex-col gap-1">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-50 transition-colors w-full text-left">
          <BookOpen className="w-5 h-5" />
          Documentation
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-50 transition-colors w-full text-left">
          <HelpCircle className="w-5 h-5" />
          Support
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left mt-2"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
