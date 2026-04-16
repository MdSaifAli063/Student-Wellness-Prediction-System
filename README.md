# Student Lifestyle Dropout Risk Predictor

## Overview

- `📊` Student lifestyle prediction dashboard
- `☁️` IBM Cloud deployment scoring integration
- `🧾` Table view and JSON view results
- `🌗` Light and dark mode UI
- `📁` CSV upload and manual record entry

A Node.js + Express web application for scoring a student lifestyle dataset against an IBM Cloud deployed machine learning model.

This project provides:
- a polished frontend for entering or uploading student records
- a backend API that authenticates with IBM Cloud IAM
- prediction output in table view and JSON view
- a fixed schema based on the student lifestyle CSV columns

## `🚀` Project Overview

This app is built for a student lifestyle prediction workflow where the input schema is fixed to the following 19 columns:

`age, gender, academic_year, exam_pressure, academic_performance, stress_level, anxiety_score, depression_score, sleep_hours, physical_activity, social_support, screen_time, internet_usage, financial_stress, family_expectation, burnout_score, mental_health_index, risk_level, dropout_risk`

The frontend allows you to:
- manually enter rows in a table
- upload a CSV file with the exact same header order
- send one or more rows to your IBM Cloud deployment
- view results in table and JSON formats
- download prediction results as JSON

## `🛠️` Tech Stack

- Node.js
- Express
- Axios
- HTML / CSS / JavaScript
- IBM Cloud IAM + deployment scoring API

## `📂` Project Structure

```text
.
|-- public/
|   |-- index.html
|   |-- styles.css
|   `-- script.js
|-- .env
|-- .gitignore
|-- package.json
|-- README.md
`-- server.js
```

## `⚙️` Setup

### 1. `📦` Install dependencies

```powershell
npm install
```

### 2. `🔐` Configure environment variables

Create or update `.env` with:

```env
API_KEY=your_ibm_cloud_api_key
SCORING_URL=your_ibm_cloud_scoring_url
```

Notes:
- `API_KEY` must be a valid IBM Cloud IAM API key
- `SCORING_URL` should point to your deployment scoring endpoint
- if your scoring URL is a private IBM endpoint, your machine must have network access to it

### 3. `▶️` Start the application

```powershell
npm start
```

Open:

```text
http://localhost:3000
```

## `🧠` How It Works

### `🎨` Frontend

The frontend:
- loads the fixed dataset schema
- validates CSV header order
- collects row values from the input table
- sends a POST request to `/api/predict`
- renders prediction output in table view and JSON view

### `🖥️` Backend

The backend in `server.js`:
- reads `API_KEY` and `SCORING_URL` from `.env`
- requests an IBM IAM access token
- validates that the submitted fields match the fixed 19-column schema
- sends the scoring payload to IBM Cloud
- returns formatted prediction data and raw IBM response

## `🔌` API Endpoints

### `GET /api/config` `ℹ️`

Returns app configuration metadata:
- whether `API_KEY` exists
- whether `SCORING_URL` exists
- the scoring URL
- the required input fields

### `POST /api/predict` `🤖`

Expected request body:

```json
{
  "fields": [
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
    "dropout_risk"
  ],
  "values": [
    [20, "Male", 2, 7, 6.8, 8, 7, 5, 5.5, 2, 6, 8, 9, 6, 8, 7, 4.9, "High", 1]
  ]
}
```

## `📄` CSV Requirements

Your CSV must use this exact header row:

```csv
age,gender,academic_year,exam_pressure,academic_performance,stress_level,anxiety_score,depression_score,sleep_hours,physical_activity,social_support,screen_time,internet_usage,financial_stress,family_expectation,burnout_score,mental_health_index,risk_level,dropout_risk
```

If the header order is different, the frontend and backend will reject it.

## `🧯` Troubleshooting

### 1. `❌` Prediction failed

If the UI shows a prediction failure, check:
- your IBM Cloud `API_KEY`
- your `SCORING_URL`
- whether the deployment expects the same 19 input fields
- whether the endpoint is public or private

### 2. `🌐` Private IBM endpoint timeout

If your scoring URL looks like:

```text
https://private.<region>.ml.cloud.ibm.com/...
```

then your machine may not have access to that deployment.

You may need:
- VPN access
- IBM private network access
- a public scoring endpoint instead of a private one

### 3. `🔑` Invalid API key

If the IBM IAM token request fails, replace the API key with a valid IAM API key from your IBM Cloud account.

## `✨` Features

- fixed schema validation
- CSV upload support
- manual row entry
- IBM Cloud IAM authentication
- IBM deployment scoring integration
- regression-style results layout
- table view and JSON view
- JSON export
- light and dark theme support

## `🔒` Security Notes

- `.env` is ignored by `.gitignore`
- do not commit real IBM Cloud credentials
- use `.env.example` if you later want to share a template safely

## `🧩` Future Improvements

- add `.env.example`
- support model-specific field templates
- add client-side CSV preview validation
- display clearer endpoint diagnostics for private IBM deployments

## `📝` Authoring Context

This README is tailored to the current project implementation in:
- [server.js](/d:/Machine%20Learning%20Project/server.js)
- [public/index.html](/d:/Machine%20Learning%20Project/public/index.html)
- [public/styles.css](/d:/Machine%20Learning%20Project/public/styles.css)
- [public/script.js](/d:/Machine%20Learning%20Project/public/script.js)
