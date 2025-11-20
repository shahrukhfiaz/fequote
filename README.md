# Final Expense Quotes API

Simple Node/Express server that accepts a quote request from n8n and returns
multiple quotes from different providers.

- POST `/quote` accepts raw form JSON, normalizes it, and aggregates quotes.
- GET `/providers` lists which carriers are enabled based on environment flags.

> Tip: set `MOCK_PROVIDER_ENABLED="false"` in production to suppress the mock
> quote and see only real carrier responses.

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

Returns the enabled/disabled status of each carrier based on environment flags.
