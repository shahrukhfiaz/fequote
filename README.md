# Final Expense Quotes API

Simple Node/Express server that accepts a quote request from n8n and returns
multiple quotes from different providers.

- POST `/quote` accepts raw form JSON, normalizes it, and aggregates quotes.
- GET `/providers` lists which carriers are enabled and whether any config issues
  (like a missing/invalid URL) are detected.

> Tip: set `MOCK_PROVIDER_ENABLED="false"` in production to suppress the mock
> quote and see only real carrier responses.

If you see error results for a provider such as `"Invalid URL"`, it usually
means `PROVIDER_X_URL` is empty or malformed. The `/providers` endpoint will
echo config issues to help you spot missing env vars after deployment.

## Environment

Set these in Railway (or a local `.env`) before calling real carriers:

```
PORT=3000 # optional; Railway normally injects one

PROVIDER_A_ENABLED="false"
PROVIDER_A_URL="https://api.provider-a.com/quote"
PROVIDER_A_API_KEY="your-provider-a-key"

PROVIDER_B_ENABLED="false"
PROVIDER_B_URL="https://api.provider-b.com/quote"
PROVIDER_B_API_KEY="your-provider-b-key"

# Turn off mock responses in production
MOCK_PROVIDER_ENABLED="false"
```

With `PROVIDER_X_ENABLED="true"`, the API validates `PROVIDER_X_URL` before
calling the carrier and returns a clear error if the URL is missing/invalid.

## Endpoints

### GET `/`
Health check.

### POST `/quote`

Request body (example):

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

Validation happens before any provider calls. If required fields are missing or
invalid, the API returns a 400 with a list of errors to fix.

### GET `/providers`

Returns the enabled/disabled status of each carrier based on environment flags,
plus any config issues detected (e.g., missing URLs).
