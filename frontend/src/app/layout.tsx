import type { Metadata } from "next";
import NextAuthSessionProvider from "@/components/providers/SessionProvider";
import { Toaster } from "react-hot-toast";
import ThemeScript from "@/components/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "MLHub - Model Registry & Deployment Platform",
  description: "Enterprise model registry, version control, and containerized deployment infrastructure.",
};

/**
 * Root layout component for the application.
 * Injects global CSS styles, initializes the theme based on local storage to prevent flickering,
 * and sets up global providers like SessionProvider and Toaster.
 *
 * @param props - The props object.
 * @param props.children - The children React nodes to render.
 * @returns The HTML structure wrapping the application.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <NextAuthSessionProvider>
          <Toaster 
            position="top-right" 
            toastOptions={{
              className: 'dark:bg-[#121316] dark:text-[#ededed] dark:border-[#222326] border bg-white text-slate-800 text-xs font-sans rounded-lg shadow-lg',
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
            }}
          />
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
