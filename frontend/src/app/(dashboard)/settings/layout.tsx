import React from "react";

/**
 * Settings layout wrapper rendering the workspace settings page header context.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full text-foreground font-sans animate-fade-in text-left">
      {children}
    </div>
  );
}
