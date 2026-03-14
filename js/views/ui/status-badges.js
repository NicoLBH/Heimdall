function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export function normalizeVerdict(verdict) {
  const v = String(verdict || "").trim().toUpperCase();
  if (!v) return "";
  if (v === "WARN") return "WARNING";
  if (v === "DEFAVORABLE") return "KO";
  if (v === "FAVORABLE") return "OK";
  return v;
}

function verdictBadgeClass(verdict) {
  const v = normalizeVerdict(verdict) || "—";
  const safe = v.replace(/[^A-Z0-9_-]/g, "");

  if (["F", "D", "S", "HM", "PM", "SO"].includes(safe)) {
    return `verdict-badge verdict-${safe}`;
  }
  if (safe === "OK") return "verdict-badge verdict-F";
  if (safe === "KO") return "verdict-badge verdict-D";
  if (safe === "WARNING") return "verdict-badge verdict-S";

  return "verdict-badge";
}

function verdictDotClass(verdict) {
  const v = normalizeVerdict(verdict);

  if (v === "F" || v === "OK") return "v-dot v-dot--f";
  if (v === "S" || v === "WARNING") return "v-dot v-dot--s";
  if (v === "D" || v === "KO") return "v-dot v-dot--d";
  if (v === "HM") return "v-dot v-dot--hm";
  if (v === "PM") return "v-dot v-dot--pm";
  if (v === "SO") return "v-dot v-dot--so";

  return "v-dot";
}

export function renderStatusBadge({
  label = "",
  tone = "default",
  className = ""
} = {}) {
  const safeTone = String(tone || "default").toLowerCase();
  const toneClass = safeTone === "default" ? "badge" : `badge badge--${escapeHtml(safeTone)}`;
  const extraClass = className ? ` ${escapeHtml(className)}` : "";
  return `<span class="${toneClass}${extraClass}">${escapeHtml(label)}</span>`;
}

export function renderCountBadge(value = 0, options = {}) {
  const {
    className = "project-tabs__counter",
    ariaLabel
  } = options;

  const count = Number(value || 0);
  const safeClassName = escapeHtml(className);
  const safeAriaLabel = escapeHtml(ariaLabel || `${count} élément(s)`);

  return `<span class="${safeClassName}" aria-label="${safeAriaLabel}">${count}</span>`;
}

export function renderVerdictPill(verdict) {
  const label = normalizeVerdict(verdict) || "—";
  return `<span class="${verdictBadgeClass(verdict)}">${escapeHtml(label)}</span>`;
}

export function renderStateDot(state) {
  return `<span class="${verdictDotClass(state)}" aria-hidden="true"></span>`;
}
