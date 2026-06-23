import type { Metadata } from "next";
import NextAuthSessionProvider from "@/components/providers/SessionProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "MLHub - Model Registry & Deployment Platform",
  description: "Enterprise model registry, version control, and containerized deployment infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <body>
        <script
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
