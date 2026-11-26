const LEGACY_STORAGE_KEY = "time-matrix-state-v1";
const USER_STATE_PREFIX = "time-matrix-user-state-v1";
const UI_KEY = "time-matrix-ui-v1";

const QUADRANTS = {
  reactive: {
    id: "reactive",
    title: "Reactive",
    action: "Manage",
    axes: "Important + Urgent",
    description: "Crises, firefighting, ASAP work, low control.",
    strategies: ["Stabilize", "Decide", "Prevent repeat"],
    backgroundWords: [
      "Crises",
      "Fire fighting",
      "Solve ASAP",
      "Productivity: Low",
      "Feeling: Stress",
      "Decision making: Emotional",
    ],
  },
  proactive: {
    id: "proactive",
    title: "Proactive",
    action: "Focus",
    axes: "Important + Not So Urgent",
    description: "Planning, relationships, growth, high productivity.",
    strategies: ["Plan", "Protect time", "Deep work"],
    backgroundWords: [
      "Planning / Hypo A/C",
      "Relationship building",
      "GDA",
      "Productivity: High",
      "Feeling: Elated",
      "SI + SA + SC + SN",
    ],
  },
  deceptive: {
    id: "deceptive",
    title: "Deceptive",
    action: "Reduce Time Spent",
    axes: "Not So Important + Urgent",
    description: "Routine requests and interruptions that feel urgent.",
    strategies: ["Simplify", "Delegate", "Eliminate"],
    backgroundWords: [
      "Routine work",
      "Mostly by team",
      "Productivity: Flat",
      "Feeling: Boredom",
      "Not connected to goals",
    ],
  },
  escapist: {
    id: "escapist",
    title: "Escapist",
    action: "Avoid",
    axes: "Not Important + Not Urgent",
    description: "Time wasters, long breaks, gossip, unproductive calls.",
    strategies: ["Avoid", "Limit", "Redirect to Q2"],
    backgroundWords: [
      "Time wasters",
      "Mobile / gossip",
      "Long breaks",
      "Unproductive calls",
      "Productivity: Nil",
      "Feeling: Guilty",
    ],
  },
};

const PRIMARY_QUADRANT_ORDER = ["reactive", "proactive", "deceptive", "escapist"];
const QUADRANT_ORDER = [...PRIMARY_QUADRANT_ORDER];
const LEGACY_QUADRANT_MAP = {
  reduceTime: "deceptive",
  avoidAction: "escapist",
};
const DEFAULT_PRIORITY = "Priority 3";
const PRIORITIES = ["Priority 1", "Priority 2", "Priority 3", "Priority 4", "Priority 5"];
const PRIORITY_RANK = {
  "Priority 1": 0,
  "Priority 2": 1,
  "Priority 3": 2,
  "Priority 4": 3,
  "Priority 5": 4,
};

let currentUser = null;
let state = emptyState();
let draggedTaskId = null;
let recentTaskDragEndedAt = 0;
let expandedTaskId = null;
let toastTimer = null;
let selectedTaskIds = new Set();
let boardUi = loadBoardUi();
let pendingPersist = Promise.resolve();
let openQuadrant = null;
let quadrantModalReturnFocus = null;
let quadrantResizeState = null;
let conferenceNotes = [];
let pendingConferenceNotesPersist = Promise.resolve();
let expandedPeopleIds = new Set();
let expandedCompletedPeopleIds = new Set();
let collapsedReportPeopleIds = new Set();
let editingConferenceNote = null;
let draggingConferenceNote = null;

let goalTracker = defaultGoalTrackerData();
let pendingGoalTrackerPersist = Promise.resolve();
let goalTrackerDebounceTimer = null;

let matrixPerspective = localStorage.getItem("tm_matrix_perspective") || "bento";
let matrixFocusQuadrant = "all";
let radarHoverTaskId = null;

const elements = {
  appShell: document.getElementById("appShell"),
  authView: document.getElementById("authView"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  authMessage: document.getElementById("authMessage"),
  accountButton: document.getElementById("accountButton"),
  accountMenu: document.getElementById("accountMenu"),
  accountInitials: document.getElementById("accountInitials"),
  accountName: document.getElementById("accountName"),
  profileForm: document.getElementById("profileForm"),
  profileName: document.getElementById("profileName"),
  profileEmail: document.getElementById("profileEmail"),
  logoutButton: document.getElementById("logoutButton"),
  todayLabel: document.getElementById("todayLabel"),
  matrixView: document.getElementById("matrixView"),
  reportView: document.getElementById("reportView"),
  matrixBoard: document.getElementById("matrixBoard"),
  reportBoard: document.getElementById("reportBoard"),
  matrixMetrics: document.getElementById("matrixMetrics"),
  reportMetrics: document.getElementById("reportMetrics"),
  matrixInsight: document.getElementById("matrixInsight"),
  reportInsight: document.getElementById("reportInsight"),
  reportRange: document.getElementById("reportRange"),
  reportSubtitle: document.getElementById("reportSubtitle"),
  toast: document.getElementById("toast"),
  globalSearchForm: document.getElementById("globalSearchForm"),
  globalTaskSearch: document.getElementById("globalTaskSearch"),
  compactToggle: document.getElementById("compactToggle"),
  matrixPerspectiveSwitcher: document.getElementById("matrixPerspectiveSwitcher"),
  matrixFocusDock: document.getElementById("matrixFocusDock"),
  matrixWrap: document.getElementById("matrixWrap"),
  matrixRadarContainer: document.getElementById("matrixRadarContainer"),
  matrixHorizonContainer: document.getElementById("matrixHorizonContainer"),
  gtColgroup: document.getElementById("gtColgroup"),
  clearCompletedButton: document.getElementById("clearCompletedButton"),
  printButton: document.getElementById("printButton"),
  quadrantModal: document.getElementById("quadrantModal"),
  quadrantModalMode: document.getElementById("quadrantModalMode"),
  quadrantModalTitle: document.getElementById("quadrantModalTitle"),
  quadrantModalSubtitle: document.getElementById("quadrantModalSubtitle"),
  quadrantModalStats: document.getElementById("quadrantModalStats"),
  quadrantModalBody: document.getElementById("quadrantModalBody"),
  quadrantModalClose: document.getElementById("quadrantModalClose"),
  quadrantTaskViewToggle: document.getElementById("quadrantTaskViewToggle"),
  confNotesButton: document.getElementById("confNotesButton"),
  confNotesPopup: document.getElementById("confNotesPopup"),
  confPeopleList: document.getElementById("confPeopleList"),
  confAddForm: document.getElementById("confAddForm"),
  confAddInput: document.getElementById("confAddInput"),
  bucketView: document.getElementById("bucketView"),
  bucketMetrics: document.getElementById("bucketMetrics"),
  bucketQuadrantsGrid: document.getElementById("bucketQuadrantsGrid"),
  addBucketQuadrantBtn: document.getElementById("addBucketQuadrantBtn"),
  goalTrackerView: document.getElementById("goalTrackerView"),
  goalTrackerCard: document.getElementById("goalTrackerCard"),
  gtGoalTitleInput: document.getElementById("gtGoalTitleInput"),
  gtMonthYearInput: document.getElementById("gtMonthYearInput"),
  gtNotesInput: document.getElementById("gtNotesInput"),
  gtRewardInput: document.getElementById("gtRewardInput"),
  gtTableBody: document.getElementById("gtTableBody"),
  gtDaysSubnavHeader: document.getElementById("gtDaysSubnavHeader"),
  gtEarnedScore: document.getElementById("gtEarnedScore"),
  gtMaxScore: document.getElementById("gtMaxScore"),
  gtProgressPercent: document.getElementById("gtProgressPercent"),
  gtProgressBarFill: document.getElementById("gtProgressBarFill"),
  gtProgressQuote: document.getElementById("gtProgressQuote"),
  addGtTaskBtn: document.getElementById("addGtTaskBtn"),
  printGtBtn: document.getElementById("printGtBtn"),
  goalTaskModal: document.getElementById("gtInlineTaskPanel") || document.getElementById("goalTaskModal"),
  goalTaskForm: document.getElementById("goalTaskForm"),
  gtTaskIdInput: document.getElementById("gtTaskIdInput"),
  gtTaskTitleInput: document.getElementById("gtTaskTitleInput"),
  gtTaskScoreInput: document.getElementById("gtTaskScoreInput"),
  gtTaskModalDeleteBtn: document.getElementById("gtTaskModalDeleteBtn"),
  gtMonthPicker: document.getElementById("gtMonthPicker"),
  gtPrevMonthBtn: document.getElementById("gtPrevMonthBtn"),
  gtNextMonthBtn: document.getElementById("gtNextMonthBtn"),
  gtTableWrapper: document.querySelector(".gt-table-wrapper"),
  gtCompareSubtitle: document.getElementById("gtCompareSubtitle"),
  gtCompareScoreVal: document.getElementById("gtCompareScoreVal"),
  gtCompareScoreDiff: document.getElementById("gtCompareScoreDiff"),
  gtCompareRateVal: document.getElementById("gtCompareRateVal"),
  gtCompareRateDiff: document.getElementById("gtCompareRateDiff"),
  gtCompareActiveVal: document.getElementById("gtCompareActiveVal"),
  gtCompareActiveDiff: document.getElementById("gtCompareActiveDiff"),
  gtDaysHeaderColspan: document.getElementById("gtDaysHeaderColspan"),
  gtCellFloatBar: document.getElementById("gtCellFloatBar"),
  gtFloatTitle: document.getElementById("gtFloatTitle"),
  gtFloatMaxScore: document.getElementById("gtFloatMaxScore"),
  gtFloatInput: document.getElementById("gtFloatInput"),
  gtFloatSaveBtn: document.getElementById("gtFloatSaveBtn"),
  gtFloatIncBtn: document.getElementById("gtFloatIncBtn"),
  gtFloatDecBtn: document.getElementById("gtFloatDecBtn"),
  gtCockpitDialArc: document.getElementById("gtCockpitDialArc"),
  gtCockpitDialNum: document.getElementById("gtCockpitDialNum"),
  gtCockpitHabitTitle: document.getElementById("gtCockpitHabitTitle"),
  gtCockpitPctBadge: document.getElementById("gtCockpitPctBadge"),
  gtCockpitRangeInput: document.getElementById("gtCockpitRangeInput"),
  gtTableFoot: document.getElementById("gtTableFoot"),
  gtTodaySummaryVal: document.getElementById("gtTodaySummaryVal"),
  gtBestDayVal: document.getElementById("gtBestDayVal"),
  gtActiveDaysVal: document.getElementById("gtActiveDaysVal"),
  gtDailyAvgVal: document.getElementById("gtDailyAvgVal"),
  gtViewMonthlyBtn: document.getElementById("gtViewMonthlyBtn"),
  gtViewYearlyBtn: document.getElementById("gtViewYearlyBtn"),
  gtMonthlyControlsGroup: document.getElementById("gtMonthlyControlsGroup"),
  gtYearlyDashboardContainer: document.getElementById("gtYearlyDashboardContainer"),
  gtDayDetailModal: document.getElementById("gtDayDetailModal"),
  gtDayDetailTitle: document.getElementById("gtDayDetailTitle"),
  gtDayModalIndexBadge: document.getElementById("gtDayModalIndexBadge"),
  gtDaySummaryBanner: document.getElementById("gtDaySummaryBanner"),
  gtDayChecklistList: document.getElementById("gtDayChecklistList"),
  gtDayPrevBtn: document.getElementById("gtDayPrevBtn"),
  gtDayNextBtn: document.getElementById("gtDayNextBtn"),
  gtDayMarkAllBtn: document.getElementById("gtDayMarkAllBtn"),
  gtDayResetBtn: document.getElementById("gtDayResetBtn"),
  gtDayHabitCount: document.getElementById("gtDayHabitCount"),
  globalThemeButton: document.getElementById("globalThemeButton"),
  globalThemeMenu: document.getElementById("globalThemeMenu"),
  backToTopBtn: document.getElementById("backToTopBtn"),
  matrixTabBadge: document.getElementById("matrixTabBadge"),
  confettiCanvas: document.getElementById("confettiCanvas"),
  cmdPaletteModal: document.getElementById("commandPaletteModal"),
  cmdPaletteTriggerBtn: document.getElementById("cmdPaletteTriggerBtn"),
  cmdPaletteInput: document.getElementById("cmdPaletteInput"),
  cmdPaletteResults: document.getElementById("cmdPaletteResults"),
  cmdPaletteCloseKey: document.getElementById("cmdPaletteCloseKey"),
  pomodoroFocusModal: document.getElementById("pomodoroFocusModal"),
  topbarPomodoroBtn: document.getElementById("topbarPomodoroBtn"),
  pomoTaskTitle: document.getElementById("pomoTaskTitle"),
  pomoQuadrantTag: document.getElementById("pomoQuadrantTag"),
  pomoModalClose: document.getElementById("pomoModalClose"),
  pomoProgressCircle: document.getElementById("pomoProgressCircle"),
  pomoTimeDigits: document.getElementById("pomoTimeDigits"),
  pomoPhaseLabel: document.getElementById("pomoPhaseLabel"),
  pomoPlayPauseBtn: document.getElementById("pomoPlayPauseBtn"),
  pomoPlayIcon: document.getElementById("pomoPlayIcon"),
  pomoPauseIcon: document.getElementById("pomoPauseIcon"),
  pomoPlayPauseText: document.getElementById("pomoPlayPauseText"),
  pomoResetBtn: document.getElementById("pomoResetBtn"),
  pomoAdd5mBtn: document.getElementById("pomoAdd5mBtn"),
  pomoFinishLogBtn: document.getElementById("pomoFinishLogBtn"),
  pomoSoundSelect: document.getElementById("pomoSoundSelect"),
  pomodoroMiniPill: document.getElementById("pomodoroMiniPill"),
  miniPomoTime: document.getElementById("miniPomoTime"),
  miniPomoTask: document.getElementById("miniPomoTask"),
  miniPomoToggleBtn: document.getElementById("miniPomoToggleBtn"),
};

init();

// ─── Back-to-top ───────────────────────────────────────────────────────────
(function wireBackToTop() {
  const btn = elements.backToTopBtn;
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("is-hidden", window.scrollY < 400);
  }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();

// ─── Keyboard shortcuts ────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // Skip if typing in an input/textarea/select
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === "m" || e.key === "M") { e.preventDefault(); setView("matrix"); }
  else if (e.key === "b" || e.key === "B") { e.preventDefault(); setView("bucket"); }
  else if (e.key === "g" || e.key === "G") { e.preventDefault(); setView("goalTracker"); }
});

// ─── Matrix tab badge (active task count) ─────────────────────────────────
function updateMatrixTabBadge() {
  const badge = elements.matrixTabBadge;
  if (!badge) return;
  const count = (state.tasks || []).filter(t => t.status === "active").length;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

// ─── Confetti engine ───────────────────────────────────────────────────────
function launchConfetti(duration = 1800) {
  const canvas = elements.confettiCanvas;
  if (!canvas) return;
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#38bdf8", "#a78bfa", "#34d399", "#fb923c"];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 100,
    r: 4 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: 3 + Math.random() * 4,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 8,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));

  const start = performance.now();
  function frame(ts) {
    const elapsed = ts - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.vy += 0.08; // gravity
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
      if (p.shape === "rect") {
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    if (elapsed < duration) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = "none"; }
  }
  requestAnimationFrame(frame);
}

// ─── Streak calculator ─────────────────────────────────────────────────────
function calcStreak(task, yr, mo, curDay, curYr, curMo) {
  const daysInMonth = getDaysInMonth(yr, mo);
  const isCurrentMonth = (yr === curYr && mo === curMo);
  const maxDay = isCurrentMonth ? Math.min(curDay, daysInMonth) : daysInMonth;

  let streak = 0;
  for (let d = maxDay - 1; d >= 0; d--) {
    const val = Array.isArray(task.scores) ? (Number(task.scores[d]) || 0) : 0;
    if (val > 0) streak++;
    else break;
  }
  return streak;
}

// ─── Type 1 Cockpit UI Sync & Steppers ──────────────────────────────────────
function syncCockpitUI(scoreVal) {
  if (!currentActiveCellRef) return;
  const maxScore = currentActiveCellRef.maxScore || 10;
  const val = Math.max(0, Math.min(maxScore, parseInt(scoreVal, 10) || 0));
  const totalCirc = 138.23; // 2 * PI * 22 (radius = 22)
  const offset = totalCirc - (totalCirc * (val / maxScore));
  const pct = maxScore > 0 ? Math.round((val / maxScore) * 100) : 0;

  // Dynamic Gamified Color Morphing based on score value
  let themeColor = "var(--muted, #94a3b8)";
  let glowColor = "rgba(148, 163, 184, 0.3)";
  let statusText = "0% Reset";

  if (pct === 100) {
    themeColor = "var(--proactive, #10b981)"; // Radiant Emerald (100% Perfect)
    glowColor = "rgba(16, 185, 129, 0.85)";
    statusText = "100% Perfect!";
  } else if (pct >= 70) {
    themeColor = "#8b5cf6"; // Linear Pro Violet (Strong 70-99%)
    glowColor = "rgba(139, 92, 246, 0.75)";
    statusText = `${pct}% Strong`;
  } else if (pct >= 40) {
    themeColor = "#0284c7"; // Electric Sky Blue (Halfway 40-69%)
    glowColor = "rgba(2, 132, 199, 0.75)";
    statusText = `${pct}% Half`;
  } else if (pct > 0) {
    themeColor = "#f59e0b"; // Warm Amber (Started 1-39%)
    glowColor = "rgba(245, 158, 11, 0.75)";
    statusText = `${pct}% Low`;
  }

  // Set CSS variables on float bar container so entire card morphs dynamically
  if (elements.gtCellFloatBar) {
    elements.gtCellFloatBar.style.setProperty("--cockpit-color", themeColor);
    elements.gtCellFloatBar.style.setProperty("--cockpit-glow", glowColor);
  }

  const dialArc = elements.gtCockpitDialArc || document.getElementById("gtCockpitDialArc");
  if (dialArc) {
    dialArc.style.setProperty("stroke-dashoffset", String(offset), "important");
    dialArc.setAttribute("stroke-dashoffset", String(offset));
    dialArc.style.setProperty("stroke", val === 0 ? "transparent" : themeColor, "important");
    dialArc.style.setProperty("filter", val === 0 ? "none" : `drop-shadow(0 0 8px ${glowColor})`, "important");
  }

  const dialNum = elements.gtCockpitDialNum || document.getElementById("gtCockpitDialNum");
  if (dialNum) {
    dialNum.textContent = val;
    dialNum.style.setProperty("color", val === 0 ? "var(--muted, #94a3b8)" : themeColor, "important");
    dialNum.style.setProperty("text-shadow", val === 0 ? "none" : `0 0 10px ${glowColor}`, "important");
  }

  const dialLabel = document.querySelector(".gt-dial-led-label");
  if (dialLabel) {
    dialLabel.style.setProperty("color", val === 0 ? "var(--muted, #94a3b8)" : themeColor, "important");
  }

  if (elements.gtCockpitPctBadge) {
    elements.gtCockpitPctBadge.textContent = statusText;
    elements.gtCockpitPctBadge.style.color = themeColor;
    elements.gtCockpitPctBadge.style.borderColor = `color-mix(in srgb, ${themeColor} 45%, transparent)`;
    elements.gtCockpitPctBadge.style.backgroundColor = `color-mix(in srgb, ${themeColor} 14%, transparent)`;
  }

  if (elements.gtFloatInput) {
    elements.gtFloatInput.value = val;
  }

  if (elements.gtCockpitRangeInput) {
    elements.gtCockpitRangeInput.value = val;
    // Morph slider track fill gradient to match progress
    elements.gtCockpitRangeInput.style.background = `linear-gradient(to right, ${themeColor} 0%, ${themeColor} ${pct}%, var(--surface-3, #e2e8f0) ${pct}%, var(--surface-3, #e2e8f0) 100%)`;
  }
}

(function wireFloatSteppers() {
  const incBtn = elements.gtFloatIncBtn || document.getElementById("gtFloatIncBtn");
  const decBtn = elements.gtFloatDecBtn || document.getElementById("gtFloatDecBtn");
  const rangeInput = elements.gtCockpitRangeInput || document.getElementById("gtCockpitRangeInput");

  if (incBtn) {
    incBtn.addEventListener("click", () => {
      if (!currentActiveCellRef) return;
      const max = currentActiveCellRef.maxScore;
      const cur = parseInt(rangeInput ? rangeInput.value : 0, 10) || 0;
      syncCockpitUI(Math.min(max, cur + 1));
    });
  }
  if (decBtn) {
    decBtn.addEventListener("click", () => {
      if (!currentActiveCellRef) return;
      const cur = parseInt(rangeInput ? rangeInput.value : 0, 10) || 0;
      syncCockpitUI(Math.max(0, cur - 1));
    });
  }
  if (rangeInput) {
    rangeInput.addEventListener("input", (e) => {
      syncCockpitUI(e.target.value);
    });
    rangeInput.addEventListener("change", (e) => {
      syncCockpitUI(e.target.value);
    });
  }
})();

async function init() {
  elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());



  wireAuthInteractions();
  wireGlobalSearchInteractions();
  wireQuadrantModalInteractions();
  wireQuadrantResizeDocumentInteractions();
  wireConferenceNotesInteractions();
  wireGlobalThemeInteractions();
  wireMatrixSubnav();
  wireReportNotesInteractions();
  wireBucketInteractions();
  wireGoalTrackerInteractions();
  wireCommandPalette();
  wirePomodoroFocusTimer();
  wireMatrixPerspectiveEvents();

  // Global dismissal for Titanium Chronograph decks & card popovers
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".task-chrono-capsule-wrap") && !e.target.closest(".card-chrono-container")) {
      document.querySelectorAll(".task-chrono-deck").forEach((deck) => {
        deck.classList.add("is-hidden");
        deck.hidden = true;
      });
      document.querySelectorAll(".card-chrono-popover").forEach((pop) => {
        pop.classList.add("is-hidden");
        pop.hidden = true;
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".task-chrono-deck").forEach((deck) => {
        deck.classList.add("is-hidden");
        deck.hidden = true;
      });
      document.querySelectorAll(".card-chrono-popover").forEach((pop) => {
        pop.classList.add("is-hidden");
        pop.hidden = true;
      });
    }
  });

  document.querySelectorAll(".tab-button[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  elements.clearCompletedButton.addEventListener("click", clearCompletedTasks);
  elements.compactToggle.addEventListener("click", toggleCompactMode);
  elements.printButton.addEventListener("click", () => window.print());
  elements.reportRange.addEventListener("change", render);

  function getViewFromLocation() {
    const hash = location.hash.replace("#", "").trim();
    if (hash === "bucket" || hash === "goalTracker" || hash === "matrix") return hash;
    const path = location.pathname.replace(/^\//, "").trim();
    if (path === "bucket" || path === "goalTracker" || path === "matrix") return path;
    return "matrix";
  }

  setView(getViewFromLocation(), false);
  window.addEventListener("hashchange", () => {
    setView(getViewFromLocation(), false);
  });

  const savedToken = getAuthToken();
  let cachedUser = null;
  try {
    const rawCached = localStorage.getItem("tm_cached_user");
    if (rawCached) cachedUser = JSON.parse(rawCached);
  } catch (e) {
    cachedUser = null;
  }

  try {
    const session = await apiRequest("/api/session");
    if (session && session.user) {
      currentUser = session.user;
      if (session.token) setAuthToken(session.token);
      localStorage.setItem("tm_cached_user", JSON.stringify(session.user));
      state = normalizeState(session.state);
      await migrateLegacyStateIfNeeded();
      await showApp(false);
    } else {
      // Server confirmed no active session — clear everything
      setAuthToken(null);
      localStorage.removeItem("tm_cached_user");
      currentUser = null;
      showAuth("login");
      setAuthMessage("");
    }
  } catch (error) {
    console.warn("Session fetch failed during init:", error);
    // Only force logout if the server explicitly rejected the session (401).
    // For network errors / server not ready, keep the user logged in using
    // the cached token so a browser refresh doesn't log them out.
    const isAuthError =
      String(error?.message || "").includes("401") ||
      String(error?.message || "").toLowerCase().includes("login is required") ||
      String(error?.message || "").toLowerCase().includes("unauthorized");

    if (isAuthError || (!savedToken && !cachedUser)) {
      setAuthToken(null);
      localStorage.removeItem("tm_cached_user");
      currentUser = null;
      showAuth("login");
      setAuthMessage("");
    } else if (cachedUser && savedToken) {
      // Network/server error but we have a cached session — show the app
      // and let background sync recover.
      currentUser = cachedUser;
      state = normalizeState(null);
      await showApp(false);
    } else {
      setAuthToken(null);
      localStorage.removeItem("tm_cached_user");
      currentUser = null;
      showAuth("login");
      setAuthMessage("");
    }
  }
}

function emptyState() {
  return {
    tasks: [],
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeState(saved) {
  if (saved && Array.isArray(saved.tasks)) {
    return {
      tasks: saved.tasks.map((task, index) => normalizeTaskState(task, index)),
      lastUpdated: saved.lastUpdated || new Date().toISOString(),
    };
  }

  return emptyState();
}

function normalizeTaskState(task, index) {
  const quadrant = normalizeQuadrant(task.quadrant);
  const originalQuadrant = normalizeQuadrant(task.originalQuadrant || task.original_quadrant || quadrant);
  const rawCompletedQuadrant = task.completedQuadrant || task.completed_quadrant;
  const completedQuadrant = rawCompletedQuadrant
    ? normalizeQuadrant(rawCompletedQuadrant)
    : null;

  return {
    ...task,
    quadrant,
    originalQuadrant,
    completedQuadrant,
    position: Number.isFinite(Number(task.position)) ? Number(task.position) : index,
    priority: normalizePriority(task.priority),
    isStarred: Boolean(task.isStarred),
    history: Array.isArray(task.history) ? task.history : [],
  };
}

function normalizeQuadrant(value) {
  const raw = String(value || "").trim();
  const legacy = LEGACY_QUADRANT_MAP[raw];
  if (legacy) return legacy;
  return QUADRANTS[raw] ? raw : "proactive";
}

let persistDebounceTimer = null;

function persist() {
  if (!currentUser) return pendingPersist;
  state.lastUpdated = new Date().toISOString();

  if (persistDebounceTimer) clearTimeout(persistDebounceTimer);

  return new Promise((resolve) => {
    persistDebounceTimer = setTimeout(() => {
      const snapshot = JSON.parse(JSON.stringify(state));
      pendingPersist = pendingPersist
        .catch(() => undefined)
        .then(() => apiRequest("/api/state", { method: "PUT", body: snapshot }))
        .catch((error) => {
          console.error(error);
          showToast("Could not save to the database");
        });
      resolve(pendingPersist);
    }, 200);
  });
}

function loadBoardUi() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY));
    if (saved && typeof saved === "object") {
      return {
        compact: Boolean(saved.compact),
        openQuadrantTaskView: saved.openQuadrantTaskView === "detailed" ? "detailed" : "compact",
        globalFilter: typeof saved.globalFilter === "string" ? saved.globalFilter : "",
        filters: saved.filters && typeof saved.filters === "object" ? saved.filters : {},
        priorityFilters: saved.priorityFilters && typeof saved.priorityFilters === "object" ? saved.priorityFilters : {},
        primaryQuadrantHeight: clampQuadrantHeight("primary", saved.primaryQuadrantHeight),
        actionQuadrantHeight: clampQuadrantHeight("action", saved.actionQuadrantHeight),
      };
    }
  } catch (error) {
    console.warn("Could not read board UI settings", error);
  }

  return {
    compact: false,
    openQuadrantTaskView: "compact",
    globalFilter: "",
    filters: {},
    priorityFilters: {},
    primaryQuadrantHeight: 640,
    actionQuadrantHeight: 560,
  };
}

function persistBoardUi() {
  localStorage.setItem(UI_KEY, JSON.stringify(boardUi));
}

function wireGlobalSearchInteractions() {
  if (!elements.globalSearchForm || !elements.globalTaskSearch) return;

  elements.globalTaskSearch.value = boardUi.globalFilter || "";
  elements.globalTaskSearch.addEventListener("input", () => {
    const cursor = elements.globalTaskSearch.selectionStart || elements.globalTaskSearch.value.length;
    boardUi.globalFilter = elements.globalTaskSearch.value;
    persistBoardUi();
    render();
    requestAnimationFrame(() => {
      elements.globalTaskSearch.focus();
      elements.globalTaskSearch.setSelectionRange(cursor, cursor);
    });
  });

  elements.globalSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    boardUi.globalFilter = elements.globalTaskSearch.value;
    persistBoardUi();
    render();
    elements.globalTaskSearch.focus();
  });
}

function wireAuthInteractions() {
  document.addEventListener("click", (event) => {
    const authTab = event.target.closest("[data-auth-mode]");
    if (authTab) {
      setAuthMode(authTab.dataset.authMode);
    }
  });

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => togglePasswordVisibility(button));
  });

  elements.loginForm.addEventListener("submit", handleLogin);
  elements.registerForm.addEventListener("submit", handleRegister);

  elements.accountButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setAccountMenu(elements.accountMenu.classList.contains("is-hidden"));
  });

  elements.accountMenu.addEventListener("click", (event) => {
    const optBtn = event.target.closest("button[data-app-theme], .theme-opt-btn");
    if (optBtn && optBtn !== document.body) {
      const themeKey = optBtn.dataset.appTheme || optBtn.dataset.themeId;
      if (themeKey) applyAppTheme(themeKey);
    }
    event.stopPropagation();
  });

  document.addEventListener("click", () => setAccountMenu(false));

  elements.profileForm.addEventListener("submit", handleProfileSave);
  elements.logoutButton.addEventListener("click", logout);
}

function setAuthMode(mode) {
  const nextMode = mode === "register" ? "register" : "login";
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === nextMode);
  });
  const loginForm = document.getElementById("loginForm") || elements.loginForm;
  const registerForm = document.getElementById("registerForm") || elements.registerForm;
  if (loginForm) loginForm.classList.toggle("is-hidden", nextMode !== "login");
  if (registerForm) registerForm.classList.toggle("is-hidden", nextMode !== "register");
  resetPasswordVisibility();
  setAuthMessage("");
}

function togglePasswordVisibility(button) {
  const input = button.closest(".password-field")?.querySelector("input");
  if (!input) return;

  const shouldShow = input.type === "password";
  input.type = shouldShow ? "text" : "password";
  button.classList.toggle("is-visible", shouldShow);
  button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
  button.setAttribute("title", shouldShow ? "Hide password" : "Show password");
}

function resetPasswordVisibility() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    const input = button.closest(".password-field")?.querySelector("input");
    if (input) input.type = "password";
    button.classList.remove("is-visible");
    button.setAttribute("aria-label", "Show password");
    button.setAttribute("title", "Show password");
  });
}

async function handleLogin(event) {
  if (event) event.preventDefault();
  const submitBtn = elements.loginForm?.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  setAuthMessage("Logging in...");
  const formData = new FormData(elements.loginForm);
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") || "");
  const serverUrl = String(formData.get("serverUrl") || "").trim();

  if (serverUrl) {
    setServerUrl(serverUrl);
  }

  if (!email || !password) {
    setAuthMessage("Email and password are required.");
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  try {
    const data = await apiRequest("/api/login", {
      method: "POST",
      body: { email, password },
    });
    currentUser = data.user;
    if (data.token) setAuthToken(data.token);
    state = normalizeState(data.state);
    await migrateLegacyStateIfNeeded();
    elements.loginForm.reset();
    await showApp();
    showToast(`Welcome back, ${currentUser.name}`);
  } catch (error) {
    console.error(error);
    setAuthMessage(error.message || "Login failed.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleRegister(event) {
  if (event) event.preventDefault();
  const submitBtn = elements.registerForm?.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  setAuthMessage("Creating user...");
  const formData = new FormData(elements.registerForm);
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const serverUrl = String(formData.get("serverUrl") || "").trim();

  if (serverUrl) {
    setServerUrl(serverUrl);
  }

  if (!name) {
    setAuthMessage("Enter a name for the user.");
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  if (!email) {
    setAuthMessage("Enter a valid email.");
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  if (password.length < 6) {
    setAuthMessage("Password should be at least 6 characters.");
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  if (password !== confirmPassword) {
    setAuthMessage("Passwords do not match.");
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  try {
    const data = await apiRequest("/api/register", {
      method: "POST",
      body: { name, email, password },
    });
    currentUser = data.user;
    if (data.token) setAuthToken(data.token);
    state = normalizeState(data.state);
    await migrateLegacyStateIfNeeded();
    elements.registerForm.reset();
    await showApp();
    showToast(`User created for ${currentUser.name}`);
  } catch (error) {
    console.error(error);
    setAuthMessage(error.message || "Could not create user.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleProfileSave(event) {
  event.preventDefault();
  if (!currentUser) return;

  const formData = new FormData(elements.profileForm);
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const email = normalizeEmail(formData.get("email"));

  if (!name || !email) {
    showToast("Name and email are required");
    return;
  }

  try {
    const data = await apiRequest("/api/profile", {
      method: "PUT",
      body: { name, email },
    });
    currentUser = data.user;
    updateAccountUI();
    setAccountMenu(false);
    showToast("Profile saved");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Profile could not be saved");
  }
}

async function logout() {
  try {
    await pendingPersist.catch(() => undefined);
    await pendingConferenceNotesPersist.catch(() => undefined);
    await pendingGoalTrackerPersist.catch(() => undefined);
    await apiRequest("/api/logout", { method: "POST" });
  } catch (error) {
    console.error(error);
  }

  setAuthToken(null);
  localStorage.removeItem("tm_cached_user");
  currentUser = null;
  state = emptyState();
  expandedTaskId = null;
  selectedTaskIds.clear();
  closeQuadrantDetail(false);
  setAccountMenu(false);
  conferenceNotes = [];
  editingConferenceNote = null;
  draggingConferenceNote = null;
  setConfNotesPopup(false);
  showAuth("login");
  setAuthMessage("Logged out. Login again to continue.", true);
}

async function showApp(updateView = true) {
  const authView = elements.authView || document.getElementById("authView");
  const appShell = elements.appShell || document.getElementById("appShell");
  if (authView) authView.classList.add("is-hidden");
  if (appShell) appShell.classList.remove("is-hidden");
  setAuthMessage("");
  updateAccountUI();
  setView(location.hash.replace("#", "") || "matrix", updateView);
  render();
  renderConferenceNotes();
  renderBucketList();
  renderGoalTracker();

  Promise.all([loadConferenceNotes(), loadBucketList(), loadGoalTracker()])
    .then(() => {
      renderConferenceNotes();
      renderBucketList();
      renderGoalTracker();
      render();
    })
    .catch((err) => console.warn("Background sync warning:", err));
}

function showAuth(mode) {
  const authView = elements.authView || document.getElementById("authView");
  const appShell = elements.appShell || document.getElementById("appShell");
  if (appShell) appShell.classList.add("is-hidden");
  if (authView) authView.classList.remove("is-hidden");
  setAuthMode(mode);
}

function updateAccountUI() {
  if (!currentUser) return;
  elements.accountInitials.textContent = initialsFor(currentUser.name);
  elements.accountName.textContent = currentUser.name;
  elements.profileName.value = currentUser.name;
  elements.profileEmail.value = currentUser.email;
}

function setAccountMenu(isOpen) {
  elements.accountMenu.classList.toggle("is-hidden", !isOpen);
  elements.accountButton.setAttribute("aria-expanded", String(isOpen));
}

function setAuthMessage(message, isSuccess = false) {
  elements.authMessage.textContent = message;
  elements.authMessage.classList.toggle("is-success", isSuccess);
}

async function migrateLegacyStateIfNeeded() {
  if (!currentUser || state.tasks.length) return;

  const legacy = readLegacyState();
  if (!legacy) return;

  state = normalizeState({
    ...legacy,
    migratedAt: new Date().toISOString(),
    migratedFrom: legacy.key,
  });
  await persist();
  showToast("Imported local tasks into the database");
}

function readLegacyState() {
  const keys = [`${USER_STATE_PREFIX}:${currentUser.id}`, LEGACY_STORAGE_KEY];

  for (const key of keys) {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && Array.isArray(saved.tasks) && saved.tasks.length > 0) {
        return { ...saved, key };
      }
    } catch (error) {
      console.warn("Could not read legacy matrix data", error);
    }
  }
  return null;
}

function getServerUrl() {
  const currentOrigin = window.location.origin;
  // When running locally, always use same-origin (ignore any saved remote URL)
  if (currentOrigin.includes("localhost") || currentOrigin.includes("127.0.0.1")) {
    return "";
  }
  const saved = localStorage.getItem("tm_server_url");
  if (saved) {
    const cleanSaved = saved.replace(/\/+$/, "");
    // If saved URL is same as current origin, use relative paths (same-origin)
    if (cleanSaved === currentOrigin) return "";
    return cleanSaved;
  }
  if (window.TIME_MATRIX_SERVER_URL) {
    const cleanUrl = window.TIME_MATRIX_SERVER_URL.replace(/\/+$/, "");
    // If TIME_MATRIX_SERVER_URL is same as current origin, use relative paths
    if (cleanUrl === currentOrigin) return "";
    return cleanUrl;
  }
  return "";
}

function setServerUrl(url) {
  if (!url) {
    localStorage.removeItem("tm_server_url");
  } else {
    localStorage.setItem("tm_server_url", String(url).trim().replace(/\/+$/, ""));
  }
}

function getAuthToken() {
  return localStorage.getItem("tm_auth_token") || "";
}

function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem("tm_auth_token");
  } else {
    localStorage.setItem("tm_auth_token", String(token).trim());
  }
}

async function apiRequest(path, options = {}) {
  const baseUrl = getServerUrl();
  const fullPath = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const token = getAuthToken();
  const isAuthRoute = path.includes("/api/login") || path.includes("/api/register");

  const headers = {
    Accept: "application/json",
    ...(!isAuthRoute && token ? { Authorization: `Bearer ${token}`, "X-Auth-Token": token } : {}),
    ...(options.headers || {}),
  };
  const fetchOptions = {
    method: options.method || "GET",
    credentials: baseUrl ? "include" : "same-origin",
    headers,
    cache: "no-store", // Prevent browser from caching auth/state checks on refresh
  };

  if (options.body !== undefined) {
    fetchOptions.headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(fullPath, fetchOptions);
  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    // Only auto-logout on 401 for data API calls, NOT for /api/session
    // (session check handles its own auth state in init()).
    const isSessionCheck = path.includes("/api/session");
    if (response.status === 401 && !isAuthRoute && !isSessionCheck) {
      setAuthToken(null);
      localStorage.removeItem("tm_cached_user");
      currentUser = null;
      showAuth("login");
    }
    throw new Error(payload?.error || `Request failed with ${response.status}`);
  }

  if (!payload) {
    throw new Error("Invalid response from server. If you are using the app, check your Server URL connection.");
  }

  return payload;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function initialsFor(name) {
  const parts = String(name || "User").trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "U";
}

function createId(prefix) {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setView(view, updateHash = true) {
  let nextView = (view === "bucket" ? "bucket" : (view === "goalTracker" ? "goalTracker" : "matrix"));

  if (openQuadrant && openQuadrant.mode !== nextView) {
    closeQuadrantDetail(false);
  }

  elements.matrixView.classList.toggle("is-hidden", nextView !== "matrix");
  if (elements.reportView) elements.reportView.classList.toggle("is-hidden", true);
  if (elements.bucketView) elements.bucketView.classList.toggle("is-hidden", nextView !== "bucket");
  if (elements.goalTrackerView) elements.goalTrackerView.classList.toggle("is-hidden", nextView !== "goalTracker");

  document.querySelectorAll(".view-tabs .tab-button[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === nextView);
  });

  if (nextView === "goalTracker") {
    loadGoalTracker();
    renderGoalTracker();
  } else if (nextView === "bucket") {
    loadBucketList();
    renderBucketList();
  } else if (nextView === "matrix") {
    render();
  }

  window.scrollTo({ top: 0, left: 0, behavior: "instant" });

  if (updateHash) {
    history.replaceState(null, "", `#${nextView}`);
  }
}

function render() {
  if (!currentUser) return;
  syncSelectedTasks();
  elements.appShell.classList.toggle("is-compact", boardUi.compact);
  elements.compactToggle.setAttribute("aria-pressed", String(boardUi.compact));
  elements.compactToggle.classList.toggle("is-active", boardUi.compact);
  renderGlobalSearchState();
  applyQuadrantHeights();
  renderMetrics();
  renderMatrixBoard();
  renderReportBoard();
  renderReportNotes();
  renderBucketList();
  renderGoalTracker();
  renderOpenQuadrant();
  updateMatrixTabBadge();
}

function renderGlobalSearchState() {
  if (!elements.globalTaskSearch) return;
  const query = boardUi.globalFilter || "";
  if (elements.globalTaskSearch.value !== query) {
    elements.globalTaskSearch.value = query;
  }
}

function renderMetrics() {
  const activeTasks = state.tasks.filter((task) => task.status === "active");
  const completedTasks = filteredCompletedTasks();
  const activeMinutes = sumMinutes(activeTasks);
  const completedMinutes = sumMinutes(completedTasks);
  const proactiveMinutes = sumMinutes(activeTasks.filter((task) => task.quadrant === "proactive"));
  const reduceMinutes = sumMinutes(activeTasks.filter((task) => isReduceQuadrant(task.quadrant)));
  const avoidMinutes = sumMinutes(activeTasks.filter((task) => isAvoidQuadrant(task.quadrant)));

  elements.matrixMetrics.innerHTML = [
    metricCard("Active Tasks", activeTasks.length, `${activeMinutes} min planned`),
    metricCard("Focus Share", percent(proactiveMinutes, activeMinutes), "Proactive time on the board"),
    metricCard("Reduce", `${reduceMinutes}m`, "Deceptive work to shrink"),
    metricCard("Avoid", `${avoidMinutes}m`, "Escapist work to redirect"),
  ].join("");
  elements.matrixInsight.innerHTML = insightPanelTemplate(matrixInsight(activeTasks, {
    activeMinutes,
    proactiveMinutes,
    reduceMinutes,
    avoidMinutes,
  }));

  const completedByQuadrant = countByQuadrant(completedTasks);
  const bestQuadrant = completedTasks.length
    ? QUADRANT_ORDER.reduce((best, id) => {
      if (!best || completedByQuadrant[id] > completedByQuadrant[best]) return id;
      return best;
    }, null)
    : null;

  elements.reportMetrics.innerHTML = [
    metricCard("Completed", completedTasks.length, `${completedMinutes} min recorded`),
    metricCard("Focus Result", percent(sumMinutes(completedTasks.filter((task) => task.quadrant === "proactive")), completedMinutes), "Completed in Proactive"),
    metricCard("Reduced/Avoided", completedTasks.filter((task) => isReduceQuadrant(task.quadrant) || isAvoidQuadrant(task.quadrant)).length, "Tasks to simplify or stop"),
    metricCard("Top Quadrant", bestQuadrant ? QUADRANTS[bestQuadrant].title : "-", "Most completed tasks"),
  ].join("");
  elements.reportInsight.innerHTML = insightPanelTemplate(reportInsight(completedTasks, bestQuadrant));
}

function metricCard(label, value, detail) {
  const iconSvgs = {
    'Active Tasks': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="m9 14 2 2 4-4"/></svg>`,
    'Focus Share': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    'Reduce': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.5L10 8.5L14 12.5L20 6.5"/><path d="M20 14V6.5H12.5"/></svg>`,
    'Avoid': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>`,
    'Completed': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>`,
    'Focus Result': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/><path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    'Reduced/Avoided': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`,
    'Top Quadrant': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    'Bucket Quadrants': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    'Total Goals': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    'Achieved Goals': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/><path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    'Active Goals': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
  };
  const gradients = {
    'Active Tasks': 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    'Focus Share': 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'Reduce': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    'Avoid': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'Completed': 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    'Focus Result': 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'Reduced/Avoided': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    'Top Quadrant': 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
    'Bucket Quadrants': 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    'Total Goals': 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'Achieved Goals': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'Active Goals': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  };
  const svg = iconSvgs[label] || iconSvgs['Active Tasks'];
  const gradient = gradients[label] || gradients['Active Tasks'];
  return `
    <article class="metric-card">
      <div class="metric-info">
        <span class="metric-label">${escapeHtml(label)}</span>
        <strong class="metric-value">${escapeHtml(String(value))}</strong>
        <p class="metric-detail">${escapeHtml(detail)}</p>
      </div>
      <div class="metric-icon-badge" style="background: ${gradient};">
        ${svg}
      </div>
    </article>
  `;
}

function insightPanelTemplate(items) {
  return items.map((item) => `
    <article class="insight-card ${item.tone ? `tone-${escapeHtml(item.tone)}` : ""}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `).join("");
}

function matrixInsight(activeTasks, totals) {
  if (!activeTasks.length) {
    return [
      {
        label: "Start",
        title: "Your board is ready for the first decision.",
        detail: "A clean matrix starts with one honest placement.",
        tone: "focus",
      },
      {
        label: "Flow",
        title: "Completed work becomes reflection.",
        detail: "The report preserves the quadrant pattern of the day.",
        tone: "calm",
      },
    ];
  }

  const focusShare = totals.activeMinutes ? Math.round((totals.proactiveMinutes / totals.activeMinutes) * 100) : 0;
  const actionMinutes = totals.reduceMinutes + totals.avoidMinutes;
  return [
    {
      label: "Focus",
      title: focusShare >= 50 ? "Your board is leaning toward proactive work." : "Protect more Proactive time.",
      detail: `${focusShare}% of active time is in Focus. Recurring stress is a planning signal.`,
      tone: focusShare >= 50 ? "calm" : "warn",
    },
    {
      label: "Clean Up",
      title: actionMinutes ? "Some work is ready to shrink or stop." : "No Reduce/Avoid time active right now.",
      detail: actionMinutes ? `${actionMinutes} minutes are marked for reduction or avoidance.` : "Low-value work is clear right now.",
      tone: actionMinutes ? "warn" : "focus",
    },
  ];
}

function reportInsight(completedTasks, bestQuadrant) {
  if (!completedTasks.length) {
    return [
      {
        label: "Report",
        title: "Complete tasks to build your reflection.",
        detail: "The report mirrors the same matrix so patterns stay visible.",
        tone: "focus",
      },
    ];
  }

  const actionCount = completedTasks.filter((task) => isReduceQuadrant(task.quadrant) || isAvoidQuadrant(task.quadrant)).length;
  return [
    {
      label: "Pattern",
      title: bestQuadrant ? `${QUADRANTS[bestQuadrant].title} is your top result.` : "Results are balanced.",
      detail: "This shows whether the day was reactive, proactive, reduced, or avoided.",
      tone: bestQuadrant === "proactive" ? "calm" : "focus",
    },
    {
      label: "Action",
      title: `${actionCount} completed task${actionCount === 1 ? "" : "s"} were Reduce/Avoid.`,
      detail: actionCount ? "These are good candidates for simplification, delegation, blocking, or removal." : "No completed tasks needed shrink-or-stop treatment in this range.",
      tone: actionCount ? "warn" : "calm",
    },
  ];
}

function renderMatrixBoard() {
  const activeTasks = state.tasks.filter((task) => task.status === "active");
  const totalMinutes = sumMinutes(activeTasks);

  // Perspective Switcher synchronization
  const switcher = elements.matrixPerspectiveSwitcher || document.getElementById("matrixPerspectiveSwitcher");
  if (switcher) {
    switcher.querySelectorAll(".matrix-perspective-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.matrixPerspective === matrixPerspective);
    });
  }

  const focusDock = elements.matrixFocusDock || document.getElementById("matrixFocusDock");
  const matrixWrap = elements.matrixWrap || document.getElementById("matrixWrap");
  const radarContainer = elements.matrixRadarContainer || document.getElementById("matrixRadarContainer");
  const horizonContainer = elements.matrixHorizonContainer || document.getElementById("matrixHorizonContainer");

  // Handle Radar Perspective
  if (matrixPerspective === "radar") {
    if (matrixWrap) matrixWrap.classList.add("is-hidden");
    if (horizonContainer) horizonContainer.classList.add("is-hidden");
    if (focusDock) focusDock.classList.add("is-hidden");
    if (radarContainer) {
      radarContainer.classList.remove("is-hidden");
      renderMatrixRadar(activeTasks, totalMinutes);
    }
    return;
  }

  // Handle Horizon Perspective
  if (matrixPerspective === "horizon") {
    if (matrixWrap) matrixWrap.classList.add("is-hidden");
    if (radarContainer) radarContainer.classList.add("is-hidden");
    if (focusDock) focusDock.classList.add("is-hidden");
    if (horizonContainer) {
      horizonContainer.classList.remove("is-hidden");
      renderMatrixHorizon(activeTasks, totalMinutes);
    }
    return;
  }

  // Bento Grid Mode (Default & Dynamic)
  if (radarContainer) radarContainer.classList.add("is-hidden");
  if (horizonContainer) horizonContainer.classList.add("is-hidden");
  if (matrixWrap) matrixWrap.classList.remove("is-hidden");
  if (focusDock) focusDock.classList.remove("is-hidden");

  // Synchronize Focus Dock Pills
  if (focusDock) {
    focusDock.querySelectorAll(".focus-dock-pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill.dataset.focusQuadrant === matrixFocusQuadrant);
    });
  }

  const matrixBoardEl = elements.matrixBoard || document.getElementById("matrixBoard");
  if (matrixBoardEl) {
    if (matrixFocusQuadrant !== "all") {
      matrixBoardEl.className = `matrix-board has-focus-quadrant focus-${matrixFocusQuadrant}`;
    } else {
      matrixBoardEl.className = "matrix-board";
    }

    matrixBoardEl.innerHTML = PRIMARY_QUADRANT_ORDER.map((quadrantId) => {
      const quadrant = QUADRANTS[quadrantId];
      const allTasks = orderedTasksForQuadrant(activeTasks, quadrantId);
      const visibleTasks = filterTasksForQuadrant(allTasks, quadrantId);
      const quadrantMinutes = sumMinutes(allTasks);
      return quadrantTemplate(quadrant, visibleTasks, percent(quadrantMinutes, totalMinutes), "matrix", allTasks);
    }).join("");

    wireMatrixInteractions();
  }
}

function wireMatrixPerspectiveEvents() {
  const switcher = elements.matrixPerspectiveSwitcher || document.getElementById("matrixPerspectiveSwitcher");
  if (switcher && !switcher.dataset.wired) {
    switcher.dataset.wired = "true";
    switcher.addEventListener("click", (e) => {
      const btn = e.target.closest(".matrix-perspective-btn");
      if (!btn) return;
      const newPerspective = btn.dataset.matrixPerspective;
      if (newPerspective && newPerspective !== matrixPerspective) {
        matrixPerspective = newPerspective;
        localStorage.setItem("tm_matrix_perspective", newPerspective);
        showToast(`Perspective: ${newPerspective.toUpperCase()}`);
        renderMatrixBoard();
      }
    });
  }

  const focusDock = elements.matrixFocusDock || document.getElementById("matrixFocusDock");
  if (focusDock && !focusDock.dataset.wired) {
    focusDock.dataset.wired = "true";
    focusDock.addEventListener("click", (e) => {
      const pill = e.target.closest(".focus-dock-pill");
      if (!pill) return;
      const q = pill.dataset.focusQuadrant;
      if (q) {
        matrixFocusQuadrant = q;
        renderMatrixBoard();
      }
    });
  }
}

function renderMatrixRadar(activeTasks, totalMinutes) {
  const container = elements.matrixRadarContainer || document.getElementById("matrixRadarContainer");
  if (!container) return;

  const qTasks = {
    reactive: activeTasks.filter((t) => t.quadrant === "reactive"),
    proactive: activeTasks.filter((t) => t.quadrant === "proactive"),
    deceptive: activeTasks.filter((t) => t.quadrant === "deceptive"),
    escapist: activeTasks.filter((t) => t.quadrant === "escapist"),
  };

  const q2Minutes = sumMinutes(qTasks.proactive);
  const q2Share = totalMinutes > 0 ? Math.round((q2Minutes / totalMinutes) * 100) : 0;
  const q1Count = qTasks.reactive.length;

  let selectedTask = activeTasks.find((t) => t.id === radarHoverTaskId) ||
    [...activeTasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))[0] ||
    null;

  const cx = 450;
  const cy = 300;

  function taskCoords(task, idx, totalInQ, quadrantId) {
    let minAngle = 0;
    let maxAngle = 0;
    let baseColor = "#3b82f6";
    if (quadrantId === "proactive") { minAngle = -75; maxAngle = -15; baseColor = "#10b981"; }
    else if (quadrantId === "reactive") { minAngle = -165; maxAngle = -105; baseColor = "#ef4444"; }
    else if (quadrantId === "deceptive") { minAngle = 105; maxAngle = 165; baseColor = "#f59e0b"; }
    else if (quadrantId === "escapist") { minAngle = 15; maxAngle = 75; baseColor = "#8b5cf6"; }

    const rank = PRIORITY_ORDER[task.priority] ?? 2;
    const r = 80 + (rank * 30) + ((idx % 3) * 16);
    const span = maxAngle - minAngle;
    const step = totalInQ > 1 ? span / (totalInQ + 1) : span / 2;
    const angleDeg = minAngle + (step * (idx + 1));
    const angleRad = (angleDeg * Math.PI) / 180;

    const x = cx + r * Math.cos(angleRad);
    const y = cy + r * Math.sin(angleRad);
    return { x: Math.round(x), y: Math.round(y), color: baseColor, r };
  }

  let nodesSvg = "";
  PRIMARY_QUADRANT_ORDER.forEach((qId) => {
    const tasksInQ = qTasks[qId];
    tasksInQ.forEach((task, idx) => {
      const { x, y, color } = taskCoords(task, idx, tasksInQ.length, qId);
      const isSelected = selectedTask && selectedTask.id === task.id;
      const pLabel = task.priority ? task.priority.replace("Priority ", "P") : "P3";
      const nodeRadius = isSelected ? 17 : 13;

      nodesSvg += `
        <g class="radar-node-group ${isSelected ? 'is-selected' : ''}" data-radar-task-id="${task.id}" transform="translate(${x}, ${y})">
          <circle class="radar-node-pulse" r="${nodeRadius + 7}" fill="${color}" opacity="0.2"></circle>
          <circle class="radar-node-halo" r="${nodeRadius + 3}" stroke="${color}" stroke-width="2" fill="none" opacity="0.6"></circle>
          <circle class="radar-node-core" r="${nodeRadius}" fill="${color}"></circle>
          <text class="radar-node-label" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-size="10" font-weight="800">${pLabel}</text>
        </g>
      `;
    });
  });

  let hudCardHtml = "";
  if (selectedTask) {
    const qInfo = QUADRANTS[selectedTask.quadrant] || { title: "Task", action: "Focus" };
    hudCardHtml = `
      <div class="radar-hud-card">
        <div class="radar-hud-header">
          <span class="radar-hud-kicker">${escapeHtml(qInfo.title)} • ${escapeHtml(qInfo.action)}</span>
          <span class="radar-hud-priority ${taskPriorityClass(selectedTask.priority)}">${escapeHtml(shortPriorityLabel(selectedTask.priority))}</span>
        </div>
        <h4 class="radar-hud-title">${escapeHtml(selectedTask.title)}</h4>
        <div class="radar-hud-meta">
          <span>⏱ ${selectedTask.minutes || 30} mins</span>
          ${selectedTask.tacticalStep ? `<span class="radar-hud-step">⚡ ${escapeHtml(selectedTask.tacticalStep)}</span>` : ''}
        </div>
        <div class="radar-hud-actions">
          <button type="button" class="primary-button small-action-button radar-btn-focus" data-focus-task-id="${selectedTask.id}">▶ Start Focus</button>
          <button type="button" class="icon-button small-action-button radar-btn-done" data-complete-task-id="${selectedTask.id}">✓ Done</button>
          <button type="button" class="icon-button small-action-button radar-btn-edit" data-edit-task-id="${selectedTask.id}">✎ Edit</button>
        </div>
      </div>
    `;
  } else {
    hudCardHtml = `
      <div class="radar-hud-card is-empty">
        <p class="radar-hud-empty-text">Click any glowing radar node to inspect telemetry and launch focus sprint.</p>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="radar-deck-layout">
      <!-- Radar Telemetry Top Strip -->
      <div class="radar-telemetry-strip">
        <div class="radar-telemetry-item">
          <span class="radar-tele-label">ACTIVE ENERGY NODES</span>
          <strong class="radar-tele-val">${activeTasks.length} Tasks</strong>
        </div>
        <div class="radar-telemetry-item">
          <span class="radar-tele-label">FOCUS ENGINE (Q2)</span>
          <strong class="radar-tele-val tele-proactive">${q2Share}% / ${q2Minutes}m</strong>
        </div>
        <div class="radar-telemetry-item">
          <span class="radar-tele-label">CRISIS LOAD (Q1)</span>
          <strong class="radar-tele-val ${q1Count > 0 ? 'tele-crisis' : ''}">${q1Count} Urgent</strong>
        </div>
        <div class="radar-telemetry-item">
          <span class="radar-tele-label">COGNITIVE ENTROPY</span>
          <strong class="radar-tele-val">${q2Share >= 50 ? '🟢 Optimal Focus' : (q1Count > 2 ? '🔴 High Friction' : '🟡 Balanced')}</strong>
        </div>
      </div>

      <!-- Main Radar Canvas & HUD Stage -->
      <div class="radar-stage-wrap">
        <svg class="radar-svg-canvas" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.12" />
              <stop offset="100%" stop-color="transparent" stop-opacity="0" />
            </radialGradient>
            <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.8" />
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="radarSweepFan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22" />
              <stop offset="100%" stop-color="transparent" stop-opacity="0" />
            </linearGradient>
          </defs>

          <!-- Quadrant Background Zones -->
          <rect x="450" y="50" width="400" height="250" fill="#10b981" fill-opacity="0.04" rx="16" />
          <rect x="50" y="50" width="400" height="250" fill="#ef4444" fill-opacity="0.04" rx="16" />
          <rect x="50" y="300" width="400" height="250" fill="#f59e0b" fill-opacity="0.03" rx="16" />
          <rect x="450" y="300" width="400" height="250" fill="#8b5cf6" fill-opacity="0.03" rx="16" />

          <!-- Concentric Distance Rings -->
          <circle cx="450" cy="300" r="250" fill="url(#radarCenterGlow)" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6"></circle>
          <circle cx="450" cy="300" r="180" fill="none" stroke="var(--line)" stroke-width="1.2" opacity="0.5"></circle>
          <circle cx="450" cy="300" r="110" fill="none" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.5"></circle>
          <circle cx="450" cy="300" r="45" fill="color-mix(in srgb, var(--accent) 15%, transparent)" stroke="var(--accent)" stroke-width="1.5"></circle>
          <text x="450" y="304" text-anchor="middle" fill="var(--accent)" font-size="9" font-weight="900" letter-spacing="1">CORE</text>

          <!-- Axes Crosshairs -->
          <line x1="450" y1="35" x2="450" y2="565" stroke="var(--line-strong)" stroke-width="1.5" opacity="0.8"></line>
          <line x1="40" y1="300" x2="860" y2="300" stroke="var(--line-strong)" stroke-width="1.5" opacity="0.8"></line>

          <!-- Animated Radar Sweep Fan -->
          <g class="radar-sweep-anim">
            <line x1="450" y1="300" x2="450" y2="50" stroke="url(#radarSweepGrad)" stroke-width="2.5"></line>
            <path d="M 450 300 L 450 50 A 250 250 0 0 1 626 123 Z" fill="url(#radarSweepFan)"></path>
          </g>

          <!-- Quadrant Watermarks -->
          <text x="820" y="75" text-anchor="end" fill="#10b981" font-size="11" font-weight="800" opacity="0.7">Q2 PROACTIVE (DEEP WORK)</text>
          <text x="80" y="75" text-anchor="start" fill="#ef4444" font-size="11" font-weight="800" opacity="0.7">Q1 REACTIVE (CRISIS)</text>
          <text x="80" y="535" text-anchor="start" fill="#f59e0b" font-size="11" font-weight="800" opacity="0.7">Q3 DECEPTIVE (REDUCE)</text>
          <text x="820" y="535" text-anchor="end" fill="#8b5cf6" font-size="11" font-weight="800" opacity="0.7">Q4 ESCAPIST (AVOID)</text>

          <!-- Axis Polar Badges -->
          <text x="450" y="24" text-anchor="middle" fill="var(--ink)" font-size="10" font-weight="800">▲ HIGH IMPORTANCE</text>
          <text x="450" y="585" text-anchor="middle" fill="var(--muted)" font-size="10" font-weight="800">▼ LOW IMPORTANCE</text>
          <text x="45" y="295" text-anchor="start" fill="var(--ink)" font-size="10" font-weight="800">◄ HIGH URGENCY</text>
          <text x="855" y="295" text-anchor="end" fill="var(--muted)" font-size="10" font-weight="800">NOT URGENT ►</text>

          <!-- Dynamic Task Nodes -->
          ${nodesSvg}
        </svg>

        <!-- Floating HUD Overlay Inspector -->
        <div class="radar-hud-overlay">
          ${hudCardHtml}
        </div>
      </div>
    </div>
  `;

  // Wire Radar Click Events
  container.querySelectorAll(".radar-node-group").forEach((node) => {
    node.addEventListener("click", () => {
      const taskId = node.dataset.radarTaskId;
      radarHoverTaskId = taskId;
      renderMatrixRadar(activeTasks, totalMinutes);
    });
  });

  const focusBtn = container.querySelector(".radar-btn-focus");
  if (focusBtn) {
    focusBtn.addEventListener("click", () => {
      const taskId = focusBtn.dataset.focusTaskId;
      startPomodoroForTask(taskId);
    });
  }

  const doneBtn = container.querySelector(".radar-btn-done");
  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      const taskId = doneBtn.dataset.completeTaskId;
      completeTask(taskId);
    });
  }

  const editBtn = container.querySelector(".radar-btn-edit");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const taskId = editBtn.dataset.editTaskId;
      expandedTaskId = taskId;
      matrixPerspective = "bento";
      localStorage.setItem("tm_matrix_perspective", "bento");
      render();
    });
  }
}

function renderMatrixHorizon(activeTasks, totalMinutes) {
  const container = elements.matrixHorizonContainer || document.getElementById("matrixHorizonContainer");
  if (!container) return;

  const curHour = new Date().getHours();
  const phases = [
    {
      id: "phase-1",
      quadrantId: "reactive",
      icon: "🚨",
      time: "08:00 - 10:00",
      title: "Morning Kickoff & Crisis Clearing",
      sub: "Stabilize fires, unblock team, zero out urgent risks",
      mantra: "Stabilize → Decide → Prevent repeat",
      isActive: (curHour >= 8 && curHour < 10),
      color: "#ef4444",
    },
    {
      id: "phase-2",
      quadrantId: "proactive",
      icon: "🚀",
      time: "10:00 - 14:00",
      title: "Deep Work Meridian & Focus Sanctuary",
      sub: "High-leverage architecture, planning & deep execution",
      mantra: "Plan → Protect time → Deep work",
      isActive: (curHour >= 10 && curHour < 14),
      color: "#10b981",
    },
    {
      id: "phase-3",
      quadrantId: "deceptive",
      icon: "☕",
      time: "14:00 - 16:30",
      title: "Afternoon Routine & Coordination",
      sub: "Meetings, incoming requests, delegated tasks & admin",
      mantra: "Simplify → Delegate → Eliminate",
      isActive: (curHour >= 14 && curHour < 17),
      color: "#f59e0b",
    },
    {
      id: "phase-4",
      quadrantId: "escapist",
      icon: "🌙",
      time: "16:30 - 18:00",
      title: "Evening Review & Reset",
      sub: "Archive notes, decompress, prep tomorrow's matrix",
      mantra: "Avoid → Limit → Redirect to Q2",
      isActive: (curHour >= 17 || curHour < 8),
      color: "#8b5cf6",
    },
  ];

  let lanesHtml = phases.map((phase) => {
    const qTasks = activeTasks.filter((t) => t.quadrant === phase.quadrantId);
    const qMinutes = sumMinutes(qTasks);
    const taskCards = qTasks.length ? qTasks.map((task) => `
      <div class="horizon-task-card ${taskPriorityClass(task.priority)}" data-task-id="${task.id}">
        <div class="horizon-task-top">
          <span class="horizon-priority-chip">${escapeHtml(shortPriorityLabel(task.priority))}</span>
          <span class="horizon-time-chip">${task.minutes || 30}m</span>
        </div>
        <h5 class="horizon-task-title">${escapeHtml(task.title)}</h5>
        ${task.tacticalStep ? `<div class="horizon-step-pill">⚡ ${escapeHtml(task.tacticalStep)}</div>` : ''}
        <div class="horizon-card-actions">
          <button type="button" class="horizon-action-btn btn-focus" data-focus-task-id="${task.id}" title="Focus Timer">▶</button>
          <button type="button" class="horizon-action-btn btn-done" data-complete-task-id="${task.id}" title="Done">✓</button>
        </div>
      </div>
    `).join("") : `
      <div class="horizon-empty-lane">
        <span>No active tasks in this phase</span>
      </div>
    `;

    return `
      <div class="horizon-lane ${phase.isActive ? 'is-active-phase' : ''}" style="--phase-color: ${phase.color};">
        <div class="horizon-lane-header">
          <div class="horizon-time-badge">
            <span>${phase.time}</span>
            ${phase.isActive ? '<span class="horizon-live-beacon">LIVE NOW</span>' : ''}
          </div>
          <h4 class="horizon-lane-title">${phase.icon} ${phase.title}</h4>
          <p class="horizon-lane-sub">${phase.sub}</p>
          <div class="horizon-lane-stats">
            <span>${qTasks.length} tasks • ${qMinutes} min</span>
            <span class="horizon-mantra">${phase.mantra}</span>
          </div>
        </div>
        <div class="horizon-lane-body">
          ${taskCards}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="horizon-deck-wrapper">
      <div class="horizon-deck-header">
        <div>
          <h3 class="horizon-deck-title">Horizon Chrono-Flow Stream</h3>
          <p class="horizon-deck-sub">Your matrix tasks mapped into today's biological daily execution rhythm.</p>
        </div>
        <div class="horizon-deck-legend">
          <span class="legend-live-dot"></span>
          <span>Current active time window highlighted</span>
        </div>
      </div>
      <div class="horizon-lanes-grid">
        ${lanesHtml}
      </div>
    </div>
  `;

  // Wire Horizon Buttons
  container.querySelectorAll(".btn-focus").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startPomodoroForTask(btn.dataset.focusTaskId);
    });
  });

  container.querySelectorAll(".btn-done").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      completeTask(btn.dataset.completeTaskId);
    });
  });

  container.querySelectorAll(".horizon-task-card").forEach((card) => {
    card.addEventListener("click", () => {
      expandedTaskId = card.dataset.taskId;
      matrixPerspective = "bento";
      localStorage.setItem("tm_matrix_perspective", "bento");
      render();
    });
  });
}

function renderReportBoard() {
  const completedTasks = filteredCompletedTasks();
  const totalMinutes = sumMinutes(completedTasks);
  if (elements.reportSubtitle) {
    elements.reportSubtitle.textContent = reportSubtitle(completedTasks.length);
  }

  const reportBoardEl = elements.reportBoard || document.getElementById("reportBoard");
  if (reportBoardEl) {
    reportBoardEl.innerHTML = PRIMARY_QUADRANT_ORDER.map((quadrantId) => {
      const quadrant = QUADRANTS[quadrantId];
      const tasks = orderedTasksForQuadrant(completedTasks, quadrantId);
      const quadrantMinutes = sumMinutes(tasks);
      return quadrantTemplate(quadrant, tasks, percent(quadrantMinutes, totalMinutes), "report");
    }).join("");
    wireReportInteractions(reportBoardEl);
  }
}

function renderOpenQuadrant(shouldFocus = false) {
  if (!openQuadrant) return;

  const data = quadrantRenderData(openQuadrant.quadrantId, openQuadrant.mode);
  if (!data) {
    closeQuadrantDetail(false);
    return;
  }

  const { quadrant, tasks, allTasks, share, quadrantMinutes } = data;
  const isReport = openQuadrant.mode === "report";
  const taskLabel = allTasks.length === 1 ? "task" : "tasks";
  const visibleTasks = !isReport && tasks.length !== allTasks.length;
  const taskValue = visibleTasks ? `${tasks.length} visible` : `${allTasks.length} ${taskLabel}`;
  const taskView = boardUi.openQuadrantTaskView === "detailed" ? "detailed" : "compact";

  elements.quadrantModal.classList.remove("is-hidden");
  document.body.classList.add("has-open-modal");
  elements.quadrantModalMode.textContent = isReport ? "Report" : "Matrix";
  elements.quadrantModalTitle.textContent = quadrant.title;
  elements.quadrantModalSubtitle.textContent = `${quadrant.axes} / ${taskValue} / ${minutesLabel(quadrantMinutes)} / ${share}`;
  elements.quadrantModalStats.hidden = true;
  elements.quadrantModalStats.innerHTML = "";
  renderQuadrantTaskViewToggle();
  elements.quadrantModalBody.innerHTML = quadrantTemplate(
    quadrant,
    tasks,
    share,
    openQuadrant.mode,
    allTasks,
    { hideHeader: true, isPopup: true, taskView },
  );

  if (isReport) {
    wireReportInteractions(elements.quadrantModalBody, { allowQuadrantOpen: false });
  } else {
    wireMatrixInteractions(elements.quadrantModalBody, { allowQuadrantOpen: false });
  }

  if (shouldFocus) {
    requestAnimationFrame(() => elements.quadrantModalClose.focus());
  }
}

function quadrantRenderData(quadrantId, mode) {
  const quadrant = QUADRANTS[quadrantId];
  if (!quadrant) return null;

  const isReport = mode === "report";
  const sourceTasks = isReport
    ? filteredCompletedTasks()
    : state.tasks.filter((task) => task.status === "active");
  const totalMinutes = sumMinutes(sourceTasks);
  const allTasks = orderedTasksForQuadrant(sourceTasks, quadrantId);
  const tasks = isReport ? allTasks : filterTasksForQuadrant(allTasks, quadrantId);
  const quadrantMinutes = sumMinutes(allTasks);

  return {
    quadrant,
    tasks,
    allTasks,
    share: percent(quadrantMinutes, totalMinutes),
    quadrantMinutes,
    totalMinutes,
  };
}

function quadrantModalStat(label, value, detail) {
  return `
    <article class="quadrant-modal-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
}

function prioritySummaryTemplate(summary, totalMinutes) {
  const totalWeight = totalMinutes || summary.reduce((total, item) => total + item.count, 0);
  return `
    <section class="priority-summary" aria-label="Priority summary">
      <div class="priority-summary-head">
        <span>Priority Mix</span>
        <strong>${summary.map((item) => `${shortPriorityLabel(item.label)}:${item.count}`).join(" / ")}</strong>
      </div>
      <div class="priority-meter" aria-hidden="true">
        ${summary.map((item) => {
    const value = totalMinutes ? item.minutes : item.count;
    const width = totalWeight && value ? Math.max(4, Math.round((value / totalWeight) * 100)) : 0;
    return `<span class="${priorityClass(item.label)}" style="width:${width}%"></span>`;
  }).join("")}
      </div>
      <div class="priority-breakdown">
        ${summary.map((item) => `
          <span class="priority-chip ${priorityClass(item.label)}">${escapeHtml(item.label)}: ${item.count} / ${escapeHtml(minutesLabel(item.minutes))}</span>
        `).join("")}
      </div>
    </section>
  `;
}

function openQuadrantDetail(quadrantId, mode, trigger = null) {
  if (!QUADRANTS[quadrantId]) return;

  quadrantModalReturnFocus = trigger || document.activeElement;
  openQuadrant = {
    quadrantId,
    mode: mode === "report" ? "report" : "matrix",
  };
  renderOpenQuadrant(true);
}

function closeQuadrantDetail(restoreFocus = true) {
  const returnFocus = quadrantModalReturnFocus;

  openQuadrant = null;
  quadrantModalReturnFocus = null;
  elements.quadrantModal.classList.add("is-hidden");
  document.body.classList.remove("has-open-modal");
  elements.quadrantModalStats.hidden = false;
  elements.quadrantModalStats.innerHTML = "";
  elements.quadrantModalBody.innerHTML = "";

  if (restoreFocus && returnFocus && document.contains(returnFocus) && typeof returnFocus.focus === "function") {
    returnFocus.focus();
  }
}

function wireQuadrantModalInteractions() {
  elements.quadrantModal.querySelectorAll("[data-close-quadrant-modal]").forEach((control) => {
    control.addEventListener("click", () => closeQuadrantDetail());
  });

  elements.quadrantTaskViewToggle?.querySelectorAll("[data-task-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.taskView === "detailed" ? "detailed" : "compact";
      if (boardUi.openQuadrantTaskView === view) return;
      boardUi.openQuadrantTaskView = view;
      persistBoardUi();
      renderOpenQuadrant();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openQuadrant) {
      closeQuadrantDetail();
    }
  });
}

function renderQuadrantTaskViewToggle() {
  const view = boardUi.openQuadrantTaskView === "detailed" ? "detailed" : "compact";
  elements.quadrantTaskViewToggle?.querySelectorAll("[data-task-view]").forEach((button) => {
    const isActive = button.dataset.taskView === view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function wireQuadrantOpenInteractions(root) {
  root.querySelectorAll("[data-open-quadrant]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openQuadrantDetail(button.dataset.openQuadrant, button.dataset.openMode, button);
    });
  });

  root.querySelectorAll(".quadrant").forEach((quadrant) => {
    if (quadrant.classList.contains("is-expanded")) return;

    quadrant.addEventListener("click", (event) => {
      if (event.defaultPrevented || Date.now() - recentTaskDragEndedAt < 350 || shouldIgnoreQuadrantOpen(event.target)) return;
      openQuadrantDetail(quadrant.dataset.quadrant, quadrant.dataset.mode, quadrant);
    });
  });
}

function wireQuadrantResizeDocumentInteractions() {
  document.addEventListener("pointermove", (event) => {
    if (!quadrantResizeState) return;
    const delta = event.clientY - quadrantResizeState.startY;
    const nextHeight = clampQuadrantHeight(
      quadrantResizeState.group,
      quadrantResizeState.startHeight + delta,
    );
    setQuadrantHeight(quadrantResizeState.group, nextHeight);
    applyQuadrantHeights();
  });

  ["pointerup", "pointercancel"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (!quadrantResizeState) return;
      quadrantResizeState = null;
      document.body.classList.remove("is-resizing-quadrant");
      persistBoardUi();
    });
  });
}

function wireQuadrantResizeInteractions(root) {
  root.querySelectorAll("[data-resize-group]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const group = handle.dataset.resizeGroup === "action" ? "action" : "primary";
      quadrantResizeState = {
        group,
        startY: event.clientY,
        startHeight: quadrantHeightForGroup(group),
      };
      document.body.classList.add("is-resizing-quadrant");
    });
  });
}

function applyQuadrantHeights() {
  const primaryHeight = clampQuadrantHeight("primary", boardUi.primaryQuadrantHeight);
  const actionHeight = clampQuadrantHeight("action", boardUi.actionQuadrantHeight);
  boardUi.primaryQuadrantHeight = primaryHeight;
  boardUi.actionQuadrantHeight = actionHeight;
  elements.appShell.style.setProperty("--primary-quadrant-height", `${primaryHeight}px`);
  elements.appShell.style.setProperty("--action-quadrant-height", `${actionHeight}px`);
}

function quadrantHeightForGroup(group) {
  return group === "action"
    ? clampQuadrantHeight("action", boardUi.actionQuadrantHeight)
    : clampQuadrantHeight("primary", boardUi.primaryQuadrantHeight);
}

function setQuadrantHeight(group, height) {
  if (group === "action") {
    boardUi.actionQuadrantHeight = clampQuadrantHeight("action", height);
  } else {
    boardUi.primaryQuadrantHeight = clampQuadrantHeight("primary", height);
  }
}

function clampQuadrantHeight(group, height) {
  const fallback = group === "action" ? 560 : 640;
  const minimum = group === "action" ? 440 : 500;
  const parsed = Number(height);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(1200, Math.round(parsed)));
}

function shouldIgnoreQuadrantOpen(target) {
  if (!(target instanceof Element)) return true;

  return Boolean(target.closest(`
    button,
    input,
    select,
    textarea,
    label,
    a,
    [contenteditable="true"],
    .task-card,
    .task-list,
    .task-form,
    .quadrant-tools
  `));
}

function quadrantDefaultPriority(quadrantId) {
  switch (quadrantId) {
    case "reactive":
      return "Priority 1";
    case "proactive":
      return "Priority 2";
    case "deceptive":
      return "Priority 3";
    case "escapist":
      return "Priority 4";
    default:
      return "Priority 3";
  }
}

function renderQuadrantPriorityFilterChips(quadrantId, allTasks, currentFilter) {
  if (!allTasks || allTasks.length === 0) return "";

  const counts = {
    "Priority 1": 0,
    "Priority 2": 0,
    "Priority 3": 0,
    "Priority 4": 0,
    "Priority 5": 0,
  };
  allTasks.forEach((t) => {
    const p = normalizePriority(t.priority);
    if (counts[p] !== undefined) counts[p]++;
  });

  const isAll = currentFilter === "all";
  const chips = [
    `<button type="button" class="q-pri-chip ${isAll ? "is-active" : ""}" data-set-priority-filter="${quadrantId}" data-priority="all" title="Show all ${allTasks.length} tasks">All</button>`
  ];

  const meta = [
    { key: "Priority 1", label: "🔥 P1", count: counts["Priority 1"] },
    { key: "Priority 2", label: "⚡ P2", count: counts["Priority 2"] },
    { key: "Priority 3", label: "🎯 P3", count: counts["Priority 3"] },
    { key: "Priority 4", label: "☕ P4", count: counts["Priority 4"] },
  ];

  meta.forEach((m) => {
    if (m.count > 0) {
      const active = currentFilter === m.key ? "is-active" : "";
      const priCss = priorityClass(m.key);
      chips.push(
        `<button type="button" class="q-pri-chip ${priCss} ${active}" data-set-priority-filter="${quadrantId}" data-priority="${m.key}" title="Filter by ${m.key}">${m.label} <span class="q-pri-count">${m.count}</span></button>`
      );
    }
  });

  return `<div class="quadrant-priority-chips" aria-label="Priority filters">${chips.join("")}</div>`;
}

function extractStrategyBadge(title) {
  const match = String(title || "").match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return {
      tag: match[1],
      cleanTitle: match[2],
    };
  }
  return null;
}

function quadrantStrategyDockTemplate(quadrant) {
  const strategies = quadrant.strategies || [];
  if (!strategies.length) return "";

  const tooltips = {
    "Stabilize": "Contain crisis immediately before long-term planning",
    "Decide": "Make rapid high-agency decisions within 15 mins",
    "Prevent repeat": "Fix root cause and schedule preventative system in Q2",
    "Plan": "Architect future outcomes with high-leverage proactive design",
    "Protect time": "Block uninterrupted calendar deep-work sprints",
    "Deep work": "High cognitive flow state with zero notifications",
    "Simplify": "Cut unnecessary complexity and streamline requests",
    "Delegate": "Empower others or automate repetitive tasks",
    "Eliminate": "Politely decline low-impact urgent demands",
    "Avoid": "Filter out mindless rabbit holes and habit loops",
    "Limit": "Set hard stop limits for restorative breaks",
    "Redirect to Q2": "Channel low-energy time into learning or restorative rest",
  };

  const icons = {
    "Stabilize": "🛡️",
    "Decide": "⚡",
    "Prevent repeat": "🔄",
    "Plan": "🎯",
    "Protect time": "🔒",
    "Deep work": "🧠",
    "Simplify": "✂️",
    "Delegate": "🤝",
    "Eliminate": "🚫",
    "Avoid": "🛑",
    "Limit": "⏳",
    "Redirect to Q2": "↗️",
  };

  return `
    <footer class="quadrant-strategy-dock" data-dock="${quadrant.id}">
      <div class="strategy-dock-pills" role="toolbar" aria-label="${escapeHtml(quadrant.title)} Execution Playbook">
        <span class="strategy-dock-kicker" title="Tactical Framework: Click any step to auto-tag new task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="strategy-kicker-icon">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <span>Tactical Steps:</span>
        </span>
        ${strategies.map((strategy, index) => {
          const tip = tooltips[strategy] || `Step ${index + 1}: ${strategy}`;
          const icon = icons[strategy] || "•";
          return `
            <button type="button" class="strategy-dock-pill" data-apply-strategy="${escapeHtml(strategy)}" data-quadrant="${quadrant.id}" title="${escapeHtml(tip)} — Click to auto-tag task">
              <span class="strategy-pill-step">${index + 1}</span>
              <span class="strategy-pill-icon" aria-hidden="true">${icon}</span>
              <span class="strategy-pill-name">${escapeHtml(strategy)}</span>
            </button>
          `;
        }).join("")}
      </div>
    </footer>
  `;
}

function quadrantTemplate(quadrant, tasks, share, mode, allTasks = tasks, options = {}) {
  const isReport = mode === "report";
  const isPopup = Boolean(options.isPopup);
  const hideHeader = Boolean(options.hideHeader);
  const taskView = options.taskView === "detailed" ? "detailed" : "compact";
  const isDetailedTaskView = isPopup && taskView === "detailed";
  const resizeGroup = "primary";
  const sizingStyle = quadrantSizingStyle(tasks, mode, isPopup);
  const maxMinutes = Math.max(1, ...tasks.map((task) => Number(task.minutes) || 0));
  const taskListClass = tasks.length ? "task-list" : "task-list is-empty";
  const isFilteredEmpty = !isReport && allTasks.length > 0 && tasks.length === 0;
  const densityClass = !isReport && allTasks.length >= 8 ? " has-many-tasks" : "";
  const occupancyClass = allTasks.length ? " has-tasks" : "";
  const popupClass = isPopup ? " is-expanded" : "";
  const modeLabel = isReport ? "report" : "matrix";
  const openButton = isPopup ? "" : `
    <button
      class="quadrant-open-button"
      type="button"
      data-open-quadrant="${quadrant.id}"
      data-open-mode="${mode}"
      title="Open ${escapeHtml(quadrant.title)} ${modeLabel}"
      aria-label="Open ${escapeHtml(quadrant.title)} ${modeLabel}"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3H3v5M3 3l7 7M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7M16 21h5v-5M21 21l-7-7" />
      </svg>
    </button>
  `;
  const resizeHandle = isPopup ? "" : `
    <button
      class="quadrant-resize-handle"
      type="button"
      data-resize-group="${resizeGroup}"
      title="Drag to change max quadrant height"
      aria-label="Drag to change max quadrant height"
    >
      <span></span>
    </button>
  `;
  const taskMarkup = tasks.length
    ? tasks.map((task) => (
      isReport
        ? reportTaskTemplate(task, { isDetailed: isDetailedTaskView, isPopup, maxMinutes })
        : activeTaskTemplate(task, { isDetailed: isDetailedTaskView, isPopup, maxMinutes })
    )).join("")
    : emptyStateTemplate(quadrant, isReport, isFilteredEmpty);

  return `
    <article class="quadrant${densityClass}${occupancyClass}${popupClass}" data-quadrant="${quadrant.id}" data-mode="${mode}"${sizingStyle}>
      ${isPopup ? "" : `<div class="quadrant-backdrop" aria-hidden="true">
        ${(quadrant.backgroundWords || []).map((word) => `<span>${escapeHtml(word)}</span>`).join("")}
      </div>`}
      ${hideHeader ? "" : `<header class="quadrant-header">
        <div>
          <div class="quadrant-kicker">
            <h3 class="quadrant-title">${escapeHtml(quadrant.title)}</h3>
            <span class="action-pill">${escapeHtml(quadrant.action)}</span>
            ${isReport ? "" : renderQuadrantPriorityFilterChips(quadrant.id, allTasks, normalizePriorityFilter(boardUi.priorityFilters[quadrant.id]))}
          </div>
          <p class="quadrant-description">${escapeHtml(quadrant.description)}</p>
        </div>
        <div class="quadrant-header-actions">
          <strong class="quadrant-axis-label">${escapeHtml(quadrant.axes)}</strong>
          <div class="quadrant-stat">
            <strong>${escapeHtml(share)}</strong>
            <span>${isReport ? "Done" : "Time"}</span>
          </div>
          ${openButton}
        </div>
      </header>`}

      ${isReport ? "" : taskFormTemplate(quadrant.id)}
      ${isReport ? "" : quadrantToolsTemplate(quadrant.id, allTasks, tasks)}

      <div class="${taskListClass}" data-list="${quadrant.id}">
        ${taskMarkup}
      </div>

      ${isPopup || isReport ? "" : quadrantStrategyDockTemplate(quadrant)}
      ${resizeHandle}
    </article>
  `;
}

function quadrantSizingStyle(tasks, mode, isPopup) {
  if (isPopup) return "";

  const isReport = mode === "report";
  const minimumHeight = isReport ? 300 : 360;
  const listChromeOffset = isReport ? 56 : 140;
  const taskListLimit = `max(260px, calc(var(--primary-quadrant-height) - ${listChromeOffset}px))`;

  return ` style="--quadrant-min-height: ${minimumHeight}px; --task-list-limit: ${taskListLimit};"`;
}

function quadrantToolsTemplate(quadrantId, allTasks, visibleTasks) {
  const query = boardUi.filters[quadrantId] || "";
  const priorityFilter = normalizePriorityFilter(boardUi.priorityFilters[quadrantId]);
  const selectedInQuadrant = allTasks.filter((task) => selectedTaskIds.has(task.id));
  const selectedVisibleCount = visibleTasks.filter((task) => selectedTaskIds.has(task.id)).length;
  const allVisibleSelected = visibleTasks.length > 0 && selectedVisibleCount === visibleTasks.length;
  return `
    <div class="quadrant-tools">
      <label class="select-visible" title="Select visible tasks">
        <input type="checkbox" data-select-visible="${quadrantId}" ${allVisibleSelected ? "checked" : ""} ${visibleTasks.length ? "" : "disabled"} />
        <span>${selectedInQuadrant.length ? `${selectedInQuadrant.length} selected` : `${allTasks.length} task${allTasks.length === 1 ? "" : "s"} / ${minutesLabel(sumMinutes(allTasks))}`}</span>
      </label>
      <input class="task-search" type="search" value="${escapeHtml(query)}" data-filter="${quadrantId}" placeholder="Search tasks" aria-label="Search ${escapeHtml(QUADRANTS[quadrantId].title)} tasks" />
      <select class="priority-filter" data-priority-filter="${quadrantId}" aria-label="Filter ${escapeHtml(QUADRANTS[quadrantId].title)} by priority">
        <option value="all" ${priorityFilter === "all" ? "selected" : ""}>All Priority</option>
        ${PRIORITIES.map((priority) => `<option value="${priority}" ${priorityFilter === priority ? "selected" : ""}>${priority}</option>`).join("")}
      </select>
      <button class="tool-button" type="button" data-bulk-complete="${quadrantId}" ${selectedInQuadrant.length ? "" : "disabled"}>Done</button>
      <button class="tool-button danger" type="button" data-bulk-delete="${quadrantId}" ${selectedInQuadrant.length ? "" : "disabled"}>Delete</button>
    </div>
  `;
}

function taskFormTemplate(quadrantId) {
  const quadrant = QUADRANTS[quadrantId];
  const defaultPri = quadrantDefaultPriority(quadrantId);
  return `
    <form class="task-form" data-form="${quadrantId}">
      <div class="task-input-capsule">
        <button type="submit" class="task-capsule-plus" title="Add task to ${escapeHtml(quadrant.title)}" aria-label="Add task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <input type="text" name="title" autocomplete="off" maxlength="90" placeholder="${escapeHtml(createPlaceholder(quadrantId))}" aria-label="Task title" />
        <div class="task-capsule-priority-wrap" title="Set priority before adding">
          <select name="priority" class="task-capsule-priority-select ${priorityClass(defaultPri)}" data-capsule-priority="${quadrantId}" aria-label="Priority for new task">
            ${priorityOptions(defaultPri)}
          </select>
        </div>
        <div class="task-chrono-capsule-wrap" title="Select task duration (Titanium Chronograph Calibre)">
          <button type="button" class="task-chrono-trigger" data-chrono-trigger="${quadrantId}" aria-label="Task duration calibre">
            <svg class="chrono-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9.5"></circle>
              <polyline points="12 6.5 12 12 15.5 14"></polyline>
            </svg>
            <span class="chrono-val" data-chrono-val="${quadrantId}">25m</span>
            <svg class="chrono-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <input type="hidden" name="minutes" value="25" />
          <div class="task-chrono-deck is-hidden" data-chrono-deck="${quadrantId}" hidden>
            <div class="chrono-deck-header">
              <div class="chrono-deck-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="12" cy="12" r="9.5"></circle>
                  <polyline points="12 6.5 12 12 15.5 14"></polyline>
                </svg>
                <span>CHRONOMETER TIERS</span>
              </div>
              <span class="chrono-calibre-badge">SWISS CALIBRE</span>
            </div>
            <div class="chrono-tier-grid">
              <button type="button" class="chrono-tier-btn" data-chrono-set="15" data-quadrant="${quadrantId}" title="15m Flash Sprint">
                <span class="chrono-tier-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </span>
                <span class="chrono-tier-meta">
                  <strong class="chrono-tier-time">15m</strong>
                  <small class="chrono-tier-name">Flash Sprint</small>
                </span>
              </button>
              <button type="button" class="chrono-tier-btn is-active" data-chrono-set="25" data-quadrant="${quadrantId}" title="25m Focus Block">
                <span class="chrono-tier-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"></circle>
                    <circle cx="12" cy="12" r="4"></circle>
                    <line x1="12" y1="2" x2="12" y2="4"></line>
                    <line x1="12" y1="20" x2="12" y2="22"></line>
                  </svg>
                </span>
                <span class="chrono-tier-meta">
                  <strong class="chrono-tier-time">25m</strong>
                  <small class="chrono-tier-name">Focus Block</small>
                </span>
              </button>
              <button type="button" class="chrono-tier-btn" data-chrono-set="45" data-quadrant="${quadrantId}" title="45m Deep Flow">
                <span class="chrono-tier-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 7v5l3 2"></path>
                    <circle cx="12" cy="12" r="2.2" fill="currentColor"></circle>
                  </svg>
                </span>
                <span class="chrono-tier-meta">
                  <strong class="chrono-tier-time">45m</strong>
                  <small class="chrono-tier-name">Deep Flow</small>
                </span>
              </button>
              <button type="button" class="chrono-tier-btn" data-chrono-set="60" data-quadrant="${quadrantId}" title="60m Milestone">
                <span class="chrono-tier-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"></circle>
                    <polyline points="12 3 12 12 18 12"></polyline>
                    <path d="M16 3l4 4"></path>
                  </svg>
                </span>
                <span class="chrono-tier-meta">
                  <strong class="chrono-tier-time">60m</strong>
                  <small class="chrono-tier-name">Milestone</small>
                </span>
              </button>
            </div>
            <div class="chrono-slider-box">
              <div class="chrono-slider-head">
                <span class="chrono-slider-label">FINE PRECISION JOG-SLIDER</span>
                <span class="chrono-slider-readout" data-slider-readout="${quadrantId}">25 mins</span>
              </div>
              <input type="range" class="chrono-range-slider" min="5" max="180" step="5" value="25" data-chrono-slider="${quadrantId}" aria-label="Fine precision time slider" />
              <div class="chrono-slider-scale">
                <span>5m</span>
                <span>30m</span>
                <span>60m</span>
                <span>90m</span>
                <span>120m</span>
                <span>180m</span>
              </div>
            </div>
            <div class="chrono-quick-pills">
              <button type="button" class="chrono-micro-pill" data-chrono-set="5" data-quadrant="${quadrantId}">5m</button>
              <button type="button" class="chrono-micro-pill" data-chrono-set="10" data-quadrant="${quadrantId}">10m</button>
              <button type="button" class="chrono-micro-pill" data-chrono-set="30" data-quadrant="${quadrantId}">30m</button>
              <button type="button" class="chrono-micro-pill" data-chrono-set="90" data-quadrant="${quadrantId}">90m</button>
              <button type="button" class="chrono-micro-pill" data-chrono-set="120" data-quadrant="${quadrantId}">2 hrs</button>
            </div>
          </div>
        </div>
        <button class="task-capsule-kbd" type="submit" title="Press Enter to add task" aria-label="Add task">
          <svg class="kbd-enter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 10 4 15 9 20"></polyline>
            <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
          </svg>
          <span class="kbd-enter-text">Enter</span>
        </button>
      </div>
      <button class="add-button" type="submit" title="Add to ${escapeHtml(quadrant.title)}" aria-label="Add to ${escapeHtml(quadrant.title)}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </form>
  `;
}

function emptyStateTemplate(quadrant, isReport, isFilteredEmpty = false) {
  const title = isFilteredEmpty ? "No matches in this quadrant" : isReport ? "Nothing completed here yet" : emptyTitle(quadrant.id);
  const detail = isFilteredEmpty ? "Clear or change the search filters." : isReport ? `Completed ${quadrant.title} tasks will land here.` : emptyDetail(quadrant.id);

  const icons = {
    reactive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    proactive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    deceptive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    escapist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`
  };

  const iconSvg = icons[quadrant.id] || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const quickAddBtn = (!isReport && !isFilteredEmpty)
    ? `<button type="button" class="empty-state-quick-add" onclick="window.openQuickAddModal('${quadrant.id}')">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        <span>Add Task</span>
      </button>`
    : "";

  return `
    <div class="empty-state" data-empty-quadrant="${quadrant.id}">
      <div class="empty-state-icon-badge">
        ${iconSvg}
      </div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
      ${quickAddBtn}
    </div>
  `;
}

function filterTasksForQuadrant(tasks, quadrantId) {
  const globalQuery = normalizeSearchQuery(boardUi.globalFilter);
  const query = normalizeSearchQuery(boardUi.filters[quadrantId]);
  const priorityFilter = normalizePriorityFilter(boardUi.priorityFilters[quadrantId]);
  return tasks.filter((task) => {
    if (priorityFilter !== "all" && normalizePriority(task.priority) !== priorityFilter) {
      return false;
    }
    if (globalQuery && !taskMatchesSearch(task, globalQuery)) return false;
    if (query && !taskMatchesSearch(task, query)) return false;
    return true;
  });
}

function normalizeSearchQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function taskMatchesSearch(task, query) {
  const haystack = [
    task.title,
    task.notes,
    task.priority,
    task.productivity,
    task.feeling,
    minutesLabel(task.minutes),
    QUADRANTS[task.quadrant]?.title,
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

function createPlaceholder(quadrantId) {
  if (quadrantId === "reactive") return "Add urgent crisis";
  if (quadrantId === "proactive") return "Add focus work";
  if (quadrantId === "deceptive") return "Add interrupting work";
  if (quadrantId === "escapist") return "Add time waster";
  return "Add task";
}

function emptyTitle(quadrantId) {
  if (quadrantId === "reactive") return "No fires right now";
  if (quadrantId === "proactive") return "Protect this space";
  if (quadrantId === "deceptive") return "Interruptions go here";
  if (quadrantId === "escapist") return "Time wasters go here";
  return "No tasks here";
}

function emptyDetail(quadrantId) {
  if (quadrantId === "reactive") return "Add only work that needs immediate management.";
  if (quadrantId === "proactive") return "Planning, growth, and relationship work belong here.";
  if (quadrantId === "deceptive") return "Capture urgent-looking work that is not goal-critical.";
  if (quadrantId === "escapist") return "Use this when the honest answer is low value.";
  return "Add a task to start sorting the work.";
}

function activeTaskTemplate(task, options = {}) {
  const isExpanded = expandedTaskId === task.id;
  const isDetailed = Boolean(options.isDetailed);
  const isStarred = Boolean(task.isStarred);
  const priority = normalizePriority(task.priority);
  const priorityCss = priorityClass(priority);
  const minutePercent = Math.max(4, Math.round(((Number(task.minutes) || 0) / (options.maxMinutes || 1)) * 100));
  const orderState = taskOrderState(task);
  const strategyInfo = extractStrategyBadge(task.title);
  const displayTitle = strategyInfo ? strategyInfo.cleanTitle : task.title;
  const strategyMarkup = strategyInfo
    ? `<span class="task-strategy-tag" title="Tactical Strategy: ${escapeHtml(strategyInfo.tag)}">${escapeHtml(strategyInfo.tag)}</span>`
    : "";
  return `
    <article class="task-card ${priorityCss}${isStarred ? " is-starred" : ""}${isDetailed ? " is-rich" : ""}" data-task-id="${task.id}" draggable="true">
      <div class="task-main">
        <span class="task-drag-handle" title="Drag task" aria-hidden="true"></span>
        <label class="task-check" title="Complete task">
          <input type="checkbox" data-complete="${task.id}" aria-label="Complete ${escapeHtml(task.title)}" />
        </label>
        <label class="task-star" title="Pin task to top">
          <input type="checkbox" data-star-task="${task.id}" ${isStarred ? "checked" : ""} aria-label="Pin ${escapeHtml(task.title)} to top" />
          <span aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3.4l2.65 5.38 5.94.86-4.3 4.2 1.02 5.92L12 16.98l-5.31 2.78 1.02-5.92-4.3-4.2 5.94-.86L12 3.4z" />
            </svg>
          </span>
        </label>
        <div class="task-content">
          <div class="task-title-row">
            ${strategyMarkup}
            <span class="task-title">${escapeHtml(displayTitle)}</span>
          </div>
          ${task.notes ? `<p class="task-note-preview">${escapeHtml(task.notes)}</p>` : ""}
          <div class="task-meta">
            <span class="meta-chip">${escapeHtml(task.productivity)}</span>
            <span class="meta-chip">${escapeHtml(task.feeling)}</span>
          </div>
          ${isDetailed ? taskVisualTemplate(task, minutePercent) : ""}
        </div>
        <div class="task-side-meta" aria-label="Task time and priority">
          <select class="priority-badge priority-select ${priorityCss}" data-field="priority" data-task="${task.id}" aria-label="Change priority for ${escapeHtml(task.title)}">
            ${priorityOptions(priority)}
          </select>
          <div class="card-chrono-container" data-card-chrono-id="${task.id}">
            <button type="button" class="meta-chip time-chip is-interactive" data-quick-time-toggle="${task.id}" title="1-Click Adjust Time (${escapeHtml(minutesLabel(task.minutes))})">
              <svg class="time-chip-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9.5"></circle>
                <polyline points="12 6.5 12 12 15.5 14"></polyline>
              </svg>
              <span class="time-chip-val" data-card-chrono-label="${task.id}">${escapeHtml(minutesLabel(task.minutes))}</span>
              <svg class="time-chip-edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>
              </svg>
            </button>
            <div class="card-chrono-popover is-hidden" data-card-chrono-popover="${task.id}" hidden>
              <div class="card-chrono-head">
                <span>CHRONOMETER CALIBRE</span>
                <button type="button" class="card-chrono-close" data-close-card-chrono="${task.id}" aria-label="Close">✕</button>
              </div>
              <div class="card-chrono-stepper">
                <button type="button" class="chrono-step-btn" data-step-time="${task.id}" data-step="-5" title="Subtract 5 mins">- 5m</button>
                <div class="chrono-stepper-center">
                  <strong class="chrono-stepper-val" data-card-readout="${task.id}">${task.minutes || 0}m</strong>
                  <small class="chrono-stepper-sub">DURATION</small>
                </div>
                <button type="button" class="chrono-step-btn" data-step-time="${task.id}" data-step="5" title="Add 5 mins">+ 5m</button>
              </div>
              <div class="card-chrono-tiers">
                <button type="button" class="card-tier-pill ${Number(task.minutes) === 15 ? 'is-active' : ''}" data-set-card-mins="${task.id}" data-mins="15">15m</button>
                <button type="button" class="card-tier-pill ${Number(task.minutes) === 25 ? 'is-active' : ''}" data-set-card-mins="${task.id}" data-mins="25">25m</button>
                <button type="button" class="card-tier-pill ${Number(task.minutes) === 30 ? 'is-active' : ''}" data-set-card-mins="${task.id}" data-mins="30">30m</button>
                <button type="button" class="card-tier-pill ${Number(task.minutes) === 45 ? 'is-active' : ''}" data-set-card-mins="${task.id}" data-mins="45">45m</button>
                <button type="button" class="card-tier-pill ${Number(task.minutes) === 60 ? 'is-active' : ''}" data-set-card-mins="${task.id}" data-mins="60">60m</button>
                <button type="button" class="card-tier-pill ${Number(task.minutes) === 90 ? 'is-active' : ''}" data-set-card-mins="${task.id}" data-mins="90">90m</button>
              </div>
            </div>
          </div>
          <button class="task-focus-btn" type="button" data-start-focus="${task.id}" title="Focus on this task with Pomodoro timer" aria-label="Focus on ${escapeHtml(task.title)}">
            <svg viewBox="0 0 24 24" aria-hidden="true" style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span>Focus</span>
          </button>
        </div>
        <div class="task-menu">
          ${isDetailed ? taskOrderControlsTemplate(task, orderState) : ""}
          <label class="task-select" title="Select task">
            <input type="checkbox" data-select-task="${task.id}" ${selectedTaskIds.has(task.id) ? "checked" : ""} aria-label="Select ${escapeHtml(task.title)}" />
          </label>
          <button class="small-button" type="button" data-toggle="${task.id}" title="Edit task" aria-label="Edit task">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
          <button class="small-button danger-button" type="button" data-delete="${task.id}" title="Delete task" aria-label="Delete task">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M10 11v6M14 11v6" />
              <path d="M8 7l1-3h6l1 3M6 7l1 14h10l1-14" />
            </svg>
          </button>
        </div>
      </div>
      <div class="task-details" ${isExpanded ? "" : "hidden"}>
        <label class="wide-field">
          Title
          <input type="text" maxlength="90" value="${escapeHtml(task.title)}" data-field="title" data-task="${task.id}" />
        </label>
        <textarea data-field="notes" data-task="${task.id}" placeholder="Add context, blockers, or next action">${escapeHtml(task.notes || "")}</textarea>
        <div class="detail-grid">
          <label>
            Minutes
            <input type="number" min="0" max="1440" step="5" value="${Number(task.minutes) || 0}" data-field="minutes" data-task="${task.id}" />
          </label>
          <label>
            Priority
            <select data-field="priority" data-task="${task.id}">
              ${priorityOptions(priority)}
            </select>
          </label>
          <label>
            Productivity
            <select data-field="productivity" data-task="${task.id}">
              ${selectOptions(["High", "Medium", "Low", "Flat", "Nil"], task.productivity)}
            </select>
          </label>
          <label>
            Feeling
            <select data-field="feeling" data-task="${task.id}">
              ${selectOptions(["Elated", "Calm", "Stress", "Boredom", "Guilty"], task.feeling)}
            </select>
          </label>
        </div>
        <div class="detail-actions">
          <button class="task-save-button" type="button" data-save-task="${task.id}" title="Save task" aria-label="Save task">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>Save</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function reportTaskTemplate(task, options = {}) {
  const isDetailed = Boolean(options.isDetailed);
  const priority = normalizePriority(task.priority);
  const priorityCss = priorityClass(priority);
  const minutePercent = Math.max(4, Math.round(((Number(task.minutes) || 0) / (options.maxMinutes || 1)) * 100));
  const strategyInfo = extractStrategyBadge(task.title);
  const displayTitle = strategyInfo ? strategyInfo.cleanTitle : task.title;
  const strategyMarkup = strategyInfo
    ? `<span class="task-strategy-tag" title="Tactical Strategy: ${escapeHtml(strategyInfo.tag)}">${escapeHtml(strategyInfo.tag)}</span>`
    : "";
  return `
    <article class="task-card report-card ${priorityCss}${isDetailed ? " is-rich" : ""}" data-task-id="${task.id}">
      <div class="task-main">
        <div class="task-content">
          <div class="task-title-row">
            ${strategyMarkup}
            <span class="task-title">${escapeHtml(displayTitle)}</span>
          </div>
          ${task.notes ? `<p class="task-note-preview">${escapeHtml(task.notes)}</p>` : ""}
          <div class="task-meta">
            <span class="meta-chip">${escapeHtml(task.productivity)}</span>
            <span class="meta-chip">${escapeHtml(task.feeling)}</span>
          </div>
          ${isDetailed ? taskVisualTemplate(task, minutePercent) : ""}
          <div class="completed-date">${escapeHtml(formatDateTime(task.completedAt))}</div>
        </div>
        <div class="task-side-meta" aria-label="Task time and priority">
          <span class="priority-badge ${priorityCss}">${escapeHtml(priority)}</span>
          <span class="meta-chip time-chip">${escapeHtml(minutesLabel(task.minutes))}</span>
        </div>
        <div class="task-menu">
          <button class="small-button" type="button" data-restore="${task.id}" title="Restore task" aria-label="Restore task">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v6h6" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function taskVisualTemplate(task, minutePercent) {
  return `
    <div class="task-visuals">
      <div class="task-meter-row">
        <span>Time</span>
        <strong>${escapeHtml(minutesLabel(task.minutes))}</strong>
      </div>
      <div class="task-meter" aria-hidden="true">
        <span style="width:${minutePercent}%"></span>
      </div>
      <div class="task-data-grid">
        <span><strong>${escapeHtml(task.productivity)}</strong><small>Productivity</small></span>
        <span><strong>${escapeHtml(task.feeling)}</strong><small>Feeling</small></span>
        <span><strong>${escapeHtml(formatDateTime(task.updatedAt))}</strong><small>Updated</small></span>
      </div>
    </div>
  `;
}

function taskOrderControlsTemplate(task, orderState) {
  return `
    <div class="task-order-controls" aria-label="Reorder ${escapeHtml(task.title)}">
      <button class="small-button order-button" type="button" data-reorder-task="${task.id}" data-reorder-action="top" title="Move to top" aria-label="Move ${escapeHtml(task.title)} to top" ${orderState.isFirst ? "disabled" : ""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14M12 19V8M7 13l5-5 5 5" /></svg>
      </button>
      <button class="small-button order-button" type="button" data-reorder-task="${task.id}" data-reorder-action="up" title="Move up" aria-label="Move ${escapeHtml(task.title)} up" ${orderState.isFirst ? "disabled" : ""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M7 10l5-5 5 5" /></svg>
      </button>
      <button class="small-button order-button" type="button" data-reorder-task="${task.id}" data-reorder-action="down" title="Move down" aria-label="Move ${escapeHtml(task.title)} down" ${orderState.isLast ? "disabled" : ""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M7 14l5 5 5-5" /></svg>
      </button>
      <button class="small-button order-button" type="button" data-reorder-task="${task.id}" data-reorder-action="bottom" title="Move to bottom" aria-label="Move ${escapeHtml(task.title)} to bottom" ${orderState.isLast ? "disabled" : ""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h14M12 5v11M7 11l5 5 5-5" /></svg>
      </button>
    </div>
  `;
}

function wireMatrixInteractions(root, options = {}) {
  const target = root || elements.matrixView;
  if (!target) return;
  const allowQuadrantOpen = options.allowQuadrantOpen !== false;

  target.querySelectorAll(".task-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const quadrantId = form.dataset.form;
      const formData = new FormData(form);
      const title = String(formData.get("title") || "").trim();
      const minutes = clampMinutes(formData.get("minutes"));
      const priorityVal = formData.get("priority");
      const priority = priorityVal ? normalizePriority(priorityVal) : quadrantDefaultPriority(quadrantId);
      if (!title) return;

      createTask({ title, minutes, priority, quadrant: quadrantId });
      form.reset();
      if (form.elements.minutes) form.elements.minutes.value = "25";
      const chronoVal = form.querySelector(".chrono-val");
      if (chronoVal) chronoVal.textContent = "25m";
      const slider = form.querySelector(".chrono-range-slider");
      if (slider) slider.value = "25";
      const sliderReadout = form.querySelector(".chrono-slider-readout");
      if (sliderReadout) sliderReadout.textContent = "25 mins";
      form.querySelectorAll(".chrono-tier-btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.chronoSet === "25");
      });
      const defPri = quadrantDefaultPriority(quadrantId);
      if (form.elements.priority) {
        form.elements.priority.value = defPri;
        form.elements.priority.className = `task-capsule-priority-select ${priorityClass(defPri)}`;
      }
      form.elements.title.focus();
    });
  });

  // Natural language duration parser when typing in task input
  target.querySelectorAll('.task-form input[name="title"]').forEach((titleInput) => {
    titleInput.addEventListener("input", () => {
      const val = titleInput.value;
      const match = val.match(/\b(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b/i);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        const mins = clampMinutes(unit.startsWith("h") ? Math.round(num * 60) : Math.round(num));
        const form = titleInput.closest(".task-form");
        if (form) {
          if (form.elements.minutes) form.elements.minutes.value = mins;
          const readout = form.querySelector(".chrono-val");
          if (readout) readout.textContent = `${mins}m`;
          const slider = form.querySelector(".chrono-range-slider");
          if (slider) slider.value = mins;
          const sliderReadout = form.querySelector(".chrono-slider-readout");
          if (sliderReadout) sliderReadout.textContent = `${mins} mins`;
          form.querySelectorAll(".chrono-tier-btn").forEach((btn) => {
            btn.classList.toggle("is-active", String(btn.dataset.chronoSet) === String(mins));
          });
          const trigger = form.querySelector(".task-chrono-trigger");
          if (trigger) {
            trigger.classList.add("chrono-detected-pulse");
            setTimeout(() => trigger.classList.remove("chrono-detected-pulse"), 800);
          }
        }
      }
    });
  });

  // Titanium Chronograph Deck trigger
  target.querySelectorAll("[data-chrono-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const qid = trigger.dataset.chronoTrigger;
      const deck = target.querySelector(`.task-chrono-deck[data-chrono-deck="${qid}"]`);
      if (!deck) return;
      const wasOpen = !deck.classList.contains("is-hidden") && !deck.hidden;
      document.querySelectorAll(".task-chrono-deck").forEach((d) => {
        d.classList.add("is-hidden");
        d.hidden = true;
      });
      document.querySelectorAll(".card-chrono-popover").forEach((p) => {
        p.classList.add("is-hidden");
        p.hidden = true;
      });
      if (!wasOpen) {
        deck.classList.remove("is-hidden");
        deck.hidden = false;
      }
    });
  });

  // Chronograph Deck Presets & Micro-pills
  target.querySelectorAll("[data-chrono-set]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const mins = clampMinutes(parseInt(btn.dataset.chronoSet, 10));
      const qid = btn.dataset.quadrant;
      const form = target.querySelector(`.task-form[data-form="${qid}"]`);
      if (form) {
        if (form.elements.minutes) form.elements.minutes.value = mins;
        const readout = form.querySelector(".chrono-val");
        if (readout) readout.textContent = `${mins}m`;
        const slider = form.querySelector(".chrono-range-slider");
        if (slider) slider.value = mins;
        const sliderReadout = form.querySelector(".chrono-slider-readout");
        if (sliderReadout) sliderReadout.textContent = `${mins} mins`;
        form.querySelectorAll(".chrono-tier-btn").forEach((tierBtn) => {
          tierBtn.classList.toggle("is-active", String(tierBtn.dataset.chronoSet) === String(mins));
        });
        const deck = form.querySelector(".task-chrono-deck");
        if (deck) {
          deck.classList.add("is-hidden");
          deck.hidden = true;
        }
      }
    });
  });

  // Chronograph Deck Precision Jog-Slider
  target.querySelectorAll(".chrono-range-slider[data-chrono-slider]").forEach((slider) => {
    slider.addEventListener("input", (e) => {
      e.stopPropagation();
      const mins = clampMinutes(parseInt(slider.value, 10));
      const qid = slider.dataset.chronoSlider;
      const form = target.querySelector(`.task-form[data-form="${qid}"]`);
      if (form) {
        if (form.elements.minutes) form.elements.minutes.value = mins;
        const readout = form.querySelector(".chrono-val");
        if (readout) readout.textContent = `${mins}m`;
        const sliderReadout = form.querySelector(".chrono-slider-readout");
        if (sliderReadout) sliderReadout.textContent = `${mins} mins`;
        form.querySelectorAll(".chrono-tier-btn").forEach((tierBtn) => {
          tierBtn.classList.toggle("is-active", String(tierBtn.dataset.chronoSet) === String(mins));
        });
      }
    });
  });

  // Task Card Quick Time Popover Toggle
  target.querySelectorAll("[data-quick-time-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = btn.dataset.quickTimeToggle;
      const popover = target.querySelector(`.card-chrono-popover[data-card-chrono-popover="${taskId}"]`);
      if (!popover) return;
      const wasOpen = !popover.classList.contains("is-hidden") && !popover.hidden;
      document.querySelectorAll(".task-chrono-deck").forEach((d) => {
        d.classList.add("is-hidden");
        d.hidden = true;
      });
      document.querySelectorAll(".card-chrono-popover").forEach((p) => {
        p.classList.add("is-hidden");
        p.hidden = true;
      });
      if (!wasOpen) {
        popover.classList.remove("is-hidden");
        popover.hidden = false;
      }
    });
  });

  // Task Card Popover Close Button
  target.querySelectorAll("[data-close-card-chrono]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = btn.dataset.closeCardChrono;
      const popover = target.querySelector(`.card-chrono-popover[data-card-chrono-popover="${taskId}"]`);
      if (popover) {
        popover.classList.add("is-hidden");
        popover.hidden = true;
      }
    });
  });

  // Task Card Stepper Buttons [- 5m] / [+ 5m]
  target.querySelectorAll("[data-step-time]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = btn.dataset.stepTime;
      const step = parseInt(btn.dataset.step, 10) || 5;
      const task = findTask(taskId);
      if (!task) return;
      const newMins = clampMinutes((Number(task.minutes) || 0) + step);
      updateTaskField(taskId, "minutes", newMins);
      showToast(`Duration updated: ${minutesLabel(newMins)}`);
    });
  });

  // Task Card Preset Pills (15m, 25m, 30m, 45m, 60m, 90m)
  target.querySelectorAll("[data-set-card-mins]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = btn.dataset.setCardMins;
      const mins = clampMinutes(parseInt(btn.dataset.mins, 10));
      updateTaskField(taskId, "minutes", mins);
      showToast(`Duration updated: ${minutesLabel(mins)}`);
    });
  });

  target.querySelectorAll(".task-capsule-priority-select").forEach((select) => {
    select.addEventListener("change", () => {
      select.className = `task-capsule-priority-select ${priorityClass(select.value)}`;
    });
  });

  target.querySelectorAll("[data-set-priority-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const qid = chip.dataset.setPriorityFilter;
      const pri = chip.dataset.priority;
      boardUi.priorityFilters[qid] = normalizePriorityFilter(pri);
      persistBoardUi();
      render();
    });
  });

  target.querySelectorAll("[data-apply-strategy]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const strategy = pill.dataset.applyStrategy;
      const quadrantId = pill.dataset.quadrant;
      const form = target.querySelector(`.task-form[data-form="${quadrantId}"]`);
      if (form && form.elements.title) {
        const input = form.elements.title;
        const current = input.value.trim();
        const prefix = `[${strategy}] `;
        if (current.startsWith(`[${strategy}]`)) {
          // already tagged
        } else if (/^\[[^\]]+\]\s*/.test(current)) {
          input.value = current.replace(/^\[[^\]]+\]\s*/, prefix);
        } else {
          input.value = prefix + current;
        }
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);

        pill.classList.add("is-applied");
        setTimeout(() => pill.classList.remove("is-applied"), 500);
        showToast(`Tactical strategy applied: ${strategy}`);
      }
    });
  });

  target.querySelectorAll("[data-complete]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => completeTask(checkbox.dataset.complete));
  });

  target.querySelectorAll("[data-star-task]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setTaskStarred(checkbox.dataset.starTask, checkbox.checked);
    });
  });

  target.querySelectorAll("[data-start-focus]").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      startPomodoroForTask(button.dataset.startFocus);
    });
  });

  target.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      expandedTaskId = expandedTaskId === button.dataset.toggle ? null : button.dataset.toggle;
      render();
    });
  });

  target.querySelectorAll("[data-save-task]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      saveTaskEdits(button);
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (document.body.contains(button)) {
        saveTaskEdits(button);
      }
    });
  });

  target.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteTask(button.dataset.delete));
  });

  target.querySelectorAll("[data-filter]").forEach((input) => {
    input.addEventListener("input", () => {
      const quadrantId = input.dataset.filter;
      const cursor = input.selectionStart || input.value.length;
      boardUi.filters[quadrantId] = input.value;
      persistBoardUi();
      render();
      requestAnimationFrame(() => {
        const nextInput = target.querySelector(`[data-filter="${quadrantId}"]`);
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(cursor, cursor);
        }
      });
    });
  });

  target.querySelectorAll("[data-priority-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      boardUi.priorityFilters[select.dataset.priorityFilter] = normalizePriorityFilter(select.value);
      persistBoardUi();
      render();
    });
  });

  target.querySelectorAll("[data-select-task]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setTaskSelected(checkbox.dataset.selectTask, checkbox.checked);
      render();
    });
  });

  target.querySelectorAll("[data-select-visible]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      toggleVisibleSelection(checkbox.dataset.selectVisible, checkbox.checked);
      render();
    });
  });

  target.querySelectorAll("[data-bulk-complete]").forEach((button) => {
    button.addEventListener("click", () => bulkComplete(button.dataset.bulkComplete));
  });

  target.querySelectorAll("[data-bulk-delete]").forEach((button) => {
    button.addEventListener("click", () => bulkDelete(button.dataset.bulkDelete));
  });

  wireQuadrantResizeInteractions(target);
  wireTaskDragInteractions(target);

  target.querySelectorAll("[data-reorder-task]").forEach((button) => {
    button.addEventListener("click", () => reorderTask(button.dataset.reorderTask, button.dataset.reorderAction));
  });

  target.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("change", () => {
      updateTaskField(field.dataset.task, field.dataset.field, field.value);
    });
    if (field.tagName === "TEXTAREA") {
      field.addEventListener("blur", () => {
        updateTaskField(field.dataset.task, field.dataset.field, field.value);
      });
    }
  });

  if (allowQuadrantOpen) {
    wireQuadrantOpenInteractions(target);
  }
}

function wireReportInteractions(root, options = {}) {
  const target = root || elements.reportView;
  if (!target) return;
  const allowQuadrantOpen = options.allowQuadrantOpen !== false;

  target.querySelectorAll("[data-restore]").forEach((button) => {
    button.addEventListener("click", () => restoreTask(button.dataset.restore));
  });

  wireQuadrantResizeInteractions(target);

  if (allowQuadrantOpen) {
    wireQuadrantOpenInteractions(target);
  }
}

function wireTaskDragInteractions(root) {
  root.querySelectorAll(".task-card[draggable='true']").forEach((card) => {
    card.addEventListener("pointerdown", (event) => {
      card.draggable = !shouldIgnoreTaskDrag(event.target);
    });

    ["pointerup", "pointercancel", "mouseleave"].forEach((eventName) => {
      card.addEventListener(eventName, () => {
        card.draggable = true;
      });
    });

    card.addEventListener("dragstart", (event) => {
      if (!card.draggable || shouldIgnoreTaskDrag(event.target)) {
        event.preventDefault();
        return;
      }

      draggedTaskId = card.dataset.taskId;
      card.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedTaskId);
      }
    });

    card.addEventListener("dragend", () => {
      draggedTaskId = null;
      recentTaskDragEndedAt = Date.now();
      cleanupTaskDragState();
      card.draggable = true;
    });
  });

  root.querySelectorAll("[data-list]").forEach((list) => {
    list.addEventListener("dragover", (event) => {
      if (!draggedTaskId) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      markTaskDropTarget(root, list, event);
    });

    list.addEventListener("dragleave", (event) => {
      if (!list.contains(event.relatedTarget)) {
        list.classList.remove("is-over");
        clearTaskDropMarkers(root);
      }
    });

    list.addEventListener("drop", (event) => {
      if (!draggedTaskId && !event.dataTransfer?.getData("text/plain")) return;
      event.preventDefault();
      event.stopPropagation();
      const taskId = draggedTaskId || event.dataTransfer.getData("text/plain");
      const dropTarget = taskDropTarget(list, event, taskId);
      cleanupTaskDragState();
      recentTaskDragEndedAt = Date.now();
      moveTask(taskId, list.dataset.list, dropTarget);
    });
  });

  root.querySelectorAll(".quadrant[data-quadrant]").forEach((quadrant) => {
    quadrant.addEventListener("dragover", (event) => {
      if (!draggedTaskId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      quadrant.classList.add("is-over");
    });

    quadrant.addEventListener("dragleave", (event) => {
      if (!quadrant.contains(event.relatedTarget)) {
        quadrant.classList.remove("is-over");
      }
    });

    quadrant.addEventListener("drop", (event) => {
      if (!draggedTaskId && !event.dataTransfer?.getData("text/plain")) return;
      event.preventDefault();
      const taskId = draggedTaskId || event.dataTransfer.getData("text/plain");
      cleanupTaskDragState();
      recentTaskDragEndedAt = Date.now();
      moveTask(taskId, quadrant.dataset.quadrant);
    });
  });
}

function shouldIgnoreTaskDrag(target) {
  if (!(target instanceof Element)) return true;

  return Boolean(target.closest(`
    button,
    input,
    select,
    textarea,
    label,
    a,
    [contenteditable="true"],
    .task-menu,
    .task-details
  `));
}

function markTaskDropTarget(root, list, event) {
  const quadrant = list.closest(".quadrant");
  quadrant?.classList.add("is-over");
  list.classList.add("is-over");
  clearTaskDropMarkers(root);

  const { referenceId, placement } = taskDropTarget(list, event, draggedTaskId);
  if (!referenceId) return;

  const targetCard = list.querySelector(`[data-task-id="${CSS.escape(referenceId)}"]`);
  targetCard?.classList.add(placement === "after" ? "is-drop-after" : "is-drop-before");
}

function clearTaskDropMarkers(root = document) {
  root.querySelectorAll(".is-drop-before, .is-drop-after").forEach((card) => {
    card.classList.remove("is-drop-before", "is-drop-after");
  });
}

function cleanupTaskDragState(root = document) {
  root.querySelectorAll(".is-dragging, .is-over, .is-drop-before, .is-drop-after").forEach((element) => {
    element.classList.remove("is-dragging", "is-over", "is-drop-before", "is-drop-after");
  });
}

function taskDropTarget(list, event, taskId) {
  const card = event.target instanceof Element ? event.target.closest(".task-card[data-task-id]") : null;
  if (!card || !list.contains(card) || card.dataset.taskId === taskId) {
    return {};
  }

  const rect = card.getBoundingClientRect();
  return {
    referenceId: card.dataset.taskId,
    placement: event.clientY > rect.top + rect.height / 2 ? "after" : "before",
  };
}

function createTask({ title, minutes, priority, quadrant }) {
  const now = new Date().toISOString();
  const resolvedPriority = priority ? normalizePriority(priority) : quadrantDefaultPriority(quadrant);

  // Auto-clear filters on this quadrant so the newly added task is immediately visible
  if (boardUi.filters && boardUi.filters[quadrant]) {
    boardUi.filters[quadrant] = "";
    persistBoardUi();
  }
  if (boardUi.globalFilter) {
    boardUi.globalFilter = "";
    persistBoardUi();
  }
  if (boardUi.priorityFilters && boardUi.priorityFilters[quadrant] && boardUi.priorityFilters[quadrant] !== "all") {
    if (normalizePriority(resolvedPriority) !== normalizePriorityFilter(boardUi.priorityFilters[quadrant])) {
      boardUi.priorityFilters[quadrant] = "all";
      persistBoardUi();
    }
  }

  state.tasks.unshift({
    id: createId("task"),
    title,
    notes: "",
    quadrant,
    originalQuadrant: quadrant,
    minutes,
    priority: resolvedPriority,
    isStarred: false,
    productivity: defaultProductivityForQuadrant(quadrant),
    feeling: defaultFeelingForQuadrant(quadrant),
    status: "active",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    history: [{ at: now, type: "created", quadrant }],
  });

  syncTaskPositions();
  persist();
  render();
  showToast(`Added to ${QUADRANTS[quadrant]?.title || 'Matrix'}: "${title}"`);
}

function moveTask(taskId, quadrant, options = {}) {
  const task = findTask(taskId);
  if (!task || task.status !== "active" || !QUADRANTS[quadrant]) return false;

  const beforeOrder = state.tasks.map((candidate) => candidate.id).join("|");
  const from = task.quadrant;
  const now = new Date().toISOString();
  const reference = options.referenceId ? findTask(options.referenceId) : null;

  task.quadrant = quadrant;

  if (
    reference
    && reference.status === "active"
    && reference.quadrant === quadrant
    && normalizePriority(reference.priority) === normalizePriority(task.priority)
  ) {
    placeTaskRelativeToTask(task.id, reference.id, options.placement === "after" ? "after" : "before");
  } else if (task.isStarred) {
    placeTaskAtQuadrantTop(task.id);
  } else {
    placeTaskAtPriorityEnd(task.id);
  }

  const afterOrder = state.tasks.map((candidate) => candidate.id).join("|");
  if (from === task.quadrant && beforeOrder === afterOrder) return false;

  task.updatedAt = now;
  task.history.push(
    from === task.quadrant
      ? { at: now, type: "reordered", action: "drag", quadrant: task.quadrant, priority: normalizePriority(task.priority) }
      : { at: now, type: "moved", from, to: task.quadrant },
  );
  expandedTaskId = null;
  syncTaskPositions();
  persist();
  render();
  showToast(from === task.quadrant ? "Task reordered" : `Moved to ${QUADRANTS[task.quadrant].title}`);
  return true;
}

function completeTask(taskId) {
  const task = findTask(taskId);
  if (!task || task.status !== "active") return;

  const now = new Date().toISOString();
  task.status = "completed";
  task.completedAt = now;
  task.updatedAt = now;
  task.completedQuadrant = task.quadrant;
  task.history.push({ at: now, type: "completed", quadrant: task.quadrant });
  expandedTaskId = null;
  selectedTaskIds.delete(task.id);
  persist();
  render();
  playTaskCompleteSound();
  launchConfetti(1400);
  showToast(`Completed in ${QUADRANTS[task.quadrant].title}`);
}

function restoreTask(taskId) {
  const task = findTask(taskId);
  if (!task || task.status !== "completed") return;

  const now = new Date().toISOString();
  task.status = "active";
  task.completedAt = null;
  task.updatedAt = now;
  task.history.push({ at: now, type: "restored", quadrant: task.quadrant });
  moveTaskToPriorityTop(task);
  syncTaskPositions();
  persist();
  render();
  showToast("Task restored to the matrix");
}

function deleteTask(taskId) {
  const task = findTask(taskId);
  if (!task || task.status !== "active") return;
  if (!confirm(`Delete "${task.title}" from the matrix?`)) return;

  state.tasks = state.tasks.filter((candidate) => candidate.id !== taskId);
  selectedTaskIds.delete(taskId);
  if (expandedTaskId === taskId) expandedTaskId = null;
  syncTaskPositions();
  persist();
  render();
  showToast("Task deleted");
}

function toggleCompactMode() {
  boardUi.compact = !boardUi.compact;
  persistBoardUi();
  render();
}

function setTaskSelected(taskId, isSelected) {
  if (isSelected) {
    selectedTaskIds.add(taskId);
  } else {
    selectedTaskIds.delete(taskId);
  }
}

function selectedTasksInQuadrant(quadrantId) {
  return state.tasks.filter((task) => task.status === "active" && task.quadrant === quadrantId && selectedTaskIds.has(task.id));
}

function visibleTasksInQuadrant(quadrantId) {
  return filterTasksForQuadrant(
    orderedTasksForQuadrant(state.tasks.filter((task) => task.status === "active"), quadrantId),
    quadrantId,
  );
}

function toggleVisibleSelection(quadrantId, isSelected) {
  visibleTasksInQuadrant(quadrantId).forEach((task) => setTaskSelected(task.id, isSelected));
}

function bulkComplete(quadrantId) {
  const tasks = selectedTasksInQuadrant(quadrantId);
  if (!tasks.length) return;

  const now = new Date().toISOString();
  tasks.forEach((task) => {
    task.status = "completed";
    task.completedAt = now;
    task.updatedAt = now;
    task.completedQuadrant = task.quadrant;
    task.history.push({ at: now, type: "completed", quadrant: task.quadrant });
    selectedTaskIds.delete(task.id);
  });
  if (tasks.some((task) => expandedTaskId === task.id)) expandedTaskId = null;
  syncTaskPositions();
  persist();
  render();
  showToast(`${tasks.length} completed`);
}

function bulkDelete(quadrantId) {
  const tasks = selectedTasksInQuadrant(quadrantId);
  if (!tasks.length) return;
  if (!confirm(`Delete ${tasks.length} selected task${tasks.length === 1 ? "" : "s"}?`)) return;

  const ids = new Set(tasks.map((task) => task.id));
  state.tasks = state.tasks.filter((task) => !ids.has(task.id));
  tasks.forEach((task) => selectedTaskIds.delete(task.id));
  if (ids.has(expandedTaskId)) expandedTaskId = null;
  syncTaskPositions();
  persist();
  render();
  showToast(`${tasks.length} deleted`);
}

function syncSelectedTasks() {
  const activeIds = new Set(state.tasks.filter((task) => task.status === "active").map((task) => task.id));
  selectedTaskIds.forEach((taskId) => {
    if (!activeIds.has(taskId)) selectedTaskIds.delete(taskId);
  });
}

function saveTaskEdits(button) {
  const taskId = button.dataset.saveTask;
  const task = findTask(taskId);
  if (!task || task.status !== "active") return;

  const detailPanel = button.closest(".task-details");
  const now = new Date().toISOString();
  detailPanel?.querySelectorAll("[data-field]").forEach((field) => {
    if (field.dataset.task === taskId) {
      applyTaskFieldUpdate(task, field.dataset.field, field.value, now);
    }
  });

  task.updatedAt = now;
  persist();
  if (expandedTaskId === taskId) expandedTaskId = null;
  render();
  showToast("Task saved");
}

function applyTaskFieldUpdate(task, field, value, timestamp = new Date().toISOString()) {
  if (!task || task.status !== "active") return false;
  let changed = false;

  if (field === "title") {
    const nextTitle = String(value).trim().slice(0, 90) || task.title;
    if (task.title !== nextTitle) {
      task.title = nextTitle;
      changed = true;
    }
  } else if (field === "minutes") {
    const nextMinutes = clampMinutes(value);
    if ((Number(task.minutes) || 0) !== nextMinutes) {
      task.minutes = nextMinutes;
      changed = true;
    }
  } else if (field === "priority") {
    const nextPriority = normalizePriority(value);
    if (task.priority !== nextPriority) {
      const from = normalizePriority(task.priority);
      task.priority = nextPriority;
      task.history.push({ at: timestamp, type: "prioritized", from, to: nextPriority });
      moveTaskToPriorityTop(task);
      syncTaskPositions();
      changed = true;
    }
  } else if (field === "notes") {
    const nextNotes = String(value).slice(0, 600);
    if ((task.notes || "") !== nextNotes) {
      task.notes = nextNotes;
      changed = true;
    }
  } else if (field === "productivity") {
    if (task.productivity !== value) {
      task.productivity = value;
      changed = true;
    }
  } else if (field === "feeling") {
    if (task.feeling !== value) {
      task.feeling = value;
      changed = true;
    }
  }

  return changed;
}

function updateTaskField(taskId, field, value) {
  const task = findTask(taskId);
  if (!task || task.status !== "active") return;

  const now = new Date().toISOString();
  applyTaskFieldUpdate(task, field, value, now);
  task.updatedAt = now;
  persist();
  render();
}

function setTaskStarred(taskId, isStarred) {
  const task = findTask(taskId);
  if (!task || task.status !== "active" || Boolean(task.isStarred) === Boolean(isStarred)) return;

  const now = new Date().toISOString();
  task.isStarred = Boolean(isStarred);
  task.updatedAt = now;
  task.history.push({ at: now, type: task.isStarred ? "starred" : "unstarred", quadrant: task.quadrant });

  if (task.isStarred) {
    placeTaskAtQuadrantTop(task.id);
  }

  syncTaskPositions();
  persist();
  render();
  showToast(task.isStarred ? "Task pinned to top" : "Task unpinned");
}

function clearCompletedTasks() {
  const completedCount = state.tasks.filter((task) => task.status === "completed").length;
  if (!completedCount) {
    showToast("No completed report tasks to clear");
    return;
  }

  if (!confirm("Clear completed report tasks? Active matrix tasks will stay.")) return;

  state.tasks = state.tasks.filter((task) => task.status !== "completed");
  persist();
  render();
  showToast("Completed report cleared");
}

function filteredCompletedTasks() {
  const range = elements.reportRange.value || "all";
  const completed = state.tasks.filter((task) => task.status === "completed");
  if (range === "all") return completed;

  const now = new Date();
  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    start.setDate(now.getDate() - 7);
  } else if (range === "month") {
    start.setDate(now.getDate() - 30);
  }

  return completed.filter((task) => new Date(task.completedAt) >= start);
}

function reportSubtitle(count) {
  const rangeLabel = elements.reportRange.options[elements.reportRange.selectedIndex]?.textContent || "All completed";
  if (!count) return `${rangeLabel}: no completed tasks yet.`;
  return `${rangeLabel}: ${count} completed ${count === 1 ? "task" : "tasks"} grouped by finish quadrant.`;
}

function orderedTasksForQuadrant(tasks, quadrantId) {
  return tasks
    .filter((task) => task.quadrant === quadrantId)
    .slice()
    .sort(compareTaskOrder);
}

function compareTaskOrder(a, b) {
  if (Boolean(a.isStarred) !== Boolean(b.isStarred)) {
    return a.isStarred ? -1 : 1;
  }
  if (a.isStarred && b.isStarred) {
    return taskPosition(a) - taskPosition(b);
  }

  const priorityDelta = priorityRank(a.priority) - priorityRank(b.priority);
  if (priorityDelta) return priorityDelta;
  return taskPosition(a) - taskPosition(b);
}

function priorityRank(priority) {
  return PRIORITY_RANK[normalizePriority(priority)] ?? PRIORITY_RANK[DEFAULT_PRIORITY];
}

function taskPosition(task) {
  const index = state.tasks.findIndex((candidate) => candidate.id === task.id);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function tasksInPriorityGroup(task) {
  return state.tasks
    .filter((candidate) => (
      candidate.status === task.status
      && candidate.quadrant === task.quadrant
      && normalizePriority(candidate.priority) === normalizePriority(task.priority)
    ))
    .sort((a, b) => taskPosition(a) - taskPosition(b));
}

function taskOrderState(task) {
  const peers = tasksInPriorityGroup(task);
  const index = peers.findIndex((candidate) => candidate.id === task.id);
  return {
    isFirst: index <= 0,
    isLast: index === -1 || index >= peers.length - 1,
  };
}

function reorderTask(taskId, action) {
  const task = findTask(taskId);
  if (!task || task.status !== "active") return;

  const peers = tasksInPriorityGroup(task);
  const currentIndex = peers.findIndex((candidate) => candidate.id === taskId);
  if (currentIndex === -1) return;

  if (action === "top" && currentIndex > 0) {
    placeTaskRelativeToTask(taskId, peers[0].id, "before");
  } else if (action === "up" && currentIndex > 0) {
    placeTaskRelativeToTask(taskId, peers[currentIndex - 1].id, "before");
  } else if (action === "down" && currentIndex < peers.length - 1) {
    placeTaskRelativeToTask(taskId, peers[currentIndex + 1].id, "after");
  } else if (action === "bottom" && currentIndex < peers.length - 1) {
    placeTaskRelativeToTask(taskId, peers[peers.length - 1].id, "after");
  } else {
    return;
  }

  task.updatedAt = new Date().toISOString();
  task.history.push({ at: task.updatedAt, type: "reordered", action, quadrant: task.quadrant, priority: normalizePriority(task.priority) });
  syncTaskPositions();
  persist();
  render();
}

function moveTaskToPriorityTop(task) {
  const peers = tasksInPriorityGroup(task).filter((candidate) => candidate.id !== task.id);
  if (!peers.length) return;
  placeTaskRelativeToTask(task.id, peers[0].id, "before");
}

function placeTaskAtQuadrantTop(taskId) {
  const task = findTask(taskId);
  if (!task) return;

  const peers = state.tasks
    .filter((candidate) => candidate.status === task.status && candidate.quadrant === task.quadrant && candidate.id !== task.id)
    .sort(compareTaskOrder);
  if (!peers.length) return;
  placeTaskRelativeToTask(task.id, peers[0].id, "before");
}

function placeTaskAtPriorityEnd(taskId) {
  const task = findTask(taskId);
  if (!task) return;

  const peers = tasksInPriorityGroup(task).filter((candidate) => candidate.id !== task.id);
  if (!peers.length) return;
  placeTaskRelativeToTask(task.id, peers[peers.length - 1].id, "after");
}

function placeTaskRelativeToTask(taskId, referenceId, placement) {
  const currentIndex = state.tasks.findIndex((task) => task.id === taskId);
  if (currentIndex === -1 || taskId === referenceId) return;

  const [task] = state.tasks.splice(currentIndex, 1);
  const referenceIndex = state.tasks.findIndex((candidate) => candidate.id === referenceId);
  if (referenceIndex === -1) {
    state.tasks.splice(currentIndex, 0, task);
    return;
  }

  const insertIndex = placement === "after" ? referenceIndex + 1 : referenceIndex;
  state.tasks.splice(insertIndex, 0, task);
}

function syncTaskPositions() {
  state.tasks.forEach((task, index) => {
    task.position = index;
    task.priority = normalizePriority(task.priority);
  });
}

function findTask(taskId) {
  return state.tasks.find((task) => task.id === taskId);
}

function countByQuadrant(tasks) {
  return QUADRANT_ORDER.reduce((acc, id) => {
    acc[id] = tasks.filter((task) => task.quadrant === id).length;
    return acc;
  }, {});
}

function sumMinutes(tasks) {
  return tasks.reduce((total, task) => total + (Number(task.minutes) || 0), 0);
}

function percent(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function minutesLabel(minutes) {
  const safeMinutes = Number(minutes) || 0;
  if (safeMinutes < 60) return `${safeMinutes}m`;
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function clampMinutes(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1440, Math.round(parsed)));
}

function defaultFeelingForQuadrant(quadrant) {
  if (quadrant === "reactive") return "Stress";
  if (quadrant === "proactive") return "Elated";
  if (isReduceQuadrant(quadrant)) return "Boredom";
  return "Guilty";
}

function defaultProductivityForQuadrant(quadrant) {
  if (quadrant === "proactive") return "High";
  if (isAvoidQuadrant(quadrant)) return "Nil";
  if (isReduceQuadrant(quadrant)) return "Flat";
  return "Medium";
}

function isReduceQuadrant(quadrant) {
  return quadrant === "deceptive";
}

function isAvoidQuadrant(quadrant) {
  return quadrant === "escapist";
}

function normalizePriority(value) {
  const priority = String(value || DEFAULT_PRIORITY).trim().toLowerCase();
  if (priority === "high") return "Priority 1";
  if (priority === "medium") return DEFAULT_PRIORITY;
  if (priority === "low") return "Priority 5";

  const match = priority.match(/^(?:priority|p)?\s*[-#]?\s*([1-5])$/);
  if (match) return `Priority ${match[1]}`;

  return DEFAULT_PRIORITY;
}

function normalizePriorityFilter(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === "all") return "all";

  const isPriorityLike = /^(?:priority|p)?\s*[-#]?\s*[1-5]$/i.test(raw);
  const isLegacyPriority = ["high", "medium", "low"].includes(raw.toLowerCase());
  return isPriorityLike || isLegacyPriority ? normalizePriority(raw) : "all";
}

function priorityClass(priority) {
  return `priority-${priorityRank(priority) + 1}`;
}

function shortPriorityLabel(priority) {
  const norm = normalizePriority(priority);
  switch (norm) {
    case "Priority 1": return "🔥 P1 Urgent";
    case "Priority 2": return "⚡ P2 High";
    case "Priority 3": return "🎯 P3 Normal";
    case "Priority 4": return "☕ P4 Low";
    case "Priority 5": return "⚪ P5 Backlog";
    default: return norm;
  }
}

function summarizePriorities(tasks) {
  return PRIORITIES.map((priority) => {
    const matching = tasks.filter((task) => normalizePriority(task.priority) === priority);
    return {
      label: priority,
      count: matching.length,
      minutes: sumMinutes(matching),
    };
  });
}

function selectOptions(options, selected) {
  return options.map((option) => {
    const isSelected = option === selected ? "selected" : "";
    return `<option value="${escapeHtml(option)}" ${isSelected}>${escapeHtml(option)}</option>`;
  }).join("");
}

function priorityOptions(selected) {
  const normalized = normalizePriority(selected);
  const options = [
    { value: "Priority 1", label: "🔥 P1 Urgent" },
    { value: "Priority 2", label: "⚡ P2 High" },
    { value: "Priority 3", label: "🎯 P3 Normal" },
    { value: "Priority 4", label: "☕ P4 Low" },
    { value: "Priority 5", label: "⚪ P5 Backlog" },
  ];
  return options.map((opt) => {
    const isSelected = opt.value === normalized ? "selected" : "";
    return `<option value="${opt.value}" ${isSelected}>${opt.label}</option>`;
  }).join("");
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Conference Note Taker Helper Functions */
async function loadConferenceNotes() {
  if (!currentUser) {
    conferenceNotes = [];
    return;
  }

  try {
    const data = await apiRequest("/api/conference-notes");
    conferenceNotes = normalizeConferenceNotes(data.people);

    const legacyNotes = readLegacyConferenceNotes();
    if (conferenceNotes.length === 0 && legacyNotes.length > 0) {
      conferenceNotes = legacyNotes;
      await saveConferenceNotes();
      clearLegacyConferenceNotes();
      showToast("Imported conference notes into the database");
    }
  } catch (error) {
    console.warn("Could not load conference notes", error);
    conferenceNotes = readLegacyConferenceNotes();
    showToast("Could not load notes from the database");
  }
}

function saveConferenceNotes() {
  if (!currentUser) return pendingConferenceNotesPersist;

  const snapshot = {
    people: normalizeConferenceNotes(conferenceNotes),
  };

  pendingConferenceNotesPersist = pendingConferenceNotesPersist
    .catch(() => undefined)
    .then(() => apiRequest("/api/conference-notes", { method: "PUT", body: snapshot }))
    .catch((error) => {
      console.error("Could not save conference notes", error);
      showToast("Could not save notes to the database");
    });

  return pendingConferenceNotesPersist;
}

function readLegacyConferenceNotes() {
  if (!currentUser) return [];
  try {
    const saved = localStorage.getItem(conferenceNotesStorageKey());
    return normalizeConferenceNotes(saved ? JSON.parse(saved) : []);
  } catch (error) {
    console.warn("Could not read legacy conference notes", error);
    return [];
  }
}

function clearLegacyConferenceNotes() {
  try {
    localStorage.removeItem(conferenceNotesStorageKey());
  } catch (error) {
    console.warn("Could not clear legacy conference notes", error);
  }
}

function conferenceNotesStorageKey() {
  return `time-matrix-conf-notes-${currentUser.id}`;
}

function normalizeConferenceNotes(people) {
  if (!Array.isArray(people)) return [];
  return people.map(normalizeConferencePerson).filter(Boolean);
}

function normalizeConferencePerson(person) {
  if (!person || typeof person !== "object") return null;

  const now = new Date().toISOString();
  const notesList = normalizeConferenceNoteList(person.notes);
  return {
    id: person.id || createId("person"),
    name: String(person.name || "Unknown").trim().slice(0, 80) || "Unknown",
    createdAt: person.createdAt || now,
    updatedAt: person.updatedAt || person.createdAt || now,
    notes: notesList,
  };
}

function normalizeConferenceNoteList(notes) {
  let list = notes;
  if (typeof list === "string") {
    list = list.trim() ? [{ text: list.trim() }] : [];
  }
  if (!Array.isArray(list)) return [];

  return list.map(normalizeConferenceNote).filter(Boolean);
}

function normalizeConferenceNote(note) {
  const raw = typeof note === "string" ? { text: note } : note;
  if (!raw || typeof raw !== "object") return null;

  const now = new Date().toISOString();
  const text = String(raw.text || "").trim().slice(0, 200);
  if (!text) return null;

  const isCompleted = Boolean(raw.completed);
  const normalized = {
    id: raw.id || createId("note"),
    text,
    completed: isCompleted,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now,
  };

  if (isCompleted) {
    normalized.completedAt = raw.completedAt || normalized.updatedAt;
  }

  return normalized;
}

function setConfNotesPopup(isOpen) {
  if (!elements.confNotesPopup || !elements.confNotesButton) return;
  elements.confNotesPopup.classList.toggle("is-hidden", !isOpen);
  elements.confNotesButton.setAttribute("aria-expanded", String(isOpen));
  if (!isOpen) {
    cleanupConferenceNoteDrag();
  }
  if (isOpen) {
    elements.confAddInput?.focus();
  }
}

function wireConferenceNotesInteractions() {
  if (!elements.confNotesButton || !elements.confNotesPopup) return;

  elements.confNotesButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setAccountMenu(false);
    setConfNotesPopup(elements.confNotesPopup.classList.contains("is-hidden"));
  });

  elements.confNotesPopup.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    setConfNotesPopup(false);
  });

  document.getElementById("confPopupClose")?.addEventListener("click", () => {
    setConfNotesPopup(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (draggingConferenceNote) {
        cleanupConferenceNoteDrag();
        return;
      }
      if (elements.confNotesPopup && !elements.confNotesPopup.classList.contains("is-hidden")) {
        setConfNotesPopup(false);
      }
    }
  });

  elements.confAddForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.confAddInput.value.trim();
    if (!name) return;

    addConferencePerson(name);
    elements.confAddInput.value = "";
    elements.confAddInput.focus();
  });

  elements.confPeopleList?.addEventListener("click", (event) => {
    // 1. Delete person
    const deleteBtn = event.target.closest("[data-delete-person]");
    if (deleteBtn) {
      event.stopPropagation();
      const personId = deleteBtn.dataset.deletePerson;
      deleteConferencePerson(personId);
      return;
    }

    // 2. Delete note
    const deleteNoteBtn = event.target.closest("[data-delete-note]");
    if (deleteNoteBtn) {
      event.stopPropagation();
      const personId = deleteNoteBtn.dataset.personId;
      const noteId = deleteNoteBtn.dataset.deleteNote;
      deleteConferenceNote(personId, noteId);
      return;
    }

    // 3. Edit note
    const editNoteBtn = event.target.closest("[data-edit-note]");
    if (editNoteBtn) {
      event.stopPropagation();
      const personId = editNoteBtn.dataset.personId;
      const noteId = editNoteBtn.dataset.editNote;
      startEditingConferenceNote(personId, noteId);
      return;
    }

    // 4. Cancel note editing
    const cancelEditBtn = event.target.closest("[data-cancel-edit-note]");
    if (cancelEditBtn) {
      event.stopPropagation();
      cancelEditingConferenceNote();
      return;
    }

    // 5. Expand/collapse completed notes collapsible section
    const completedToggle = event.target.closest("[data-toggle-completed]");
    if (completedToggle) {
      event.stopPropagation();
      const personId = completedToggle.dataset.toggleCompleted;
      const section = completedToggle.closest(".conf-completed-section");
      if (section) {
        const isCompletedExpanded = section.classList.toggle("is-expanded");
        if (isCompletedExpanded) {
          expandedCompletedPeopleIds.add(personId);
        } else {
          expandedCompletedPeopleIds.delete(personId);
        }
      }
      return;
    }

    // 6. Expand/collapse person
    const header = event.target.closest(".conf-person-header");
    if (header) {
      const item = header.closest(".conf-person-item");
      if (item) {
        const personId = item.dataset.personId;
        const isExpanded = item.classList.toggle("is-expanded");
        if (isExpanded) {
          expandedPeopleIds.add(personId);
          item.querySelector(".conf-add-note-form input")?.focus();
        } else {
          expandedPeopleIds.delete(personId);
        }
      }
    }
  });

  // Handle adding notes via form submission inside the people list
  elements.confPeopleList?.addEventListener("submit", (event) => {
    const editForm = event.target.closest(".conf-edit-note-form");
    if (editForm) {
      event.preventDefault();
      const personId = editForm.dataset.personId;
      const noteId = editForm.dataset.noteId;
      const input = editForm.querySelector("input");
      const text = input ? input.value.trim() : "";
      if (!text) {
        input?.focus();
        return;
      }

      updateConferenceNote(personId, noteId, text);
      return;
    }

    const form = event.target.closest(".conf-add-note-form");
    if (form) {
      event.preventDefault();
      const personId = form.dataset.personId;
      const input = form.querySelector("input");
      const text = input ? input.value.trim() : "";
      if (!text) return;

      addConferenceNote(personId, text);
      input.value = "";
    }
  });

  // Handle checking/unchecking off notes inside the people list
  elements.confPeopleList?.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".conf-note-checkbox");
    if (checkbox) {
      const personId = checkbox.dataset.personId;
      const noteId = checkbox.dataset.noteId;
      if (checkbox.checked) {
        completeConferenceNote(personId, noteId);
      } else {
        restoreConferenceNote(personId, noteId);
      }
    }
  });

  elements.confPeopleList?.addEventListener("pointerdown", handleConferenceNoteDragStart);
}

function wireMatrixSubnav() {
  const boardSubtab = document.getElementById("matrixSubtabBoard");
  const reportSubtab = document.getElementById("matrixSubtabReport");
  const boardPanel = document.getElementById("matrixBoardPanel");
  const reportPanel = document.getElementById("matrixReportInnerPanel");
  const reportActions = document.getElementById("matrixReportActions");

  function switchMatrixTab(tab) {
    if (boardSubtab) boardSubtab.classList.toggle("is-active", tab === "board");
    if (reportSubtab) reportSubtab.classList.toggle("is-active", tab === "report");
    if (boardPanel) boardPanel.classList.toggle("is-hidden", tab !== "board");
    if (reportPanel) reportPanel.classList.toggle("is-hidden", tab !== "report");
    if (reportActions) reportActions.classList.toggle("is-hidden", tab !== "report");
  }

  if (boardSubtab) {
    boardSubtab.addEventListener("click", () => switchMatrixTab("board"));
  }
  if (reportSubtab) {
    reportSubtab.addEventListener("click", () => switchMatrixTab("report"));
  }

  window.switchMatrixInnerTab = switchMatrixTab;
}

function wireGlobalThemeInteractions() {
  const themeBtn = document.getElementById("themePickerButton");
  const themeDropdown = document.getElementById("themePickerDropdown");
  const closeBtn = document.getElementById("themeStudioClose");

  const getSavedTheme = () => localStorage.getItem("tm_app_theme") || "light";

  if (themeBtn && themeDropdown) {
    themeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = themeDropdown.classList.contains("is-hidden");
      if (isHidden) {
        themeDropdown.classList.remove("is-hidden");
        // Sync active state on open
        syncActiveThemeSwatch(getSavedTheme());
      } else {
        themeDropdown.classList.add("is-hidden");
        restoreSavedTheme();
      }
    });

    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      themeDropdown.classList.add("is-hidden");
      restoreSavedTheme();
    });

    document.addEventListener("click", (e) => {
      if (!themeDropdown.contains(e.target) && e.target !== themeBtn && !themeBtn.contains(e.target)) {
        if (!themeDropdown.classList.contains("is-hidden")) {
          themeDropdown.classList.add("is-hidden");
          restoreSavedTheme();
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !themeDropdown.classList.contains("is-hidden")) {
        themeDropdown.classList.add("is-hidden");
        restoreSavedTheme();
      }
    });

    // Revert preview on mouse leave
    themeDropdown.addEventListener("mouseleave", () => {
      restoreSavedTheme();
    });
  }

  // Category filter tabs
  const catButtons = document.querySelectorAll(".theme-cat-btn");
  catButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      catButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const cat = btn.dataset.cat;
      const swatches = document.querySelectorAll(".theme-swatch-card");
      swatches.forEach((swatch) => {
        if (cat === "all" || swatch.dataset.themeCat === cat) {
          swatch.style.display = "flex";
        } else {
          swatch.style.display = "none";
        }
      });
    });
  });

  // Hover live preview & click activation
  document.addEventListener("pointerover", (e) => {
    const swatch = e.target.closest(".theme-swatch-card");
    if (swatch && themeDropdown && !themeDropdown.classList.contains("is-hidden")) {
      const themeId = swatch.dataset.themeId;
      if (themeId) {
        document.body.setAttribute("data-theme", themeId);
        document.body.setAttribute("data-app-theme", themeId);
      }
    }
  });

  document.addEventListener("click", (e) => {
    const swatch = e.target.closest(".theme-swatch-card, button[data-theme-id], .theme-opt-btn");
    if (swatch && swatch !== document.body) {
      const themeKey = swatch.dataset.themeId || swatch.dataset.appTheme;
      if (themeKey) {
        applyAppTheme(themeKey);
        playThemeChime();
        if (themeDropdown) {
          setTimeout(() => {
            themeDropdown.classList.add("is-hidden");
          }, 180);
        }
      }
    }
  });

  function restoreSavedTheme() {
    const saved = getSavedTheme();
    document.body.setAttribute("data-theme", saved);
    document.body.setAttribute("data-app-theme", saved);
    syncActiveThemeSwatch(saved);
  }

  function syncActiveThemeSwatch(activeTheme) {
    document.querySelectorAll(".theme-swatch-card, .theme-opt-btn").forEach((card) => {
      const id = card.dataset.themeId || card.dataset.appTheme;
      card.classList.toggle("is-active", id === activeTheme);
    });
  }

  function playThemeChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // AudioContext unavailable or blocked
    }
  }

  // Initial load
  const initialTheme = getSavedTheme();
  applyAppTheme(initialTheme, true);
}

function applyAppTheme(themeKey, silent = false) {
  const validTheme = (!themeKey || themeKey === "default") ? "light" : themeKey;
  const currentTheme = document.body.getAttribute("data-theme");

  document.body.setAttribute("data-theme", validTheme);
  document.body.setAttribute("data-app-theme", validTheme);
  localStorage.setItem("tm_app_theme", validTheme);

  document.querySelectorAll(".theme-swatch-card, button[data-theme-id], button[data-app-theme], .theme-opt-btn").forEach((btn) => {
    const key = btn.dataset.themeId || btn.dataset.appTheme;
    btn.classList.toggle("is-active", key === validTheme);
  });

  if (typeof goalTracker !== "undefined" && goalTracker) {
    goalTracker.theme = validTheme;
    if (elements.goalTrackerCard) {
      elements.goalTrackerCard.className = `goal-tracker-card theme-${validTheme}`;
    }
    const yearlyDash = document.getElementById("gtYearlyDashboardContainer");
    if (yearlyDash) {
      yearlyDash.className = yearlyDash.className
        .replace(/\btheme-\S+/g, "")
        .trim();
      yearlyDash.classList.add(`theme-${validTheme}`);
    }
    if (typeof persistGoalTracker === "function") {
      persistGoalTracker();
    }
  }

  if (!silent && currentTheme !== validTheme) {
    const themeNames = {
      "obsidian": "Midnight Obsidian 🌙",
      "nord": "Nord Frost ❄️",
      "emerald": "Emerald Cyber 🌲",
      "sunset": "Sunset Amber 🌅",
      "synthwave": "Synthwave Neon 🔮",
      "pastel": "Soft Pastel 🎨",
      "slate": "Slate Minimal ⚙️",
      "light": "Crisp Light ☀️",
      "rosewood": "Rosewood 🌹",
      "ocean": "Ocean Depths 🌊"
    };
    showToast(`Workspace theme changed to ${themeNames[validTheme] || validTheme}!`);
  }
}

function handleConferenceNoteDragStart(event) {
  const handle = event.target.closest("[data-drag-note]");
  if (!handle || !elements.confPeopleList?.contains(handle)) return;
  if (event.button !== undefined && event.button !== 0) return;

  const item = handle.closest(".conf-note-item");
  const list = handle.closest("[data-note-list]");
  if (!item || !list) return;

  const reorderableItems = list.querySelectorAll(".conf-note-item:not(.is-editing)");
  if (reorderableItems.length < 2) return;

  event.preventDefault();
  event.stopPropagation();
  cleanupConferenceNoteDrag();

  draggingConferenceNote = {
    pointerId: event.pointerId,
    personId: handle.dataset.personId,
    noteId: handle.dataset.dragNote,
    isCompleted: handle.dataset.noteStatus === "completed",
    startY: event.clientY,
    handle,
    item,
    list,
    isDragging: false,
    dropTargetId: null,
    dropPosition: null,
  };

  try {
    handle.setPointerCapture?.(event.pointerId);
  } catch (error) {
    // Pointer capture is helpful but not required for document-level tracking.
  }

  document.addEventListener("pointermove", handleConferenceNoteDragMove);
  document.addEventListener("pointerup", handleConferenceNoteDragEnd);
  document.addEventListener("pointercancel", handleConferenceNoteDragCancel);
}

function handleConferenceNoteDragMove(event) {
  const drag = draggingConferenceNote;
  if (!drag || drag.pointerId !== event.pointerId) return;
  if (!drag.item.isConnected || !drag.list.isConnected) {
    cleanupConferenceNoteDrag();
    return;
  }

  const distance = event.clientY - drag.startY;
  if (!drag.isDragging) {
    if (Math.abs(distance) < 4) return;
    drag.isDragging = true;
    drag.item.classList.add("is-dragging");
    drag.list.classList.add("is-reordering");
    document.body.classList.add("is-dragging-conf-note");
  }

  event.preventDefault();
  scrollConferenceNoteListDuringDrag(drag.list, event.clientY);
  setConferenceNoteDropTarget(getConferenceNoteDropTarget(drag.list, drag.item, event.clientY));
}

function handleConferenceNoteDragEnd(event) {
  const drag = draggingConferenceNote;
  if (!drag || drag.pointerId !== event.pointerId) return;

  if (drag.isDragging) {
    event.preventDefault();
  }

  const shouldMove = drag.isDragging && drag.dropTargetId && drag.dropPosition;
  const personId = drag.personId;
  const noteId = drag.noteId;
  const targetNoteId = drag.dropTargetId;
  const dropPosition = drag.dropPosition;
  const isCompleted = drag.isCompleted;

  cleanupConferenceNoteDrag();

  if (shouldMove) {
    moveConferenceNote(personId, noteId, targetNoteId, dropPosition, isCompleted);
  }
}

function handleConferenceNoteDragCancel(event) {
  if (!draggingConferenceNote || draggingConferenceNote.pointerId !== event.pointerId) return;
  cleanupConferenceNoteDrag();
}

function getConferenceNoteDropTarget(list, draggedItem, clientY) {
  const items = Array.from(list.querySelectorAll(".conf-note-item:not(.is-editing)"))
    .filter((item) => item !== draggedItem && item.dataset.noteId);

  if (items.length === 0) return null;

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return { item, position: "before" };
    }
  }

  return { item: items[items.length - 1], position: "after" };
}

function setConferenceNoteDropTarget(dropTarget) {
  const drag = draggingConferenceNote;
  if (!drag) return;

  clearConferenceNoteDropTarget();

  if (!dropTarget?.item) {
    drag.dropTargetId = null;
    drag.dropPosition = null;
    return;
  }

  drag.dropTargetId = dropTarget.item.dataset.noteId;
  drag.dropPosition = dropTarget.position;
  dropTarget.item.classList.add(dropTarget.position === "after" ? "is-drop-after" : "is-drop-before");
}

function clearConferenceNoteDropTarget() {
  elements.confPeopleList?.querySelectorAll(".conf-note-item.is-drop-before, .conf-note-item.is-drop-after")
    .forEach((item) => item.classList.remove("is-drop-before", "is-drop-after"));
}

function scrollConferenceNoteListDuringDrag(list, clientY) {
  const rect = list.getBoundingClientRect();
  const edgeSize = 32;
  const maxStep = 12;

  if (clientY < rect.top + edgeSize) {
    const ratio = (rect.top + edgeSize - clientY) / edgeSize;
    list.scrollTop -= Math.ceil(Math.min(1, ratio) * maxStep);
  } else if (clientY > rect.bottom - edgeSize) {
    const ratio = (clientY - (rect.bottom - edgeSize)) / edgeSize;
    list.scrollTop += Math.ceil(Math.min(1, ratio) * maxStep);
  }
}

function cleanupConferenceNoteDrag() {
  const drag = draggingConferenceNote;

  document.removeEventListener("pointermove", handleConferenceNoteDragMove);
  document.removeEventListener("pointerup", handleConferenceNoteDragEnd);
  document.removeEventListener("pointercancel", handleConferenceNoteDragCancel);
  clearConferenceNoteDropTarget();

  if (drag) {
    drag.item?.classList.remove("is-dragging");
    drag.list?.classList.remove("is-reordering");
    try {
      drag.handle?.releasePointerCapture?.(drag.pointerId);
    } catch (error) {
      // The pointer may already be released by the browser.
    }
  }

  document.body.classList.remove("is-dragging-conf-note");
  draggingConferenceNote = null;
}

function addConferencePerson(name) {
  const now = new Date().toISOString();
  const newPerson = {
    id: createId("person"),
    name: name,
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
  conferenceNotes.push(newPerson);
  expandedPeopleIds.add(newPerson.id);
  saveConferenceNotes();
  renderConferenceNotes();
}

function deleteConferencePerson(personId) {
  const person = conferenceNotes.find((p) => p.id === personId);
  if (!person) return;
  if (!confirm(`Delete notes and contact for ${person.name}?`)) return;

  conferenceNotes = conferenceNotes.filter((p) => p.id !== personId);
  expandedPeopleIds.delete(personId);
  expandedCompletedPeopleIds.delete(personId);
  if (editingConferenceNote?.personId === personId) {
    editingConferenceNote = null;
  }
  saveConferenceNotes();
  renderConferenceNotes();
}

function addConferenceNote(personId, text) {
  const person = conferenceNotes.find((p) => p.id === personId);
  if (!person) return;
  const now = new Date().toISOString();
  if (!Array.isArray(person.notes)) person.notes = [];
  person.notes.push({
    id: createId("note"),
    text: text,
    completed: false,
    createdAt: now,
    updatedAt: now,
  });
  touchConferencePerson(person, now);
  saveConferenceNotes();
  renderConferenceNotes();
  focusConferenceNoteInput(personId);
}

function focusConferenceNoteInput(personId) {
  requestAnimationFrame(() => {
    const personItem = elements.confPeopleList?.querySelector(`.conf-person-item[data-person-id="${CSS.escape(personId)}"]`);
    const notesList = personItem?.querySelector(".conf-person-notes-list");
    const input = personItem?.querySelector(".conf-add-note-form input");

    if (notesList) {
      notesList.scrollTop = notesList.scrollHeight;
    }

    input?.focus();
    input?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

function startEditingConferenceNote(personId, noteId) {
  const person = conferenceNotes.find((p) => p.id === personId);
  const note = person?.notes?.find((n) => n.id === noteId);
  if (!person || !note) return;

  editingConferenceNote = { personId, noteId };
  expandedPeopleIds.add(personId);
  if (note.completed) {
    expandedCompletedPeopleIds.add(personId);
  }
  renderConferenceNotes();

  requestAnimationFrame(() => {
    const input = elements.confPeopleList?.querySelector(".conf-edit-note-form input");
    input?.focus();
    input?.select();
  });
}

function cancelEditingConferenceNote() {
  if (!editingConferenceNote) return;
  editingConferenceNote = null;
  renderConferenceNotes();
}

function updateConferenceNote(personId, noteId, text) {
  const person = conferenceNotes.find((p) => p.id === personId);
  const note = person?.notes?.find((n) => n.id === noteId);
  if (!person || !note) return;

  const now = new Date().toISOString();
  note.text = String(text).trim().slice(0, 200);
  note.updatedAt = now;
  touchConferencePerson(person, now);
  editingConferenceNote = null;
  saveConferenceNotes();
  renderConferenceNotes();
  if (note.completed) {
    renderReportNotes();
  }
}

function moveConferenceNote(personId, noteId, targetNoteId, position, isCompleted) {
  const person = conferenceNotes.find((p) => p.id === personId);
  if (!person || !Array.isArray(person.notes)) return false;
  if (!noteId || !targetNoteId || noteId === targetNoteId) return false;

  const completedFlag = Boolean(isCompleted);
  const isSameList = (note) => Boolean(note.completed) === completedFlag;
  const orderedNotes = person.notes.filter(isSameList);
  const fromIndex = orderedNotes.findIndex((note) => note.id === noteId);
  const targetIndex = orderedNotes.findIndex((note) => note.id === targetNoteId);

  if (fromIndex === -1 || targetIndex === -1) return false;

  const [movedNote] = orderedNotes.splice(fromIndex, 1);
  const insertTargetIndex = orderedNotes.findIndex((note) => note.id === targetNoteId);
  if (insertTargetIndex === -1) return false;
  const insertIndex = insertTargetIndex + (position === "after" ? 1 : 0);
  orderedNotes.splice(insertIndex, 0, movedNote);

  let nextIndex = 0;
  person.notes = person.notes.map((note) => {
    if (!isSameList(note)) return note;
    const nextNote = orderedNotes[nextIndex];
    nextIndex += 1;
    return nextNote;
  });

  touchConferencePerson(person);
  saveConferenceNotes();
  renderConferenceNotes();
  if (completedFlag) {
    renderReportNotes();
  }
  return true;
}

function deleteConferenceNote(personId, noteId) {
  const person = conferenceNotes.find((p) => p.id === personId);
  if (!person) return;
  if (!Array.isArray(person.notes)) return;
  const note = person.notes.find((n) => n.id === noteId);
  if (!note) return;
  person.notes = person.notes.filter((n) => n.id !== noteId);
  if (editingConferenceNote?.personId === personId && editingConferenceNote?.noteId === noteId) {
    editingConferenceNote = null;
  }
  touchConferencePerson(person);
  saveConferenceNotes();
  renderConferenceNotes();
  if (note.completed) {
    renderReportNotes();
  }
}

function completeConferenceNote(personId, noteId) {
  const person = conferenceNotes.find((p) => p.id === personId);
  if (!person || !Array.isArray(person.notes)) return;
  const note = person.notes.find((n) => n.id === noteId);
  if (note) {
    const now = new Date().toISOString();
    if (editingConferenceNote?.personId === personId && editingConferenceNote?.noteId === noteId) {
      editingConferenceNote = null;
    }
    note.completed = true;
    note.completedAt = now;
    note.updatedAt = now;
    touchConferencePerson(person, now);
    saveConferenceNotes();
    renderConferenceNotes();
    renderReportNotes();
  }
}

function restoreConferenceNote(personId, noteId) {
  const person = conferenceNotes.find((p) => p.id === personId);
  if (!person || !Array.isArray(person.notes)) return;
  const note = person.notes.find((n) => n.id === noteId);
  if (note) {
    const now = new Date().toISOString();
    if (editingConferenceNote?.personId === personId && editingConferenceNote?.noteId === noteId) {
      editingConferenceNote = null;
    }
    note.completed = false;
    delete note.completedAt;
    note.updatedAt = now;
    touchConferencePerson(person, now);
    saveConferenceNotes();
    renderConferenceNotes();
    renderReportNotes();
    showToast(`Restored note for ${person.name}`);
  }
}

function deleteCompletedConferenceNotePermanently(personId, noteId) {
  const person = conferenceNotes.find((p) => p.id === personId);
  if (!person) return;
  if (!confirm(`Delete this note permanently?`)) return;

  person.notes = person.notes.filter((n) => n.id !== noteId);
  if (editingConferenceNote?.personId === personId && editingConferenceNote?.noteId === noteId) {
    editingConferenceNote = null;
  }
  touchConferencePerson(person);
  saveConferenceNotes();
  renderConferenceNotes();
  renderReportNotes();
  showToast(`Permanently deleted note`);
}

function touchConferencePerson(person, timestamp = new Date().toISOString()) {
  if (person) {
    person.updatedAt = timestamp;
  }
}

function wireReportNotesInteractions() {
  elements.reportView?.addEventListener("click", (event) => {
    // Toggle completed report group collapse/expand
    const groupToggle = event.target.closest("[data-toggle-report-person]");
    if (groupToggle) {
      const personId = groupToggle.dataset.toggleReportPerson;
      const groupElement = groupToggle.closest(".report-person-group");
      if (groupElement) {
        const isCollapsed = groupElement.classList.toggle("is-collapsed");
        if (isCollapsed) {
          collapsedReportPeopleIds.add(personId);
        } else {
          collapsedReportPeopleIds.delete(personId);
        }
      }
      return;
    }

    // Restore completed note
    const restoreBtn = event.target.closest("[data-restore-note]");
    if (restoreBtn) {
      const personId = restoreBtn.dataset.personId;
      const noteId = restoreBtn.dataset.restoreNote;
      restoreConferenceNote(personId, noteId);
      return;
    }

    // Delete completed note permanently
    const deleteBtn = event.target.closest("[data-delete-report-note]");
    if (deleteBtn) {
      const personId = deleteBtn.dataset.personId;
      const noteId = deleteBtn.dataset.deleteReportNote;
      deleteCompletedConferenceNotePermanently(personId, noteId);
      return;
    }
  });
}

function filteredCompletedNotes() {
  const range = elements.reportRange.value || "all";
  const allCompleted = [];

  conferenceNotes.forEach((person) => {
    const completedForPerson = (person.notes || []).filter((note) => note.completed);
    completedForPerson.forEach((note) => {
      allCompleted.push({
        personId: person.id,
        personName: person.name,
        noteId: note.id,
        text: note.text,
        completedAt: note.completedAt
      });
    });
  });

  if (range === "all") return allCompleted;

  const now = new Date();
  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    start.setDate(now.getDate() - 7);
  } else if (range === "month") {
    start.setDate(now.getDate() - 30);
  }

  return allCompleted.filter((item) => {
    if (!item.completedAt) return false;
    return new Date(item.completedAt) >= start;
  });
}

function renderReportNotes() {
  const container = document.getElementById("reportNotesContainer");
  if (!container) return;

  const completedNotes = filteredCompletedNotes();
  if (completedNotes.length === 0) {
    container.innerHTML = `
      <div class="report-notes-empty">
        No completed meeting notes in this period.
      </div>
    `;
    return;
  }

  // Group completed notes by personId
  const grouped = {};
  completedNotes.forEach((item) => {
    if (!grouped[item.personId]) {
      grouped[item.personId] = {
        name: item.personName,
        items: []
      };
    }
    grouped[item.personId].items.push(item);
  });

  container.innerHTML = Object.keys(grouped).map((personId) => {
    const group = grouped[personId];
    const isCollapsed = collapsedReportPeopleIds.has(personId);
    const notesMarkup = group.items.map((item) => {
      const dateStr = item.completedAt ? formatDateTime(item.completedAt) : "";
      const dateBadge = dateStr ? `<span class="report-note-date">${dateStr}</span>` : "";
      return `
        <div class="report-note-row" data-note-id="${item.noteId}" data-person-id="${item.personId}">
          <div class="report-note-left">
            <svg class="report-note-check-icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
            <span class="report-note-text">${escapeHtml(item.text)}</span>
          </div>
          <div class="report-note-right">
            ${dateBadge}
            <button class="report-note-action restore" data-restore-note="${item.noteId}" data-person-id="${item.personId}" title="Restore note to active list" aria-label="Restore note">
              <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
            <button class="report-note-action delete" data-delete-report-note="${item.noteId}" data-person-id="${item.personId}" title="Delete note permanently" aria-label="Delete note">
              <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="report-person-group ${isCollapsed ? 'is-collapsed' : ''}" data-person-id="${personId}">
        <button class="report-person-group-header" type="button" data-toggle-report-person="${personId}">
          <h4 class="report-person-group-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            ${escapeHtml(group.name)}
            <span class="report-person-group-count">(${group.items.length})</span>
          </h4>
          <span class="report-person-group-chevron">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </button>
        <div class="report-person-notes-list">
          ${notesMarkup}
        </div>
      </div>
    `;
  }).join("");
}

function renderConferenceNoteItem(person, note, isCompleted = false) {
  const personId = escapeHtml(person.id);
  const noteId = escapeHtml(note.id);
  const noteText = escapeHtml(note.text || "");
  const isEditing = editingConferenceNote?.personId === person.id && editingConferenceNote?.noteId === note.id;
  const itemClasses = [
    "conf-note-item",
    isCompleted ? "is-completed" : "",
    isEditing ? "is-editing" : "",
  ].filter(Boolean).join(" ");

  if (isEditing) {
    return `
      <div class="${itemClasses}" data-note-id="${noteId}">
        <form class="conf-edit-note-form" data-person-id="${personId}" data-note-id="${noteId}">
          <input type="text" value="${noteText}" maxlength="200" required autocomplete="off" aria-label="Edit note" />
          <div class="conf-note-edit-actions">
            <button class="conf-note-action save" type="submit" title="Save note" aria-label="Save note">
              <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
            </button>
            <button class="conf-note-action" type="button" data-cancel-edit-note="${noteId}" data-person-id="${personId}" title="Cancel edit" aria-label="Cancel edit">
              <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  return `
    <div class="${itemClasses}" data-note-id="${noteId}" data-person-id="${personId}" data-note-status="${isCompleted ? "completed" : "active"}">
      <button class="conf-note-drag-handle" type="button" data-drag-note="${noteId}" data-person-id="${personId}" data-note-status="${isCompleted ? "completed" : "active"}" title="Drag note to reorder" aria-label="Drag note to reorder">
        <svg viewBox="0 0 24 24"><path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" /></svg>
      </button>
      <input type="checkbox" class="conf-note-checkbox" data-note-id="${noteId}" data-person-id="${personId}" ${isCompleted ? "checked" : ""} aria-label="${isCompleted ? "Restore note" : "Mark note complete"}" />
      <button class="conf-note-open" type="button" data-edit-note="${noteId}" data-person-id="${personId}" title="Edit note" aria-label="Edit note">
        <span class="conf-note-text">${noteText}</span>
      </button>
      <div class="conf-note-actions">
        <button class="conf-note-action" type="button" data-edit-note="${noteId}" data-person-id="${personId}" title="Edit note" aria-label="Edit note">
          <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
        <button class="conf-note-action delete" type="button" data-delete-note="${noteId}" data-person-id="${personId}" title="Delete note" aria-label="Delete note">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
  `;
}

function renderConferenceNotes() {
  if (!elements.confPeopleList) return;

  if (!conferenceNotes || conferenceNotes.length === 0) {
    elements.confPeopleList.innerHTML = `
      <div class="conf-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>No contacts added yet. Add people to keep notes for reference.</span>
      </div>
    `;
    return;
  }

  elements.confPeopleList.innerHTML = conferenceNotes.map((person) => {
    const isExpanded = expandedPeopleIds.has(person.id);
    const activeNotes = (person.notes || []).filter((note) => !note.completed);
    const completedNotes = (person.notes || []).filter((note) => note.completed);
    const notesCount = activeNotes.length;
    const completedNotesCount = completedNotes.length;
    const countLabel = `(${notesCount})`;

    let notesListMarkup = "";
    if (notesCount > 0) {
      notesListMarkup = activeNotes.map((note) => renderConferenceNoteItem(person, note)).join("");
    } else {
      notesListMarkup = `<div class="conf-notes-empty">No active notes yet. Add one below.</div>`;
    }

    let completedNotesMarkup = "";
    if (completedNotesCount > 0) {
      const isCompletedExpanded = expandedCompletedPeopleIds.has(person.id);
      completedNotesMarkup = `
        <div class="conf-completed-section ${isCompletedExpanded ? 'is-expanded' : ''}" data-person-id="${person.id}">
          <button class="conf-completed-toggle" type="button" data-toggle-completed="${person.id}">
            <span>Completed (${completedNotesCount})</span>
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <div class="conf-completed-list" data-note-list data-person-id="${escapeHtml(person.id)}" data-note-status="completed">
            ${completedNotes.map((note) => renderConferenceNoteItem(person, note, true)).join("")}
          </div>
        </div>
      `;
    }

    return `
      <div class="conf-person-item ${isExpanded ? 'is-expanded' : ''}" data-person-id="${person.id}">
        <div class="conf-person-header">
          <span class="conf-person-name">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span class="conf-name-text">${escapeHtml(person.name)}</span>
            <span class="conf-notes-count">${countLabel}</span>
          </span>
          <div class="conf-person-actions">
            <button class="conf-delete-person" type="button" data-delete-person="${person.id}" title="Delete person" aria-label="Delete ${escapeHtml(person.name)}">
              <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
            <span class="conf-toggle-expand">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="m6 9 6 6 6-6" /></svg>
            </span>
          </div>
        </div>
        <div class="conf-person-details">
          <div class="conf-person-notes-list" data-note-list data-person-id="${escapeHtml(person.id)}" data-note-status="active">
            ${notesListMarkup}
          </div>
          <form class="conf-add-note-form" data-person-id="${person.id}">
            <input type="text" placeholder="Add a note..." maxlength="200" required autocomplete="off" />
            <button type="submit" title="Add note">Add</button>
          </form>
          ${completedNotesMarkup}
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   BUCKET LIST FEATURE CODE
   ========================================================================== */
let bucketQuadrants = [];
let pendingBucketPersist = Promise.resolve();

function defaultBucketQuadrants() {
  const now = new Date().toISOString();
  return [
    {
      id: "bq-1",
      title: "✈️ Travel & Adventure",
      color: "#3b82f6",
      createdAt: now,
      updatedAt: now,
      items: [
        { id: "bi-1", title: "Visit Northern Lights in Norway", remarks: "Book winter tickets", goalDate: "2026-12-31", isAchieved: false, createdAt: now, updatedAt: now, achievedAt: null },
        { id: "bi-2", title: "Road trip through Japan", remarks: "Tokyo to Kyoto", goalDate: "2027-05-15", isAchieved: false, createdAt: now, updatedAt: now, achievedAt: null }
      ]
    },
    {
      id: "bq-2",
      title: "🧠 Personal Growth & Learning",
      color: "#10b981",
      createdAt: now,
      updatedAt: now,
      items: [
        { id: "bi-3", title: "Read 24 books this year", remarks: "2 books per month", goalDate: "2026-12-31", isAchieved: false, createdAt: now, updatedAt: now, achievedAt: null },
        { id: "bi-4", title: "Master Python & AI Agents", remarks: "Build daily projects", goalDate: "2026-10-01", isAchieved: false, createdAt: now, updatedAt: now, achievedAt: null }
      ]
    },
    {
      id: "bq-3",
      title: "💪 Health & Fitness Goals",
      color: "#f59e0b",
      createdAt: now,
      updatedAt: now,
      items: [
        { id: "bi-5", title: "Run a 10K Marathon", remarks: "Train 3x a week", goalDate: "2026-11-20", isAchieved: false, createdAt: now, updatedAt: now, achievedAt: null }
      ]
    },
    {
      id: "bq-4",
      title: "💼 Career & Financial Milestones",
      color: "#8b5cf6",
      createdAt: now,
      updatedAt: now,
      items: [
        { id: "bi-6", title: "Launch Time Matrix Mobile App", remarks: "Sync Android APK & Web", goalDate: "2026-09-01", isAchieved: true, createdAt: now, updatedAt: now, achievedAt: now }
      ]
    }
  ];
}

async function loadBucketList() {
  if (!currentUser) {
    bucketQuadrants = defaultBucketQuadrants();
    renderBucketList();
    return;
  }
  try {
    const data = await apiRequest("/api/bucket-list");
    if (data && Array.isArray(data.quadrants) && data.quadrants.length > 0) {
      bucketQuadrants = data.quadrants;
    } else {
      bucketQuadrants = defaultBucketQuadrants();
    }
  } catch (error) {
    console.error("Failed to load bucket list:", error);
    bucketQuadrants = defaultBucketQuadrants();
  }
  renderBucketList();
}

let bucketPersounceTimer = null;

function persistBucketList() {
  if (!currentUser) return pendingBucketPersist;

  if (bucketPersounceTimer) clearTimeout(bucketPersounceTimer);

  return new Promise((resolve) => {
    bucketPersounceTimer = setTimeout(() => {
      const snapshot = JSON.parse(JSON.stringify(bucketQuadrants));
      pendingBucketPersist = pendingBucketPersist
        .catch(() => undefined)
        .then(() => apiRequest("/api/bucket-list", { method: "PUT", body: { quadrants: snapshot } }))
        .catch((error) => {
          console.error("Could not save bucket list", error);
          showToast("Could not save bucket list to server");
        });
      resolve(pendingBucketPersist);
    }, 200);
  });
}

function extractCleanCategoryTitle(rawTitle) {
  if (!rawTitle) return "Category";
  return String(rawTitle).replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").trim() || rawTitle;
}

function getCategoryIconSvg(rawTitle) {
  const t = String(rawTitle || "").toLowerCase();
  if (t.includes("travel") || t.includes("trip") || t.includes("flight") || t.includes("country") || t.includes("world") || t.includes("adventure") || t.includes("japan") || t.includes("norway")) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;
  }
  if (t.includes("personal") || t.includes("growth") || t.includes("learn") || t.includes("study") || t.includes("book") || t.includes("mind") || t.includes("skill") || t.includes("habit") || t.includes("read")) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  if (t.includes("health") || t.includes("fit") || t.includes("workout") || t.includes("gym") || t.includes("marathon") || t.includes("run") || t.includes("body") || t.includes("wellness") || t.includes("diet")) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
  }
  if (t.includes("career") || t.includes("work") || t.includes("job") || t.includes("business") || t.includes("project") || t.includes("startup") || t.includes("code") || t.includes("app") || t.includes("matrix")) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
  }
  if (t.includes("finance") || t.includes("wealth") || t.includes("money") || t.includes("invest") || t.includes("asset") || t.includes("save")) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>`;
  }
  if (t.includes("family") || t.includes("relationship") || t.includes("friend") || t.includes("love") || t.includes("social")) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
}

function renderBucketList() {
  if (!elements.bucketQuadrantsGrid) return;

  const totalQuadrants = bucketQuadrants.length;
  let totalGoals = 0;
  let achievedGoals = 0;

  bucketQuadrants.forEach((q) => {
    (q.items || []).forEach((item) => {
      totalGoals++;
      if (item.isAchieved) achievedGoals++;
    });
  });

  if (elements.bucketMetrics) {
    const completionRate = totalGoals ? Math.round((achievedGoals / totalGoals) * 100) : 0;
    elements.bucketMetrics.innerHTML = [
      metricCard("Bucket Quadrants", totalQuadrants, "Custom life categories"),
      metricCard("Total Goals", totalGoals, "Across all categories"),
      metricCard("Achieved Goals", achievedGoals, `${completionRate}% completed targets`),
      metricCard("Active Goals", totalGoals - achievedGoals, "Pending milestones in flight"),
    ].join("");
  }

  if (elements.addBucketQuadrantBtn) {
    elements.addBucketQuadrantBtn.disabled = false;
    elements.addBucketQuadrantBtn.title = "Create new bucket quadrant";
  }

  if (!totalQuadrants) {
    elements.bucketQuadrantsGrid.innerHTML = `
      <div class="empty-state bucket-empty-all" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">
        <div class="bucket-empty-all-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:28px;height:28px;"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </div>
        <strong style="font-size: 1.25rem; font-weight: 700; color: var(--ink); margin-top: 14px; display: block;">No Bucket Quadrants Yet</strong>
        <span style="font-size: 0.9rem; color: var(--muted); max-width: 420px; margin: 8px auto 20px; display: block; line-height: 1.5;">Organize your life goals into high-impact categories like Family, Career, Health, Travel, and Wealth.</span>
        <button class="primary-button" type="button" onclick="document.getElementById('addBucketQuadrantBtn')?.click()" style="display: inline-flex; align-items: center; gap: 8px; margin: 0 auto; border-radius: 9999px; padding: 10px 22px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path d="M12 5v14M5 12h14"/></svg>
          <span>Create First Quadrant</span>
        </button>
      </div>
    `;
    return;
  }

  elements.bucketQuadrantsGrid.innerHTML = bucketQuadrants
    .map((quad) => {
      const items = quad.items || [];
      const activeCount = items.filter((i) => !i.isAchieved).length;
      const doneCount = items.filter((i) => i.isAchieved).length;
      const totalCount = activeCount + doneCount;
      const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
      const quadColor = quad.color || "#3b82f6";
      const cleanTitle = extractCleanCategoryTitle(quad.title);
      const iconSvg = getCategoryIconSvg(quad.title);

      const itemsHtml = items.length
        ? items
          .map((item, idx) => {
            const daysInfo = getDaysRemainingInfo(item.goalDate, item.isAchieved);
            const createdDateFormatted = formatDateString(item.createdAt);

            let dateIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
            if (item.isAchieved) {
              dateIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><path d="M20 6 9 17l-5-5"/></svg>`;
            } else if (daysInfo.className === "overdue") {
              dateIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
            }

            return `
                <div class="bucket-item-card ${item.isAchieved ? "is-achieved" : ""}" data-item-id="${escapeHtml(item.id)}" data-quad-id="${escapeHtml(quad.id)}" draggable="true">
                  <div class="bucket-item-top">
                    <span class="task-drag-handle bucket-drag-handle" title="Drag goal to reorder" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
                    </span>
                    <input class="bucket-item-check" type="checkbox" ${item.isAchieved ? "checked" : ""} data-toggle-bucket-item title="${item.isAchieved ? "Mark as in-progress" : "Mark as achieved"}" />
                    <div class="bucket-item-content">
                      <div class="bucket-item-title">${escapeHtml(item.title)}</div>
                      <div class="bucket-item-meta">
                        <span class="bucket-date-badge ${daysInfo.className}">
                          ${dateIconSvg}
                          <span>${escapeHtml(item.goalDate)}</span>
                          <span class="bucket-days-hint">(${daysInfo.text})</span>
                        </span>
                        <span class="bucket-created-date">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;opacity:0.7;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          <span>Created ${escapeHtml(createdDateFormatted)}</span>
                        </span>
                      </div>
                      ${item.remarks && item.remarks.trim()
                ? `
                        <div class="bucket-item-remarks ${item.remarks.trim().length > 90 || (item.remarks.match(/\n/g) || []).length > 1 ? "is-clampable" : ""}">
                          <div class="bucket-remarks-header">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;flex-shrink:0;opacity:0.8;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span class="bucket-remarks-text">${escapeHtml(item.remarks.trim())}</span>
                          </div>
                          ${item.remarks.trim().length > 90 || (item.remarks.match(/\n/g) || []).length > 1
                  ? `<button type="button" class="bucket-remarks-toggle" data-toggle-remarks-btn>+ Show More</button>`
                  : ""
                }
                        </div>
                      `
                : ""
              }
                    </div>
                    <div class="bucket-item-actions">
                      <div class="task-menu">
                        <button class="small-button bucket-action-btn" type="button" data-edit-bucket-item title="Edit Goal">
                          <svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none; stroke:currentColor; stroke-width:2;"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button class="small-button danger-button bucket-action-btn" type="button" data-delete-bucket-item="${escapeHtml(item.id)}" title="Delete Goal">
                          <svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none; stroke:currentColor; stroke-width:2;"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
          })
          .join("")
        : `
          <div class="bucket-empty-quadrant" data-add-goal-to-quad="${escapeHtml(quad.id)}">
            <div class="bucket-empty-icon" style="color: ${escapeHtml(quadColor)};">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <span>No goals yet. Click to add your first goal!</span>
          </div>
        `;

      return `
        <article class="bucket-quadrant-card" data-quad-id="${escapeHtml(quad.id)}" style="--quad-accent: ${escapeHtml(quadColor)};">
          <div class="bucket-quadrant-top-bar"></div>
          <header class="bucket-quadrant-header">
            <!-- Tier 1: Cyber Aurora Header Top Row -->
            <div class="bucket-header-top-row">
              <div class="bucket-title-group">
                <div class="bucket-neon-shield" style="--shield-color: ${escapeHtml(quadColor)};">
                  ${iconSvg}
                </div>
                <div class="bucket-title-text-wrap">
                  <h3 class="bucket-quadrant-title" title="${escapeHtml(cleanTitle)}">${escapeHtml(cleanTitle)}</h3>
                </div>
              </div>
              <div class="bucket-quadrant-controls">
                <button class="tool-button bucket-add-goal-btn" type="button" data-add-goal-to-quad="${escapeHtml(quad.id)}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;"><path d="M12 5v14M5 12h14"/></svg>
                  <span>Goal</span>
                </button>
                <button class="small-button bucket-quad-action-btn" type="button" data-edit-bucket-quad="${escapeHtml(quad.id)}" title="Edit Quadrant Title">
                  <svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none; stroke:currentColor; stroke-width:2;"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="small-button danger-button bucket-quad-action-btn" type="button" data-delete-bucket-quad="${escapeHtml(quad.id)}" title="Delete Quadrant">
                  <svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none; stroke:currentColor; stroke-width:2;"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>

            <!-- Tier 2: Bento Sub-Dock (Active / Done & Progress) -->
            <div class="bucket-bento-subdock">
              <div class="bucket-dock-chips">
                <span class="bucket-dock-chip active-chip">
                  <span class="dock-pulse-dot" style="background-color: ${escapeHtml(quadColor)}; box-shadow: 0 0 8px ${escapeHtml(quadColor)};"></span>
                  <span class="dock-chip-label"><strong class="dock-chip-val">${activeCount}</strong> Active</span>
                </span>
                <span class="bucket-dock-chip done-chip">
                  <span class="dock-done-dot"></span>
                  <span class="dock-chip-label"><strong class="dock-chip-val">${doneCount}</strong> Done</span>
                </span>
              </div>
              <div class="bucket-dock-progress" title="${percent}% Completed">
                <div class="dock-progress-track">
                  <div class="dock-progress-fill" style="width: ${percent}%; background: linear-gradient(90deg, ${escapeHtml(quadColor)}, #10b981);"></div>
                </div>
                <span class="dock-progress-num">${percent}%</span>
              </div>
            </div>
          </header>
          <div class="bucket-items-container">
            ${itemsHtml}
          </div>
        </article>
      `;
    })
    .join("");
}

function getDaysRemainingInfo(goalDateStr, isAchieved) {
  if (isAchieved) return { text: "Achieved", className: "achieved" };
  if (!goalDateStr) return { text: "No date", className: "" };

  const targetDate = new Date(goalDateStr);
  const now = new Date();
  targetDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = targetDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)}d`, className: "overdue" };
  } else if (diffDays === 0) {
    return { text: "Due Today!", className: "overdue" };
  } else if (diffDays === 1) {
    return { text: "Due Tomorrow", className: "" };
  } else {
    return { text: `In ${diffDays}d`, className: "" };
  }
}

function formatDateString(isoString) {
  if (!isoString) return new Date().toISOString().slice(0, 10);
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString).slice(0, 10);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return String(isoString).slice(0, 10);
  }
}

function wireBucketInteractions() {
  if (elements.addBucketQuadrantBtn) {
    elements.addBucketQuadrantBtn.addEventListener("click", () => {
      openBucketQuadrantModal();
    });
  }

  document.querySelectorAll("[data-close-bucket-quad-modal]").forEach((btn) => {
    btn.addEventListener("click", closeBucketQuadrantModal);
  });

  document.querySelectorAll("[data-close-bucket-item-modal]").forEach((btn) => {
    btn.addEventListener("click", closeBucketItemModal);
  });

  const quadForm = document.getElementById("bucketQuadrantForm");
  if (quadForm) {
    quadForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const quadId = document.getElementById("bucketQuadIdInput").value;
      const title = document.getElementById("bucketQuadTitleInput").value.trim();
      const color = document.getElementById("bucketQuadColorInput").value;

      if (!title) return;

      if (quadId) {
        const quad = bucketQuadrants.find((q) => q.id === quadId);
        if (quad) {
          quad.title = title;
          quad.color = color;
          quad.updatedAt = new Date().toISOString();
        }
      } else {
        bucketQuadrants.push({
          id: createId("bucket-quadrant"),
          title,
          color,
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      persistBucketList();
      renderBucketList();
      closeBucketQuadrantModal();
      showToast(quadId ? "Quadrant updated" : "Quadrant created!");
    });
  }

  const itemForm = document.getElementById("bucketItemForm");
  if (itemForm) {
    itemForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const quadId = document.getElementById("bucketItemQuadIdInput").value;
      const itemId = document.getElementById("bucketItemIdInput").value;
      const title = document.getElementById("bucketItemTitleInput").value.trim();
      const goalDate = document.getElementById("bucketItemGoalDateInput").value;
      const remarks = document.getElementById("bucketItemRemarksInput").value.trim();

      if (!quadId || !title || !goalDate) return;

      const quad = bucketQuadrants.find((q) => q.id === quadId);
      if (!quad) return;

      if (itemId) {
        const item = (quad.items || []).find((i) => i.id === itemId);
        if (item) {
          item.title = title;
          item.goalDate = goalDate;
          item.remarks = remarks;
          item.updatedAt = new Date().toISOString();
        }
      } else {
        if (!quad.items) quad.items = [];
        quad.items.push({
          id: createId("bucket-item"),
          title,
          goalDate,
          remarks,
          isAchieved: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      persistBucketList();
      renderBucketList();
      closeBucketItemModal();
      showToast(itemId ? "Goal updated!" : "Goal added to bucket!");
    });
  }

  if (elements.bucketQuadrantsGrid) {
    let draggedItemId = null;
    let draggedSourceQuadId = null;

    elements.bucketQuadrantsGrid.addEventListener("dragstart", (e) => {
      const card = e.target.closest(".bucket-item-card");
      if (!card) return;

      if (e.target.closest("input, button, textarea, a, select")) {
        e.preventDefault();
        return;
      }

      draggedItemId = card.dataset.itemId;
      draggedSourceQuadId = card.dataset.quadId;
      card.classList.add("is-dragging");

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggedItemId);
      }
    });

    elements.bucketQuadrantsGrid.addEventListener("dragend", (e) => {
      const card = e.target.closest(".bucket-item-card");
      if (card) {
        card.classList.remove("is-dragging");
      }
      draggedItemId = null;
      draggedSourceQuadId = null;
      cleanupBucketDropMarkers();
    });

    elements.bucketQuadrantsGrid.addEventListener("dragover", (e) => {
      if (!draggedItemId) return;

      const container = e.target.closest(".bucket-items-container");
      if (!container) return;

      const quadCard = container.closest(".bucket-quadrant-card");
      if (!quadCard || quadCard.dataset.quadId !== draggedSourceQuadId) return;

      e.preventDefault();

      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

      markBucketDropTarget(container, e);
    });

    elements.bucketQuadrantsGrid.addEventListener("dragleave", (e) => {
      const container = e.target.closest(".bucket-items-container");
      if (container && !container.contains(e.relatedTarget)) {
        container.classList.remove("is-over");
      }
    });

    elements.bucketQuadrantsGrid.addEventListener("drop", (e) => {
      if (!draggedItemId) return;
      e.preventDefault();
      e.stopPropagation();

      const container = e.target.closest(".bucket-items-container");
      if (!container) return;

      const quadCard = container.closest(".bucket-quadrant-card");
      if (!quadCard) return;

      const targetQuadId = quadCard.dataset.quadId;
      if (targetQuadId !== draggedSourceQuadId) {
        cleanupBucketDropMarkers();
        return;
      }

      const dropTarget = getBucketDropTarget(container, e);

      moveBucketItem(draggedItemId, draggedSourceQuadId, targetQuadId, dropTarget);

      draggedItemId = null;
      draggedSourceQuadId = null;
      cleanupBucketDropMarkers();
    });

    elements.bucketQuadrantsGrid.addEventListener("click", (e) => {
      const addGoalBtn = e.target.closest("[data-add-goal-to-quad]");
      if (addGoalBtn) {
        const quadId = addGoalBtn.dataset.addGoalToQuad;
        openBucketItemModal(quadId);
        return;
      }

      const editQuadBtn = e.target.closest("[data-edit-bucket-quad]");
      if (editQuadBtn) {
        const quadId = editQuadBtn.dataset.editBucketQuad;
        const quad = bucketQuadrants.find((q) => q.id === quadId);
        if (quad) openBucketQuadrantModal(quad);
        return;
      }

      const deleteQuadBtn = e.target.closest("[data-delete-bucket-quad]");
      if (deleteQuadBtn) {
        const quadId = deleteQuadBtn.dataset.deleteBucketQuad;
        deleteBucketQuadrant(quadId);
        return;
      }

      const toggleItem = e.target.closest("[data-toggle-bucket-item]");
      if (toggleItem) {
        const itemCard = toggleItem.closest(".bucket-item-card");
        if (itemCard) {
          const quadId = itemCard.dataset.quadId;
          const itemId = itemCard.dataset.itemId;
          const quad = bucketQuadrants.find((q) => q.id === quadId);
          if (quad) {
            const item = (quad.items || []).find((i) => i.id === itemId);
            if (item) {
              item.isAchieved = toggleItem.checked;
              item.achievedAt = item.isAchieved ? new Date().toISOString() : null;
              item.updatedAt = new Date().toISOString();
              persistBucketList();
              renderBucketList();
              showToast(item.isAchieved ? "Goal marked as Achieved! 🎉" : "Goal active again");
            }
          }
        }
        return;
      }

      const editItemBtn = e.target.closest("[data-edit-bucket-item]");
      if (editItemBtn) {
        const itemCard = editItemBtn.closest(".bucket-item-card");
        if (itemCard) {
          const quadId = itemCard.dataset.quadId;
          const itemId = itemCard.dataset.itemId;
          const quad = bucketQuadrants.find((q) => q.id === quadId);
          if (quad) {
            const item = (quad.items || []).find((i) => i.id === itemId);
            if (item) openBucketItemModal(quadId, item);
          }
        }
        return;
      }

      const deleteItemBtn = e.target.closest("[data-delete-bucket-item]");
      if (deleteItemBtn) {
        e.preventDefault();
        e.stopPropagation();
        const itemCard = deleteItemBtn.closest(".bucket-item-card");
        const quadCard = deleteItemBtn.closest(".bucket-quadrant-card");
        const itemId = deleteItemBtn.dataset.deleteBucketItem || (itemCard ? itemCard.dataset.itemId : null);
        const quadId = itemCard ? itemCard.dataset.quadId : (quadCard ? quadCard.dataset.quadId : null);
        if (itemId) {
          deleteBucketItem(quadId, itemId);
        }
        return;
      }

      const remarksToggleBtn = e.target.closest("[data-toggle-remarks-btn]");
      if (remarksToggleBtn) {
        const remarksBox = remarksToggleBtn.closest(".bucket-item-remarks");
        if (remarksBox) {
          const isExpanded = remarksBox.classList.toggle("is-expanded");
          remarksToggleBtn.textContent = isExpanded ? "- Show Less" : "+ Show More";
        }
        return;
      }
    });
  }
}

function openBucketQuadrantModal(quad = null) {
  const modal = document.getElementById("bucketQuadrantModal");
  if (!modal) return;

  document.getElementById("bucketQuadIdInput").value = quad ? quad.id : "";
  document.getElementById("bucketQuadTitleInput").value = quad ? quad.title : "";
  document.getElementById("bucketQuadColorInput").value = quad ? quad.color || "#3b82f6" : "#3b82f6";
  document.getElementById("bucketQuadModalTitle").textContent = quad ? "Edit Bucket Quadrant" : "Create Bucket Quadrant";

  const deleteBtn = document.getElementById("bucketQuadModalDeleteBtn");
  if (deleteBtn) {
    if (quad) {
      deleteBtn.classList.remove("is-hidden");
      deleteBtn.onclick = (e) => {
        if (e) e.preventDefault();
        deleteBucketQuadrant(quad.id);
        closeBucketQuadrantModal();
      };
    } else {
      deleteBtn.classList.add("is-hidden");
      deleteBtn.onclick = null;
    }
  }

  modal.classList.remove("is-hidden");
}

function closeBucketQuadrantModal() {
  const modal = document.getElementById("bucketQuadrantModal");
  if (modal) modal.classList.add("is-hidden");
}

function openBucketItemModal(quadId, item = null) {
  const modal = document.getElementById("bucketItemModal");
  if (!modal) return;

  const quad = bucketQuadrants.find((q) => q.id === quadId);
  const quadTitle = quad ? quad.title : "Bucket Quadrant";

  document.getElementById("bucketItemQuadIdInput").value = quadId;
  document.getElementById("bucketItemIdInput").value = item ? item.id : "";
  document.getElementById("bucketItemTitleInput").value = item ? item.title : "";
  document.getElementById("bucketItemGoalDateInput").value = item ? item.goalDate : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  document.getElementById("bucketItemRemarksInput").value = item ? item.remarks : "";
  document.getElementById("bucketItemModalQuadName").textContent = quadTitle;
  document.getElementById("bucketItemModalTitle").textContent = item ? "Edit Bucket Goal" : "Add Bucket Goal";

  const createdDisplay = document.getElementById("bucketItemCreatedDateDisplay");
  if (createdDisplay) {
    createdDisplay.textContent = item
      ? `📅 Created on: ${formatDateString(item.createdAt)}`
      : `📅 Created on: ${formatDateString(new Date().toISOString())} (Today)`;
  }

  const deleteBtn = document.getElementById("bucketItemModalDeleteBtn");
  if (deleteBtn) {
    if (item) {
      deleteBtn.classList.remove("is-hidden");
      deleteBtn.onclick = (e) => {
        if (e) e.preventDefault();
        deleteBucketItem(quadId, item.id);
        closeBucketItemModal();
      };
    } else {
      deleteBtn.classList.add("is-hidden");
      deleteBtn.onclick = null;
    }
  }

  modal.classList.remove("is-hidden");
}

function closeBucketItemModal() {
  const modal = document.getElementById("bucketItemModal");
  if (modal) modal.classList.add("is-hidden");
}

function deleteBucketQuadrant(quadId) {
  if (!quadId) return;
  const quad = bucketQuadrants.find((q) => q.id === quadId);
  if (!quad) return;
  let userConfirmed = true;
  try {
    userConfirmed = window.confirm ? window.confirm(`Delete "${quad.title}" quadrant and all its goals?`) : true;
  } catch (e) {
    userConfirmed = true;
  }
  if (userConfirmed) {
    bucketQuadrants = bucketQuadrants.filter((q) => q.id !== quadId);
    persistBucketList();
    renderBucketList();
    showToast("Quadrant deleted");
  }
}

function deleteBucketItem(quadId, itemId) {
  if (!itemId && typeof quadId === "string") {
    itemId = quadId;
    quadId = null;
  }
  let quad = quadId ? bucketQuadrants.find((q) => q.id === quadId) : null;
  if (!quad && itemId) {
    quad = bucketQuadrants.find((q) => (q.items || []).some((i) => i.id === itemId));
  }
  if (!quad) return;

  const item = (quad.items || []).find((i) => i.id === itemId);
  const title = item ? item.title : "goal";
  let userConfirmed = true;
  try {
    userConfirmed = window.confirm ? window.confirm(`Delete "${title}" from bucket?`) : true;
  } catch (e) {
    userConfirmed = true;
  }
  if (userConfirmed) {
    quad.items = (quad.items || []).filter((i) => i.id !== itemId);
    persistBucketList();
    renderBucketList();
    showToast("Goal deleted");
  }
}

function markBucketDropTarget(container, event) {
  cleanupBucketDropMarkers();
  container.classList.add("is-over");

  const cards = Array.from(container.querySelectorAll(".bucket-item-card:not(.is-dragging)"));
  if (!cards.length) return;

  const targetCard = cards.find((card) => {
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return event.clientY < midY;
  });

  if (targetCard) {
    targetCard.classList.add("is-drop-before");
  } else {
    cards[cards.length - 1].classList.add("is-drop-after");
  }
}

function getBucketDropTarget(container, event) {
  const cards = Array.from(container.querySelectorAll(".bucket-item-card:not(.is-dragging)"));
  if (!cards.length) return { relativeToId: null, position: "end" };

  const targetCard = cards.find((card) => {
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return event.clientY < midY;
  });

  if (targetCard) {
    return { relativeToId: targetCard.dataset.itemId, position: "before" };
  } else {
    return { relativeToId: cards[cards.length - 1].dataset.itemId, position: "after" };
  }
}

function cleanupBucketDropMarkers() {
  if (!elements.bucketQuadrantsGrid) return;
  elements.bucketQuadrantsGrid.querySelectorAll(".bucket-items-container").forEach((c) => c.classList.remove("is-over"));
  elements.bucketQuadrantsGrid.querySelectorAll(".bucket-item-card").forEach((card) => {
    card.classList.remove("is-drop-before", "is-drop-after", "is-dragging");
  });
}

function moveBucketItem(itemId, sourceQuadId, targetQuadId, dropTarget) {
  if (sourceQuadId !== targetQuadId) return;

  const quad = bucketQuadrants.find((q) => q.id === sourceQuadId);
  if (!quad) return;

  const itemIdx = (quad.items || []).findIndex((i) => i.id === itemId);
  if (itemIdx === -1) return;

  const [item] = quad.items.splice(itemIdx, 1);
  item.updatedAt = new Date().toISOString();

  if (!quad.items) quad.items = [];

  if (!dropTarget || !dropTarget.relativeToId) {
    quad.items.push(item);
  } else {
    const refIdx = quad.items.findIndex((i) => i.id === dropTarget.relativeToId);
    if (refIdx === -1) {
      quad.items.push(item);
    } else {
      const insertAt = dropTarget.position === "before" ? refIdx : refIdx + 1;
      quad.items.splice(insertAt, 0, item);
    }
  }

  persistBucketList();
  renderBucketList();
  showToast("Goal order saved!");
}

/* ==========================================================================
   Goal Tracker Monthly Printable & Interactive Template Logic
   ========================================================================== */

function getDaysInMonth(year, month) {
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) || (new Date().getMonth() + 1);
  return new Date(y, m, 0).getDate();
}

function isDayLocked(year, month, dayNum) {
  const today = new Date();
  const curYr = today.getFullYear();
  const curMo = today.getMonth() + 1; // 1-indexed
  const curDay = today.getDate();

  const y = parseInt(year, 10) || curYr;
  const m = parseInt(month, 10) || curMo;

  if (y > curYr) return true;
  if (y < curYr) return false;

  if (m > curMo) return true;
  if (m < curMo) return false;

  // Same year & month: future days locked
  return dayNum > curDay;
}

function defaultGoalTrackerData() {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1;
  const monthStr = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(now);
  return {
    goalTitle: "Monthly Consistency & Habit Goal",
    monthYear: monthStr,
    year: yr,
    month: mo,
    reward: "Treat myself to a favorite dinner or trip! ✈️",
    notes: "Small daily steps lead to massive long-term results.",
    theme: "pastel",
    tasks: [
      { id: "gt-1", title: "Waking Up Early", uom: "Daily", icon: "🌅", score: 10, scores: Array(31).fill(0), checks: Array(31).fill(false) },
      { id: "gt-2", title: "Workout / Exercise", uom: "30-45m", icon: "🏋️", score: 10, scores: Array(31).fill(0), checks: Array(31).fill(false) },
      { id: "gt-3", title: "Read Book (20 min)", uom: "20 min", icon: "📖", score: 5, scores: Array(31).fill(0), checks: Array(31).fill(false) },
      { id: "gt-4", title: "Deep Work / Study", uom: "60-90m", icon: "📝", score: 10, scores: Array(31).fill(0), checks: Array(31).fill(false) },
      { id: "gt-5", title: "Sleep On Time", uom: "10:30 PM", icon: "🛌", score: 5, scores: Array(31).fill(0), checks: Array(31).fill(false) },
    ],
    updatedAt: new Date().toISOString(),
  };
}

async function loadGoalTracker() {
  if (!currentUser) {
    goalTracker = readLocalGoalTracker();
    ensureCurrentMonthInMonthsData();
    renderGoalTracker();
    return;
  }
  try {
    const res = await apiRequest("/api/goal-tracker");
    if (res && res.goalTracker) {
      goalTracker = normalizeGoalTracker(res.goalTracker);
      saveLocalGoalTracker(goalTracker);
    }
  } catch (err) {
    console.warn("Could not fetch goal tracker from server", err);
    goalTracker = readLocalGoalTracker();
  }
  ensureCurrentMonthInMonthsData();
  renderGoalTracker();
}

function normalizeGoalTracker(raw) {
  if (!raw || typeof raw !== "object") return defaultGoalTrackerData();
  const def = defaultGoalTrackerData();
  const yr = Number(raw.year) || new Date().getFullYear();
  const mo = Number(raw.month) || (new Date().getMonth() + 1);

  const rawTaskList = (Array.isArray(raw.tasks) && raw.tasks.length > 0) ? raw.tasks : def.tasks;

  const tasks = rawTaskList.map((t, idx) => {
    const maxScore = Math.max(1, Math.min(100, Number(t.score) || 10));
    const scores = Array.isArray(t.scores)
      ? Array.from({ length: 31 }, (_, i) => Math.max(0, Math.min(100, Number(t.scores[i]) || 0)))
      : (Array.isArray(t.checks) ? Array.from({ length: 31 }, (_, i) => t.checks[i] ? maxScore : 0) : Array(31).fill(0));

    let uomVal = String(t.uom || "").trim().slice(0, 30);
    if (!uomVal || uomVal === "-") {
      const parenMatch = t.title ? t.title.match(/\(([^)]+)\)/) : null;
      if (parenMatch && parenMatch[1]) {
        uomVal = parenMatch[1].trim().slice(0, 30);
      } else if (/waking|early|morning/i.test(t.title || "")) {
        uomVal = "Daily";
      } else if (/workout|exercise|gym|fitness/i.test(t.title || "")) {
        uomVal = "30-45m";
      } else if (/deep work|study/i.test(t.title || "")) {
        uomVal = "60-90m";
      } else if (/sleep/i.test(t.title || "")) {
        uomVal = "10:30 PM";
      } else {
        uomVal = "";
      }
    }

    return {
      id: String(t.id || `gt-task-${idx}`),
      title: String(t.title || "Task").slice(0, 120),
      uom: uomVal,
      icon: String(t.icon || "🎯").slice(0, 10),
      score: maxScore,
      scores,
      checks: scores.map((s) => s > 0),
    };
  });

  const monthsData = (raw.monthsData && typeof raw.monthsData === "object") ? raw.monthsData : (raw.months_data && typeof raw.months_data === "object" ? raw.months_data : {});

  return {
    goalTitle: String(raw.goalTitle || raw.goal_title || def.goalTitle).slice(0, 120),
    monthYear: String(raw.monthYear || raw.month_year || def.monthYear).slice(0, 60),
    year: yr,
    month: mo,
    reward: String(raw.reward || def.reward).slice(0, 200),
    notes: String(raw.notes || def.notes).slice(0, 800),
    theme: String(raw.theme || "pastel").toLowerCase(),
    tasks,
    monthsData,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function ensureCurrentMonthInMonthsData() {
  if (!goalTracker) return;
  if (!goalTracker.monthsData) goalTracker.monthsData = {};
  const curKey = getGtMonthKey(goalTracker.year, goalTracker.month);
  if (!goalTracker.monthsData[curKey]) {
    goalTracker.monthsData[curKey] = {
      goalTitle: goalTracker.goalTitle || "",
      monthYear: goalTracker.monthYear || "",
      notes: goalTracker.notes || "",
      reward: goalTracker.reward || "",
      tasks: JSON.parse(JSON.stringify(goalTracker.tasks || [])),
    };
  }
}

function readLocalGoalTracker() {
  try {
    const saved = localStorage.getItem("tm_gt_state");
    if (saved) return normalizeGoalTracker(JSON.parse(saved));
  } catch (e) { }
  return defaultGoalTrackerData();
}

function saveLocalGoalTracker(data) {
  try {
    localStorage.setItem("tm_gt_state", JSON.stringify(data));
  } catch (e) { }
}

function persistGoalTracker() {
  saveCurrentGoalTrackerMonthState();
  saveLocalGoalTracker(goalTracker);
  if (!currentUser) return pendingGoalTrackerPersist;

  if (goalTrackerDebounceTimer) clearTimeout(goalTrackerDebounceTimer);

  return new Promise((resolve) => {
    goalTrackerDebounceTimer = setTimeout(() => {
      pendingGoalTrackerPersist = pendingGoalTrackerPersist
        .catch(() => undefined)
        .then(() => apiRequest("/api/goal-tracker", { method: "PUT", body: { goalTracker } }))
        .catch((err) => console.error("Could not save goal tracker to backend:", err));
      resolve(pendingGoalTrackerPersist);
    }, 300);
  });
}

function getGtMonthKey(yr, mo) {
  return `${yr}-${String(mo).padStart(2, '0')}`;
}

function saveCurrentGoalTrackerMonthState() {
  if (!goalTracker) return;
  if (!goalTracker.monthsData) goalTracker.monthsData = {};
  const curKey = getGtMonthKey(goalTracker.year, goalTracker.month);
  goalTracker.monthsData[curKey] = {
    goalTitle: goalTracker.goalTitle || "",
    monthYear: goalTracker.monthYear || "",
    notes: goalTracker.notes || "",
    reward: goalTracker.reward || "",
    tasks: JSON.parse(JSON.stringify(goalTracker.tasks || [])),
  };
}

function switchGoalTrackerMonth(newYr, newMo) {
  saveCurrentGoalTrackerMonthState();
  showAddRow = false;
  editingTaskId = null;

  const targetKey = getGtMonthKey(newYr, newMo);
  goalTracker.year = newYr;
  goalTracker.month = newMo;

  if (!goalTracker.monthsData) goalTracker.monthsData = {};

  if (goalTracker.monthsData[targetKey]) {
    const savedMo = goalTracker.monthsData[targetKey];
    goalTracker.goalTitle = savedMo.goalTitle || "";
    goalTracker.monthYear = savedMo.monthYear || new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(newYr, newMo - 1, 1));
    goalTracker.notes = savedMo.notes || "";
    goalTracker.reward = savedMo.reward || "";
    goalTracker.tasks = JSON.parse(JSON.stringify(savedMo.tasks || []));
  } else {
    // New month: Start with fresh default habit goals list
    const dt = new Date(newYr, newMo - 1, 1);
    const def = defaultGoalTrackerData();
    goalTracker.goalTitle = def.goalTitle;
    goalTracker.monthYear = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(dt);
    goalTracker.notes = def.notes;
    goalTracker.reward = def.reward;
    goalTracker.tasks = def.tasks;

    // Save initial fresh state for new month
    saveCurrentGoalTrackerMonthState();
  }

  renderGoalTracker();
  persistGoalTracker();
}

let editingTaskId = null;
let showAddRow = false;

function autoExtractUom(title) {
  if (!title) return "";
  const paren = title.match(/\(([^)]+)\)/);
  if (paren && paren[1]) return paren[1].trim().slice(0, 30);
  const cadencePattern = /\b(\d+[\d,.]*\s*(?:min|mins|minute|minutes|hr|hrs|hour|hours|km|km\/h|miles|mi|m|steps|reps|pages|ch|chapters|liters|l|glasses|times|x|pts|sec|seconds))\b/i;
  const match = title.match(cadencePattern);
  if (match) return match[1].trim().slice(0, 30);
  if (/waking|early|morning/i.test(title)) return "Daily";
  if (/workout|exercise|gym|fitness/i.test(title)) return "30m";
  if (/sleep/i.test(title)) return "10:30 PM";
  if (/water|hydrate/i.test(title)) return "2-3 L";
  if (/deep work|study/i.test(title)) return "60m";
  return "";
}

let selectedQuickMode = "points";

function wireTableEntryRowEvents() {
  const quickInput = document.getElementById("gtQuickTaskTitle");
  const quickUomInput = document.getElementById("gtQuickTaskUom");
  const quickScore = document.getElementById("gtQuickTaskScore");
  const quickBtn = document.getElementById("gtQuickAddBtn");
  const modePointsBtn = document.getElementById("gtQuickModePoints");
  const modeSimpleBtn = document.getElementById("gtQuickModeSimple");

  if (modePointsBtn && modeSimpleBtn) {
    modePointsBtn.addEventListener("click", () => {
      selectedQuickMode = "points";
      modePointsBtn.classList.add("is-active");
      modeSimpleBtn.classList.remove("is-active");
    });
    modeSimpleBtn.addEventListener("click", () => {
      selectedQuickMode = "simple";
      modeSimpleBtn.classList.add("is-active");
      modePointsBtn.classList.remove("is-active");
    });
  }

  if (quickInput && quickUomInput) {
    quickInput.addEventListener("input", () => {
      if (!quickUomInput.dataset.userEdited) {
        const detected = autoExtractUom(quickInput.value.trim());
        if (detected) {
          quickUomInput.placeholder = detected;
        } else {
          quickUomInput.placeholder = "e.g. 20 min";
        }
      }
    });
    quickUomInput.addEventListener("input", () => {
      quickUomInput.dataset.userEdited = "true";
    });
  }

  function submitQuickAdd() {
    if (!quickInput) return;
    const title = quickInput.value.trim().slice(0, 120);
    if (!title) return;

    let uom = quickUomInput ? quickUomInput.value.trim().slice(0, 30) : "";
    if (!uom) {
      uom = autoExtractUom(title) || "Daily";
    }
    const rawScore = quickScore ? parseInt(quickScore.value, 10) : 10;
    const score = Math.max(1, Math.min(100, rawScore || 10));

    if (!Array.isArray(goalTracker.tasks)) goalTracker.tasks = [];
    const newId = createId("gt-task");
    goalTracker.tasks.push({
      id: newId,
      title,
      uom,
      score,
      scoringMode: selectedQuickMode || "points",
      scores: new Array(31).fill(0),
      checks: new Array(31).fill(false),
    });

    showToast(`Added habit: "${title}" (${selectedQuickMode === 'simple' ? '1-Click Tick ✓' : 'Points Slider 🎚️'})`);
    showAddRow = false;
    renderGoalTracker();
    persistGoalTracker();
  }

  if (quickInput) {
    quickInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitQuickAdd();
      } else if (e.key === "Escape") {
        showAddRow = false;
        renderGoalTracker();
      }
    });
  }
  if (quickUomInput) {
    quickUomInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitQuickAdd();
      } else if (e.key === "Escape") {
        showAddRow = false;
        renderGoalTracker();
      }
    });
  }
  if (quickBtn) {
    quickBtn.addEventListener("click", submitQuickAdd);
  }

  // Inline Edit Row scoring mode toggle
  const editModeBtn = document.getElementById("gtEditModeToggleBtn");
  if (editModeBtn) {
    editModeBtn.addEventListener("click", () => {
      const cur = editModeBtn.dataset.mode || "points";
      const next = cur === "simple" ? "points" : "simple";
      editModeBtn.dataset.mode = next;
      editModeBtn.className = `gt-mode-tag-pill ${next === 'simple' ? 'mode-simple' : 'mode-points'}`;
      editModeBtn.textContent = next === 'simple' ? '✓ Tick' : '🎚️ Slider';
    });
  }

  // Inline Edit Row listeners
  const editTitleInput = document.getElementById("gtEditTitleInput");
  const editUomInput = document.getElementById("gtEditUomInput");
  const editScoreInput = document.getElementById("gtEditScoreInput");
  const saveEditBtn = document.getElementById("gtSaveEditBtn");
  const cancelEditBtn = document.getElementById("gtCancelEditBtn");

  function submitInlineEdit() {
    if (!editingTaskId || !editTitleInput) return;
    const newTitle = editTitleInput.value.trim();
    if (!newTitle) return;

    let newUom = editUomInput ? editUomInput.value.trim().slice(0, 30) : "";
    if (!newUom) {
      newUom = autoExtractUom(newTitle) || "Daily";
    }
    const rawScore = editScoreInput ? parseInt(editScoreInput.value, 10) : 10;
    const newScore = Math.max(1, Math.min(100, rawScore || 10));

    const task = (goalTracker.tasks || []).find((t) => t.id === editingTaskId);
    if (task) {
      task.title = newTitle;
      task.uom = newUom;
      task.score = newScore;
      if (editModeBtn && editModeBtn.dataset.mode) {
        task.scoringMode = editModeBtn.dataset.mode;
      }
      showToast("Habit updated!");
    }
    editingTaskId = null;
    renderGoalTracker();
    persistGoalTracker();
  }

  if (editTitleInput) {
    editTitleInput.focus();
    editTitleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitInlineEdit();
      } else if (e.key === "Escape") {
        editingTaskId = null;
        renderGoalTracker();
      }
    });
  }
  if (editUomInput) {
    editUomInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitInlineEdit();
      } else if (e.key === "Escape") {
        editingTaskId = null;
        renderGoalTracker();
      }
    });
  }
  if (saveEditBtn) saveEditBtn.addEventListener("click", submitInlineEdit);
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      editingTaskId = null;
      renderGoalTracker();
    });
  }
}

function getHabitKnowledge(title, uom) {
  const raw = String(title || "").trim();
  const t = raw.toLowerCase();

  // Helper for clean SVG output
  const svgWrap = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  // Helper for exact word boundaries on short words to prevent substring false-positives
  const hasWord = (w) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`, 'i').test(t);

  // 1. Pets & Animals
  if (t.includes("dog") || t.includes("puppy") || t.includes("cat") || t.includes("kitten") || t.includes("pet") || t.includes("vet") || t.includes("aquarium") || hasWord("fish")) {
    return { category: "Pet Care & Joy", color: "#f59e0b", svg: svgWrap(`<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 20.41A3.5 3.5 0 0 1 0 17v-1.5a5 5 0 0 1 5-5z"/>`) };
  }

  // 2. Botanical Nature & Plants (Prioritized before water)
  if (t.includes("plant") || t.includes("garden") || t.includes("flower") || t.includes("bonsai") || t.includes("tree") || t.includes("botan")) {
    return { category: "Botanical Nature", color: "#22c55e", svg: svgWrap(`<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>`) };
  }

  // 3. Skincare, Dental & Personal Hygiene (Prioritized before ski / sports)
  if (t.includes("skin") || t.includes("sunscreen") || t.includes("face") || t.includes("serum") || t.includes("moisturizer")) {
    return { category: "Skincare Glow", color: "#f472b6", svg: svgWrap(`<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/>`) };
  }
  if (t.includes("teeth") || t.includes("tooth") || t.includes("brush") || t.includes("floss") || t.includes("dental")) {
    return { category: "Dental Care", color: "#38bdf8", svg: svgWrap(`<path d="M12 2C8.5 2 7 5 7 8c0 3.5 1 14 5 14s5-10.5 5-14c0-3-1.5-6-5-6z"/><path d="M9 10a3 3 0 0 0 6 0"/>`) };
  }

  // 4. Yoga & Flexibility (Prioritized before generic sun)
  if (t.includes("yoga") || t.includes("stretch") || t.includes("mobility") || t.includes("flexibility") || t.includes("pilates") || t.includes("asana")) {
    return { category: "Flexibility & Yoga", color: "#0d9488", svg: svgWrap(`<circle cx="12" cy="4" r="2"/><path d="M4 17l4-2 4 3 4-3 4 2"/><path d="M12 8v6"/><path d="M8 12l4 2 4-2"/>`) };
  }

  // 5. Language Studies (Prioritized before generic study/lesson)
  if (t.includes("duolingo") || t.includes("language") || t.includes("vocab") || t.includes("french") || t.includes("spanish") || t.includes("german") || t.includes("japanese") || t.includes("tamil") || t.includes("english") || t.includes("hindi") || t.includes("chinese")) {
    return { category: "Language Study", color: "#2563eb", svg: svgWrap(`<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`) };
  }

  // 6. Running, Walking & Cardio Athletics (Prioritized before generic morning)
  if (t.includes("run") || t.includes("jog") || t.includes("sprint") || t.includes("marathon") || t.includes("treadmill")) {
    return { category: "Running & Cardio", color: "#10b981", svg: svgWrap(`<path d="M4 17.5 8 15l4 2.5 7-4.5"/><path d="M19 13v4.5l-3 1.5-4-2.5-4 2.5L4 17"/><circle cx="17" cy="8" r="2.5"/>`) };
  }
  if (t.includes("walk") || t.includes("step") || t.includes("hike") || t.includes("trek") || t.includes("stroll")) {
    return { category: "Daily Walking", color: "#14b8a6", svg: svgWrap(`<path d="M13 4v6m0 0 3 5m-3-5-3 4-2 6m5-10 2 5 3 6"/><circle cx="13" cy="2" r="1.5"/><path d="m18 19 2 2"/><path d="m6 19-2 2"/>`) };
  }

  // 7. Gym, Weights, Calisthenics & Strength
  if (t.includes("pushup") || t.includes("pullup") || t.includes("plank") || t.includes("abs") || t.includes("dip") || t.includes("calisthenic") || t.includes("bicep")) {
    return { category: "Strength & Power", color: "#059669", svg: svgWrap(`<path d="M6 18h12"/><path d="M6 14h12"/><path d="M9 10c0-2.5 1.5-4 3-4s3 1.5 3 4"/><path d="M4 18v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/>`) };
  }
  if (t.includes("gym") || t.includes("lift") || t.includes("weight") || t.includes("dumbbell") || t.includes("barbell") || t.includes("squat") || t.includes("bench")) {
    return { category: "Fitness Mastery", color: "#10b981", svg: svgWrap(`<path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12"/>`) };
  }
  if (t.includes("swim") || t.includes("pool") || t.includes("lap") || t.includes("diving")) {
    return { category: "Aquatic Cardio", color: "#06b6d4", svg: svgWrap(`<path d="M2 15c2.5 2 5 2 7.5 0 2.5-2 5-2 7.5 0 2.5 2 5 2 7.5 0"/><path d="M2 19c2.5 2 5 2 7.5 0 2.5-2 5-2 7.5 0 2.5 2 5 2 7.5 0"/><path d="M14 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/><path d="m7 11 5-2 4 3"/>`) };
  }
  if (t.includes("cycle") || t.includes("cycling") || t.includes("bike") || t.includes("ride") || t.includes("spin")) {
    return { category: "Cycling Velocity", color: "#0284c7", svg: svgWrap(`<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L8.5 11H12l2.5 3 3.5-6h2"/><path d="M12 17.5V14l-3.5-3"/>`) };
  }
  if (t.includes("box") || t.includes("punch") || t.includes("martial") || t.includes("mma") || t.includes("karate") || t.includes("judo") || t.includes("jiu jitsu")) {
    return { category: "Combat Training", color: "#ef4444", svg: svgWrap(`<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>`) };
  }
  if (t.includes("tennis") || t.includes("badminton") || t.includes("racket") || t.includes("padel") || t.includes("squash") || t.includes("pickleball")) {
    return { category: "Racket Sports", color: "#eab308", svg: svgWrap(`<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18"/><path d="M3 12a9 9 0 0 0 18 0"/><circle cx="12" cy="12" r="4.5" stroke-dasharray="2 2"/>`) };
  }
  if (t.includes("cricket") || t.includes("football") || t.includes("soccer") || t.includes("basketball") || t.includes("volleyball") || t.includes("golf") || t.includes("archery") || hasWord("ski") || t.includes("skiing") || t.includes("snowboard") || t.includes("sport")) {
    return { category: "Sports League", color: "#f59e0b", svg: svgWrap(`<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`) };
  }
  if (t.includes("workout") || t.includes("exercise") || t.includes("train") || t.includes("fitness") || t.includes("hiit")) {
    return { category: "Active Fitness", color: "#10b981", svg: svgWrap(`<circle cx="12" cy="12" r="9"/><polygon points="12 6 15 12 12 18 9 12 12 6"/><circle cx="12" cy="12" r="2" fill="currentColor"/>`) };
  }

  // 8. Cold Exposure & Thermal Detox
  if (t.includes("cold shower") || t.includes("ice bath") || t.includes("cryo") || t.includes("cold plunge")) {
    return { category: "Cold Exposure", color: "#06b6d4", svg: svgWrap(`<path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`) };
  }
  if (t.includes("sauna") || t.includes("steam") || t.includes("hot bath")) {
    return { category: "Thermal Detox", color: "#f97316", svg: svgWrap(`<path d="M8 3v6a4 4 0 0 0 8 0V3"/><path d="M4 14h16M6 18h12M9 22h6"/>`) };
  }

  // 9. Music, Audio & Creative Arts
  if (t.includes("guitar") || t.includes("ukulele") || t.includes("bass")) {
    return { category: "Guitar Mastery", color: "#e11d48", svg: svgWrap(`<path d="m19 5-3 3M14 10l-7 7a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l7-7M15 4l5 5M18 2l4 4"/>`) };
  }
  if (t.includes("piano") || t.includes("keyboard") || t.includes("synth")) {
    return { category: "Piano Chords", color: "#475569", svg: svgWrap(`<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="6" y1="5" x2="6" y2="13"/><line x1="10" y1="5" x2="10" y2="13"/><line x1="14" y1="5" x2="14" y2="13"/><line x1="18" y1="5" x2="18" y2="13"/>`) };
  }
  if (t.includes("drum") || t.includes("percussion") || hasWord("beat")) {
    return { category: "Rhythm & Drums", color: "#f97316", svg: svgWrap(`<ellipse cx="12" cy="7" rx="9" ry="3.5"/><path d="M3 7v10c0 1.93 4.03 3.5 9 3.5s9-1.57 9-3.5V7"/><path d="m5 10 7 4 7-4"/>`) };
  }
  if (t.includes("paint") || t.includes("watercolor") || t.includes("draw") || t.includes("sketch") || t.includes("craft") || t.includes("origami") || t.includes("pottery") || hasWord("art")) {
    return { category: "Visual Arts", color: "#f43f5e", svg: svgWrap(`<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>`) };
  }
  if (t.includes("photo") || t.includes("camera") || t.includes("video") || t.includes("film") || t.includes("youtube") || t.includes("vlog")) {
    return { category: "Photo & Film", color: "#0284c7", svg: svgWrap(`<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`) };
  }
  if (t.includes("podcast") || t.includes("audiobook") || t.includes("audio") || (t.includes("listen") && !t.includes("glisten"))) {
    return { category: "Audio & Podcast", color: "#d946ef", svg: svgWrap(`<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>`) };
  }
  if (t.includes("sing") || t.includes("vocal") || t.includes("song") || t.includes("music") || t.includes("melody")) {
    return { category: "Musical Arts", color: "#d946ef", svg: svgWrap(`<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`) };
  }

  // 10. Dawn, Morning & Alarms
  if (t.includes("alarm") || t.includes("clock")) {
    return { category: "Morning Protocol", color: "#eab308", svg: svgWrap(`<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>`) };
  }
  if (t.includes("sunrise") || t.includes("dawn") || hasWord("sun") || t.includes("kaalai")) {
    return { category: "Dawn Awakening", color: "#f59e0b", svg: svgWrap(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`) };
  }
  if (t.includes("wake") || t.includes("early") || t.includes("morning") || t.includes("rise") || t.includes("get up")) {
    return { category: "Morning Protocol", color: "#f59e0b", svg: svgWrap(`<path d="M12 4v4"/><path d="M4 18h16"/><path d="m4.9 8.9 2.8 2.8"/><path d="M2 14h3"/><path d="M19 14h3"/><path d="m19.1 8.9-2.8 2.8"/><path d="M8 18a4 4 0 0 1 8 0"/>`) };
  }

  // 11. Cleanliness, Chores & Space
  if (t.includes("laundry") || t.includes("clothes") || (t.includes("wash") && !t.includes("brainwash") && !t.includes("bodywash") && !t.includes("car"))) {
    return { category: "Laundry & Wash", color: "#38bdf8", svg: svgWrap(`<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="13" r="5"/><circle cx="12" cy="13" r="2"/>`) };
  }
  if (t.includes("desk") || t.includes("workspace") || t.includes("declutter")) {
    return { category: "Workspace Order", color: "#64748b", svg: svgWrap(`<rect x="3" y="4" width="18" height="12" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/>`) };
  }
  if (t.includes("clean") || t.includes("tidy") || t.includes("sweep") || t.includes("mop") || t.includes("vacuum") || t.includes("dishes") || (t.includes("room") && !t.includes("mushroom"))) {
    return { category: "Order & Clarity", color: "#f97316", svg: svgWrap(`<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>`) };
  }

  // 12. Beverages: Coffee, Tea & Water
  if (t.includes("coffee") || t.includes("espresso") || t.includes("latte") || t.includes("cappuccino") || t.includes("kaapi") || t.includes("caffeine")) {
    return { category: "Roasted Coffee", color: "#b45309", svg: svgWrap(`<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>`) };
  }
  if (t.includes("tea") || t.includes("matcha") || t.includes("chai")) {
    return { category: "Tea & Infusion", color: "#15803d", svg: svgWrap(`<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M12 2a5 5 0 0 0-4 4h8a5 5 0 0 0-4-4z"/>`) };
  }
  if (t.includes("water") || t.includes("hydrate") || t.includes("fluid") || t.includes("bottle") || t.includes("thanni") || t.includes("electrolytes")) {
    return { category: "Vital Hydration", color: "#0284c7", svg: svgWrap(`<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M12 9a3 3 0 0 0-3 3" opacity="0.6"/>`) };
  }

  // 13. Food, Diet, Cooking & Nutrition
  if (t.includes("cook") || t.includes("cooking") || t.includes("bake") || t.includes("baking") || t.includes("kitchen") || t.includes("chef") || t.includes("meal prep")) {
    return { category: "Culinary & Cook", color: "#f97316", svg: svgWrap(`<path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/>`) };
  }
  if (t.includes("salad") || t.includes("veg") || t.includes("fruit") || t.includes("apple") || t.includes("smoothie") || t.includes("juice")) {
    return { category: "Clean Nutrition", color: "#84cc16", svg: svgWrap(`<path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9A9 9 0 0 1 3 11a9 9 0 0 1 9-9Z"/><path d="M12 2v9"/>`) };
  }
  if (t.includes("diet") || t.includes("fasting") || t.includes("calorie") || t.includes("protein") || t.includes("meal") || hasWord("eat") || t.includes("food") || t.includes("keto")) {
    return { category: "Diet & Nutrition", color: "#65a30d", svg: svgWrap(`<path d="M18 6 6 18"/><path d="m20 10-4-4"/><path d="m14 4-4 4"/><circle cx="12" cy="12" r="9"/>`) };
  }

  // 14. Books, Reading & Academia
  if (t.includes("book") || t.includes("novel") || t.includes("read") || t.includes("chapter") || t.includes("library") || t.includes("kindle")) {
    return { category: "Book Reading", color: "#0284c7", svg: svgWrap(`<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/><line x1="6" y1="8" x2="8" y2="8"/><line x1="6" y1="12" x2="9" y2="12"/>`) };
  }
  if (t.includes("study") || t.includes("exam") || t.includes("revise") || t.includes("lesson") || t.includes("homework") || t.includes("course") || t.includes("college") || t.includes("university")) {
    return { category: "Academic Study", color: "#4f46e5", svg: svgWrap(`<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`) };
  }
  if (t.includes("physics") || t.includes("quantum") || t.includes("atom") || t.includes("science") || t.includes("lab") || t.includes("biology") || t.includes("chemistry")) {
    return { category: "Science Core", color: "#6366f1", svg: svgWrap(`<circle cx="12" cy="12" r="2.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-30 12 12)"/>`) };
  }
  if (t.includes("math") || t.includes("algebra") || t.includes("calculus") || t.includes("geometry") || t.includes("statistics") || t.includes("equation")) {
    return { category: "Mathematics", color: "#8b5cf6", svg: svgWrap(`<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/><line x1="4" y1="12" x2="20" y2="12"/>`) };
  }

  // 15. Code, AI, Tech & Engineering
  if (t.includes("ai") || t.includes("llm") || t.includes("gpt") || t.includes("prompt") || t.includes("machine learning") || t.includes("neural") || t.includes("agent")) {
    return { category: "AI & Intelligence", color: "#8b5cf6", svg: svgWrap(`<path d="M12 2a8 8 0 0 0-8 8c0 3.37 2.1 6.27 5.09 7.43L9 22h6l-.09-4.57A8.001 8.001 0 0 0 12 2z"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M9 13a3 3 0 0 0 6 0"/>`) };
  }
  if (t.includes("code") || t.includes("coding") || t.includes("program") || t.includes("dev") || t.includes("git") || t.includes("software") || t.includes("python") || t.includes("javascript") || t.includes("react") || t.includes("rust") || t.includes("golang")) {
    return { category: "Code Architecture", color: "#7c3aed", svg: svgWrap(`<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="14" y1="4" x2="10" y2="20"/>`) };
  }
  if (t.includes("bug") || t.includes("fix") || t.includes("debug") || t.includes("troubleshoot") || t.includes("qa") || t.includes("testing")) {
    return { category: "Debugging & QA", color: "#a855f7", svg: svgWrap(`<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`) };
  }
  if (t.includes("write") || t.includes("blog") || t.includes("journal") || t.includes("diary") || t.includes("essay") || t.includes("typing") || t.includes("content") || t.includes("draft")) {
    return { category: "Creative Writing", color: "#ec4899", svg: svgWrap(`<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>`) };
  }
  if (t.includes("design") || t.includes("figma") || hasWord("ui") || hasWord("ux") || t.includes("wireframe") || t.includes("prototype")) {
    return { category: "Product Design", color: "#f43f5e", svg: svgWrap(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/>`) };
  }
  if (t.includes("deep") || t.includes("focus") || t.includes("matrix") || hasWord("app") || t.includes("project") || t.includes("office") || t.includes("task") || t.includes("business") || (t.includes("work") && !t.includes("breathwork") && !t.includes("workout"))) {
    return { category: "Deep Work Core", color: "#8b5cf6", svg: svgWrap(`<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`) };
  }

  // 16. Email, Planning & Productivity
  if (t.includes("email") || t.includes("inbox") || t.includes("gmail") || t.includes("mail")) {
    return { category: "Inbox Protocol", color: "#0ea5e9", svg: svgWrap(`<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 7 12 13 2 7"/>`) };
  }
  if (t.includes("plan") || t.includes("strategy") || t.includes("roadmap") || t.includes("okr") || t.includes("schedule")) {
    return { category: "Strategic Horizon", color: "#f59e0b", svg: svgWrap(`<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>`) };
  }

  // 17. Mindfulness, Mental & Spiritual
  if (t.includes("breath") || t.includes("pranayama") || t.includes("inhale") || t.includes("exhale")) {
    return { category: "Breath & Vitality", color: "#38bdf8", svg: svgWrap(`<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>`) };
  }
  if (t.includes("pray") || t.includes("prayer") || t.includes("namaz") || t.includes("pooja") || t.includes("spiritual") || t.includes("temple") || t.includes("church") || t.includes("mosque") || t.includes("devotion")) {
    return { category: "Spiritual Light", color: "#f59e0b", svg: svgWrap(`<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`) };
  }
  if (t.includes("gratitude") || t.includes("grateful") || t.includes("affirmation") || t.includes("thankful") || t.includes("joy")) {
    return { category: "Gratitude & Joy", color: "#fbbf24", svg: svgWrap(`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`) };
  }
  if (t.includes("meditat") || t.includes("zen") || t.includes("stillness") || t.includes("silence") || t.includes("calm") || t.includes("peace") || t.includes("mindful") || t.includes("stoic")) {
    return { category: "Mindful Zen", color: "#ec4899", svg: svgWrap(`<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>`) };
  }

  // 18. Sleep & Night Recovery
  if (t.includes("sleep") || t.includes("night") || hasWord("bed") || t.includes("rest") || t.includes("nap") || t.includes("recovery") || t.includes("unplug") || t.includes("slumber") || t.includes("evening") || t.includes("dream") || t.includes("wind down") || t.includes("iravu") || t.includes("moon")) {
    return { category: "Sleep Recovery", color: "#6366f1", svg: svgWrap(`<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/>`) };
  }

  // 19. Finance, Crypto & Wealth
  if (t.includes("crypto") || t.includes("bitcoin") || t.includes("ethereum") || t.includes("coin") || t.includes("token") || t.includes("web3")) {
    return { category: "Crypto Wealth", color: "#f59e0b", svg: svgWrap(`<circle cx="12" cy="12" r="10"/><path d="M9.5 9h4a2 2 0 0 1 0 4H9.5m4 0h1a2 2 0 0 1 0 4H9.5V7"/><line x1="11" y1="5" x2="11" y2="7"/><line x1="11" y1="17" x2="11" y2="19"/><line x1="13" y1="5" x2="13" y2="7"/><line x1="13" y1="17" x2="13" y2="19"/>`) };
  }
  if (t.includes("invest") || t.includes("stock") || t.includes("market") || t.includes("trade") || t.includes("share") || t.includes("equity") || t.includes("etf") || t.includes("portfolio")) {
    return { category: "Investment Bull", color: "#10b981", svg: svgWrap(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`) };
  }
  if (t.includes("money") || t.includes("save") || t.includes("saving") || t.includes("budget") || t.includes("cash") || t.includes("dollar") || t.includes("rupee") || t.includes("bank") || t.includes("expense") || t.includes("finance")) {
    return { category: "Wealth & Finance", color: "#14b8a6", svg: svgWrap(`<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/>`) };
  }

  // 20. Body Care, Eyes, Posture & Supplements
  if (t.includes("shower") || t.includes("bath") || t.includes("bodywash")) {
    return { category: "Shower & Refresh", color: "#06b6d4", svg: svgWrap(`<path d="M4 4h7a4 4 0 0 1 4 4v12"/><path d="M14 12l-4 4"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="13" cy="17" r="1" fill="currentColor"/><circle cx="11" cy="21" r="1" fill="currentColor"/>`) };
  }
  if (t.includes("eye") || t.includes("vision") || t.includes("screen break")) {
    return { category: "Eye Vitality", color: "#38bdf8", svg: svgWrap(`<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`) };
  }
  if (t.includes("posture") || t.includes("spine") || t.includes("back")) {
    return { category: "Spine & Posture", color: "#8b5cf6", svg: svgWrap(`<path d="M12 2v20"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/><circle cx="12" cy="9" r="1.5" fill="currentColor"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/><circle cx="12" cy="20" r="1.5" fill="currentColor"/><path d="M8 9c2-1 6-1 8 0M8 15c2 1 6 1 8 0"/>`) };
  }
  if (t.includes("vitamin") || t.includes("pill") || t.includes("medicine") || t.includes("supplement") || t.includes("omega") || t.includes("creatine") || t.includes("whey")) {
    return { category: "Vital Supplement", color: "#ef4444", svg: svgWrap(`<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>`) };
  }

  // 21. Social, Family & Loved Ones
  if (t.includes("call") || hasWord("phone") || t.includes("talk")) {
    return { category: "Phone Connection", color: "#10b981", svg: svgWrap(`<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>`) };
  }
  if (t.includes("mom") || t.includes("dad") || t.includes("parent") || t.includes("family") || t.includes("kid") || t.includes("child") || t.includes("wife") || t.includes("husband") || t.includes("baby") || t.includes("love") || t.includes("date night")) {
    return { category: "Family & Heart", color: "#f43f5e", svg: svgWrap(`<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`) };
  }
  if (t.includes("friend") || t.includes("hangout") || t.includes("meet") || t.includes("social") || t.includes("reunion") || t.includes("party")) {
    return { category: "Friendship Circle", color: "#f59e0b", svg: svgWrap(`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`) };
  }
  if (t.includes("volunteer") || t.includes("charity") || t.includes("donate") || t.includes("help") || t.includes("community")) {
    return { category: "Community Giving", color: "#10b981", svg: svgWrap(`<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`) };
  }

  // 22. Chess, Strategy & Gaming
  if (t.includes("chess")) {
    return { category: "Chess Strategy", color: "#9333ea", svg: svgWrap(`<path d="M19 22H5a2 2 0 0 1-2-2V10l3-3 2 1 3-3 2 1 3-3 3 3v12a2 2 0 0 1-2 2z"/><path d="M12 18v-4"/>`) };
  }
  if (t.includes("game") || t.includes("gaming") || t.includes("puzzle") || hasWord("play") || t.includes("esport")) {
    return { category: "Strategic Mind", color: "#a855f7", svg: svgWrap(`<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>`) };
  }

  // 23. Travel, Vehicle & Digital Detox
  if (t.includes("detox") || t.includes("unplug") || t.includes("no screen") || t.includes("screen time")) {
    return { category: "Digital Detox", color: "#64748b", svg: svgWrap(`<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="2" y1="2" x2="22" y2="22"/>`) };
  }
  if (t.includes("car") || t.includes("drive") || t.includes("vehicle") || t.includes("commute")) {
    return { category: "Drive & Navigation", color: "#2563eb", svg: svgWrap(`<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`) };
  }
  if (t.includes("travel") || t.includes("flight") || t.includes("plane") || t.includes("trip") || t.includes("vacation") || t.includes("explore")) {
    return { category: "Travel & Voyage", color: "#0284c7", svg: svgWrap(`<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>`) };
  }

  // =========================================================================
  // 24. ADVANCED UNIVERSAL PROCEDURAL 3D EMOJI GENERATOR (For ANY unseen word)
  // =========================================================================
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  const palettes = [
    { name: "Neon Cyan", color: "#06b6d4" },
    { name: "Emerald Prime", color: "#10b981" },
    { name: "Solar Gold", color: "#f59e0b" },
    { name: "Electric Violet", color: "#8b5cf6" },
    { name: "Rose Quartz", color: "#ec4899" },
    { name: "Azure Cobalt", color: "#2563eb" },
    { name: "Jade Mint", color: "#14b8a6" },
    { name: "Magma Orange", color: "#f97316" },
    { name: "Tokyo Fuchsia", color: "#d946ef" },
    { name: "Cyber Lime", color: "#84cc16" },
    { name: "Indigo Orbit", color: "#6366f1" },
    { name: "Crimson Flame", color: "#ef4444" },
    { name: "Aurora Teal", color: "#0d9488" },
    { name: "Amber Honey", color: "#d97706" },
    { name: "Royal Purple", color: "#7c3aed" },
    { name: "Deep Sky", color: "#0284c7" }
  ];
  const chosen = palettes[absHash % palettes.length];

  // 8 Modern Outer Cyber Shields
  const shieldVariant = absHash % 8;
  let shieldPath = "";
  if (shieldVariant === 0) {
    // Hexagonal Cyber Shield
    shieldPath = `<polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2"/><polygon points="12 5 18 8.5 18 15.5 12 19 6 15.5 6 8.5 12 5" stroke-dasharray="1.5 2" opacity="0.5"/>`;
  } else if (shieldVariant === 1) {
    // Diamond Octahedron Prism
    shieldPath = `<polygon points="12 2 22 12 12 22 2 12 12 2"/><polygon points="12 6 18 12 12 18 6 12 12 6" stroke-dasharray="1.5 2" opacity="0.5"/>`;
  } else if (shieldVariant === 2) {
    // Concentric Orbit Matrix
    shieldPath = `<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6.5" stroke-dasharray="2 2" opacity="0.5"/><circle cx="12" cy="2.5" r="1" fill="currentColor"/><circle cx="12" cy="21.5" r="1" fill="currentColor"/>`;
  } else if (shieldVariant === 3) {
    // Precision Rounded Octagon
    shieldPath = `<path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z"/><circle cx="12" cy="12" r="7" stroke-dasharray="2 2" opacity="0.4"/>`;
  } else if (shieldVariant === 4) {
    // Delta Sacred Triangle
    shieldPath = `<polygon points="12 3 22 20 2 20 12 3"/><polygon points="12 8 18 18 6 18 12 8" stroke-dasharray="2 2" opacity="0.5"/>`;
  } else if (shieldVariant === 5) {
    // Aegis High-Tech Crest
    shieldPath = `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 19s5-2.5 5-7V6.5L12 4.5 7 6.5V12c0 4.5 5 7 5 7z" stroke-dasharray="1.5 2" opacity="0.5"/>`;
  } else if (shieldVariant === 6) {
    // Stellar Quad-Star
    shieldPath = `<path d="M12 2c2 5 5 8 10 10-5 2-8 5-10 10-2-5-5-8-10-10 5-2 8-5 10-10z"/><circle cx="12" cy="12" r="4.5" stroke-dasharray="1.5 2" opacity="0.5"/>`;
  } else {
    // Precision Cyber Capsule
    shieldPath = `<rect x="3" y="3" width="18" height="18" rx="6" ry="6"/><rect x="6" y="6" width="12" height="12" rx="3" ry="3" stroke-dasharray="2 2" opacity="0.5"/>`;
  }

  // 12 High-Definition Core 3D Symbols
  const coreVariant = (absHash >> 3) % 12;
  let corePath = "";
  if (coreVariant === 0) {
    // Quantum Core Atom
    corePath = `<ellipse cx="12" cy="12" rx="5" ry="2" transform="rotate(45 12 12)" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="5" ry="2" transform="rotate(-45 12 12)" stroke-width="1.8"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>`;
  } else if (coreVariant === 1) {
    // Energy Lightning Bolt
    corePath = `<polygon points="13 7 8 13 12 13 11 17 16 11 12 11 13 7" fill="currentColor" stroke="none"/>`;
  } else if (coreVariant === 2) {
    // Diamond Crystal Star
    corePath = `<polygon points="12 7 15 12 12 17 9 12 12 7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="var(--surface, #fff)"/>`;
  } else if (coreVariant === 3) {
    // Concentric Radar Core
    corePath = `<circle cx="12" cy="12" r="3.5" stroke-width="1.8"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>`;
  } else if (coreVariant === 4) {
    // Radiant Sunburst
    corePath = `<circle cx="12" cy="12" r="2.5" fill="currentColor"/><line x1="12" y1="6.5" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="17.5"/><line x1="6.5" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="17.5" y2="12"/>`;
  } else if (coreVariant === 5) {
    // Cyber Cube Isometric
    corePath = `<path d="M12 7.5 15.5 9.5v4L12 15.5 8.5 13.5v-4L12 7.5z" stroke-width="1.5"/><path d="M12 11.5v4M12 11.5 15.5 9.5M12 11.5 8.5 9.5"/>`;
  } else if (coreVariant === 6) {
    // Torch Flame
    corePath = `<path d="M12 7c-1 2.5 1.5 3.5 1 5.5-.3 1.2-1.2 1.8-2 1.5-.7-.3-1-1.2-.5-2.2 0 0-2 1.2-1.5 3.2.5 2 2.5 2.5 3.5 1.5 1.2-1.2 1.5-3.5 0-5.5-.3-.4-.5-.8-.5-1z" fill="currentColor" stroke="none"/>`;
  } else if (coreVariant === 7) {
    // Crown of Mastery
    corePath = `<path d="m8 15 1-4 3 2.5 3-2.5 1 4H8z" fill="currentColor" stroke="none"/><line x1="8" y1="16.5" x2="16" y2="16.5" stroke-width="2"/>`;
  } else if (coreVariant === 8) {
    // Infinity Loop Core
    corePath = `<path d="M14.5 10c1.8 0 1.8 4 0 4-1.8 0-2.5-4-4.5-4-1.8 0-1.8 4 0 4 2 0 2.7-4 4.5-4z" stroke-width="1.8"/>`;
  } else if (coreVariant === 9) {
    // Radiant Lotus
    corePath = `<path d="M12 7.5c.8 1.5 2 2.5 3.5 2.5-1 1.5-2 3-3.5 6.5-1.5-3.5-2.5-5-3.5-6.5 1.5 0 2.7-1 3.5-2.5z" fill="currentColor" stroke="none"/>`;
  } else if (coreVariant === 10) {
    // Compass Needle
    corePath = `<polygon points="14 10 10 14 11 11 14 10" fill="currentColor" stroke="none"/><polygon points="10 14 14 10 13 13 10 14" fill="currentColor" stroke="none" opacity="0.6"/><circle cx="12" cy="12" r="4" stroke-width="1.5"/>`;
  } else {
    // Cyber Hex Star
    corePath = `<polygon points="12 7 13.5 10.5 17 12 13.5 13.5 12 17 10.5 13.5 7 12 10.5 10.5 12 7" fill="currentColor" stroke="none"/>`;
  }

  const proceduralSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${shieldPath}${corePath}</svg>`;

  const words = raw.split(/\s+/).filter(Boolean);
  const firstWord = words.length > 0 ? (words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase()) : "Daily";
  const suffixes = ["Protocol", "Mastery", "Flow", "Routine", "Discipline", "Ritual"];
  const chosenSuffix = suffixes[absHash % suffixes.length];
  const smartCat = `${firstWord} ${chosenSuffix}`;

  return {
    category: smartCat,
    color: chosen.color,
    svg: proceduralSvg
  };
}

function getHabitSvgIcon(title, uom) {
  const meta = getHabitKnowledge(title, uom);
  return meta.svg;
}

function renderGoalTracker() {
  if (!elements.goalTrackerCard) return;

  const now = new Date();
  const curYr = now.getFullYear();
  const curMo = now.getMonth() + 1;
  const curDay = now.getDate();

  const yr = goalTracker.year || curYr;
  const mo = goalTracker.month || curMo;
  const daysInMonth = getDaysInMonth(yr, mo);

  // Theme (Synced with Workspace App Theme)
  const savedAppTheme = localStorage.getItem("tm_app_theme") || goalTracker.theme || "obsidian";
  elements.goalTrackerCard.className = `goal-tracker-card theme-${savedAppTheme}`;
  // Also propagate to yearly dashboard
  const yearlyDash = document.getElementById("gtYearlyDashboardContainer");
  if (yearlyDash) {
    yearlyDash.className = yearlyDash.className.replace(/\btheme-\S+/g, "").trim();
    yearlyDash.classList.add(`theme-${savedAppTheme}`);
  }

  // Month Picker
  if (elements.gtMonthPicker) {
    const moStr = String(mo).padStart(2, '0');
    elements.gtMonthPicker.value = `${yr}-${moStr}`;
  }

  // Fields
  if (elements.gtGoalTitleInput && document.activeElement !== elements.gtGoalTitleInput) {
    elements.gtGoalTitleInput.value = goalTracker.goalTitle || "";
  }
  const monthDisplayStr = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(yr, mo - 1, 1));
  if (elements.gtMonthYearInput && document.activeElement !== elements.gtMonthYearInput) {
    elements.gtMonthYearInput.value = monthDisplayStr;
    goalTracker.monthYear = monthDisplayStr;
  }
  if (elements.gtNotesInput && document.activeElement !== elements.gtNotesInput) {
    elements.gtNotesInput.value = goalTracker.notes || "";
  }
  if (elements.gtRewardInput && document.activeElement !== elements.gtRewardInput) {
    elements.gtRewardInput.value = goalTracker.reward || "";
  }

  // Days Header Colspan & Dynamic Colgroup
  if (elements.gtDaysHeaderColspan) {
    elements.gtDaysHeaderColspan.setAttribute("colspan", String(daysInMonth));
  }
  const gtColgroupEl = elements.gtColgroup || document.getElementById("gtColgroup");
  if (gtColgroupEl) {
    let colHtml = `
      <col class="col-task" style="width: 280px; min-width: 280px; max-width: 280px;" />
      <col class="col-uom" style="width: 80px; min-width: 80px; max-width: 80px;" />
      <col class="col-score" style="width: 110px; min-width: 110px; max-width: 110px;" />
    `;
    for (let d = 1; d <= daysInMonth; d++) {
      colHtml += `<col class="gt-col-day" style="width: 34px; min-width: 34px; max-width: 34px;" />`;
    }
    colHtml += `<col class="col-actions" style="width: 65px; min-width: 65px; max-width: 65px;" />`;
    gtColgroupEl.innerHTML = colHtml;
  }

  // Days Header Subnav with Modern Weekday Initial + Date (Zero ghost cells, rows unified via rowspan="2")
  if (elements.gtDaysSubnavHeader) {
    let dayCols = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = (yr === curYr && mo === curMo && d === curDay);
      const isWeekSep = d > 1 && (d - 1) % 7 === 0; // separator every 7 days
      const dayDateObj = new Date(yr, mo - 1, d);
      const dayOfWeekShort = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(dayDateObj);
      const dayOfWeekNum = dayDateObj.getDay();
      const isWeekend = (dayOfWeekNum === 0 || dayOfWeekNum === 6);
      const dayInitial = dayOfWeekShort.charAt(0);
      const fullDateTitle = `${d} ${new Intl.DateTimeFormat(undefined, { month: "short" }).format(dayDateObj)} ${yr} (${dayOfWeekShort})`;

      let headClass = "gt-day-col-head";
      if (isToday) headClass += " is-today";
      if (isWeekend) headClass += " is-weekend";
      if (isWeekSep) headClass += " week-sep";

      dayCols += `
        <th class="${headClass}" title="${escapeHtml(fullDateTitle)}" data-day-col="${d}">
          <span class="gt-day-dow ${isWeekend ? 'dow-weekend' : ''}">${dayInitial}</span>
          <span class="gt-day-date-str">${d}</span>
        </th>
      `;
    }
    elements.gtDaysSubnavHeader.innerHTML = dayCols;
  }

  // Table Body Rows
  if (elements.gtTableBody) {
    const tasks = goalTracker.tasks || [];
    let rowsHtml = "";

    if (!tasks.length && !showAddRow) {
      // Empty state
      rowsHtml = `
        <tr class="gt-empty-state-row">
          <td colspan="${3 + daysInMonth + 1}">
            <div class="gt-empty-state">
              <div class="gt-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;stroke:var(--accent);">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <h3 class="gt-empty-title">No habits yet</h3>
              <p class="gt-empty-sub">Click <strong>+ Add Habit Task</strong> to start tracking your monthly habits.</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      tasks.forEach((task) => {
        if (editingTaskId === task.id) {
          rowsHtml += `
            <tr class="gt-row-editing" data-gt-task-id="${task.id}">
              <td class="col-task">
                <div class="gt-task-cell gt-edit-cell">
                  <div class="gt-cyber-icon-badge" style="--badge-color: #3b82f6;" aria-hidden="true">
                    ${getHabitSvgIcon(task.title, task.uom)}
                  </div>
                  <input type="text" id="gtEditTitleInput" class="gt-quick-input" value="${escapeHtml(task.title)}" placeholder="Habit title..." autocomplete="off" />
                </div>
              </td>
              <td class="col-uom">
                <input type="text" id="gtEditUomInput" class="gt-quick-uom-input" value="${escapeHtml(task.uom || '')}" placeholder="e.g. 20 min" maxlength="30" autocomplete="off" title="Unit / Cadence (e.g. 20 min, 5 km, Daily)" />
              </td>
              <td class="col-score">
                <input type="number" id="gtEditScoreInput" class="gt-quick-score-input" value="${task.score || 10}" min="1" max="100" />
                <button type="button" id="gtEditModeToggleBtn" class="gt-mode-tag-pill ${task.scoringMode === 'simple' ? 'mode-simple' : 'mode-points'}" data-mode="${task.scoringMode || 'points'}" style="margin-top:4px;" title="Click to toggle Points Slider vs 1-Click Tick">
                  ${task.scoringMode === 'simple' ? '✓ Tick' : '🎚️ Slider'}
                </button>
              </td>
              <td colspan="${daysInMonth}">
                <span class="gt-quick-hint">Press Enter ↵ to save changes</span>
              </td>
              <td class="col-actions no-print">
                <div class="gt-row-actions">
                  <button class="gt-row-btn btn-save" type="button" id="gtSaveEditBtn" title="Save">✓</button>
                  <button class="gt-row-btn btn-cancel" type="button" id="gtCancelEditBtn" title="Cancel">✕</button>
                </div>
              </td>
            </tr>
          `;
        } else {
          // — Streak —
          const streak = calcStreak(task, yr, mo, curDay, curYr, curMo);
          const streakBadge = streak >= 2
            ? `<span class="gt-streak-badge" title="${streak}-day streak">
                <svg class="gt-streak-fire-svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
                <span>${streak}</span>
              </span>`
            : "";

          // — Monthly completion % for this habit —
          const isCurrentMonth = (yr === curYr && mo === curMo);
          const passedDays = isCurrentMonth ? Math.min(curDay, daysInMonth) : daysInMonth;
          let taskEarned = 0;
          const taskMax = (Number(task.score) || 10) * passedDays;
          for (let d = 0; d < passedDays; d++) {
            taskEarned += Array.isArray(task.scores) ? (Number(task.scores[d]) || 0) : 0;
          }
          const taskPct = taskMax > 0 ? Math.round((taskEarned / taskMax) * 100) : 0;
          let pctClass = "gt-row-pct pct-zero";
          if (taskPct >= 100) pctClass = "gt-row-pct pct-full";
          else if (taskPct >= 50) pctClass = "gt-row-pct pct-half";
          else if (taskPct > 0) pctClass = "gt-row-pct pct-low";
          const pctBadge = passedDays > 0
            ? `<span class="${pctClass}">${taskPct}%</span>`
            : "";

          // — Row accent class (performance color) —
          let rowAccent = "";
          if (passedDays > 0) {
            if (taskPct >= 80) rowAccent = "row-accent-green";
            else if (taskPct >= 50) rowAccent = "row-accent-amber";
            else if (taskPct > 0) rowAccent = "row-accent-red";
          }

          let dayBubbles = "";
          for (let d = 0; d < daysInMonth; d++) {
            const dayNum = d + 1;
            const locked = isDayLocked(yr, mo, dayNum);
            const isToday = (yr === curYr && mo === curMo && dayNum === curDay);
            const isWeekSep = d > 0 && d % 7 === 0;
            const scoreVal = Array.isArray(task.scores) ? (task.scores[d] || 0) : (task.checks && task.checks[d] ? task.score : 0);

            let bubbleClass = "day-bubble";
            if (isToday) bubbleClass += " is-today";
            if (locked) bubbleClass += " is-locked";
            if (scoreVal > 0) {
              bubbleClass += " has-score";
              if (scoreVal >= task.score) bubbleClass += " full-score";
              else bubbleClass += " partial-score";
            }

            const dateStr = `${dayNum}.${mo}.${String(yr).slice(-2)}`;
            let titleText = `${dateStr}`;
            if (locked) titleText += `: Future day locked`;
            else titleText += `: ${scoreVal} / ${task.score} marks (Click to toggle | Shift-click to adjust)`;

            const lockSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
            const checkSvg = `<svg class="day-bubble-check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

            dayBubbles += `
              <td class="gt-day-td ${isToday ? 'is-today' : ''} ${isWeekSep ? 'week-sep' : ''}">
                <div class="day-bubble-wrap">
                  <button class="${bubbleClass}" type="button" data-gt-check data-task-id="${task.id}" data-day="${d}" title="${escapeHtml(titleText)}">
                    ${locked ? lockSvg : (scoreVal > 0 ? (scoreVal >= task.score ? checkSvg : scoreVal) : '')}
                  </button>
                </div>
              </td>
            `;
          }

          const habitMeta = getHabitKnowledge(task.title, task.uom);

          rowsHtml += `
            <tr class="gt-habit-row ${rowAccent}" data-gt-task-id="${task.id}">
              <td class="col-task">
                <div class="gt-cyber-habit-card" style="--cat-color: ${escapeHtml(habitMeta.color)};" title="${escapeHtml(task.title)}">
                  <div class="gt-cyber-icon-badge" style="--badge-color: ${escapeHtml(habitMeta.color)};" aria-hidden="true">
                    ${habitMeta.svg}
                  </div>
                  <div class="gt-cyber-text-stack">
                    <span class="gt-cyber-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
                    <div class="gt-cyber-meta-row">
                      ${streakBadge ? `<span class="gt-cyber-streak">${streakBadge}</span>` : ''}
                      <span class="gt-cyber-cat-chip" style="--chip-color: ${escapeHtml(habitMeta.color)};">${escapeHtml(habitMeta.category)}</span>
                    </div>
                  </div>
                  <div class="gt-conic-radial-ring" style="--pct: ${taskPct}; --ring-color: ${escapeHtml(habitMeta.color)};" title="Month-to-date: ${taskEarned}/${taskMax} pts (${taskPct}%)">
                    <span class="gt-radial-pct-text">${taskPct}%</span>
                  </div>
                </div>
              </td>
              <td class="col-uom" data-gt-uom-click="${task.id}" title="Click to set or change Unit/Cadence (e.g. 20 min, 5 km, Daily)">
                <span class="gt-uom-badge ${!task.uom ? 'gt-uom-empty' : ''}" data-gt-uom-click="${task.id}">${escapeHtml(task.uom || 'Set Unit')}</span>
              </td>
              <td class="col-score">
                <div class="gt-score-cell-stack">
                  <div class="gt-score-primary">
                    <span class="gt-score-target">${task.score}</span>
                    <span class="gt-score-pts-label">pts</span>
                    <button type="button" class="gt-mode-tag-pill ${task.scoringMode === 'simple' ? 'mode-simple' : 'mode-points'}" data-toggle-habit-mode="${task.id}" title="Click to toggle scoring mode: 🎚️ Points Slider vs ✓ 1-Click Tick">
                      ${task.scoringMode === 'simple' ? '✓ Tick' : '🎚️ Slider'}
                    </button>
                  </div>
                  <div class="gt-score-progress-wrap" title="${taskEarned} / ${taskMax} pts (${taskPct}%)">
                    <div class="gt-score-progress-bar ${pctClass.replace('gt-row-pct', '')}" style="width: ${Math.min(100, taskPct)}%;"></div>
                  </div>
                  <div class="gt-score-sub">${taskEarned}/${taskMax} (${taskPct}%)</div>
                </div>
              </td>
              ${dayBubbles}
              <td class="col-actions no-print">
                <div class="gt-row-actions">
                  <button class="gt-row-btn" type="button" data-gt-edit="${task.id}" title="Edit Habit">
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill:none; stroke:currentColor; stroke-width:2;"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
                  <button class="gt-row-btn" type="button" data-gt-delete="${task.id}" title="Delete Habit">
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill:none; stroke:currentColor; stroke-width:2;"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }
      });
    }

    // In-Table Habit Quick Entry Row — only shown when user clicks "Add Habit Task"
    if (showAddRow) {
      rowsHtml += `
        <tr class="gt-table-entry-row no-print" id="gtTableAddRow">
          <td class="col-task">
            <div class="gt-quick-add-cell">
              <input type="text" id="gtQuickTaskTitle" class="gt-quick-input" placeholder="+ Type habit name..." maxlength="120" autocomplete="off" />
            </div>
          </td>
          <td class="col-uom">
            <input type="text" id="gtQuickTaskUom" class="gt-quick-uom-input" placeholder="e.g. 20 min" maxlength="30" autocomplete="off" title="Unit / Cadence (e.g. 20 min, 5 km, Daily)" />
          </td>
          <td class="col-score">
            <input type="number" id="gtQuickTaskScore" class="gt-quick-score-input" value="10" min="1" max="100" title="Points" />
          </td>
          <td colspan="${daysInMonth}" class="gt-quick-hint-td">
            <div class="gt-scoring-choice-wrap">
              <span class="gt-scoring-choice-label">Points adjust panra option venuma?</span>
              <div class="gt-scoring-choice-pills">
                <button type="button" id="gtQuickModePoints" class="gt-scoring-pill ${selectedQuickMode !== 'simple' ? 'is-active' : ''}" title="Yes: Day bubble click panna Precision Slider & Cyber Dial varum">
                  <span class="pill-icon">🎚️</span>
                  <span class="pill-title">Yes (Points Slider)</span>
                </button>
                <button type="button" id="gtQuickModeSimple" class="gt-scoring-pill ${selectedQuickMode === 'simple' ? 'is-active' : ''}" title="No: Day bubble click panna direct ah 1-click tick aagum">
                  <span class="pill-icon">✓</span>
                  <span class="pill-title">No (1-Click Tick)</span>
                </button>
              </div>
              <span class="gt-quick-hint-divider">|</span>
              <span class="gt-quick-hint">Press Enter ↵ to add &nbsp;|&nbsp; Esc to cancel</span>
            </div>
          </td>
          <td class="col-actions no-print">
            <button type="button" class="primary-button small-action-button" id="gtQuickAddBtn" title="Add habit">+ Add</button>
          </td>
        </tr>
      `;
    }

    elements.gtTableBody.innerHTML = rowsHtml;
    wireTableEntryRowEvents();
  }

  // Calculate Daywise Totals & Overall Metrics
  let earnedScore = 0;
  let maxScore = 0;
  const dayTotalsEarned = new Array(daysInMonth).fill(0);
  let dayMaxEarned = 0;

  (goalTracker.tasks || []).forEach((t) => {
    const taskScore = Number(t.score) || 10;
    dayMaxEarned += taskScore;
    maxScore += taskScore * daysInMonth;

    for (let d = 0; d < daysInMonth; d++) {
      let scoreVal = 0;
      if (Array.isArray(t.scores)) {
        scoreVal = Number(t.scores[d]) || 0;
      } else if (Array.isArray(t.checks) && t.checks[d]) {
        scoreVal = taskScore;
      }
      dayTotalsEarned[d] += scoreVal;
      earnedScore += scoreVal;
    }
  });

  // Render Table Foot (Daywise Totals & Daily Progress %)
  if (elements.gtTableFoot) {
    if (!goalTracker.tasks || !goalTracker.tasks.length) {
      elements.gtTableFoot.innerHTML = "";
    } else {
      let totalsCells = `
        <td class="col-task gt-foot-sticky-cell">
          <div class="gt-foot-sticky-content">
            <div class="gt-foot-icon-plate plate-blue" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div class="gt-foot-text-stack">
              <strong class="gt-foot-title">Daily Score</strong>
              <span class="gt-foot-sub">Total earned points</span>
            </div>
          </div>
        </td>
        <td class="col-uom gt-foot-sticky-cell">
          <span class="gt-foot-pill-max">${dayMaxEarned} max</span>
        </td>
        <td class="col-score gt-foot-sticky-cell">
          <span class="gt-foot-metric-chip">Points</span>
        </td>
      `;

      let pctCells = `
        <td class="col-task gt-foot-sticky-cell">
          <div class="gt-foot-sticky-content">
            <div class="gt-foot-icon-plate plate-emerald" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m16 8-8 8"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/></svg>
            </div>
            <div class="gt-foot-text-stack">
              <strong class="gt-foot-title">Daily Rate</strong>
              <span class="gt-foot-sub">Completion %</span>
            </div>
          </div>
        </td>
        <td class="col-uom gt-foot-sticky-cell">
          <span class="gt-foot-pill-max">100%</span>
        </td>
        <td class="col-score gt-foot-sticky-cell">
          <span class="gt-foot-metric-chip">Rate %</span>
        </td>
      `;

      for (let d = 0; d < daysInMonth; d++) {
        const dayNum = d + 1;
        const isToday = (yr === curYr && mo === curMo && dayNum === curDay);
        const locked = isDayLocked(yr, mo, dayNum);
        const pts = dayTotalsEarned[d];
        const pct = dayMaxEarned > 0 ? Math.round((pts / dayMaxEarned) * 100) : 0;
        const isWeekSep = d > 0 && d % 7 === 0;

        let cellClass = isToday ? 'is-today' : '';
        if (isWeekSep) cellClass += ' week-sep';

        if (locked) {
          totalsCells += `<td class="gt-foot-cell ${cellClass} is-locked" data-day-col="${dayNum}"><span class="gt-foot-lock">🔒</span></td>`;
          pctCells += `<td class="gt-foot-cell ${cellClass} is-locked" data-day-col="${dayNum}"><span class="gt-foot-lock">—</span></td>`;
        } else {
          let ptsPillClass = "gt-foot-pts-pill";
          if (pts >= dayMaxEarned && dayMaxEarned > 0) ptsPillClass += " pts-perfect";
          else if (pts >= dayMaxEarned * 0.5) ptsPillClass += " pts-solid";
          else if (pts > 0) ptsPillClass += " pts-active";
          else ptsPillClass += " pts-zero";

          totalsCells += `
            <td class="gt-foot-cell ${cellClass}" data-day-col="${dayNum}">
              <span class="${ptsPillClass}" title="Day ${dayNum}: ${pts} / ${dayMaxEarned} pts">${pts > 0 ? pts : '0'}</span>
            </td>
          `;

          let pctBadgeClass = "gt-foot-pct-pill";
          if (pct >= 100) pctBadgeClass += " pct-perfect";
          else if (pct >= 50) pctBadgeClass += " pct-solid";
          else if (pct > 0) pctBadgeClass += " pct-active";
          else pctBadgeClass += " pct-zero";

          pctCells += `
            <td class="gt-foot-cell ${cellClass}" data-day-col="${dayNum}">
              <span class="${pctBadgeClass}" title="Day ${dayNum}: ${pct}% completed">${pct > 0 ? pct + '%' : '—'}</span>
            </td>
          `;
        }
      }

      totalsCells += '<td class="col-actions gt-foot-sticky-cell no-print"></td>';
      pctCells += '<td class="col-actions gt-foot-sticky-cell no-print"></td>';

      elements.gtTableFoot.innerHTML = `
        <tr class="gt-foot-row gt-foot-totals-row">${totalsCells}</tr>
        <tr class="gt-foot-row gt-foot-pct-row">${pctCells}</tr>
      `;
    }
  }

  // Calculate Daywise Summary Analytics for Cards
  const todayIdx = curDay - 1;
  const isCurrentMonth = (yr === curYr && mo === curMo);
  const passedDaysLimit = isCurrentMonth ? Math.min(curDay, daysInMonth) : daysInMonth;

  let todayEarned = 0;
  let todayPct = 0;
  if (todayIdx >= 0 && todayIdx < daysInMonth) {
    todayEarned = dayTotalsEarned[todayIdx];
    todayPct = dayMaxEarned > 0 ? Math.round((todayEarned / dayMaxEarned) * 100) : 0;
  }

  let bestDayNum = 1;
  let bestDayPts = 0;
  let activeDaysCount = 0;
  let passedTotalEarned = 0;

  for (let d = 0; d < daysInMonth; d++) {
    const pts = dayTotalsEarned[d];
    if (d + 1 <= passedDaysLimit) {
      passedTotalEarned += pts;
      if (pts > 0) activeDaysCount++;
    }
    if (pts > bestDayPts) {
      bestDayPts = pts;
      bestDayNum = d + 1;
    }
  }

  const dailyAvg = passedDaysLimit > 0 ? (passedTotalEarned / passedDaysLimit).toFixed(1) : 0;
  const activePct = passedDaysLimit > 0 ? Math.round((activeDaysCount / passedDaysLimit) * 100) : 0;

  if (elements.gtTodaySummaryVal) {
    elements.gtTodaySummaryVal.textContent = dayMaxEarned > 0 ? `${todayEarned} / ${dayMaxEarned} pts (${todayPct}%)` : `0 / 0 pts (0%)`;
  }
  if (elements.gtBestDayVal) {
    if (bestDayPts > 0) {
      const bestDateStr = `${bestDayNum}.${mo}.${String(yr).slice(-2)}`;
      elements.gtBestDayVal.textContent = `${bestDateStr} (${bestDayPts} pts)`;
    } else {
      elements.gtBestDayVal.textContent = `No points yet`;
    }
  }
  if (elements.gtActiveDaysVal) {
    elements.gtActiveDaysVal.textContent = `${activeDaysCount} Days (${activePct}%)`;
  }
  if (elements.gtDailyAvgVal) {
    elements.gtDailyAvgVal.textContent = `${dailyAvg} pts / day`;
  }

  const progressPct = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

  if (elements.gtEarnedScore) elements.gtEarnedScore.textContent = earnedScore.toLocaleString();
  if (elements.gtMaxScore) elements.gtMaxScore.textContent = maxScore.toLocaleString();
  if (elements.gtProgressPercent) elements.gtProgressPercent.textContent = `${progressPct}%`;
  if (elements.gtProgressBarFill) elements.gtProgressBarFill.style.width = `${Math.min(100, progressPct)}%`;

  // Calculate Previous Month Metrics for Comparison
  let prevYr = yr;
  let prevMo = mo - 1;
  if (prevMo < 1) {
    prevMo = 12;
    prevYr -= 1;
  }
  const prevKey = getGtMonthKey(prevYr, prevMo);
  const prevData = (goalTracker.monthsData && goalTracker.monthsData[prevKey]) ? goalTracker.monthsData[prevKey] : null;
  const prevDaysInMonth = getDaysInMonth(prevYr, prevMo);

  let prevEarnedScore = 0;
  let prevMaxScore = 0;
  let prevActiveDays = 0;
  const prevDayTotals = new Array(prevDaysInMonth).fill(0);

  if (prevData && Array.isArray(prevData.tasks)) {
    prevData.tasks.forEach((t) => {
      const taskScore = Number(t.score) || 10;
      prevMaxScore += taskScore * prevDaysInMonth;
      for (let d = 0; d < prevDaysInMonth; d++) {
        const val = Array.isArray(t.scores) ? (Number(t.scores[d]) || 0) : 0;
        prevDayTotals[d] += val;
        prevEarnedScore += val;
      }
    });
    for (let d = 0; d < prevDaysInMonth; d++) {
      if (prevDayTotals[d] > 0) prevActiveDays++;
    }
  }

  const prevCompRate = prevMaxScore > 0 ? Math.round((prevEarnedScore / prevMaxScore) * 100) : 0;
  const currCompRate = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

  const scoreDiff = earnedScore - prevEarnedScore;
  const rateDiff = currCompRate - prevCompRate;
  const activeDiff = activeDaysCount - prevActiveDays;

  const prevMonthName = new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(prevYr, prevMo - 1, 1));
  const currMonthName = new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(yr, mo - 1, 1));

  if (elements.gtCompareSubtitle) {
    elements.gtCompareSubtitle.textContent = `Comparing ${currMonthName} ${yr} vs ${prevMonthName} ${prevYr}`;
  }
  if (elements.gtCompareScoreVal) elements.gtCompareScoreVal.textContent = `${earnedScore.toLocaleString()} pts`;
  if (elements.gtCompareScoreDiff) {
    const sign = scoreDiff >= 0 ? "+" : "";
    elements.gtCompareScoreDiff.textContent = `vs ${prevMonthName}: ${sign}${scoreDiff} pts`;
    elements.gtCompareScoreDiff.className = `gt-compare-change ${scoreDiff >= 0 ? 'pos' : 'neg'}`;
  }
  if (elements.gtCompareRateVal) elements.gtCompareRateVal.textContent = `${currCompRate}%`;
  if (elements.gtCompareRateDiff) {
    const sign = rateDiff >= 0 ? "+" : "";
    elements.gtCompareRateDiff.textContent = `vs ${prevMonthName}: ${sign}${rateDiff}%`;
    elements.gtCompareRateDiff.className = `gt-compare-change ${rateDiff >= 0 ? 'pos' : 'neg'}`;
  }
  if (elements.gtCompareActiveVal) elements.gtCompareActiveVal.textContent = `${activeDaysCount} Days`;
  if (elements.gtCompareActiveDiff) {
    const sign = activeDiff >= 0 ? "+" : "";
    elements.gtCompareActiveDiff.textContent = `vs ${prevMonthName}: ${sign}${activeDiff} Days`;
    elements.gtCompareActiveDiff.className = `gt-compare-change ${activeDiff >= 0 ? 'pos' : 'neg'}`;
  }

  // Auto-scroll table wrapper to position today's date column first in UI
  if (yr === curYr && mo === curMo && elements.gtTableWrapper) {
    setTimeout(() => {
      const todayCell = elements.gtTableWrapper.querySelector(".gt-day-col-head.is-today");
      if (todayCell) {
        const stickyOffset = 410; // Exact sum of 220px + 80px + 110px
        const targetScroll = Math.max(0, todayCell.offsetLeft - stickyOffset);
        elements.gtTableWrapper.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
    }, 150);
  }
}

function wireGoalTrackerInteractions() {
  if (elements.gtMonthPicker) {
    elements.gtMonthPicker.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val) {
        const [yr, mo] = val.split("-").map(Number);
        switchGoalTrackerMonth(yr, mo);
      }
    });
  }

  if (elements.gtPrevMonthBtn) {
    elements.gtPrevMonthBtn.addEventListener("click", () => {
      let yr = goalTracker.year || new Date().getFullYear();
      let mo = goalTracker.month || (new Date().getMonth() + 1);
      mo -= 1;
      if (mo < 1) {
        mo = 12;
        yr -= 1;
      }
      switchGoalTrackerMonth(yr, mo);
    });
  }

  if (elements.gtNextMonthBtn) {
    elements.gtNextMonthBtn.addEventListener("click", () => {
      let yr = goalTracker.year || new Date().getFullYear();
      let mo = goalTracker.month || (new Date().getMonth() + 1);
      mo += 1;
      if (mo > 12) {
        mo = 1;
        yr += 1;
      }
      switchGoalTrackerMonth(yr, mo);
    });
  }

  if (elements.gtGoalTitleInput) {
    elements.gtGoalTitleInput.addEventListener("input", (e) => {
      goalTracker.goalTitle = e.target.value;
      persistGoalTracker();
    });
  }

  if (elements.gtMonthYearInput) {
    elements.gtMonthYearInput.addEventListener("input", (e) => {
      goalTracker.monthYear = e.target.value;
      persistGoalTracker();
    });
  }

  if (elements.gtNotesInput) {
    elements.gtNotesInput.addEventListener("input", (e) => {
      goalTracker.notes = e.target.value;
      persistGoalTracker();
    });
  }

  if (elements.gtRewardInput) {
    elements.gtRewardInput.addEventListener("input", (e) => {
      goalTracker.reward = e.target.value;
      persistGoalTracker();
    });
  }

  if (elements.printGtBtn) {
    elements.printGtBtn.addEventListener("click", () => window.print());
  }

  if (elements.gtViewMonthlyBtn) {
    elements.gtViewMonthlyBtn.addEventListener("click", switchToMonthlyView);
  }

  if (elements.gtViewYearlyBtn) {
    elements.gtViewYearlyBtn.addEventListener("click", switchToYearlyView);
  }

  const savedActiveView = localStorage.getItem("tm_gt_active_view");
  if (savedActiveView === "yearly") {
    switchToYearlyView();
  } else {
    switchToMonthlyView();
  }

  // Toggle / Edit Day Bubble
  if (elements.gtTableBody) {
    elements.gtTableBody.addEventListener("click", (e) => {
      const bubbleBtn = e.target.closest("[data-gt-check]");
      if (bubbleBtn) {
        const taskId = bubbleBtn.dataset.taskId;
        const dayIdx = parseInt(bubbleBtn.dataset.day, 10);
        const dayNum = dayIdx + 1;
        const yr = goalTracker.year || new Date().getFullYear();
        const mo = goalTracker.month || (new Date().getMonth() + 1);

        if (isDayLocked(yr, mo, dayNum)) {
          showToast("Future days cannot be scored yet! ⏳", true);
          return;
        }

        const task = (goalTracker.tasks || []).find((t) => t.id === taskId);
        if (task) {
          // If habit is set to Simple 1-Click Tick (and user didn't Shift+click):
          if (task.scoringMode === "simple" && !e.shiftKey) {
            if (currentActiveCellRef) closeCellFloatBar();
            if (!Array.isArray(task.scores)) task.scores = new Array(31).fill(0);
            if (!Array.isArray(task.checks)) task.checks = new Array(31).fill(false);
            const maxScore = Number(task.score) || 10;
            const currentScore = Number(task.scores[dayIdx]) || 0;
            const newScore = currentScore > 0 ? 0 : maxScore;
            task.scores[dayIdx] = newScore;
            task.checks[dayIdx] = newScore > 0;
            if (newScore > 0) {
              playTaskCompleteSound();
            }
            persistGoalTracker();
            renderGoalTracker();
            return;
          }

          // Otherwise (Points Slider mode or Shift+click):
          // If already open on this bubble, toggle close
          if (currentActiveCellRef && currentActiveCellRef.targetBtn === bubbleBtn) {
            closeCellFloatBar();
            return;
          }
          openCellFloatBar(bubbleBtn, task, dayIdx);
        }
        return;
      }

      // Mode toggle badge button clicked directly from score column:
      const modeToggleBtn = e.target.closest("[data-toggle-habit-mode]");
      if (modeToggleBtn) {
        const taskId = modeToggleBtn.dataset.toggleHabitMode;
        const task = (goalTracker.tasks || []).find((t) => t.id === taskId);
        if (task) {
          task.scoringMode = task.scoringMode === "simple" ? "points" : "simple";
          showToast(`Habit mode switched: "${task.title}" ➔ ${task.scoringMode === 'simple' ? '1-Click Tick ✓' : 'Points Slider 🎚️'}`);
          persistGoalTracker();
          renderGoalTracker();
        }
        return;
      }

      // Clicking UOM cell opens inline edit mode focused on UOM
      const uomTrigger = e.target.closest("[data-gt-uom-click], .col-uom");
      if (uomTrigger && !editingTaskId) {
        const row = uomTrigger.closest("[data-gt-task-id]");
        if (row && row.dataset.gtTaskId) {
          editingTaskId = row.dataset.gtTaskId;
          renderGoalTracker();
          setTimeout(() => {
            const uomInput = document.getElementById("gtEditUomInput");
            if (uomInput) {
              uomInput.focus();
              uomInput.select();
            }
          }, 40);
          return;
        }
      }

      const editBtn = e.target.closest("[data-gt-edit]");
      if (editBtn) {
        const taskId = editBtn.dataset.gtEdit;
        editingTaskId = taskId;
        renderGoalTracker();
        return;
      }

      const deleteBtn = e.target.closest("[data-gt-delete]");
      if (deleteBtn) {
        const taskId = deleteBtn.dataset.gtDelete;
        deleteGoalTask(taskId);
        return;
      }
    });

    elements.gtTableBody.addEventListener("dblclick", (e) => {
      const row = e.target.closest(".gt-habit-row");
      if (row && row.dataset.gtTaskId && !editingTaskId) {
        editingTaskId = row.dataset.gtTaskId;
        renderGoalTracker();
      }
    });

    elements.gtTableBody.addEventListener("contextmenu", (e) => {
      const bubbleBtn = e.target.closest("[data-gt-check]");
      if (bubbleBtn) {
        e.preventDefault();
        const taskId = bubbleBtn.dataset.taskId;
        const dayIdx = parseInt(bubbleBtn.dataset.day, 10);
        const task = (goalTracker.tasks || []).find((t) => t.id === taskId);
        if (task) {
          openCellFloatBar(bubbleBtn, task, dayIdx);
        }
      }
    });
  }

  if (elements.addGtTaskBtn) {
    elements.addGtTaskBtn.addEventListener("click", () => {
      editingTaskId = null;
      showAddRow = true;
      renderGoalTracker();
      setTimeout(() => {
        const quickInput = document.getElementById("gtQuickTaskTitle");
        if (quickInput) {
          quickInput.focus();
          quickInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    });
  }

  // Day Breakdown Modal Backdrop & Close Buttons
  document.querySelectorAll("[data-close-gt-day-modal]").forEach((b) => {
    b.addEventListener("click", closeDayBreakdownModal);
  });

  if (elements.gtDayChecklistList) {
    // Stepper buttons & Toggle check click events
    elements.gtDayChecklistList.addEventListener("click", (e) => {
      // Toggle button
      const toggleBtn = e.target.closest("[data-gt-toggle-task]");
      if (toggleBtn) {
        const taskId = toggleBtn.dataset.gtToggleTask;
        const task = (goalTracker.tasks || []).find((t) => t.id === taskId);
        if (task) {
          const maxS = Number(task.score) || 10;
          if (!Array.isArray(task.scores)) task.scores = Array(31).fill(0);
          if (!Array.isArray(task.checks)) task.checks = Array(31).fill(false);
          const currentScore = Number(task.scores[inspectedDayNum - 1]) || 0;
          // Toggle between 0 and max score
          const newScore = currentScore >= maxS ? 0 : maxS;
          task.scores[inspectedDayNum - 1] = newScore;
          task.checks[inspectedDayNum - 1] = newScore > 0;
          renderDayBreakdownContent(inspectedDayNum);
          renderGoalTracker();
          persistGoalTracker();
        }
        return;
      }

      // Stepper button (+ / -)
      const stepBtn = e.target.closest("[data-gt-step-task]");
      if (stepBtn) {
        const taskId = stepBtn.dataset.gtStepTask;
        const dir = parseInt(stepBtn.dataset.gtStepDir, 10) || 0;
        const task = (goalTracker.tasks || []).find((t) => t.id === taskId);
        if (task && dir !== 0) {
          const maxS = Number(task.score) || 10;
          if (!Array.isArray(task.scores)) task.scores = Array(31).fill(0);
          if (!Array.isArray(task.checks)) task.checks = Array(31).fill(false);
          const currentScore = Number(task.scores[inspectedDayNum - 1]) || 0;
          const stepDelta = e.shiftKey ? 5 : 1;
          const newScore = Math.max(0, Math.min(maxS, currentScore + (dir * stepDelta)));
          task.scores[inspectedDayNum - 1] = newScore;
          task.checks[inspectedDayNum - 1] = newScore > 0;
          renderDayBreakdownContent(inspectedDayNum);
          renderGoalTracker();
          persistGoalTracker();
        }
        return;
      }
    });

    // Score input change
    elements.gtDayChecklistList.addEventListener("change", (e) => {
      const input = e.target.closest("[data-gt-day-score-task]");
      if (input) {
        const taskId = input.dataset.gtDayScoreTask;
        const task = (goalTracker.tasks || []).find((t) => t.id === taskId);
        if (task) {
          const maxS = Number(task.score) || 10;
          const newScore = Math.max(0, Math.min(maxS, Number(input.value) || 0));
          if (!Array.isArray(task.scores)) task.scores = Array(31).fill(0);
          if (!Array.isArray(task.checks)) task.checks = Array(31).fill(false);
          task.scores[inspectedDayNum - 1] = newScore;
          task.checks[inspectedDayNum - 1] = newScore > 0;
          renderDayBreakdownContent(inspectedDayNum);
          renderGoalTracker();
          persistGoalTracker();
        }
      }
    });
  }

  // Quick Batch Actions: Check All & Reset
  if (elements.gtDayMarkAllBtn) {
    elements.gtDayMarkAllBtn.addEventListener("click", () => {
      const tasks = goalTracker.tasks || [];
      if (!tasks.length) return;
      tasks.forEach((t) => {
        const maxS = Number(t.score) || 10;
        if (!Array.isArray(t.scores)) t.scores = Array(31).fill(0);
        if (!Array.isArray(t.checks)) t.checks = Array(31).fill(false);
        t.scores[inspectedDayNum - 1] = maxS;
        t.checks[inspectedDayNum - 1] = true;
      });
      renderDayBreakdownContent(inspectedDayNum);
      renderGoalTracker();
      persistGoalTracker();
    });
  }

  if (elements.gtDayResetBtn) {
    elements.gtDayResetBtn.addEventListener("click", () => {
      const tasks = goalTracker.tasks || [];
      if (!tasks.length) return;
      tasks.forEach((t) => {
        if (!Array.isArray(t.scores)) t.scores = Array(31).fill(0);
        if (!Array.isArray(t.checks)) t.checks = Array(31).fill(false);
        t.scores[inspectedDayNum - 1] = 0;
        t.checks[inspectedDayNum - 1] = false;
      });
      renderDayBreakdownContent(inspectedDayNum);
      renderGoalTracker();
      persistGoalTracker();
    });
  }

  // Day Navigation Arrows (Prev / Next)
  if (elements.gtDayPrevBtn) {
    elements.gtDayPrevBtn.addEventListener("click", () => {
      if (inspectedDayNum > 1) {
        openDayBreakdownModal(inspectedDayNum - 1);
      }
    });
  }

  if (elements.gtDayNextBtn) {
    elements.gtDayNextBtn.addEventListener("click", () => {
      const yr = goalTracker.year || new Date().getFullYear();
      const mo = goalTracker.month || (new Date().getMonth() + 1);
      const daysInM = getDaysInMonth(yr, mo);
      if (inspectedDayNum < daysInM) {
        openDayBreakdownModal(inspectedDayNum + 1);
      }
    });
  }

  // Keyboard navigation for Day Modal (ArrowLeft, ArrowRight, Escape)
  document.addEventListener("keydown", (e) => {
    if (!elements.gtDayDetailModal || elements.gtDayDetailModal.classList.contains("is-hidden")) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      if (e.key === "Escape") closeDayBreakdownModal();
      return;
    }
    if (e.key === "ArrowLeft") {
      if (inspectedDayNum > 1) {
        e.preventDefault();
        openDayBreakdownModal(inspectedDayNum - 1);
      }
    } else if (e.key === "ArrowRight") {
      const yr = goalTracker.year || new Date().getFullYear();
      const mo = goalTracker.month || (new Date().getMonth() + 1);
      const daysInM = getDaysInMonth(yr, mo);
      if (inspectedDayNum < daysInM) {
        e.preventDefault();
        openDayBreakdownModal(inspectedDayNum + 1);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDayBreakdownModal();
    }
  });

  if (elements.gtDaysSubnavHeader) {
    elements.gtDaysSubnavHeader.addEventListener("click", (e) => {
      const colHead = e.target.closest("[data-day-col]");
      if (colHead) {
        const dayNum = parseInt(colHead.dataset.dayCol, 10);
        if (dayNum > 0) openDayBreakdownModal(dayNum);
      }
    });
  }

  if (elements.gtTableFoot) {
    elements.gtTableFoot.addEventListener("click", (e) => {
      const footCell = e.target.closest("[data-day-col]");
      if (footCell) {
        const dayNum = parseInt(footCell.dataset.dayCol, 10);
        if (dayNum > 0 && dayNum <= 31) openDayBreakdownModal(dayNum);
      }
    });
  }

  // Task Modal Backdrop & Buttons
  document.querySelectorAll("[data-close-gt-task-modal]").forEach((b) => {
    b.addEventListener("click", closeGoalTaskModal);
  });

  if (elements.goalTaskForm) {
    elements.goalTaskForm.addEventListener("submit", handleGoalTaskSubmit);
  }

  if (elements.gtTaskModalDeleteBtn) {
    elements.gtTaskModalDeleteBtn.addEventListener("click", () => {
      const taskId = elements.gtTaskIdInput.value;
      if (taskId) deleteGoalTask(taskId);
      closeGoalTaskModal();
    });
  }

  // Floating Cell Score Adjuster Listeners (Type 1 Cockpit)
  if (elements.gtFloatSaveBtn) {
    elements.gtFloatSaveBtn.addEventListener("click", () => {
      const val = elements.gtCockpitRangeInput ? elements.gtCockpitRangeInput.value : (elements.gtFloatInput ? elements.gtFloatInput.value : 0);
      saveCellFloatScore(val);
    });
  }

  if (elements.gtFloatInput) {
    elements.gtFloatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = elements.gtCockpitRangeInput ? elements.gtCockpitRangeInput.value : (elements.gtFloatInput ? elements.gtFloatInput.value : 0);
        saveCellFloatScore(val);
      } else if (e.key === "Escape") {
        closeCellFloatBar();
      }
    });
  }

  document.querySelectorAll(".gt-float-chip").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (!currentActiveCellRef) return;
      const pct = parseInt(e.target.dataset.pct, 10) || 0;
      const targetVal = Math.round((currentActiveCellRef.maxScore * pct) / 100);
      syncCockpitUI(targetVal);
    });
    btn.addEventListener("dblclick", (e) => {
      if (!currentActiveCellRef) return;
      const pct = parseInt(e.target.dataset.pct, 10) || 0;
      const targetVal = Math.round((currentActiveCellRef.maxScore * pct) / 100);
      saveCellFloatScore(targetVal);
    });
  });

  document.addEventListener("click", (e) => {
    if (!currentActiveCellRef) return;
    if (elements.gtCellFloatBar && elements.gtCellFloatBar.contains(e.target)) return;
    if (e.target.closest("[data-gt-check]")) return;
    closeCellFloatBar();
  });
}

let currentActiveCellRef = null;

function openCellFloatBar(targetBtn, task, dayIdx) {
  if (!elements.gtCellFloatBar || !targetBtn || !task) return;

  const dayNum = dayIdx + 1;
  const maxScore = Math.max(1, Math.min(100, Number(task.score) || 10));
  const currentScore = Array.isArray(task.scores) ? (task.scores[dayIdx] || 0) : (task.checks && task.checks[dayIdx] ? maxScore : 0);

  currentActiveCellRef = { task, dayIdx, targetBtn, maxScore };

  if (elements.gtCockpitHabitTitle) {
    elements.gtCockpitHabitTitle.textContent = task.title || "Habit";
    elements.gtCockpitHabitTitle.title = task.title || "Habit";
  }
  if (elements.gtFloatTitle) elements.gtFloatTitle.textContent = `Day ${dayNum}`;
  if (elements.gtFloatMaxScore) elements.gtFloatMaxScore.textContent = maxScore;

  if (elements.gtCockpitRangeInput) {
    elements.gtCockpitRangeInput.max = maxScore;
    elements.gtCockpitRangeInput.value = currentScore;
  }
  if (elements.gtFloatInput) {
    elements.gtFloatInput.max = maxScore;
    elements.gtFloatInput.value = currentScore;
  }

  syncCockpitUI(currentScore);

  const rect = targetBtn.getBoundingClientRect();
  const bar = elements.gtCellFloatBar;

  bar.style.position = "fixed";
  const barWidth = 360;
  const barHeight = 110;
  let top = rect.top - barHeight - 12;
  if (top < 10) top = rect.bottom + 12;
  let left = rect.left + (rect.width / 2);
  left = Math.max(barWidth / 2 + 10, Math.min(window.innerWidth - (barWidth / 2) - 10, left));

  bar.style.top = `${top}px`;
  bar.style.left = `${left}px`;
  bar.style.transform = "translateX(-50%)";

  bar.classList.remove("is-hidden");
}

function closeCellFloatBar() {
  if (elements.gtCellFloatBar) {
    elements.gtCellFloatBar.classList.add("is-hidden");
  }
  currentActiveCellRef = null;
}

function saveCellFloatScore(scoreVal) {
  if (!currentActiveCellRef) return;
  const { task, dayIdx, maxScore } = currentActiveCellRef;

  const val = Math.max(0, Math.min(maxScore, parseInt(scoreVal, 10) || 0));

  if (!Array.isArray(task.scores)) task.scores = Array(31).fill(0);
  if (!Array.isArray(task.checks)) task.checks = Array(31).fill(false);

  task.scores[dayIdx] = val;
  task.checks[dayIdx] = val > 0;

  // Check if today hit 100% across all habits
  const tasks = goalTracker.tasks || [];
  let dayEarned = 0;
  let dayMax = 0;
  tasks.forEach(t => {
    dayMax += Number(t.score) || 10;
    dayEarned += Array.isArray(t.scores) ? (Number(t.scores[dayIdx]) || 0) : 0;
  });
  if (dayMax > 0 && dayEarned >= dayMax) {
    launchConfetti();
    showToast("🎉 Perfect day! 100% achieved!");
  }

  closeCellFloatBar();
  renderGoalTracker();
  persistGoalTracker();
}

function openGoalTaskModal(taskId = null) {
  const panel = elements.goalTaskModal || document.getElementById("gtInlineTaskPanel");
  if (!panel || !elements.goalTaskForm) return;

  const modalTitle = document.getElementById("goalTaskModalTitle");
  if (taskId) {
    const task = (goalTracker.tasks || []).find((t) => t.id === taskId);
    if (!task) return;
    if (modalTitle) modalTitle.textContent = "Edit Habit";
    if (elements.gtTaskIdInput) elements.gtTaskIdInput.value = task.id;
    if (elements.gtTaskTitleInput) elements.gtTaskTitleInput.value = task.title;
    if (elements.gtTaskScoreInput) elements.gtTaskScoreInput.value = task.score || 10;
    if (elements.gtTaskModalDeleteBtn) elements.gtTaskModalDeleteBtn.classList.remove("is-hidden");
  } else {
    if (modalTitle) modalTitle.textContent = "Add New Habit";
    elements.goalTaskForm.reset();
    if (elements.gtTaskIdInput) elements.gtTaskIdInput.value = "";
    if (elements.gtTaskScoreInput) elements.gtTaskScoreInput.value = 10;
    if (elements.gtTaskModalDeleteBtn) elements.gtTaskModalDeleteBtn.classList.add("is-hidden");
  }

  panel.classList.remove("is-hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });

  setTimeout(() => {
    if (elements.gtTaskTitleInput) elements.gtTaskTitleInput.focus();
  }, 100);
}

function closeGoalTaskModal() {
  const panel = elements.goalTaskModal || document.getElementById("gtInlineTaskPanel");
  if (panel) panel.classList.add("is-hidden");
}

function handleGoalTaskSubmit(e) {
  e.preventDefault();
  const taskId = elements.gtTaskIdInput ? elements.gtTaskIdInput.value : "";
  const title = elements.gtTaskTitleInput ? elements.gtTaskTitleInput.value.trim() : "";
  const rawScore = elements.gtTaskScoreInput ? parseInt(elements.gtTaskScoreInput.value, 10) : 10;
  const score = Math.max(1, Math.min(100, rawScore || 10));

  if (!title) return;
  if (!Array.isArray(goalTracker.tasks)) goalTracker.tasks = [];

  if (taskId) {
    const task = goalTracker.tasks.find((t) => t.id === taskId);
    if (task) {
      task.title = title;
      task.score = score;
      showToast("Habit updated!");
    }
  } else {
    const newId = createId("gt-task");
    goalTracker.tasks.push({
      id: newId,
      title,
      score,
      scores: Array(31).fill(0),
      checks: Array(31).fill(false),
    });
    showToast("New habit added!");
  }

  closeGoalTaskModal();
  renderGoalTracker();
  persistGoalTracker();
}

function deleteGoalTask(taskId) {
  const task = (goalTracker.tasks || []).find((t) => t.id === taskId);
  const title = task ? task.title : "task";
  if (confirm(`Delete "${title}" from habit list?`)) {
    goalTracker.tasks = (goalTracker.tasks || []).filter((t) => t.id !== taskId);
    renderGoalTracker();
    persistGoalTracker();
    showToast("Habit task deleted");
  }
}

let inspectedDayNum = 1;

function openDayBreakdownModal(dayNum) {
  if (!elements.gtDayDetailModal) return;

  inspectedDayNum = dayNum;
  const now = new Date();
  const yr = goalTracker.year || now.getFullYear();
  const mo = goalTracker.month || (now.getMonth() + 1);
  const daysInM = getDaysInMonth(yr, mo);

  if (dayNum < 1 || dayNum > daysInM) return;

  const dayDateObj = new Date(yr, mo - 1, dayNum);
  const fullDateStr = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(dayDateObj);

  if (elements.gtDayDetailTitle) {
    elements.gtDayDetailTitle.textContent = fullDateStr;
  }
  if (elements.gtDayModalIndexBadge) {
    elements.gtDayModalIndexBadge.textContent = `Day ${dayNum} of ${daysInM}`;
  }

  renderDayBreakdownContent(dayNum);

  elements.gtDayDetailModal.classList.remove("is-hidden");
  document.body.classList.add("has-open-modal");
}

function renderDayBreakdownContent(dayNum) {
  const yr = goalTracker.year || new Date().getFullYear();
  const mo = goalTracker.month || (new Date().getMonth() + 1);
  const daysInM = getDaysInMonth(yr, mo);

  let earnedOnDay = 0;
  let maxOnDay = 0;
  let completedHabitsCount = 0;
  const tasks = goalTracker.tasks || [];

  tasks.forEach((t) => {
    const taskScore = Number(t.score) || 10;
    maxOnDay += taskScore;
    const val = Array.isArray(t.scores) ? (Number(t.scores[dayNum - 1]) || 0) : 0;
    earnedOnDay += val;
    if (val >= taskScore) {
      completedHabitsCount++;
    }
  });

  const pct = maxOnDay > 0 ? Math.round((earnedOnDay / maxOnDay) * 100) : 0;

  // Bespoke Vector SVG Status Badges
  let statusBadge = "";
  if (pct === 100) {
    statusBadge = `
      <span class="gt-day-hero-pill badge-perfection">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 12 2"/></svg>
        <span>Perfection · 100%</span>
      </span>`;
  } else if (pct >= 80) {
    statusBadge = `
      <span class="gt-day-hero-pill badge-outstanding">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span>Outstanding · ${pct}%</span>
      </span>`;
  } else if (pct >= 50) {
    statusBadge = `
      <span class="gt-day-hero-pill badge-solid">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Solid Progress · ${pct}%</span>
      </span>`;
  } else if (pct > 0) {
    statusBadge = `
      <span class="gt-day-hero-pill badge-progress">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>In Motion · ${pct}%</span>
      </span>`;
  } else {
    statusBadge = `
      <span class="gt-day-hero-pill badge-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
        <span>No Activity Yet</span>
      </span>`;
  }

  // Update Hero Performance Banner
  if (elements.gtDaySummaryBanner) {
    elements.gtDaySummaryBanner.innerHTML = `
      <div class="gt-day-hero-main">
        <div class="gt-day-hero-score-group">
          <div class="gt-day-hero-label">Daily Performance</div>
          <div class="gt-day-hero-points">
            <span class="gt-hero-num">${earnedOnDay.toLocaleString()}</span>
            <span class="gt-hero-denom">/ ${maxOnDay.toLocaleString()} pts</span>
          </div>
        </div>
        ${statusBadge}
      </div>
      <div class="gt-day-hero-progress-track">
        <div class="gt-day-hero-progress-bar" style="width: ${Math.min(100, pct)}%;"></div>
      </div>
      <div class="gt-day-hero-meta">
        <span class="gt-hero-meta-item">
          <strong>${completedHabitsCount}</strong> of <strong>${tasks.length}</strong> habits completed
        </span>
        <span class="gt-hero-meta-item gt-hero-meta-right">
          ${pct >= 80 ? '🔥 On a roll today' : (pct >= 50 ? '⚡ Steady pace' : '◈ Keep building momentum')}
        </span>
      </div>
    `;
  }

  // Update Habit Count & Prev/Next button states
  if (elements.gtDayHabitCount) {
    elements.gtDayHabitCount.textContent = `${tasks.length} ${tasks.length === 1 ? 'habit' : 'habits'}`;
  }
  if (elements.gtDayPrevBtn) {
    elements.gtDayPrevBtn.disabled = dayNum <= 1;
  }
  if (elements.gtDayNextBtn) {
    elements.gtDayNextBtn.disabled = dayNum >= daysInM;
  }

  // Render Checklist Cards
  if (elements.gtDayChecklistList) {
    if (!tasks.length) {
      elements.gtDayChecklistList.innerHTML = `<div class="gt-day-empty-state">No habit tasks found for this month. Click "Add Habit Task" to get started.</div>`;
    } else {
      let listHtml = "";
      tasks.forEach((t) => {
        const taskScore = Number(t.score) || 10;
        const val = Array.isArray(t.scores) ? (Number(t.scores[dayNum - 1]) || 0) : 0;
        const isComplete = val >= taskScore;
        const isPartial = val > 0 && val < taskScore;

        listHtml += `
          <div class="gt-day-task-card ${isComplete ? 'is-complete' : (isPartial ? 'is-partial' : '')}" data-task-id="${t.id}">
            <button type="button" class="gt-day-task-toggle ${isComplete ? 'is-checked' : ''}" data-gt-toggle-task="${t.id}" title="${isComplete ? 'Mark Incomplete (Set 0)' : 'Mark Completed (Set ' + taskScore + ' pts)'}" aria-label="Toggle completion for ${escapeHtml(t.title)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <div class="gt-day-task-center">
              <div class="gt-day-task-icon-plate" aria-hidden="true">
                ${getHabitSvgIcon(t.title, t.uom)}
              </div>
              <div class="gt-day-task-text">
                <span class="gt-day-task-name">${escapeHtml(t.title)}</span>
                <span class="gt-day-task-meta">
                  <span class="gt-day-task-uom">${escapeHtml(t.uom || 'Daily')}</span>
                  <span class="gt-day-task-dot">•</span>
                  <span class="gt-day-task-target">Target: ${taskScore} pts</span>
                  ${isComplete ? '<span class="gt-day-complete-tag">Completed</span>' : ''}
                </span>
              </div>
            </div>
            <div class="gt-day-task-stepper">
              <button type="button" class="gt-day-step-btn gt-step-down" data-gt-step-task="${t.id}" data-gt-step-dir="-1" title="Decrease score" aria-label="Decrease score">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <div class="gt-day-score-display">
                <input type="number" class="gt-day-score-input" min="0" max="${taskScore}" value="${val}" data-gt-day-score-task="${t.id}" aria-label="Score input for ${escapeHtml(t.title)}" />
                <span class="gt-day-score-slash">/</span>
                <span class="gt-day-score-target">${taskScore}</span>
              </div>
              <button type="button" class="gt-day-step-btn gt-step-up" data-gt-step-task="${t.id}" data-gt-step-dir="1" title="Increase score" aria-label="Increase score">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
        `;
      });
      elements.gtDayChecklistList.innerHTML = listHtml;
    }
  }
}

function closeDayBreakdownModal() {
  if (elements.gtDayDetailModal) {
    elements.gtDayDetailModal.classList.add("is-hidden");
  }
  document.body.classList.remove("has-open-modal");
}

function renderYearlyDashboard() {
  if (!elements.gtYearlyDashboardContainer) return;

  const now = new Date();
  const selectedYear = goalTracker.yearlyDashboardYear || goalTracker.year || now.getFullYear();

  let yearlyEarned = 0;
  let yearlyMax = 0;
  let yearlyActiveDays = 0;
  let bestMonthName = "N/A";
  let bestMonthPct = -1;

  const monthSummaries = [];

  for (let m = 1; m <= 12; m++) {
    const key = getGtMonthKey(selectedYear, m);
    const mData = (goalTracker.monthsData && goalTracker.monthsData[key]) ? goalTracker.monthsData[key] : null;
    const daysInM = getDaysInMonth(selectedYear, m);
    const mName = new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(selectedYear, m - 1, 1));
    const fullMName = new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(selectedYear, m - 1, 1));

    let mEarned = 0;
    let mMax = 0;
    let mActiveDays = 0;
    const dayTotals = new Array(daysInM).fill(0);

    if (mData && Array.isArray(mData.tasks) && mData.tasks.length > 0) {
      mData.tasks.forEach((t) => {
        const taskScore = Number(t.score) || 10;
        mMax += taskScore * daysInM;
        for (let d = 0; d < daysInM; d++) {
          const val = Array.isArray(t.scores) ? (Number(t.scores[d]) || 0) : 0;
          dayTotals[d] += val;
          mEarned += val;
        }
      });

      for (let d = 0; d < daysInM; d++) {
        if (dayTotals[d] > 0) mActiveDays++;
      }
    }

    const mPct = mMax > 0 ? Math.round((mEarned / mMax) * 100) : 0;
    if (mData && mPct > bestMonthPct) {
      bestMonthPct = mPct;
      bestMonthName = `${mName} ${selectedYear}`;
    }

    yearlyEarned += mEarned;
    yearlyMax += mMax;
    yearlyActiveDays += mActiveDays;

    monthSummaries.push({
      monthNum: m,
      monthName: mName,
      fullMonthName: fullMName,
      hasData: !!(mData && mData.tasks && mData.tasks.length),
      earned: mEarned,
      max: mMax,
      pct: mPct,
      activeDays: mActiveDays,
      daysInMonth: daysInM
    });
  }

  const yearlyPct = yearlyMax > 0 ? Math.round((yearlyEarned / yearlyMax) * 100) : 0;

  let cardsHtml = "";
  monthSummaries.forEach((ms) => {
    let badgeClass = "gt-month-pct-badge";
    if (!ms.hasData) badgeClass += " pct-none";
    else if (ms.pct >= 80) badgeClass += " pct-high";
    else if (ms.pct >= 50) badgeClass += " pct-med";
    else badgeClass += " pct-low";

    cardsHtml += `
      <div class="gt-year-month-card ${ms.hasData ? '' : 'is-empty'}">
        <div class="gt-year-card-head">
          <div class="gt-year-card-title">
            <strong>${ms.fullMonthName}</strong>
            <span class="gt-year-quarter-tag">Q${Math.ceil(ms.monthNum / 3)}</span>
          </div>
          <span class="${badgeClass}">${ms.hasData ? ms.pct + '%' : 'No Data'}</span>
        </div>

        <div class="gt-year-card-body">
          <div class="gt-year-progress-bar">
            <div class="gt-year-progress-fill" style="width: ${ms.pct}%;"></div>
          </div>
          <div class="gt-year-card-stats">
            <div class="gt-stat-col">
              <span>Earned Points</span>
              <strong>${ms.earned.toLocaleString()} / ${ms.max.toLocaleString()}</strong>
            </div>
            <div class="gt-stat-col">
              <span>Active Days</span>
              <strong>${ms.activeDays} / ${ms.daysInMonth}d</strong>
            </div>
          </div>
        </div>

        <div class="gt-year-card-foot">
          <button class="gt-year-open-btn" type="button" data-open-month-yr="${selectedYear}" data-open-month-mo="${ms.monthNum}">
            <span>Open Monthly Sheet</span>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  });

  const kpiSvgs = {
    trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/><path d="M14 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    trend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`,
    flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
  };

  elements.gtYearlyDashboardContainer.innerHTML = `
    <div class="gt-yearly-dash-header">
      <div class="gt-yearly-title-wrap">
        <h2>Executive Yearly Dashboard</h2>
        <p>Annual consistency momentum & 12-month habit performance breakdown</p>
      </div>
      <div class="gt-year-selector-wrap">
        <button type="button" class="icon-button" id="gtYearPrevBtn" title="Previous Year">◀</button>
        <span class="gt-current-year-label">${selectedYear}</span>
        <button type="button" class="icon-button" id="gtYearNextBtn" title="Next Year">▶</button>
      </div>
    </div>

    <div class="gt-yearly-kpi-grid">
      <div class="gt-kpi-card">
        <div class="gt-kpi-info">
          <span class="gt-kpi-label">Total Annual Marks</span>
          <strong class="gt-kpi-val">${yearlyEarned.toLocaleString()} <small>/ ${yearlyMax.toLocaleString()} pts</small></strong>
          <span class="gt-kpi-sub">Overall Consistency Score</span>
        </div>
        <div class="gt-kpi-badge" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
          ${kpiSvgs.trophy}
        </div>
      </div>

      <div class="gt-kpi-card">
        <div class="gt-kpi-info">
          <span class="gt-kpi-label">Annual Completion Rate</span>
          <strong class="gt-kpi-val">${yearlyPct}%</strong>
          <span class="gt-kpi-sub">Target Achievement</span>
        </div>
        <div class="gt-kpi-badge" style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);">
          ${kpiSvgs.trend}
        </div>
      </div>

      <div class="gt-kpi-card">
        <div class="gt-kpi-info">
          <span class="gt-kpi-label">Active Habit Days</span>
          <strong class="gt-kpi-val">${yearlyActiveDays} <small>Days</small></strong>
          <span class="gt-kpi-sub">Days with ≥1 Habit Checked</span>
        </div>
        <div class="gt-kpi-badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          ${kpiSvgs.flame}
        </div>
      </div>

      <div class="gt-kpi-card">
        <div class="gt-kpi-info">
          <span class="gt-kpi-label">Peak Performance Month</span>
          <strong class="gt-kpi-val">${bestMonthPct >= 0 ? bestMonthName : 'N/A'} <small>${bestMonthPct >= 0 ? '(' + bestMonthPct + '%)' : ''}</small></strong>
          <span class="gt-kpi-sub">Highest Monthly Completion</span>
        </div>
        <div class="gt-kpi-badge" style="background: linear-gradient(135deg, #10b981 0%, #047857 100%);">
          ${kpiSvgs.star}
        </div>
      </div>
    </div>

    <div class="gt-yearly-months-grid">
      ${cardsHtml}
    </div>
  `;

  const prevBtn = elements.gtYearlyDashboardContainer.querySelector("#gtYearPrevBtn");
  const nextBtn = elements.gtYearlyDashboardContainer.querySelector("#gtYearNextBtn");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      goalTracker.yearlyDashboardYear = selectedYear - 1;
      renderYearlyDashboard();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      goalTracker.yearlyDashboardYear = selectedYear + 1;
      renderYearlyDashboard();
    });
  }

  elements.gtYearlyDashboardContainer.querySelectorAll("[data-open-month-yr]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const yr = Number(btn.dataset.openMonthYr);
      const mo = Number(btn.dataset.openMonthMo);
      switchToMonthlyView();
      switchGoalTrackerMonth(yr, mo);
    });
  });
}

function switchToMonthlyView() {
  if (elements.gtViewMonthlyBtn) elements.gtViewMonthlyBtn.classList.add("is-active");
  if (elements.gtViewYearlyBtn) elements.gtViewYearlyBtn.classList.remove("is-active");
  if (elements.goalTrackerCard) elements.goalTrackerCard.classList.remove("is-hidden");
  if (elements.gtMonthlyControlsGroup) elements.gtMonthlyControlsGroup.classList.remove("is-hidden");
  if (elements.gtYearlyDashboardContainer) elements.gtYearlyDashboardContainer.classList.add("is-hidden");
  try { localStorage.setItem("tm_gt_active_view", "monthly"); } catch (e) { }
}

function switchToYearlyView() {
  if (elements.gtViewMonthlyBtn) elements.gtViewMonthlyBtn.classList.remove("is-active");
  if (elements.gtViewYearlyBtn) elements.gtViewYearlyBtn.classList.add("is-active");
  if (elements.goalTrackerCard) elements.goalTrackerCard.classList.add("is-hidden");
  if (elements.gtMonthlyControlsGroup) elements.gtMonthlyControlsGroup.classList.add("is-hidden");
  if (elements.gtYearlyDashboardContainer) {
    elements.gtYearlyDashboardContainer.classList.remove("is-hidden");
    renderYearlyDashboard();
  }
  try { localStorage.setItem("tm_gt_active_view", "yearly"); } catch (e) { }
}

// ============================================================================
// 🎵 Web Audio Sound & Haptic Synthesizer (Zero External Audio Assets)
// ============================================================================
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTaskCompleteSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Tone 2: A5 (880 Hz) harmonic tick
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now + 0.05);
    gain2.gain.setValueAtTime(0.09, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.22);
  } catch (e) {
    console.warn("Audio feedback error:", e);
  }
}

function playPomoChimeSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [528, 660, 792, 1056].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      const initialGain = 0.07 / (idx + 1);
      gain.gain.setValueAtTime(initialGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.8);
    });
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

let activeSoundscape = null;

function stopSoundscape() {
  if (activeSoundscape) {
    try {
      activeSoundscape.gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.2);
      setTimeout(() => {
        if (activeSoundscape) {
          activeSoundscape.nodes.forEach(n => {
            try { n.stop ? n.stop() : n.disconnect(); } catch (e) { }
          });
          activeSoundscape = null;
        }
      }, 300);
    } catch (e) {
      activeSoundscape = null;
    }
  }
}

function startSoundscape(type) {
  stopSoundscape();
  if (!type || type === "none") return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.12, now + 0.8);
    masterGain.connect(ctx.destination);

    if (type === "rain") {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(950, now);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();

      activeSoundscape = { gain: masterGain, nodes: [whiteNoise, filter, masterGain] };
    } else if (type === "waves") {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.07;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);

      const waveGain = ctx.createGain();
      waveGain.gain.setValueAtTime(0.25, now);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.16, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.2, now);
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);

      noise.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(masterGain);
      noise.start();
      lfo.start();

      activeSoundscape = { gain: masterGain, nodes: [noise, filter, waveGain, lfo, lfoGain, masterGain] };
    } else if (type === "hum") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(108, now);
      osc2.frequency.setValueAtTime(114, now);

      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(0.07, now);

      osc1.connect(toneGain);
      osc2.connect(toneGain);
      toneGain.connect(masterGain);
      osc1.start();
      osc2.start();

      activeSoundscape = { gain: masterGain, nodes: [osc1, osc2, toneGain, masterGain] };
    }
  } catch (e) {
    console.warn("Soundscape start error:", e);
  }
}

// ============================================================================
// ⏱️ Deep-Work Pomodoro Focus System
// ============================================================================
const pomo = {
  taskId: null,
  taskTitle: "Deep Focus Session",
  quadrantId: "proactive",
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  isRunning: false,
  intervalId: null,
  soundscape: "none",
};

function formatPomoTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updatePomodoroDisplay() {
  const timeStr = formatPomoTime(pomo.remainingSeconds);
  if (elements.pomoTimeDigits) elements.pomoTimeDigits.textContent = timeStr;
  if (elements.miniPomoTime) elements.miniPomoTime.textContent = timeStr;
  if (elements.miniPomoTask) elements.miniPomoTask.textContent = pomo.taskTitle;

  if (elements.pomoProgressCircle) {
    const circumference = 628.318;
    const progress = pomo.remainingSeconds / pomo.totalSeconds;
    const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
    elements.pomoProgressCircle.style.strokeDashoffset = offset;
  }
}

function togglePomodoroTimer() {
  getAudioContext();
  if (pomo.isRunning) {
    pausePomodoroTimer();
  } else {
    startPomodoroTimer();
  }
}

function startPomodoroTimer() {
  if (pomo.isRunning) return;
  pomo.isRunning = true;
  if (elements.pomoPlayIcon) elements.pomoPlayIcon.classList.add("is-hidden");
  if (elements.pomoPauseIcon) elements.pomoPauseIcon.classList.remove("is-hidden");
  if (elements.pomoPlayPauseText) elements.pomoPlayPauseText.textContent = "Pause";
  if (elements.miniPomoToggleBtn) elements.miniPomoToggleBtn.textContent = "⏸";

  if (pomo.soundscape !== "none") {
    startSoundscape(pomo.soundscape);
  }

  pomo.intervalId = setInterval(() => {
    if (pomo.remainingSeconds > 0) {
      pomo.remainingSeconds--;
      updatePomodoroDisplay();
    } else {
      onPomodoroCompleted();
    }
  }, 1000);
}

function pausePomodoroTimer() {
  pomo.isRunning = false;
  if (pomo.intervalId) {
    clearInterval(pomo.intervalId);
    pomo.intervalId = null;
  }
  if (elements.pomoPlayIcon) elements.pomoPlayIcon.classList.remove("is-hidden");
  if (elements.pomoPauseIcon) elements.pomoPauseIcon.classList.add("is-hidden");
  if (elements.pomoPlayPauseText) elements.pomoPlayPauseText.textContent = "Resume";
  if (elements.miniPomoToggleBtn) elements.miniPomoToggleBtn.textContent = "▶";
  stopSoundscape();
}

function resetPomodoroTimer() {
  pausePomodoroTimer();
  pomo.remainingSeconds = pomo.totalSeconds;
  updatePomodoroDisplay();
}

function onPomodoroCompleted() {
  pausePomodoroTimer();
  playPomoChimeSound();
  launchConfetti(2200);
  showToast(`🎉 Focus session completed: ${pomo.taskTitle}!`);

  if (pomo.taskId) {
    const minsEarned = Math.round(pomo.totalSeconds / 60);
    addMinutesToTask(pomo.taskId, minsEarned);
  }
}

function addMinutesToTask(taskId, mins) {
  const task = findTask(taskId);
  if (!task) return;
  task.minutes = (Number(task.minutes) || 0) + mins;
  persist();
  render();
  showToast(`+${mins}m logged to "${task.title}"`);
}

function startPomodoroForTask(taskId) {
  const task = findTask(taskId);
  if (task) {
    pomo.taskId = task.id;
    pomo.taskTitle = task.title;
    pomo.quadrantId = task.quadrant;
    if (elements.pomoTaskTitle) elements.pomoTaskTitle.textContent = task.title;
    if (elements.pomoQuadrantTag) {
      const q = QUADRANTS[task.quadrant] || { title: "Focus" };
      elements.pomoQuadrantTag.textContent = `${q.title} (${task.priority || "Normal"})`;
    }
  } else {
    pomo.taskId = null;
    pomo.taskTitle = "General Deep Focus";
    pomo.quadrantId = "proactive";
    if (elements.pomoTaskTitle) elements.pomoTaskTitle.textContent = "General Deep Focus";
    if (elements.pomoQuadrantTag) elements.pomoQuadrantTag.textContent = "Proactive (Q2)";
  }
  openPomodoroModal();
}

function openPomodoroModal() {
  if (elements.pomodoroFocusModal) {
    elements.pomodoroFocusModal.classList.remove("is-hidden");
    document.body.classList.add("has-open-modal");
  }
  if (elements.pomodoroMiniPill) {
    elements.pomodoroMiniPill.classList.add("is-hidden");
  }
  updatePomodoroDisplay();
}

function closePomodoroModal() {
  if (elements.pomodoroFocusModal) {
    elements.pomodoroFocusModal.classList.add("is-hidden");
    document.body.classList.remove("has-open-modal");
  }
  if (pomo.isRunning && elements.pomodoroMiniPill) {
    elements.pomodoroMiniPill.classList.remove("is-hidden");
  }
}

function wirePomodoroFocusTimer() {
  if (elements.topbarPomodoroBtn) {
    elements.topbarPomodoroBtn.addEventListener("click", () => {
      startPomodoroForTask(null);
    });
  }

  if (elements.pomoModalClose) {
    elements.pomoModalClose.addEventListener("click", closePomodoroModal);
  }

  if (elements.pomoPlayPauseBtn) {
    elements.pomoPlayPauseBtn.addEventListener("click", togglePomodoroTimer);
  }

  if (elements.pomoResetBtn) {
    elements.pomoResetBtn.addEventListener("click", resetPomodoroTimer);
  }

  if (elements.pomoAdd5mBtn) {
    elements.pomoAdd5mBtn.addEventListener("click", () => {
      pomo.remainingSeconds += 5 * 60;
      pomo.totalSeconds += 5 * 60;
      updatePomodoroDisplay();
      showToast("+5 minutes added");
    });
  }

  if (elements.pomoFinishLogBtn) {
    elements.pomoFinishLogBtn.addEventListener("click", () => {
      const elapsedSeconds = pomo.totalSeconds - pomo.remainingSeconds;
      const elapsedMins = Math.max(1, Math.round(elapsedSeconds / 60));
      if (pomo.taskId) {
        addMinutesToTask(pomo.taskId, elapsedMins);
      } else {
        showToast(`Logged ${elapsedMins}m of deep work!`);
      }
      resetPomodoroTimer();
      closePomodoroModal();
    });
  }

  document.querySelectorAll(".pomo-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pomo-preset-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const mins = Number(btn.dataset.mins) || 25;
      pausePomodoroTimer();
      pomo.totalSeconds = mins * 60;
      pomo.remainingSeconds = mins * 60;
      if (elements.pomoPhaseLabel) {
        elements.pomoPhaseLabel.textContent = mins <= 15 ? "Break Time" : "Focus Mode";
      }
      updatePomodoroDisplay();
    });
  });

  if (elements.pomoSoundSelect) {
    elements.pomoSoundSelect.addEventListener("change", (e) => {
      pomo.soundscape = e.target.value;
      if (pomo.isRunning) {
        startSoundscape(pomo.soundscape);
      }
    });
  }

  if (elements.pomodoroMiniPill) {
    elements.pomodoroMiniPill.addEventListener("click", (e) => {
      if (e.target.id === "miniPomoToggleBtn") return;
      openPomodoroModal();
    });
  }
  if (elements.miniPomoToggleBtn) {
    elements.miniPomoToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePomodoroTimer();
    });
  }
}

// ============================================================================
// ⚡ Command Palette (Spotlight / Raycast-style Ctrl+K Engine)
// ============================================================================
let cmdSelectedIndex = 0;
let currentCmdItems = [];

const DEFAULT_COMMANDS = [
  { id: "new-q1", category: "Actions", title: "Add Urgent Crisis (Q1: Reactive)", icon: "🔥", action: () => openQuickAddModal("reactive") },
  { id: "new-q2", category: "Actions", title: "Add Focus Work (Q2: Proactive)", icon: "🌱", action: () => openQuickAddModal("proactive") },
  { id: "new-q3", category: "Actions", title: "Add Interruption (Q3: Deceptive)", icon: "⚡", action: () => openQuickAddModal("deceptive") },
  { id: "new-q4", category: "Actions", title: "Add Low-Value Task (Q4: Escapist)", icon: "💤", action: () => openQuickAddModal("escapist") },
  { id: "start-timer", category: "Focus", title: "Start Deep-Work Focus Timer", icon: "⏱️", action: () => startPomodoroForTask(null) },
  { id: "toggle-compact", category: "Actions", title: "Toggle Compact Task Layout", icon: "🗜️", action: () => toggleCompactMode() },
  { id: "clear-rep", category: "Actions", title: "Clear Completed Tasks Report", icon: "🧹", action: () => clearCompletedTasks() },
  { id: "view-matrix", category: "Navigation", title: "Go to Matrix Board", icon: "🗺️", action: () => setView("matrix") },
  { id: "view-report", category: "Navigation", title: "Go to Analytics & Report", icon: "📊", action: () => { setView("matrix"); switchMatrixInnerTab("report"); } },
  { id: "view-bucket", category: "Navigation", title: "Go to Bucket List", icon: "🪣", action: () => setView("bucket") },
  { id: "view-gt", category: "Navigation", title: "Go to Goal & Habit Tracker", icon: "🎯", action: () => setView("goalTracker") },
  { id: "theme-obsidian", category: "Themes", title: "Theme: Midnight Obsidian (Dark)", icon: "🌑", action: () => applyAppTheme("obsidian") },
  { id: "theme-emerald", category: "Themes", title: "Theme: Emerald Matrix (Dark)", icon: "💎", action: () => applyAppTheme("emerald") },
  { id: "theme-light", category: "Themes", title: "Theme: Silicon Pearl (Apple Clean)", icon: "⚪", action: () => applyAppTheme("light") },
  { id: "theme-nordic", category: "Themes", title: "Theme: Nordic Birch (Warm Paper)", icon: "📜", action: () => applyAppTheme("nordic") },
  { id: "theme-linear", category: "Themes", title: "Theme: Linear Frost (Silver Violet)", icon: "❄️", action: () => applyAppTheme("linear") },
  { id: "theme-matcha", category: "Themes", title: "Theme: Matcha Studio (Sage Ceramic)", icon: "🍵", action: () => applyAppTheme("matcha") },
  { id: "theme-sunset", category: "Themes", title: "Theme: Sunset Alabaster (Golden Glow)", icon: "🌅", action: () => applyAppTheme("sunset") },
];

function openQuickAddModal(quadrantId) {
  closeCommandPalette();
  setView("matrix");
  const form = document.querySelector(`.task-form[data-form="${quadrantId}"]`);
  if (form) {
    const titleInput = form.elements.title;
    if (titleInput) {
      titleInput.scrollIntoView({ behavior: "smooth", block: "center" });
      titleInput.focus();
    }
  }
}
window.openQuickAddModal = openQuickAddModal;

function openCommandPalette() {
  if (!elements.cmdPaletteModal) return;
  elements.cmdPaletteModal.classList.remove("is-hidden");
  cmdSelectedIndex = 0;
  if (elements.cmdPaletteInput) {
    elements.cmdPaletteInput.value = "";
    elements.cmdPaletteInput.focus();
  }
  renderCommandPaletteResults("");
}

function closeCommandPalette() {
  if (!elements.cmdPaletteModal) return;
  elements.cmdPaletteModal.classList.add("is-hidden");
}

function renderCommandPaletteResults(query) {
  const cleanQ = String(query || "").trim().toLowerCase();

  const matchedCmds = DEFAULT_COMMANDS.filter((cmd) => {
    return !cleanQ || cmd.title.toLowerCase().includes(cleanQ) || cmd.category.toLowerCase().includes(cleanQ);
  });

  const matchedTasks = (state.tasks || [])
    .filter((task) => task.status === "active")
    .filter((task) => !cleanQ || task.title.toLowerCase().includes(cleanQ) || (task.notes && task.notes.toLowerCase().includes(cleanQ)))
    .slice(0, 8)
    .map((task) => ({
      id: `task-${task.id}`,
      category: "Tasks",
      title: task.title,
      subtitle: `${QUADRANTS[task.quadrant]?.title || "Task"} • ${task.priority || "P3"} • ${minutesLabel(task.minutes)}`,
      icon: "⚡",
      action: () => {
        closeCommandPalette();
        startPomodoroForTask(task.id);
      }
    }));

  currentCmdItems = [...matchedCmds, ...matchedTasks];
  if (cmdSelectedIndex >= currentCmdItems.length) {
    cmdSelectedIndex = 0;
  }

  if (!elements.cmdPaletteResults) return;

  if (currentCmdItems.length === 0) {
    elements.cmdPaletteResults.innerHTML = `
      <div class="cmd-palette-empty">
        <p>No commands or tasks found for "${escapeHtml(cleanQ)}"</p>
      </div>
    `;
    return;
  }

  let html = "";
  let lastCategory = "";
  currentCmdItems.forEach((item, index) => {
    if (item.category !== lastCategory) {
      lastCategory = item.category;
      html += `<div class="cmd-category-header">${escapeHtml(lastCategory)}</div>`;
    }
    const isSelected = index === cmdSelectedIndex;
    html += `
      <div class="cmd-item ${isSelected ? "is-active" : ""}" data-cmd-index="${index}">
        <span class="cmd-item-icon">${item.icon}</span>
        <div class="cmd-item-text">
          <span class="cmd-item-title">${escapeHtml(item.title)}</span>
          ${item.subtitle ? `<span class="cmd-item-subtitle">${escapeHtml(item.subtitle)}</span>` : ""}
        </div>
        ${isSelected ? `<kbd class="cmd-enter-hint">↵</kbd>` : ""}
      </div>
    `;
  });

  elements.cmdPaletteResults.innerHTML = html;

  elements.cmdPaletteResults.querySelectorAll(".cmd-item").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.cmdIndex);
      executeCommand(idx);
    });
  });

  const activeEl = elements.cmdPaletteResults.querySelector(".cmd-item.is-active");
  if (activeEl) {
    activeEl.scrollIntoView({ block: "nearest" });
  }
}

function executeCommand(index) {
  const item = currentCmdItems[index];
  if (item && typeof item.action === "function") {
    closeCommandPalette();
    item.action();
  }
}

function wireCommandPalette() {
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (elements.cmdPaletteModal && !elements.cmdPaletteModal.classList.contains("is-hidden")) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    } else if (e.key === "Escape") {
      closeCommandPalette();
    }
  });

  if (elements.cmdPaletteTriggerBtn) {
    elements.cmdPaletteTriggerBtn.addEventListener("click", openCommandPalette);
  }

  if (elements.cmdPaletteCloseKey) {
    elements.cmdPaletteCloseKey.addEventListener("click", closeCommandPalette);
  }

  if (elements.cmdPaletteModal) {
    elements.cmdPaletteModal.addEventListener("click", (e) => {
      if (e.target === elements.cmdPaletteModal) {
        closeCommandPalette();
      }
    });
  }

  if (elements.cmdPaletteInput) {
    elements.cmdPaletteInput.addEventListener("input", (e) => {
      cmdSelectedIndex = 0;
      renderCommandPaletteResults(e.target.value);
    });

    elements.cmdPaletteInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (currentCmdItems.length > 0) {
          cmdSelectedIndex = (cmdSelectedIndex + 1) % currentCmdItems.length;
          renderCommandPaletteResults(elements.cmdPaletteInput.value);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (currentCmdItems.length > 0) {
          cmdSelectedIndex = (cmdSelectedIndex - 1 + currentCmdItems.length) % currentCmdItems.length;
          renderCommandPaletteResults(elements.cmdPaletteInput.value);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeCommand(cmdSelectedIndex);
      }
    });
  }
}


