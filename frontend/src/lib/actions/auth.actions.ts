"use server";

import * as authService from "@/lib/services/auth.service";

/**
 * Registers a new user account with the backend service.
 *
 * @param email - The email address for the new user account.
 * @param password - The raw registration password.
 * @returns A promise resolving to a discriminated union indicating success or a detailed failure message.
 */
export async function registerUser(
  email: string,
  password: string
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const data = await authService.registerUser(email, password);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Registration failed";
    return { success: false, error: errorMessage };
  }
}
