import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import { getRunLogEntries } from "../services/project-automation.js";
import {
  renderDataTableEmptyState,
  renderDataTableHead,
  renderDataTableShell
} from "./ui/data-table-shell.js";

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

  return "—";
}

function renderRunStatus(entry) {
  const meta = getRunStatusMeta(entry.status);
  return `<span class="${meta.className}">${escapeHtml(meta.label)}</span>`;
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
          <div class="workflow-runs__title">${escapeHtml(entry.name || "Run")}</div>
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
      description: "Lance une analyse manuelle depuis l’onglet Sujets pour alimenter le journal d’exécution."
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
          <section class="settings-section">
            <div class="settings-card">
              <div class="settings-card__head">
                <div>
                  <h4>Tableau des actions</h4>
                  <p>
                    Cette vue ne conserve volontairement que le tableau d’exécution, sans menu latéral ni contenu doctrinal.
                  </p>
                </div>
                <span class="settings-badge mono">RUN LOG</span>
              </div>

              ${renderRunsTable()}
            </div>
          </section>
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectActionsScroll"));
}
