import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { getAllQuotes, getQuickQuotes, getProvidersStatus } from "./providers.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const ALLOWED_COVERAGE_TYPES = [
  "Level",
  "Graded/Modified",
  "Guaranteed",
  "Limited Pay",
  "SPWL",
];

const ALLOWED_SEX = ["Male", "Female"];

/**
 * Helper: safely parse number
 */
function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(String(value).toString().replace(/,/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

/**
 * Normalize and validate incoming body from n8n / front-end form.
 * Returns { normalizedRequest, errors } where errors is an array of
 * human-readable validation issues.
 */
function normalizeAndValidate(body = {}) {
  const errors = [];

  // Required enums
  const coverageType = body.coverageType?.toString().trim();
  if (!coverageType) {
    errors.push("coverageType is required (e.g. Level, Guaranteed).");
  } else if (!ALLOWED_COVERAGE_TYPES.includes(coverageType)) {
    errors.push(
      `coverageType must be one of: ${ALLOWED_COVERAGE_TYPES.join(", ")}.`
    );
  }

  const sexRaw = body.sex?.toString().trim();
  const sex = sexRaw
    ? ALLOWED_SEX.find(
        (option) => option.toLowerCase() === sexRaw.toLowerCase()
      )
    : null;
  if (!sex) {
    errors.push("sex is required and must be Male or Female.");
  }

  const stateRaw = body.state?.toString().trim();
  const state = stateRaw ? stateRaw.toUpperCase() : null;
  if (!state) {
    errors.push("state is required (2-letter code, e.g. TX).");
  } else if (!/^[A-Z]{2}$/.test(state)) {
    errors.push("state must be a 2-letter state code (e.g. TX).");
  }

  // Money / amount fields
  const faceAmount = toNumber(body.faceAmount);
  const premium = toNumber(body.premium);
  if (faceAmount === null && premium === null) {
    errors.push("Provide either a faceAmount or a premium target.");
  }
  if (faceAmount !== null && faceAmount <= 0) {
    errors.push("faceAmount must be greater than 0.");
  }
  if (premium !== null && premium <= 0) {
    errors.push("premium must be greater than 0.");
  }

  // Age or DOB
  const dobMonth = body.dobMonth || body.month || body?.dob?.month || null;
  const dobDay = body.dobDay || body.day || body?.dob?.day || null;
  const dobYear = body.dobYear || body.year || body?.dob?.year || null;

  let dob = null;
  if (dobMonth || dobDay || dobYear) {
    if (dobMonth && dobDay && dobYear) {
      dob = {
        month: String(dobMonth).padStart(2, "0"),
        day: String(dobDay).padStart(2, "0"),
        year: String(dobYear),
      };
    } else {
      errors.push(
        "Provide all dobMonth, dobDay, and dobYear values or omit DOB entirely."
      );
    }
  }

  const age = body.age ? toNumber(body.age) : null;
  if (age !== null && (age <= 0 || !Number.isInteger(age))) {
    errors.push("age must be a whole number greater than 0.");
  }

  if (!dob && age === null) {
    errors.push("Provide either an age or a full date of birth.");
  }

  // Height/weight
  const heightWeight = {
    feet: body.heightFeet || body?.heightWeight?.feet || null,
    inches: body.heightInches || body?.heightWeight?.inches || null,
    weight: body.weight || body?.heightWeight?.weight || null,
  };

  // Tobacco / nicotine use
  const tobaccoUse =
    body.tobaccoUse || body.tobacco || body.nicotineUse || null;

  // Payment preference
  const paymentType = body.paymentType || null;

  // Health conditions & medications
  const normalizeList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const conditions = normalizeList(body.conditions);
  const medications = normalizeList(body.medications);

  return {
    normalizedRequest: {
      faceAmount,
      premium,
      coverageType: coverageType || null,
      sex,
      state,
      dob,
      age,
      heightWeight,
      tobaccoUse,
      paymentType,
      conditions,
      medications,
    },
    errors,
  };
}

// Simple health check
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Final Expense Quote API is running",
    timestamp: new Date().toISOString(),
  });
});

// Optional endpoint: list provider availability based on env flags
app.get("/providers", (req, res) => {
  const providers = getProvidersStatus();
  res.json({ providers });
});

// POST /quote – main endpoint for n8n (detailed quotes with health info)
app.post("/quote", async (req, res) => {
  try {
    const { normalizedRequest, errors } = normalizeAndValidate(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed. Fix the highlighted fields and try again.",
        errors,
      });
    }

    const quotes = await getAllQuotes(normalizedRequest);

    res.json({
      success: true,
      input: normalizedRequest,
      quotes,
    });
  } catch (err) {
    console.error("Error in /quote:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while getting quotes.",
      error: err.message,
    });
  }
});

// POST /quickquote – simplified quick quotes (no health conditions/medications)
app.post("/quickquote", async (req, res) => {
  try {
    const { normalizedRequest, errors } = normalizeAndValidate(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed. Fix the highlighted fields and try again.",
        errors,
      });
    }

    const quotes = await getQuickQuotes(normalizedRequest);

    res.json({
      success: true,
      input: normalizedRequest,
      quotes,
      note: "Quick quotes - no health conditions processed. Use /quote endpoint for detailed underwriting.",
    });
  } catch (err) {
    console.error("Error in /quickquote:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while getting quick quotes.",
      error: err.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Final Expense Quote API listening on port ${PORT}`);
});

