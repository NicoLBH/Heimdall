import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import { getRunLogEntries, getRunMetrics } from "../services/project-automation.js";
import { svgIcon } from "../ui/icons.js";
import {
  renderDataTableEmptyState,
  renderDataTableHead,
  renderDataTableShell
} from "./ui/data-table-shell.js";

function getRunSuccessIconSvg() {
  return svgIcon("check-circle-fill", {
    className: "octicon octicon-check-circle-fill",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

function getRunAlertIconSvg() {
  return svgIcon("stop-alert", {
    className: "octicon octicon-stop",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

function getRunPendingIconSvg() {
  return svgIcon("dot-fill-pending", {
    className: "octicon octicon-dot-fill",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

function getRunStateIcon(entry) {
  const status = String(entry?.status || "").toLowerCase();

  if (status === "success") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--success" title="Exécution réussie">
        ${getRunSuccessIconSvg()}
      </span>
    `;
  }

  if (status === "error" || status === "cancelled" || status === "interrupted") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--alert" title="Exécution en anomalie">
        ${getRunAlertIconSvg()}
      </span>
    `;
  }

  if (status === "running" || status === "queued" || status === "pending") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--pending" title="Exécution en cours">
        ${getRunPendingIconSvg()}
      </span>
    `;
  }

  return `
    <span class="workflow-runs__state-icon workflow-runs__state-icon--neutral"></span>
  `;
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatDuration(value) {
  const ms = Number(value);

  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;

  const seconds = ms / 1000;
  if (seconds < 60) {
    return seconds < 10 ? `${seconds.toFixed(1)} s` : `${Math.round(seconds)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${remainingSeconds}s`
      : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function getRunStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "running") {
    return {
      label: "En cours",
      className: "workflow-status-pill workflow-status-pill--running"
    };
  }

  if (normalized === "success") {
    return {
      label: "Réussi",
      className: "workflow-status-pill workflow-status-pill--success"
    };
  }

  if (normalized === "error") {
    return {
      label: "Échec",
      className: "workflow-status-pill workflow-status-pill--error"
    };
  }

  return {
    label: normalized || "—",
    className: "workflow-status-pill"
  };
}

function getTriggerLabel(entry) {
  if (entry.triggerLabel) return entry.triggerLabel;

  if (entry.triggerType === "document-upload") {
    return "Dépôt de document";
  }

  if (entry.triggerType === "manual") {
    return "Lancement manuel";
  }

  if (entry.triggerType === "automatic") {
    return "Déclenchement automatique";
  }

  return "—";
}

function renderRunStatus(entry) {
  const meta = getRunStatusMeta(entry.status);
  return `<span class="${meta.className}">${escapeHtml(meta.label)}</span>`;
}


function renderMetricCard({ label, value, hint = "" }) {
  return `
    <article class="pilotage-metric-card">
      <div class="pilotage-metric-card__label">${escapeHtml(label)}</div>
      <div class="pilotage-metric-card__value">${escapeHtml(value)}</div>
      ${hint ? `<div class="pilotage-metric-card__hint">${escapeHtml(hint)}</div>` : ""}
    </article>
  `;
}

function renderRunMetrics() {
  const metrics = getRunMetrics();

  return `
    <section class="settings-grid settings-grid--metrics" style="margin:0 0 24px;">
      ${renderMetricCard({
        label: "Actions exécutées",
        value: String(metrics.totalRuns || 0),
        hint: "Analyses et enrichissements confondus"
      })}
      ${renderMetricCard({
        label: "Enrichissements",
        value: String(metrics.totalEnrichments || 0),
        hint: "Journal des données de base projet"
      })}
      ${renderMetricCard({
        label: "Analyses",
        value: String(metrics.totalAnalyses || 0),
        hint: "Runs d'analyse documentaires"
      })}
      ${renderMetricCard({
        label: "Taux de réussite",
        value: metrics.successRate == null ? "—" : `${metrics.successRate} %`,
        hint: metrics.totalErrors ? `${metrics.totalErrors} échec(s)` : "Aucun échec enregistré"
      })}
    </section>
  `;
}

function renderRunRows(entries) {
  return entries.map((entry) => {
    const actionMeta = entry.documentName
      ? `<div class="workflow-runs__meta mono">${escapeHtml(entry.documentName)}</div>`
      : (entry.summary
          ? `<div class="workflow-runs__meta">${escapeHtml(entry.summary)}</div>`
          : "");

    const triggerMeta = entry.triggerType
      ? `<div class="workflow-runs__meta">${escapeHtml(entry.triggerType)}</div>`
      : "";

    return `
      <div class="workflow-runs__row">
        <div class="workflow-runs__cell workflow-runs__cell--action">
          <div class="workflow-runs__title-row">
            ${getRunStateIcon(entry)}
            <span class="workflow-runs__title">${escapeHtml(entry.name || "Run")}</span>
          </div>
          ${actionMeta}
        </div>

        <div class="workflow-runs__cell">
          <div class="workflow-runs__text">${escapeHtml(getTriggerLabel(entry))}</div>
          ${triggerMeta}
        </div>

        <div class="workflow-runs__cell workflow-runs__cell--muted">
          ${escapeHtml(formatDateTime(entry.startedAt))}
        </div>

        <div class="workflow-runs__cell workflow-runs__cell--muted">
          ${escapeHtml(formatDuration(entry.durationMs))}
        </div>

        <div class="workflow-runs__cell workflow-runs__cell--status">
          ${renderRunStatus(entry)}
        </div>
      </div>
    `;
  }).join("");
}

function renderRunsTable() {
  const entries = getRunLogEntries();

  return renderDataTableShell({
    className: "workflow-runs-table",
    gridTemplate: "minmax(280px,1.6fr) 220px 170px 120px 120px",
    headHtml: renderDataTableHead({
      columns: [
        "Action",
        "Déclencheur",
        "Date",
        "Durée",
        "Statut"
      ]
    }),
    bodyHtml: renderRunRows(entries),
    state: entries.length ? "ready" : "empty",
    emptyHtml: renderDataTableEmptyState({
      title: "Aucune action exécutée",
      description: "Lance une analyse ou un enrichissement manuel pour alimenter le journal d’exécution."
    })
  });
}

export function renderProjectActions(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Actions",
    variant: "actions"
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectActionsScroll">
        <div class="settings-content" style="max-width:1216px;margin:0 auto;padding:24px 32px 40px;">
          ${renderRunMetrics()}
          ${renderRunsTable()}
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectActionsScroll"));
}
