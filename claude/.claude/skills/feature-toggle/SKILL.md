---
name: feature-toggle
description: >
  Create a new feature toggle (feature flag) to show/hide a UI feature per customer.
  Use when the user asks to add a feature flag, feature toggle, gate a feature behind a flag,
  or make a feature conditionally visible. Also trigger on "add a toggle for", "hide behind a flag",
  "feature gate", or similar requests.
---

# Create a Feature Toggle

Add a new feature flag that controls visibility of a feature per customer. Feature flags are stored as string arrays on the Organization model and exposed through the subscription service as `SubscriptionFeature` objects (`{ active: boolean, reason?: string }`).

## Checklist

Follow these steps in order. Each step references the exact file and pattern to follow.

### 1. Add the enum value (backend)

**File**: `packages/core/src/companion/core/enums.py`

Add a new entry to the `FeatureFlags` StrEnum (keep alphabetical within the enum):

```python
class FeatureFlags(StrEnum):
    ...
    MY_FEATURE = "my_feature"
```

### 2. Add the subscription field (backend)

**File**: `packages/core/src/companion/core/models/subscription.py`

Add a `has_<feature>: SubscriptionFeature` field to `CustomerSubscriptionData`:

```python
class CustomerSubscriptionData(BaseModel):
    ...
    has_my_feature: SubscriptionFeature
```

### 3. Wire up the subscription service (backend)

**File**: `packages/core/src/companion/core/services/subscription_service.py`

1. Add `has_my_feature=self._get_has_my_feature(customer)` to the `get_subscription_data()` return dict.
2. Add a private method. Use one of these patterns depending on the toggle behavior:

**Opt-in flag** (feature hidden unless flag is explicitly enabled on the customer):
```python
def _get_has_my_feature(self, customer: Organization) -> SubscriptionFeature:
    if FeatureFlags.MY_FEATURE in customer.additional_features:
        return SubscriptionFeature(active=True)
    return SubscriptionFeature(active=False, reason="My feature flag is not enabled")
```

**Opt-out flag** (feature visible by default, flag disables it):
```python
def _get_has_my_feature(self, customer: Organization) -> SubscriptionFeature:
    if FeatureFlags.DISABLE_MY_FEATURE in customer.additional_features:
        return SubscriptionFeature(active=False, reason="My feature is disabled")
    return SubscriptionFeature(active=True)
```

**Subscription-gated** (requires a specific subscription tier + flag):
```python
def _get_has_my_feature(self, customer: Organization) -> SubscriptionFeature:
    if not self._has_premium_features(customer):
        return SubscriptionFeature(active=False, reason="Customer does not have PROPEL subscription")
    if FeatureFlags.MY_FEATURE not in customer.additional_features:
        return SubscriptionFeature(active=False, reason="My feature flag is not enabled")
    return SubscriptionFeature(active=True)
```

### 4. Update tests (backend)

**File**: `packages/core/tests/test_subscription_service.py`

1. Add `"has_my_feature"` to the `features_inactive` lists in:
   - `TestSubscriptionNone.test_feature_flag_features_inactive_without_flags`
   - `TestSubscriptionPrism.test_prism_feature_flag_features_inactive_without_flags`
   - `TestSubscriptionPropel.test_feature_flag_features_inactive_without_flags`

2. Add parametrized entries in `TestFeatureFlagActivation.test_feature_active_with_flag` for each subscription type:
   ```python
   (SubscriptionType.NONE, FeatureFlags.MY_FEATURE, "has_my_feature"),
   (SubscriptionType.PRISM, FeatureFlags.MY_FEATURE, "has_my_feature"),
   (SubscriptionType.PROPEL, FeatureFlags.MY_FEATURE, "has_my_feature"),
   (SubscriptionType.FREE, FeatureFlags.MY_FEATURE, "has_my_feature"),
   ```

**File**: `services/dashboard-api/app/routers/customers/test_customers.py`

Add `has_my_feature=_OFF` (or `_ON`) to the `_NONE_SUBSCRIPTION` fixture.

### 5. Regenerate the TypeScript SDK

The dashboard-api must be running locally so the generator can fetch the OpenAPI spec.

```bash
# Terminal 1: start the API
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir services/dashboard-api

# Terminal 2: generate SDK (requires Java)
cd packages/dashboard-api-ts-sdk && javm use 25 && npm run build
```

After regeneration, verify that `packages/dashboard-api-ts-sdk/src/api.ts` contains:
- The new `has_my_feature` field in `CustomerSubscriptionData`
- The new `MY_FEATURE` value in the `FeatureFlags` enum

### 6. Use the flag in the frontend

Access the flag via `customer?.subscription.has_my_feature.active` from the `useCustomerInfo` hook:

```tsx
const { data: customer } = useCustomerInfo({ customerId });
const isFeatureEnabled = customer?.subscription.has_my_feature.active;
```

### 7. Add the admin feature flag translation (frontend)

**File**: `services/frontend/src/features/company/components/feature-flag-translations.ts`

```ts
[FeatureFlags.MY_FEATURE]: 'admin.featureFlags.myFeature.label',
```

**File**: `services/frontend/src/i18n/locales/en.json` (under `admin.featureFlags`):

```json
"myFeature": {
  "label": "Show my feature"
}
```

### 8. Run checks

```bash
uv run ruff check packages/core services/dashboard-api
uv run pytest packages/core/tests/test_subscription_service.py -v
npm run lint -w services/frontend
```

## Admin Override (subscriptionDebugger)

Several pages (e.g., Energy Reporting, Savings) have a built-in admin override that makes **all** feature-gated tabs/sections visible for global admins with the subscription debugger enabled. This is how it works:

**File**: `services/frontend/src/features/admin/hooks/useSuperAdminConfig.ts`
- Zustand store persisted to localStorage under key `super-admin-config`
- Exposes `subscriptionDebugger: boolean` toggle

**Pattern** (see `EnergyReportingPage.tsx` for the canonical example):

```tsx
const { isGlobalAdmin } = useAuthenticationContext();
const { subscriptionDebugger } = useSuperAdminConfig();

const allTabs = [
  { name: 'My Tab', to: './my-tab', active: customer?.subscription.has_my_feature.active, tooltip: customer?.subscription.has_my_feature.reason },
  // ...other tabs
];

const tabs =
  subscriptionDebugger && isGlobalAdmin
    ? allTabs.map((tab) => ({
        ...tab,
        active: true,
        ...(tab.active ? {} : { icon: Bug, iconClassName: 'text-orange-400' }),
      }))
    : allTabs.filter((t) => t.active);
```

**How it works:**
- When `subscriptionDebugger && isGlobalAdmin` is true, ALL tabs become visible (`active: true`)
- Tabs that were originally inactive (i.e., the customer doesn't have the flag) get an orange `Bug` icon from `lucide-react` to visually indicate they're visible only because of the admin override
- Tabs that were already active (customer has the flag) show normally without the icon
- When the override is off, tabs are simply filtered: only those with `active: true` are shown

**If you're adding a new page/section with feature-gated tabs**, follow this same pattern. The key is to define `allTabs` with the real `active` state, then apply the override map/filter. You do NOT need to add special override logic per tab -- the pattern handles it generically.

## How flags are enabled per customer

Feature flags are stored as a string array (`additional_features`) on the Organization model in the database. They can be toggled per customer via:

1. **Admin UI**: The feature flags page at `/admin/feature-flags/{flag-id}` lists all customers and allows toggling
2. **API**: `PATCH /admin/customers/{id}` with `additional_features` array
3. **Database**: Direct update to `common.organization.additional_features` column
