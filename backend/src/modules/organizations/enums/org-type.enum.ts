/**
 * Enumeration representing the operational type of an organization workspace.
 * Determines which wallets are initialized and which platform features are accessible.
 */
export enum OrgType {
  /** Publishes AI models and earns revenue from API calls. Initialized with CONSUMER + PROVIDER wallets. */
  PROVIDER = 'PROVIDER',
  /** Integrates marketplace models into their own products. Initialized with CONSUMER wallet only. */
  CONSUMER = 'CONSUMER',
  /** Both publishes models and integrates marketplace models. Initialized with both wallets. */
  HYBRID = 'HYBRID',
}
