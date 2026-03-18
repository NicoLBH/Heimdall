import { store } from "../store.js";

const DEFAULT_AGENT_CATALOG = {
  solidite: {
    key: "solidite",
    label: "Agent spécialisé solidité",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 10
  },
  incendie: {
    key: "incendie",
    label: "Agent spécialisé sécurité incendie",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 20
  },
  pmr: {
    key: "pmr",
    label: "Agent spécialisé accessibilité PMR",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 30
  },
  parasismique: {
    key: "parasismique",
    label: "Agent spécialisé parasismique",
    implemented: true,
    available: true,
    defaultEnabled: true,
    order: 40
  },
  thermique: {
    key: "thermique",
    label: "Agent spécialisé thermique",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 50
  },
  acoustique: {
    key: "acoustique",
    label: "Agent spécialisé acoustique",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 60
  }
};

const DEFAULT_AUTOMATION_CATALOG = {
  autoProjectBaseDataEnrichment: {
    key: "autoProjectBaseDataEnrichment",
    label: "Déclencher l'enrichissement automatique des données de base projet",
    implemented: true,
    available: true,
    defaultEnabled: false,
    order: 5
  },
  autoAnalysisAfterUpload: {
    key: "autoAnalysisAfterUpload",
    label: "Déclencher une analyse automatique après le dépôt d'un document",
    implemented: true,
    available: true,
    defaultEnabled: false,
    order: 10
  },
  autoComparePreviousVersion: {
    key: "autoComparePreviousVersion",
    label: "Déclencher une comparaison automatique du document déposé à sa version précédente",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 20
  },
  autoDetectInconsistencies: {
    key: "autoDetectInconsistencies",
    label: "Déclencher la détection automatique d'incohérence",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 30
  },
  autoGenerateReport: {
    key: "autoGenerateReport",
    label: "Déclencher la génération automatique d'un rapport",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 40
  },
  autoNotify: {
    key: "autoNotify",
    label: "Déclencher la notification automatique",
    implemented: false,
    available: true,
    defaultEnabled: false,
    order: 50
  }
};

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cloneCatalog(source) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, { ...value }])
  );
}

function buildDefaultEnabledMap(catalog) {
  const result = {};
  for (const [key, item] of Object.entries(catalog)) {
    result[key] = Boolean(item.defaultEnabled && item.implemented);
  }
  return result;
}

function mergeCatalog(defaultCatalog, currentCatalog) {
  const safeCurrent = ensureObject(currentCatalog);
  const merged = {};

  for (const [key, defaults] of Object.entries(defaultCatalog)) {
    const current = ensureObject(safeCurrent[key]);
    merged[key] = {
      ...defaults,
      ...current,
      key
    };
  }

  return merged;
}

function mergeSettings(defaultsMap, currentMap, catalog) {
  const safeCurrent = ensureObject(currentMap);
  const merged = {};

  for (const [key, defaultValue] of Object.entries(defaultsMap)) {
    const requested = key in safeCurrent ? Boolean(safeCurrent[key]) : Boolean(defaultValue);
    const implemented = Boolean(catalog[key]?.implemented);
    merged[key] = implemented ? requested : false;
  }

  return merged;
}

function ensureRunLogShape(runLog) {
  return Array.isArray(runLog) ? runLog.slice() : [];
}

function getAgentCatalogUnsafe() {
  return store.projectAutomation?.catalog?.agents || {};
}

function getAutomationCatalogUnsafe() {
  return store.projectAutomation?.catalog?.automations || {};
}

function getEnabledAgentsUnsafe() {
  return store.projectAutomation?.settings?.enabledAgents || {};
}

function getEnabledAutomationsUnsafe() {
  return store.projectAutomation?.settings?.enabledAutomations || {};
}

function makeRunId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `run_${crypto.randomUUID()}`;
  }

  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function coerceTimestamp(value, fallback = Date.now()) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function cloneDetails(details) {
  if (!details || typeof details !== "object") return null;

  try {
    if (typeof structuredClone === "function") {
      return structuredClone(details);
    }
  } catch {
    // ignore and fallback
  }

  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    return null;
  }
}

function sortCatalogItems(items) {
  return items.slice().sort((a, b) => {
    const aOrder = Number.isFinite(a?.order) ? a.order : 9999;
    const bOrder = Number.isFinite(b?.order) ? b.order : 9999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a?.label || "").localeCompare(String(b?.label || ""), "fr");
  });
}

export function ensureProjectAutomationDefaults() {
  const current = ensureObject(store.projectAutomation);

  const agentsCatalog = mergeCatalog(
    cloneCatalog(DEFAULT_AGENT_CATALOG),
    current.catalog?.agents
  );

  const automationsCatalog = mergeCatalog(
    cloneCatalog(DEFAULT_AUTOMATION_CATALOG),
    current.catalog?.automations
  );

  const defaultEnabledAgents = buildDefaultEnabledMap(agentsCatalog);
  const defaultEnabledAutomations = buildDefaultEnabledMap(automationsCatalog);

  store.projectAutomation = {
    catalog: {
      agents: agentsCatalog,
      automations: automationsCatalog
    },
    settings: {
      enabledAgents: mergeSettings(
        defaultEnabledAgents,
        current.settings?.enabledAgents,
        agentsCatalog
      ),
      enabledAutomations: mergeSettings(
        defaultEnabledAutomations,
        current.settings?.enabledAutomations,
        automationsCatalog
      )
    },
    runLog: ensureRunLogShape(current.runLog)
  };

  return store.projectAutomation;
}

export function getProjectAutomationState() {
  return ensureProjectAutomationDefaults();
}

export function getAgentCatalog() {
  ensureProjectAutomationDefaults();
  return getAgentCatalogUnsafe();
}

export function getAutomationCatalog() {
  ensureProjectAutomationDefaults();
  return getAutomationCatalogUnsafe();
}

export function getAgentCatalogList() {
  return sortCatalogItems(Object.values(getAgentCatalog()));
}

export function getAutomationCatalogList() {
  return sortCatalogItems(Object.values(getAutomationCatalog()));
}

export function isAgentImplemented(agentKey) {
  return Boolean(getAgentCatalog()[agentKey]?.implemented);
}

export function isAgentAvailable(agentKey) {
  return Boolean(getAgentCatalog()[agentKey]?.available);
}

export function isAgentEnabled(agentKey) {
  ensureProjectAutomationDefaults();
  return Boolean(getEnabledAgentsUnsafe()[agentKey] && isAgentImplemented(agentKey));
}

export function setAgentEnabled(agentKey, nextValue) {
  ensureProjectAutomationDefaults();

  if (!getAgentCatalog()[agentKey]) return false;
  if (!isAgentImplemented(agentKey)) return false;

  store.projectAutomation.settings.enabledAgents[agentKey] = Boolean(nextValue);
  return true;
}

export function isAutomationImplemented(automationKey) {
  return Boolean(getAutomationCatalog()[automationKey]?.implemented);
}

export function isAutomationAvailable(automationKey) {
  return Boolean(getAutomationCatalog()[automationKey]?.available);
}

export function isAutomationEnabled(automationKey) {
  ensureProjectAutomationDefaults();
  return Boolean(
    getEnabledAutomationsUnsafe()[automationKey] && isAutomationImplemented(automationKey)
  );
}

export function setAutomationEnabled(automationKey, nextValue) {
  ensureProjectAutomationDefaults();

  if (!getAutomationCatalog()[automationKey]) return false;
  if (!isAutomationImplemented(automationKey)) return false;

  store.projectAutomation.settings.enabledAutomations[automationKey] = Boolean(nextValue);
  return true;
}

export function getPrimaryAnalysisAgent() {
  const enabledImplementedAgents = getAgentCatalogList().filter(
    (agent) => agent.implemented && isAgentEnabled(agent.key)
  );

  return enabledImplementedAgents[0] || null;
}

export function shouldAutoRunProjectBaseDataEnrichment() {
  return isAutomationEnabled("autoProjectBaseDataEnrichment");
}

export function shouldAutoRunAnalysisAfterUpload() {
  return Boolean(
    isAutomationEnabled("autoAnalysisAfterUpload") && getPrimaryAnalysisAgent()
  );
}

export function getAnalyzeButtonLabel() {
  return shouldAutoRunAnalysisAfterUpload()
    ? "Analyse automatique activée"
    : "Analyser";
}

export function getRunLogEntries() {
  ensureProjectAutomationDefaults();

  return store.projectAutomation.runLog
    .slice()
    .sort((a, b) => coerceTimestamp(b.startedAt) - coerceTimestamp(a.startedAt));
}

export function startRunLogEntry(payload = {}) {
  ensureProjectAutomationDefaults();

  const startedAt = coerceTimestamp(payload.startedAt, Date.now());

  const entry = {
    id: payload.id || makeRunId(),
    name: payload.name || "Run",
    kind: payload.kind || "analysis",
    agentKey: payload.agentKey || "parasismique",
    triggerType: payload.triggerType || "manual",
    triggerLabel: payload.triggerLabel || "",
    documentName: payload.documentName || "",
    startedAt,
    endedAt: null,
    durationMs: null,
    status: payload.status || "running",
    summary: payload.summary || "",
    details: cloneDetails(payload.details)
  };

  store.projectAutomation.runLog.unshift(entry);
  return entry;
}

export function finishRunLogEntry(runId, patch = {}) {
  ensureProjectAutomationDefaults();

  const entry = store.projectAutomation.runLog.find((item) => item.id === runId);
  if (!entry) return null;

  const endedAt = coerceTimestamp(patch.endedAt, Date.now());
  const startedAt = coerceTimestamp(entry.startedAt, endedAt);
  const durationMs =
    patch.durationMs != null
      ? Number(patch.durationMs)
      : Math.max(0, endedAt - startedAt);

  Object.assign(entry, {
    endedAt,
    durationMs: Number.isFinite(durationMs) ? durationMs : 0,
    status: patch.status || entry.status || "success",
    summary: patch.summary ?? entry.summary ?? ""
  });

  if (patch.name != null) entry.name = patch.name;
  if (patch.kind != null) entry.kind = patch.kind;
  if (patch.agentKey != null) entry.agentKey = patch.agentKey;
  if (patch.triggerType != null) entry.triggerType = patch.triggerType;
  if (patch.triggerLabel != null) entry.triggerLabel = patch.triggerLabel;
  if (patch.documentName != null) entry.documentName = patch.documentName;
  if (patch.details !== undefined) entry.details = cloneDetails(patch.details);

  return entry;
}

export function createRunLogEntry(payload = {}) {
  const entry = startRunLogEntry(payload);

  if (payload.status && payload.status !== "running") {
    return finishRunLogEntry(entry.id, payload);
  }

  return entry;
}

export function getRunMetrics() {
  const entries = getRunLogEntries();
  const completed = entries.filter(
    (entry) => entry.status === "success" || entry.status === "error"
  );
  const successful = entries.filter((entry) => entry.status === "success");
  const durations = completed
    .map((entry) => Number(entry.durationMs))
    .filter((value) => Number.isFinite(value));

  const averageDurationMs = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : null;

  const successRate = entries.length
    ? Math.round((successful.length / entries.length) * 100)
    : null;

  const totalErrors = entries.filter((entry) => entry.status === "error").length;
  const totalAnalyses = entries.filter((entry) => entry.kind === "analysis").length;
  const totalEnrichments = entries.filter((entry) => entry.kind === "enrichment").length;

  return {
    lastRunDurationMs: Number.isFinite(entries[0]?.durationMs) ? entries[0].durationMs : null,
    totalRuns: entries.length,
    totalErrors,
    totalAnalyses,
    totalEnrichments,
    successRate,
    averageDurationMs
  };
}
