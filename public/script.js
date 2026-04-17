const csvFileInput = document.getElementById("csvFileInput");
const loadDemoBtn = document.getElementById("loadDemoBtn");
const addRowBtn = document.getElementById("addRowBtn");
const predictBtn = document.getElementById("predictBtn");
const resetBtn = document.getElementById("resetBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const themeToggle = document.getElementById("themeToggle");
const messageBox = document.getElementById("messageBox");
const schemaText = document.getElementById("schemaText");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const payloadOutput = document.getElementById("payloadOutput");
const resultOutput = document.getElementById("resultOutput");
const jsonOutput = document.getElementById("jsonOutput");
const predictionType = document.getElementById("predictionType");
const distributionChart = document.getElementById("distributionChart");
const predictionTableHead = document.getElementById("predictionTableHead");
const predictionTableBody = document.getElementById("predictionTableBody");
const showInputToggle = document.getElementById("showInputToggle");
const tableViewPanel = document.getElementById("tableViewPanel");
const jsonViewPanel = document.getElementById("jsonViewPanel");
const connectionStatus = document.getElementById("connectionStatus");

const FIXED_FIELDS = [
  "age",
  "gender",
  "academic_year",
  "study_hours_per_day",
  "exam_pressure",
  "academic_performance",
  "stress_level",
  "anxiety_score",
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

let latestDownloadPayload = null;
let latestPredictionRows = [];
let latestSubmittedValues = [];

function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeToggle.checked = theme === "light";
  localStorage.setItem("ui-theme", theme);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem("ui-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    setTheme(savedTheme);
    return;
  }

  const prefersLight = window.matchMedia(
    "(prefers-color-scheme: light)",
  ).matches;
  setTheme(prefersLight ? "light" : "dark");
}

function setMessage(type, text) {
  messageBox.className = `message-box show ${type}`;
  messageBox.textContent = text;

  // Auto-hide success/info messages
  if (type === "success" || type === "info") {
    setTimeout(() => {
      if (messageBox.textContent === text) {
        clearMessage();
      }
    }, 5000);
  }
}

function clearMessage() {
  messageBox.className = "message-box";
  messageBox.textContent = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((item) => item.trim());
}

function castValue(item) {
  if (item === "") {
    return "";
  }

  const numericValue = Number(item);
  return Number.isNaN(numericValue) ? item : numericValue;
}

function renderHeader() {
  tableHead.innerHTML = `
    <tr>
      <th class="row-index">#</th>
      ${FIXED_FIELDS.map((field) => `<th>${field.replace(/_/g, " ")}</th>`).join("")}
      <th class="table-action-cell">Action</th>
    </tr>
  `;
}

function buildCell(field, value = "") {
  return `
    <td>
      <input
        type="text"
        data-field="${field}"
        value="${escapeHtml(value)}"
        placeholder="${field}"
      />
    </td>
  `;
}

function addTableRow(rowData = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="row-index"></td>
    ${FIXED_FIELDS.map((field) => buildCell(field, rowData[field] ?? "")).join("")}
    <td class="table-action-cell">
      <button class="danger-btn remove-row-btn" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Remove
      </button>
    </td>
  `;

  row.querySelector(".remove-row-btn").addEventListener("click", () => {
    row.style.animation = "slideOut 0.3s ease forwards";
    setTimeout(() => {
      row.remove();
      renumberTable();
    }, 280);
  });

  tableBody.appendChild(row);
  renumberTable();
}

function renumberTable() {
  Array.from(tableBody.querySelectorAll("tr")).forEach((row, index) => {
    row.querySelector(".row-index").textContent = index + 1;
  });
}

function getTableRows() {
  return Array.from(tableBody.querySelectorAll("tr"))
    .map((row) =>
      FIXED_FIELDS.map((field) => {
        const input = row.querySelector(`input[data-field="${field}"]`);
        return castValue(input.value.trim());
      }),
    )
    .filter((row) => row.some((value) => value !== ""));
}

function parsePredictionRows(responseData) {
  const predictions = responseData?.predictions;

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return [];
  }

  const firstPrediction = predictions[0];
  const fields =
    firstPrediction.fields || firstPrediction.predictions?.[0]?.fields || [];
  const values =
    firstPrediction.values || firstPrediction.predictions?.[0]?.values || [];

  if (!Array.isArray(fields) || !Array.isArray(values)) {
    return [];
  }

  return values.map((row) => {
    const mapped = {};
    fields.forEach((field, index) => {
      mapped[field] = row[index];
    });
    return mapped;
  });
}

function getRenderedPredictionRows(
  predictionRows,
  submittedValues,
  includeInputData,
) {
  return predictionRows.map((row, rowIndex) => {
    const rendered = { ...row };

    if (includeInputData) {
      FIXED_FIELDS.forEach((field, columnIndex) => {
        rendered[`input_${field}`] =
          submittedValues[rowIndex]?.[columnIndex] ?? null;
      });
    }

    return rendered;
  });
}

function detectPredictionType(predictionRows) {
  if (!predictionRows.length) {
    return "Regression";
  }

  const firstRow = predictionRows[0];
  const firstValue = Object.values(firstRow)[0];
  return typeof firstValue === "number" ? "Regression" : "Classification";
}

function renderDistribution(predictionRows) {
  distributionChart.innerHTML = "";

  if (!predictionRows.length) {
    distributionChart.innerHTML = `
      <div class="chart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M18 17V9M13 17V5M8 17v-3"/>
        </svg>
        <span>Prediction chart will appear here</span>
      </div>
    `;
    return;
  }

  const firstKey = Object.keys(predictionRows[0])[0];
  const values = predictionRows
    .map((row) => row[firstKey])
    .filter((value) => value !== null && value !== undefined);

  if (!values.length) {
    distributionChart.innerHTML = `
      <div class="chart-empty">
        <span>No valid prediction values found</span>
      </div>
    `;
    return;
  }

  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));

  if (!numericValues.length) {
    // For classification, show category counts
    const counts = {};
    values.forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });
    const categories = Object.keys(counts);
    const maxCount = Math.max(...Object.values(counts));

    const bars = categories
      .map((cat, idx) => {
        const height = (counts[cat] / maxCount) * 180;
        const width = 100 / categories.length - 4;
        const left = (100 / categories.length) * idx + 2;
        return `<div class="plot-bar" style="height:${height}px;width:${width}%;left:${left}%;right:auto;animation-delay:${idx * 0.1}s"></div>`;
      })
      .join("");

    const labels = categories
      .map(
        (cat, idx) =>
          `<span class="x-tick" style="flex:1;text-align:center">${escapeHtml(cat)}</span>`,
      )
      .join("");

    distributionChart.innerHTML = `
      <div class="distribution-plot">
        <div class="y-axis-label">Count</div>
        <div class="plot-area">
          <div class="y-tick-top">${maxCount}</div>
          <div class="y-tick-bottom">0</div>
          ${bars}
        </div>
        <div class="x-axis">${labels}</div>
        <div class="x-axis-label">Categories</div>
      </div>
    `;
    return;
  }

  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);

  const binCount = Math.min(4, Math.max(2, numericValues.length));
  const binSize = (maxValue - minValue) / binCount || 1;
  const bins = new Array(binCount).fill(0);

  numericValues.forEach((v) => {
    const binIndex = Math.min(
      Math.floor(binSize > 0 ? (v - minValue) / binSize : 0),
      binCount - 1,
    );
    bins[binIndex]++;
  });

  const maxBinCount = Math.max(...bins);

  const formatValue = (value) => {
    if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
      return value.toExponential(2);
    }
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  };

  const bars = bins
    .map((count, idx) => {
      const height = maxBinCount > 0 ? (count / maxBinCount) * 180 : 0;
      const width = 20;
      const left = 10 + idx * (80 / (binCount - 1));
      return `<div class="plot-bar" style="height:${height}px;width:${width}px;left:${left}%;animation-delay:${idx * 0.05}s" title="${count} predictions"></div>`;
    })
    .join("");

  distributionChart.innerHTML = `
    <div class="distribution-plot">
      <div class="y-axis-label">Number of predictions</div>
      <div class="plot-area">
        <div class="y-tick-top">${maxBinCount}</div>
        <div class="y-tick-bottom">0</div>
        ${bars}
      </div>
      <div class="x-axis">
        <span class="x-tick">${escapeHtml(formatValue(minValue))}</span>
        <span class="x-tick right">${escapeHtml(formatValue(maxValue))}</span>
      </div>
      <div class="x-axis-label">Prediction value</div>
    </div>
  `;
}

function renderPredictionTable(rows) {
  if (!rows.length) {
    predictionTableHead.innerHTML = "<tr><th>#</th><th>Prediction</th></tr>";
    predictionTableBody.innerHTML =
      "<tr><td>1</td><td>Prediction results will appear here.</td></tr>";
    return;
  }

  const columns = Object.keys(rows[0]);
  predictionTableHead.innerHTML = `
    <tr>
      <th>#</th>
      ${columns.map((column) => `<th>${escapeHtml(column.replace(/_/g, " "))}</th>`).join("")}
    </tr>
  `;

  predictionTableBody.innerHTML = rows
    .map(
      (row, index) => `
        <tr>
          <td class="row-index">${index + 1}</td>
          ${columns
            .map((column) => {
              const val = row[column];
              const isNumeric = typeof val === "number";
              return `<td>${isNumeric ? val.toFixed(4) : escapeHtml(val)}</td>`;
            })
            .join("")}
        </tr>
      `,
    )
    .join("");
}

function updateResultViews() {
  const includeInputData = showInputToggle.checked;
  const renderedRows = getRenderedPredictionRows(
    latestPredictionRows,
    latestSubmittedValues,
    includeInputData,
  );

  renderPredictionTable(renderedRows);
  jsonOutput.textContent = renderedRows.length
    ? JSON.stringify(renderedRows, null, 2)
    : "Prediction results will appear here.";
  predictionType.textContent = detectPredictionType(latestPredictionRows);
  latestDownloadPayload = renderedRows.length ? renderedRows : [];
}

function switchResultView(mode) {
  const showTable = mode === "table";
  tableViewPanel.classList.toggle("hidden", !showTable);
  jsonViewPanel.classList.toggle("hidden", showTable);
}

function downloadJsonFile() {
  if (!latestDownloadPayload || !latestDownloadPayload.length) {
    setMessage("error", "No prediction data available to download.");
    return;
  }
  const content = JSON.stringify(latestDownloadPayload, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `prediction-results-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setMessage("success", "Downloaded prediction results successfully!");
}

async function loadCsvFile(file) {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error("The CSV file is empty.");
  }

  const header = parseCsvLine(lines[0]);
  const headerMatches =
    header.length === FIXED_FIELDS.length &&
    header.every((field, index) => field === FIXED_FIELDS[index]);

  if (!headerMatches) {
    throw new Error(
      "CSV header does not match the required student lifestyle schema.",
    );
  }

  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  tableBody.innerHTML = "";

  if (!rows.length) {
    addTableRow();
    setMessage("info", "CSV schema matched, but no data rows were found.");
    return;
  }

  rows.forEach((row) => {
    const rowObject = {};
    FIXED_FIELDS.forEach((field, index) => {
      rowObject[field] = row[index] ?? "";
    });
    addTableRow(rowObject);
  });

  setMessage(
    "success",
    `✅ Loaded ${rows.length} row(s) from CSV successfully!`,
  );
}

async function fetchConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    const ready = config.hasApiKey && config.hasScoringUrl;

    const statusIndicator = connectionStatus.querySelector(".status-indicator");
    const statusText = connectionStatus.querySelector(".status-text");

    if (ready) {
      statusText.textContent = "IBM Cloud Connected";
      statusIndicator.style.background = "var(--success)";
      statusIndicator.style.boxShadow = "0 0 10px var(--success)";
    } else {
      statusText.textContent = "Configuration Incomplete";
      statusIndicator.style.background = "var(--warning)";
      statusIndicator.style.boxShadow = "0 0 10px var(--warning)";
    }
  } catch (_error) {
    const statusIndicator = connectionStatus.querySelector(".status-indicator");
    const statusText = connectionStatus.querySelector(".status-text");
    statusText.textContent = "Connection Error";
    statusIndicator.style.background = "var(--danger)";
    statusIndicator.style.boxShadow = "0 0 10px var(--danger)";
  }
}

function loadDemoData() {
  tableBody.innerHTML = "";
  addTableRow({
    age: 20,
    gender: "Male",
    academic_year: 2,
    study_hours_per_day: 4,
    exam_pressure: 7,
    academic_performance: 6.8,
    stress_level: 8,
    anxiety_score: 7,
    sleep_hours: 5.5,
    physical_activity: 2,
    social_support: 6,
    screen_time: 8,
    internet_usage: 9,
    financial_stress: 6,
    family_expectation: 8,
    burnout_score: 7,
    mental_health_index: 4.9,
    risk_level: "High",
    dropout_risk: 1,
  });
  addTableRow({
    age: 22,
    gender: "Female",
    academic_year: 4,
    study_hours_per_day: 5,
    exam_pressure: 4,
    academic_performance: 8.4,
    stress_level: 4,
    anxiety_score: 3,
    sleep_hours: 7.2,
    physical_activity: 6,
    social_support: 8,
    screen_time: 4,
    internet_usage: 5,
    financial_stress: 3,
    family_expectation: 6,
    burnout_score: 3,
    mental_health_index: 8.1,
    risk_level: "Low",
    dropout_risk: 0,
  });
  setMessage("info", "📊 Demo student records loaded successfully!");
}

async function runPrediction() {
  clearMessage();

  const fields = FIXED_FIELDS;
  const values = getTableRows();

  if (!values.length) {
    setMessage("error", "⚠️ Please add at least one row of input values.");
    return;
  }

  const invalidRow = values.find((row) => row.length !== fields.length);
  if (invalidRow) {
    setMessage(
      "error",
      `⚠️ Each row must contain exactly ${fields.length} values to match the dataset schema.`,
    );
    return;
  }

  predictBtn.disabled = true;
  const originalContent = predictBtn.innerHTML;
  predictBtn.innerHTML = '<span style="margin-left:24px;">Processing...</span>';

  const payload = { fields, values };
  latestSubmittedValues = values;
  payloadOutput.textContent = JSON.stringify(payload, null, 2);
  resultOutput.textContent = "⏳ Waiting for IBM Cloud response...";
  latestPredictionRows = [];
  updateResultViews();
  renderDistribution([]);

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data, null, 2));
    }

    latestPredictionRows = parsePredictionRows(data.prediction);
    resultOutput.textContent = JSON.stringify(data.prediction, null, 2);
    payloadOutput.textContent = JSON.stringify(data.submittedPayload, null, 2);
    updateResultViews();
    renderDistribution(latestPredictionRows);
    setMessage(
      "success",
      `✅ Prediction completed! ${latestPredictionRows.length} result(s) returned.`,
    );

    // Scroll to results
    document
      .querySelector(".result-panel")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    let errorMsg = error.message || "An unknown error occurred while scoring.";
    let userMessage = "❌ Prediction failed. ";

    try {
      const parsed = JSON.parse(errorMsg);

      // Extract IBM deployment error details
      if (parsed?.details?.data?.errors?.length) {
        const ibmErrors = parsed.details.data.errors
          .map((err) => err.message)
          .join(" ");
        errorMsg = ibmErrors;
        userMessage += `IBM deployment error: ${ibmErrors}`;
      } else if (parsed?.details?.message) {
        errorMsg = parsed.details.message;
        userMessage += parsed.details.message;
      } else if (parsed?.error) {
        errorMsg = parsed.error;
        userMessage += parsed.error;
      } else {
        userMessage +=
          "Check your IBM API key, scoring URL, and deployment configuration.";
      }
    } catch (_parseErr) {
      // If it's not JSON, show the raw error
      userMessage +=
        errorMsg ||
        "Check your IBM API key, scoring URL, and deployment configuration.";
    }

    resultOutput.textContent = errorMsg;
    latestPredictionRows = [];
    updateResultViews();
    renderDistribution([]);
    setMessage("error", userMessage);
  } finally {
    predictBtn.disabled = false;
    predictBtn.innerHTML = originalContent;
  }
}

function resetAll() {
  tableBody.innerHTML = "";
  addTableRow();
  clearMessage();
  payloadOutput.textContent = "No request submitted yet.";
  resultOutput.textContent = "Prediction results will appear here.";
  latestPredictionRows = [];
  latestSubmittedValues = [];
  showInputToggle.checked = false;
  updateResultViews();
  renderDistribution([]);
  setMessage("info", "🔄 Form reset successfully.");
}

// Add slideOut animation
const style = document.createElement("style");
style.textContent = `
  @keyframes slideOut {
    to {
      opacity: 0;
      transform: translateX(20px);
      height: 0;
    }
  }
`;
document.head.appendChild(style);

addRowBtn.addEventListener("click", () => addTableRow());
loadDemoBtn.addEventListener("click", loadDemoData);
predictBtn.addEventListener("click", runPrediction);
resetBtn.addEventListener("click", resetAll);
downloadJsonBtn.addEventListener("click", downloadJsonFile);
showInputToggle.addEventListener("change", updateResultViews);
themeToggle.addEventListener("change", () => {
  setTheme(themeToggle.checked ? "light" : "dark");
});

csvFileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;

  if (!file) {
    return;
  }

  try {
    await loadCsvFile(file);
  } catch (error) {
    setMessage(
      "error",
      `❌ ${error.message || "Unable to load the CSV file."}`,
    );
  } finally {
    csvFileInput.value = "";
  }
});

document.querySelectorAll('input[name="resultView"]').forEach((input) => {
  input.addEventListener("change", (event) => {
    switchResultView(event.target.value);
  });
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runPrediction();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "d") {
    e.preventDefault();
    loadDemoData();
  }
});

initializeTheme();
schemaText.textContent = FIXED_FIELDS.join(", ");
renderHeader();
addTableRow();
updateResultViews();
renderDistribution([]);
fetchConfig();
