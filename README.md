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
