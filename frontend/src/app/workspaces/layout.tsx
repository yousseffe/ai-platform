import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Layout wrapper for workspaces routes.
 * Enforces session authentication at the server-side, but bypasses LayoutShell
 * to provide a clean, dedicated workspace creation user interface.
 */
export default async function WorkspacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
