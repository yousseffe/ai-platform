import React from "react";

/**
 * Settings layout wrapper rendering the workspace settings page header context.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full text-foreground font-sans animate-fade-in text-left">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-lg font-bold text-foreground">Workspace Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your account settings, credentials, billing metrics, and node diagnostics.
        </p>
      </div>
      {children}
    </div>
  );
}
