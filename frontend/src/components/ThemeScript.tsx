"use client";

import React from "react";
import { useServerInsertedHTML } from "next/navigation";

/**
 * ThemeScript component injected during server rendering.
 * Safely inserts the theme initialization script into the document head
 * to prevent flickering in light/dark mode without triggering React 19 console warnings.
 *
 * @returns null (injects script elements into the server response head)
 */
export default function ThemeScript() {
  useServerInsertedHTML(() => (
    <script
      id="theme-initializer"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              const savedTheme = localStorage.getItem('theme') || 'dark';
              if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {}
          })()
        `,
      }}
    />
  ));
  return null;
}
