// =========================
//  GLOBAL CONFIG (filled from data.js at runtime)
// =========================

let TASKS_URL = "";
let ADD_OBS_URL = "";
let EOM_CSV_URL = "";
let OBS_CSV_URL = "";
let NEWS_CSV_URL = "";
let FULL_SHEET_URL = "";
let TBT_LIST = [];
let JSA_LIST = [];

function initConfigFromWindow() {
  // Read everything that data.js put on window.*
  TASKS_URL = window.TASKS_FORM_EMBED_URL || "";
  ADD_OBS_URL = window.ADD_OBSERVATION_FORM_URL || "";
  EOM_CSV_URL = window.EOM_SHEET_URL || "";
  OBS_CSV_URL = window.OBSERVATIONS_SHEET_CSV_URL || "";
  NEWS_CSV_URL = window.NEWS_SHEET_CSV_URL || "";
  FULL_SHEET_URL = window.OBSERVATIONS_FULL_SHEET_URL || "";
  TBT_LIST = window.tbtData || [];
  JSA_LIST = window.jsaData || [];
}

// =========================
//  STATE
// =========================

let leaderboardData = [];
let observationsAll = [];
let observationsLoaded = false;

const obsFilters = {
  range: "today",
  risk: "",
  status: "",
  search: ""
};

const KPI_CONFIG = [
  {
    id: "kpi_trir",
    category: "Lagging",
    name: "Total Recordable Injury Rate (TRIR)",
    formula: "rate_200k",
    inputs: [
      { name: "recordable", label: "Recordable Injuries" },
      { name: "hours", label: "Work Hours" }
    ],
    targetStr: "≤ 0.50",
    targetVal: 0.5,
    targetType: "max",
    source: "CSM & Safety Handbook – Injury Rates"
  },
  {
    id: "kpi_ltir",
    category: "Lagging",
    name: "Lost Time Injury Rate (LTIR)",
    formula: "rate_200k",
    inputs: [
      { name: "lti", label: "Lost Time Injuries" },
      { name: "hours", label: "Work Hours" }
    ],
    targetStr: "0.00",
    targetVal: 0,
    targetType: "max",
    source: "CSM & Safety Handbook – LTI"
  },
  {
    id: "kpi_mva",
    category: "Lagging",
    name: "Motor Vehicle Accident Rate (per 1M km)",
    formula: "rate_1m",
    inputs: [
      { name: "mva", label: "MVA Count" },
      { name: "km", label: "Kilometers Driven" }
    ],
    targetStr: "0.00",
    targetVal: 0,
    targetType: "max",
    source: "CSM Vol II – Transport Safety"
  },
  {
    id: "kpi_wp",
    category: "Leading",
    name: "Work Permit Compliance %",
    formula: "percentage",
    inputs: [
      { name: "pass", label: "Permits Passed Audit" },
      { name: "total", label: "Total Permits Audited" }
    ],
    targetStr: "100%",
    targetVal: 100,
    targetType: "min",
    source: "CSM Vol II – Work Permits"
  }
];

// =========================
//  UTILITIES
// =========================

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines
    .slice(1)
    .filter(l => l.trim().length > 0)
    .map(line => {
      const cols = line.split(",");
      const obj = {};
      headers.forEach((h, i) => {
        const v = (cols[i] || "").trim().replace(/^"|"$/g, "");
        obj[h] = v;
      });
      return obj;
    });
}

function toNumber(val) {
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseObsDate(str) {
  if (!str) return null;
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    let [dStr, mStr, yStr] = parts;
    if (yStr.length === 2) yStr = "20" + yStr;
    const day = parseInt(dStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const year = parseInt(yStr, 10);
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysAgo(num) {
  const d = new Date();
  d.setDate(d.getDate() - num);
  return startOfDay(d);
}

// =========================
//  THEME
// =========================

function applySavedTheme() {
  const saved = localStorage.getItem("theme");
  const body = document.body;
  const icon = document.getElementById("modeIcon");
  if (saved === "dark") {
    body.classList.add("dark-mode");
    if (icon) {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
    }
  } else {
    body.classList.remove("dark-mode");
    if (icon) {
      icon.classList.remove("fa-sun");
      icon.classList.add("fa-moon");
    }
  }
}

function toggleDarkMode() {
  const body = document.body;
  const icon = document.getElementById('modeIcon');

  const isCurrentlyLight = body.classList.contains('light-mode');

  if (isCurrentlyLight) {
    // Switch to DARK
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');

    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    // Switch to LIGHT
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');

    icon.classList.add('fa-moon');
    icon.classList.remove('fa-sun');
  }
}

// =========================
//  NAV / TABS
// =========================

function openTab(evt, tabName) {
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach(t => t.classList.remove("active"));
  const target = document.getElementById(tabName);
  if (target) target.classList.add("active");

  const navButtons = document.querySelectorAll(".nav-button");
  navButtons.forEach(btn => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });

  if (evt && evt.currentTarget) {
    const btn = evt.currentTarget;
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
  }

  const contentArea = document.querySelector(".content-area");
  if (contentArea) contentArea.scrollTop = 0;
}

// =========================
//  ACCORDIONS
// =========================

function initAccordions() {
  const accordions = document.querySelectorAll(".accordion");
  accordions.forEach(acc => {
    acc.addEventListener("click", function () {
      this.classList.toggle("activeAcc");
      const panel = this.nextElementSibling;
      if (!panel || !panel.classList.contains("panel")) return;
      const isOpen = panel.style.display === "block";
      // Close all others in same section
      accordions.forEach(other => {
        if (other !== this) {
          other.classList.remove("activeAcc");
          const p = other.nextElementSibling;
          if (p && p.classList.contains("panel")) {
            p.style.display = "none";
          }
        }
      });
      panel.style.display = isOpen ? "none" : "block";
    });
  });
}

// =========================
//  MODALS
// =========================

function showLeaderboardModal() {
  const modal = document.getElementById("leaderboardModal");
  if (modal) {
    modal.style.display = "block";
    renderLeaderboardTable();
  }
}

function hideLeaderboardModal() {
  const modal = document.getElementById("leaderboardModal");
  if (modal) modal.style.display = "none";
}

function showEmergencyContactsModal() {
  const modal = document.getElementById("emergencyContactsModal");
  if (modal) modal.style.display = "block";
}

function hideEmergencyContactsModal() {
  const modal = document.getElementById("emergencyContactsModal");
  if (modal) modal.style.display = "none";
}

// =========================
//  MONTH COLOR
// =========================

function setMonthColor() {
  const el = document.getElementById("colorName");
  if (!el) return;
  const month = new Date().getMonth();
  const colors = [
    "Red",
    "Yellow",
    "Green",
    "Blue",
    "Orange",
    "Purple",
    "Brown",
    "Pink",
    "Grey",
    "Black",
    "White"
  ];
  el.textContent = colors[month] || "N/A";
}

// =========================
//  EOM + LEADERBOARD
// =========================

function loadEomAndLeaderboard() {
  const eomEl = document.getElementById("employeeOfMonth");

  if (!EOM_CSV_URL || !EOM_CSV_URL.startsWith("http")) {
    if (eomEl) eomEl.textContent = "Configure EOM_SHEET_URL in js/data.js";
    leaderboardData = [];
    renderHomeLeaderboardMini();
    return;
  }

  fetch(EOM_CSV_URL)
    .then(res => res.text())
    .then(text => {
      const rows = parseCsv(text);
      if (!rows.length) {
        if (eomEl) eomEl.textContent = "No data";
        leaderboardData = [];
        renderHomeLeaderboardMini();
        return;
      }
      const latest = rows[rows.length - 1];
      const name =
        latest.Name ||
        latest.Employee ||
        latest["Employee Name"] ||
        Object.values(latest)[0] ||
        "Unknown";
      if (eomEl) eomEl.textContent = name;

      leaderboardData = rows
        .map(row => {
          const n =
            row.Name ||
            row.Employee ||
            row["Employee Name"] ||
            "";
          const points = toNumber(
            row.Points || row.Score || row["Total Points"] || 0
          );
          return n ? { name: n, points } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.points - a.points);

      renderHomeLeaderboardMini();
    })
    .catch(err => {
      console.error("EOM load error:", err);
      if (eomEl) eomEl.textContent = "Error loading data";
      leaderboardData = [];
      renderHomeLeaderboardMini();
    });
}

function renderHomeLeaderboardMini() {
  const container = document.getElementById("homeLeaderboardMini");
  if (!container) return;

  if (!leaderboardData.length) {
    container.innerHTML =
      '<div style="font-size:12px; color:var(--text-muted);">No leaderboard data.</div>';
    return;
  }

  const top3 = leaderboardData.slice(0, 3);
  const rows = top3
    .map((p, idx) => {
      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${medal}</span>
            <span style="font-size:13px; font-weight:600;">${p.name}</span>
          </div>
          <div style="font-size:13px; font-weight:600; color:var(--primary-color);">${p.points}</div>
        </div>
      `;
    })
    .join("");
  container.innerHTML = rows;
}

function renderLeaderboardTable() {
  const container = document.getElementById("leaderboardContainer");
  if (!container) return;

  if (!leaderboardData.length) {
    container.innerHTML =
      '<div class="loading-spinner"><i class="fas fa-info-circle"></i>&nbsp;No leaderboard data.</div>';
    return;
  }

  const rows = leaderboardData
    .map((p, idx) => {
      const medal =
        idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1;
      return `
        <tr>
          <td style="text-align:center;">${medal}</td>
          <td>${p.name}</td>
          <td style="text-align:center;">${p.points}</td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <table id="leaderboardTable">
      <thead>
        <tr>
          <th style="width:60px;">Rank</th>
          <th>Name</th>
          <th style="width:80px;">Points</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// =========================
//  TBT OF THE DAY + LIBRARY
// =========================

function getTodayTbt() {
  if (!TBT_LIST.length) return null;
  const today = new Date();
  const index =
    (today.getFullYear() * 366 +
      today.getMonth() * 31 +
      today.getDate()) %
    TBT_LIST.length;
  return TBT_LIST[index];
}

function renderTbtOfTheDay() {
  const homeEl = document.getElementById("homeTbtContent");
  const panelEl = document.getElementById("tbtPanel");
  const tbt = getTodayTbt();

  if (!tbt) {
    if (homeEl)
      homeEl.textContent = "No TBT data configured. Add items in js/data.js.";
    if (panelEl)
      panelEl.innerHTML =
        "<p>No TBT data configured. Add items in <code>tbtData</code> in js/data.js.</p>";
    return;
  }

  if (homeEl) {
    homeEl.innerHTML = `
      <div style="font-size:14px; font-weight:600; margin-bottom:4px;">${tbt.title}</div>
      <a href="${tbt.link}" target="_blank">Open TBT document</a>
    `;
  }
  if (panelEl) {
    panelEl.innerHTML = `
      <p><strong>Today's Toolbox Talk:</strong> ${tbt.title}</p>
      <p><a href="${tbt.link}" target="_blank">📎 Open Toolbox Talk document (Google Drive)</a></p>
      <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">
        This topic is automatically selected from your TBT library based on today's date.
      </p>
    `;
  }
}

function renderTbtLibrary() {
  const container = document.getElementById("tbtLibraryList");
  if (!container) return;

  if (!TBT_LIST.length) {
    container.innerHTML =
      '<div class="obs-empty-state"><p>No TBT items found.</p></div>';
    return;
  }

  const html = TBT_LIST.map(
    tbt => `
    <div class="jsa-accordion-item" onclick="window.open('${tbt.link}', '_blank')">
      <i class="fas fa-book-open"></i> ${tbt.title}
    </div>
  `
  ).join("");

  container.innerHTML = html;
}

// =========================
//  JSA LIBRARY
// =========================

function renderJSAList(filterText = "") {
  const container = document.getElementById("jsaListContainer");
  if (!container) return;

  const q = filterText.trim().toLowerCase();
  const items = JSA_LIST.filter(j => j.title.toLowerCase().includes(q));

  if (!items.length) {
    container.innerHTML =
      '<div class="obs-empty-state"><p>No JSA found for this search.</p></div>';
    return;
  }

  let html = "";
  items.forEach((jsa, idx) => {
    const panelId = `jsa-panel-${idx}`;
    html += `
      <div>
        <button class="jsa-accordion-item" data-panel-id="${panelId}">
          <i class="fas fa-file-alt"></i> ${jsa.title}
        </button>
        <div class="jsa-panel" id="${panelId}">
          <p style="margin-top:0;">JSA for: <strong>${jsa.title}</strong></p>
          <p style="font-size:13px; color:var(--text-muted);">
            Click the button below to open the JSA document in Google Drive.
          </p>
          <button class="gps-btn" onclick="window.open('${jsa.link}', '_blank')">
            ✅ Open JSA in Google Drive
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Accordion behavior for JSA items
  const jsaAccs = container.querySelectorAll(".jsa-accordion-item");
  jsaAccs.forEach(btn => {
    btn.addEventListener("click", function () {
      const panelId = this.getAttribute("data-panel-id");
      const panel = document.getElementById(panelId);
      if (!panel) return;
      const isOpen = panel.style.display === "block";

      jsaAccs.forEach(other => {
        const pid = other.getAttribute("data-panel-id");
        const p = document.getElementById(pid);
        if (p) p.style.display = "none";
        other.classList.remove("activeAcc");
      });

      if (!isOpen) {
        panel.style.display = "block";
        this.classList.add("activeAcc");
      }
    });
  });
}

function filterJSAList() {
  const input = document.getElementById("jsaSearch");
  const q = input ? input.value : "";
  renderJSAList(q);
}

// =========================
//  KPI CALCULATIONS
// =========================

function calculateKpiValue(config, values) {
  switch (config.formula) {
    case "rate_200k": {
      const num = toNumber(values[config.inputs[0].name]);
      const hours = toNumber(values.hours || values[config.inputs[1].name]);
      if (!hours) return null;
      return (num * 200000) / hours;
    }
    case "rate_1m": {
      const num = toNumber(values[config.inputs[0].name]);
      const km = toNumber(values.km || values[config.inputs[1].name]);
      if (!km) return null;
      return (num * 1000000) / km;
    }
    case "percentage": {
      const pass = toNumber(values[config.inputs[0].name]);
      const total = toNumber(values[config.inputs[1].name]);
      if (!total) return null;
      return (pass / total) * 100;
    }
    default:
      return null;
  }
}

function formatKpiValue(config, value) {
  if (value === null) return "--";
  if (config.formula === "percentage") return value.toFixed(1) + "%";
  if (config.id === "kpi_mva") return value.toFixed(2);
  return value.toFixed(2);
}

function evaluateKpiTarget(config, value) {
  if (value === null) return "unknown";
  if (config.targetType === "max") {
    return value <= config.targetVal ? "ok" : "bad";
  }
  if (config.targetType === "min") {
    return value >= config.targetVal ? "ok" : "bad";
  }
  return "unknown";
}

function renderKPIs() {
  const container = document.getElementById("kpiListContainer");
  if (!container) return;

  const cards = KPI_CONFIG.map(cfg => {
    const inputsHtml = cfg.inputs
      .map(
        inp => `
      <div class="kpi-input-group">
        <label>${inp.label}</label>
        <input
          type="number"
          step="any"
          class="kpi-input-field"
          data-kpi="${cfg.id}"
          data-field="${inp.name}"
          placeholder="0"
        >
      </div>
    `
      )
      .join("");

    return `
      <div class="kpi-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <div style="font-family:'Poppins',sans-serif; font-weight:600; font-size:14px;">${cfg.name}</div>
          <span style="font-size:11px; padding:3px 7px; border-radius:999px; background-color:rgba(0,0,0,0.03); color:var(--text-muted);">
            ${cfg.category}
          </span>
        </div>
        ${inputsHtml}
        <div class="kpi-footer">
          <div class="kpi-result-box">
            <div class="kpi-result-label">Result</div>
            <div class="kpi-result-value" id="${cfg.id}_value">--</div>
          </div>
          <div class="kpi-result-box">
            <div class="kpi-result-label">Target</div>
            <div class="kpi-result-value">${cfg.targetStr}</div>
          </div>
        </div>
        <div class="kpi-citation">
          Source: ${cfg.source}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = cards;

  container.querySelectorAll("input[data-kpi]").forEach(input => {
    input.addEventListener("input", () => {
      const kpiId = input.getAttribute("data-kpi");
      const cfg = KPI_CONFIG.find(k => k.id === kpiId);
      if (!cfg) return;

      const values = {};
      container
        .querySelectorAll(`input[data-kpi="${kpiId}"]`)
        .forEach(i => {
          const field = i.getAttribute("data-field");
          values[field] = i.value;
        });

      const v = calculateKpiValue(cfg, values);
      const valEl = document.getElementById(`${cfg.id}_value`);
      if (!valEl) return;
      valEl.textContent = formatKpiValue(cfg, v);

      const status = evaluateKpiTarget(cfg, v);
      if (status === "ok") {
        valEl.style.color = "var(--success-color)";
      } else if (status === "bad") {
        valEl.style.color = "var(--danger-color)";
      } else {
        valEl.style.color = "var(--text-color)";
      }
    });
  });
}

// =========================
//  HEAT INDEX
// =========================

function calculateHeatIndex() {
  const tEl = document.getElementById("inputTemp");
  const hEl = document.getElementById("inputHumidity");
  const resCard = document.getElementById("heatIndexResultCard");
  const valEl = document.getElementById("heatIndexValue");
  const lvlEl = document.getElementById("heatRiskLevel");
  const listEl = document.getElementById("heatRecommendationsList");
  const homeHeat = document.getElementById("homeHeatSummary");

  if (!tEl || !hEl || !resCard || !valEl || !lvlEl || !listEl) return;

  const T = parseFloat(tEl.value);
  const R = parseFloat(hEl.value);

  if (isNaN(T) || isNaN(R)) {
    resCard.style.display = "none";
    if (homeHeat) homeHeat.textContent = "--";
    return;
  }

  // Rothfusz regression – temp in °C converted to °F
  const Tc = T;
  const Tf = (Tc * 9) / 5 + 32;
  const HI_F =
    -42.379 +
    2.04901523 * Tf +
    10.14333127 * R -
    0.22475541 * Tf * R -
    0.00683783 * Tf * Tf -
    0.05481717 * R * R +
    0.00122874 * Tf * Tf * R +
    0.00085282 * Tf * R * R -
    0.00000199 * Tf * Tf * R * R;

  const HI_C = ((HI_F - 32) * 5) / 9;
  const rounded = Math.round(HI_C);

  let category = "";
  let bg = "#27ae60";
  const recs = [];

  if (rounded < 27) {
    category = "Caution";
    bg = "#27ae60";
    recs.push("Normal precautions. Hydrate regularly.");
  } else if (rounded < 32) {
    category = "Extreme Caution";
    bg = "#f39c12";
    recs.push("Increase water breaks. Monitor workers frequently.");
  } else if (rounded < 41) {
    category = "Danger";
    bg = "#e67e22";
    recs.push("Enforce work-rest cycles. Provide shaded rest areas.");
    recs.push("Watch for signs of heat stress.");
  } else {
    category = "Extreme Danger";
    bg = "#c0392b";
    recs.push("Stop non-critical work. Move workers to cool areas.");
    recs.push("Immediate medical attention for any symptoms.");
  }

  resCard.style.display = "block";
  resCard.style.backgroundColor = bg;
  valEl.textContent = rounded + "°C";
  lvlEl.textContent = category;
  listEl.innerHTML = recs.map(r => `<li>${r}</li>`).join("");

  if (homeHeat) {
    homeHeat.textContent = `${category} (${rounded}°C HI)`;
  }
}

// =========================
//  WIND SPEED
// =========================

function calculateWindSafety() {
  const wEl = document.getElementById("inputWind");
  const resCard = document.getElementById("windSpeedResultCard");
  const valEl = document.getElementById("windValue");
  const lvlEl = document.getElementById("windRiskLevel");
  const listEl = document.getElementById("windRecommendationsList");
  const homeWind = document.getElementById("homeWindSummary");

  if (!wEl || !resCard || !valEl || !lvlEl || !listEl) return;

  const v = parseFloat(wEl.value);
  if (isNaN(v)) {
    resCard.style.display = "none";
    if (homeWind) homeWind.textContent = "--";
    return;
  }

  let category = "";
  let bg = "#27ae60";
  const recs = [];

  if (v < 32) {
    category = "Safe";
    bg = "#27ae60";
    recs.push("Normal crane operations allowed.");
  } else if (v < 38) {
    category = "Caution";
    bg = "#f39c12";
    recs.push("Review crane operations. Consider reducing load.");
  } else if (v < 55) {
    category = "Restricted";
    bg = "#e67e22";
    recs.push("Stop man-basket and high-risk lifts.");
    recs.push("Only essential lifts with approval.");
  } else {
    category = "Stop Work";
    bg = "#c0392b";
    recs.push("Stop all lifting operations.");
  }

  resCard.style.display = "block";
  resCard.style.backgroundColor = bg;
  valEl.textContent = v.toFixed(1) + " km/h";
  lvlEl.textContent = category;
  listEl.innerHTML = recs.map(r => `<li>${r}</li>`).join("");

  if (homeWind) {
    homeWind.textContent = `${category} (${v.toFixed(0)} km/h)`;
  }
}

// =========================
//  TOOLS TAB SWITCHING
// =========================

function switchTool(tool) {
  const buttons = document.querySelectorAll(".tool-toggle-btn");
  buttons.forEach(btn => {
    const t = btn.getAttribute("data-tool");
    if (t === tool) {
      btn.classList.add("active-tool");
    } else {
      btn.classList.remove("active-tool");
    }
  });

  const kpiSec = document.getElementById("kpiSection");
  const heatSec = document.getElementById("heatStressSection");
  const windSec = document.getElementById("windSpeedSection");

  if (kpiSec) kpiSec.style.display = tool === "kpi" ? "block" : "none";
  if (heatSec) kpiSec && (heatSec.style.display = tool === "heat" ? "block" : "none");
  if (windSec) windSec.style.display = tool === "wind" ? "block" : "none";
}

// =========================
//  OBSERVATIONS
// =========================

function loadObservations() {
  if (!OBS_CSV_URL || !OBS_CSV_URL.startsWith("http")) {
    observationsAll = [];
    observationsLoaded = false;
    updateObservationUI();
    return;
  }

  fetch(OBS_CSV_URL)
    .then(res => res.text())
    .then(text => {
      const rows = parseCsv(text);
      const mapped = rows.map((r, idx) => {
  // Your sheet columns:
  // Date, Day, Group #, Activity Type, Observation Class, Observation Types,
  // Injury/No Injury, Type of Injury, Description, Name, ID, Position,
  // Direct Cause, Root Cause, Equipment / Tool, Area, Likelihood, Severity,
  // RA Rate, RA Level, Report Status, CSM, Comment

  const dateStr = r.Date || "";                  // main date
  const date = parseObsDate(dateStr);

  // Use Area as "location" in the UI
  const location = r.Area || r["Group #"] || "";

  // Show observation type/class as "Type"
  const type =
    r["Observation Types"] ||
    r["Observation Class"] ||
    r["Activity Type"] ||
    "";

  // Use RA Level as risk (High / Medium / Low)
  const risk =
    r["RA Level"] ||
    r["RA Rate"] ||
    r.Severity ||
    r.Likelihood ||
    "";

  // Use Report Status as status (Open / Closed / In Progress...)
  const status = r["Report Status"] || "";

  // Use Name (and fall back to ID if needed) as reporter
  const reporter = r.Name || r.ID || "";

  return {
    id: idx + 1,
    raw: r,
    dateStr,
    date,
    location,
    type,
    risk,
    status,
    reporter
  };
});


      observationsAll = mapped;
      observationsLoaded = true;
      updateObservationUI();
    })
    .catch(err => {
      console.error("Observations load error:", err);
      observationsAll = [];
      observationsLoaded = false;
      updateObservationUI("Error loading observations data.");
    });
}

function updateObservationUI(errorMsg) {
  const monthEl = document.getElementById("obsCountMonth");
  const openEl = document.getElementById("obsCountOpen");
  const closedEl = document.getElementById("obsCountClosed");
  const listEl = document.getElementById("observationsList");
  const emptyEl = document.getElementById("observationsEmptyState");
  const homeObs = document.getElementById("homeObservationsToday");
  const homeObsPeople = document.getElementById("homeObserversToday");
  const homeHigh = document.getElementById("homeHighRiskOpen");

  if (!listEl || !monthEl || !openEl || !closedEl) return;

  if (!observationsLoaded || !observationsAll.length) {
    monthEl.textContent = "--";
    openEl.textContent = "--";
    closedEl.textContent = "--";
    if (homeObs) homeObs.textContent = "--";
    if (homeObsPeople) homeObsPeople.textContent = "--";
    if (homeHigh) homeHigh.textContent = "--";

    listEl.innerHTML = "";
    if (emptyEl) {
      emptyEl.style.display = "block";
      if (errorMsg) {
        emptyEl.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <p>${errorMsg}</p>
        `;
      } else {
        emptyEl.innerHTML = `
          <i class="fas fa-database"></i>
          <p>No observations data loaded. Check OBSERVATIONS_SHEET_CSV_URL in js/data.js.</p>
        `;
      }
    }
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthObs = observationsAll.filter(o => o.date && o.date >= firstOfMonth);
  const openObs = observationsAll.filter(o =>
    String(o.status).toLowerCase().includes("open")
  );
  const closedObs = observationsAll.filter(o =>
    String(o.status).toLowerCase().includes("closed")
  );

  monthEl.textContent = monthObs.length;
  openEl.textContent = openObs.length;
  closedEl.textContent = closedObs.length;

  // Home KPIs
  const today = startOfDay(now);
  const todayObs = observationsAll.filter(
    o => o.date && isSameDay(o.date, today)
  );
  const peopleSet = new Set(
    todayObs
      .map(o => o.reporter)
      .filter(Boolean)
  );
  const highRiskOpen = observationsAll.filter(
    o =>
      String(o.risk).toLowerCase().includes("high") &&
      String(o.status).toLowerCase().includes("open")
  );

  if (homeObs) homeObs.textContent = todayObs.length;
  if (homeObsPeople) homeObsPeople.textContent = peopleSet.size;
  if (homeHigh) homeHigh.textContent = highRiskOpen.length;

  renderObservationList();
}

function initObservationFiltersUI() {
  const rangeButtons = document.querySelectorAll(".obs-filter-chip");
  rangeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      rangeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      obsFilters.range = btn.getAttribute("data-range") || "today";
      renderObservationList();
    });
  });

  const riskSel = document.getElementById("obsFilterRisk");
  const statusSel = document.getElementById("obsFilterStatus");
  const searchEl = document.getElementById("obsSearch");

  if (riskSel) {
    riskSel.addEventListener("change", () => {
      obsFilters.risk = riskSel.value;
      renderObservationList();
    });
  }
  if (statusSel) {
    statusSel.addEventListener("change", () => {
      obsFilters.status = statusSel.value;
      renderObservationList();
    });
  }
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      obsFilters.search = searchEl.value;
      renderObservationList();
    });
  }

  const openSheetBtn = document.getElementById("openSheetButton");
  if (openSheetBtn) {
    openSheetBtn.addEventListener("click", () => {
      if (FULL_SHEET_URL && FULL_SHEET_URL.startsWith("http")) {
        window.open(FULL_SHEET_URL, "_blank");
      } else {
        alert("Please configure OBSERVATIONS_FULL_SHEET_URL in js/data.js");
      }
    });
  }
}

function applyObservationFilters() {
  let list = observationsAll.slice();
  const now = new Date();
  const todayStart = startOfDay(now);

  if (obsFilters.range === "today") {
    list = list.filter(o => o.date && isSameDay(o.date, todayStart));
  } else if (obsFilters.range === "week") {
    const from = daysAgo(7);
    list = list.filter(o => o.date && o.date >= from);
  } else if (obsFilters.range === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    list = list.filter(o => o.date && o.date >= first);
  }

  if (obsFilters.risk) {
    const r = obsFilters.risk.toLowerCase();
    list = list.filter(o => String(o.risk).toLowerCase().includes(r));
  }
  if (obsFilters.status) {
    const s = obsFilters.status.toLowerCase();
    list = list.filter(o => String(o.status).toLowerCase().includes(s));
  }

  if (obsFilters.search) {
    const q = obsFilters.search.toLowerCase();
    list = list.filter(o => {
      return (
        String(o.location).toLowerCase().includes(q) ||
        String(o.type).toLowerCase().includes(q) ||
        String(o.reporter).toLowerCase().includes(q)
      );
    });
  }

  return list;
}

function renderObservationList() {
  const listEl = document.getElementById("observationsList");
  if (!listEl) return;
  const tableExisting = document.querySelector(".obs-table");
  if (tableExisting && tableExisting.parentElement === listEl) {
    tableExisting.remove();
  }

  const filtered = applyObservationFilters();

  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="obs-empty-state">
        <i class="fas fa-info-circle"></i>
        <p>No observations match the selected filters.</p>
      </div>
    `;
    return;
  }

  // Desktop table
  const table = document.createElement("table");
  table.className = "obs-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Location</th>
        <th>Type</th>
        <th>Risk</th>
        <th>Status</th>
        <th>Reporter</th>
      </tr>
    </thead>
    <tbody>
      ${filtered
        .map(
          o => `
          <tr>
            <td>${o.dateStr || ""}</td>
            <td>${o.location || ""}</td>
            <td>${o.type || ""}</td>
            <td>${o.risk || ""}</td>
            <td>${o.status || ""}</td>
            <td>${o.reporter || ""}</td>
          </tr>
        `
        )
        .join("")}
    </tbody>
  `;
  listEl.innerHTML = "";
  listEl.appendChild(table);

  // Mobile cards
  filtered.forEach(o => {
    const card = document.createElement("div");
    card.className = "obs-card";

    const riskLower = String(o.risk).toLowerCase();
    let riskClass = "obs-badge-risk-low";
    if (riskLower.includes("high")) riskClass = "obs-badge-risk-high";
    else if (riskLower.includes("med")) riskClass = "obs-badge-risk-medium";

    const statusLower = String(o.status).toLowerCase();
    let statusClass = "obs-badge-status-open";
    if (statusLower.includes("clos"))
      statusClass = "obs-badge-status-closed";
    else if (statusLower.includes("prog"))
      statusClass = "obs-badge-status-inprogress";

    card.innerHTML = `
      <div class="obs-card-header">
        <div class="obs-card-title">${o.location || "No location"}</div>
        <div>
          <span class="obs-card-badge ${riskClass}">${o.risk || "N/A"}</span>
          <span class="obs-card-badge ${statusClass}">${o.status || ""}</span>
        </div>
      </div>
      <div class="obs-card-body">
        <div><strong>Date:</strong> ${o.dateStr || ""}</div>
        <div><strong>Type:</strong> ${o.type || ""}</div>
      </div>
      <div class="obs-card-footer">
        <span><i class="fas fa-user"></i> ${o.reporter || "Unknown"}</span>
      </div>
    `;
    listEl.appendChild(card);
  });
}

// =========================
//  NEWS
// =========================

function loadNews() {
  const container = document.getElementById("AnnouncementsContainer");
  const loading = document.getElementById("newsLoading");
  if (!container) return;

  if (!NEWS_CSV_URL || !NEWS_CSV_URL.startsWith("http")) {
    if (loading) loading.remove();
    container.innerHTML = `
      <div class="obs-empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <p>Configure NEWS_SHEET_CSV_URL in js/data.js to load news.</p>
      </div>
    `;
    return;
  }

  fetch(NEWS_CSV_URL)
    .then(res => res.text())
    .then(text => {
      if (loading) loading.remove();
      const rows = parseCsv(text);
      if (!rows.length) {
        container.innerHTML = `
          <div class="obs-empty-state">
            <i class="fas fa-info-circle"></i>
            <p>No news records found.</p>
          </div>
        `;
        return;
      }

      const cards = rows
        .map(row => {
          const title = row.Title || row.Subject || "Announcement";
          const body = row.Body || row.Message || row.Description || "";
          const date = row.Date || "";
          const pinned = (row.Pinned || "").toLowerCase() === "yes";
          const category = row.Category || "";
          const badge = category
            ? `<span style="font-size:11px; padding:3px 7px; border-radius:999px; background-color:rgba(23,162,184,0.12); color:#17a2b8; margin-left:6px;">${category}</span>`
            : "";

          return `
          <div class="announcement-card" data-pinned="${pinned ? "true" : "false"}">
            <div class="card-title">
              <span>
                <i class="fas fa-bullhorn"></i> ${title}
                ${badge}
              </span>
              <span class="toggle-icon"><i class="fas fa-chevron-down"></i></span>
            </div>
            ${date ? `<div class="card-date">${date}</div>` : ""}
            <div class="card-content">
              ${body.replace(/\n/g, "<br>")}
            </div>
          </div>
        `;
        })
        .join("");

      container.innerHTML = cards;

      const allCards = Array.from(
        container.querySelectorAll(".announcement-card")
      );
      const pinnedCards = allCards.filter(
        c => c.getAttribute("data-pinned") === "true"
      );
      if (pinnedCards.length) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `
          <h3 style="font-family:'Poppins',sans-serif; font-size:14px; margin:6px 4px;">🔝 Important Now</h3>
        `;
        pinnedCards.forEach(c => wrapper.appendChild(c));
        container.prepend(wrapper);
      }

      container.querySelectorAll(".announcement-card").forEach(card => {
        const titleDiv = card.querySelector(".card-title");
        const content = card.querySelector(".card-content");
        if (!titleDiv || !content) return;
        content.style.display = "none";
        titleDiv.addEventListener("click", () => {
          const isOpen = content.style.display === "block";
          content.style.display = isOpen ? "none" : "block";
          const icon = titleDiv.querySelector(".toggle-icon i");
          if (icon) {
            icon.classList.toggle("fa-chevron-down", isOpen);
            icon.classList.toggle("fa-chevron-up", !isOpen);
          }
        });
      });
    })
    .catch(err => {
      console.error("News load error:", err);
      if (loading) loading.remove();
      container.innerHTML = `
        <div class="obs-empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Failed to fetch news from the sheet.</p>
        </div>
      `;
    });
}

// =========================
//  GPS LOCATION
// =========================

function getGPSLocation() {
  const resEl = document.getElementById("locationResult");
  if (!navigator.geolocation) {
    if (resEl) resEl.textContent = "Geolocation is not supported.";
    return;
  }
  if (resEl) {
    resEl.textContent = "Locating...";
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
      if (resEl) {
        resEl.innerHTML = `
          <strong>Location captured:</strong><br>
          Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}<br>
          <a href="${link}" target="_blank">Open in Google Maps</a>
        `;
      }
    },
    err => {
      console.error("GPS error:", err);
      if (resEl) resEl.textContent = "Unable to get location.";
    }
  );
}

// =========================
//  INIT
// =========================

document.addEventListener("DOMContentLoaded", () => {
  // 1) Read all config from data.js
  initConfigFromWindow();

  // 2) Apply saved theme
  applySavedTheme();

  // 3) Ensure Home tab marked active
  const defaultTabBtn = document.querySelector(
    '.nav-button[data-color][onclick*="HomeTab"]'
  );
  if (defaultTabBtn) {
    defaultTabBtn.classList.add("active");
    defaultTabBtn.setAttribute("aria-selected", "true");
  }

  // 4) Proper iframe & button URLs (override placeholder in HTML)
  const tasksIframe = document.getElementById("tasksIframe");
  if (tasksIframe && TASKS_URL) {
    tasksIframe.src = TASKS_URL;
  }
  const addObsBtn = document.getElementById("addObservationButton");
  if (addObsBtn && ADD_OBS_URL) {
    addObsBtn.href = ADD_OBS_URL;
  }

  // 5) Month color
  setMonthColor();

  // 6) Accordions
  initAccordions();

  // 7) EOM + leaderboard
  loadEomAndLeaderboard();

  // 8) TBT
  renderTbtOfTheDay();
  renderTbtLibrary();

  // 9) JSA
  renderJSAList();
  const jsaSearch = document.getElementById("jsaSearch");
  if (jsaSearch) {
    jsaSearch.addEventListener("input", filterJSAList);
  }

  // 10) KPIs
  renderKPIs();

  // 11) Tools default
  switchTool("kpi");

  // 12) Observations
  initObservationFiltersUI();
  loadObservations();

  // 13) News
  loadNews();
});
