"use server";

import * as authService from "@/lib/services/auth.service";

/**
 * Registers a new user account with the backend service.
 *
 * @param email - The email address for the new user account.
 * @param username - The unique username.
 * @param password - The raw registration password.
 * @returns A promise resolving to a discriminated union indicating success or a detailed failure message.
 */
export async function registerUser(
  email: string,
  username: string,
  password: string
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const data = await authService.registerUser(email, username, password);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Registration failed";
    return { success: false, error: errorMessage };
  }
}

/**
 * Verifies email ownership via OTP code.
 *
 * @param email - The user's email address.
 * @param otp - The 6-digit code.
 * @returns A promise indicating verification success or error.
 */
export async function verifyUser(
  email: string,
  otp: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await authService.verifyUser(email, otp);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Verification failed";
    return { success: false, error: errorMessage };
  }
}
