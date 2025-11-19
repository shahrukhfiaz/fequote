import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Use Railway / Render / generic NODE port or fallback
const PORT = process.env.PORT || 3000;

/**
 * Helper: safely parse number
 */
function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(String(value).toString().replace(/,/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

/**
 * Normalize incoming body from n8n / front-end form
 * into a single clean object we can pass to providers.
 */
function normalizeQuoteRequest(body) {
  const {
    faceAmount,
    premium,
    coverageType,
    sex,
    state,
    // Either age OR birthday fields
    age,
    dobMonth,
    dobDay,
    dobYear,
    // OR nested birthday object
    birthday,
    // Height / weight (optional)
    feet,
    inches,
    weight,
    heightWeight,
    // Nicotine / tobacco use
    tobacco,
    nicotineUse,
    // Payment type
    paymentType,
    // Health conditions & meds (string or array)
    conditions,
    medications,
  } = body;

  // Birthday normalization
  let normalizedDOB = null;
  if (birthday && typeof birthday === "object") {
    const { month, day, year } = birthday;
    if (month && day && year) {
      normalizedDOB = `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    }
  } else if (dobMonth && dobDay && dobYear) {
    normalizedDOB = `${dobYear}-${String(dobMonth).padStart(
      2,
      "0"
    )}-${String(dobDay).padStart(2, "0")}`;
  }

  // Height/Weight normalization
  let normalizedHW = {
    feet: null,
    inches: null,
    weight: null,
  };

  if (heightWeight && typeof heightWeight === "object") {
    normalizedHW = {
      feet: heightWeight.feet || null,
      inches: heightWeight.inches || null,
      weight: toNumber(heightWeight.weight),
    };
  } else {
    normalizedHW = {
      feet: feet || null,
      inches: inches || null,
      weight: toNumber(weight),
    };
  }

  // Conditions & medications normalization
  const condList = Array.isArray(conditions)
    ? conditions
    : typeof conditions === "string" && conditions.trim() !== ""
    ? conditions.split(",").map((c) => c.trim())
    : [];

  const medList = Array.isArray(medications)
    ? medications
    : typeof medications === "string" && medications.trim() !== ""
    ? medications.split(",").map((m) => m.trim())
    : [];

  return {
    faceAmount: toNumber(faceAmount),
    premium: toNumber(premium),
    coverageType: coverageType || "Level",
    sex: sex || "Male",
    state: state || "TX",
    age: age ? toNumber(age) : null,
    dob: normalizedDOB, // YYYY-MM-DD or null
    heightWeight: normalizedHW,
    tobaccoUse: tobacco || nicotineUse || "None",
    paymentType: paymentType || "Bank Draft/EFT",
    conditions: condList,
    medications: medList,
  };
}

/**
 * Example provider integration skeletons
 * ------------------------------------------------
 * Replace the URLs, headers, and payload with your real carrier APIs.
 * Keep the function signatures the same so the aggregation still works.
 */

/**
 * Provider A – Example external API
 * (You must replace URL + headers + mapping with real docs)
 */
async function getProviderAQuote(normalizedRequest) {
  if (process.env.PROVIDER_A_ENABLED !== "true") return null;

  try {
    const url = process.env.PROVIDER_A_URL; // e.g. "https://api.provider-a.com/quote"
    const apiKey = process.env.PROVIDER_A_API_KEY;

    const payload = {
      faceAmount: normalizedRequest.faceAmount,
      premium: normalizedRequest.premium,
      coverageType: normalizedRequest.coverageType,
      sex: normalizedRequest.sex,
      state: normalizedRequest.state,
      age: normalizedRequest.age,
      dob: normalizedRequest.dob,
      heightFeet: normalizedRequest.heightWeight.feet,
      heightInches: normalizedRequest.heightWeight.inches,
      weight: normalizedRequest.heightWeight.weight,
      tobaccoUse: normalizedRequest.tobaccoUse,
      paymentType: normalizedRequest.paymentType,
      conditions: normalizedRequest.conditions,
      medications: normalizedRequest.medications,
    };

    const res = await axios.post(
      url,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
        },
      }
    );

    // Map their response to a common format
    // Adjust this mapping according to real provider response
    return {
      provider: "ProviderA",
      productName: res.data.productName || "Unknown Plan",
      coverageType: res.data.coverageType || normalizedRequest.coverageType,
      monthlyPremium: res.data.monthlyPremium,
      faceAmount: res.data.faceAmount || normalizedRequest.faceAmount,
      underwritingType: res.data.underwritingType || null,
      issueAgeRange: res.data.issueAgeRange || null,
      raw: res.data, // full raw data for debugging if needed
    };
  } catch (err) {
    console.error("Error from Provider A:", err.message);
    return {
      provider: "ProviderA",
      error: true,
      errorMessage: err.message,
    };
  }
}

/**
 * Provider B – Another example
 */
async function getProviderBQuote(normalizedRequest) {
  if (process.env.PROVIDER_B_ENABLED !== "true") return null;

  try {
    const url = process.env.PROVIDER_B_URL;
    const apiKey = process.env.PROVIDER_B_API_KEY;

    const payload = {
      amount: normalizedRequest.faceAmount,
      premiumTarget: normalizedRequest.premium,
      gender: normalizedRequest.sex,
      state: normalizedRequest.state,
      dob: normalizedRequest.dob,
      tobacco: normalizedRequest.tobaccoUse,
      payType: normalizedRequest.paymentType,
      healthConditions: normalizedRequest.conditions,
      meds: normalizedRequest.medications,
    };

    const res = await axios.post(
      url,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
      }
    );

    return {
      provider: "ProviderB",
      productName: res.data.planName || "Unknown Plan",
      coverageType: res.data.coverageCategory || normalizedRequest.coverageType,
      monthlyPremium: res.data.monthly || res.data.premium,
      faceAmount: res.data.amount || normalizedRequest.faceAmount,
      underwritingType: res.data.underwritingType || null,
      issueAgeRange: res.data.ageRange || null,
      raw: res.data,
    };
  } catch (err) {
    console.error("Error from Provider B:", err.message);
    return {
      provider: "ProviderB",
      error: true,
      errorMessage: err.message,
    };
  }
}

/**
 * Mock provider – always available for testing
 * This lets you test n8n + Railway without real carrier APIs yet.
 */
async function getMockProviderQuote(normalizedRequest) {
  // Simple fake pricing rule for demo
  const basePremium =
    (normalizedRequest.faceAmount || 10000) / 1000 +
    (normalizedRequest.tobaccoUse !== "None" ? 8 : 4);

  return {
    provider: "MockCarrier",
    productName: `${normalizedRequest.coverageType} Final Expense Plan`,
    coverageType: normalizedRequest.coverageType,
    monthlyPremium: Number(basePremium.toFixed(2)),
    faceAmount: normalizedRequest.faceAmount || 10000,
    underwritingType:
      normalizedRequest.coverageType === "Guaranteed"
        ? "Guaranteed Issue"
        : "Simplified Issue",
    issueAgeRange: "40–80",
    raw: {
      note: "This is mock data for testing only. Replace with real carrier APIs.",
    },
  };
}

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Final Expense Quotes API is running",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main endpoint: POST /quote
 * n8n will send all form fields here.
 */
app.post("/quote", async (req, res) => {
  try {
    const normalized = normalizeQuoteRequest(req.body);

    // Basic validation
    if (!normalized.faceAmount && !normalized.premium) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Either faceAmount or premium is required.",
      });
    }

    if (!normalized.age && !normalized.dob) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Either age or full birthday (dob) is required.",
      });
    }

    // Call providers in parallel
    const results = await Promise.all([
      getProviderAQuote(normalized),
      getProviderBQuote(normalized),
      getMockProviderQuote(normalized),
    ]);

    // Filter out null providers (disabled)
    const quotes = results.filter((q) => q !== null);

    // Optional: sort by monthlyPremium if available and no error
    const sortedQuotes = quotes.sort((a, b) => {
      if (a.error || b.error) return 0;
      if (a.monthlyPremium == null || b.monthlyPremium == null) return 0;
      return a.monthlyPremium - b.monthlyPremium;
    });

    res.json({
      success: true,
      input: normalized,
      quotes: sortedQuotes,
    });
  } catch (err) {
    console.error("Unexpected error in /quote:", err);
    res.status(500).json({
      success: false,
      error: "ServerError",
      message: err.message || "Unexpected server error",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Final Expense Quotes API listening on port ${PORT}`);
});
