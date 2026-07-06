# Consumer Pages Summary

هذا الملف يلخص ماذا يستطيع `Consumer` أن يفعل داخل النظام، وما هي الصفحات المتاحة له حاليًا بناءً على الـ routes والـ UI الحالية في المشروع.

## 1. ما الذي يستطيع الـ Consumer عمله؟

الـ Consumer هو المستخدم الذي يستهلك الموديلات الجاهزة من المنصة، وليس الذي ينشر موديلات جديدة.

أهم القدرات المتاحة له:

- تصفح الـ marketplace واكتشاف الموديلات العامة.
- فتح صفحة تفاصيل أي model عام ومراجعة وصفه وبياناته.
- إنشاء API Keys لاستخدام الموديلات.
- إرسال inference requests إلى الموديلات من خلال الـ API.
- متابعة سجل الطلبات السابقة واستهلاك الرصيد.
- متابعة إحصائيات الاستهلاك لكل model.
- شحن رصيد الـ consumer wallet إذا كان لديه صلاحية billing.
- مراجعة معاملات الـ wallet وسجل الخصومات والمدفوعات.
- إنشاء MCP access tokens لاستخدامات التكامل والقراءة حسب الـ scopes المتاحة.
- تعديل بياناته الأساسية من صفحة الـ profile.
- إنشاء organization جديدة والعمل من خلال workspace جماعي.
- التحول إلى `Provider` لاحقًا من الـ onboarding الموجود في الـ dashboard/profile.

## 2. صفحات الـ Consumer في الـ Personal Workspace

هذه هي الصفحات الأساسية المتاحة للمستخدم وهو يعمل في وضع `Consumer` داخل الـ personal dashboard:

### Dashboard

- `/dashboard`
  - الصفحة الرئيسية للـ consumer.
  - تعرض:
    - Consumer balance
    - عدد inference requests الأخيرة
    - recent logs
    - shortcut إلى الـ marketplace
    - onboarding card للتحول إلى provider

### Settings

- `/settings/profile`
  - إدارة الـ profile والهوية الأساسية للمستخدم.
  - تعديل الاسم، الـ bio، الروابط، ومراجعة الدور الحالي.

- `/settings/billing`
  - إدارة الـ wallet والـ billing.
  - شحن الرصيد.
  - عرض transactions history.
  - البحث والفلترة في المعاملات.
  - هذه الصفحة تكون مقيدة إذا لم يكن للمستخدم صلاحية billing في الـ workspace الحالي.

- `/settings/api`
  - إدارة API credentials.
  - إنشاء API key وربطه بـ model.
  - عرض الـ keys الحالية.
  - إلغاء key.
  - عرض consumer usage stats لكل model.
  - عرض consumer logs الخاصة بالاستخدام.

- `/settings/mcp-tokens`
  - إنشاء وإدارة MCP tokens.
  - اختيار scopes.
  - تحديد expiration.
  - revoke / delete tokens.

- `/settings`
  - ليست صفحة مستقلة فعليًا.
  - تعمل redirect مباشرة إلى `/settings/profile`.

## 3. صفحات الـ Marketplace العامة التي يعتمد عليها الـ Consumer

هذه الصفحات ليست "consumer-only" لكنها جزء أساسي من رحلة الـ consumer:

- `/`
  - Landing page / marketplace landing.
  - تعرض الموديلات العامة وأقسام الاستكشاف.

- `/explore`
  - صفحة تصفح الـ models catalog.
  - search / filter / browse للموديلات العامة.

- `/explore/[id]`
  - صفحة تفاصيل model عام.
  - تعرض التفاصيل والوصف وبيانات الاستخدام وواجهة التجربة حسب ما هو متاح.

- `/explore/pipelines/[id]`
  - صفحة تفاصيل pipeline عام.
  - مفيدة إذا كان الـ consumer يستكشف pipeline منشور بشكل public.

## 4. صفحات الـ Workspace / Organization المرتبطة بالـ Consumer

### إنشاء Workspace

- `/workspaces/create`
  - إنشاء organization / workspace جديد.
  - مناسب للفرق التي تريد استهلاك الموديلات بشكل جماعي.

### عند الدخول إلى Consumer Organization أو Hybrid Organization

إذا كان المستخدم داخل organization من نوع `CONSUMER` أو `HYBRID` فغالبًا سيجد الصفحات التالية:

- `/orgs/[orgSlug]/overview`
  - overview عام للـ organization.
  - يعرض stats مثل members / projects / credits balance حسب الصلاحيات.

- `/orgs/[orgSlug]/projects`
  - إدارة projects الخاصة بالاستهلاك.
  - تنظيم التطبيقات أو integrations التي تستخدم الموديلات.

- `/orgs/[orgSlug]/projects/[projectId]`
  - تفاصيل project معين.
  - عادة تشمل مفاتيح API وسجل النشاط والاستهلاك المرتبط بالمشروع.

- `/orgs/[orgSlug]/usage`
  - usage tracking على مستوى الـ organization.
  - تعرض requests / credits used / error rate / activity breakdowns.

- `/orgs/[orgSlug]/billing`
  - billing الخاص بالـ organization.
  - متاح فقط لمن لديه صلاحيات billing المناسبة.

- `/orgs/[orgSlug]/members`
  - إدارة أعضاء الـ organization.
  - تظهر فقط لمن لديه صلاحيات الإدارة والدعوة.

- `/orgs/[orgSlug]/settings`
  - إعدادات الـ organization.
  - متاحة حسب الـ role.

## 5. صفحات ليست للـ Consumer Mode

هذه الصفحات تعتبر provider-side أو operational publishing pages، وبالتالي لا تظهر في الـ sidebar عندما يكون المستخدم في `Consumer mode`:

- `/models`
- `/models/upload`
- `/models/[id]`
- `/models/[id]/upload`
- `/models/[id]/test`
- `/pipelines`
- `/pipelines/[id]`
- `/provider/subscriptions`
- `/provider/payments`

بمعنى آخر:

- الـ Consumer يستهلك models
- الـ Provider ينشر ويدير models

## 6. ملخص سريع جدًا

الـ Consumer في النظام يركز على 4 محاور رئيسية:

1. اكتشاف الموديلات
2. إنشاء مفاتيح واستخدام الـ API
3. متابعة الاستهلاك والرصيد
4. العمل من خلال personal workspace أو organization consumer workspace

## 7. أهم الصفحات باختصار

- `/dashboard`
- `/settings/profile`
- `/settings/billing`
- `/settings/api`
- `/settings/mcp-tokens`
- `/`
- `/explore`
- `/explore/[id]`
- `/explore/pipelines/[id]`
- `/workspaces/create`
- `/orgs/[orgSlug]/overview`
- `/orgs/[orgSlug]/projects`
- `/orgs/[orgSlug]/projects/[projectId]`
- `/orgs/[orgSlug]/usage`
- `/orgs/[orgSlug]/billing`
- `/orgs/[orgSlug]/members`
- `/orgs/[orgSlug]/settings`

