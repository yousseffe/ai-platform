import { getServerSession } from "next-auth/next";
import { getSession } from "next-auth/react";
import { authOptions } from "@/auth";
import { Session } from "next-auth";

const isServer = typeof window === "undefined";

/**
 * Fetches data from the MLHub backend API, resolving credentials automatically.
 * On the server, it reads authentication details from NextAuth server-side options.
 * On the client, it retrieves the active user session token via NextAuth react utilities.
 * If a session accessToken is present, it is attached as a Bearer authorization header.
 *
 * @template T - The expected return type of the deserialized JSON response.
 * @param path - The backend endpoint sub-path (e.g. "/models").
 * @param options - Standard fetch options (method, headers, body, caching, etc.).
 * @returns A promise that resolves to the parsed generic response data type T.
 * @throws {Error} Throws an error containing the server message if the status code is not ok.
 */
export async function smartFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const backendUrl = isServer
    ? (process.env.BACKEND_URL || "http://localhost:3000")
    : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000");

  let session: Session | null = null;
  let activeWorkspaceId: string | undefined = undefined;

  if (isServer) {
    session = await getServerSession(authOptions);
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    activeWorkspaceId = cookieStore.get("activeWorkspaceId")?.value;
  } else {
    session = await getSession();
    const match = document.cookie.match(/(?:^|; )activeWorkspaceId=([^;]*)/);
    activeWorkspaceId = match ? decodeURIComponent(match[1]) : undefined;
  }

  const headers = new Headers(options.headers);
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  if (activeWorkspaceId) {
    headers.set("X-Workspace-Id", activeWorkspaceId);
  }

  // Let the browser set the boundary for FormData requests, otherwise default to json
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${backendUrl}/api/v1${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMessage = "An error occurred while fetching the data.";
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      try {
        const text = await res.text();
        if (text) errorMessage = text;
      } catch {}
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) {
    return null as unknown as T;
  }

  try {
    return await res.json();
  } catch {
    return null as unknown as T;
  }
}

