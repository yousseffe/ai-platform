"use client";

import { useEffect, useState } from "react";
import { getMyProfile, type MyProfileResponse } from "@/lib/services/auth.service";

/**
 * Fetches the authenticated user's real backend profile (admin/provider
 * status, wallet balances, workspace memberships) on mount, so pages can
 * derive an accurate platform role label instead of a static placeholder.
 *
 * @returns The fetched profile (or null while loading/on failure) and a loading flag.
 */
export function useMyProfile(): { profile: MyProfileResponse | null; isLoading: boolean } {
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getMyProfile();
        if (active) setProfile(result);
      } catch (err) {
        console.warn("Failed to load user profile:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return { profile, isLoading };
}

/**
 * Derives a human-readable platform role label from the profile's
 * admin/provider flags.
 *
 * @param profile - The fetched profile, or null while unavailable.
 * @returns A display label describing the user's platform role.
 */
export function derivePlatformRoleLabel(profile: MyProfileResponse | null): string {
  if (!profile) return "Platform Developer";
  if (profile.user.isAdmin) return "Platform Admin";
  if (profile.user.providerMode) return "Model Provider";
  return "Platform Developer";
}
