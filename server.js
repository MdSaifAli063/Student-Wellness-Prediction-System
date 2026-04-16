require("dotenv").config();

const path = require("path");
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;
const SCORING_URL = process.env.SCORING_URL;
const FIXED_FIELDS = [
  "age",
  "gender",
  "academic_year",
  "exam_pressure",
  "academic_performance",
  "stress_level",
  "anxiety_score",
  "depression_score",
  "sleep_hours",
  "physical_activity",
  "social_support",
  "screen_time",
  "internet_usage",
  "financial_stress",
  "family_expectation",
  "burnout_score",
  "mental_health_index",
  "risk_level",
  "dropout_risk",
];

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function getIamToken() {
  if (!API_KEY) {
    throw new Error("IBM Cloud API_KEY is missing in .env.");
  }

  const params = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: API_KEY,
  });

  const response = await axios.post(
    "https://iam.cloud.ibm.com/identity/token",
    params.toString(),
    {
      proxy: false,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      timeout: 20000,
    }
  );

  return response.data.access_token;
}

function normalizeValues(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((row) =>
    Array.isArray(row)
      ? row.map((value) =>
          value === "" || value === null || value === undefined ? null : value
        )
      : []
  );
}

app.get("/api/config", (_req, res) => {
  res.json({
    hasApiKey: Boolean(API_KEY),
    hasScoringUrl: Boolean(SCORING_URL),
    scoringUrl: SCORING_URL || "",
    fields: FIXED_FIELDS,
  });
});

app.post("/api/predict", async (req, res) => {
  try {
    if (!SCORING_URL) {
      return res.status(500).json({
        error: "IBM Cloud SCORING_URL is missing in .env.",
      });
    }

    const { fields, values } = req.body || {};

    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        error: "At least one input field is required.",
      });
    }

    const cleanedFields = fields
      .map((field) => String(field || "").trim())
      .filter(Boolean);

    const cleanedValues = normalizeValues(values).filter(
      (row) => row.length === cleanedFields.length
    );

    if (cleanedFields.length === 0) {
      return res.status(400).json({
        error: "Field names cannot be empty.",
      });
    }

    const schemaMatches =
      cleanedFields.length === FIXED_FIELDS.length &&
      cleanedFields.every((field, index) => field === FIXED_FIELDS[index]);

    if (!schemaMatches) {
      return res.status(400).json({
        error:
          "This app accepts only the student lifestyle dataset schema. Use the exact required 19 columns in the correct order.",
        expectedFields: FIXED_FIELDS,
      });
    }

    if (cleanedValues.length === 0) {
      return res.status(400).json({
        error:
          "Add at least one complete value row. Each row must match the number of fields.",
      });
    }

    const token = await getIamToken();

    const payload = {
      input_data: [
        {
          fields: cleanedFields,
          values: cleanedValues,
        },
      ],
    };

    const response = await axios.post(SCORING_URL, payload, {
      proxy: false,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json;charset=UTF-8",
      },
      timeout: 30000,
    });

    res.json({
      submittedPayload: payload,
      prediction: response.data,
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const details = {
      message: error.message,
      code: error.code || null,
      status: error.response?.status || null,
      statusText: error.response?.statusText || null,
      data: error.response?.data || null,
    };

    res.status(status).json({
      error: "IBM Cloud scoring request failed.",
      details,
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
