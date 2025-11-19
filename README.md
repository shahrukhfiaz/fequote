# Final Expense Quotes API

Simple Node/Express server that accepts a quote request from n8n
and returns multiple quotes from different providers.

## Endpoints

### GET `/`
Health check.

### POST `/get-quotes`

Request body (example):

```json
{
  "faceAmount": 15000,
  "premium": null,
  "coverageType": "Level",
  "sex": "Male",
  "state": "TX",
  "birthday": { "month": 5, "day": 10, "year": 1958 },
  "age": null,
  "heightWeight": { "feet": 5, "inches": 9, "weightLbs": 175 },
  "tobacco": "None",
  "paymentType": "Bank Draft/EFT",
  "healthConditions": ["Type 2 diabetes"],
  "medications": ["Metformin 500mg"]
}
