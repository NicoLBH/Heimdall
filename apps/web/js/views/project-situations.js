import { store } from "../store.js";
import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";
import { renderStatusBadge } from "./ui/status-badges.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { renderProjectSituationsRunbar, bindProjectSituationsRunbar } from "./project-situations-runbar.js";
import { loadFlatSubjectsForCurrentProject } from "../services/project-subjects-supabase.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function getRawResult() {
  const projectRaw = store.projectSubjectsView?.rawSubjectsResult;
  if (projectRaw && typeof projectRaw === "object") return projectRaw;
  const legacyRaw = store.situationsView?.rawResult;
  if (legacyRaw && typeof legacyRaw === "object") return legacyRaw;
  return {};
}

function getDecision(entityType, entityId) {
  const normalizedType = String(entityType || "").toLowerCase();
  const normalizedId = String(entityId || "");
  const rawDecisions = safeArray(getRawResult().decisions);

  return rawDecisions.find((entry) => {
    const type = String(entry?.entity_type || entry?.type || "").toLowerCase();
    const id = String(entry?.entity_id || entry?.problem_id || entry?.id || "");
    return type === normalizedType && id === normalizedId;
  }) || null;
}

function getSubjectsByIdMap() {
  const raw = getRawResult();
  if (raw.subjectsById && typeof raw.subjectsById === "object") return raw.subjectsById;

  const fallback = {};
  for (const subject of safeArray(store.projectSubjectsView?.subjectsData)) {
    const id = String(subject?.id || "");
    if (!id) continue;
    fallback[id] = subject;
  }
  return fallback;
}

function getParentBySubjectIdMap() {
  const raw = getRawResult();
  if (raw.parentBySubjectId && typeof raw.parentBySubjectId === "object") return raw.parentBySubjectId;
  return {};
}

function getChildrenBySubjectIdMap() {
  const raw = getRawResult();
  if (raw.childrenBySubjectId && typeof raw.childrenBySubjectId === "object") return raw.childrenBySubjectId;
  return {};
}

function getLinksBySubjectIdMap() {
  const raw = getRawResult();
  if (raw.linksBySubjectId && typeof raw.linksBySubjectId === "object") return raw.linksBySubjectId;
  return {};
}

function getSituationsByIdMap() {
  const raw = getRawResult();
  if (raw.situationsById && typeof raw.situationsById === "object") return raw.situationsById;
  if (raw.relationOptionsById && typeof raw.relationOptionsById === "object") return raw.relationOptionsById;

  const fallback = {};
  for (const situation of safeArray(store.situationsView?.data)) {
    const id = String(situation?.id || "");
    if (!id) continue;
    fallback[id] = situation;
  }
  return fallback;
}

function getSubjectIdsBySituationIdMap() {
  const raw = getRawResult();
  if (raw.subjectIdsBySituationId && typeof raw.subjectIdsBySituationId === "object") return raw.subjectIdsBySituationId;

  const relationIdsBySubjectId = raw.relationIdsBySubjectId && typeof raw.relationIdsBySubjectId === "object"
    ? raw.relationIdsBySubjectId
    : {};

  const subjectIdsBySituationId = {};

  for (const [subjectId, relationIds] of Object.entries(relationIdsBySubjectId)) {
    for (const relationId of safeArray(relationIds)) {
      const normalizedRelationId = String(relationId || "");
      if (!normalizedRelationId) continue;
      if (!Array.isArray(subjectIdsBySituationId[normalizedRelationId])) subjectIdsBySituationId[normalizedRelationId] = [];
      subjectIdsBySituationId[normalizedRelationId].push(String(subjectId || ""));
    }
  }

  return subjectIdsBySituationId;
}

function getSubjectMetaMap() {
  const bucket = store.projectSubjectsView?.bucket;
  const projectMeta = bucket?.subjectMeta?.sujet;
  if (projectMeta && typeof projectMeta === "object") return projectMeta;

  const legacyBucket = store.situationsView?.bucket;
  const legacyMeta = legacyBucket?.subjectMeta?.sujet;
  if (legacyMeta && typeof legacyMeta === "object") return legacyMeta;

  return {};
}

function getObjectivesByIdMap() {
  const raw = getRawResult();
  if (raw.objectivesById && typeof raw.objectivesById === "object") return raw.objectivesById;
  return {};
}

function normalizePriority(priority) {
  const normalized = String(priority || "medium").trim().toLowerCase();
  if (["critical", "high", "medium", "low"].includes(normalized)) return normalized;
  return "medium";
}

function getPriorityLabel(priority) {
  const normalized = normalizePriority(priority);
  if (normalized === "critical") return "Critique";
  if (normalized === "high") return "Haute";
  if (normalized === "low") return "Basse";
  return "Moyenne";
}

function renderStatePill(status) {
  const normalized = String(status || "open").toLowerCase();
  return renderStatusBadge({
    label: normalized === "open" ? "Ouvert" : "Fermé",
    tone: normalized === "open" ? "success" : "muted"
  });
}

function renderPriorityPill(priority) {
  const normalized = normalizePriority(priority);
  const tone = normalized === "critical"
    ? "danger"
    : normalized === "high"
      ? "attention"
      : normalized === "low"
        ? "accent"
        : "default";

  return renderStatusBadge({
    label: getPriorityLabel(normalized),
    tone
  });
}

function renderBlockingPill(subjectId) {
  const blockedByCount = getBlockedBySubjects(subjectId).length;
  return renderStatusBadge({
    label: blockedByCount ? `Bloqué (${blockedByCount})` : "Non bloqué",
    tone: blockedByCount ? "attention" : "success"
  });
}

function getSubjectById(subjectId) {
  return getSubjectsByIdMap()[String(subjectId || "")] || null;
}

function getParentSubject(subjectId) {
  const parentId = getParentBySubjectIdMap()[String(subjectId || "")];
  return parentId ? getSubjectById(parentId) : null;
}

function getChildSubjects(subjectId) {
  return safeArray(getChildrenBySubjectIdMap()[String(subjectId || "")])
    .map((id) => getSubjectById(id))
    .filter(Boolean);
}

function getOutgoingSubjectLinks(subjectId) {
  return safeArray(getLinksBySubjectIdMap()[String(subjectId || "")])
    .filter((link) => String(link?.source_subject_id || "") === String(subjectId || ""));
}

function getIncomingSubjectLinks(subjectId) {
  return safeArray(getLinksBySubjectIdMap()[String(subjectId || "")])
    .filter((link) => String(link?.target_subject_id || "") === String(subjectId || ""));
}

function getBlockedBySubjects(subjectId) {
  return getOutgoingSubjectLinks(subjectId)
    .filter((link) => String(link?.link_type || "").toLowerCase() === "blocked_by")
    .map((link) => getSubjectById(link.target_subject_id))
    .filter(Boolean);
}

function getBlockingSubjects(subjectId) {
  return getIncomingSubjectLinks(subjectId)
    .filter((link) => String(link?.link_type || "").toLowerCase() === "blocked_by")
    .map((link) => getSubjectById(link.source_subject_id))
    .filter(Boolean);
}

export function getEffectiveSujetStatus(subjectId) {
  const decision = getDecision("sujet", subjectId) || getDecision("subject", subjectId);
  const normalizedDecision = String(decision?.decision || "").toUpperCase();

  if (normalizedDecision === "CLOSED") return "closed";
  if (normalizedDecision === "REOPENED") return "open";

  const subject = getSubjectById(subjectId);
  return String(subject?.status || "open").toLowerCase() === "closed" ? "closed" : "open";
}

export function getEffectiveSituationStatus(situationId) {
  const decision = getDecision("situation", situationId);
  const normalizedDecision = String(decision?.decision || "").toUpperCase();

  if (normalizedDecision === "CLOSED") return "closed";
  if (normalizedDecision === "REOPENED") return "open";

  const situation = getSituationsByIdMap()[String(situationId || "")];
  return String(situation?.status || "open").toLowerCase() === "closed" ? "closed" : "open";
}

function normalizeObjectiveIds(rawValue) {
  return [...new Set(safeArray(rawValue).map((value) => String(value || "")).filter(Boolean))];
}

function getSubjectObjectiveIds(subjectId) {
  const meta = getSubjectMetaMap()[String(subjectId || "")];
  return normalizeObjectiveIds(meta?.objectiveIds);
}

function getSubjectObjectiveLabels(subjectId) {
  const objectivesById = getObjectivesByIdMap();
  return getSubjectObjectiveIds(subjectId)
    .map((objectiveId) => objectivesById[objectiveId])
    .filter(Boolean)
    .map((objective) => firstNonEmpty(objective?.title, objective?.name, objective?.id, "Objectif"));
}

function sortSubjects(subjects = []) {
  return [...subjects].sort((left, right) => {
    const leftTs = Date.parse(left?.created_at || left?.raw?.created_at || "") || 0;
    const rightTs = Date.parse(right?.created_at || right?.raw?.created_at || "") || 0;
    if (leftTs !== rightTs) return leftTs - rightTs;
    return firstNonEmpty(left?.title, left?.id, "").localeCompare(firstNonEmpty(right?.title, right?.id, ""), "fr");
  });
}

function getSituations() {
  const situationsById = getSituationsByIdMap();
  const subjectIdsBySituationId = getSubjectIdsBySituationIdMap();

  const orderedIds = Object.keys(situationsById);
  for (const situationId of Object.keys(subjectIdsBySituationId)) {
    if (!orderedIds.includes(situationId)) orderedIds.push(situationId);
  }

  return orderedIds
    .map((situationId) => ({
      id: situationId,
      title: firstNonEmpty(situationsById[situationId]?.title, situationsById[situationId]?.label, situationId),
      description: firstNonEmpty(
        situationsById[situationId]?.description,
        situationsById[situationId]?.summary,
        "Regroupement opérationnel des sujets rattachés à cette situation."
      ),
      status: firstNonEmpty(situationsById[situationId]?.status, "open"),
      raw: situationsById[situationId] || null
    }))
    .sort((left, right) => left.title.localeCompare(right.title, "fr"));
}

function getRootSubjectsForSituation(situationId) {
  const subjectIds = safeArray(getSubjectIdsBySituationIdMap()[String(situationId || "")]).map((id) => String(id || "")).filter(Boolean);
  const subjectIdSet = new Set(subjectIds);

  const roots = subjectIds
    .map((id) => getSubjectById(id))
    .filter(Boolean)
    .filter((subject) => {
      const parent = getParentSubject(subject.id);
      return !parent || !subjectIdSet.has(String(parent.id || ""));
    });

  return sortSubjects(roots);
}

function flattenSituationSubjects(situationId, roots = getRootSubjectsForSituation(situationId), depth = 0, acc = []) {
  const subjectIdSet = new Set(safeArray(getSubjectIdsBySituationIdMap()[String(situationId || "")]).map((id) => String(id || "")).filter(Boolean));

  for (const subject of roots) {
    if (!subject) continue;
    acc.push({ subject, depth });
    const children = sortSubjects(getChildSubjects(subject.id).filter((child) => subjectIdSet.has(String(child?.id || ""))));
    flattenSituationSubjects(situationId, children, depth + 1, acc);
  }

  return acc;
}

function buildSituationMetrics(situationId) {
  const flattened = flattenSituationSubjects(situationId);
  const openSubjects = flattened.filter(({ subject }) => getEffectiveSujetStatus(subject?.id) === "open").length;
  const closedSubjects = Math.max(0, flattened.length - openSubjects);
  const criticalSubjects = flattened.filter(({ subject }) => normalizePriority(subject?.priority) === "critical").length;
  const blockedSubjects = flattened.filter(({ subject }) => getBlockedBySubjects(subject?.id).length > 0).length;
  const subjectsWithObjectives = flattened.filter(({ subject }) => getSubjectObjectiveIds(subject?.id).length > 0).length;

  return {
    totalSubjects: flattened.length,
    openSubjects,
    closedSubjects,
    criticalSubjects,
    blockedSubjects,
    subjectsWithObjectives
  };
}

function renderMetricCard(label, value) {
  return `
    <div class="pilotage-metric-card">
      <div class="pilotage-metric-card__label">${escapeHtml(label)}</div>
      <div class="pilotage-metric-card__value">${escapeHtml(String(value))}</div>
    </div>
  `;
}

function renderGroupingSummary(situationId) {
  const flattened = flattenSituationSubjects(situationId);
  const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
  const byStatus = { open: 0, closed: 0 };
  let blockedCount = 0;
  let objectivesCount = 0;

  for (const { subject } of flattened) {
    const priority = normalizePriority(subject?.priority);
    byPriority[priority] += 1;
    const status = getEffectiveSujetStatus(subject?.id) === "open" ? "open" : "closed";
    byStatus[status] += 1;
    if (getBlockedBySubjects(subject?.id).length > 0) blockedCount += 1;
    if (getSubjectObjectiveIds(subject?.id).length > 0) objectivesCount += 1;
  }

  return `
    <div class="subject-filters__chips" style="margin-top:16px;">
      ${renderStatusBadge({ label: `Priorité critique : ${byPriority.critical}`, tone: byPriority.critical ? "danger" : "muted" })}
      ${renderStatusBadge({ label: `Priorité haute : ${byPriority.high}`, tone: byPriority.high ? "attention" : "muted" })}
      ${renderStatusBadge({ label: `Ouverts : ${byStatus.open}`, tone: byStatus.open ? "success" : "muted" })}
      ${renderStatusBadge({ label: `Fermés : ${byStatus.closed}`, tone: byStatus.closed ? "default" : "muted" })}
      ${renderStatusBadge({ label: `Bloqués : ${blockedCount}`, tone: blockedCount ? "attention" : "muted" })}
      ${renderStatusBadge({ label: `Avec objectif : ${objectivesCount}`, tone: objectivesCount ? "accent" : "muted" })}
    </div>
  `;
}

function renderObjectivesCell(subjectId) {
  const objectiveLabels = getSubjectObjectiveLabels(subjectId);
  if (!objectiveLabels.length) {
    return `<span class="color-fg-muted">—</span>`;
  }

  return `
    <div class="subject-filters__chips">
      ${objectiveLabels.map((label) => renderStatusBadge({ label, tone: "accent" })).join("")}
    </div>
  `;
}

function renderSituationSubjectsTable(situationId) {
  const flattened = flattenSituationSubjects(situationId);

  if (!flattened.length) {
    return `
      <div class="data-table-shell__empty" style="margin-top:16px;">
        Aucun sujet rattaché à cette situation pour le moment.
      </div>
    `;
  }

  return `
    <div class="data-table-shell" style="margin-top:16px;">
      <div class="data-table-shell__table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Sujet</th>
              <th>Priorité</th>
              <th>Statut</th>
              <th>Blocage</th>
              <th>Objectifs</th>
            </tr>
          </thead>
          <tbody>
            ${flattened.map(({ subject, depth }) => `
              <tr>
                <td>
                  <div style="display:flex;align-items:flex-start;gap:8px;padding-left:${depth * 20}px;">
                    <span aria-hidden="true" class="color-fg-muted" style="margin-top:2px;">${depth > 0 ? svgIcon("chevron-right", { width: 12, height: 12 }) : svgIcon("issue-opened", { width: 14, height: 14 })}</span>
                    <div>
                      <div class="link-like">${escapeHtml(firstNonEmpty(subject?.title, subject?.id, "Sujet"))}</div>
                      ${subject?.description ? `<div class="color-fg-muted" style="margin-top:4px;">${escapeHtml(String(subject.description))}</div>` : ""}
                    </div>
                  </div>
                </td>
                <td>${renderPriorityPill(subject?.priority)}</td>
                <td>${renderStatePill(getEffectiveSujetStatus(subject?.id))}</td>
                <td>${renderBlockingPill(subject?.id)}</td>
                <td>${renderObjectivesCell(subject?.id)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSituationSummaryCard(situation) {
  const metrics = buildSituationMetrics(situation.id);

  return `
    <article class="settings-card settings-card-less">
      <div class="settings-card__head">
        <div>
          <h4>${escapeHtml(situation.title)}</h4>
          <p>${escapeHtml(situation.description)}</p>
        </div>
        ${renderStatePill(getEffectiveSituationStatus(situation.id))}
      </div>

      <div class="pilotage-metrics-grid">
        ${renderMetricCard("Sujets ouverts", metrics.openSubjects)}
        ${renderMetricCard("Sujets fermés", metrics.closedSubjects)}
        ${renderMetricCard("Sujets critiques", metrics.criticalSubjects)}
        ${renderMetricCard("Sujets bloqués", metrics.blockedSubjects)}
      </div>

      ${renderGroupingSummary(situation.id)}
      ${renderSituationSubjectsTable(situation.id)}
    </article>
  `;
}

function renderSituationsOverview() {
  const situations = getSituations();

  if (!situations.length) {
    return `
      <section class="settings-section">
        <div class="settings-card settings-card-less">
          <div class="settings-card__head">
            <div>
              <h4>Situations</h4>
              <p>Aucune situation n’est disponible pour ce projet.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  return situations.map((situation) => `
    <section class="settings-section">
      ${renderSituationSummaryCard(situation)}
    </section>
  `).join("");
}

function syncSituationsToolbar(root = document) {
  const toolbarHost = document.getElementById("situationsToolbarHost");
  if (!toolbarHost) return;
  toolbarHost.innerHTML = renderProjectSituationsRunbar();
  bindProjectSituationsRunbar(root || toolbarHost);
}

export function renderProjectSituations(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Situations",
    variant: "situations"
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectSituationsScroll">
        <div class="settings-content" style="max-width:1216px;margin:0 auto;padding:24px 32px 40px;">
          <section class="settings-section">
            <div class="settings-card settings-card-less">
              <div class="settings-card__head">
                <div>
                  <h4>Pilotage par situations</h4>
                  <p>Chaque situation regroupe des sujets d’un même projet pour le suivi opérationnel. Les sous-sujets restent rendus comme une hiérarchie de sujets, sans couche intermédiaire legacy.</p>
                </div>
                <span class="settings-badge mono">SITUATION VIEW</span>
              </div>
            </div>
          </section>

          ${renderSituationsOverview()}
        </div>
      </div>
    </section>
  `;

  syncSituationsToolbar(root);
  registerProjectPrimaryScrollSource(document.getElementById("projectSituationsScroll"));

  loadFlatSubjectsForCurrentProject({ force: false })
    .then(() => {
      if (!document.body.contains(root)) return;
      root.innerHTML = `
        <section class="project-simple-page project-simple-page--settings">
          <div class="project-simple-scroll" id="projectSituationsScroll">
            <div class="settings-content" style="max-width:1216px;margin:0 auto;padding:24px 32px 40px;">
              <section class="settings-section">
                <div class="settings-card settings-card-less">
                  <div class="settings-card__head">
                    <div>
                      <h4>Pilotage par situations</h4>
                      <p>Chaque situation regroupe des sujets d’un même projet pour le suivi opérationnel. Les sous-sujets restent rendus comme une hiérarchie de sujets, sans couche intermédiaire legacy.</p>
                    </div>
                    <span class="settings-badge mono">SITUATION VIEW</span>
                  </div>
                </div>
              </section>

              ${renderSituationsOverview()}
            </div>
          </div>
        </section>
      `;
      syncSituationsToolbar(root);
      registerProjectPrimaryScrollSource(document.getElementById("projectSituationsScroll"));
    })
    .catch(() => undefined);
}
