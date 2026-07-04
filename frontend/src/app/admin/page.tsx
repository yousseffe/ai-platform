import { redirect } from "next/navigation";

/**
 * Redirects the legacy admin root route to the new professional overview page.
 *
 * @returns Never returns because the request is redirected.
 */
export default function AdminRootPage() {
  redirect("/admin/dashboard");
}
