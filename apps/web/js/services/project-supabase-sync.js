import { store, DEFAULT_PROJECT_PHASES } from "../store.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { loadSituationsForCurrentProject, loadSituationSubjectIdsMap } from "./project-situations-supabase.js";

const SUPABASE_URL = getSupabaseUrl();
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";



function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function readFrontendProjectMap() {
  try {
    const raw = localStorage.getItem(FRONT_PROJECT_MAP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getFrontendProjectKey() {
  return String(store.currentProjectId || store.currentProject?.id || "default").trim() || "default";
}

function getMappedBackendProjectId() {
  const frontendProjectKey = getFrontendProjectKey();
  const map = readFrontendProjectMap();
  return map[frontendProjectKey] || "";
}



function writeFrontendProjectMapEntry(frontendProjectKey, backendProjectId) {
  const key = String(frontendProjectKey || '').trim();
  const backendId = normalizeUuid(backendProjectId);
  if (!key || !backendId) return;
  try {
    const map = readFrontendProjectMap();
    map[key] = backendId;
    localStorage.setItem(FRONT_PROJECT_MAP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore localStorage failures
  }
}

function normalizeProjectRow(row = {}) {
  const id = normalizeUuid(row.id);
  const backendProjectId = normalizeUuid(row.backendProjectId || row.project_id || row.id);
  const currentPhase = firstNonEmpty(row.current_phase_code, row.currentPhase, store.projectForm?.currentPhase, store.projectForm?.phase, 'APS');
  return {
    ...row,
    id,
    backendProjectId,
    project_id: backendProjectId,
    name: firstNonEmpty(row.name, 'Projet'),
    description: firstNonEmpty(row.description, ''),
    city: firstNonEmpty(row.city, ''),
    postalCode: firstNonEmpty(row.postal_code, row.postalCode, ''),
    departmentCode: firstNonEmpty(row.department_code, row.departmentCode, ''),
    clientName: firstNonEmpty(row.project_owner_name, row.clientName, '—'),
    projectOwnerName: firstNonEmpty(row.project_owner_name, row.projectOwnerName, ''),
    currentPhase,
    current_phase_code: currentPhase,
    ownerId: firstNonEmpty(row.owner_id, row.ownerId, ''),
    owner_id: firstNonEmpty(row.owner_id, row.ownerId, ''),
    createdAt: firstNonEmpty(row.created_at, row.createdAt, ''),
    updatedAt: firstNonEmpty(row.updated_at, row.updatedAt, '')
  };
}

async function fetchProjectsCatalogFromSupabase() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/projects`);
  url.searchParams.set('select', 'id,name,description,city,postal_code,department_code,project_owner_name,current_phase_code,owner_id,created_at,updated_at');
  url.searchParams.set('order', 'updated_at.desc');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: await getSupabaseAuthHeaders({ Accept: 'application/json' }),
    cache: 'no-store'
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`projects fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows.map(normalizeProjectRow).filter((row) => !!row.id) : [];
}

export async function syncProjectsCatalogFromSupabase() {
  const projects = await fetchProjectsCatalogFromSupabase();
  store.projects = projects;
  return projects;
}

export async function syncCurrentProjectIdentityFromSupabase() {
  const currentProjectId = String(store.currentProjectId || store.currentProject?.id || '').trim();
  if (!currentProjectId) return null;

  const projects = Array.isArray(store.projects) && store.projects.length
    ? store.projects
    : await syncProjectsCatalogFromSupabase().catch(() => []);

  const matchedProject = (projects || []).find((project) => String(project?.id || '').trim() === currentProjectId)
    || (projects || []).find((project) => String(project?.backendProjectId || '').trim() === currentProjectId)
    || null;

  if (!matchedProject) {
    const current = store.currentProject && typeof store.currentProject === 'object' ? store.currentProject : { id: currentProjectId };
    const fallback = normalizeProjectRow({ ...current, id: currentProjectId, backendProjectId: current.backendProjectId || current.project_id || currentProjectId });
    store.currentProject = fallback;
    store.currentProjectId = fallback.id;
    writeFrontendProjectMapEntry(fallback.id, fallback.backendProjectId);
    return fallback;
  }

  const merged = { ...(store.currentProject && typeof store.currentProject === 'object' ? store.currentProject : {}), ...matchedProject };
  store.currentProject = merged;
  store.currentProjectId = matchedProject.id;
  writeFrontendProjectMapEntry(matchedProject.id, matchedProject.backendProjectId);
  return merged;
}

export async function createProjectWithDefaultPhases(payload = {}) {
  const body = {
    p_project_name: firstNonEmpty(payload.projectName, payload.name, ''),
    p_description: firstNonEmpty(payload.description, '') || null,
    p_city: firstNonEmpty(payload.city, ''),
    p_postal_code: firstNonEmpty(payload.postalCode, ''),
    p_department_code: firstNonEmpty(payload.departmentCode, ''),
    p_project_owner_name: firstNonEmpty(payload.clientName, payload.projectOwnerName, ''),
    p_current_phase_code: firstNonEmpty(payload.currentPhaseCode, payload.currentPhase, 'PC')
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_project`, {
    method: 'POST',
    headers: await getSupabaseAuthHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`create_project failed (${res.status}): ${txt}`);
  }

  const row = normalizeProjectRow(await res.json().catch(() => ({})));
  if (row.id) {
    writeFrontendProjectMapEntry(row.id, row.backendProjectId);
  }
  await syncProjectsCatalogFromSupabase().catch(() => undefined);
  return row;
}

export async function resolveCurrentBackendProjectId() {
  const mappedProjectId = getMappedBackendProjectId();
  if (mappedProjectId) return mappedProjectId;

  const currentProjectBackendId = normalizeUuid(store.currentProject?.backendProjectId || store.currentProject?.project_id || store.currentProject?.id);
  return currentProjectBackendId;
}

async function getSupabaseAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

async function fetchProjectFlatSubjects(projectId) {
  if (!projectId) {
    return [];
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/subjects`);
  url.searchParams.set(
    "select",
    "id,project_id,document_id,analysis_run_id,situation_id,parent_subject_id,title,description,priority,status,closure_reason,subject_type,created_at,updated_at,closed_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const headers = await getSupabaseAuthHeaders({ Accept: "application/json" });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subjects fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json();
  return json;
}

async function fetchProjectSubjectLinks(projectId) {
  if (!projectId) {
    return [];
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_links`);
  url.searchParams.set(
    "select",
    "id,project_id,source_subject_id,target_subject_id,link_type,score,explanation,created_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const headers = await getSupabaseAuthHeaders({ Accept: "application/json" });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_links fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json();
  return json;
}

function normalizeUuid(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function normalizeObjectiveStatus(value) {
  return String(value || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function normalizeSubjectLabelKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeProjectLabelRow(row = {}) {
  const id = normalizeUuid(row.id);
  const projectId = normalizeUuid(row.project_id);
  const labelKey = firstNonEmpty(row.label_key, row.name, id);
  const name = firstNonEmpty(row.name, row.label_key, "Label");
  const description = firstNonEmpty(row.description, "");
  const textColor = firstNonEmpty(row.text_color, "rgb(208, 215, 222)");
  const backgroundColor = firstNonEmpty(row.background_color, "rgba(110, 118, 129, 0.18)");
  const borderColor = firstNonEmpty(row.border_color, textColor);
  const hexColor = firstNonEmpty(row.hex_color, "");
  const sortOrder = Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0;
  return {
    ...row,
    id,
    project_id: projectId,
    label_key: labelKey,
    labelKey,
    key: labelKey,
    name,
    label: name,
    description,
    text_color: textColor,
    textColor,
    background_color: backgroundColor,
    backgroundColor,
    color: backgroundColor,
    border_color: borderColor,
    borderColor,
    hex_color: hexColor,
    hexColor,
    sort_order: sortOrder,
    sortOrder,
    created_at: row.created_at || "",
    updated_at: row.updated_at || ""
  };
}


async function getResolvedProjectId(projectId) {
  const explicitProjectId = normalizeUuid(projectId);
  if (explicitProjectId) return explicitProjectId;

  const mappedProjectId = getMappedBackendProjectId();
  if (mappedProjectId) return mappedProjectId;

  return normalizeUuid(await resolveCurrentBackendProjectId().catch(() => ""));
}

function getMilestonesSelectClause() {
  return "id,project_id,title,description,due_date,status,created_at,updated_at,closed_at";
}

async function fetchProjectMilestoneById(objectiveId) {
  const normalizedObjectiveId = normalizeUuid(objectiveId);
  if (!normalizedObjectiveId) throw new Error("objectiveId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/milestones`);
  url.searchParams.set("select", getMilestonesSelectClause());
  url.searchParams.set("id", `eq.${normalizedObjectiveId}`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return (Array.isArray(rows) ? rows[0] : rows) || null;
}

export async function createObjective(projectId, payload = {}) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) throw new Error("projectId is required");

  const body = {
    project_id: resolvedProjectId,
    title: firstNonEmpty(payload.title, "Nouvel objectif"),
    description: firstNonEmpty(payload.description, "") || null,
    due_date: firstNonEmpty(payload.dueDate, "") || null,
    status: normalizeObjectiveStatus(payload.status),
    closed_at: normalizeObjectiveStatus(payload.status) === "closed" ? new Date().toISOString() : null
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/milestones`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone create failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  const created = normalizeObjectiveRow((Array.isArray(rows) ? rows[0] : rows) || {});
  await loadObjectivesForProject(resolvedProjectId);
  return created;
}

export async function updateObjective(objectiveId, patch = {}) {
  const normalizedObjectiveId = normalizeUuid(objectiveId);
  if (!normalizedObjectiveId) throw new Error("objectiveId is required");

  const current = await fetchProjectMilestoneById(normalizedObjectiveId);
  if (!current?.id) throw new Error("objective not found");

  const nextStatus = Object.prototype.hasOwnProperty.call(patch, "status")
    ? normalizeObjectiveStatus(patch.status)
    : normalizeObjectiveStatus(current.status);

  const body = {};
  if (Object.prototype.hasOwnProperty.call(patch, "title")) body.title = firstNonEmpty(patch.title, current.title, "Objectif");
  if (Object.prototype.hasOwnProperty.call(patch, "description")) body.description = firstNonEmpty(patch.description, "") || null;
  if (Object.prototype.hasOwnProperty.call(patch, "dueDate")) body.due_date = firstNonEmpty(patch.dueDate, "") || null;
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    body.status = nextStatus;
    body.closed_at = nextStatus === "closed" ? new Date().toISOString() : null;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/milestones?id=eq.${normalizedObjectiveId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone update failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  const updated = normalizeObjectiveRow((Array.isArray(rows) ? rows[0] : rows) || {});
  await loadObjectivesForProject(updated.project_id || normalizeUuid(current.project_id));
  return updated;
}

export async function closeObjective(objectiveId) {
  return updateObjective(objectiveId, { status: "closed" });
}

export async function reopenObjective(objectiveId) {
  return updateObjective(objectiveId, { status: "open" });
}

export async function addSubjectToObjective(objectiveId, subjectId) {
  const normalizedObjectiveId = normalizeUuid(objectiveId);
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedObjectiveId) throw new Error("objectiveId is required");
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/milestone_subjects`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify({
      milestone_id: normalizedObjectiveId,
      subject_id: normalizedSubjectId
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone_subject create failed (${res.status}): ${txt}`);
  }

  return true;
}

export async function removeSubjectFromObjective(objectiveId, subjectId) {
  const normalizedObjectiveId = normalizeUuid(objectiveId);
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedObjectiveId) throw new Error("objectiveId is required");
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/milestone_subjects`);
  url.searchParams.set("milestone_id", `eq.${normalizedObjectiveId}`);
  url.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone_subject delete failed (${res.status}): ${txt}`);
  }

  return true;
}

function normalizeObjectiveRow(row = {}, subjectIds = []) {
  const normalizedSubjectIds = [...new Set((Array.isArray(subjectIds) ? subjectIds : []).map((value) => String(value || "").trim()).filter(Boolean))];
  const status = normalizeObjectiveStatus(row.status);
  return {
    ...row,
    id: normalizeUuid(row.id),
    project_id: normalizeUuid(row.project_id),
    title: firstNonEmpty(row.title, "Objectif"),
    description: firstNonEmpty(row.description, ""),
    dueDate: row.due_date || "",
    status,
    closed: status === "closed",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
    closed_at: row.closed_at || null,
    subjectIds: normalizedSubjectIds
  };
}

async function fetchProjectMilestones(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/milestones`);
  url.searchParams.set(
    "select",
    "id,project_id,title,description,due_date,status,created_at,updated_at,closed_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestones fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}

async function fetchProjectMilestoneSubjects(projectId, milestoneIds = []) {
  const normalizedMilestoneIds = [...new Set((Array.isArray(milestoneIds) ? milestoneIds : []).map((value) => normalizeUuid(value)).filter(Boolean))];
  if (!normalizedMilestoneIds.length) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/milestone_subjects`);
  url.searchParams.set("select", "id,milestone_id,subject_id,created_at");
  url.searchParams.set("milestone_id", `in.(${normalizedMilestoneIds.join(',')})`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone_subjects fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}

async function loadObjectivesForProject(projectId) {
  const milestoneRows = await fetchProjectMilestones(projectId);
  const milestoneIds = milestoneRows.map((row) => normalizeUuid(row?.id)).filter(Boolean);
  const milestoneSubjectRows = await fetchProjectMilestoneSubjects(projectId, milestoneIds);
  return buildObjectivesResult(milestoneRows, milestoneSubjectRows);
}

function buildObjectivesResult(milestoneRows = [], milestoneSubjectRows = []) {
  const orderedMilestoneIds = (milestoneRows || []).map((row) => normalizeUuid(row?.id)).filter(Boolean);
  const orderedMilestoneIdSet = new Set(orderedMilestoneIds);
  const subjectIdsByMilestoneId = {};
  const objectiveIdsBySubjectId = {};

  for (const link of milestoneSubjectRows || []) {
    const milestoneId = normalizeUuid(link?.milestone_id);
    const subjectId = normalizeUuid(link?.subject_id);
    if (!milestoneId || !subjectId || !orderedMilestoneIdSet.has(milestoneId)) continue;

    if (!Array.isArray(subjectIdsByMilestoneId[milestoneId])) subjectIdsByMilestoneId[milestoneId] = [];
    if (!subjectIdsByMilestoneId[milestoneId].includes(subjectId)) {
      subjectIdsByMilestoneId[milestoneId].push(subjectId);
    }

    if (!Array.isArray(objectiveIdsBySubjectId[subjectId])) objectiveIdsBySubjectId[subjectId] = [];
    if (!objectiveIdsBySubjectId[subjectId].includes(milestoneId)) {
      objectiveIdsBySubjectId[subjectId].push(milestoneId);
    }
  }

  const objectives = (milestoneRows || []).map((row) => normalizeObjectiveRow(row, subjectIdsByMilestoneId[normalizeUuid(row?.id)] || []));
  const objectivesById = Object.fromEntries(objectives.map((objective) => [String(objective.id || ""), objective]).filter(([id]) => !!id));

  return {
    objectives,
    objectivesById,
    objectiveIdsBySubjectId
  };
}


async function fetchProjectLabels(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/project_labels`);
  url.searchParams.set(
    "select",
    "id,project_id,label_key,name,description,text_color,background_color,border_color,hex_color,sort_order,created_at,updated_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "sort_order.asc,name.asc,created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_labels fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows.map((row) => normalizeProjectLabelRow(row)) : [];
}

async function fetchProjectSubjectLabels(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_labels`);
  url.searchParams.set("select", "id,project_id,subject_id,label_id,created_at");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_labels fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}



function normalizeLabelHexColor(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^#([0-9a-fA-F]{6})$/);
  return match ? `#${match.group(1).lower()}` : "#8b949e";
}

function buildProjectLabelWritePayload(projectId, payload = {}, current = null) {
  const name = firstNonEmpty(payload.name, current?.name, "").trim();
  if (!name) throw new Error("Le nom du label est requis.");

  const hexColor = normalizeLabelHexColor(firstNonEmpty(payload.hexColor, payload.color, current?.hex_color, current?.hexColor, "#8b949e"));
  const description = Object.prototype.hasOwnProperty.call(payload, "description")
    ? firstNonEmpty(payload.description, "")
    : firstNonEmpty(current?.description, "");

  return {
    project_id: normalizeUuid(firstNonEmpty(projectId, current?.project_id, current?.projectId, "")),
    label_key: normalizeSubjectLabelKey(firstNonEmpty(payload.labelKey, payload.label_key, current?.label_key, current?.labelKey, name)),
    name,
    description: description || null,
    text_color: hexColor,
    background_color: `${hexColor}22`,
    border_color: `${hexColor}66`,
    hex_color: hexColor
  };
}

function buildLabelsResult(labelRows = [], subjectLabelRows = []) {
  const labels = (Array.isArray(labelRows) ? labelRows : []).map((row) => normalizeProjectLabelRow(row));
  const labelsById = {};
  const labelsByKey = {};
  const labelIdsBySubjectId = {};
  const subjectIdsByLabelId = {};

  for (const label of labels) {
    const labelId = normalizeUuid(label?.id);
    if (!labelId) continue;
    labelsById[labelId] = label;
    const normalizedKey = normalizeSubjectLabelKey(label?.label_key || label?.labelKey || label?.key || label?.name || labelId);
    if (normalizedKey && !labelsByKey[normalizedKey]) {
      labelsByKey[normalizedKey] = label;
    }
    subjectIdsByLabelId[labelId] = [];
  }

  for (const row of Array.isArray(subjectLabelRows) ? subjectLabelRows : []) {
    const subjectId = normalizeUuid(row?.subject_id);
    const labelId = normalizeUuid(row?.label_id);
    if (!subjectId || !labelId || !labelsById[labelId]) continue;

    if (!Array.isArray(labelIdsBySubjectId[subjectId])) labelIdsBySubjectId[subjectId] = [];
    if (!labelIdsBySubjectId[subjectId].includes(labelId)) labelIdsBySubjectId[subjectId].push(labelId);

    if (!Array.isArray(subjectIdsByLabelId[labelId])) subjectIdsByLabelId[labelId] = [];
    if (!subjectIdsByLabelId[labelId].includes(subjectId)) subjectIdsByLabelId[labelId].push(subjectId);
  }

  return {
    labels,
    labelsById,
    labelsByKey,
    labelIdsBySubjectId,
    subjectIdsByLabelId
  };
}



export async function createLabel(projectId, payload = {}) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) throw new Error("projectId is required");

  const body = buildProjectLabelWritePayload(resolvedProjectId, payload);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_labels`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_label create failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return normalizeProjectLabelRow((Array.isArray(rows) ? rows[0] : rows) || {});
}

export async function updateLabel(labelId, patch = {}) {
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedLabelId) throw new Error("labelId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/project_labels`);
  url.searchParams.set(
    "select",
    "id,project_id,label_key,name,description,text_color,background_color,border_color,hex_color,sort_order,created_at,updated_at"
  );
  url.searchParams.set("id", `eq.${normalizedLabelId}`);
  url.searchParams.set("limit", "1");

  const currentRes = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!currentRes.ok) {
    const txt = await currentRes.text().catch(() => "");
    throw new Error(`project_label fetch failed (${currentRes.status}): ${txt}`);
  }

  const currentRows = await currentRes.json().catch(() => []);
  const current = normalizeProjectLabelRow((Array.isArray(currentRows) ? currentRows[0] : currentRows) || {});
  if (!current?.id) throw new Error("label not found");

  const body = buildProjectLabelWritePayload(current.project_id, patch, current);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_labels?id=eq.${normalizedLabelId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_label update failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return normalizeProjectLabelRow((Array.isArray(rows) ? rows[0] : rows) || {});
}

export async function deleteLabel(labelId) {
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedLabelId) throw new Error("labelId is required");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_labels?id=eq.${normalizedLabelId}`, {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      Prefer: "return=minimal"
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_label delete failed (${res.status}): ${txt}`);
  }

  return true;
}


export async function addLabelToSubject(subjectId, labelId, projectId = "") {
  const normalizedSubjectId = normalizeUuid(subjectId);
  const normalizedLabelId = normalizeUuid(labelId);
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  if (!normalizedLabelId) throw new Error("labelId is required");
  if (!resolvedProjectId) throw new Error("projectId is required");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subject_labels`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation"
    }),
    body: JSON.stringify({
      project_id: resolvedProjectId,
      subject_id: normalizedSubjectId,
      label_id: normalizedLabelId
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_label create failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return (Array.isArray(rows) ? rows[0] : rows) || {
    project_id: resolvedProjectId,
    subject_id: normalizedSubjectId,
    label_id: normalizedLabelId
  };
}

export async function removeLabelFromSubject(subjectId, labelId) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  if (!normalizedLabelId) throw new Error("labelId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_labels`);
  url.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);
  url.searchParams.set("label_id", `eq.${normalizedLabelId}`);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      Prefer: "return=minimal"
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_label delete failed (${res.status}): ${txt}`);
  }

  return true;
}

export async function replaceSubjectLabels(subjectId, labelIds = [], projectId = "") {
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const uniqueLabelIds = [...new Set((Array.isArray(labelIds) ? labelIds : []).map((value) => normalizeUuid(value)).filter(Boolean))];
  const resolvedProjectId = await getResolvedProjectId(projectId);

  const existingRows = await fetchProjectSubjectLabels(resolvedProjectId || projectId || "");
  const existingLabelIds = existingRows
    .filter((row) => normalizeUuid(row?.subject_id) === normalizedSubjectId)
    .map((row) => normalizeUuid(row?.label_id))
    .filter(Boolean);

  const toAdd = uniqueLabelIds.filter((labelId) => !existingLabelIds.includes(labelId));
  const toRemove = existingLabelIds.filter((labelId) => !uniqueLabelIds.includes(labelId));

  await Promise.all([
    ...toAdd.map((labelId) => addLabelToSubject(normalizedSubjectId, labelId, resolvedProjectId)),
    ...toRemove.map((labelId) => removeLabelFromSubject(normalizedSubjectId, labelId))
  ]);

  return true;
}

export async function loadLabelsForProject(projectId) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) {
    return {
      labels: [],
      labelsById: {},
      labelsByKey: {},
      labelIdsBySubjectId: {},
      subjectIdsByLabelId: {},
      labelsHydrated: false
    };
  }

  const [labelRows, subjectLabelRows] = await Promise.all([
    fetchProjectLabels(resolvedProjectId),
    fetchProjectSubjectLabels(resolvedProjectId)
  ]);

  return {
    ...buildLabelsResult(labelRows, subjectLabelRows),
    labelsHydrated: true
  };
}

function buildProjectFlatSubjectsResult(subjectRows = [], subjectLinks = [], options = {}) {
  const subjectsById = {};
  const parentBySubjectId = {};
  const childrenBySubjectId = {};
  const linksBySubjectId = {};
  const rootSubjectIds = [];
  const relationIdsBySubjectId = {};
  const relationOptionsById = {};

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    if (!subjectId) continue;
    const normalizedSubject = { ...subject, id: subjectId };
    subjectsById[subjectId] = normalizedSubject;
    childrenBySubjectId[subjectId] = [];
    linksBySubjectId[subjectId] = [];
    relationIdsBySubjectId[subjectId] = [];

    const relationId = String(subject?.situation_id || "").trim();
    if (relationId) {
      relationIdsBySubjectId[subjectId].push(relationId);
      if (!relationOptionsById[relationId]) {
        relationOptionsById[relationId] = {
          id: relationId,
          title: relationId,
          status: "open"
        };
      }
    }
  }

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    if (!subjectId) continue;
    const parentId = String(subject?.parent_subject_id || "");
    parentBySubjectId[subjectId] = parentId || null;
    if (parentId && subjectsById[parentId] && parentId !== subjectId) childrenBySubjectId[parentId].push(subjectId);
    else rootSubjectIds.push(subjectId);
  }

  for (const link of subjectLinks || []) {
    const sourceId = String(link?.source_subject_id || "");
    const targetId = String(link?.target_subject_id || "");
    if (!sourceId || !targetId) continue;
    const normalizedLink = { ...link, source_subject_id: sourceId, target_subject_id: targetId };
    if (!Array.isArray(linksBySubjectId[sourceId])) linksBySubjectId[sourceId] = [];
    if (!Array.isArray(linksBySubjectId[targetId])) linksBySubjectId[targetId] = [];
    linksBySubjectId[sourceId].push(normalizedLink);
    linksBySubjectId[targetId].push(normalizedLink);
  }

  const flatSubjects = Object.values(subjectsById).sort((left, right) => {
    const leftTs = Date.parse(left?.created_at || "") || 0;
    const rightTs = Date.parse(right?.created_at || "") || 0;
    if (leftTs != rightTs) return leftTs - rightTs;
    return String(firstNonEmpty(left?.title, left?.id, "")).localeCompare(String(firstNonEmpty(right?.title, right?.id, "")), "fr");
  });

  return {
    run_id: options.runId || "",
    status: "SUCCEEDED",
    subjects: flatSubjects,
    subjectsById,
    rootSubjectIds,
    childrenBySubjectId,
    parentBySubjectId,
    linksBySubjectId,
    relationIdsBySubjectId,
    relationOptionsById
  };
}

export async function loadFlatSubjectsForCurrentProject(options = {}) {
  const force = !!options.force;
  const currentProjectScopeId = String(store.currentProjectId || "").trim() || null;
  const existing = Array.isArray(store.projectSubjectsView?.subjectsData) ? store.projectSubjectsView.subjectsData : [];
  if (!force && existing.length && store.projectSubjectsView?.projectScopeId === currentProjectScopeId) {
    return existing;
  }

  const backendProjectId = getMappedBackendProjectId();

  if (!backendProjectId) {
    store.projectSubjectsView.subjectsData = [];
    store.projectSubjectsView.projectScopeId = currentProjectScopeId;
    store.projectSubjectsView.rawSubjectsResult = {
      run_id: store.ui.runId || "",
      status: "IDLE",
      subjects: [],
      subjectsById: {},
      rootSubjectIds: [],
      childrenBySubjectId: {},
      parentBySubjectId: {},
      linksBySubjectId: {},
      relationIdsBySubjectId: {},
      relationOptionsById: {},
      labels: [],
      labelsById: {},
      labelsByKey: {},
      labelIdsBySubjectId: {},
      subjectIdsByLabelId: {},
      labelsHydrated: false,
      situationsById: {},
      subjectIdsBySituationId: {},
      objectives: [],
      objectivesById: {},
      objectiveIdsBySubjectId: {},
      objectivesHydrated: false
    };
    store.projectSubjectsView.rawResult = store.projectSubjectsView.rawSubjectsResult;
    return [];
  }

  const subjects = await fetchProjectFlatSubjects(backendProjectId);
  const subjectLinks = await fetchProjectSubjectLinks(backendProjectId).catch(() => []);
  const situations = await loadSituationsForCurrentProject(backendProjectId).catch(() => []);
  const manualSituationIds = situations
    .filter((situation) => String(situation?.mode || "manual").trim().toLowerCase() === "manual")
    .map((situation) => String(situation?.id || "").trim())
    .filter(Boolean);
  const subjectIdsBySituationId = await loadSituationSubjectIdsMap(manualSituationIds).catch(() => ({}));
  const result = buildProjectFlatSubjectsResult(subjects, subjectLinks, { runId: store.ui.runId || "" });
  result.situationsById = Object.fromEntries(situations.map((situation) => [String(situation?.id || ""), situation]).filter(([id]) => !!id));
  result.subjectIdsBySituationId = subjectIdsBySituationId;

  try {
    const labelsResult = await loadLabelsForProject(backendProjectId);
    result.labels = Array.isArray(labelsResult?.labels) ? labelsResult.labels : [];
    result.labelsById = labelsResult?.labelsById && typeof labelsResult.labelsById === "object" ? labelsResult.labelsById : {};
    result.labelsByKey = labelsResult?.labelsByKey && typeof labelsResult.labelsByKey === "object" ? labelsResult.labelsByKey : {};
    result.labelIdsBySubjectId = labelsResult?.labelIdsBySubjectId && typeof labelsResult.labelIdsBySubjectId === "object" ? labelsResult.labelIdsBySubjectId : {};
    result.subjectIdsByLabelId = labelsResult?.subjectIdsByLabelId && typeof labelsResult.subjectIdsByLabelId === "object" ? labelsResult.subjectIdsByLabelId : {};
    result.labelsHydrated = true;
  } catch (error) {
    console.warn("[project-subjects] labels load failed", error);
    result.labels = [];
    result.labelsById = {};
    result.labelsByKey = {};
    result.labelIdsBySubjectId = {};
    result.subjectIdsByLabelId = {};
    result.labelsHydrated = false;
  }

  try {
    const objectivesResult = await loadObjectivesForProject(backendProjectId);
    result.objectives = Array.isArray(objectivesResult?.objectives) ? objectivesResult.objectives : [];
    result.objectivesById = objectivesResult?.objectivesById && typeof objectivesResult.objectivesById === "object" ? objectivesResult.objectivesById : {};
    result.objectiveIdsBySubjectId = objectivesResult?.objectiveIdsBySubjectId && typeof objectivesResult.objectiveIdsBySubjectId === "object" ? objectivesResult.objectiveIdsBySubjectId : {};
    result.objectivesHydrated = true;
  } catch (error) {
    console.warn("[project-subjects] objectives load failed", error);
    result.objectives = [];
    result.objectivesById = {};
    result.objectiveIdsBySubjectId = {};
    result.objectivesHydrated = false;
  }

  result.relationOptionsById = {
    ...(result.relationOptionsById && typeof result.relationOptionsById === "object" ? result.relationOptionsById : {}),
    ...result.situationsById
  };

  store.projectSubjectsView.subjectsData = result.subjects;
  store.projectSubjectsView.rawSubjectsResult = result;
  store.projectSubjectsView.rawResult = result;
  store.projectSubjectsView.projectScopeId = currentProjectScopeId;
  store.projectSubjectsView.page = 1;
  store.projectSubjectsView.expandedSubjectIds = new Set();
  store.projectSubjectsView.expandedSujets = store.projectSubjectsView.expandedSubjectIds;
  store.projectSubjectsView.selectedSubjectId = result.subjects[0]?.id || null;
  store.projectSubjectsView.selectedSujetId = result.subjects[0]?.id || null;
  store.projectSubjectsView.subjectsSelectedNodeId = result.subjects[0]?.id || "";

  return result.subjects;
}

export function resetFlatSubjectsForCurrentProject() {
  store.projectSubjectsView.subjectsData = [];
  store.projectSubjectsView.rawSubjectsResult = null;
  store.projectSubjectsView.rawResult = null;
  store.projectSubjectsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
  store.projectSubjectsView.expandedSubjectIds = new Set();
  store.projectSubjectsView.expandedSujets = store.projectSubjectsView.expandedSubjectIds;
  store.projectSubjectsView.selectedSubjectId = null;
  store.projectSubjectsView.selectedSujetId = null;
  store.projectSubjectsView.subjectsSelectedNodeId = "";
  store.projectSubjectsView.search = "";
  store.projectSubjectsView.page = 1;
}


export const PROJECT_SUPABASE_SYNC_EVENT = "project:supabase-sync";
export const PROJECT_IDENTITY_UPDATED_EVENT = "project:identity-updated";

function dispatchProjectSupabaseSync(detail = {}) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent(PROJECT_SUPABASE_SYNC_EVENT, { detail }));
}

function dispatchProjectIdentityUpdated(detail = {}) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent(PROJECT_IDENTITY_UPDATED_EVENT, { detail }));
}

function getCurrentFrontendProjectId() {
  return String(store.currentProjectId || store.currentProject?.id || "").trim();
}

function getCurrentRawSubjectsResult() {
  return store.projectSubjectsView?.rawSubjectsResult && typeof store.projectSubjectsView.rawSubjectsResult === "object"
    ? store.projectSubjectsView.rawSubjectsResult
    : null;
}

function getOpenSubjectCountFromStore() {
  const raw = getCurrentRawSubjectsResult();
  if (raw && Array.isArray(raw.subjects)) {
    return raw.subjects.filter((subject) => String(subject?.status || "open").trim().toLowerCase() === "open").length;
  }
  const rows = Array.isArray(store.projectSubjectsView?.subjectsData) ? store.projectSubjectsView.subjectsData : [];
  return rows.filter((subject) => String(subject?.status || "open").trim().toLowerCase() === "open").length;
}

export function getCurrentProjectSubjectCounters() {
  return {
    openSujets: getOpenSubjectCountFromStore()
  };
}

export async function syncProjectSubjectCountersFromSupabase(options = {}) {
  await loadFlatSubjectsForCurrentProject({ force: !!options.force }).catch(() => []);
  const counters = getCurrentProjectSubjectCounters();
  dispatchProjectSupabaseSync({
    frontendProjectId: getCurrentFrontendProjectId(),
    backendProjectId: getMappedBackendProjectId(),
    counters
  });
  return counters;
}

export async function syncProjectDocumentsFromSupabase(options = {}) {
  const projectId = await getResolvedProjectId(options.projectId || "");
  if (!projectId) {
    store.projectDocuments.items = [];
    return [];
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/documents`);
  url.searchParams.set("select", "id,project_id,filename,original_filename,mime_type,storage_bucket,storage_path,file_size_bytes,upload_status,document_kind,page_count,created_at,updated_at");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.desc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`documents fetch failed (${res.status}): ${txt}`);
  }
  const rows = await res.json().catch(() => []);
  const items = (Array.isArray(rows) ? rows : []).map((row) => ({
    id: normalizeUuid(row?.id),
    name: firstNonEmpty(row?.original_filename, row?.filename, "Document"),
    title: firstNonEmpty(row?.original_filename, row?.filename, "Document"),
    fileName: firstNonEmpty(row?.filename, row?.original_filename, ""),
    mimeType: firstNonEmpty(row?.mime_type, "application/pdf"),
    kind: firstNonEmpty(row?.document_kind, "file"),
    note: firstNonEmpty(row?.upload_status, "uploaded"),
    uploadStatus: firstNonEmpty(row?.upload_status, "uploaded"),
    pageCount: Number.isFinite(Number(row?.page_count)) ? Number(row.page_count) : null,
    storageBucket: firstNonEmpty(row?.storage_bucket, "documents"),
    storagePath: firstNonEmpty(row?.storage_path, ""),
    createdAt: firstNonEmpty(row?.created_at, ""),
    updatedAt: firstNonEmpty(row?.updated_at, row?.created_at, "")
  })).filter((item) => !!item.id);

  store.projectDocuments.items = items;
  if (!store.projectDocuments.activeDocumentId && items[0]?.id) {
    store.projectDocuments.activeDocumentId = items[0].id;
  }
  dispatchProjectSupabaseSync({ frontendProjectId: getCurrentFrontendProjectId(), backendProjectId: projectId, documentsCount: items.length });
  return items;
}

export async function syncProjectActionsFromSupabase(options = {}) {
  const projectId = await getResolvedProjectId(options.projectId || "");
  if (!projectId) {
    store.projectAutomation.runLog = [];
    return [];
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/analysis_runs`);
  url.searchParams.set("select", "id,project_id,document_id,status,trigger_source,started_at,finished_at,error_message,created_at,updated_at");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.desc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`analysis_runs fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  const entries = (Array.isArray(rows) ? rows : []).map((row) => {
    const status = String(row?.status || "").trim().toLowerCase();
    const outcomeStatus = status === "succeeded" ? "success" : status === "failed" ? "error" : null;
    const lifecycleStatus = ["queued", "running"].includes(status) ? "running" : "completed";
    const startedAtIso = firstNonEmpty(row?.started_at, row?.created_at, "");
    const endedAtIso = firstNonEmpty(row?.finished_at, row?.updated_at, "");
    const startedAt = Date.parse(startedAtIso) || Date.now();
    const endedAt = endedAtIso ? (Date.parse(endedAtIso) || startedAt) : null;
    return {
      id: normalizeUuid(row?.id),
      name: "Analyse de document",
      kind: "analysis",
      agentKey: "document",
      lifecycleStatus,
      outcomeStatus,
      status: lifecycleStatus,
      triggerType: firstNonEmpty(row?.trigger_source, "manual"),
      triggerLabel: firstNonEmpty(row?.trigger_source, "manual"),
      trigger: { type: firstNonEmpty(row?.trigger_source, "manual"), label: firstNonEmpty(row?.trigger_source, "manual") },
      documentName: "",
      subject: { documentName: "" },
      startedAt,
      endedAt,
      durationMs: endedAt != null ? Math.max(0, endedAt - startedAt) : null,
      summary: firstNonEmpty(row?.error_message, ""),
      details: null,
      createdAt: Date.parse(firstNonEmpty(row?.created_at, startedAtIso, "")) || startedAt,
      updatedAt: Date.parse(firstNonEmpty(row?.updated_at, endedAtIso, "")) || endedAt || startedAt
    };
  });
  store.projectAutomation.runLog = entries;
  dispatchProjectSupabaseSync({ frontendProjectId: getCurrentFrontendProjectId(), backendProjectId: projectId, actionsCount: entries.length });
  return entries;
}

export async function persistCurrentProjectNameToSupabase(nextName) {
  const projectId = await getResolvedProjectId("");
  const normalizedName = firstNonEmpty(nextName, "").trim();
  if (!projectId) throw new Error("projectId is required");
  if (!normalizedName) throw new Error("Le nom du projet est requis.");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ name: normalizedName })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project update failed (${res.status}): ${txt}`);
  }
  const rows = await res.json().catch(() => []);
  const updated = normalizeProjectRow((Array.isArray(rows) ? rows[0] : rows) || { id: projectId, name: normalizedName });
  store.currentProject = { ...(store.currentProject || {}), ...updated };
  store.currentProjectId = updated.id || store.currentProjectId;
  dispatchProjectIdentityUpdated({ frontendProjectId: store.currentProjectId, backendProjectId: updated.backendProjectId || projectId });
  return updated;
}

function buildDefaultPhasesCatalogMap() {
  return Object.fromEntries(DEFAULT_PROJECT_PHASES.map((item) => [String(item.code || "").trim(), { ...item }]));
}

export async function syncProjectPhasesFromSupabase(options = {}) {
  const projectId = await getResolvedProjectId(options.projectId || "");
  const defaultsMap = buildDefaultPhasesCatalogMap();
  if (!projectId) {
    store.projectForm.phasesCatalog = DEFAULT_PROJECT_PHASES.map((item) => ({ ...item }));
    return store.projectForm.phasesCatalog;
  }
  const url = new URL(`${SUPABASE_URL}/rest/v1/project_phases`);
  url.searchParams.set("select", "id,project_id,phase_code,phase_label,phase_order,phase_date,created_at,updated_at");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "phase_order.asc");
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_phases fetch failed (${res.status}): ${txt}`);
  }
  const rows = await res.json().catch(() => []);
  const catalog = DEFAULT_PROJECT_PHASES.map((item) => {
    const code = String(item.code || "").trim();
    const row = (Array.isArray(rows) ? rows : []).find((entry) => String(entry?.phase_code || "").trim() === code);
    return {
      ...item,
      label: firstNonEmpty(row?.phase_label, item.label),
      phaseDate: firstNonEmpty(row?.phase_date, item.phaseDate, ""),
      phase_date: firstNonEmpty(row?.phase_date, item.phaseDate, ""),
      enabled: item.enabled !== false
    };
  });
  store.projectForm.phasesCatalog = catalog;
  return catalog;
}

export async function persistProjectPhaseDatesToSupabase(patch = {}) {
  const projectId = await getResolvedProjectId("");
  if (!projectId) throw new Error("projectId is required");
  const updates = Object.entries(patch || {}).map(([code, value]) => ({ code: String(code || "").trim(), value: firstNonEmpty(value, "") || null })).filter((item) => item.code);
  for (const update of updates) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/project_phases?project_id=eq.${projectId}&phase_code=eq.${encodeURIComponent(update.code)}`, {
      method: "PATCH",
      headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ phase_date: update.value })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`project_phase update failed (${res.status}): ${txt}`);
    }
  }
  await syncProjectPhasesFromSupabase({ projectId, force: true });
  return store.projectForm.phasesCatalog;
}

export async function persistProjectPhaseEnabledToSupabase(code, enabled) {
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode) throw new Error("phase code is required");
  const catalog = Array.isArray(store.projectForm?.phasesCatalog) ? store.projectForm.phasesCatalog : DEFAULT_PROJECT_PHASES.map((item) => ({ ...item }));
  store.projectForm.phasesCatalog = catalog.map((item) => String(item?.code || "").trim() === normalizedCode ? { ...item, enabled: enabled !== false } : item);
  return store.projectForm.phasesCatalog.find((item) => String(item?.code || "").trim() === normalizedCode) || null;
}

function normalizeProjectLotRow(row = {}) {
  const catalog = row?.lot_catalog && typeof row.lot_catalog === "object" ? row.lot_catalog : {};
  return {
    id: normalizeUuid(row?.id),
    projectId: normalizeUuid(row?.project_id),
    project_id: normalizeUuid(row?.project_id),
    lotCatalogId: normalizeUuid(row?.lot_catalog_id || catalog?.id),
    lot_catalog_id: normalizeUuid(row?.lot_catalog_id || catalog?.id),
    groupCode: firstNonEmpty(catalog?.group_code, row?.group_code, ""),
    groupLabel: firstNonEmpty(catalog?.group_label, row?.group_label, ""),
    code: firstNonEmpty(catalog?.code, row?.code, ""),
    label: firstNonEmpty(catalog?.label, row?.label, "Lot"),
    activated: row?.activated !== false,
    sortOrder: Number.isFinite(Number(catalog?.sort_order)) ? Number(catalog.sort_order) : 0,
    isCustom: catalog?.is_custom === true || row?.is_custom === true,
    createdByProjectId: normalizeUuid(catalog?.created_by_project_id),
    created_at: firstNonEmpty(row?.created_at, ""),
    updated_at: firstNonEmpty(row?.updated_at, "")
  };
}

export async function syncProjectLotsFromSupabase(options = {}) {
  const projectId = await getResolvedProjectId(options.projectId || "");
  store.projectLots.loading = true;
  store.projectLots.error = "";
  if (!projectId) {
    store.projectLots.items = [];
    store.projectLots.loading = false;
    store.projectLots.loaded = true;
    return [];
  }
  const url = new URL(`${SUPABASE_URL}/rest/v1/project_lots`);
  url.searchParams.set("select", "id,project_id,lot_catalog_id,activated,created_at,updated_at,lot_catalog:lot_catalog_id(id,group_code,group_label,code,label,default_activated,sort_order,is_custom,created_by_project_id)");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    store.projectLots.loading = false;
    store.projectLots.error = `project_lots fetch failed (${res.status}): ${txt}`;
    throw new Error(store.projectLots.error);
  }
  const rows = await res.json().catch(() => []);
  const items = (Array.isArray(rows) ? rows : []).map(normalizeProjectLotRow).filter((item) => !!item.id);
  store.projectLots.items = items;
  store.projectLots.loading = false;
  store.projectLots.loaded = true;
  store.projectLots.projectKey = getCurrentFrontendProjectId();
  return items;
}

export async function persistProjectLotActivationToSupabase(projectLotId, activated) {
  const normalizedId = normalizeUuid(projectLotId);
  if (!normalizedId) throw new Error("projectLotId is required");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_lots?id=eq.${normalizedId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ activated: activated !== false })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_lot update failed (${res.status}): ${txt}`);
  }
  await syncProjectLotsFromSupabase({ force: true });
  return true;
}

export async function addCustomProjectLotToSupabase(payload = {}) {
  const projectId = await getResolvedProjectId(payload.projectId || "");
  if (!projectId) throw new Error("projectId is required");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_custom_project_lot`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json" }),
    body: JSON.stringify({ p_project_id: projectId, p_group_code: firstNonEmpty(payload.groupCode, payload.group_code, ""), p_label: firstNonEmpty(payload.label, payload.title, "") })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`add_custom_project_lot failed (${res.status}): ${txt}`);
  }
  await syncProjectLotsFromSupabase({ force: true });
  return true;
}

export async function deleteCustomProjectLotFromSupabase(projectLotId) {
  const projectId = await getResolvedProjectId("");
  const normalizedId = normalizeUuid(projectLotId);
  if (!projectId || !normalizedId) throw new Error("projectLotId is required");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_custom_project_lot`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json" }),
    body: JSON.stringify({ p_project_lot_id: normalizedId, p_project_id: projectId })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`delete_custom_project_lot failed (${res.status}): ${txt}`);
  }
  await syncProjectLotsFromSupabase({ force: true });
  return true;
}

function normalizeCollaboratorRow(row = {}) {
  return {
    id: normalizeUuid(row?.id),
    projectId: normalizeUuid(row?.project_id),
    personId: normalizeUuid(row?.person_id),
    userId: normalizeUuid(row?.collaborator_user_id),
    linkedUserId: normalizeUuid(row?.linked_user_id || row?.collaborator_user_id),
    projectLotId: normalizeUuid(row?.project_lot_id),
    email: firstNonEmpty(row?.email, row?.collaborator_email, ""),
    firstName: firstNonEmpty(row?.first_name, ""),
    lastName: firstNonEmpty(row?.last_name, ""),
    name: firstNonEmpty(row?.full_name, [firstNonEmpty(row?.first_name, ""), firstNonEmpty(row?.last_name, "")].filter(Boolean).join(" "), firstNonEmpty(row?.email, "Collaborateur")),
    company: firstNonEmpty(row?.company, ""),
    sourceType: firstNonEmpty(row?.source_type, "directory_person"),
    roleGroupCode: firstNonEmpty(row?.role_group_code, ""),
    roleGroupLabel: firstNonEmpty(row?.role_group_label, ""),
    roleCode: firstNonEmpty(row?.role_code, ""),
    roleLabel: firstNonEmpty(row?.role_label, ""),
    status: firstNonEmpty(row?.status, "Actif"),
    addedAt: firstNonEmpty(row?.created_at, ""),
    removedAt: firstNonEmpty(row?.removed_at, "")
  };
}

export async function syncProjectCollaboratorsFromSupabase(options = {}) {
  const projectId = await getResolvedProjectId(options.projectId || "");
  if (!projectId) {
    store.projectForm.collaborators = [];
    return [];
  }
  const url = new URL(`${SUPABASE_URL}/rest/v1/project_collaborators_view`);
  url.searchParams.set("select", "id,project_id,person_id,collaborator_user_id,linked_user_id,project_lot_id,collaborator_email,status,created_at,updated_at,removed_at,first_name,last_name,full_name,email,company,source_type,role_group_code,role_group_label,role_code,role_label");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_collaborators_view fetch failed (${res.status}): ${txt}`);
  }
  const rows = await res.json().catch(() => []);
  const items = (Array.isArray(rows) ? rows : []).map(normalizeCollaboratorRow).filter((item) => !!item.id);
  store.projectForm.collaborators = items;
  return items;
}

export async function searchProjectCollaboratorCandidates(query, options = {}) {
  const projectId = await getResolvedProjectId(options.projectId || "");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_project_collaborator_candidates`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json" }),
    body: JSON.stringify({ p_query: firstNonEmpty(query, ""), p_project_id: projectId || null, p_limit: Number.isFinite(Number(options.limit)) ? Number(options.limit) : 8 })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`search_project_collaborator_candidates failed (${res.status}): ${txt}`);
  }
  const rows = await res.json().catch(() => []);
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    candidateKey: firstNonEmpty(row?.candidate_key, row?.email, row?.person_id, row?.user_id),
    sourceType: firstNonEmpty(row?.source_type, "directory_person"),
    personId: normalizeUuid(row?.person_id),
    userId: normalizeUuid(row?.user_id),
    linkedUserId: normalizeUuid(row?.linked_user_id || row?.user_id),
    email: firstNonEmpty(row?.email, ""),
    firstName: firstNonEmpty(row?.first_name, ""),
    lastName: firstNonEmpty(row?.last_name, ""),
    name: firstNonEmpty(row?.full_name, [firstNonEmpty(row?.first_name, ""), firstNonEmpty(row?.last_name, "")].filter(Boolean).join(" "), firstNonEmpty(row?.email, "Personne")),
    company: firstNonEmpty(row?.company, "")
  }));
}

async function ensureDirectoryPerson(payload = {}) {
  const explicitPersonId = normalizeUuid(payload.personId);
  if (explicitPersonId) return explicitPersonId;
  const email = firstNonEmpty(payload.email, "").trim().toLowerCase();
  if (!email) throw new Error("L'email est requis.");
  const body = {
    email,
    email_normalized: email,
    first_name: firstNonEmpty(payload.firstName, "") || null,
    last_name: firstNonEmpty(payload.lastName, "") || null,
    company: firstNonEmpty(payload.company, "") || null,
    linked_user_id: normalizeUuid(payload.userId || payload.linkedUserId) || null,
    created_by_user_id: normalizeUuid(store.user?.id) || null
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/directory_people`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`directory_people upsert failed (${res.status}): ${txt}`);
  }
  const rows = await res.json().catch(() => []);
  const personId = normalizeUuid((Array.isArray(rows) ? rows[0] : rows)?.id);
  if (!personId) throw new Error("Impossible de résoudre la personne de l'annuaire.");
  return personId;
}

export async function addProjectCollaboratorToSupabase(payload = {}) {
  const projectId = await getResolvedProjectId(payload.projectId || "");
  if (!projectId) throw new Error("projectId is required");
  const projectLotId = normalizeUuid(payload.projectLotId || payload.project_lot_id);
  if (!projectLotId) throw new Error("projectLotId is required");
  const personId = await ensureDirectoryPerson(payload);
  const body = {
    project_id: projectId,
    person_id: personId,
    collaborator_user_id: normalizeUuid(payload.userId || payload.linkedUserId) || null,
    project_lot_id: projectLotId,
    collaborator_email: firstNonEmpty(payload.email, "") || null,
    invited_by_user_id: normalizeUuid(store.user?.id) || null,
    status: firstNonEmpty(payload.status, "Actif"),
    removed_at: firstNonEmpty(payload.status, "Actif") === "Retiré" ? new Date().toISOString() : null
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_collaborators`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_collaborators upsert failed (${res.status}): ${txt}`);
  }
  await syncProjectCollaboratorsFromSupabase({ force: true });
  return true;
}

export async function deleteProjectCollaboratorFromSupabase(collaboratorId) {
  const normalizedId = normalizeUuid(collaboratorId);
  if (!normalizedId) throw new Error("collaboratorId is required");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_collaborators?id=eq.${normalizedId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ status: "Retiré", removed_at: new Date().toISOString() })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_collaborators remove failed (${res.status}): ${txt}`);
  }
  await syncProjectCollaboratorsFromSupabase({ force: true });
  return true;
}

export async function updateProjectCollaboratorRoleInSupabase(collaboratorId, projectLotId) {
  const normalizedId = normalizeUuid(collaboratorId);
  const normalizedLotId = normalizeUuid(projectLotId);
  if (!normalizedId) throw new Error("collaboratorId is required");
  if (!normalizedLotId) throw new Error("projectLotId is required");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_collaborators?id=eq.${normalizedId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ project_lot_id: normalizedLotId })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_collaborators update failed (${res.status}): ${txt}`);
  }
  await syncProjectCollaboratorsFromSupabase({ force: true });
  return true;
}

export async function persistSubjectIssueActionToSupabase(subject, action) {
  const subjectId = normalizeUuid(subject?.id || subject?.raw?.id);
  if (!subjectId) throw new Error("subjectId is required");
  const normalizedAction = String(action || "").trim();
  const patch = {};
  if (normalizedAction === "issue:reopen") {
    patch.status = "open";
    patch.closure_reason = null;
    patch.closed_at = null;
  } else if (normalizedAction === "issue:close:realized") {
    patch.status = "reviewed";
    patch.closure_reason = "realized";
    patch.closed_at = new Date().toISOString();
  } else if (normalizedAction === "issue:close:dismissed") {
    patch.status = "dismissed";
    patch.closure_reason = "dismissed";
    patch.closed_at = new Date().toISOString();
  } else if (normalizedAction === "issue:close:duplicate") {
    patch.status = "dismissed";
    patch.closure_reason = "duplicate";
    patch.closed_at = new Date().toISOString();
  } else {
    return false;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/subjects?id=eq.${subjectId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify(patch)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject update failed (${res.status}): ${txt}`);
  }
  dispatchProjectSupabaseSync({ frontendProjectId: getCurrentFrontendProjectId(), backendProjectId: getMappedBackendProjectId(), subjectId, action: normalizedAction });
  return true;
}
