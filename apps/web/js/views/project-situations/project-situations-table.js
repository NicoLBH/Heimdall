import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderStatusBadge } from "../ui/status-badges.js";
import { renderDataTableHead } from "../ui/data-table-shell.js";
import { renderIssuesTable } from "../ui/issues-table.js";

export function createProjectSituationsTable({
  store,
  uiState,
  getSituations,
  normalizeSituationMode,
  normalizeSituationStatus,
  renderSituationCount,
  formatSituationUpdatedLabel
}) {
  function renderStatePill(status) {
    return renderStatusBadge({
      label: normalizeSituationStatus(status) === "closed" ? "Fermée" : "Ouverte",
      tone: normalizeSituationStatus(status) === "closed" ? "muted" : "success"
    });
  }

  function renderModePill(mode) {
    return renderStatusBadge({
      label: normalizeSituationMode(mode) === "automatic" ? "Automatique" : "Manuelle",
      tone: normalizeSituationMode(mode) === "automatic" ? "accent" : "default"
    });
  }

  function getSituationsTableHeadHtml() {
    return renderDataTableHead({
      columns: [
        { className: "cell cell-theme", label: "Situation" },
        { className: "cell", label: "Statut" },
        { className: "cell", label: "Mode" },
        { className: "cell", label: "Nb sujets" }
      ]
    });
  }

  function renderSituationTitleCell(situation) {
    const title = escapeHtml(situation.title);
    const updatedLabel = escapeHtml(formatSituationUpdatedLabel(situation.updated_at || situation.created_at || ""));
    const selectedClass = store.situationsView?.selectedSituationId === situation.id ? " selected subissue-row--selected" : "";

    return `
      <div class="issue-row issue-row--sit${selectedClass}">
        <div class="cell cell-theme lvl0">
          <span class="issue-row-title-grid">
            <span class="issue-row-title-grid__status" aria-hidden="true">${svgIcon("table", { className: "octicon" })}</span>
            <span class="issue-row-title-grid__title">
              <button type="button" class="row-title-trigger theme-text theme-text--sit" data-open-situation="${escapeHtml(situation.id)}">${title}</button>
            </span>
            <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${updatedLabel}</span>
          </span>
        </div>
        <div class="cell">${renderStatePill(situation.status)}</div>
        <div class="cell">${renderModePill(situation.mode)}</div>
        <div class="cell mono">${escapeHtml(renderSituationCount(situation.id))}</div>
      </div>
    `;
  }

  function renderSituationsTable() {
    const situations = getSituations();

    if (uiState.error) {
      return `<div class="settings-inline-error">${escapeHtml(uiState.error)}</div>`;
    }

    if (uiState.loading && !situations.length) {
      return renderIssuesTable({
        gridTemplate: "minmax(420px, 1.6fr) max-content max-content 90px",
        headHtml: getSituationsTableHeadHtml(),
        emptyTitle: "Chargement des situations…",
        emptyDescription: ""
      });
    }

    return renderIssuesTable({
      gridTemplate: "minmax(420px, 1.6fr) max-content max-content 90px",
      headHtml: getSituationsTableHeadHtml(),
      rowsHtml: situations.map((situation) => renderSituationTitleCell(situation)).join(""),
      emptyTitle: "Aucune situation",
      emptyDescription: "Aucune situation n’est disponible pour ce projet."
    });
  }

  return {
    renderStatePill,
    renderModePill,
    getSituationsTableHeadHtml,
    renderSituationTitleCell,
    renderSituationsTable
  };
}
