"use server";

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
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${backendUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to register");
    }

    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Registration failed";
    return { success: false, error: errorMessage };
  }
}
