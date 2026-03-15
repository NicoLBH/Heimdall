import { store } from "../store.js";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function makeProposalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pr_${crypto.randomUUID()}`;
  }

  return `pr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function coerceString(value, fallback = "") {
  const str = String(value ?? "").trim();
  return str || fallback;
}

export function ensureProjectProposalsState() {
  store.projectProposals = ensureArray(store.projectProposals);
  return store.projectProposals;
}

export function getProjectProposals() {
  return ensureProjectProposalsState().slice();
}

export function createProjectProposal(payload = {}) {
  const proposals = ensureProjectProposalsState();

  const proposal = {
    id: makeProposalId(),
    title: coerceString(payload.title, "Proposition sans titre"),
    fileName: coerceString(payload.fileName, "Fichier"),
    description: coerceString(payload.description, ""),
    status: coerceString(payload.status, "open"),
    needsVisa: payload.needsVisa !== false,
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: payload.updatedAt || "À l'instant"
  };

  proposals.unshift(proposal);
  return proposal;
}
