import { store } from "../store.js";
import { ensureProjectDocumentsState } from "./project-documents-store.js";
import { ensureProjectAutomationDefaults } from "./project-automation.js";

const SUPABASE_URL = "https://olgxhfgdzyghlzxmremz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_08nUL61_ATl-6KpD8dOYPw_RM5lMtEz";
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";
const PROJECT_SUPABASE_SYNC_EVENT = "project:supabase-sync";

function safeString(value = "") {
  return String(value ?? "").trim();
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeString(value));
}

function getFrontendProjectKey() {
  return safeString(store.currentProjectId || store.currentProject?.id || "default") || "default";
}

function getCurrentProjectName() {
  return safeString(store.currentProject?.name || store.projectForm?.projectName || "");
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

function writeFrontendProjectMap(map) {
  try {
    localStorage.setItem(FRONT_PROJECT_MAP_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // ignore
  }
}

function getSupabaseAuthHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra
  };
}

async function restFetch(table, params = new URLSearchParams()) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of params.entries()) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${table} fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}

function ensureSupabaseSyncState() {
  if (!store.projectSupabaseSync || typeof store.projectSupabaseSync !== "object") {
    store.projectSupabaseSync = {
      byFrontendProject: {}
    };
  }

  if (!store.projectSupabaseSync.byFrontendProject || typeof store.projectSupabaseSync.byFrontendProject !== "object") {
    store.projectSupabaseSync.byFrontendProject = {};
  }

  return store.projectSupabaseSync;
}

function getProjectSyncBucket(frontendProjectId = getFrontendProjectKey()) {
  const syncState = ensureSupabaseSyncState();
  const key = safeString(frontendProjectId) || "default";

  if (!syncState.byFrontendProject[key] || typeof syncState.byFrontendProject[key] !== "object") {
    syncState.byFrontendProject[key] = {
      backendProjectId: "",
      subjectCounters: {
        openSujets: 0,
        totalSujets: 0
      },
      documentsLoaded: false,
      actionsLoaded: false,
      subjectsCountLoaded: false,
      lastDocumentsAt: 0,
      lastActionsAt: 0,
      lastSubjectsCountAt: 0
    };
  }

  return syncState.byFrontendProject[key];
}

function dispatchProjectSupabaseSync(detail = {}) {
  window.dispatchEvent(new CustomEvent(PROJECT_SUPABASE_SYNC_EVENT, {
    detail: {
      frontendProjectId: getFrontendProjectKey(),
      ...detail
    }
  }));
}

export { PROJECT_SUPABASE_SYNC_EVENT };

export async function resolveCurrentBackendProjectId(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);

  if (!force && projectBucket.backendProjectId) {
    return projectBucket.backendProjectId;
  }

  const explicitCurrentId = safeString(store.currentProjectId || store.currentProject?.id || "");
  if (looksLikeUuid(explicitCurrentId)) {
    projectBucket.backendProjectId = explicitCurrentId;
    return explicitCurrentId;
  }

  const frontendMap = readFrontendProjectMap();
  const mappedId = safeString(frontendMap[frontendProjectId] || "");
  if (mappedId) {
    projectBucket.backendProjectId = mappedId;
    return mappedId;
  }

  const projectName = getCurrentProjectName();
  if (!projectName) return "";

  const params = new URLSearchParams();
  params.set("select", "id,name,created_at");
  params.set("name", `eq.${projectName}`);
  params.set("order", "created_at.desc");
  params.set("limit", "1");

  const rows = await restFetch("projects", params);
  const backendProjectId = safeString(rows?.[0]?.id || "");

  if (backendProjectId) {
    frontendMap[frontendProjectId] = backendProjectId;
    writeFrontendProjectMap(frontendMap);
    projectBucket.backendProjectId = backendProjectId;
  }

  return backendProjectId;
}

function formatDocumentUpdatedAt(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function buildStoragePublicUrl(bucket, path) {
  const safeBucket = safeString(bucket);
  const safePath = safeString(path);
  if (!safeBucket || !safePath) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(safeBucket)}/${safePath.split("/").map(encodeURIComponent).join("/")}`;
}

function mapDocumentRowToViewModel(row = {}) {
  const displayName = safeString(row.original_filename || row.filename || "Document");
  const mimeType = safeString(row.mime_type || "");

  return {
    id: safeString(row.id),
    name: displayName,
    title: displayName,
    note: safeString(row.document_kind || row.upload_status || "Document prêt pour l'analyse"),
    phaseCode: safeString(store.projectForm?.currentPhase || store.projectForm?.phase || ""),
    phaseLabel: "",
    updatedAt: formatDocumentUpdatedAt(row.updated_at || row.created_at),
    createdAt: row.created_at || null,
    fileName: displayName,
    kind: "file",
    mimeType,
    previewUrl: mimeType === "application/pdf"
      ? buildStoragePublicUrl(row.storage_bucket, row.storage_path)
      : "",
    localPreviewUrl: "",
    localFile: null,
    extension: displayName.includes(".") ? displayName.split(".").pop().toLowerCase() : "",
    storageBucket: safeString(row.storage_bucket),
    storagePath: safeString(row.storage_path),
    uploadStatus: safeString(row.upload_status)
  };
}

function mapRunRowToLogEntry(row = {}) {
  const startedAt = row.started_at || row.created_at || new Date().toISOString();
  const endedAt = row.finished_at || null;
  const lifecycleStatus = String(row.status || "queued").toLowerCase() === "running"
    ? "running"
    : "completed";

  const outcomeStatus = String(row.status || "").toLowerCase() === "succeeded"
    ? "success"
    : (["failed", "canceled"].includes(String(row.status || "").toLowerCase()) ? "error" : null);

  const documentMeta = Array.isArray(row.documents) ? row.documents[0] : row.documents;
  const documentName = safeString(documentMeta?.original_filename || documentMeta?.filename || "");
  const triggerType = safeString(row.trigger_source || "manual");
  const triggerLabel = triggerType === "document-upload"
    ? "Dépôt de document"
    : triggerType === "automatic"
      ? "Déclenchement automatique"
      : "Lancement manuel";

  return {
    id: safeString(row.id),
    name: "Analyse parasismique",
    kind: "analysis",
    agentKey: safeString(row.llm_model ? "parasismique" : "parasismique"),
    lifecycleStatus,
    outcomeStatus,
    status: lifecycleStatus,
    triggerType,
    triggerLabel,
    trigger: {
      type: triggerType,
      label: triggerLabel
    },
    documentName,
    subject: {
      documentName
    },
    startedAt,
    endedAt,
    durationMs: endedAt ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime()) : null,
    summary: safeString(row.error_message || row.status || ""),
    details: null,
    createdAt: row.created_at || startedAt,
    updatedAt: row.updated_at || endedAt || startedAt
  };
}

export async function syncProjectDocumentsFromSupabase(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);
  const backendProjectId = await resolveCurrentBackendProjectId();

  ensureProjectDocumentsState();

  if (!backendProjectId) {
    store.projectDocuments.items = [];
    store.projectDocuments.activeDocumentId = null;
    projectBucket.documentsLoaded = true;
    dispatchProjectSupabaseSync({ section: "documents", documentsCount: 0 });
    return [];
  }

  if (!force && projectBucket.documentsLoaded && Array.isArray(store.projectDocuments?.items) && store.projectDocuments.items.length) {
    return store.projectDocuments.items;
  }

  const params = new URLSearchParams();
  params.set("select", "id,filename,original_filename,mime_type,storage_bucket,storage_path,document_kind,upload_status,created_at,updated_at");
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("deleted_at", "is.null");
  params.set("order", "created_at.desc");

  const rows = await restFetch("documents", params);
  const nextItems = (Array.isArray(rows) ? rows : []).map(mapDocumentRowToViewModel);

  store.projectDocuments.items = nextItems;
  store.projectDocuments.activeDocumentId = nextItems[0]?.id || null;
  projectBucket.backendProjectId = backendProjectId;
  projectBucket.documentsLoaded = true;
  projectBucket.lastDocumentsAt = Date.now();

  dispatchProjectSupabaseSync({ section: "documents", documentsCount: nextItems.length });
  return nextItems;
}

export async function syncProjectActionsFromSupabase(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);
  const backendProjectId = await resolveCurrentBackendProjectId();

  ensureProjectAutomationDefaults();

  if (!backendProjectId) {
    store.projectAutomation.runLog = [];
    projectBucket.actionsLoaded = true;
    dispatchProjectSupabaseSync({ section: "actions", actionsCount: 0 });
    return [];
  }

  if (!force && projectBucket.actionsLoaded && Array.isArray(store.projectAutomation?.runLog) && store.projectAutomation.runLog.length) {
    return store.projectAutomation.runLog;
  }

  const params = new URLSearchParams();
  params.set("select", "id,status,trigger_source,started_at,finished_at,created_at,updated_at,error_message,llm_model,document_id,documents(id,original_filename,filename)");
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("order", "created_at.desc");

  const rows = await restFetch("analysis_runs", params);
  const nextItems = (Array.isArray(rows) ? rows : []).map(mapRunRowToLogEntry);

  store.projectAutomation.runLog = nextItems;
  projectBucket.backendProjectId = backendProjectId;
  projectBucket.actionsLoaded = true;
  projectBucket.lastActionsAt = Date.now();

  dispatchProjectSupabaseSync({ section: "actions", actionsCount: nextItems.length });
  return nextItems;
}

export async function syncProjectSubjectCountersFromSupabase(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);
  const backendProjectId = await resolveCurrentBackendProjectId();

  if (!backendProjectId) {
    projectBucket.subjectCounters = { openSujets: 0, totalSujets: 0 };
    projectBucket.subjectsCountLoaded = true;
    dispatchProjectSupabaseSync({ section: "subjects", subjectCounters: projectBucket.subjectCounters });
    return projectBucket.subjectCounters;
  }

  if (!force && projectBucket.subjectsCountLoaded) {
    return projectBucket.subjectCounters;
  }

  const params = new URLSearchParams();
  params.set("select", "id,status,parent_subject_id");
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("order", "created_at.asc");

  const rows = await restFetch("subjects", params);
  const topLevelRows = (Array.isArray(rows) ? rows : []).filter((row) => !safeString(row.parent_subject_id));
  const openSujets = topLevelRows.filter((row) => !String(row.status || "open").toLowerCase().startsWith("closed")).length;
  const totalSujets = topLevelRows.length;

  projectBucket.backendProjectId = backendProjectId;
  projectBucket.subjectCounters = { openSujets, totalSujets };
  projectBucket.subjectsCountLoaded = true;
  projectBucket.lastSubjectsCountAt = Date.now();

  dispatchProjectSupabaseSync({ section: "subjects", subjectCounters: projectBucket.subjectCounters });
  return projectBucket.subjectCounters;
}

export function getCurrentProjectSubjectCounters() {
  const frontendProjectId = getFrontendProjectKey();
  const bucket = getProjectSyncBucket(frontendProjectId);
  return {
    openSujets: Number(bucket.subjectCounters?.openSujets || 0),
    totalSujets: Number(bucket.subjectCounters?.totalSujets || 0)
  };
}
