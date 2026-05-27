/**
 * Sends a registration request to the backend auth services.
 *
 * @param email - User registration email address.
 * @param password - User registration password.
 * @returns A promise resolving to the JSON body returned by the registration response.
 * @throws {Error} If registration fails or responds with a non-OK status.
 */
export async function registerUser(email: string, password: string): Promise<unknown> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
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

  return data;
}
