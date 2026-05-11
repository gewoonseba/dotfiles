# Eval 7: Edit Contract - Update Dynamic Contract Price

## Task

Update the dynamic contract on Elicio's Arendonk asset: change the scaling factor to 1.05 and the constant to 2.50.

## Tools Loaded

1. `mcp__claude_ai_Companion_energy_DEV__get_customers` -- for finding the Elicio customer
2. `mcp__claude_ai_Companion_energy_DEV__get_contracts` -- for listing contracts and finding the dynamic one on Arendonk
3. `mcp__claude_ai_Companion_energy_DEV__get_contract` -- for fetching full contract details before editing
4. `mcp__claude_ai_Companion_energy_DEV__update_contract` -- for updating the contract

## Steps Executed

### Step 1: Search for Elicio customer

**Tool called:** `get_customers` with `search: "Elicio"`

**Result:** ERROR -- `Request error: [Errno -2] Name or service not known`

Retried 7 times across the session. All attempts failed with the same DNS resolution error.

### Step 2 (blocked): Find the Arendonk asset and its dynamic contract

Would have called `get_contracts` with:
- `customer_id`: (Elicio's UUID from Step 1)
- `contract_type`: `["dynamic"]`

The response's `filter_options.assets` array would list all assets with contracts, allowing me to identify the Arendonk asset by name and its UUID. Alternatively, if only one dynamic contract existed, that would be the target.

### Step 3 (blocked): Fetch full contract details

Would have called `get_contract` with:
- `customer_id`: Elicio's UUID
- `contract_id`: the dynamic contract's UUID from Step 2

This returns all current contract fields needed for the full-replacement update call:
- `uuid`, `name`, `asset_uuid`, `supplier`, `start_date`, `end_date`, `type`, `category`, `parameters` (including current `scaling`, `constant`, `sensor_direction`, `contract_direction`), `time_window_config`, `product_id`.

### Step 4 (blocked): Show confirmation summary

Would have displayed a human-readable summary like:

---

**Contract Update Summary**

| Field | Current Value | New Value |
|---|---|---|
| Contract Name | (from API) | (unchanged) |
| Asset | Arendonk | (unchanged) |
| Type | dynamic | (unchanged) |
| Supplier | (from API) | (unchanged) |
| Start Date | (from API) | (unchanged) |
| End Date | (from API) | (unchanged) |
| Category | (from API) | (unchanged) |
| Scaling Factor | (current value) | **1.05** |
| Constant | (current value) | **2.50** |
| Sensor Direction | (from API) | (unchanged) |
| Contract Direction | (from API) | (unchanged) |
| Time Window | (from API) | (unchanged) |

**Shall I proceed with this update?**

---

### Step 5 (blocked -- eval stop point): Execute update

Per the eval instructions, this step would NOT be executed. The task specifies stopping at the confirmation step. However, the call would have been:

`update_contract` with:
- `contract_id`: the contract's UUID
- `customer_id`: Elicio's UUID
- `name`: (unchanged from current)
- `asset_uuid`: Arendonk's UUID
- `supplier`: (unchanged)
- `start_date`: (unchanged)
- `end_date`: (unchanged)
- `category`: (unchanged)
- `type`: "dynamic"
- `parameters`:
  ```json
  {
    "type": "dynamic",
    "scaling": 1.05,
    "constant": 2.50,
    "sensor_direction": "(unchanged from current)",
    "contract_direction": "(unchanged from current)"
  }
  ```
- `time_window_config`: (unchanged from current, or null)
- `product_id`: (unchanged from current, or null)

## Outcome

**BLOCKED** -- The Companion Energy DEV MCP server was unreachable throughout the entire session due to a DNS resolution failure (`[Errno -2] Name or service not known`). All 7+ attempts to call `get_customers` failed with the same error. No data could be retrieved and no mutations were attempted.

## Skill Adherence

The following skill guidelines were followed:

1. **Customer discovery**: Used `get_customers` with `search` parameter to find Elicio (correct approach per skill).
2. **Contract discovery**: Planned to use `get_contracts` with `contract_type: ["dynamic"]` filter to find the target contract, and use `filter_options.assets` to resolve the Arendonk asset name to a UUID (fallback strategy per skill, since `get_all_assets` may fail on remote MCPs).
3. **Pre-fill before edit**: Planned to call `get_contract` to fetch all current values before updating (per skill: "Fetch the current contract first with `get_contract` to pre-fill values").
4. **Full replacement**: Understood that `update_contract` is a full replacement, not a partial patch -- all fields must be provided.
5. **Confirmation before mutation**: Would have shown a clear, human-readable summary table (not raw JSON) and waited for user approval before executing the update (per skill: "show the user a clear, human-readable summary of the changes... Do NOT execute the call until the user approves").
6. **Eval stop**: Per eval instructions, would have stopped at the confirmation step and not executed the actual API call.
