import { smartFetch } from "@/lib/utils/smart-fetch";

interface CheckoutSessionResponse {
  url: string;
}

/**
 * Creates a Stripe Checkout Session for wallet deposit.
 * Automatically fetches the checkout URL and redirects the user's browser to Stripe.
 *
 * @param amount - The target deposit amount in EGP.
 * @returns A promise resolving to void once redirection starts.
 * @throws {Error} If session URL generation or redirect fails.
 */
export async function redirectToCheckout(
  amount: number,
  options: { workspaceId?: string; returnPath?: string } = {}
): Promise<void> {
  try {
    const data = await smartFetch<CheckoutSessionResponse>("/wallets/checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.workspaceId ? { "X-Workspace-Id": options.workspaceId } : {}),
      },
      body: JSON.stringify({ amount, returnPath: options.returnPath }),
    });

    if (data && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error("Invalid response received from Stripe session creator");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }
}
