import { store } from "../store.js";
import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";
import { renderStatusBadge } from "./ui/status-badges.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getRawDecisions() {
  return Array.isArray(store.situationsView?.rawResult?.decisions)
    ? store.situationsView.rawResult.decisions
    : [];
}

function getDecision(entityType, entityId) {
  const normalizedType = String(entityType || "").toLowerCase();
  const normalizedId = String(entityId || "");

  return getRawDecisions().find((entry) => {
    const type = String(entry?.entity_type || entry?.type || "").toLowerCase();
    const id = String(entry?.entity_id || entry?.problem_id || entry?.id || "");
    return type === normalizedType && id === normalizedId;
  }) || null;
}

export function getEffectiveSujetStatus(subjectId) {
  const decision = getDecision("sujet", subjectId);
  const normalizedDecision = String(decision?.decision || "").toUpperCase();

  if (normalizedDecision === "CLOSED") return "closed";
  if (normalizedDecision === "REOPENED") return "open";

  const allSituations = safeArray(store.situationsView?.data);
  for (const situation of allSituations) {
    const hit = findSubjectInTree(subjectId, safeArray(situation?.sujets));
    if (hit) return String(hit.status || "open").toLowerCase();
  }

  return "open";
}

export function getEffectiveSituationStatus(situationId) {
  const decision = getDecision("situation", situationId);
  const normalizedDecision = String(decision?.decision || "").toUpperCase();

  if (normalizedDecision === "CLOSED") return "closed";
  if (normalizedDecision === "REOPENED") return "open";

  const situation = safeArray(store.situationsView?.data)
    .find((item) => String(item?.id || "") === String(situationId || ""));

  return String(situation?.status || "open").toLowerCase();
}

function findSubjectInTree(subjectId, subjects = []) {
  const normalizedId = String(subjectId || "");

  for (const subject of subjects) {
    if (String(subject?.id || "") === normalizedId) return subject;
    const nested = findSubjectInTree(normalizedId, safeArray(subject?.children));
    if (nested) return nested;
  }

  return null;
}

function flattenSubjects(subjects = [], depth = 0, acc = []) {
  for (const subject of subjects) {
    acc.push({ subject, depth });
    flattenSubjects(safeArray(subject?.children), depth + 1, acc);
  }
  return acc;
}

function countBlocking(subjects = []) {
  return flattenSubjects(subjects).filter(({ subject }) => {
    const links = safeArray(subject?.raw?.links).concat([]);
    return links.some((link) => String(link?.type || "").toLowerCase() === "blocked_by");
  }).length;
}

function getPriorityLabel(priority) {
  const value = String(priority || "medium").toLowerCase();
  if (value === "critical") return "Critique";
  if (value === "high") return "Haute";
  if (value === "low") return "Basse";
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
  const normalized = String(priority || "medium").toLowerCase();
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

function renderSituationSummaryCard(situation) {
  const flattened = flattenSubjects(safeArray(situation?.sujets));
  const openSubjects = flattened.filter(({ subject }) => getEffectiveSujetStatus(subject?.id) === "open").length;
  const closedSubjects = Math.max(0, flattened.length - openSubjects);
  const criticalSubjects = flattened.filter(({ subject }) => String(subject?.priority || "").toLowerCase() === "critical").length;
  const blockedSubjects = countBlocking(safeArray(situation?.sujets));

  return `
    <article class="settings-card settings-card-less">
      <div class="settings-card__head">
        <div>
          <h4>${escapeHtml(String(situation?.title || situation?.id || "Situation"))}</h4>
          <p>${escapeHtml(String(situation?.description || "Regroupement opérationnel des sujets rattachés à cette situation."))}</p>
        </div>
        ${renderStatePill(getEffectiveSituationStatus(situation?.id))}
      </div>

      <div class="pilotage-metrics-grid">
        <div class="pilotage-metric-card">
          <div class="pilotage-metric-card__label">Sujets ouverts</div>
          <div class="pilotage-metric-card__value">${escapeHtml(String(openSubjects))}</div>
        </div>
        <div class="pilotage-metric-card">
          <div class="pilotage-metric-card__label">Sujets fermés</div>
          <div class="pilotage-metric-card__value">${escapeHtml(String(closedSubjects))}</div>
        </div>
        <div class="pilotage-metric-card">
          <div class="pilotage-metric-card__label">Sujets critiques</div>
          <div class="pilotage-metric-card__value">${escapeHtml(String(criticalSubjects))}</div>
        </div>
        <div class="pilotage-metric-card">
          <div class="pilotage-metric-card__label">Sujets bloqués</div>
          <div class="pilotage-metric-card__value">${escapeHtml(String(blockedSubjects))}</div>
        </div>
      </div>

      ${renderSituationSubjectsTable(situation)}
    </article>
  `;
}

function renderSituationSubjectsTable(situation) {
  const flattened = flattenSubjects(safeArray(situation?.sujets));

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
            </tr>
          </thead>
          <tbody>
            ${flattened.map(({ subject, depth }) => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;padding-left:${depth * 20}px;">
                    <span aria-hidden="true" class="color-fg-muted">${depth > 0 ? svgIcon("chevron-right", { width: 12, height: 12 }) : svgIcon("issue-opened", { width: 14, height: 14 })}</span>
                    <div>
                      <div class="link-like">${escapeHtml(String(subject?.title || subject?.id || "Sujet"))}</div>
                      ${subject?.description ? `<div class="color-fg-muted" style="margin-top:4px;">${escapeHtml(String(subject.description))}</div>` : ""}
                    </div>
                  </div>
                </td>
                <td>${renderPriorityPill(subject?.priority)}</td>
                <td>${renderStatePill(getEffectiveSujetStatus(subject?.id))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSituationsOverview() {
  const situations = safeArray(store.situationsView?.data);

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
                  <p>Chaque situation regroupe des sujets d’un même projet pour le suivi opérationnel. Les sous-sujets restent rendus comme une hiérarchie de sujets, sans couche intermédiaire “avis”.</p>
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

  registerProjectPrimaryScrollSource(document.getElementById("projectSituationsScroll"));
}
