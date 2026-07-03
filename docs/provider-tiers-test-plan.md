# Provider Tiers Test Plan

## Automated Tests Added

Run:

```bash
cd backend
npx jest modules/provider-accounts --runInBand
```

Coverage currently added:

- `calculateOfferPricing`
  - percentage discounts
  - fixed discounts
  - discount cannot make checkout amount negative
- provider limit utilities
  - custom override precedence
  - `null` means unlimited
  - finite limits throw when exhausted
- `ProviderUtilizationService.resolveEffectiveLimits`
  - provider overrides win over tier defaults
  - unset overrides fall back to tier defaults

## Backend Unit Test Cases To Add Next

- `ProviderOffersService.validateOfferCode`
  - inactive offer rejected
  - expired/not-started offer rejected
  - wrong tier rejected
  - wrong billing cycle rejected
  - new/existing provider eligibility enforced
  - max redemptions enforced
  - per-provider redemptions enforced
- `ProviderLimitsService.assertCanCreateModel`
  - missing provider account rejected
  - suspended provider rejected
  - inactive tier rejected
  - max total models enforced
  - max public models enforced
  - type-specific limits enforced
  - org publishing blocked when tier disallows it
  - private model blocked when tier disallows it
- `ProviderLimitsService.assertCanCreateModelVersion`
  - missing provider account rejected
  - suspended provider rejected
  - per-model version limit enforced
- `InferencePricingService.computeCost`
  - model custom pricing wins
  - provider custom share wins
  - tier share wins
  - global default is fallback
- `WalletLedgerService.creditSystemRevenue`
  - creates system wallet if missing
  - credits EGP provider wallet
  - writes completed transaction
  - duplicate Stripe event is idempotent

## Manual API Test Plan

### 1. Seed Tiers

Start backend and confirm default tiers exist:

```http
GET /api/v1/admin/provider/tiers
```

Expected:

- `FREE`
- `STARTER`
- `PRO`
- `BUSINESS`
- `ENTERPRISE`

### 2. Enable Personal Provider

Use existing profile action or admin toggle:

```http
PATCH /api/v1/admin/users/:id/toggle-provider
```

Expected:

- `users.provider_mode=true`
- `provider_accounts` row exists for `ownerType=USER`
- `PROVIDER` wallet exists with `currency=EGP`
- default tier is assigned

### 3. Create Provider Organization

Create an organization with `type=PROVIDER` or `type=HYBRID`.

Expected:

- provider account exists for `ownerType=ORG`
- org provider wallet exists with `currency=EGP`
- account status is `ACTIVE`

### 4. Model Upload Limits

Create models until the tier limit is reached.

Expected:

- allowed models succeed
- request exceeding `maxModels` fails
- public model exceeding `maxPublicModels` fails
- type-specific limit fails with a clear message

### 5. Version Upload Limits

Upload versions until `maxVersionsPerModel` is reached.

Expected:

- allowed versions succeed
- next version fails with `Provider model version limit reached`

### 6. Tier-Aware Billing

Set provider tier share to a non-default value, then run inference.

Expected:

- consumer wallet is debited in credits
- provider wallet receives tier-based EGP share
- system wallet receives remaining platform commission
- old transactions remain unchanged

### 7. Provider Override Billing

Set `customProviderSharePercent` on the provider account.

Expected:

- new inference calls use the override
- tier defaults are ignored for that provider
- model custom pricing still has highest precedence

### 8. Offer Checkout

Create an offer and call:

```http
POST /api/v1/provider-accounts/subscription-checkout
```

Expected:

- offer is validated before Stripe checkout
- final amount is discounted
- Stripe metadata includes provider account, tier, billing cycle, offer, and amount

### 9. Provider Subscription Webhook

Send a `checkout.session.completed` webhook to:

```http
POST /api/v1/provider-accounts/webhook
```

Expected:

- provider tier changes
- system/admin wallet receives subscription revenue in EGP
- offer redemption is logged when offer metadata exists
- duplicate webhook does not double-credit system wallet

## Current Verification Notes

The focused provider account test suite passes locally.

Full backend build is currently blocked by existing environment/project issues unrelated to the provider tier implementation:

- missing OpenTelemetry/Winston/WebSocket type packages in local `node_modules`
- missing `pipeline-type-guard.util` import used by the existing pipelines module

