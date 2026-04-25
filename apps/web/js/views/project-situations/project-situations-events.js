import { bindLightTabs } from "../ui/light-tabs.js";
import { renderProjectSituationDrilldown } from "../project-situation-drilldown.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSelectMenuSection } from "../ui/select-menu.js";
import {
  buildSituationGridColumnWidthsScopeKey,
  getSituationGridColumnCssVariables,
  getSituationGridColumnDefinitions,
  normalizeSituationGridColumnWidths
} from "./project-situations-view-grid.js";

function syncSubmitButtonState(button, { submitting = false, title = "" } = {}) {
  if (!button) return;
  button.disabled = submitting || !String(title || "").trim();
}

function parseCsvList(value) {
  return [...new Set(String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean))];
}

const SITUATION_GRID_KANBAN_OPTIONS = [
  { key: "non_active", label: "Non activé", hint: "Hors de la pile active." },
  { key: "to_activate", label: "À activer", hint: "Prêt à être pris en charge." },
  { key: "in_progress", label: "En cours", hint: "Travail en cours." },
  { key: "in_arbitration", label: "En arbitrage", hint: "Décision en attente." },
  { key: "resolved", label: "Résolu", hint: "Sujet clôturé côté situation." }
];

export function createProjectSituationsEvents({
  store,
  uiState,
  getDefaultCreateForm,
  getSituationEditForm,
  normalizeSituationMode,
  buildCreateSituationPayload,
  rerender,
  refreshSituationsData,
  createSituationRecord,
  updateSituationRecord,
  setSelectedSituationId,
  getSituationById,
  loadSituationSelection,
  loadSituationInsightsData,
  openSituationDrilldownFromSelection,
  setSituationGridKanbanStatus
}) {
  let insightsRequestId = 0;

  function isSituationInsightsDebugEnabled() {
    try {
      return window.localStorage?.getItem("debug:situation-insights") === "1";
    } catch (_) {
      return false;
    }
  }

  function logSituationInsights(message, payload = {}) {
    if (!isSituationInsightsDebugEnabled()) return;
    console.info(`[situation-insights] ${message}`, payload);
  }

  function resolveCurrentProjectId() {
    return String(
      store?.currentProjectId
      || store?.projectForm?.projectId
      || store?.projectForm?.id
      || ""
    ).trim();
  }

  function ensureSituationGridCellDropdownState() {
    if (!uiState.situationGridCellDropdown || typeof uiState.situationGridCellDropdown !== "object") {
      uiState.situationGridCellDropdown = {
        open: false,
        field: "",
        subjectId: "",
        situationId: "",
        anchor: null
      };
    }
    return uiState.situationGridCellDropdown;
  }

  function ensureSituationGridCellDropdownHost() {
    let host = document.getElementById("situationGridCellDropdownHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "situationGridCellDropdownHost";
      host.className = "subject-meta-dropdown-host situation-grid__dropdown-host";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
    }
    return host;
  }

  function closeSituationGridCellDropdown() {
    const state = ensureSituationGridCellDropdownState();
    if (state.anchor?.setAttribute) state.anchor.setAttribute("aria-expanded", "false");
    state.open = false;
    state.field = "";
    state.subjectId = "";
    state.situationId = "";
    state.anchor = null;
    const host = ensureSituationGridCellDropdownHost();
    host.innerHTML = "";
    host.setAttribute("aria-hidden", "true");
  }

  function positionSituationGridCellDropdown() {
    const state = ensureSituationGridCellDropdownState();
    const host = ensureSituationGridCellDropdownHost();
    const anchor = state.anchor;
    if (!state.open || !anchor || !host.firstElementChild) return;
    const rect = anchor.getBoundingClientRect();
    const panel = host.firstElementChild;
    const panelWidth = Math.max(280, panel.offsetWidth || 280);
    const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 1280;
    const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 720;
    const preferredLeft = rect.left;
    const left = Math.max(8, Math.min(preferredLeft, viewportWidth - panelWidth - 8));
    const top = rect.bottom + 6 + window.scrollY;
    panel.style.left = `${left + window.scrollX}px`;
    if (top + (panel.offsetHeight || 0) > viewportHeight + window.scrollY - 8) {
      const fallbackTop = Math.max(window.scrollY + 8, rect.top + window.scrollY - (panel.offsetHeight || 0) - 6);
      panel.style.top = `${fallbackTop}px`;
    } else {
      panel.style.top = `${top}px`;
    }
  }

  function renderSituationGridKanbanDropdown({ subjectId = "", situationId = "" } = {}) {
    const currentStatus = String(store?.situationsView?.kanbanStatusBySituationId?.[situationId]?.[subjectId] || "non_active").trim().toLowerCase();
    const items = SITUATION_GRID_KANBAN_OPTIONS.map((option) => ({
      key: option.key,
      title: option.label,
      metaHtml: escapeHtml(option.hint),
      isSelected: option.key === currentStatus,
      rightHtml: option.key === currentStatus ? svgIcon("check", { className: "octicon octicon-check" }) : "",
      dataAttrs: {
        "situation-grid-dropdown-action": "set-kanban",
        "situation-grid-status": option.key
      }
    }));
    return `
      <div class="subject-meta-dropdown subject-kanban-dropdown situation-grid__dropdown-panel gh-menu gh-menu--open" role="menu" aria-label="Modifier le statut kanban">
        <div class="subject-meta-dropdown__title">Statut kanban</div>
        <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
        <div class="subject-meta-dropdown__body">
          ${renderSelectMenuSection({ items })}
        </div>
      </div>
    `;
  }

  function renderSituationGridTodoDropdown(title = "") {
    return `
      <div class="subject-meta-dropdown situation-grid__dropdown-panel gh-menu gh-menu--open" role="menu" aria-label="${escapeHtml(title)}">
        <div class="subject-meta-dropdown__title">${escapeHtml(title)}</div>
        <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
        <div class="subject-meta-dropdown__body">
          <div class="select-menu__section">
            <div class="select-menu__section-body">
              <div class="select-menu__empty">
                <div class="select-menu__empty-title">TODO explicite</div>
                <div class="select-menu__empty-hint">Édition non branchée ici pour éviter d'inventer une API.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function openSituationGridCellDropdown({ field = "", anchor = null, subjectId = "", situationId = "" } = {}) {
    if (!anchor) return;
    const state = ensureSituationGridCellDropdownState();
    const host = ensureSituationGridCellDropdownHost();
    closeSituationGridCellDropdown();
    state.open = true;
    state.field = String(field || "").trim().toLowerCase();
    state.subjectId = String(subjectId || "").trim();
    state.situationId = String(situationId || "").trim();
    state.anchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
    if (state.field === "kanban") {
      host.innerHTML = renderSituationGridKanbanDropdown({ subjectId: state.subjectId, situationId: state.situationId });
    } else if (state.field === "labels") {
      host.innerHTML = renderSituationGridTodoDropdown("Labels");
    } else if (state.field === "objectives") {
      host.innerHTML = renderSituationGridTodoDropdown("Objectifs");
    } else if (state.field === "assignees") {
      host.innerHTML = renderSituationGridTodoDropdown("Assignés");
    } else {
      host.innerHTML = "";
    }
    if (!host.innerHTML) {
      closeSituationGridCellDropdown();
      return;
    }
    host.setAttribute("aria-hidden", "false");
    positionSituationGridCellDropdown();
  }

  function patchSituationGridKanbanCell({ root, subjectId = "", situationId = "" } = {}) {
    if (!root || !subjectId || !situationId) return;
    const trigger = [...root.querySelectorAll('[data-situation-grid-edit-cell="kanban"]')]
      .find((node) => String(node.getAttribute("data-situation-grid-subject-id") || "").trim() === subjectId
        && String(node.getAttribute("data-situation-grid-situation-id") || "").trim() === situationId);
    if (!trigger) return;
    const nextStatus = String(store?.situationsView?.kanbanStatusBySituationId?.[situationId]?.[subjectId] || "non_active").trim().toLowerCase();
    const option = SITUATION_GRID_KANBAN_OPTIONS.find((entry) => entry.key === nextStatus) || SITUATION_GRID_KANBAN_OPTIONS[0];
    const badge = trigger.querySelector(".subject-kanban-badge");
    if (!badge) return;
    badge.textContent = option.label;
  }

  function showSituationGridInlineError(root, message = "") {
    const grid = root?.querySelector?.(".situation-grid");
    if (!grid) return;
    const text = String(message || "").trim() || "Mise à jour impossible.";
    let node = grid.querySelector(".situation-grid__inline-error");
    if (!node) {
      node = document.createElement("div");
      node.className = "settings-inline-error situation-grid__inline-error";
      grid.prepend(node);
    }
    node.textContent = text;
    window.setTimeout(() => {
      node?.remove();
    }, 3500);
  }

  function getGridColumnStorageKey(scopeKey = "") {
    return scopeKey ? `mdall:situation-grid:column-widths:${scopeKey}` : "";
  }

  function readStoredGridColumnWidths(scopeKey = "") {
    const storageKey = getGridColumnStorageKey(scopeKey);
    if (!storageKey) return null;
    try {
      const raw = window.localStorage?.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function persistGridColumnWidths(scopeKey = "", widths = {}) {
    const storageKey = getGridColumnStorageKey(scopeKey);
    if (!storageKey) return;
    try {
      window.localStorage?.setItem(storageKey, JSON.stringify(widths));
    } catch (_) {
      // No-op: localStorage may be blocked in private contexts.
    }
  }

  function ensureGridColumnWidthsByScope() {
    if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
    if (!store.situationsView.gridColumnWidthsByScope || typeof store.situationsView.gridColumnWidthsByScope !== "object") {
      store.situationsView.gridColumnWidthsByScope = {};
    }
    return store.situationsView.gridColumnWidthsByScope;
  }

  function applyGridColumnWidthsToNode(gridNode, widths = {}) {
    if (!gridNode || !gridNode.style) return;
    const cssVars = getSituationGridColumnCssVariables(widths);
    Object.entries(cssVars).forEach(([name, value]) => {
      gridNode.style.setProperty(name, value);
    });
  }

  function hydrateSituationGridColumnWidths(gridNode) {
    if (!gridNode) return;
    const situationId = String(gridNode.getAttribute("data-situation-grid") || "").trim();
    if (!situationId) return;
    const projectId = String(gridNode.getAttribute("data-situation-grid-project-id") || "").trim() || resolveCurrentProjectId();
    const scopeKey = String(gridNode.getAttribute("data-situation-grid-scope") || "").trim()
      || buildSituationGridColumnWidthsScopeKey(projectId, situationId);
    const byScope = ensureGridColumnWidthsByScope();
    const fromStore = byScope[scopeKey] && typeof byScope[scopeKey] === "object" ? byScope[scopeKey] : null;
    const fromStorage = readStoredGridColumnWidths(scopeKey);
    const normalized = normalizeSituationGridColumnWidths(fromStore || fromStorage || {});
    byScope[scopeKey] = normalized;
    applyGridColumnWidthsToNode(gridNode, normalized);
    if (!gridNode.getAttribute("data-situation-grid-scope")) {
      gridNode.setAttribute("data-situation-grid-scope", scopeKey);
    }
  }

  function bindSituationGridColumnResize(root) {
    const columnsByKey = new Map(getSituationGridColumnDefinitions().map((column) => [column.key, column]));
    root.querySelectorAll(".situation-grid[data-situation-grid]").forEach((gridNode) => {
      hydrateSituationGridColumnWidths(gridNode);
      gridNode.querySelectorAll("[data-situation-grid-resize-handle]").forEach((handle) => {
        handle.addEventListener("pointerdown", (event) => {
          const target = event.currentTarget;
          const columnKey = String(target?.getAttribute("data-situation-grid-resize-handle") || "").trim();
          const columnMeta = columnsByKey.get(columnKey);
          if (!columnMeta) return;

          const scopeKey = String(gridNode.getAttribute("data-situation-grid-scope") || "").trim();
          const byScope = ensureGridColumnWidthsByScope();
          const scopedWidths = normalizeSituationGridColumnWidths(byScope[scopeKey] || {});
          byScope[scopeKey] = scopedWidths;
          const startX = Number(event.clientX) || 0;
          const initialWidth = Number(scopedWidths[columnKey]) || columnMeta.minWidth;

          const onPointerMove = (moveEvent) => {
            const pointerX = Number(moveEvent.clientX) || 0;
            const nextWidth = Math.max(columnMeta.minWidth, Math.round(initialWidth + (pointerX - startX)));
            scopedWidths[columnKey] = nextWidth;
            applyGridColumnWidthsToNode(gridNode, scopedWidths);
          };

          const onPointerUp = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerUp);
            byScope[scopeKey] = normalizeSituationGridColumnWidths(scopedWidths);
            persistGridColumnWidths(scopeKey, byScope[scopeKey]);
          };

          event.preventDefault();
          event.stopPropagation();
          window.addEventListener("pointermove", onPointerMove);
          window.addEventListener("pointerup", onPointerUp);
          window.addEventListener("pointercancel", onPointerUp);
        });
      });
    });
  }

  function bindSituationGridEditableCells(root) {
    root.querySelectorAll("[data-situation-grid-edit-cell]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const field = String(node.getAttribute("data-situation-grid-edit-cell") || "").trim().toLowerCase();
        const subjectId = String(node.getAttribute("data-situation-grid-subject-id") || "").trim();
        const situationId = String(node.getAttribute("data-situation-grid-situation-id") || store?.situationsView?.selectedSituationId || "").trim();
        if (!field || !subjectId) return;
        const dropdownState = ensureSituationGridCellDropdownState();
        if (dropdownState.open
          && dropdownState.field === field
          && dropdownState.subjectId === subjectId
          && dropdownState.situationId === situationId) {
          closeSituationGridCellDropdown();
          return;
        }
        openSituationGridCellDropdown({ field, anchor: node, subjectId, situationId });
      });
    });

    const host = ensureSituationGridCellDropdownHost();
    if (host.dataset.situationGridDropdownBound !== "true") {
      host.dataset.situationGridDropdownBound = "true";
      host.addEventListener("click", async (event) => {
        const actionNode = event.target.closest("[data-situation-grid-dropdown-action]");
        if (!actionNode) return;
        const action = String(actionNode.getAttribute("data-situation-grid-dropdown-action") || "").trim();
        if (action !== "set-kanban") return;
        const state = ensureSituationGridCellDropdownState();
        if (state.field !== "kanban" || !state.subjectId || !state.situationId) return;
        const nextStatus = String(actionNode.getAttribute("data-situation-grid-status") || "").trim();
        const previousStatus = String(store?.situationsView?.kanbanStatusBySituationId?.[state.situationId]?.[state.subjectId] || "non_active").trim().toLowerCase();
        if (!nextStatus || nextStatus === previousStatus) {
          closeSituationGridCellDropdown();
          return;
        }
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        store.situationsView.kanbanStatusBySituationId = {
          ...(store.situationsView.kanbanStatusBySituationId || {}),
          [state.situationId]: {
            ...((store.situationsView.kanbanStatusBySituationId || {})[state.situationId] || {}),
            [state.subjectId]: nextStatus
          }
        };
        patchSituationGridKanbanCell({ root, subjectId: state.subjectId, situationId: state.situationId });
        closeSituationGridCellDropdown();
        try {
          await setSituationGridKanbanStatus?.(state.situationId, state.subjectId, nextStatus);
        } catch (error) {
          store.situationsView.kanbanStatusBySituationId = {
            ...(store.situationsView.kanbanStatusBySituationId || {}),
            [state.situationId]: {
              ...((store.situationsView.kanbanStatusBySituationId || {})[state.situationId] || {}),
              [state.subjectId]: previousStatus
            }
          };
          patchSituationGridKanbanCell({ root, subjectId: state.subjectId, situationId: state.situationId });
          console.error("situation grid kanban update failed", error);
          showSituationGridInlineError(root, error instanceof Error ? error.message : "La mise à jour du statut kanban a échoué.");
        }
      });
    }

    if (document.body.dataset.situationGridDropdownGlobalBound !== "true") {
      document.body.dataset.situationGridDropdownGlobalBound = "true";
      document.addEventListener("click", (event) => {
        const hostNode = ensureSituationGridCellDropdownHost();
        const state = ensureSituationGridCellDropdownState();
        if (!state.open) return;
        const target = event.target;
        if (hostNode.contains(target)) return;
        if (state.anchor && state.anchor.contains(target)) return;
        closeSituationGridCellDropdown();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!ensureSituationGridCellDropdownState().open) return;
        event.preventDefault();
        closeSituationGridCellDropdown();
      });
      window.addEventListener("resize", () => {
        positionSituationGridCellDropdown();
      }, { passive: true });
      window.addEventListener("scroll", () => {
        positionSituationGridCellDropdown();
      }, { passive: true });
    }
  }

  async function refreshInsightsData(root) {
    const situationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituation = getSituationById(situationId);
    if (!selectedSituation) return;

    const requestId = ++insightsRequestId;
    uiState.insightsLoading = true;
    uiState.insightsError = "";
    rerender(root);

    const startedAt = Date.now();
    logSituationInsights("load:start", { situationId, range: uiState.insightsRange });
    try {
      const insightsData = await loadSituationInsightsData(selectedSituation, { range: uiState.insightsRange });
      if (requestId !== insightsRequestId) return;
      uiState.insightsData = insightsData;
      uiState.insightsSituationId = situationId;
      uiState.insightsLoading = false;
      uiState.insightsError = "";
      logSituationInsights("load:success", {
        situationId,
        range: uiState.insightsRange,
        durationMs: Date.now() - startedAt
      });
      rerender(root);
    } catch (error) {
      if (requestId !== insightsRequestId) return;
      uiState.insightsLoading = false;
      uiState.insightsError = error instanceof Error ? error.message : "Impossible de charger les indicateurs.";
      logSituationInsights("load:error", {
        situationId,
        range: uiState.insightsRange,
        durationMs: Date.now() - startedAt,
        error: uiState.insightsError
      });
      rerender(root);
    }
  }
  function buildEditSituationPayload() {
    const form = uiState.editForm || getDefaultCreateForm();
    const mode = normalizeSituationMode(form.mode);
    const status = [
      form.automaticStatusOpen ? "open" : "",
      form.automaticStatusClosed ? "closed" : ""
    ].filter(Boolean);
    const priorities = [
      form.automaticPriorityLow ? "low" : "",
      form.automaticPriorityMedium ? "medium" : "",
      form.automaticPriorityHigh ? "high" : "",
      form.automaticPriorityCritical ? "critical" : ""
    ].filter(Boolean);

    return {
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      status: String(form.status || "open") === "closed" ? "closed" : "open",
      filter_definition: mode === "automatic"
        ? {
            status,
            priorities,
            objectiveIds: parseCsvList(form.automaticObjectiveIds),
            labelIds: parseCsvList(form.automaticLabelIds),
            assigneeIds: parseCsvList(form.automaticAssigneeIds),
            blockedOnly: Boolean(form.automaticBlockedOnly)
          }
        : null
    };
  }

  function openCreateModal(root) {
    uiState.createModalOpen = true;
    uiState.createSubmitting = false;
    uiState.createError = "";
    uiState.createForm = getDefaultCreateForm();
    rerender(root);
    syncSubmitButtonState(document.getElementById("projectCreateSituationSubmit"), {
      submitting: uiState.createSubmitting,
      title: uiState.createForm.title
    });
  }

  function closeCreateModal(root) {
    uiState.createModalOpen = false;
    uiState.createSubmitting = false;
    uiState.createError = "";
    rerender(root);
  }

  function openEditPanel(root, situationId) {
    const selectedSituation = getSituationById(situationId || store.situationsView?.selectedSituationId);
    if (!selectedSituation) return;
    uiState.editPanelOpen = true;
    uiState.insightsPanelOpen = false;
    uiState.editSubmitting = false;
    uiState.editError = "";
    uiState.editForm = getSituationEditForm(selectedSituation);
    rerender(root);
  }

  function closeEditPanel(root) {
    uiState.editPanelOpen = false;
    uiState.editSubmitting = false;
    uiState.editError = "";
    rerender(root);
  }

  function openInsightsPanel(root) {
    const situationId = String(store.situationsView?.selectedSituationId || "").trim();
    uiState.insightsPanelOpen = true;
    uiState.editPanelOpen = false;
    const hasFreshData = Boolean(uiState.insightsData && uiState.insightsSituationId === situationId);
    uiState.insightsLoading = !hasFreshData;
    if (!hasFreshData) {
      uiState.insightsError = "";
      uiState.insightsData = null;
      uiState.insightsSituationId = "";
    }
    rerender(root);
    if (!hasFreshData) {
      refreshInsightsData(root).catch(() => undefined);
    }
  }

  function closeInsightsPanel(root) {
    uiState.insightsPanelOpen = false;
    rerender(root);
  }

  async function submitCreateSituation(root) {
    const payload = buildCreateSituationPayload();
    if (!String(payload.title || "").trim()) {
      uiState.createError = "Le titre est obligatoire.";
      rerender(root);
      return;
    }

    uiState.createSubmitting = true;
    uiState.createError = "";
    rerender(root);

    try {
      const created = await createSituationRecord(payload);
      setSelectedSituationId(created?.id || null);
      uiState.createModalOpen = false;
      uiState.createSubmitting = false;
      uiState.createForm = getDefaultCreateForm();
      await refreshSituationsData(root, { forceSubjects: false });
    } catch (error) {
      console.error("createSituation failed", error);
      uiState.createSubmitting = false;
      uiState.createError = error instanceof Error ? error.message : "La création de la situation a échoué.";
      rerender(root);
    }
  }

  async function submitEditSituation(root) {
    const situationId = String(store.situationsView?.selectedSituationId || "").trim();
    const payload = buildEditSituationPayload();

    if (!String(payload.title || "").trim()) {
      uiState.editError = "Le titre est obligatoire.";
      rerender(root);
      return;
    }
    if (!situationId) {
      uiState.editError = "Impossible d'identifier la situation à modifier.";
      rerender(root);
      return;
    }

    uiState.editSubmitting = true;
    uiState.editError = "";
    rerender(root);

    try {
      await updateSituationRecord(situationId, payload);
      await refreshSituationsData(root, { forceSubjects: false });
      uiState.editPanelOpen = false;
      uiState.editSubmitting = false;
      uiState.editError = "";
      await loadSituationSelection(situationId);
      rerender(root);
    } catch (error) {
      console.error("updateSituation failed", error);
      uiState.editSubmitting = false;
      uiState.editError = error instanceof Error ? error.message : "La mise à jour de la situation a échoué.";
      rerender(root);
    }
  }

  function bindCreateModalEvents(root) {
    const modal = document.getElementById("projectCreateSituationModal");
    if (!modal) return;

    modal.querySelectorAll("[data-close-project-situation-modal]").forEach((node) => {
      node.addEventListener("click", () => closeCreateModal(root));
    });

    modal.querySelectorAll("[data-situation-create-field]").forEach((field) => {
      field.addEventListener("input", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-create-field") || "").trim();
        if (!key) return;
        uiState.createForm[key] = event.currentTarget.value;
        uiState.createError = "";
        syncSubmitButtonState(modal.querySelector("#projectCreateSituationSubmit"), {
          submitting: uiState.createSubmitting,
          title: uiState.createForm.title
        });
      });
    });

    modal.querySelectorAll('input[name="situationCreateMode"]').forEach((field) => {
      field.addEventListener("change", (event) => {
        uiState.createForm.mode = event.currentTarget.value === "automatic" ? "automatic" : "manual";
        uiState.createError = "";
        rerender(root);
      });
    });

    modal.querySelectorAll("[data-situation-create-checkbox]").forEach((field) => {
      field.addEventListener("change", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-create-checkbox") || "").trim();
        if (!key) return;
        uiState.createForm[key] = !!event.currentTarget.checked;
        uiState.createError = "";
      });
    });

    modal.querySelector("#projectCreateSituationSubmit")?.addEventListener("click", async () => {
      await submitCreateSituation(root);
    });

    modal.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitCreateSituation(root);
    });
  }

  function bindEditPanelEvents(root) {
    root.querySelectorAll("[data-open-situation-edit]").forEach((node) => {
      node.addEventListener("click", () => {
        const situationId = String(node.getAttribute("data-open-situation-edit") || "").trim();
        openEditPanel(root, situationId);
      });
    });

    root.querySelectorAll("[data-close-situation-edit]").forEach((node) => {
      node.addEventListener("click", () => closeEditPanel(root));
    });

    root.querySelectorAll("[data-open-situation-insights]").forEach((node) => {
      node.addEventListener("click", () => openInsightsPanel(root));
    });

    root.querySelectorAll("[data-close-situation-insights]").forEach((node) => {
      node.addEventListener("click", () => closeInsightsPanel(root));
    });

    root.querySelectorAll("[data-situation-insights-range]").forEach((node) => {
      node.addEventListener("click", async () => {
        if (String(uiState.insightsActiveChart || "burnup") !== "burnup") return;
        const nextRange = String(node.getAttribute("data-situation-insights-range") || "").trim().toLowerCase();
        if (!nextRange || uiState.insightsRange === nextRange) return;
        uiState.insightsRange = nextRange;
        await refreshInsightsData(root);
      });
    });

    root.querySelectorAll("[data-situation-insights-chart]").forEach((node) => {
      node.addEventListener("click", async () => {
        const nextChart = String(node.getAttribute("data-situation-insights-chart") || "").trim().toLowerCase();
        if (!["burnup", "labels", "objectives"].includes(nextChart)) return;
        if (uiState.insightsActiveChart === nextChart) return;
        uiState.insightsActiveChart = nextChart;
        rerender(root);
        const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
        const hasFreshData = uiState.insightsSituationId === selectedSituationId;
        const missingData = (
          !hasFreshData
          || (nextChart === "burnup" && !uiState.insightsData?.burnup)
          || (nextChart === "labels" && !uiState.insightsData?.labels)
          || (nextChart === "objectives" && !uiState.insightsData?.objectives)
        );
        if (!uiState.insightsLoading && missingData) {
          await refreshInsightsData(root);
        }
      });
    });

    root.querySelectorAll("[data-situation-edit-field]").forEach((field) => {
      field.addEventListener("input", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-edit-field") || "").trim();
        if (!key) return;
        uiState.editForm[key] = event.currentTarget.value;
        uiState.editError = "";
        syncSubmitButtonState(root.querySelector("#projectEditSituationSubmit"), {
          submitting: uiState.editSubmitting,
          title: uiState.editForm.title
        });
      });
    });

    root.querySelectorAll('input[name="situationEditStatus"]').forEach((field) => {
      field.addEventListener("change", (event) => {
        uiState.editForm.status = event.currentTarget.value === "closed" ? "closed" : "open";
        uiState.editError = "";
      });
    });

    root.querySelectorAll("[data-situation-edit-checkbox]").forEach((field) => {
      field.addEventListener("change", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-edit-checkbox") || "").trim();
        if (!key) return;
        uiState.editForm[key] = !!event.currentTarget.checked;
        uiState.editError = "";
      });
    });

    root.querySelector("#projectEditSituationSubmit")?.addEventListener("click", async () => {
      await submitEditSituation(root);
    });
  }

  function bindEvents(root) {
    const openButton = root.querySelector("#openCreateSituationButton");
    if (openButton) {
      openButton.onclick = () => openCreateModal(root);
    }

    root.querySelectorAll("[data-open-situation-drilldown]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
        if (!selectedSituationId) return;
        const selectedSituation = getSituationById(selectedSituationId);
        if (!selectedSituation) return;

        if (typeof openSituationDrilldownFromSelection === "function") {
          openSituationDrilldownFromSelection(selectedSituationId, { context: "situation", variant: "situation-kanban" });
        }

        const drilldownBody = document.getElementById("drilldownBody");
        if (!drilldownBody) return;
        drilldownBody.innerHTML = renderProjectSituationDrilldown(selectedSituation, {
          closeButtonId: "projectSituationDrilldownClose"
        });

        drilldownBody.querySelector("#projectSituationDrilldownClose")?.addEventListener("click", () => {
          document.getElementById("drilldownClose")?.click();
        });

        drilldownBody.querySelector(".project-situation-drilldown__section-action")?.addEventListener("click", () => {
          openEditPanel(root, selectedSituationId);
        });
      });
    });

    root.querySelectorAll("button[data-open-situation]").forEach((node) => {
      node.addEventListener("click", async () => {
        const situationId = String(node.getAttribute("data-open-situation") || "").trim();
        if (!situationId) return;
        setSelectedSituationId(situationId);
        uiState.editPanelOpen = false;
        uiState.insightsPanelOpen = false;
        uiState.insightsLoading = false;
        uiState.insightsError = "";
        uiState.insightsData = null;
        uiState.insightsSituationId = "";
        const loadingPromise = loadSituationSelection(situationId);
        rerender(root);
        await loadingPromise;
        rerender(root);
      });
    });

    root.querySelectorAll("[data-situations-status-filter]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        const value = String(node.getAttribute("data-situations-status-filter") || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        if (!store.situationsView.filters || typeof store.situationsView.filters !== "object") {
          store.situationsView.filters = { status: value };
        }
        store.situationsView.situationsStatusFilter = value;
        store.situationsView.filters.status = value;
        rerender(root);
      });
    });

    bindLightTabs(root, {
      selector: ".project-situation-layout-tabs [data-light-tab-target]",
      onChange: (nextTabId) => {
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        const normalizedTabId = String(nextTabId || "").trim().toLowerCase();
        const resolvedTabId = normalizedTabId === "planning" ? "roadmap" : normalizedTabId;
        const nextLayout = ["grille", "tableau", "roadmap"].includes(resolvedTabId) ? resolvedTabId : "tableau";
        if (store.situationsView.selectedSituationLayout === nextLayout) return;
        store.situationsView.selectedSituationLayout = nextLayout;
        rerender(root);
      }
    });

    root.querySelectorAll("[data-situation-grid-toggle]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(node.getAttribute("data-situation-grid-toggle") || "").trim();
        const situationId = String(node.getAttribute("data-situation-grid-situation-id") || "").trim();
        if (!subjectId || !situationId) return;
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        if (!store.situationsView.gridExpandedSubjectIdsBySituationId || typeof store.situationsView.gridExpandedSubjectIdsBySituationId !== "object") {
          store.situationsView.gridExpandedSubjectIdsBySituationId = {};
        }
        const currentValues = store.situationsView.gridExpandedSubjectIdsBySituationId[situationId];
        const expandedSet = new Set(
          Array.isArray(currentValues)
            ? currentValues.map((value) => String(value || "").trim()).filter(Boolean)
            : []
        );
        if (expandedSet.has(subjectId)) expandedSet.delete(subjectId);
        else expandedSet.add(subjectId);
        store.situationsView.gridExpandedSubjectIdsBySituationId[situationId] = [...expandedSet];
        rerender(root);
      });
    });

    bindSituationGridColumnResize(root);
    bindSituationGridEditableCells(root);

    bindCreateModalEvents(root);
    bindEditPanelEvents(root);
  }

  return {
    openCreateModal,
    closeCreateModal,
    submitCreateSituation,
    bindEvents
  };
}
