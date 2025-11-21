// =============================
//  CONFIG – EDIT THESE URLS 👇
// =============================

// 🏅 Employee of Month + Leaderboard sheet (CSV export URL)
const EOM_CSV_URL = ""; // TODO: paste your existing EOM/Leaderboard CSV URL here

// 📰 News / Announcements sheet (CSV export URL)
const NEWS_CSV_URL = ""; // TODO: paste your existing News CSV URL here

// 📊 Observations / Safety Data sheet (CSV export URL)
const OBS_CSV_URL = ""; // TODO: paste your observations sheet CSV URL here

// 🔗 Full observations sheet view URL (for "Open full data sheet" button)
const FULL_SHEET_URL = ""; // TODO: paste the normal Google Sheet link here (not CSV)


// =============================
//  SIMPLE DATA SETS (PLACEHOLDERS)
//  👉 Replace/extend from your old index.html if needed
// =============================

// 🔹 Toolbox Talk of the Day list (TBT)
// NOTE: This is only a SAMPLE. Replace with your full list from your old file.
const tbtData = [
  {
    title: "Alcohol and Drugs",
    link: "https://example.com/tbt-alcohol-drugs"
  },
  {
    title: "Working at Height",
    link: "https://example.com/tbt-working-at-height"
  },
  {
    title: "Manual Handling",
    link: "https://example.com/tbt-manual-handling"
  },
  {
    title: "Driving Safety",
    link: "https://example.com/tbt-driving"
  }
  // TODO: Paste the rest of your real TBT list here
];

// 🔹 JSA Library list
// NOTE: SAMPLE ONLY – replace with your full JSA list (title + link) from old file.
const jsaData = [
  {
    title: "Abrasive Blasting and Coating",
    link: "https://example.com/jsa-abrasive-blasting"
  },
  {
    title: "Backfilling, Levelling and Compaction",
    link: "https://example.com/jsa-backfilling"
  },
  {
    title: "Excavation and Trenching",
    link: "https://example.com/jsa-excavation"
  },
  {
    title: "Lifting Operations with Mobile Crane",
    link: "https://example.com/jsa-crane-lifting"
  }
  // TODO: Paste your complete JSA array here
];


// =============================
//  KPI CONFIGURATION
// =============================

// Simple KPI configuration (based on typical Aramco-style KPIs)
const KPI_CONFIG = [
  {
    id: "kpi_trir",
    category: "Lagging",
    name: "Total Recordable Injury Rate (TRIR)",
    formula: "rate_200k", // (recordable / hours) * 200000
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


// =============================
//  STATE
// =============================

let leaderboardData = [];
let observationsAll = [];
let observationsLoaded = false;

const obsFilters = {
  range: "today",
  risk: "",
  status: "",
  search: ""
};


// =============================
//  UTILITY FUNCTIONS
// =============================

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1)
    .filter(l => l.trim().length > 0)
    .map(line => {
      const cols = line.split(","); // simple split (OK if your sheet doesn't use commas inside values)
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
  // Try native Date
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Try DD/MM/YYYY or DD-MM-YYYY
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
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysAgo(num) {
  const d = new Date();
  d.setDate(d.getDate() - num);
  return startOfDay(d);
}


// =============================
//  THEME / DARK MODE
// =============================

function applySavedTheme() {
  const saved = localStorage.getItem("theme");
  const body = document.body;
  const modeIcon = document.getElementById("modeIcon");
  if (saved === "dark") {
    body.classList.add("dark-mode");
    if (modeIcon) {
      modeIcon.classList.remove("fa-sun");
      modeIcon.classList.add("fa-moon");
    }
  } else {
    body.classList.remove("dark-mode");
    if (modeIcon) {
      modeIcon.classList.remove("fa-moon");
      modeIcon.classList.add("fa-sun");
    }
  }
}

function toggleDarkMode() {
  const body = document.body;
  const modeIcon = document.getElementById("modeIcon");
  const isDark = body.classList.toggle("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  if (modeIcon) {
    if (isDark) {
      modeIcon.classList.remove("fa-sun");
      modeIcon.classList.add("fa-moon");
    } else {
      modeIcon.classList.remove("fa-moon");
      modeIcon.classList.add("fa-sun");
    }
  }
}


// =============================
//  NAVIGATION / TABS
// =============================

function openTab(evt, tabName) {
  // Hide all tab contents
  const tabcontent = document.querySelectorAll(".tab-content");
  tabcontent.forEach(tc => tc.classList.remove("active"));

  // Show selected tab
  const targetTab = document.getElementById(tabName);
  if (targetTab) {
    targetTab.classList.add("active");
  }

  // Handle nav button active state & colors
  const navButtons = document.querySelectorAll(".nav-button");
  navButtons.forEach(btn => {
    btn.classList.remove("active");
    btn.style.color = ""; // reset to CSS default
  });

  if (evt && evt.currentTarget) {
    const btn = evt.currentTarget;
    btn.classList.add("active");
    const color = btn.getAttribute("data-color") || "var(--primary-color)";
    btn.style.color = color;
  }

  // Optional: scroll content to top when switching tabs
  const contentArea = document.querySelector(".content-area");
  if (contentArea) contentArea.scrollTop = 0;
}


// =============================
//  ACCORDIONS
// =============================

function initAccordions() {
  const accordions = document.querySelectorAll(".accordion");
  accordions.forEach(acc => {
    const hasCustomOnClick = acc.getAttribute("onclick");
    const id = acc.id;

    // Skip ones that only trigger modals (we already wired them inline in HTML)
    if (hasCustomOnClick && (id === "emergencyAccordion" || acc.innerHTML.includes("Monthly Leaderboard"))) {
      return;
    }

    acc.addEventListener("click", function () {
      this.classList.toggle("activeAcc");

      // Close other accordions in the same section (optional)
      accordions.forEach(other => {
        if (other !== this && !other.getAttribute("onclick")) {
          other.classList.remove("activeAcc");
          const op = other.nextElementSibling;
          if (op && op.classList.contains("panel")) {
            op.style.display = "none";
          }
        }
      });

      const panel = this.nextElementSibling;
      if (panel && panel.classList.contains("panel")) {
        panel.style.display = (panel.style.display === "block") ? "none" : "block";
      }
    });
  });
}


// =============================
//  MODALS (Leaderboard, Emergency, JSA confirm)
// =============================

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

function showJSAConfirmationModal(link) {
  const modal = document.getElementById("jsaConfirmationModal");
  const confirmLink = document.getElementById("driveLinkConfirm");
  if (confirmLink) {
    confirmLink.href = link;
  }
  if (modal) modal.style.display = "block";
}

function hideJSAConfirmationModal() {
  const modal = document.getElementById("jsaConfirmationModal");
  if (modal) modal.style.display = "none";
}


// =============================
//  EMPLOYEE OF MONTH + LEADERBOARD
// =============================

function loadEomAndLeaderboard() {
  const eomEl = document.getElementById("employeeOfMonth");
  if (!EOM_CSV_URL) {
    if (eomEl) eomEl.textContent = "Set EOM_CSV_URL in app.js";
    // No URL, so also no leaderboard
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

      // Build leaderboard from the same sheet (you can change this if you use separate sheet)
      leaderboardData = rows
        .map(row => {
          const n =
            row.Name ||
            row.Employee ||
            row["Employee Name"] ||
            "";
          const points =
            toNumber(row.Points || row.Score || row["Total Points"] || 0);
          return n ? { name: n, points } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.points - a.points);

      renderHomeLeaderboardMini();
    })
    .catch(err => {
      console.error("Error loading EOM/leaderboard:", err);
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
      '<div style="font-size:12px; color:var(--text-muted);">No leaderboard data. Check EOM_CSV_URL.</div>';
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

  const rowsHtml = leaderboardData
    .map((p, idx) => {
      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1;
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
        ${rowsHtml}
      </tbody>
    </table>
  `;
}


// =============================
//  TBT OF THE DAY
// =============================

function getTodayTbt() {
  if (!tbtData.length) return null;
  const today = new Date();
  // simple deterministic index based on date
  const index =
    (today.getFullYear() * 366 +
      today.getMonth() * 31 +
      today.getDate()) % tbtData.length;
  return tbtData[index];
}

function renderTbtOfTheDay() {
  const homeEl = document.getElementById("homeTbtContent");
  const panelEl = document.getElementById("tbtPanel");

  const tbt = getTodayTbt();
  if (!tbt) {
    if (homeEl) homeEl.textContent = "No TBT data configured.";
    if (panelEl) panelEl.innerHTML =
      "<p>No Toolbox Talk data. Add items to tbtData in app.js.</p>";
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
      <p><strong>Today's TBT:</strong> ${tbt.title}</p>
      <p><a href="${tbt.link}" target="_blank">📎 Open Toolbox Talk Document</a></p>
      <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">
        This TBT is selected from your configured <code>tbtData</code> based on today's date.
      </p>
    `;
  }
}


// =============================
//  JSA LIBRARY
// =============================

function renderJsaList(filterText = "") {
  const container = document.getElementById("jsaListContainer");
  if (!container) return;

  const q = filterText.trim().toLowerCase();
  const items = jsaData.filter(j =>
    j.title.toLowerCase().includes(q)
  );

  if (!items.length) {
    container.innerHTML =
      '<div class="obs-empty-state"><i class="fas fa-file-alt"></i><p>No JSA found for this search.</p></div>';
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
            Click the button below to open the JSA in Google Drive.
          </p>
          <button class="gps-btn" onclick="showJSAConfirmationModal('${jsa.link}')">
            ✅ Open JSA in Google Drive
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Attach click handlers to new JSA accordions
  const jsaAccs = container.querySelectorAll(".jsa-accordion-item");
  jsaAccs.forEach(btn => {
    btn.addEventListener("click", function () {
      const panelId = this.getAttribute("data-panel-id");
      const panel = document.getElementById(panelId);
      const isOpen = panel && panel.style.display === "block";

      // Close all
      jsaAccs.forEach(other => {
        const pid = other.getAttribute("data-panel-id");
        const p = document.getElementById(pid);
        if (p) p.style.display = "none";
        other.classList.remove("activeAcc");
      });

      if (!isOpen && panel) {
        this.classList.add("activeAcc");
        panel.style.display = "block";
      }
    });
  });
}


// =============================
//  HEAT STRESS CALCULATOR
// =============================

function calculateHeatIndex() {
  const tInput = document.getElementById("inputTemp");
  const hInput = document.getElementById("inputHumidity");
  const card = document.getElementById("heatIndexResultCard");
  const valEl = document.getElementById("heatIndexValue");
  const lvlEl = document.getElementById("heatRiskLevel");
  const listEl = document.getElementById("heatRecommendationsList");
  const homeHeat = document.getElementById("homeHeatSummary");

  if (!tInput || !hInput || !card || !valEl || !lvlEl || !listEl) return;

  const tC = parseFloat(tInput.value);
  const rh = parseFloat(hInput.value);

  if (isNaN(tC) || isNaN(rh)) {
    card.style.display = "none";
    if (homeHeat) homeHeat.textContent = "--";
    return;
  }

  // Convert °C to °F
  const tF = (tC * 9) / 5 + 32;

  // NOAA heat index formula (simplified)
  const hi =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * rh -
    0.22475541 * tF * rh -
    0.00683783 * tF * tF -
    0.05481717 * rh * rh +
    0.00122874 * tF * tF * rh +
    0.00085282 * tF * rh * rh -
    0.00000199 * tF * tF * rh * rh;

  const hiC = ((hi - 32) * 5) / 9;
  const hiRounded = Math.round(hiC);

  let level = "";
  let bg = "";
  let recs = [];

  if (hiC < 27) {
    level = "Caution (Low)";
    bg = "#27ae60";
    recs = [
      "Maintain normal hydration.",
      "Encourage regular short breaks in shade.",
      "Continue monitoring weather conditions."
    ];
  } else if (hiC < 32) {
    level = "Caution";
    bg = "#f1c40f";
    recs = [
      "Increase water intake (small amounts frequently).",
      "Plan extra breaks in shaded/cool areas.",
      "Monitor new/returning workers closely."
    ];
  } else if (hiC < 41) {
    level = "Extreme Caution";
    bg = "#e67e22";
    recs = [
      "Implement work/rest schedule.",
      "Enforce hydration plan and buddy system.",
      "Limit heavy work during peak heat hours."
    ];
  } else {
    level = "Danger";
    bg = "#c0392b";
    recs = [
      "Stop or postpone non-essential work.",
      "Only critical tasks with full controls and supervision.",
      "Immediate access to cooling, water, and medical support."
    ];
  }

  card.style.display = "block";
  card.style.backgroundColor = bg;
  valEl.textContent = `${hiRounded}°C`;
  lvlEl.textContent = level;

  listEl.innerHTML = recs.map(r => `<li>${r}</li>`).join("");

  if (homeHeat) {
    homeHeat.textContent = `${hiRounded}°C – ${level}`;
  }
}


// =============================
//  WIND SPEED CALCULATOR
// =============================

function calculateWindSafety() {
  const wInput = document.getElementById("inputWind");
  const card = document.getElementById("windSpeedResultCard");
  const valEl = document.getElementById("windValue");
  const lvlEl = document.getElementById("windRiskLevel");
  const listEl = document.getElementById("windRecommendationsList");
  const homeWind = document.getElementById("homeWindSummary");

  if (!wInput || !card || !valEl || !lvlEl || !listEl) return;

  const w = parseFloat(wInput.value);
  if (isNaN(w)) {
    card.style.display = "none";
    if (homeWind) homeWind.textContent = "--";
    return;
  }

  let level = "";
  let bg = "";
  let recs = [];

  if (w < 20) {
    level = "Safe for normal operations";
    bg = "#27ae60";
    recs = [
      "Normal crane and lifting operations allowed.",
      "Monitor gusts and update readings regularly."
    ];
  } else if (w < 38) {
    level = "Caution – Monitor closely";
    bg = "#f1c40f";
    recs = [
      "Review lift plans and crane charts.",
      "Avoid large-sail-area loads where possible.",
      "Increase communication between signalman and operator."
    ];
  } else if (w < 50) {
    level = "Restrictions required";
    bg = "#e67e22";
    recs = [
      "Stop man-basket and non-critical lifts.",
      "Secure loads and equipment.",
      "Follow specific CSM limits for your cranes."
    ];
  } else {
    level = "STOP lifting operations";
    bg = "#c0392b";
    recs = [
      "Suspend all crane lifting operations.",
      "Secure crane booms and site materials.",
      "Resume only when wind speed returns to safe limits."
    ];
  }

  card.style.display = "block";
  card.style.backgroundColor = bg;
  valEl.textContent = `${w.toFixed(1)} km/h`;
  lvlEl.textContent = level;
  listEl.innerHTML = recs.map(r => `<li>${r}</li>`).join("");

  if (homeWind) {
    homeWind.textContent = `${w.toFixed(1)} km/h – ${level}`;
  }
}


// =============================
//  TOOLS TAB SWITCHING (KPI / HEAT / WIND)
// =============================

function switchTool(tool) {
  const kpiSection = document.getElementById("kpiSection");
  const heatSection = document.getElementById("heatStressSection");
  const windSection = document.getElementById("windSpeedSection");

  const buttons = document.querySelectorAll(".tool-toggle-btn");
  buttons.forEach(btn => {
    btn.classList.remove("active-tool");
  });

  if (tool === "kpi") {
    if (kpiSection) kpiSection.style.display = "block";
    if (heatSection) heatSection.style.display = "none";
    if (windSection) windSection.style.display = "none";
  } else if (tool === "heat") {
    if (kpiSection) kpiSection.style.display = "none";
    if (heatSection) heatSection.style.display = "block";
    if (windSection) windSection.style.display = "none";
  } else if (tool === "wind") {
    if (kpiSection) kpiSection.style.display = "none";
    if (heatSection) heatSection.style.display = "none";
    if (windSection) windSection.style.display = "block";
  }

  const activeBtn = document.querySelector(`.tool-toggle-btn[data-tool="${tool}"]`);
  if (activeBtn) activeBtn.classList.add("active-tool");
}


// =============================
//  KPI RENDER + CALC
// =============================

function renderKPIs() {
  const container = document.getElementById("kpiListContainer");
  if (!container) return;

  let html = "";
  KPI_CONFIG.forEach(kpi => {
    const badgeClass = kpi.category === "Leading" ? "leading" : "lagging";
    html += `
      <div class="kpi-card" data-kpi-id="${kpi.id}">
        <div class="kpi-header">
          <h4 class="kpi-title">${kpi.name}</h4>
          <span class="kpi-badge ${badgeClass}">${kpi.category}</span>
        </div>
        <div class="kpi-inputs">
          ${kpi.inputs.map(inp => `
            <div class="kpi-input-group">
              <label>${inp.label}</label>
              <input type="number" step="any" class="kpi-input-field" data-input-name="${inp.name}" placeholder="0">
            </div>
          `).join("")}
        </div>
        <div class="kpi-footer">
          <div class="kpi-result-box">
            <div class="kpi-result-label">RESULT</div>
            <div class="kpi-result-value" data-kpi-result="value">--</div>
          </div>
          <div class="kpi-result-box">
            <div class="kpi-result-label">TARGET</div>
            <div class="kpi-result-value">${kpi.targetStr}</div>
          </div>
        </div>
        <div class="kpi-citation">
          ${kpi.source}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Attach input listeners
  KPI_CONFIG.forEach(kpi => {
    const card = container.querySelector(`.kpi-card[data-kpi-id="${kpi.id}"]`);
    if (!card) return;
    const inputs = card.querySelectorAll(".kpi-input-field");
    inputs.forEach(inp => {
      inp.addEventListener("input", () => {
        calculateKpi(kpi, card);
      });
    });
  });
}

function calculateKpi(kpi, card) {
  const inputs = {};
  kpi.inputs.forEach(inp => {
    const el = card.querySelector(`.kpi-input-field[data-input-name="${inp.name}"]`);
    inputs[inp.name] = toNumber(el && el.value);
  });

  let result = 0;

  if (kpi.formula === "rate_200k") {
    const num = inputs.recordable || inputs.lti || 0;
    const hours = inputs.hours || 0;
    result = hours > 0 ? (num / hours) * 200000 : 0;
  } else if (kpi.formula === "rate_1m") {
    const mva = inputs.mva || 0;
    const km = inputs.km || 0;
    result = km > 0 ? (mva / km) * 1000000 : 0;
  } else if (kpi.formula === "percentage") {
    const pass = inputs.pass || 0;
    const total = inputs.total || 0;
    result = total > 0 ? (pass / total) * 100 : 0;
  }

  const display = card.querySelector('[data-kpi-result="value"]');
  if (!display) return;

  const valueRounded =
    kpi.formula === "percentage" ? result.toFixed(1) + "%" : result.toFixed(2);

  display.textContent = valueRounded;

  // Target coloring
  const v = result;
  const target = kpi.targetVal;
  const type = kpi.targetType; // "max" or "min"

  display.classList.remove("text-good", "text-bad", "text-neutral");

  if (type === "max") {
    // Lower is better
    if (v <= target) {
      display.classList.add("text-good");
    } else {
      display.classList.add("text-bad");
    }
  } else {
    // Higher is better
    if (v >= target) {
      display.classList.add("text-good");
    } else {
      display.classList.add("text-bad");
    }
  }
}


// =============================
//  OBSERVATIONS TAB
// =============================

function initObservations() {
  const emptyState = document.getElementById("observationsEmptyState");
  const openSheetBtn = document.getElementById("openSheetButton");

  if (openSheetBtn) {
    if (FULL_SHEET_URL) {
      openSheetBtn.style.display = "block";
      openSheetBtn.addEventListener("click", () => {
        window.open(FULL_SHEET_URL, "_blank");
      });
    } else {
      openSheetBtn.style.display = "none";
    }
  }

  if (!OBS_CSV_URL) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  fetch(OBS_CSV_URL)
    .then(res => res.text())
    .then(text => {
      const rows = parseCsv(text);
      observationsAll = rows.map(row => {
        const dateStr =
          row.Date ||
          row.date ||
          row["Observation Date"] ||
          row["Date of Observation"] ||
          "";
        const location =
          row.Location ||
          row.Area ||
          row["Work Location"] ||
          "";
        const type =
          row.Type ||
          row["Observation Type"] ||
          row.Category ||
          "";
        const risk =
          row.Risk ||
          row["Risk Level"] ||
          "";
        const status =
          row.Status ||
          row["Action Status"] ||
          "";
        const reporter =
          row.Reporter ||
          row["Observer"] ||
          row["Reported By"] ||
          "";
        const id =
          row.ID ||
          row.Id ||
          row["Ref"] ||
          "";

        return {
          raw: row,
          dateStr,
          date: parseObsDate(dateStr),
          location,
          type,
          risk,
          status,
          reporter,
          id
        };
      });

      observationsLoaded = true;
      if (emptyState) emptyState.style.display = "none";
      applyObservationFilters();
    })
    .catch(err => {
      console.error("Error loading observations:", err);
      if (emptyState) emptyState.style.display = "block";
    });
}

function applyObservationFilters() {
  const listEl = document.getElementById("observationsList");
  const emptyState = document.getElementById("observationsEmptyState");
  const countMonthEl = document.getElementById("obsCountMonth");
  const countOpenEl = document.getElementById("obsCountOpen");
  const countClosedEl = document.getElementById("obsCountClosed");

  const homeObserversEl = document.getElementById("homeObserversToday");
  const homeObsTodayEl = document.getElementById("homeObservationsToday");
  const homeHighRiskEl = document.getElementById("homeHighRiskOpen");

  if (!listEl) return;

  if (!observationsLoaded || !observationsAll.length) {
    listEl.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    if (countMonthEl) countMonthEl.textContent = "--";
    if (countOpenEl) countOpenEl.textContent = "--";
    if (countClosedEl) countClosedEl.textContent = "--";
    if (homeObserversEl) homeObserversEl.textContent = "--";
    if (homeObsTodayEl) homeObsTodayEl.textContent = "--";
    if (homeHighRiskEl) homeHighRiskEl.textContent = "--";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  const now = new Date();
  const todayStart = startOfDay(now);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Stats for summary bar
  let countMonth = 0;
  let countOpen = 0;
  let countClosed = 0;

  observationsAll.forEach(o => {
    if (o.date && o.date >= thisMonthStart) {
      countMonth++;
    }
    if ((o.status || "").toLowerCase().includes("open")) {
      countOpen++;
    }
    if ((o.status || "").toLowerCase().includes("closed")) {
      countClosed++;
    }
  });

  if (countMonthEl) countMonthEl.textContent = String(countMonth);
  if (countOpenEl) countOpenEl.textContent = String(countOpen);
  if (countClosedEl) countClosedEl.textContent = String(countClosed);

  // Filter by range
  const filtered = observationsAll.filter(o => {
    if (!o.date) return false;

    let passRange = true;
    if (obsFilters.range === "today") {
      passRange = isSameDay(o.date, todayStart);
    } else if (obsFilters.range === "week") {
      const weekStart = daysAgo(6); // last 7 days including today
      passRange = o.date >= weekStart;
    } else if (obsFilters.range === "month") {
      passRange = o.date >= thisMonthStart;
    }

    if (!passRange) return false;

    // Risk
    if (obsFilters.risk) {
      const r = (o.risk || "").toLowerCase();
      const target = obsFilters.risk.toLowerCase();
      if (!r.includes(target)) return false;
    }

    // Status
    if (obsFilters.status) {
      const s = (o.status || "").toLowerCase();
      const target = obsFilters.status.toLowerCase();
      if (!s.includes(target)) return false;
    }

    // Search
    if (obsFilters.search) {
      const q = obsFilters.search.toLowerCase();
      const text = [
        o.location,
        o.type,
        o.reporter,
        o.id,
        o.dateStr
      ]
        .join(" ")
        .toLowerCase();
      if (!text.includes(q)) return false;
    }

    return true;
  });

  // HOME DASHBOARD TODAY COUNTS
  const todayObs = observationsAll.filter(
    o => o.date && isSameDay(o.date, todayStart)
  );
  const uniqueObservers = new Set(
    todayObs.map(o => o.reporter || "").filter(Boolean)
  );
  const highRiskOpen = todayObs.filter(o => {
    const r = (o.risk || "").toLowerCase();
    const s = (o.status || "").toLowerCase();
    return r.includes("high") && (!s || s.includes("open"));
  });

  if (homeObserversEl) homeObserversEl.textContent = String(uniqueObservers.size);
  if (homeObsTodayEl) homeObsTodayEl.textContent = String(todayObs.length);
  if (homeHighRiskEl) homeHighRiskEl.textContent = String(highRiskOpen.length);

  // Render list (table + cards)
  if (!filtered.length) {
    listEl.innerHTML =
      '<div class="obs-empty-state"><i class="fas fa-database"></i><p>No observations found for these filters.</p></div>';
    return;
  }

  // Table (desktop)
  const tableHead = `
    <table class="obs-table">
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
  `;
  const tableRows = filtered
    .map(o => {
      return `
        <tr>
          <td>${o.dateStr}</td>
          <td>${o.location}</td>
          <td>${o.type}</td>
          <td>${o.risk}</td>
          <td>${o.status}</td>
          <td>${o.reporter}</td>
        </tr>
      `;
    })
    .join("");
  const tableEnd = `</tbody></table>`;

  // Cards (mobile)
  const cards = filtered
    .map(o => {
      const riskClass =
        (o.risk || "").toLowerCase().includes("high")
          ? "obs-badge-risk-high"
          : (o.risk || "").toLowerCase().includes("medium")
          ? "obs-badge-risk-medium"
          : "obs-badge-risk-low";
      let statusClass = "obs-badge-status-inprogress";
      const s = (o.status || "").toLowerCase();
      if (s.includes("open")) statusClass = "obs-badge-status-open";
      if (s.includes("closed")) statusClass = "obs-badge-status-closed";

      return `
        <div class="obs-card">
          <div class="obs-card-header">
            <div class="obs-card-title">
              ${o.type || "Observation"}
            </div>
            <div>
              <span class="obs-card-badge ${riskClass}">${o.risk || "Risk N/A"}</span>
              <span class="obs-card-badge ${statusClass}" style="margin-left:4px;">${o.status || "Status N/A"}</span>
            </div>
          </div>
          <div class="obs-card-body">
            <div><strong>Location:</strong> ${o.location || "-"}</div>
            <div><strong>Reporter:</strong> ${o.reporter || "-"}</div>
          </div>
          <div class="obs-card-footer">
            <span>${o.dateStr || ""}</span>
            <span>${o.id || ""}</span>
          </div>
        </div>
      `;
    })
    .join("");

  listEl.innerHTML = tableHead + tableRows + tableEnd + cards;
}

function initObservationFiltersUI() {
  // Range chips
  const chips = document.querySelectorAll(".obs-filter-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const range = chip.getAttribute("data-range") || "all";
      obsFilters.range = range;
      applyObservationFilters();
    });
  });

  const riskSel = document.getElementById("obsFilterRisk");
  const statusSel = document.getElementById("obsFilterStatus");
  const searchInp = document.getElementById("obsSearch");

  if (riskSel) {
    riskSel.addEventListener("change", () => {
      obsFilters.risk = riskSel.value;
      applyObservationFilters();
    });
  }

  if (statusSel) {
    statusSel.addEventListener("change", () => {
      obsFilters.status = statusSel.value;
      applyObservationFilters();
    });
  }

  if (searchInp) {
    searchInp.addEventListener("input", () => {
      obsFilters.search = searchInp.value;
      applyObservationFilters();
    });
  }
}


// =============================
//  NEWS / ANNOUNCEMENTS
// =============================

function loadNews() {
  const container = document.getElementById("AnnouncementsContainer");
  const loading = document.getElementById("newsLoading");

  if (!container) return;

  if (!NEWS_CSV_URL) {
    if (loading) loading.style.display = "none";
    container.innerHTML =
      '<div class="announcement-card"><div class="card-title" style="cursor:default;">Set NEWS_CSV_URL in app.js to enable News.</div></div>';
    return;
  }

  fetch(NEWS_CSV_URL)
    .then(res => res.text())
    .then(text => {
      if (loading) loading.style.display = "none";
      const rows = parseCsv(text);
      if (!rows.length) {
        container.innerHTML =
          '<div class="announcement-card"><div class="card-title" style="cursor:default;">No news available.</div></div>';
        return;
      }

      // Optional columns: Title, Date, Content, Category, Pinned, URL
      const pinned = [];
      const normal = [];

      rows.forEach(row => {
        const item = {
          title: row.Title || row.Subject || "Untitled",
          date: row.Date || "",
          content: row.Content || row.Body || "",
          category: row.Category || "",
          pinned:
            (row.Pinned || "").toLowerCase() === "yes" ||
            (row.Pinned || "").toLowerCase() === "true",
          url: row.URL || row.Link || ""
        };
        if (item.pinned) pinned.push(item);
        else normal.push(item);
      });

      const renderItem = item => {
        let catBadge = "";
        if (item.category) {
          let color = "var(--primary-color)";
          const cat = item.category.toLowerCase();
          if (cat.includes("alert")) color = "var(--danger-color)";
          else if (cat.includes("campaign")) color = "var(--success-color)";
          else if (cat.includes("training")) color = "var(--jsa-color)";
          else if (cat.includes("recognition")) color = "#FFD700";

          catBadge = `<span style="font-size:11px; padding:2px 8px; border-radius:12px; background-color:${color}; color:white; margin-left:6px;">${item.category}</span>`;
        }

        const hasUrl = !!item.url;

        return `
          <div class="announcement-card">
            <div class="card-date">${item.date}</div>
            <div class="card-title">
              ${item.title}${catBadge}
              <span class="toggle-icon"><i class="fas fa-chevron-down"></i></span>
            </div>
            <div class="card-content">
              <p>${item.content || ""}</p>
              ${
                hasUrl
                  ? `<p><a href="${item.url}" target="_blank">More details</a></p>`
                  : ""
              }
            </div>
          </div>
        `;
      };

      let html = "";
      if (pinned.length) {
        html += `<h3 style="margin-bottom:10px;">🔝 Important Now</h3>`;
        html += pinned.map(renderItem).join("");
        html += `<h3 style="margin:15px 0 10px 0;">All News</h3>`;
      }
      html += normal.map(renderItem).join("");

      container.innerHTML = html;

      // Toggle card content
      const cards = container.querySelectorAll(".announcement-card");
      cards.forEach(card => {
        const title = card.querySelector(".card-title");
        const content = card.querySelector(".card-content");
        const icon = card.querySelector(".toggle-icon i");

        if (title && content && icon) {
          title.addEventListener("click", () => {
            const isVisible = content.style.display === "block";
            if (isVisible) {
              content.style.display = "none";
              icon.classList.remove("fa-chevron-up");
              icon.classList.add("fa-chevron-down");
            } else {
              content.style.display = "block";
              icon.classList.remove("fa-chevron-down");
              icon.classList.add("fa-chevron-up");
            }
          });
        }
      });
    })
    .catch(err => {
      console.error("Error loading news:", err);
      if (loading) loading.style.display = "none";
      container.innerHTML = `
        <div class="announcement-card">
          <div class="card-date">Error</div>
          <div class="card-title" style="cursor:default;">Failed to fetch news</div>
          <div class="card-content" style="display:block; color:var(--danger-color);">
            Check the NEWS_CSV_URL or network connection.
          </div>
        </div>
      `;
    });
}


// =============================
//  GPS / LOCATION
// =============================

function getGPSLocation() {
  const result = document.getElementById("locationResult");
  if (!navigator.geolocation) {
    if (result) {
      result.textContent = "Geolocation is not supported on this device.";
    }
    return;
  }

  if (result) {
    result.textContent = "Getting your location...";
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      const url = `https://maps.google.com/?q=${latitude},${longitude}`;
      if (result) {
        result.innerHTML = `
          <div><strong>Latitude:</strong> ${latitude.toFixed(5)}</div>
          <div><strong>Longitude:</strong> ${longitude.toFixed(5)}</div>
          <div><a href="${url}" target="_blank">Open in Google Maps</a></div>
        `;
      }
    },
    error => {
      console.error(error);
      if (result) {
        result.textContent = "Unable to get location. Check permissions.";
      }
    }
  );
}


// =============================
//  MONTH COLOR (simple mapping)
// =============================

function setMonthColor() {
  const el = document.getElementById("colorName");
  if (!el) return;
  const month = new Date().getMonth(); // 0–11

  const colors = [
    "Red",       // Jan
    "Yellow",    // Feb
    "Green",     // Mar
    "Blue",      // Apr
    "Orange",    // May
    "Purple",    // Jun
    "Brown",     // Jul
    "Pink",      // Aug
    "Grey",      // Sep
    "Black",     // Oct
    "White",     // Nov
    "Gold"       // Dec
  ];
  el.textContent = colors[month] || "N/A";
}


// =============================
//  INIT
// =============================

document.addEventListener("DOMContentLoaded", () => {
  // Theme
  applySavedTheme();

  // Default tab: Home
  const defaultBtn = document.querySelector('.nav-button[onclick*="HomeTab"]');
  if (defaultBtn) {
    const evt = { currentTarget: defaultBtn };
    openTab(evt, "HomeTab");
  }

  // Accordions
  initAccordions();

  // Month color / EOM / Leaderboard
  setMonthColor();
  loadEomAndLeaderboard();

  // TBT
  renderTbtOfTheDay();

  // KPI + Tools
  renderKPIs();
  switchTool("kpi"); // default

  // JSA
  renderJsaList();
  const jsaSearch = document.getElementById("jsaSearch");
  if (jsaSearch) {
    jsaSearch.addEventListener("input", () => {
      renderJsaList(jsaSearch.value || "");
    });
  }

  // Observations
  initObservationFiltersUI();
  initObservations();

  // News
  loadNews();

  // Clicking outside modals closes them
  window.addEventListener("click", (event) => {
    const leaderModal = document.getElementById("leaderboardModal");
    const emergencyModal = document.getElementById("emergencyContactsModal");
    const jsaModal = document.getElementById("jsaConfirmationModal");

    if (event.target === leaderModal) hideLeaderboardModal();
    if (event.target === emergencyModal) hideEmergencyContactsModal();
    if (event.target === jsaModal) hideJSAConfirmationModal();
  });

  // Make Employee of the Month card open leaderboard (nice UX)
  const eomCard = document.getElementById("eomCard");
  if (eomCard) {
    eomCard.addEventListener("click", showLeaderboardModal);
  }
});
