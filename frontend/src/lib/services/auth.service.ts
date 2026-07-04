/**
 * Sends a registration request to the backend auth services.
 *
 * @param email - User registration email address.
 * @param username - User registration username.
 * @param password - User registration password.
 * @returns A promise resolving to the JSON body returned by the registration response.
 * @throws {Error} If registration fails or responds with a non-OK status.
 */
export async function registerUser(email: string, full_name: string, password: string): Promise<unknown> {
  const backendUrl =
    (typeof window === "undefined"
      ? process.env.BACKEND_URL
      : process.env.NEXT_PUBLIC_BACKEND_URL) || "http://localhost:3000";

  const res = await fetch(`${backendUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, full_name, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to register");
  }

  return data;
}

/**
 * Validates the email verification OTP.
 *
 * @param email - User email address.
 * @param otp - 6-digit verification code.
 * @returns A promise resolving to the verification response.
 * @throws {Error} If verification fails.
 */
export async function verifyUser(email: string, otp: string): Promise<unknown> {
  const backendUrl =
    (typeof window === "undefined"
      ? process.env.BACKEND_URL
      : process.env.NEXT_PUBLIC_BACKEND_URL) || "http://localhost:3000";

  const res = await fetch(`${backendUrl}/api/v1/auth/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to verify account");
  }

  return data;
}
