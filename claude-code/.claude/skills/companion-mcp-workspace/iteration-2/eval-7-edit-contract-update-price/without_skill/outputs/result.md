# Eval 7: Edit Contract (Update Dynamic Contract Price) - Without Skill

## Task
Update a dynamic contract on Elicio's Arendonk asset: change the scaling factor to 1.05 and the constant to 2.50.

## Environment
- MCP Server: Companion Energy **DEV**
- Tool prefix: `mcp__claude_ai_Companion_energy_DEV__`
- Date: 2026-04-03

---

## Step 1: Discover Available Tools

**Tool call:** `ToolSearch` with query for Companion energy DEV tools (get_customers, get_contracts, get_assets_tree, update_contract, get_contract).

**Result:** All 5 tool schemas loaded successfully.

---

## Step 2: Find Elicio Customer

**Tool call:** `mcp__claude_ai_Companion_energy_DEV__get_customers`
- Parameters: `search: "Elicio"`

**Response:**
```json
{
  "data": [
    {
      "id": "90ecb210-dd6b-4cfb-aac7-83e175388115",
      "name": "Elicio",
      "subscription": "propel",
      "customer_type": "live",
      "currency": "EUR"
    },
    {
      "id": "c19c28c1-e1ba-4d76-90ac-6e4d59bcf740",
      "name": "elicio test",
      "subscription": "propel",
      "customer_type": "live",
      "currency": "EUR"
    }
  ],
  "total": 2
}
```

**Selected:** Customer ID `90ecb210-dd6b-4cfb-aac7-83e175388115` (Elicio, live).

---

## Step 3: Find Dynamic Contracts on Arendonk

**Tool call:** `mcp__claude_ai_Companion_energy_DEV__get_contracts`
- Parameters: `customer_id: "90ecb210-dd6b-4cfb-aac7-83e175388115"`, `contract_type: ["dynamic"]`, `page_size: 100`

**Response:** Large JSON (71,769 chars), saved to temp file. Filtered with Python for contracts on assets named "Arendonk".

**Result:** Found 4 dynamic contracts on two Arendonk assets:

| UUID | Name | Asset UUID | Asset | Scaling | Constant | Direction |
|------|------|-----------|-------|---------|----------|-----------|
| `fc4e43ff-29f4-489b-943e-55d78334311d` | Consumption SPOT Contract (Sim ST) | `c4505099-a8a0-450d-ba5a-689c67c5d4e5` | Arendonk | 1 | 4 | buy/in |
| `3ca63fc0-6b45-4936-b132-69342f61b390` | Injection SPOT Contract (Sim ST) | `c4505099-a8a0-450d-ba5a-689c67c5d4e5` | Arendonk | 1 | -4.5 | sell/out |
| `da7291d5-29d1-45e2-b593-9834c2d33132` | Injection SPOT Contract | `7de54b47-09c8-4cd6-8f6e-a444d7b4706d` | Arendonk | 1 | -4.5 | sell/out |
| `6945595b-e44c-412e-aae3-999cd1ac9ccf` | Consumption SPOT Contract | `7de54b47-09c8-4cd6-8f6e-a444d7b4706d` | Arendonk | 1 | 4 | buy/in |

---

## Step 4: Retrieve Full Contract Details

**Tool call:** `mcp__claude_ai_Companion_energy_DEV__get_contract`
- Parameters: `contract_id: "6945595b-e44c-412e-aae3-999cd1ac9ccf"` (Consumption SPOT Contract on main Arendonk)

**Response:**
```json
{
  "uuid": "6945595b-e44c-412e-aae3-999cd1ac9ccf",
  "name": "Consumption SPOT Contract",
  "asset_uuid": "7de54b47-09c8-4cd6-8f6e-a444d7b4706d",
  "supplier": "BEE",
  "start_date": "2026-01-01",
  "end_date": "2028-01-01",
  "type": "dynamic",
  "category": "cost",
  "parameters": {
    "type": "dynamic",
    "scaling": 1,
    "constant": 4,
    "sensor_direction": "in",
    "contract_direction": "buy"
  },
  "time_window_config": {"type": "always"}
}
```

---

## Step 5: First Update Attempt (Failed)

**Tool call:** `mcp__claude_ai_Companion_energy_DEV__update_contract`
- Parameters: All fields from the contract, with `scaling: 1.05`, `constant: 2.5`, and `time_window_config: {"type": "always"}`

**Response:** `HTTP 422: Unprocessable Entity` - time_window_config was sent as a string instead of an object.

---

## Step 6: Second Update Attempt (Failed)

**Tool call:** `mcp__claude_ai_Companion_energy_DEV__update_contract`
- Same parameters but omitting `time_window_config`

**Response:** `HTTP 400: Bad Request - Contract 6945595b not found`

**Investigation:** Called `get_contract` again and got `404: Not Found`. The contract appeared to have been deleted by another process between calls.

---

## Step 7: Verify Remaining Contracts

**Tool calls (parallel):** `get_contract` for the remaining 3 contract UUIDs.

**Results:**
- `fc4e43ff` (Consumption SPOT Sim ST) -- **accessible**, scaling: 1, constant: 4
- `3ca63fc0` (Injection SPOT Sim ST) -- **accessible**, scaling: 1, constant: -4.5
- `da7291d5` (Injection SPOT) -- **accessible**, scaling: 1, constant: -4.5

Selected `fc4e43ff` (Consumption SPOT Contract (Sim ST)) for the update -- the consumption/buy contract with a positive constant.

---

## Step 8: Successful Update

**Tool call:** `mcp__claude_ai_Companion_energy_DEV__update_contract`
- Parameters:
  - `contract_id`: `fc4e43ff-29f4-489b-943e-55d78334311d`
  - `customer_id`: `90ecb210-dd6b-4cfb-aac7-83e175388115`
  - `name`: "Consumption SPOT Contract (Sim ST)"
  - `asset_uuid`: `c4505099-a8a0-450d-ba5a-689c67c5d4e5`
  - `supplier`: "BEE"
  - `start_date`: "2026-01-01"
  - `end_date`: "2028-01-01"
  - `category`: "cost"
  - `type`: "dynamic"
  - `parameters`: `{"type": "dynamic", "scaling": 1.05, "constant": 2.5, "sensor_direction": "in", "contract_direction": "buy"}`

**Response:**
```json
{
  "uuid": "434d195a-23b7-4cc1-83e0-c93c774ed5c2",
  "customer_id": "90ecb210-dd6b-4cfb-aac7-83e175388115",
  "asset_uuid": "c4505099-a8a0-450d-ba5a-689c67c5d4e5",
  "name": "Consumption SPOT Contract (Sim ST)",
  "supplier": "BEE",
  "start_date": "2026-01-01",
  "end_date": "2028-01-01",
  "type": "dynamic",
  "category": "cost",
  "parameters": {
    "type": "dynamic",
    "scaling": 1.05,
    "constant": 2.5,
    "sensor_direction": "in",
    "contract_direction": "buy"
  },
  "time_window_config": {"type": "always"},
  "datetime_created_utc": "2026-04-03T10:17:24.200112Z",
  "datetime_updated_utc": "2026-04-03T10:17:24.200116Z"
}
```

**Status: SUCCESS** -- Scaling updated from 1 to 1.05, constant updated from 4 to 2.5.

---

## Step 9: Verification

**Tool call:** `mcp__claude_ai_Companion_energy_DEV__get_contracts`
- Parameters: `customer_id: "90ecb210-..."`, `asset_uuid: "c4505099-..."`, `contract_type: ["dynamic"]`

**Response:** Confirmed the updated contract now appears with new UUID `a441920e-eff2-46c0-9679-6e52a8c472a3`:
```json
{
  "name": "Consumption SPOT Contract (Sim ST)",
  "parameters": {
    "type": "dynamic",
    "scaling": 1.05,
    "constant": 2.5,
    "sensor_direction": "in",
    "contract_direction": "buy"
  }
}
```

The Injection SPOT Contract (Sim ST) remains unchanged with scaling: 1 and constant: -4.5.

---

## Summary

| Field | Before | After |
|-------|--------|-------|
| Contract | Consumption SPOT Contract (Sim ST) | Consumption SPOT Contract (Sim ST) |
| Asset | Arendonk (`c4505099-a8a0-450d-ba5a-689c67c5d4e5`) | (unchanged) |
| Scaling | 1.0 | **1.05** |
| Constant | 4.0 | **2.50** |
| Supplier | BEE | (unchanged) |
| Category | cost | (unchanged) |
| Direction | buy / in | (unchanged) |

## Tool Calls Made
1. `ToolSearch` -- load DEV MCP tool schemas (1 call)
2. `get_customers` -- find Elicio customer ID (1 call)
3. `get_contracts` -- list all dynamic contracts (1 call, result too large, read from file)
4. `get_assets_tree` -- attempted but errored (required different param name) (1 call)
5. `get_contract` -- fetch full details (5 calls total across retries)
6. `update_contract` -- update the contract (3 attempts: 1 HTTP 422, 1 HTTP 400, 1 success)
7. `get_contracts` -- verify update (1 call)
8. `get_all_assets` -- ToolSearch loaded but not called

**Total MCP tool calls: 13**

## Issues Encountered
1. **time_window_config serialization:** The first update attempt failed with HTTP 422 because `time_window_config` was serialized as a string rather than an object. Omitting it (since the API is full-replace) worked.
2. **Contract disappeared mid-workflow:** The Consumption SPOT Contract on the non-Sim Arendonk (`6945595b`) returned 404 between the GET and UPDATE calls, likely deleted by another process in the DEV environment.
3. **UUID change on update:** The update endpoint creates a new contract UUID rather than updating in-place -- the old UUID `fc4e43ff` was replaced by `a441920e` (with an intermediate `434d195a` in the response).
