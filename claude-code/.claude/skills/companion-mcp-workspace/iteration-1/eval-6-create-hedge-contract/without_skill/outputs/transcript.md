# Eval 6: Create Hedge Contract on Elicio's Arendonk Asset

## Task

Create a new hedge contract on Elicio's Arendonk asset with:
- Name: "Q3 2026 Base Hedge"
- Supplier: Luminus
- Start date: 2026-07-01
- End date: 2026-09-30
- Category: cost
- Type: hedge
- Price: 48.50 EUR/MWh
- Amount: 500 kW
- Sensor direction: in

## Steps Performed

### Step 1: Load MCP tools via ToolSearch

Used `ToolSearch` with query `"companion energy DEV"` to load the available MCP tools. This returned 20 tools including:
- `mcp__claude_ai_Companion_energy_DEV__get_customers` -- to find Elicio's customer ID
- `mcp__claude_ai_Companion_energy_DEV__get_all_assets` -- to find the Arendonk asset UUID
- `mcp__claude_ai_Companion_energy_DEV__create_contract` -- to create the hedge contract

Also loaded the `create_contract` tool schema which revealed the full parameter structure for hedge contracts:

```
HedgeContractParameters:
  - type: "hedge" (const)
  - price: number (required)
  - amount: number (required)
  - unit: "kW" | "kWh" (required)
  - sensor_direction: "in" | "out" | "bidirectional" | "undefined" (required)
```

### Step 2: Search for Elicio customer

Called:
```
mcp__claude_ai_Companion_energy_DEV__get_customers(search="Elicio")
```

**Result:** Failed with `Request error: [Errno -2] Name or service not known` -- the MCP server was unreachable due to DNS resolution failure. Retried 3 times with the same result.

### Step 3: Load get_all_assets tool

Loaded `mcp__claude_ai_Companion_energy_DEV__get_all_assets` via ToolSearch to prepare for the next step (finding the Arendonk asset UUID once we have the customer ID).

### Step 4: Retry customer lookup

Retried `get_customers(search="Elicio")` -- same DNS error.

## What I Would Have Done (Blocked by MCP Server Unavailability)

### Step A: Get Elicio's customer_id

```
mcp__claude_ai_Companion_energy_DEV__get_customers(search="Elicio")
```

Expected response: A paginated list with Elicio's customer entry, providing the `id` (UUID) field.

### Step B: Get the Arendonk asset UUID

Using the customer_id from Step A:

```
mcp__claude_ai_Companion_energy_DEV__get_all_assets(customer_id="<elicio_customer_uuid>")
```

Then scan the returned flat list of assets to find one with name containing "Arendonk" and extract its `uuid`.

### Step C: Create the hedge contract (MUTATION -- WOULD NOT EXECUTE)

With both UUIDs in hand, the final call would be:

```json
mcp__claude_ai_Companion_energy_DEV__create_contract(
  customer_id: "<elicio_customer_uuid>",
  name: "Q3 2026 Base Hedge",
  asset_uuid: "<arendonk_asset_uuid>",
  supplier: "Luminus",
  start_date: "2026-07-01",
  end_date: "2026-09-30",
  category: "cost",
  type: "hedge",
  parameters: {
    "type": "hedge",
    "price": 48.50,
    "amount": 500,
    "unit": "kW",
    "sensor_direction": "in"
  }
)
```

**This is a create mutation -- per eval instructions, I would STOP here and NOT execute this call.**

## Parameter Mapping Rationale

| Task Requirement | API Parameter | Value | Notes |
|---|---|---|---|
| Name: "Q3 2026 Base Hedge" | `name` | `"Q3 2026 Base Hedge"` | Direct mapping |
| Supplier: Luminus | `supplier` | `"Luminus"` | Direct mapping |
| From 2026-07-01 | `start_date` | `"2026-07-01"` | ISO 8601 date format |
| To 2026-09-30 | `end_date` | `"2026-09-30"` | ISO 8601 date format |
| Cost category | `category` | `"cost"` | Enum: "cost" or "revenue" |
| Hedge type | `type` | `"hedge"` | ContractType enum value |
| Price 48.50 EUR/MWh | `parameters.price` | `48.50` | Numeric, EUR/MWh unit implied by hedge contract type |
| Amount 500 kW | `parameters.amount` | `500` | Numeric value |
| Amount unit kW | `parameters.unit` | `"kW"` | Enum: "kW" or "kWh" |
| Sensor direction "in" | `parameters.sensor_direction` | `"in"` | Enum: "in", "out", "bidirectional", "undefined" |
| Hedge parameters type | `parameters.type` | `"hedge"` | Must match top-level `type` (discriminated union) |

## Outcome

- **Tools discovered and loaded:** `get_customers`, `get_all_assets`, `create_contract` (with full HedgeContractParameters schema)
- **Blocking issue:** MCP server DNS resolution failure prevented lookup of Elicio customer_id and Arendonk asset_uuid
- **Mutation prepared but NOT executed:** The `create_contract` call is fully specified above, pending only the two UUID lookups
- **No data was modified:** This is a test run; even if the server had been reachable, the mutation would not have been executed per eval instructions
