import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

let activeRefreshPromise: Promise<{ accessToken: string; refreshToken: string; error?: string }> | null = null;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (activeRefreshPromise) {
    console.log("[Auth-Refresh] Concurrent refresh request detected for user:", token.userId, ". Awaiting ongoing refresh...");
    return activeRefreshPromise.then((refreshed) => {
      if (refreshed.error) {
        return {
          ...token,
          error: refreshed.error,
        };
      }
      return {
        ...token,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        accessTokenExpires: Date.now() + 15 * 60 * 1000,
      };
    });
  }

  activeRefreshPromise = (async () => {
    try {
      const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
      console.log("[Auth-Refresh] Attempting to refresh access token for user ID:", token.userId, "URL:", `${backendUrl}/api/v1/auth/refresh`);

      if (!token.refreshToken) {
        console.warn("[Auth-Refresh] Warning: token.refreshToken is missing in JWT payload");
      }

      const response = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: token.refreshToken,
        }),
      });

      console.log("[Auth-Refresh] Response status:", response.status, response.statusText);

      const responseText = await response.text();
      let refreshedTokens: Record<string, unknown> = {};
      try {
        refreshedTokens = JSON.parse(responseText) as Record<string, unknown>;
      } catch (e) {
        console.error("[Auth-Refresh] Failed to parse response JSON. Body:", responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error("[Auth-Refresh] Backend returned non-2xx response:", refreshedTokens);
        throw refreshedTokens;
      }

      console.log("[Auth-Refresh] Token refreshed successfully!");
      return {
        accessToken: refreshedTokens.access_token as string,
        refreshToken: (refreshedTokens.refresh_token as string) ?? token.refreshToken,
      };
    } catch (error) {
      console.error("[Auth-Refresh] RefreshAccessTokenError exception occurred:", error);
      return {
        accessToken: "",
        refreshToken: "",
        error: "RefreshAccessTokenError",
      };
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise.then((refreshed) => {
    if (refreshed.error) {
      return {
        ...token,
        error: refreshed.error,
      };
    }
    return {
      ...token,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessTokenExpires: Date.now() + 15 * 60 * 1000,
    };
  });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
        try {
          const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          if (res.ok && data.access_token) {
            // Decode the access token JWT payload to extract user ID (sub)
            const payloadBase64 = data.access_token.split(".")[1];
            const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
            const payload = JSON.parse(payloadJson);
            const userId = payload.sub || credentials.email;

            return {
              id: userId,
              email: credentials.email,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            };
          }
          return null;
        } catch (error) {
          console.error("Auth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + 15 * 60 * 1000,
          userId: user.id,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires || 0)) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      if (session.user) {
        session.user.id = token.userId || "";
        session.user.email = token.email || "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "supersecretnextauthsecret",
};
