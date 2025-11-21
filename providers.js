// providers.js
import axios from "axios";
import dotenv from "dotenv";
import { getInsuranceToolkitsQuote, getQuickQuote, getSessionStatus } from "./insuranceToolkitsScraper.js";

dotenv.config();

/**
 * Helper: safely parse number
 */
function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(String(value).toString().replace(/,/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

/**
 * Validate that a provider URL exists and is syntactically valid.
 * Returns null if OK or a human-readable error string if not.
 */
function validateUrl(envVarName, value) {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return `${envVarName} is missing. Add it to your Railway environment.`;
  }

  try {
    // Throws if invalid
    new URL(value);
    return null;
  } catch (err) {
    return `${envVarName} is not a valid URL: ${err.message}`;
  }
}

/**
 * Provider A – Example external API
 * You MUST replace URL + headers + payload mapping with your real carrier docs.
 */
export async function getProviderAQuote(normalizedRequest) {
  // Toggle with env flag
  if (process.env.PROVIDER_A_ENABLED !== "true") return null;

  const url = process.env.PROVIDER_A_URL; // e.g. "https://api.provider-a.com/quote"
  const apiKey = process.env.PROVIDER_A_API_KEY;

  try {
    // Map normalized payload to Provider A shape
    const payload = {
      faceAmount: normalizedRequest.faceAmount,
      premium: normalizedRequest.premium,
      coverageType: normalizedRequest.coverageType,
      sex: normalizedRequest.sex,
      state: normalizedRequest.state,
      age: normalizedRequest.age,
      dob: normalizedRequest.dob,
      heightFeet: normalizedRequest.heightWeight?.feet,
      heightInches: normalizedRequest.heightWeight?.inches,
      weight: toNumber(normalizedRequest.heightWeight?.weight),
      tobaccoUse: normalizedRequest.tobaccoUse,
      paymentType: normalizedRequest.paymentType,
      conditions: normalizedRequest.conditions,
      medications: normalizedRequest.medications,
    };

    const res = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
      },
    });

    // Map their response to a common format
    return {
      provider: "ProviderA",
      productName: res.data.productName || "Unknown Plan",
      coverageType: res.data.coverageType || normalizedRequest.coverageType,
      monthlyPremium: res.data.monthlyPremium,
      faceAmount: res.data.faceAmount || normalizedRequest.faceAmount,
      underwritingType: res.data.underwritingType || null,
      issueAgeRange: res.data.issueAgeRange || null,
      raw: res.data,
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
 * Provider B – Another example external API
 * Again: replace mapping with real carrier docs.
 */
export async function getProviderBQuote(normalizedRequest) {
  if (process.env.PROVIDER_B_ENABLED !== "true") return null;

  const url = process.env.PROVIDER_B_URL;
  const apiKey = process.env.PROVIDER_B_API_KEY;

  try {
    // Map normalized payload to Provider B shape
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

    const res = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

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
 * Mock provider – always on for testing
 * Lets you test n8n + Railway without real carrier APIs yet.
 */
export async function getMockProviderQuote(normalizedRequest) {
  const faceAmount = normalizedRequest.faceAmount || 10000;
  const tobaccoPenalty =
    normalizedRequest.tobaccoUse && normalizedRequest.tobaccoUse !== "None"
      ? 8
      : 4;

  const basePremium = faceAmount / 1000 + tobaccoPenalty;

  return {
    provider: "MockCarrier",
    productName: `${normalizedRequest.coverageType} Final Expense Plan`,
    coverageType: normalizedRequest.coverageType,
    monthlyPremium: Number(basePremium.toFixed(2)),
    faceAmount,
    underwritingType:
      normalizedRequest.coverageType === "Guaranteed"
        ? "Guaranteed Issue"
        : "Simplified Issue",
    issueAgeRange: "40–80",
    raw: {
      note: "Mock data for testing only. Replace with real carrier APIs.",
    },
  };
}

/**
 * Call all enabled providers and return a sorted list of quotes.
 */
export async function getAllQuotes(normalizedRequest) {
  const providersToCall = [
    getProviderAQuote(normalizedRequest),
    getProviderBQuote(normalizedRequest),
    getInsuranceToolkitsQuote(normalizedRequest),
  ];

  // Allow disabling the mock provider in production via env flag
  if (process.env.MOCK_PROVIDER_ENABLED !== "false") {
    providersToCall.push(getMockProviderQuote(normalizedRequest));
  }

  const results = await Promise.all(providersToCall);

  // Flatten results (Insurance Toolkits returns an array of quotes)
  const quotes = results.reduce((acc, result) => {
    if (result === null) return acc;
    
    // If it's an array (multiple quotes from one provider), spread them
    if (Array.isArray(result)) {
      acc.push(...result);
    } else {
      acc.push(result);
    }
    
    return acc;
  }, []);

  const sortedQuotes = quotes.sort((a, b) => {
    if (a.error || b.error) return 0;
    if (a.monthlyPremium == null || b.monthlyPremium == null) return 0;
    return a.monthlyPremium - b.monthlyPremium;
  });

  return sortedQuotes;
}

/**
 * Get quick quotes (simplified - no health conditions/medications)
 * Uses the Quick Quoter page for faster results
 */
export async function getQuickQuotes(normalizedRequest) {
  const providersToCall = [
    getQuickQuote(normalizedRequest),
  ];

  const results = await Promise.all(providersToCall);

  // Flatten results (Quick Quote returns an array of quotes)
  const quotes = results.reduce((acc, result) => {
    if (result === null) return acc;
    
    // If it's an array (multiple quotes from one provider), spread them
    if (Array.isArray(result)) {
      acc.push(...result);
    } else {
      acc.push(result);
    }
    
    return acc;
  }, []);

  const sortedQuotes = quotes.sort((a, b) => {
    if (a.error || b.error) return 0;
    if (a.monthlyPremium == null || b.monthlyPremium == null) return 0;
    return a.monthlyPremium - b.monthlyPremium;
  });

  return sortedQuotes;
}

export function getProvidersStatus() {
  const itkSession = process.env.INSURANCE_TOOLKITS_ENABLED === "true" 
    ? getSessionStatus() 
    : null;

  return [
    {
      provider: "ProviderA",
      enabled: process.env.PROVIDER_A_ENABLED === "true",
    },
    {
      provider: "ProviderB",
      enabled: process.env.PROVIDER_B_ENABLED === "true",
    },
    {
      provider: "InsuranceToolkits",
      enabled: process.env.INSURANCE_TOOLKITS_ENABLED === "true",
      session: itkSession,
    },
    {
      provider: "MockCarrier",
      enabled: process.env.MOCK_PROVIDER_ENABLED !== "false",
    },
  ];
}

// Optional default export if you like `import providers from "./providers.js"`
export default {
  getProviderAQuote,
  getProviderBQuote,
  getMockProviderQuote,
  getAllQuotes,
  getProvidersStatus,
};
