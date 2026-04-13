# Iteration 1 — Eval Summary

## Overall Results

| Eval | Name | Pass Rate | Key Issue |
|------|------|-----------|-----------|
| 1 | customer-search-and-contracts | 4/4 (100%) | Asset name → UUID resolution unclear |
| 2 | asset-detail-inspection | 4/6 (67%) | Remote MCP can't serialize null/empty arrays |
| 3 | create-battery-asset | 5/5 (100%) | Dry run — location name → UUID resolution unclear |
| 4 | view-contract-details-and-filter | 3/3 (100%) | filter_options not mentioned in skill |
| 5 | manage-relations-assign | 3/3 (100%) | Dry run — tree fallback needed |

**Aggregate pass rate: 19/21 (90%)**

## Recurring Issues (must fix in skill)

### 1. Asset name → UUID resolution (affects evals 1, 3, 4, 5)
The most common real-world scenario: user says "the Balen asset" and the skill needs to find the UUID. The skill currently says to use `get_all_assets` or `get_assets_tree`, but both are **broken on remote MCPs** (array serialization bug). 

**Fix**: Add a "Discovering assets" section that explains multiple strategies:
- **Primary**: `get_all_assets` or `get_assets_tree` (works on local MCP)
- **Fallback**: Call `get_contracts` (paginated, works everywhere) and use `filter_options.assets` to get asset name→UUID mapping
- **Fallback 2**: Call `get_customers` first (to see the customer exists), then if the user provides a specific asset name, try the contracts filter_options approach

### 2. Remote MCP serialization issues (affects eval 2)
Endpoints that return `null` or raw arrays fail on remote MCPs (claude.ai Companion.energy DEV/TST):
- `get_asset_steering_config` → "Unexpected return type: NoneType" when no steering configured
- `get_asset_integrations` → no output when no integrations (empty array)
- `get_all_assets`, `get_assets_tree`, `get_all_locations`, `get_all_asset_configs` → all broken (array responses)

**Fix**: Add a "Remote MCP limitations" section explaining these issues and how to handle them:
- Null/error from steering = no steering configured
- Empty/no-output from integrations = no integrations linked  
- For list endpoints, use paginated alternatives or workarounds

### 3. filter_options not documented (affects eval 4)
The `get_contracts` response includes `filter_options` with `assets` (name + UUID), `contract_types`, and `suppliers`. This is extremely useful for asset discovery but not mentioned in the skill.

**Fix**: Document `filter_options` in the View contracts section.

## What's Working Well

- Customer search by name via `search` parameter
- Contract fetching with `asset_uuid` filter
- Single-object endpoints (get_asset, get_asset_config, get_contract)
- Confirmation-before-mutation flow is clearly documented
- Parallel fetch pattern for asset details
- Tool suffix naming (environment-agnostic) approach works well
