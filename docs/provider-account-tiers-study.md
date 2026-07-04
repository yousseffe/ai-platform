# Provider Account Tiers Study

## الهدف

الملف ده بيلخص:

1. إيه الموجود حالياً في المنصة بخصوص الفلوس والـ billing والـ provider flows.
2. إيه الحاجات اللي الأدمن بيتحكم فيها فعلاً اليوم.
3. إيه اللي موجود باسم `tier` حالياً، وإيه اللي لسه مش موجود.
4. أفضل طريقة نضيف بيها `provider account tiers` بحيث تكون مفهومة وقابلة للتشغيل من الـ admin.

---

## Executive Summary

- حالياً المنصة شغالة باقتصاد مزدوج:
  - `CONSUMER wallet` للـ credits.
  - `PROVIDER wallet` لأرباح الـ providers بعملة `EGP`.
- الاستهلاك بيتحاسب بالـ credits، وبعدها بيتحول داخلياً لـ `EGP` علشان توزيع أرباح الـ provider وعمولة المنصة.
- الأدمن يقدر حالياً يعدل:
  - أسعار الـ model defaults.
  - نسبة `default_provider_share_percent`.
  - `credits_per_egp`.
  - قيم `commission_tier_free/professional/enterprise`.
  - pricing مخصص لكل model.
  - تفعيل/إلغاء `providerMode` و `isAdmin` للحسابات.
- لكن **لا يوجد حالياً `provider account tier` حقيقي** مربوط بحساب الـ provider نفسه.
- الموجود حالياً باسم `tier` هو:
  - `model.tier` لتوصيف/حجم الـ model مثل `SMALL` و `LARGE`.
  - system config constants لعمولات `free/professional/enterprise`.
- المشكلة الأهم: قيم `commission_tier_*` موجودة في الـ admin config لكن **غير مستخدمة داخل runtime billing**.
- كمان في الحسابات الشخصية، تفعيل `providerMode` فيه gap مهم:
  - self-enroll بيعمل `providerMode=true` لكن بينشئ `CONSUMER wallet` وليس `PROVIDER wallet`.
  - admin toggle لـ `providerMode` بيغيّر الـ flag فقط بدون provisioning إضافي.

---

## الوضع الحالي بالتفصيل

### 1. بنية المحافظ والعملة

الكيان الأساسي هو `Wallet` وفيه:

- `walletType`: `CONSUMER` أو `PROVIDER`
- `ownerType`: `USER` أو `ORG`
- `currency`
- `balance`

مرجع: `backend/src/modules/wallets/entities/wallet.entity.ts`

القاعدة الحالية:

- `CONSUMER wallet` غالباً عملته `CREDITS`
- `PROVIDER wallet` غالباً عملته `EGP`

---

### 2. طرق الدفع والتحويلات الموجودة حالياً

#### A. شحن credits

فيه طريقتين للشحن:

1. Stripe package checkout من `POST /payments/checkout`
2. Stripe custom top-up من `POST /wallets/checkout-session`

الـ webhook في `WalletsService.processStripeWebhook()` بيعالج:

- organization creation payments
- package purchases
- custom wallet top-ups
- payment failures

أهم نقطة:

- أي top-up بيروح دائماً إلى `CONSUMER wallet`
- المبلغ بيتحول من `EGP` إلى `credits` باستخدام `credits_per_egp`

مراجع:

- `backend/src/modules/wallets/services/wallets.service.ts:172`
- `backend/src/modules/wallets/services/wallets.service.ts:432`

#### B. سحب أرباح الـ provider

السحب موجود من `POST /wallets/withdraw`

- السحب يشتغل على `PROVIDER wallet`
- العملة المتوقعة `EGP`

مرجع:

- `backend/src/modules/wallets/services/wallets.service.ts` في `withdrawFunds()`

#### C. رسوم إنشاء organization

إنشاء organization فيه fee تتخصم من creator أو من Stripe:

- لو دفع داخلياً: بيتخصم من `USER CONSUMER wallet`
- المنصة بتستقبل المقابل في system wallet
- نوع الـ wallet عند المنصة يختلف حسب طريقة الدفع:
  - داخلياً: `CONSUMER`
  - Stripe: `PROVIDER` بعملة `EGP`

مراجع:

- `backend/src/modules/organizations/services/organizations.service.ts:71`
- `backend/src/modules/wallets/services/wallets.service.ts:469`

---

### 3. Billing وقت inference

الـ runtime الحقيقي للفلوس موجود في:

- `InferencePricingService`
- `InferenceBillingService`

#### التسعير

عند كل request:

- لو الـ model عليه `hasCustomPricing=true`:
  - ياخد `model.costPerRequest`
  - وياخد `model.providerSharePercent`
- غير كده:
  - ياخد default price حسب نوع الـ model
  - وياخد `default_provider_share_percent`

مرجع:

- `backend/src/modules/models/services/inference-pricing.service.ts:24`

#### التوزيع المالي

بعد request ناجح:

1. خصم credits من consumer workspace
2. تسجيل transaction debit على consumer wallet
3. تحويل cost من credits إلى `EGP`
4. حساب نصيب الـ provider من خلال `providerSharePercent`
5. تحويل الباقي إلى platform commission
6. إضافة نصيب الـ provider في `PROVIDER wallet`
7. إضافة نصيب المنصة في system `PROVIDER wallet`

مرجع:

- `backend/src/modules/models/services/inference-billing.service.ts:36`

المعادلة الحالية:

```text
costInEgp = costCredits / credits_per_egp
providerShareEgp = costInEgp * (providerSharePercent / 100)
platformShareEgp = costInEgp - providerShareEgp
```

---

### 4. الأدمن بيتحكم في إيه حالياً

#### A. Global pricing config

الأدمن يقدر يقرأ ويعدل:

- `price_tabular`
- `price_nlp`
- `price_vision`
- `price_diffusion`
- `price_llm_gguf_input`
- `price_llm_gguf_output`
- `default_provider_share_percent`
- `playground_trial_limit`
- `credits_per_egp`
- `commission_tier_free`
- `commission_tier_professional`
- `commission_tier_enterprise`

مرجع:

- `backend/src/modules/users/controllers/admin.controller.ts:306`
- `backend/src/modules/users/controllers/admin.controller.ts:334`

#### B. Model-level pricing

الأدمن يقدر يغير لكل model:

- `costPerRequest`
- `providerSharePercent`
- وبمجرد التعديل `hasCustomPricing=true`

مرجع:

- `backend/src/modules/users/controllers/admin.controller.ts` في `PATCH /admin/models/:id/pricing`

#### C. User/provider/admin toggles

الأدمن يقدر:

- يفعّل/يلغي `isAdmin`
- يفعّل/يلغي `providerMode`
- يعدل wallets يدوياً

مرجع:

- `backend/src/modules/users/controllers/admin.controller.ts:720`
- `backend/src/modules/users/controllers/admin.controller.ts:737`

#### D. Admin visibility

الأدمن عنده console لعرض:

- users
- models
- transactions
- system config

واجهات مهمة:

- `frontend/src/app/admin/users/page.tsx`
- `frontend/src/app/admin/models/page.tsx`
- `frontend/src/components/admin/SystemConfigTab.tsx`
- `frontend/src/components/admin/AdjustPricingModal.tsx`

---

## ما هو الـ tier الموجود حالياً؟

### 1. `model.tier`

في `Model` entity فيه field اسمه `tier`.

لكن ده حالياً:

- توصيف للـ model نفسه
- وليس provider subscription tier

ومبدئياً بيتحدد تلقائياً:

- `DIFFUSION => LARGE`
- غيره => `SMALL`

مراجع:

- `backend/src/modules/models/entities/model.entity.ts`
- `backend/src/modules/models/services/models.service.ts:154`

### 2. `commission_tier_free/professional/enterprise`

دي موجودة في system config seed وفي admin config.

لكن حالياً:

- مجرد values محفوظة
- لا يوجد ربط بينها وبين user/provider/org
- لا يوجد runtime usage في inference billing

مراجع:

- `backend/src/shared/migrations/seed-pricing-config.sql`
- `backend/src/modules/users/controllers/admin.controller.ts:321`

### الخلاصة

حالياً عندنا:

- `model tier`: موجود
- `commission tier constants`: موجودة
- `provider account tier`: **غير موجود**

---

## Gaps ومشاكل لازم نبقى عارفينها قبل التنفيذ

### 1. الـ tiering غير موصول بالـ runtime

أكبر gap إن billing runtime بيعتمد على:

- `model.providerSharePercent`
- أو `default_provider_share_percent`

لكن **لا يقرأ أي provider tier**.

يعني حتى لو الأدمن غيّر:

- `commission_tier_free`
- `commission_tier_professional`
- `commission_tier_enterprise`

ده حالياً **لن يغيّر أي inference payout**.

### 2. تفعيل provider للحساب الشخصي فيه inconsistency

في `UsersService.enableProvider()` الـ comment بيقول إنه بينشئ provider wallet،
لكن التنفيذ الفعلي بينشئ:

```ts
WalletType.CONSUMER
```

مرجع:

- `backend/src/modules/users/services/users.service.ts:90`

وده معناه إن personal provider ممكن يبقى عنده:

- `providerMode=true`
- لكن بدون `PROVIDER wallet` provisioned مسبقاً

صحيح إن `InferenceBillingService` يقدر ينشئ provider wallet lazy عند أول revenue،
لكن ده مش ideal لو إحنا هنبني tiers وصلاحيات وفحوصات على وجود account مالي واضح.

### 3. Admin toggle للـ providerMode ضعيف

`PATCH /admin/users/:id/toggle-provider`:

- يغير الـ boolean فقط
- لا ينشئ tier
- لا ينشئ provider wallet
- لا يضيف metadata
- لا يسجل lifecycle واضح للترقية/الإلغاء

مرجع:

- `backend/src/modules/users/controllers/admin.controller.ts:737`

### 4. الـ tier لا يملك owner حقيقي

لا يوجد حالياً field مثل:

- `providerTier`
- `providerStatus`
- `tierAssignedBy`
- `tierAssignedAt`
- `tierOverrideProviderSharePercent`

سواء على:

- `users`
- أو `organizations`

### 5. Owner ambiguity

الـ provider ممكن يكون:

- user personal workspace
- organization provider workspace

لذلك لو هنضيف tiers لازم نجاوب بوضوح:

- هل الـ tier يتربط بالـ `USER`؟
- ولا بالـ `ORG`؟
- ولا بالاثنين مع abstraction موحّد؟

التوصية: tier يكون على أي workspace publishing owner، يعني:

- personal provider workspace
- provider organization

---

## التوصية المعمارية

## الهدف من الـ tiers

أفضل استخدام منطقي للـ `provider account tiers` في المنصة الحالية هو:

- التحكم في نسبة عمولة المنصة
- التحكم في حدود/صلاحيات النشر
- التحكم في eligibility لبعض المميزات
- الإدارة من خلال الـ admin

وليس فقط label شكلي.

### Tiers المقترحة

اقتراح عملي متوافق مع الموجود:

1. `FREE`
2. `PROFESSIONAL`
3. `ENTERPRISE`

### كل tier يحدد إيه؟

لازم كل tier يحدد policy واضحة مثل:

- `platformCommissionPercent`
- `providerSharePercent`
- `maxPublicModels`
- `allowPriorityReview`
- `allowCustomBranding`
- `allowOrgPublishing`
- `allowDedicatedSupport`
- `allowPrivateModels`
- `allowHigherRateLimits`

### أهم قرار

لا أنصح إننا نخزن فقط اسم الـ tier ونرجع كل مرة نقرأ config متفرق.

الأفضل نفصل بين:

1. `Tier definition`
2. `Tier assignment`

---

## التصميم المقترح للبيانات

### Option A: سريع وبسيط

إضافة fields مباشرة على owner entities:

على `users`:

- `provider_tier`
- `provider_tier_assigned_at`
- `provider_tier_assigned_by`

وعلى `organizations`:

- نفس الحقول

الميزة:

- سريع في التنفيذ

العيب:

- منطق tiers هيتكرر بين user و org

### Option B: أنظف وقابل للتوسع

إضافة table جديدة مثل:

`provider_accounts`

حقول مقترحة:

- `id`
- `ownerType` (`USER` | `ORG`)
- `ownerId`
- `tier` (`FREE` | `PROFESSIONAL` | `ENTERPRISE`)
- `status` (`PENDING` | `ACTIVE` | `SUSPENDED`)
- `assignedBy`
- `assignedAt`
- `notes`
- `customProviderSharePercent` nullable
- `customCommissionPercent` nullable

وممكن table ثانية:

`provider_tier_definitions`

حقول مقترحة:

- `code`
- `displayName`
- `platformCommissionPercent`
- `maxPublicModels`
- `maxModels`
- `priorityReview`
- `privateSupport`
- `isActive`

### التوصية النهائية

لو الهدف إننا نبدأ بسرعة لكن بشكل محترم:

- اعملوا `provider_accounts` table
- وخزّنوا فيها assignment الحالي
- وخلي tier definitions في `system_configs` أو table مستقلة

---

## كيف نشغل الـ tier فعلياً في billing

### القاعدة المقترحة

بدل ما runtime يعتمد فقط على:

- `model.providerSharePercent`
- `default_provider_share_percent`

يبقى الترتيب كده:

1. لو model عليه custom override صريح من admin:
   - استخدم `model.providerSharePercent`
2. غير كده لو provider account له tier:
   - استخدم share/commission الخاصة بالـ tier
3. غير كده:
   - fallback إلى `default_provider_share_percent`

### منطق أدق مقترح

```text
if model.hasCustomPricing and model.providerSharePercent is set:
  use model.providerSharePercent
else if providerAccount.customProviderSharePercent exists:
  use it
else if providerAccount.tier exists:
  use tier.defaultProviderSharePercent
else:
  use global default_provider_share_percent
```

وده يحافظ على:

- global defaults
- tier defaults
- per-provider overrides
- per-model overrides

---

## إزاي الأدمن يدير الـ tiers

### Minimum Admin Features

الأدمن محتاج يقدر يعمل:

1. عرض كل provider accounts
2. يعرف الـ owner:
   - user ولا org
3. يشوف tier الحالي
4. يغير tier
5. يوقف provider account
6. يشوف balances:
   - consumer
   - provider
7. يشوف model count وpublic models
8. يشوف effective commission/share

### Admin flows المقترحة

#### Flow 1: Assign provider tier

- الأدمن يفتح provider account
- يختار `FREE/PROFESSIONAL/ENTERPRISE`
- السيستم يسجل:
  - `assignedBy`
  - `assignedAt`
  - optional note

#### Flow 2: Promote/Demote

- تغيير tier لا يجب أن يعدل historical transactions
- يؤثر فقط على requests الجديدة

#### Flow 3: Suspend provider

- لو provider status = `SUSPENDED`
- يمنع:
  - نشر models جديدة
  - public visibility
  - أو deployment حسب policy

---

## ما الذي يفتح له كل tier؟

بناءً على طبيعة المنصة الحالية، ده اقتراح أولي منطقي:

### FREE

- publish personal أو org provider models
- public marketplace listing
- default review queue
- default support
- platform commission = `commission_tier_free`
- limits منخفضة

### PROFESSIONAL

- عمولة أقل
- limits أعلى
- عدد models public أكبر
- أولوية أعلى في review
- optional branding/support

### ENTERPRISE

- أقل عمولة
- limits أعلى جداً أو بدون limit
- dedicated support
- advanced visibility and private agreements

### ملاحظة مهمة

لو tier الهدف منه عمولة فقط، يبقى التنفيذ أسهل جداً.

لو الهدف منه عمولة + capabilities، لازم tier يدخل أيضاً في:

- create model
- visibility toggle
- deployment
- usage/rate limits
- admin moderation

---

## خطة تنفيذ مقترحة

### Phase 1: تأسيس صحيح

1. إصلاح personal provider provisioning:
   - `enableProvider()` ينشئ `PROVIDER wallet` بشكل صحيح
2. جعل admin toggle-provider ينفذ provisioning كامل
3. إضافة provider account model واضح
4. إضافة tier field + assignment metadata

### Phase 2: ربط billing

1. تعديل `InferencePricingService`
2. إدخال provider-tier-aware resolution
3. الحفاظ على model custom pricing كأعلى أولوية

### Phase 3: Admin UI

1. صفحة/جدول provider accounts
2. filter by tier/status/ownerType
3. assign tier modal
4. effective payout preview

### Phase 4: Capability gating

1. ربط الـ tier بحدود أو صلاحيات
2. منع بعض العمليات حسب tier/status

---

## أولويات التنفيذ التي أنصح بها

لو هنبدأ عملياً، الترتيب الأفضل:

1. إصلاح provisioning bug للـ personal provider
2. إضافة `provider_accounts` abstraction
3. ربط tier بـ billing share
4. بعدها فقط نضيف feature gating

السبب:

- لأن أكبر قيمة business مباشرة موجودة في commission/revenue split
- وبعدها نوسع لاستخدام tier كـ capability system

---

## القرار المقترح نهائياً

### أوصي بالآتي

- اعتبار الـ `provider tier` خاص بالـ publishing workspace owner وليس بالـ model.
- دعم owner من نوعين:
  - `USER`
  - `ORG`
- جعل الأدمن هو المسؤول عن tier assignment.
- جعل `commission_tier_*` بداية لسياسات tiers، لكن **لازم** تتوصل فعلياً في runtime.
- إبقاء `model.providerSharePercent` كـ override أعلى من tier defaults.

### Effective precedence

```text
Model override > Provider account override > Tier default > Global default
```

---

## ملفات أساسية تمت مراجعتها

- `backend/src/modules/models/services/inference-billing.service.ts`
- `backend/src/modules/models/services/inference-pricing.service.ts`
- `backend/src/modules/models/services/models.service.ts`
- `backend/src/modules/models/entities/model.entity.ts`
- `backend/src/modules/wallets/services/wallets.service.ts`
- `backend/src/modules/wallets/entities/wallet.entity.ts`
- `backend/src/modules/wallets/entities/transaction.entity.ts`
- `backend/src/modules/organizations/services/organizations.service.ts`
- `backend/src/modules/users/services/users.service.ts`
- `backend/src/modules/users/controllers/admin.controller.ts`
- `backend/src/shared/migrations/seed-pricing-config.sql`
- `frontend/src/app/admin/users/page.tsx`
- `frontend/src/app/admin/models/page.tsx`
- `frontend/src/components/admin/SystemConfigTab.tsx`
- `frontend/src/components/admin/AdjustPricingModal.tsx`
- `frontend/src/app/orgs/[orgSlug]/billing/page.tsx`

---

## الخلاصة العملية

المنصة اليوم عندها:

- billing engine شغال
- provider earnings شغالة
- admin controls شغالة جزئياً
- seed لفكرة tiers موجود

لكن لسه ناقصها:

- `provider account` layer واضح
- tier assignment حقيقي
- runtime usage للـ tier

بالتالي، إضافة `provider account tiers` مش محتاجة إعادة بناء للنظام كله، لكنها محتاجة:

1. model بيانات واضح للـ provider account
2. wiring داخل billing
3. admin management flow
4. إصلاح gaps الحالية قبل التوسعة

