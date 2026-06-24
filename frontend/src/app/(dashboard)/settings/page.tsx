import { redirect } from "next/navigation";

/**
 * Root settings page triggering automatic redirection to the profile sub-page.
 */
export default function SettingsPage() {
  redirect("/settings/profile");
}
