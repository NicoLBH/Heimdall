import { store } from "../store.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import {
  bindGhActionButtons,
  bindGhSelectMenus,
  initGhActionButton,
  renderGhActionButton
} from "./ui/gh-split-button.js";
import {
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup,
  renderProjectTableToolbarSelect
} from "./ui/project-table-toolbar.js";
import { renderGhInput } from "./ui/gh-input.js";
import { renderStateDot } from "./ui/status-badges.js";
import { svgIcon } from "../ui/icons.js";
import { renderDataTableShell, renderDataTableHead } from "./ui/data-table-shell.js";
import { escapeHtml } from "../utils/escape-html.js";
import { shouldAutoRunAnalysisAfterUpload } from "../services/project-automation.js";
import {
  getCurrentAnalysisRunMeta,
  isAnalysisRunning,
  runAnalysis
} from "../services/analysis-runner.js";
import { createProjectProposal } from "../services/project-proposals.js";
import { addProjectDocument, decorateDocumentWithPhase, getEnabledProjectPhasesCatalog, getProjectDocuments, resolveDocumentRefs } from "../services/project-documents-store.js";
import { getDocumentStatsMap } from "../services/project-document-selectors.js";
import { getEffectiveAvisVerdict, getEffectiveSituationStatus, getEffectiveSujetStatus } from "./project-situations.js";

const DOCUMENT_FOLDERS = [
  { name: "Architecte", note: "Dossier discipline" },
  { name: "Structure", note: "Dossier discipline" },
  { name: "Fluides", note: "Dossier discipline" },
  { name: "Contrôle Technique", note: "Dossier discipline" },
  { name: "CSPS", note: "Dossier discipline" }
];

const docsViewState = {
  mode: "list", // "list" | "upload" | "report-preview"
  file: null,
  title: "",
  description: "",
  depositMode: "direct",
  proposalName: "",
  isUploading: false,
  uploadProgress: 0,
  uploadTimer: null,
  selectedPhase: store.projectForm?.currentPhase || store.projectForm?.phase || "APS",
  reportNumber: 1,
  activity: {
    tone: "info",
    title: "",
    message: ""
  }
};

function syncDocumentsSelectedPhase() {
  const enabledPhases = getEnabledProjectPhasesCatalog();
  const fallbackPhase = enabledPhases[0]?.code || "APS";

  if (!enabledPhases.some((item) => item.code === docsViewState.selectedPhase)) {
    docsViewState.selectedPhase =
      enabledPhases.find((item) => item.code === store.projectForm?.currentPhase)?.code ||
      enabledPhases.find((item) => item.code === store.projectForm?.phase)?.code ||
      fallbackPhase;
  }
}

function getFolderIconSvg() {
  return svgIcon("file-directory", { className: "icon-directory" });
}

function getDocumentIconSvg() {
  return svgIcon("file", { className: "octicon octicon-file color-fg-muted" });
}

function getLargeDocumentIconSvg() {
  return svgIcon("file", {
    className: "octicon octicon-file mb-2 color-fg-muted",
    width: 32,
    height: 32
  });
}

function getCommitIconSvg() {
  return svgIcon("git-commit", { className: "octicon octicon-git-commit" });
}

function getProposalIconSvg() {
  return svgIcon("git-pull-request", {
    className: "octicon octicon-git-pull-request"
  });
}

function getBranchIconSvg() {
  return svgIcon("git-branch", { className: "octicon octicon-git-branch" });
}

function getSocotecLogoSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="216" height="530" viewBox="0 0 216 530" fill="none" class="documents-report__socotec-logo" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M203.402 442.191C165.381 393.404 143.437 331.616 145.265 264.959C147.071 199.127 171.77 139.309 211.528 92.9189L105.548 2.50092C43.3923 75.3543 8.60738 167.613 7.19168 263.368C5.77598 359.122 37.8183 452.369 97.7928 527.028L203.402 442.191Z" fill="white"/>
      <path d="M102.137 425.284C95.6738 425.284 90.4235 420.002 90.4235 413.499C90.4235 406.996 95.6738 401.714 102.137 401.714C105.824 401.714 109.091 403.427 111.238 406.08C113.945 403.874 117.072 401.338 120.339 398.662C116.045 393.332 109.488 389.928 102.137 389.928C89.1867 389.928 78.7095 400.493 78.7095 413.499C78.7095 426.529 89.2101 437.07 102.137 437.07C109.488 437.07 116.045 433.666 120.339 428.336L111.238 420.918C109.091 423.571 105.824 425.284 102.137 425.284Z" fill="#0082DE"/>
      <path d="M111.238 420.894C112.871 418.875 113.852 416.293 113.852 413.476C113.852 410.658 112.871 408.076 111.238 406.057C105.871 410.424 102.138 413.476 102.138 413.476L111.238 420.894Z" fill="#00ACE8"/>
      <path d="M137.279 413.499C137.279 405.071 134.339 397.323 129.439 391.243C126.429 393.708 123.325 396.244 120.339 398.662C123.605 402.723 125.565 407.865 125.565 413.499C125.565 419.11 123.605 424.275 120.339 428.336L129.439 435.755C134.363 429.675 137.279 421.927 137.279 413.499Z" fill="#00ACE8"/>
      <path d="M120.362 398.662C117.095 401.338 113.968 403.874 111.261 406.08C112.895 408.099 113.875 410.682 113.875 413.499C113.875 416.316 112.895 418.899 111.261 420.918L120.362 428.336C123.629 424.275 125.589 419.134 125.589 413.499C125.565 407.865 123.629 402.7 120.362 398.662Z" fill="#005499"/>
      <path d="M102.17 451.16C101.651 451.618 101.005 451.834 100.27 451.86C99.5232 451.834 98.8521 451.592 98.3329 451.122C97.8011 450.625 97.5352 449.989 97.5478 449.213C97.5478 448.45 97.8264 447.801 98.3456 447.292C98.8521 446.796 99.4979 446.541 100.258 446.516C100.979 446.516 101.6 446.745 102.144 447.139L103.79 445.46C103.145 444.925 102.41 444.569 101.562 444.404C101.233 444.327 100.878 444.302 100.524 444.289H100.258C100.194 444.289 100.131 444.289 100.068 444.302H100.042C99.6878 444.315 99.3332 444.366 99.004 444.442C98.0796 444.645 97.2819 445.065 96.5981 445.702C95.6231 446.63 95.1166 447.801 95.1039 449.239C95.0913 450.676 95.5851 451.834 96.5601 452.737C96.8894 453.043 97.2439 453.285 97.6365 453.488C98.3962 453.87 99.2446 454.061 100.194 454.048H100.27C101.22 454.035 102.03 453.781 102.79 453.386C103.132 453.208 103.461 452.979 103.753 452.712L102.17 451.16ZM140.297 451.16C139.778 451.618 139.132 451.834 138.397 451.86C137.65 451.834 136.979 451.592 136.46 451.122C135.928 450.625 135.662 449.989 135.675 449.213C135.675 448.45 135.954 447.801 136.473 447.292C136.979 446.796 137.625 446.541 138.385 446.516C139.107 446.516 139.727 446.745 140.272 447.139L141.918 445.46C141.272 444.925 140.537 444.569 139.689 444.404C139.36 444.327 139.005 444.302 138.651 444.289H138.385C138.322 444.289 138.258 444.289 138.195 444.302H138.17C137.815 444.315 137.46 444.366 137.131 444.442C136.207 444.645 135.409 445.065 134.725 445.702C133.75 446.63 133.244 447.801 133.231 449.239C133.218 450.676 133.712 451.834 134.687 452.737C135.017 453.043 135.371 453.285 135.764 453.488C136.523 453.87 137.372 454.061 138.322 454.048H138.397C139.347 454.035 140.158 453.781 140.917 453.386C141.259 453.208 141.588 452.979 141.88 452.712L140.297 451.16ZM109.235 454.086C107.805 454.086 106.614 453.615 105.665 452.648C104.715 451.681 104.246 450.524 104.246 449.149C104.246 447.775 104.715 446.618 105.665 445.651C106.614 444.684 107.805 444.213 109.235 444.213C110.666 444.213 111.857 444.684 112.806 445.651C113.756 446.618 114.225 447.775 114.225 449.149C114.225 450.524 113.756 451.681 112.806 452.648C111.857 453.615 110.666 454.086 109.235 454.086ZM109.235 451.834C109.957 451.834 110.527 451.58 111.008 451.071C111.477 450.574 111.73 449.913 111.73 449.149C111.73 448.373 111.489 447.724 111.008 447.228C110.54 446.732 109.957 446.465 109.235 446.465C108.514 446.465 107.931 446.719 107.45 447.228C106.981 447.724 106.754 448.386 106.754 449.149C106.754 449.926 106.981 450.574 107.45 451.071C107.919 451.58 108.514 451.834 109.235 451.834ZM88.6586 454.086C87.2278 454.086 86.0375 453.615 85.0878 452.648C84.1381 451.681 83.6696 450.524 83.6696 449.149C83.6696 447.775 84.1381 446.618 85.0878 445.651C86.0375 444.684 87.2278 444.213 88.6586 444.213C90.0895 444.213 91.2798 444.684 92.2295 445.651C93.1792 446.618 93.6477 447.775 93.6477 449.149C93.6477 450.524 93.1792 451.681 92.2295 452.648C91.2798 453.615 90.0895 454.086 88.6586 454.086ZM88.6586 451.834C89.3804 451.834 89.9502 451.58 90.4314 451.071C90.8999 450.574 91.1532 449.913 91.1532 449.149C91.1532 448.373 90.9126 447.724 90.4314 447.228C89.9629 446.732 89.3804 446.465 88.6586 446.465C87.9369 446.465 87.3544 446.719 86.8732 447.228C86.4047 447.724 86.1768 448.386 86.1768 449.149C86.1768 449.926 86.4047 450.574 86.8732 451.071C87.3544 451.58 87.9495 451.834 88.6586 451.834ZM122.962 444.416H114.845V446.567H117.188C117.466 446.567 117.681 446.796 117.681 447.063V453.921H120.113V447.063C120.113 446.783 120.341 446.567 120.606 446.567H122.962V444.416ZM131.889 451.783H127.647C127.368 451.783 127.153 451.554 127.153 451.287V450.142H130.775V448.144H127.153V447.088C127.153 446.808 127.381 446.592 127.647 446.592H131.775V444.455H124.709V453.959H131.876V451.783H131.889ZM79.2756 448.221C77.3889 447.864 77.1736 447.495 77.199 447.101C77.2369 446.668 77.7561 446.452 78.4779 446.427C79.2503 446.401 80.162 446.541 81.1117 447.05L82.6186 445.409C81.4536 444.658 79.9594 444.264 78.4399 444.315C76.1733 444.391 74.7044 445.651 74.7677 447.368V447.394C74.8184 449.022 76.1226 449.76 78.25 450.167C80.1114 450.524 80.3393 450.842 80.352 451.172V451.198C80.3646 451.631 79.6175 451.923 78.7818 451.949C77.7308 451.987 76.5152 451.72 75.5528 450.994H75.5402L74.0713 452.623L74.1979 452.712C75.4768 453.641 77.1103 454.112 78.8198 454.061C81.3017 453.972 82.8338 452.61 82.7705 450.918V450.893C82.7072 449.289 81.3776 448.628 79.2756 448.221Z" fill="black"/>
    </svg>
  `;
}

function getRemoveIconSvg() {
  return svgIcon("x");
}

function getDocumentsTableGridTemplate() {
  return "minmax(280px, 1.2fr) minmax(220px, 1fr) 180px minmax(260px, 1.1fr)";
}

function setDocumentsActivity({ tone = "info", title = "", message = "" } = {}) {
  docsViewState.activity = {
    tone,
    title,
    message
  };
}

function clearDocumentsActivity() {
  docsViewState.activity = {
    tone: "info",
    title: "",
    message: ""
  };
}

function renderDocumentsActivityBanner() {
  const title = String(docsViewState.activity?.title || "").trim();
  const message = String(docsViewState.activity?.message || "").trim();

  if (!title && !message) return "";

  const tone = String(docsViewState.activity?.tone || "info").toLowerCase();
  const className =
    tone === "success"
      ? "documents-activity-banner documents-activity-banner--success"
      : tone === "warning"
        ? "documents-activity-banner documents-activity-banner--warning"
        : tone === "error"
          ? "documents-activity-banner documents-activity-banner--error"
          : "documents-activity-banner documents-activity-banner--info";

  return `
    <div class="${className}" role="status" aria-live="polite">
      <div class="documents-activity-banner__body">
        ${title ? `<div class="documents-activity-banner__title">${escapeHtml(title)}</div>` : ""}
        ${message ? `<div class="documents-activity-banner__message">${escapeHtml(message)}</div>` : ""}
      </div>
      <button
        type="button"
        class="documents-activity-banner__close"
        id="documentsActivityCloseBtn"
        aria-label="Fermer"
        title="Fermer"
      >
        ${getRemoveIconSvg()}
      </button>
    </div>
  `;
}

function renderDocumentsTableHeadHtml() {
  return renderDataTableHead({
    columns: [
      { className: "documents-repo__col documents-repo__col--name", label: "Nom" },
      { className: "documents-repo__col documents-repo__col--message", label: "Description" },
      { className: "documents-repo__col documents-repo__col--date", label: "Dernière mise à jour" },
      { className: "documents-repo__col documents-repo__col--stats", label: "Compteurs" }
    ]
  });
}

function renderDocumentsToolbar() {
  const addButton = renderGhActionButton({
    id: "documentsAddSplit",
    label: "Ajouter",
    tone: "default",
    mainAction: "add-documents",
    items: [
      { label: "Ajouter des documents", action: "add-documents" },
      { label: "Ajouter un dossier", action: "add-folder" },
      { separator: true },
      { label: "Créer un rapport", action: "create-report" }
    ]
  });

  const documentsButton = renderGhActionButton({
    id: "documentsActionsSplit",
    label: "Documents",
    icon: getLargeDocumentIconSvg(),
    tone: "primary",
    mainAction: "download-zip",
    items: [
      { label: "Télécharger le dossier ZIP", action: "download-zip" }
    ]
  });

  const enabledPhases = getEnabledProjectPhasesCatalog();

  const leftHtml = renderProjectTableToolbarGroup({
    html: renderProjectTableToolbarSelect({
      id: "documentsPhase",
      value: docsViewState.selectedPhase,
      icon: getBranchIconSvg(),
      options: enabledPhases.map((phase) => ({
        value: phase.code,
        label: `${phase.code} - ${phase.label}`
      }))
    })
  });

  const rightHtml = [
    renderProjectTableToolbarGroup({ html: addButton }),
    renderProjectTableToolbarGroup({ html: documentsButton })
  ].join("");

  return renderProjectTableToolbar({
    className: "project-table-toolbar--documents",
    leftHtml,
    rightHtml
  });
}


function renderDocumentsCountBadge({ iconHtml = "", label = "", count = 0 } = {}) {
  return `
    <span class="documents-count-badge" title="${escapeHtml(`${label} : ${count}`)}">
      <span class="documents-count-badge__icon" aria-hidden="true">${iconHtml}</span>
      <span class="documents-count-badge__count">${escapeHtml(String(count))}</span>
    </span>
  `;
}

function renderDocumentStatsCell(doc) {
  const statsMap = getDocumentStatsMap({
    getSituationStatus: getEffectiveSituationStatus,
    getSujetStatus: getEffectiveSujetStatus,
    getAvisVerdict: getEffectiveAvisVerdict
  });
  const stats = statsMap.get(doc.id) || {
    openSituations: 0,
    openSujets: 0,
    avisVerdicts: { F: 0, S: 0, D: 0, HM: 0, PM: 0, SO: 0 }
  };

  return `
    <div class="documents-repo__stats" aria-label="Compteurs liés au document">
      ${renderDocumentsCountBadge({ iconHtml: svgIcon("issue-opened"), label: "Situations ouvertes", count: stats.openSituations })}
      ${renderDocumentsCountBadge({ iconHtml: svgIcon("issue-opened"), label: "Sujets ouverts", count: stats.openSujets })}
      ${renderDocumentsCountBadge({ iconHtml: renderStateDot("F"), label: "Avis F", count: stats.avisVerdicts.F })}
      ${renderDocumentsCountBadge({ iconHtml: renderStateDot("S"), label: "Avis S", count: stats.avisVerdicts.S })}
      ${renderDocumentsCountBadge({ iconHtml: renderStateDot("D"), label: "Avis D", count: stats.avisVerdicts.D })}
      ${renderDocumentsCountBadge({ iconHtml: renderStateDot("HM"), label: "Avis HM", count: stats.avisVerdicts.HM })}
      ${renderDocumentsCountBadge({ iconHtml: renderStateDot("PM"), label: "Avis PM", count: stats.avisVerdicts.PM })}
      ${renderDocumentsCountBadge({ iconHtml: renderStateDot("SO"), label: "Avis SO", count: stats.avisVerdicts.SO })}
    </div>
  `;
}

function renderRepoDocumentRow(doc) {
  const decoratedDoc = decorateDocumentWithPhase(doc);
  return `
    <div class="documents-repo__row documents-repo__row--file">
      <div class="documents-repo__cell documents-repo__cell--name">
        <span class="documents-repo__icon documents-repo__icon--document">${getDocumentIconSvg()}</span>
        <span class="documents-repo__name">${escapeHtml(decoratedDoc.name)}</span>
      </div>
      <div class="documents-repo__cell documents-repo__cell--message">
        <div class="documents-repo__message-main">${escapeHtml(decoratedDoc.note || "Document prêt pour l'analyse")}</div>
        <div class="documents-repo__message-meta">${escapeHtml(`${decoratedDoc.phaseCode}${decoratedDoc.phaseLabel ? ` - ${decoratedDoc.phaseLabel}` : ""}`)}</div>
      </div>
      <div class="documents-repo__cell documents-repo__cell--date">${escapeHtml(decoratedDoc.updatedAt || "À l'instant")}</div>
      <div class="documents-repo__cell documents-repo__cell--stats">${renderDocumentStatsCell(decoratedDoc)}</div>
    </div>
  `;
}

function getReportTitle() {
  return `Rapport chrono n° ${docsViewState.reportNumber}`;
}

function formatReportDate(value = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(value);
}

function getReportAuthorName() {
  return String(store.user?.name || "demo");
}

function getEntitySummary(entity = null) {
  const raw = entity?.raw || {};
  return String(raw.summary || raw.message || raw.comment || raw.reasoning || raw.analysis || entity?.title || "Aucune synthèse disponible.");
}

function getEntityReferenceLine(entity = null) {
  const refs = resolveDocumentRefs(Array.isArray(entity?.document_ref_ids) ? entity.document_ref_ids : [])
    .map((doc) => decorateDocumentWithPhase(doc))
    .filter(Boolean);

  if (!refs.length) {
    return "Références documentaires : —";
  }

  return `Références documentaires : ${refs.map((doc) => `${doc.name}${doc.phaseCode ? ` (${doc.phaseCode})` : ""}`).join(" · ")}`;
}

function normalizeWorkflowStatus(status = "open") {
  const value = String(status || "open").trim().toLowerCase();
  if (["closed", "close", "ferme", "fermé"].includes(value)) return "fermé";
  if (["reopened", "reopen", "réouvert", "reopenend"].includes(value)) return "réouvert";
  return "ouvert";
}

function isHumanValidated(entity = null) {
  return String(entity?.review_state || "pending").toLowerCase() === "validated";
}

function shouldIncludeInReport(entity = null) {
  if (!entity) return false;
  return !entity.is_published || !!entity.has_changes_since_publish;
}

function buildReportPreviewItems() {
  const situations = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  const items = [];

  for (const situation of situations) {
    if (shouldIncludeInReport(situation)) {
      items.push({
        key: `situation:${situation.id}`,
        entityType: "situation",
        entity: situation,
        number: situation.id,
        stateLabel: normalizeWorkflowStatus(getEffectiveSituationStatus(situation.id)),
        title: situation.title || situation.id
      });
    }

    for (const sujet of situation.sujets || []) {
      if (shouldIncludeInReport(sujet)) {
        items.push({
          key: `sujet:${sujet.id}`,
          entityType: "sujet",
          entity: sujet,
          number: sujet.id,
          stateLabel: normalizeWorkflowStatus(getEffectiveSujetStatus(sujet.id)),
          title: sujet.title || sujet.id
        });
      }

      for (const avis of sujet.avis || []) {
        if (!shouldIncludeInReport(avis)) continue;
        items.push({
          key: `avis:${avis.id}`,
          entityType: "avis",
          entity: avis,
          number: avis.id,
          stateLabel: getEffectiveAvisVerdict(avis.id),
          title: avis.title || avis.id
        });
      }
    }
  }

  return items;
}

function renderReportPreviewItem(item) {
  const entity = item.entity || null;
  const invalidClass = isHumanValidated(entity) ? "" : " documents-report-item--needs-review";

  return `
    <article class="documents-report-item${invalidClass}" data-report-entity-type="${escapeHtml(item.entityType)}">
      <div class="documents-report-item__line documents-report-item__line--title">
        <span class="documents-report-item__number">#${escapeHtml(String(item.number || ""))}</span>
        <span class="documents-report-item__state">${escapeHtml(String(item.stateLabel || ""))}</span>
        <span class="documents-report-item__title">${escapeHtml(String(item.title || "Sans titre"))}</span>
      </div>
      <div class="documents-report-item__line documents-report-item__line--description">
        ${escapeHtml(getEntitySummary(entity))}
      </div>
      <div class="documents-report-item__line documents-report-item__line--references">
        ${escapeHtml(getEntityReferenceLine(entity))}
      </div>
    </article>
  `;
}

function renderReportPreviewView() {
  const previewItems = buildReportPreviewItems();
  const reportTitle = getReportTitle();
  const projectName = String(store.projectForm?.projectName || "Projet");
  const breadcrumb = `${projectName} / Documents / ${reportTitle}`;
  const authorName = getReportAuthorName();

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll project-simple-scroll--documents" id="projectDocumentsScroll">
        <div class="documents-shell documents-shell--report" id="projectDocumentScroll">
          ${renderDocumentsToolbar()}
          ${renderDocumentsActivityBanner()}

          <div class="documents-report">
            <div class="documents-report__path">${escapeHtml(breadcrumb)}</div>

            <header class="documents-report__hero">
              <div class="documents-report__hero-brand">
                <div class="documents-report__logo-wrap">${getSocotecLogoSvg()}</div>
                <div class="documents-report__hero-copy">
                  <h1 class="documents-report__title">${escapeHtml(reportTitle)}</h1>
                  <div class="documents-report__meta">Intervenant : ${escapeHtml(authorName)}</div>
                  <div class="documents-report__meta">Date du rapport : ${escapeHtml(formatReportDate())}</div>
                </div>
              </div>
            </header>

            <section class="documents-report-table">
              <header class="documents-report-table__header">
                <div class="documents-report-table__author">${escapeHtml(authorName)}</div>
                <div class="documents-report-table__actions">
                  <button type="button" class="gh-btn gh-btn--validate" disabled>Valider</button>
                  <button type="button" class="gh-btn" disabled>Modifier</button>
                  <button type="button" class="gh-btn" disabled>Diffuser</button>
                </div>
              </header>

              <div class="documents-report-table__body">
                ${previewItems.length
                  ? previewItems.map(renderReportPreviewItem).join("")
                  : `<div class="documents-report__empty">Aucun élément nouveau ou modifié à inclure dans ce rapport.</div>`}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderDocumentsListView() {
  const bodyHtml = `
    ${DOCUMENT_FOLDERS.map((folder) => `
      <div class="documents-repo__row">
        <div class="documents-repo__cell documents-repo__cell--name">
          <span class="documents-repo__icon">${getFolderIconSvg()}</span>
          <span class="documents-repo__name">${escapeHtml(folder.name)}</span>
        </div>
        <div class="documents-repo__cell documents-repo__cell--message">
          ${escapeHtml(folder.note)}
        </div>
        <div class="documents-repo__cell documents-repo__cell--date">—</div>
        <div class="documents-repo__cell documents-repo__cell--stats">—</div>
      </div>
    `).join("")}
    ${getProjectDocuments().map(renderRepoDocumentRow).join("")}
  `;

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll project-simple-scroll--documents" id="projectDocumentsScroll">
        <div class="documents-shell" id="projectDocumentScroll">
          ${renderDocumentsToolbar()}
          ${renderDocumentsActivityBanner()}

          ${renderDataTableShell({
            className: "documents-repo",
            gridTemplate: getDocumentsTableGridTemplate(),
            headHtml: renderDocumentsTableHeadHtml(),
            bodyHtml
          })}
        </div>
      </div>
    </section>
  `;
}

function renderUploadProgress() {
  if (!docsViewState.file) return "";

  if (docsViewState.isUploading) {
    return `
      <div class="documents-upload-progress">
        <div class="documents-upload-progress__file">
          <span class="documents-upload-progress__icon">${getLargeDocumentIconSvg()}</span>
          <span class="documents-upload-progress__name">${escapeHtml(docsViewState.file.name)}</span>
        </div>
        <div class="documents-upload-progress__meta">
          Chargement du fichier... ${docsViewState.uploadProgress}%
        </div>
        <div class="documents-upload-progress__bar">
          <div class="documents-upload-progress__bar-fill" style="width:${docsViewState.uploadProgress}%"></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="documents-uploaded-file">
      <div class="documents-uploaded-file__left">
        <span class="documents-uploaded-file__icon">${getLargeDocumentIconSvg()}</span>
        <span class="documents-uploaded-file__name">${escapeHtml(docsViewState.file.name)}</span>
      </div>
      <button
        type="button"
        class="documents-uploaded-file__remove"
        id="documentsRemoveFileBtn"
        aria-label="Retirer le fichier"
        title="Retirer le fichier"
      >
        ${getRemoveIconSvg()}
      </button>
    </div>
  `;
}

function canSubmitUpload() {
  if (!docsViewState.file || docsViewState.isUploading) return false;
  if (docsViewState.depositMode === "proposal") {
    return docsViewState.proposalName.trim().length > 0;
  }
  return true;
}

function renderProposalField() {
  if (docsViewState.depositMode !== "proposal") return "";

  return `
    <div class="documents-form-field documents-form-field--proposal">
      <label for="documentsProposalNameInput">Nom de la modification</label>
      ${renderGhInput({
        id: "documentsProposalNameInput",
        value: docsViewState.proposalName,
        placeholder: "Ex. Ajustement du visa sur note parasismique V03",
        icon: getProposalIconSvg(),
        className: "documents-gh-input"
      })}
    </div>
  `;
}

function renderUploadView() {
  const isBusy = docsViewState.isUploading ? "is-busy" : "";
  const isDisabled = docsViewState.isUploading ? "disabled" : "";
  const submitLabel = docsViewState.depositMode === "proposal"
    ? "Proposer la modification"
    : "Valider";

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll project-simple-scroll--documents" id="projectDocumentsScroll">
        ${renderDocumentsActivityBanner()}
        <div class="documents-shell documents-shell--upload" id="projectDocumentScroll">
          <div class="documents-upload-layout">
            <section class="documents-dropzone ${isBusy}" id="documentsDropzone">
              <input id="documentsFileInput" type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip,image/*">
              <div class="documents-dropzone__inner">
                <div class="documents-dropzone__icon">
                  ${getLargeDocumentIconSvg()}
                </div>
                <h3>Glissez vos fichiers ici pour les ajouter au projet</h3>
                <p>
                  Ou
                  <button type="button" class="documents-dropzone__link" id="documentsChooseBtn" ${isDisabled}>choisissez votre fichier</button>
                </p>
              </div>
            </section>

            ${renderUploadProgress()}

            <div class="documents-commit-shell">
              <div class="documents-commit-shell__avatar">
                <img
                  src="assets/images/260093543.png"
                  alt="Avatar"
                  class="documents-commit-shell__avatar-img"
                >
              </div>

              <section class="documents-commit-card">
                <div class="documents-commit-card__title">Déposer le document</div>

                <div class="documents-form-field">
                  ${renderGhInput({
                    id: "documentsTitleInput",
                    value: docsViewState.title,
                    placeholder: "Ex. Note d'hypothèses parasismiques - version 03",
                    icon: getDocumentIconSvg()
                  })}
                </div>

                <div class="documents-form-field">
                  <textarea
                    id="documentsDescriptionInput"
                    class="gh-input gh-textarea"
                    placeholder="Décrivez brièvement le contenu, le contexte ou les points d'attention."
                  >${escapeHtml(docsViewState.description)}</textarea>
                </div>

                <div class="documents-radio-group">
                  <label class="documents-radio-option">
                    <input type="radio" name="documentsDepositMode" value="direct" ${docsViewState.depositMode === "direct" ? "checked" : ""}>
                    <span class="documents-radio-option__icon">${getCommitIconSvg()}</span>
                    <span class="documents-radio-option__text">
                      Déposer directement les documents
                    </span>
                  </label>

                  <label class="documents-radio-option">
                    <input type="radio" name="documentsDepositMode" value="proposal" ${docsViewState.depositMode === "proposal" ? "checked" : ""}>
                    <span class="documents-radio-option__icon">${getProposalIconSvg()}</span>
                    <span class="documents-radio-option__text">
                      Créer une proposition avec demande de visa
                    </span>
                  </label>
                </div>

                ${renderProposalField()}
              </section>

              <section class="documents-commit-card documents-commit-card-actions">
                <div class="documents-commit-card__actions">
                  <button type="button" class="gh-btn gh-btn--validate" id="documentsSubmitBtn" ${canSubmitUpload() ? "" : "disabled"}>${submitLabel}</button>
                  <button type="button" class="gh-btn" id="documentsCancelBtn">Annuler</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function stopUploadSimulation() {
  if (docsViewState.uploadTimer) {
    clearInterval(docsViewState.uploadTimer);
    docsViewState.uploadTimer = null;
  }
}

function resetUploadState() {
  stopUploadSimulation();
  docsViewState.file = null;
  docsViewState.isUploading = false;
  docsViewState.uploadProgress = 0;
  docsViewState.title = "";
  docsViewState.description = "";
  docsViewState.depositMode = "direct";
  docsViewState.proposalName = "";

  const fileInput = document.getElementById("documentsFileInput");
  if (fileInput) {
    fileInput.value = "";
  }
}

function simulateUpload(root, file) {
  stopUploadSimulation();
  docsViewState.file = file;
  docsViewState.isUploading = true;
  docsViewState.uploadProgress = 0;
  renderProjectDocuments(root);

  docsViewState.uploadTimer = setInterval(() => {
    const increment = docsViewState.uploadProgress < 70 ? 9 : 4;
    docsViewState.uploadProgress = Math.min(100, docsViewState.uploadProgress + increment);

    if (docsViewState.uploadProgress >= 100) {
      stopUploadSimulation();
      docsViewState.isUploading = false;
      docsViewState.uploadProgress = 100;
    }

    renderProjectDocuments(root);
  }, 120);
}

function closeUploadView(root) {
  resetUploadState();
  docsViewState.mode = "list";
  renderProjectDocuments(root);
}

function closeReportPreview(root) {
  docsViewState.mode = "list";
  renderProjectDocuments(root);
}

function openReportPreview(root) {
  docsViewState.mode = "report-preview";
  renderProjectDocuments(root);
}

function renderFromSelectedFile(root, file) {
  if (!file) return;
  if (!docsViewState.title) {
    docsViewState.title = file.name.replace(/\.[^.]+$/, "");
  }
  simulateUpload(root, file);
}

function buildRepoDocumentFromState() {
  const title = docsViewState.title.trim();
  const description = docsViewState.description.trim();
  const baseNote = title || description || "Document prêt pour l'analyse";
  const enabledPhases = getEnabledProjectPhasesCatalog();
  const currentPhase = enabledPhases.find((item) => item.code === docsViewState.selectedPhase) || null;

  return {
    name: docsViewState.file?.name || "Document",
    title: title || docsViewState.file?.name || "Document",
    note: baseNote,
    updatedAt: "À l'instant",
    phaseCode: currentPhase?.code || docsViewState.selectedPhase || "APS",
    phaseLabel: currentPhase?.label || "",
    fileName: docsViewState.file?.name || "Document"
  };
}

function triggerAutoAnalysisAfterDirectUpload(root, document = null) {
  const documentName = document?.name || "";
  if (!shouldAutoRunAnalysisAfterUpload()) {
    setDocumentsActivity({
      tone: "info",
      title: "Document déposé",
      message: "Le dépôt a été enregistré. L’analyse automatique n’est pas activée pour ce projet."
    });
    return;
  }

  if (isAnalysisRunning()) {
    const currentRun = getCurrentAnalysisRunMeta();
    setDocumentsActivity({
      tone: "warning",
      title: "Document déposé",
      message: `Le dépôt a été enregistré, mais l’analyse automatique n’a pas été relancée car un traitement est déjà en cours${currentRun.runId ? ` (${currentRun.runId})` : ""}.`
    });
    return;
  }

  setDocumentsActivity({
    tone: "success",
    title: "Document déposé",
    message: "Le dépôt a été enregistré et l’analyse parasismique automatique a été lancée."
  });

  runAnalysis({
    triggerType: "document-upload",
    triggerLabel: "Dépôt de document",
    documentName,
    documentIds: document?.id ? [document.id] : [],
    summary: "Analyse déclenchée automatiquement après dépôt réussi d’un document."
  });

  renderProjectDocuments(root);
}

function commitDirectDocument(root) {
  if (!docsViewState.file) return;

  const documentFile = docsViewState.file;
  const repoDocument = addProjectDocument(buildRepoDocumentFromState());

  store.projectForm.pdfFile = documentFile;

  closeUploadView(root);
  triggerAutoAnalysisAfterDirectUpload(root, repoDocument);
}

function commitProposal(root) {
  if (!docsViewState.file) return;

  const fileName = docsViewState.file.name;
  const proposalTitle = docsViewState.proposalName.trim();
  const description = docsViewState.description.trim();

  createProjectProposal({
    title: proposalTitle,
    fileName,
    description,
    status: "open",
    needsVisa: true,
    updatedAt: "À l'instant"
  });

  closeUploadView(root);

  setDocumentsActivity({
    tone: "success",
    title: "Proposition enregistrée",
    message: `La proposition "${proposalTitle}" a été créée avec demande de visa. Elle est désormais visible dans l’onglet Propositions.`
  });

  renderProjectDocuments(root);
}

function handleSubmit(root) {
  if (!canSubmitUpload()) return;
  if (docsViewState.depositMode === "proposal") {
    commitProposal(root);
    return;
  }
  commitDirectDocument(root);
}

function bindDocumentsSplitActions(root) {
  bindGhActionButtons();

  bindGhSelectMenus(document, {
    onChange: (id, value) => {
      if (id !== "documentsPhase") return;
      docsViewState.selectedPhase = String(value || docsViewState.selectedPhase);
      renderProjectDocuments(root);
    }
  });

  const addSplit = document.querySelector('[data-action-id="documentsAddSplit"]');
  if (addSplit) {
    initGhActionButton(addSplit, { mainAction: "add-documents" });
    addSplit.addEventListener("ghaction:action", (event) => {
      const action = event.detail?.action || "";
      if (action === "add-documents") {
        docsViewState.mode = "upload";
        renderProjectDocuments(root);
      }
      if (action === "add-folder") {
        // placeholder métier
      }
      if (action === "create-report") {
        openReportPreview(root);
      }
    });
  }

  const documentsSplit = document.querySelector('[data-action-id="documentsActionsSplit"]');
  if (documentsSplit) {
    initGhActionButton(documentsSplit, { mainAction: "download-zip" });
    documentsSplit.addEventListener("ghaction:action", (event) => {
      const action = event.detail?.action || "";
      if (action === "download-zip") {
        // placeholder métier
      }
    });
  }
}

function bindDocumentsView(root) {
  const scrollEl = document.getElementById("projectDocumentsScroll");
  registerProjectPrimaryScrollSource(scrollEl);

  bindDocumentsSplitActions(root);

    const activityCloseBtn = document.getElementById("documentsActivityCloseBtn");
  if (activityCloseBtn) {
    activityCloseBtn.addEventListener("click", () => {
      clearDocumentsActivity();
      renderProjectDocuments(root);
    });
  }

  const submitBtn = document.getElementById("documentsSubmitBtn");
  const syncSubmitState = () => {
    if (!submitBtn) return;
    submitBtn.disabled = !canSubmitUpload();
  };

  syncSubmitState();

  const handleAnalysisStateChanged = () => {
    if (docsViewState.mode !== "list") return;
    renderProjectDocuments(root);
  };

  document.removeEventListener("analysisStateChanged", handleAnalysisStateChanged);
  document.addEventListener("analysisStateChanged", handleAnalysisStateChanged, { once: true });

  const cancelBtn = document.getElementById("documentsCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeUploadView(root);
    });
  }

  const reportBackBtn = document.getElementById("documentsReportBackBtn");
  if (reportBackBtn) {
    reportBackBtn.addEventListener("click", () => {
      closeReportPreview(root);
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      if (!canSubmitUpload()) return;
      submitBtn.disabled = true;
      handleSubmit(root);
    });
  }

  const chooseBtn = document.getElementById("documentsChooseBtn");
  const fileInput = document.getElementById("documentsFileInput");
  const dropzone = document.getElementById("documentsDropzone");

  if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => {
      if (docsViewState.isUploading) return;
      fileInput.value = "";
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0] || null;
      renderFromSelectedFile(root, file);
    });
  }

  if (dropzone && fileInput) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        if (!docsViewState.isUploading) {
          dropzone.classList.add("is-dragover");
        }
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", (event) => {
      if (docsViewState.isUploading) return;
      const file = event.dataTransfer?.files?.[0] || null;
      renderFromSelectedFile(root, file);
    });
  }

  const removeFileBtn = document.getElementById("documentsRemoveFileBtn");
  if (removeFileBtn) {
    removeFileBtn.addEventListener("click", () => {
      stopUploadSimulation();
      docsViewState.file = null;
      docsViewState.isUploading = false;
      docsViewState.uploadProgress = 0;
      renderProjectDocuments(root);
    });
  }

  const titleInput = document.getElementById("documentsTitleInput");
  if (titleInput) {
    titleInput.addEventListener("input", (event) => {
      docsViewState.title = event.target.value;
    });
  }

  const descriptionInput = document.getElementById("documentsDescriptionInput");
  if (descriptionInput) {
    descriptionInput.addEventListener("input", (event) => {
      docsViewState.description = event.target.value;
    });
  }

  const proposalNameInput = document.getElementById("documentsProposalNameInput");
  if (proposalNameInput) {
    proposalNameInput.addEventListener("input", (event) => {
      docsViewState.proposalName = event.target.value;
      const submit = document.getElementById("documentsSubmitBtn");
      if (submit) submit.disabled = !canSubmitUpload();
    });
  }

  document.querySelectorAll('input[name="documentsDepositMode"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      docsViewState.depositMode = event.target.value;
      renderProjectDocuments(root);
    });
  });
}

export function renderProjectDocuments(root) {
  syncDocumentsSelectedPhase();
  
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Documents",
    variant: "documents"
  });

  root.innerHTML = docsViewState.mode === "upload"
    ? renderUploadView()
    : docsViewState.mode === "report-preview"
      ? renderReportPreviewView()
      : renderDocumentsListView();

  bindDocumentsView(root);
}
