import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import OrgShell from "@/components/orgs/OrgShell";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

/**
 * Layout for all /orgs/[orgSlug]/* pages.
 * Enforces authentication, then delegates to OrgShell which fetches
 * org context and renders the RBAC-aware sidebar.
 *
 * @param children - Nested page content.
 * @param params - Route params containing the org slug.
 * @returns The org portal layout or a login redirect.
 */
export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { orgSlug } = await params;
  return <OrgShell slug={orgSlug}>{children}</OrgShell>;
}
