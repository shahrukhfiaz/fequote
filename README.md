# Final Expense Quotes API

Simple Node/Express server that accepts a quote request from n8n and returns
multiple quotes from different providers, including web scraping from Insurance Toolkits.

- POST `/quote` accepts raw form JSON, normalizes it, and aggregates quotes.
- GET `/providers` lists which carriers are enabled based on environment flags.

## Features

- ✅ **Insurance Toolkits Integration** - Automated web scraping with login
- ✅ **Mock Provider** - For testing without real APIs
- ✅ **Flexible Provider System** - Easy to add more providers
- ✅ **Input Validation** - Comprehensive validation before API calls
- ✅ **Railway Ready** - Configured for Railway deployment

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required for Insurance Toolkits:
- `INSURANCE_TOOLKITS_ENABLED=true`
- `INSURANCE_TOOLKITS_EMAIL=your-email@example.com`
- `INSURANCE_TOOLKITS_PASSWORD=your-password`
- `MOCK_PROVIDER_ENABLED=false` (disable mock provider to get real quotes only)

### 3. Run Locally

```bash
npm run dev
```

### 4. Deploy to Railway

1. Push code to GitHub
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard
4. Deploy!

**Important for Railway:** Puppeteer requires additional system dependencies. Railway automatically installs these when it detects Puppeteer in your `package.json`.

## Endpoints

### GET `/`
Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "message": "Final Expense Quote API is running",
  "timestamp": "2025-11-20T20:41:36.000Z"
}
```

### GET `/providers`

Returns the enabled/disabled status of each carrier based on environment flags.

**Response:**
```json
{
  "providers": [
    { "provider": "ProviderA", "enabled": false },
    { "provider": "ProviderB", "enabled": false },
    { "provider": "InsuranceToolkits", "enabled": true },
    { "provider": "MockCarrier", "enabled": true }
  ]
}
```

### POST `/quote`

Main endpoint for getting quotes from all enabled providers.

**Request body:**

```json
{
  "faceAmount": 15000,
  "coverageType": "Level",
  "sex": "Male",
  "state": "TX",
  "dobMonth": "05",
  "dobDay": "10",
  "dobYear": "1958",
  "heightFeet": "5",
  "heightInches": "9",
  "weight": "175",
  "tobaccoUse": "None",
  "paymentType": "Bank Draft/EFT",
  "conditions": ["Type 2 diabetes"],
  "medications": ["Metformin 500mg"]
}
```

**Required Fields:**
- `coverageType` - One of: Level, Graded/Modified, Guaranteed, Limited Pay, SPWL
- `sex` - Male or Female
- `state` - 2-letter state code (e.g., TX)
- `faceAmount` OR `premium` - At least one is required
- `age` OR `dob` (dobMonth, dobDay, dobYear) - At least one is required

**Success Response (200):**
```json
{
  "success": true,
  "input": { ...normalizedRequest },
  "quotes": [
    {
      "provider": "InsuranceToolkits",
      "productName": "Level Final Expense Plan",
      "coverageType": "Level",
      "monthlyPremium": 89.50,
      "faceAmount": 15000,
      "underwritingType": "Simplified Issue",
      "issueAgeRange": "40–80"
    },
    {
      "provider": "MockCarrier",
      "productName": "Level Final Expense Plan",
      "coverageType": "Level",
      "monthlyPremium": 119.00,
      "faceAmount": 15000
    }
  ]
}
```

**Error Response (400):**
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

## Insurance Toolkits Integration

The Insurance Toolkits scraper uses **persistent session management** with Puppeteer to:
1. **Login once** to insurancetoolkits.com with your credentials
2. **Keep the browser running** in the background (session reuse)
3. **Reuse the same session** for all quote requests (1-2 second response time)
4. **Auto-refresh login** only if session expires (after 24 hours)
5. Fill out the quote form and extract results for each request

### 🚀 Performance Benefits:

- ✅ **First request:** ~5-10 seconds (includes login)
- ✅ **Subsequent requests:** ~1-2 seconds (session reuse)
- ✅ **Session persistence:** 24 hours
- ✅ **Zero re-login overhead** for most requests

### How Session Reuse Works:

```
Server starts → Login once → Browser stays open
                    ↓
            [Persistent Session]
                    ↓
Request 1 ──→ Reuse session ──→ 1-2s response
Request 2 ──→ Reuse session ──→ 1-2s response
Request 3 ──→ Reuse session ──→ 1-2s response
    ...
After 24h ──→ Auto re-login ──→ New session
```

### Form Field Mapping:

The scraper is pre-configured with the actual Insurance Toolkits form selectors:

| Field | Selector | Notes |
|-------|----------|-------|
| Face Amount | `input[formcontrolname="faceAmount"]` | Required (or premium) |
| Premium | `input[formcontrolname="premium"]` | Alternative to face amount |
| Coverage Type | `select` in `itk-coverage-type-select` | Level, Guaranteed, etc. |
| Sex | Button in `itk-sex-picker` | Male/Female buttons |
| State | `select` in `itk-state-select` | 2-letter code |
| Birthday | Month/Day/Year inputs | `formcontrolname="month/day/year"` |
| Age | `input[formcontrolname="age"]` | Alternative to birthday |
| Height/Weight | Feet/Inches/Weight inputs | Optional fields |
| Nicotine Use | `select` in `itk-nicotine-select` | None, Cigarettes, etc. |
| Payment Type | `select` in `itk-payment-type-select` | Bank Draft/EFT, etc. |
| Health Conditions | Input with placeholder | Multiple conditions supported |
| Medications | Input with placeholder | Multiple medications supported |

### Session Management API

Check session status via the `/providers` endpoint:

```json
{
  "providers": [
    {
      "provider": "InsuranceToolkits",
      "enabled": true,
      "session": {
        "isLoggedIn": true,
        "browserConnected": true,
        "lastActivityTime": "2025-11-20T20:45:00.000Z",
        "sessionAge": 15
      }
    }
  ]
}
```

### Monitoring Session Health:

The scraper automatically logs session status every 5 minutes:
```
💚 Session active - 15 minutes old
💚 Session active - 20 minutes old
```

This helps you monitor if the session is working correctly in Railway logs.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `INSURANCE_TOOLKITS_ENABLED` | No | false | Enable Insurance Toolkits scraper |
| `INSURANCE_TOOLKITS_EMAIL` | Yes* | - | Your login email |
| `INSURANCE_TOOLKITS_PASSWORD` | Yes* | - | Your login password |
| `PROVIDER_A_ENABLED` | No | false | Enable Provider A API |
| `PROVIDER_A_URL` | Yes** | - | Provider A API endpoint |
| `PROVIDER_A_API_KEY` | Yes** | - | Provider A API key |
| `PROVIDER_B_ENABLED` | No | false | Enable Provider B API |
| `PROVIDER_B_URL` | Yes** | - | Provider B API endpoint |
| `PROVIDER_B_API_KEY` | Yes** | - | Provider B API key |
| `MOCK_PROVIDER_ENABLED` | No | true | Enable mock provider (set to `false` for real quotes only) |

\* Required if `INSURANCE_TOOLKITS_ENABLED=true`  
\** Required if respective provider is enabled

**⚠️ Important:** For production or real quote testing with Insurance Toolkits, set `MOCK_PROVIDER_ENABLED=false`. The mock provider only returns fake data for testing the API structure.

### Mock vs Real Testing

| Scenario | MOCK_PROVIDER_ENABLED | Result |
|----------|----------------------|--------|
| Testing API structure without credentials | `true` | Returns fake quotes for testing |
| Real quote testing | `false` | Returns only real quotes from Insurance Toolkits |
| Production use | `false` | Returns only real quotes from enabled providers |

**Example Response Difference:**

With `MOCK_PROVIDER_ENABLED=true`:
```json
{
  "quotes": [
    { "provider": "InsuranceToolkits", "monthlyPremium": 89.50, ... },
    { "provider": "MockCarrier", "monthlyPremium": 119.00, ... }  // ← FAKE DATA
  ]
}
```

With `MOCK_PROVIDER_ENABLED=false`:
```json
{
  "quotes": [
    { "provider": "InsuranceToolkits", "monthlyPremium": 89.50, ... }  // ← REAL DATA ONLY
  ]
}
```

## Troubleshooting

### Railway Deployment Issues

**Puppeteer fails to launch:**
- Railway automatically installs Chrome dependencies when it detects Puppeteer
- If issues persist, check Railway logs for missing dependencies

**Timeout errors:**
- Increase timeout in `insuranceToolkitsScraper.js`
- Check if insurancetoolkits.com is accessible from Railway servers

**Memory issues:**
- Puppeteer can be memory-intensive
- Consider upgrading your Railway plan or implementing request queuing

### Local Development Issues

**Puppeteer installation fails:**
```bash
# On Linux/macOS
sudo apt-get install -y chromium-browser

# On Windows
# Puppeteer installs Chrome automatically
```

**Login fails:**
- Verify credentials in `.env`
- Check if the login form selectors have changed
- Test login manually at https://insurancetoolkits.com/login
