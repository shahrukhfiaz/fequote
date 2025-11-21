# API Endpoints Documentation

## Overview

Your Final Expense Quote API now has **two quote endpoints** for different use cases:

1. **POST `/quote`** - Detailed quotes with health information
2. **POST `/quickquote`** - Fast quotes without health questions

Both endpoints share the same persistent session, so login only happens once!

---

## Endpoint Comparison

| Feature | `/quote` | `/quickquote` |
|---------|----------|---------------|
| **Speed** | 6-20 seconds | 3-10 seconds |
| **Required Fields** | 7 required + optional health | 7 required only |
| **Health Conditions** | ✅ Yes | ❌ No |
| **Medications** | ✅ Yes | ❌ No |
| **Height/Weight** | ✅ Yes | ❌ No |
| **Quote Details** | 13+ fields | 3 fields (basic) |
| **Annual Premium** | ✅ Included | ❌ Not available |
| **Accidental Death** | ✅ Included | ❌ Not available |
| **Plan Info** | ✅ Included | ❌ Not available |
| **Compensation Info** | ✅ Included | ❌ Not available |
| **Use Case** | Detailed underwriting | Quick price screening |

---

## POST `/quote` - Detailed Quotes

### Purpose
Get comprehensive quotes with health underwriting for accurate pricing.

### Request Example

```json
{
  "faceAmount": 10000,
  "coverageType": "Level",
  "sex": "Male",
  "state": "TX",
  "dobMonth": "01",
  "dobDay": "15",
  "dobYear": "1960",
  "heightFeet": "5",
  "heightInches": "10",
  "weight": "180",
  "tobaccoUse": "None",
  "paymentType": "Bank Draft/EFT",
  "conditions": ["Type 2 diabetes"],
  "medications": ["Metformin"]
}
```

### Response Example

```json
{
  "success": true,
  "input": {...},
  "quotes": [
    {
      "provider": "Aflac",
      "productName": "Preferred",
      "coverageType": "Preferred",
      "monthlyPremium": 55.81,
      "annualPremium": 637.80,
      "accidentalDeathMonthly": 58.51,
      "accidentalDeathAnnual": 668.70,
      "socialSecurityBilling": false,
      "compensationInfo": null,
      "planInfo": null,
      "notices": null
    }
  ]
}
```

### Fields Returned (13 fields per quote)

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Company name |
| `productName` | string | Plan name |
| `coverageType` | string | Coverage category |
| `monthlyPremium` | number | Base monthly premium |
| `annualPremium` | number | Base annual premium |
| `accidentalDeathMonthly` | number/null | AD rider monthly |
| `accidentalDeathAnnual` | number/null | AD rider annual |
| `faceAmount` | number/null | Face amount |
| `underwritingType` | string/null | Underwriting type |
| `issueAgeRange` | string/null | Age range |
| `socialSecurityBilling` | boolean | SSB available |
| `compensationInfo` | string/null | Commission details |
| `planInfo` | string/null | Coverage year details |
| `notices` | array/null | Important warnings |

---

## POST `/quickquote` - Fast Quotes

### Purpose
Get quick price comparisons without health questions. Ideal for initial screening.

### Request Example

```json
{
  "faceAmount": 10000,
  "coverageType": "Graded/Modified",
  "sex": "Female",
  "state": "PA",
  "dobMonth": "03",
  "dobDay": "30",
  "dobYear": "1950",
  "tobaccoUse": "None",
  "paymentType": "Bank Draft/EFT"
}
```

### Response Example

```json
{
  "success": true,
  "input": {...},
  "quotes": [
    {
      "provider": "Mutual of Omaha",
      "monthlyPremium": 88.47,
      "coverageType": "Living Promise Graded"
    },
    {
      "provider": "Guarantee Trust Life",
      "monthlyPremium": 117.83,
      "coverageType": "Heritage Plan Graded"
    }
  ],
  "note": "Quick quotes - no health conditions processed. Use /quote endpoint for detailed underwriting."
}
```

### Fields Returned (3 fields per quote)

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Company name |
| `monthlyPremium` | number | Monthly premium |
| `coverageType` | string | Coverage type/plan name |

---

## Required Fields (Both Endpoints)

### Essential Fields

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `coverageType` | string | "Level" | One of: Level, Graded/Modified, Guaranteed, Limited Pay, SPWL |
| `sex` | string | "Male" | Male or Female |
| `state` | string | "TX" | 2-letter state code |
| `faceAmount` OR `premium` | number | 10000 | Face amount OR target premium (at least one required) |
| `dob` OR `age` | object/number | See below | Date of birth OR age (at least one required) |
| `tobaccoUse` | string | "None" | Nicotine use status |
| `paymentType` | string | "Bank Draft/EFT" | Payment method |

### Date of Birth Options

**Option 1: Provide DOB (recommended for accuracy)**
```json
{
  "dobMonth": "03",
  "dobDay": "30",
  "dobYear": "1950"
}
```

**Option 2: Provide Age**
```json
{
  "age": 74
}
```

### Nicotine Use Options
- `"None"`
- `"Cigarettes"`
- `"Cigarettes + Other Nicotine Products"`
- `"Occasional pipe/cigar use only"`
- `"Other Nicotine Products"`

### Payment Type Options
- `"Bank Draft/EFT"`
- `"Direct Express"`
- `"Credit Card"`
- `"Debit Card"`

---

## Optional Fields (Only for `/quote`)

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `heightFeet` | number | 5 | Height (feet) |
| `heightInches` | number | 10 | Height (inches) |
| `weight` | number | 180 | Weight in pounds |
| `conditions` | array | ["Type 2 diabetes"] | Health conditions |
| `medications` | array | ["Metformin"] | Current medications |

**Note:** These fields are ignored by `/quickquote` endpoint.

---

## When to Use Which Endpoint

### Use `/quote` When:
- Need accurate pricing with health conditions
- Client has specific health issues or medications
- Need detailed information (annual rates, AD riders, etc.)
- Final quote before application
- Need comprehensive underwriting details

### Use `/quickquote` When:
- Quick price comparison needed
- Initial screening/prospecting
- Client wants ballpark figures
- Speed is priority over detail
- No health conditions to report
- Building comparison tables

---

## Session Management (Both Endpoints)

Both endpoints share the same browser session:

```
First request to ANY endpoint:
  → Login (10-20 seconds)
  → Return quotes
  → Session saved

Second request to SAME or DIFFERENT endpoint:
  → Reuse session (3-10 seconds)
  → Return quotes
  → Session refreshed

All requests within 24 hours:
  → Reuse same session (fast!)
```

**Example Flow:**
1. POST `/quickquote` → Login + Quick quotes (10s)
2. POST `/quote` → Reuse session + Detailed quotes (6s)
3. POST `/quickquote` → Reuse session + Quick quotes (3s)
4. POST `/quote` → Reuse session + Detailed quotes (6s)

---

## Example n8n Workflows

### Workflow 1: Quick Screen then Detailed Quote

```
1. Client submits basic info
   ↓
2. Call /quickquote → Get fast prices
   ↓
3. Show client quick results
   ↓
4. Client interested? Collect health info
   ↓
5. Call /quote → Get detailed quotes
   ↓
6. Present final quotes with all details
```

### Workflow 2: Direct to Detailed

```
1. Collect all client info (including health)
   ↓
2. Call /quote → Get detailed quotes
   ↓
3. Present comprehensive results
```

---

## Error Responses

Both endpoints return the same error format:

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed. Fix the highlighted fields and try again.",
  "errors": [
    "coverageType is required (e.g. Level, Guaranteed).",
    "sex is required and must be Male or Female."
  ]
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error while getting quotes.",
  "error": "Navigation timeout of 120000 ms exceeded"
}
```

---

## Testing Both Endpoints

### Test Quick Quote
```bash
curl -X POST http://localhost:3000/quickquote \
  -H "Content-Type: application/json" \
  -d '{
    "faceAmount": 10000,
    "coverageType": "Graded/Modified",
    "sex": "Female",
    "state": "PA",
    "dobMonth": "03",
    "dobDay": "30",
    "dobYear": "1950",
    "tobaccoUse": "None",
    "paymentType": "Bank Draft/EFT"
  }'
```

### Test Detailed Quote
```bash
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "faceAmount": 10000,
    "coverageType": "Level",
    "sex": "Male",
    "state": "TX",
    "dobMonth": "01",
    "dobDay": "15",
    "dobYear": "1960",
    "heightFeet": "5",
    "heightInches": "10",
    "weight": "180",
    "tobaccoUse": "None",
    "paymentType": "Bank Draft/EFT",
    "conditions": ["Type 2 diabetes"],
    "medications": ["Metformin"]
  }'
```

---

## Performance Metrics

### First Request (Any Endpoint)
- Time: 10-20 seconds (includes login)
- Action: Browser launch + Login + Form fill + Extract results

### Subsequent Requests (Session Reuse)

| Endpoint | Time | Notes |
|----------|------|-------|
| `/quote` | 6-10 seconds | Detailed form + health questions |
| `/quickquote` | 3-6 seconds | Simplified form, no health |

---

## Railway Deployment

Both endpoints work on Railway with the same environment variables:

```bash
PORT=3000
INSURANCE_TOOLKITS_ENABLED=true
INSURANCE_TOOLKITS_EMAIL=your-email@insurancetoolkits.com
INSURANCE_TOOLKITS_PASSWORD=your-password
PROVIDER_A_ENABLED=false
PROVIDER_B_ENABLED=false
MOCK_PROVIDER_ENABLED=false
```

Your Railway URL will support both:
- `https://your-app.up.railway.app/quote`
- `https://your-app.up.railway.app/quickquote`

---

## Summary

You now have **two powerful endpoints** that share the same session:

1. **`/quote`** - Comprehensive, detailed, accurate (use for final quotes)
2. **`/quickquote`** - Fast, simple, good enough (use for screening)

Both reuse the same browser session for maximum efficiency! 🚀

