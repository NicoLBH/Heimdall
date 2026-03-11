import { store } from "../store.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function issueIcon(status = "open") {
  const isOpen = String(status || "open").toLowerCase() !== "closed";
  return isOpen
    ? `<svg color="var(--fgColor-open)" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`
    : `<svg color="var(--fgColor-done)" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>`;
}

function priorityBadge(priority = "P3") {
  const p = String(priority || "P3").toUpperCase();
  const cls = p === "P1" ? "badge badge--p1" : p === "P2" ? "badge badge--p2" : "badge badge--p3";
  return `<span class="${cls}">${escapeHtml(p)}</span>`;
}

function statePill(status = "open") {
  const isOpen = String(status || "open").toLowerCase() !== "closed";
  return `<span class="gh-state ${isOpen ? "gh-state--open" : "gh-state--closed"}">${isOpen ? "Open" : "Closed"}</span>`;
}

function buildRawIndex() {
  const raw = store.situationsView.rawResult || {};
  const situations = Array.isArray(raw.situations) ? raw.situations : [];
  const problems = Array.isArray(raw.problems) ? raw.problems : [];
  const avis = Array.isArray(raw.avis) ? raw.avis : [];

  const situationById = new Map(situations.map((s) => [String(s.situation_id || s.id), s]));
  const problemById = new Map(problems.map((p) => [String(p.problem_id || p.id), p]));
  const avisById = new Map(avis.map((a) => [String(a.avis_id || a.id), a]));
  const problemToSituation = new Map();
  const avisToProblem = new Map();
  const avisToSituation = new Map();

  for (const situation of situations) {
    for (const problemId of situation.problem_ids || []) {
      const pid = String(problemId);
      problemToSituation.set(pid, String(situation.situation_id || situation.id));
      const problem = problemById.get(pid);
      if (!problem) continue;
      for (const avisId of problem.avis_ids || []) {
        const aid = String(avisId);
        avisToProblem.set(aid, pid);
        avisToSituation.set(aid, String(situation.situation_id || situation.id));
      }
    }
  }

  return { raw, situations, problems, avis, situationById, problemById, avisById, problemToSituation, avisToProblem, avisToSituation };
}

function getNestedSituation(situationId) {
  return (store.situationsView.data || []).find((s) => s.id === situationId) || null;
}

function getNestedSujet(problemId) {
  for (const situation of store.situationsView.data || []) {
    const match = (situation.sujets || []).find((sujet) => sujet.id === problemId);
    if (match) return match;
  }
  return null;
}

function getNestedAvis(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      const match = (sujet.avis || []).find((avis) => avis.id === avisId);
      if (match) return match;
    }
  }
  return null;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function problemVerdictStats(problem) {
  const avis = problem?.avis || [];
  let d = 0;
  let s = 0;
  for (const item of avis) {
    const verdict = String(item.verdict || "").toUpperCase();
    if (["KO", "WARNING", "WARN", "D", "DEFAVORABLE"].includes(verdict)) d += 1;
    else s += 1;
  }
  const total = Math.max(avis.length, 1);
  const dPct = Math.round((d / total) * 100);
  const sPct = Math.round((s / total) * 100);
  return { d, s, dPct, sPct, total: avis.length };
}

function situationVerdictStats(situation) {
  let d = 0;
  let s = 0;
  let total = 0;
  for (const sujet of situation?.sujets || []) {
    const stats = problemVerdictStats(sujet);
    d += stats.d;
    s += stats.s;
    total += stats.total;
  }
  const safeTotal = Math.max(total, 1);
  return {
    d,
    s,
    total,
    dPct: Math.round((d / safeTotal) * 100),
    sPct: Math.round((s / safeTotal) * 100)
  };
}

function verdictBar(stats) {
  return `
    <div class="subissues-counts subissues-counts--verdicts">
      <div class="verdict-legend">
        <span><span class="dot dot--red"></span>${stats.d} D (${stats.dPct}%)</span>
        <span><span class="dot dot--yellow"></span>${stats.s} S (${stats.sPct}%)</span>
      </div>
      <div class="verdict-bar">
        <span class="verdict-bar__red" style="width:${stats.dPct}%"></span>
        <span class="verdict-bar__yellow" style="width:${stats.sPct}%"></span>
      </div>
    </div>
  `;
}







export function renderProjectSituations(root) {
  const data = store.situationsView.data || [];
  const firstSituationId = data[0]?.id || null;
  if (!store.situationsView.selectedSituationId && firstSituationId) {
    store.situationsView.selectedSituationId = firstSituationId;
  }
  if (!store.situationsView.expandedSituations.size && firstSituationId) {
    store.situationsView.expandedSituations.add(firstSituationId);
  }

  root.innerHTML = `
    <div class="gh-page gh-page--3col" style="padding-top:0;">
      <section class="gh-panel gh-panel--results" style="grid-column:1 / span 3;">
        <div class="gh-panel__head">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;width:100%;">
            <div style="display:flex;align-items:center;gap:10px;">
              <strong>Results</strong>
              <label class="mono" for="verdictFilter">Verdict</label>
              <select id="verdictFilter" class="gh-input gh-input--sm">
                <option value="ALL">All</option>
                <option value="OK">OK</option>
                <option value="KO">KO</option>
                <option value="WARNING">WARNING</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <label class="mono" for="situationsSearch">Search</label>
              <input id="situationsSearch" class="gh-input" type="text" placeholder="topic / EC8 / mot-clé..." value="${escapeHtml(store.situationsView.search || "")}">
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <label class="mono" for="displayDepth">Affichage</label>
              <select id="displayDepth" class="gh-input gh-input--sm">
                <option value="situations">Situations</option>
                <option value="sujets">Sujets</option>
                <option value="avis">Avis</option>
              </select>
            </div>
            <div id="situationsHeaderCounts" class="mono" style="margin-left:auto;"></div>
          </div>
        </div>
        <div class="gh-page" style="grid-template-columns:minmax(0,1fr) minmax(360px,420px);gap:16px;padding:0;">
          <div class="gh-panel" style="overflow:hidden;">
            <div id="situationsTableHost"></div>
          </div>
          <aside class="gh-panel gh-panel--details">
            <div class="gh-panel__head gh-panel__head--tight">
              <div class="details-head" style="width:100%;">
                <div class="details-head-left">
                  <div class="gh-panel__title">Détail</div>
                </div>
                <div class="details-head-right">
                  <button id="detailsExpandLocal" class="icon-btn icon-btn--sm" aria-label="Ouvrir en plein écran">↗</button>
                </div>
              </div>
            </div>
            <div id="situationsDetailsHost" class="details-body"></div>
          </aside>
        </div>
      </section>
    </div>
  `;

  rerenderPanels();
  bindSituationsEvents(root);
}

function renderSituationsTable() {
  const container = document.getElementById("situationsTable");
  const data = store.situationsView.data || [];
  if (!container) return;
  let html = `
    <table class="situations-table">
      <thead>
        <tr>
          <th>Situation</th>
          <th>Sujet</th>
          <th>Avis</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(situation => {
    html += renderSituationRow(situation);
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderSituationRow(situation) {
  let html = `
    <tr class="row-situation">
      <td colspan="4">
        <strong>${situation.title || situation.id}</strong>
      </td>
    </tr>
  `;
  if (!situation.sujets) return html;
  situation.sujets.forEach(sujet => {
    html += renderSujetRow(sujet);
  });
  return html;
}


function renderSujetRow(sujet) {
  let html = `
    <tr class="row-sujet">
      <td></td>
      <td colspan="3">
        ${sujet.title || sujet.id}
      </td>
    </tr>
  `;
  if (!sujet.avis) return html;
  sujet.avis.forEach(avis => {
    html += renderAvisRow(avis);
  });
  return html;
}

function renderAvisRow(avis) {
  return `
    <tr class="row-avis">
      <td></td>
      <td></td>
      <td>
        ${avis.title || avis.id}
      </td>
      <td>
        ${avis.verdict || "-"}
      </td>
    </tr>
  `;
}

function bindEvents() {
  const search = document.getElementById("situationsSearch");
  if (search) {
    search.addEventListener("input", e => {
      store.situationsView.search = e.target.value;
      renderSituationsTable();
    });
  }
}
