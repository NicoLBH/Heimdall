import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSubjectTreeGrid } from "../shared/subject-tree-grid.js";

function normalizeIssueLifecycleStatus(status = "") {
  return String(status || "").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function renderIssueStateIcon(subject) {
  const isClosed = normalizeIssueLifecycleStatus(subject?.status) === "closed";
  return `<span class="issue-status-icon situation-grid__status-icon" aria-hidden="true">${
    isClosed
      ? svgIcon("check-circle", { style: "color: var(--fgColor-done)" })
      : svgIcon("issue-opened", { style: "color: var(--fgColor-open)" })
  }</span>`;
}

function normalizeId(value) {
  return String(value || "").trim();
}

function sortSubjectIds(subjectIds = [], subjectsById = {}) {
  return [...subjectIds].sort((leftId, rightId) => {
    const left = subjectsById[leftId] || {};
    const right = subjectsById[rightId] || {};

    const leftOrder = Number(left?.parent_child_order ?? left?.raw?.parent_child_order);
    const rightOrder = Number(right?.parent_child_order ?? right?.raw?.parent_child_order);
    const leftHasOrder = Number.isFinite(leftOrder) && leftOrder > 0;
    const rightHasOrder = Number.isFinite(rightOrder) && rightOrder > 0;

    if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;

    const leftTs = Date.parse(String(left?.created_at || left?.raw?.created_at || "")) || 0;
    const rightTs = Date.parse(String(right?.created_at || right?.raw?.created_at || "")) || 0;
    if (leftTs !== rightTs) return leftTs - rightTs;

    return String(left?.title || leftId).localeCompare(String(right?.title || rightId), "fr");
  });
}

function resolveSituationTreeData(situationSubjects = [], rawSubjectsResult = {}) {
  const selectedSubjectIds = new Set(
    (Array.isArray(situationSubjects) ? situationSubjects : [])
      .map((subject) => normalizeId(subject?.id))
      .filter(Boolean)
  );

  const rawSubjectsById = rawSubjectsResult?.subjectsById && typeof rawSubjectsResult.subjectsById === "object"
    ? rawSubjectsResult.subjectsById
    : {};
  const rawChildrenBySubjectId = rawSubjectsResult?.childrenBySubjectId && typeof rawSubjectsResult.childrenBySubjectId === "object"
    ? rawSubjectsResult.childrenBySubjectId
    : {};
  const rawParentBySubjectId = rawSubjectsResult?.parentBySubjectId && typeof rawSubjectsResult.parentBySubjectId === "object"
    ? rawSubjectsResult.parentBySubjectId
    : {};

  const subjectsById = {};
  selectedSubjectIds.forEach((subjectId) => {
    const selectedSubject = (situationSubjects || []).find((subject) => normalizeId(subject?.id) === subjectId);
    subjectsById[subjectId] = rawSubjectsById[subjectId] || selectedSubject || null;
  });

  const childrenBySubjectId = {};
  selectedSubjectIds.forEach((subjectId) => {
    const childIds = Array.isArray(rawChildrenBySubjectId?.[subjectId])
      ? rawChildrenBySubjectId[subjectId]
      : [];
    childrenBySubjectId[subjectId] = sortSubjectIds(
      childIds
        .map((childId) => normalizeId(childId))
        .filter((childId) => selectedSubjectIds.has(childId)),
      subjectsById
    );
  });

  const rootSubjectIds = sortSubjectIds(
    [...selectedSubjectIds].filter((subjectId) => {
      const subject = subjectsById?.[subjectId] || {};
      const parentFromRaw = normalizeId(rawParentBySubjectId?.[subjectId]);
      const parentFromSubject = normalizeId(subject?.parent_subject_id || subject?.raw?.parent_subject_id);
      const parentId = parentFromRaw || parentFromSubject;
      return !parentId || !selectedSubjectIds.has(parentId);
    }),
    subjectsById
  );

  return {
    selectedSubjectIds,
    subjectsById,
    childrenBySubjectId,
    rootSubjectIds
  };
}

function getExpandedSubjectIdsSet({ store, situationId, rootSubjectIds = [], fallbackExpandedIds = [] }) {
  const bySituation = store?.situationsView?.gridExpandedSubjectIdsBySituationId;
  const stored = bySituation && typeof bySituation === "object" ? bySituation[situationId] : null;

  if (stored instanceof Set) return stored;
  if (Array.isArray(stored)) {
    return new Set(stored.map((value) => normalizeId(value)).filter(Boolean));
  }

  const seed = Array.isArray(fallbackExpandedIds) && fallbackExpandedIds.length
    ? fallbackExpandedIds
    : rootSubjectIds;
  return new Set(seed.map((value) => normalizeId(value)).filter(Boolean));
}

function getSubjectDisplayIdentifier(subject = {}) {
  const orderNumber = Number(subject?.subject_number ?? subject?.subjectNumber ?? subject?.raw?.subject_number ?? subject?.raw?.subjectNumber);
  if (Number.isFinite(orderNumber) && orderNumber > 0) return `#${Math.floor(orderNumber)}`;
  const subjectId = normalizeId(subject?.id);
  return subjectId ? `#${subjectId}` : "";
}

export function renderSituationGridView(situation, subjects = [], options = {}) {
  const title = String(situation?.title || "Situation");
  const normalizedSituationId = normalizeId(situation?.id);
  if (!normalizedSituationId) {
    return `
      <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
        <div class="settings-empty-state">Sélectionne une situation pour afficher la grille.</div>
      </section>
    `;
  }

  if (!Array.isArray(subjects) || !subjects.length) {
    return `
      <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
        <div class="settings-empty-state">Aucun sujet n’est actuellement rattaché à <strong>${escapeHtml(title)}</strong>.</div>
      </section>
    `;
  }

  const rawSubjectsResult = options?.store?.projectSubjectsView?.rawSubjectsResult && typeof options.store.projectSubjectsView.rawSubjectsResult === "object"
    ? options.store.projectSubjectsView.rawSubjectsResult
    : {};
  const {
    selectedSubjectIds,
    subjectsById,
    childrenBySubjectId,
    rootSubjectIds
  } = resolveSituationTreeData(subjects, rawSubjectsResult);

  if (!selectedSubjectIds.size || !rootSubjectIds.length) {
    return `
      <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
        <div class="settings-empty-state">Aucun sujet exploitable n’a été trouvé pour cette situation.</div>
      </section>
    `;
  }

  const expandedSubjectIds = getExpandedSubjectIdsSet({
    store: options?.store,
    situationId: normalizedSituationId,
    rootSubjectIds,
    fallbackExpandedIds: [...selectedSubjectIds]
  });

  const rowsHtml = renderSubjectTreeGrid({
    subjectsById,
    childrenBySubjectId,
    rootSubjectIds,
    expandedSubjectIds,
    dndMode: "none",
    rowClassName: "situation-grid__row project-situation-grid__row",
    escapeHtml,
    context: {
      situationId: normalizedSituationId
    },
    renderTitleCell: ({ subject, subjectId, depth, hasChildren, isExpanded }) => {
      const indentWidth = Math.max(0, depth) * 20;
      const identifier = getSubjectDisplayIdentifier(subject);
      const subjectTitle = String(subject?.title || subjectId || "Sujet");
      return `
        <div class="situation-grid__cell situation-grid__cell--title project-situation-grid__cell project-situation-grid__cell--title">
          <div class="situation-grid__title-content" style="--situation-grid-indent:${indentWidth}px;">
            <span class="situation-grid__indent" aria-hidden="true"></span>
            ${hasChildren
              ? `<button
                  type="button"
                  class="situation-grid__toggle"
                  data-situation-grid-toggle="${escapeHtml(subjectId)}"
                  data-situation-grid-situation-id="${escapeHtml(normalizedSituationId)}"
                  aria-expanded="${isExpanded ? "true" : "false"}"
                  aria-label="${isExpanded ? "Replier" : "Déplier"} ${escapeHtml(subjectTitle)}"
                >
                  ${svgIcon(isExpanded ? "chevron-down" : "chevron-right", { className: isExpanded ? "octicon octicon-chevron-down" : "octicon octicon-chevron-right" })}
                </button>`
              : `<span class="situation-grid__toggle situation-grid__toggle--placeholder" aria-hidden="true"></span>`}
            ${renderIssueStateIcon(subject)}
            <button type="button" class="situation-grid__subject-title" data-open-situation-subject="${escapeHtml(subjectId)}">${escapeHtml(subjectTitle)}</button>
            <span class="situation-grid__subject-id mono">${escapeHtml(identifier)}</span>
          </div>
        </div>
      `;
    },
    renderExtraCells: () => ""
  });

  return `
    <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
      <section class="project-situation-grid situation-grid" data-situation-grid="${escapeHtml(normalizedSituationId)}">
        <div class="project-situation-grid__scroll situation-grid__scroll">
          <header class="project-situation-grid__header situation-grid__header" role="row">
            <div class="project-situation-grid__head-cell situation-grid__head-cell situation-grid__head-cell--title" role="columnheader">Titre</div>
          </header>
          <div class="project-situation-grid__body situation-grid__body" role="rowgroup">
            ${rowsHtml}
          </div>
        </div>
      </section>
    </section>
  `;
}

export function __situationGridTestUtils() {
  return {
    resolveSituationTreeData
  };
}
