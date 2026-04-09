import { store } from "../../store.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  syncProjectPhasesFromSupabase,
  persistProjectPhaseDatesToSupabase
} from "../../services/project-supabase-sync.js";
import {
  formatSharedDateInputValue,
  parseSharedDateInputValue,
  renderSharedDatePicker,
  shiftSharedCalendarMonth,
  toSharedDateInputValue
} from "../ui/shared-date-picker.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  rerenderProjectParametres,
  getParametresUiState
} from "./project-parametres-core.js";

function ensurePhasesUiState() {
  const parametresUiState = getParametresUiState();

  if (typeof parametresUiState.projectPhasesLoading !== "boolean") {
    parametresUiState.projectPhasesLoading = false;
  }
  if (typeof parametresUiState.projectPhasesLoadedProjectKey !== "string") {
    parametresUiState.projectPhasesLoadedProjectKey = "";
  }
  if (typeof parametresUiState.projectPhasesLoaded !== "boolean") {
    parametresUiState.projectPhasesLoaded = false;
  }
  if (typeof parametresUiState.projectPhasesEditing !== "boolean") {
    parametresUiState.projectPhasesEditing = false;
  }
  if (typeof parametresUiState.projectPhasesSubmitting !== "boolean") {
    parametresUiState.projectPhasesSubmitting = false;
  }
  if (typeof parametresUiState.projectPhasesError !== "string") {
    parametresUiState.projectPhasesError = "";
  }
  if (!parametresUiState.projectPhaseDateDrafts || typeof parametresUiState.projectPhaseDateDrafts !== "object") {
    parametresUiState.projectPhaseDateDrafts = {};
  }
  if (!parametresUiState.projectPhaseDateOriginals || typeof parametresUiState.projectPhaseDateOriginals !== "object") {
    parametresUiState.projectPhaseDateOriginals = {};
  }
  if (typeof parametresUiState.projectPhaseDateOpenPickerCode !== "string") {
    parametresUiState.projectPhaseDateOpenPickerCode = "";
  }
  if (!parametresUiState.projectPhaseDateCalendarViews || typeof parametresUiState.projectPhaseDateCalendarViews !== "object") {
    parametresUiState.projectPhaseDateCalendarViews = {};
  }

  return parametresUiState;
}

function getProjectPhasesCatalog() {
  const phases = Array.isArray(store.projectForm.phasesCatalog)
    ? store.projectForm.phasesCatalog
    : [];

  return phases.map((item) => ({
    code: String(item?.code || "").trim(),
    label: String(item?.label || "").trim(),
    enabled: item?.enabled !== false,
    phaseDate: String(item?.phaseDate || item?.phase_date || "").trim()
  })).filter((item) => item.code && item.label);
}

function getEnabledProjectPhases() {
  return getProjectPhasesCatalog().filter((item) => item.enabled);
}

function formatPhaseDateDisplay(value = "") {
  const date = parseSharedDateInputValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getPhaseDateDraftValue(code = "", fallbackValue = "") {
  const parametresUiState = ensurePhasesUiState();
  const draftValue = parametresUiState.projectPhaseDateDrafts?.[code];
  return typeof draftValue === "string" ? draftValue : String(fallbackValue || "").trim();
}

function syncPhaseDateCalendarView(code = "", rawValue = "") {
  const parametresUiState = ensurePhasesUiState();
  const existingView = parametresUiState.projectPhaseDateCalendarViews?.[code];
  if (existingView && Number.isFinite(existingView.year) && Number.isFinite(existingView.month)) {
    return existingView;
  }

  const selectedDate = parseSharedDateInputValue(rawValue);
  const fallback = selectedDate || new Date();
  const nextView = {
    year: fallback.getFullYear(),
    month: fallback.getMonth()
  };
  parametresUiState.projectPhaseDateCalendarViews[code] = nextView;
  return nextView;
}

function startProjectPhaseDateEdition() {
  const parametresUiState = ensurePhasesUiState();
  const catalog = getProjectPhasesCatalog();

  parametresUiState.projectPhasesEditing = true;
  parametresUiState.projectPhasesSubmitting = false;
  parametresUiState.projectPhasesError = "";
  parametresUiState.projectPhaseDateOpenPickerCode = "";
  parametresUiState.projectPhaseDateOriginals = Object.fromEntries(
    catalog.map((item) => [item.code, item.phaseDate || ""])
  );
  parametresUiState.projectPhaseDateDrafts = Object.fromEntries(
    catalog.map((item) => [item.code, item.phaseDate || ""])
  );
  parametresUiState.projectPhaseDateCalendarViews = {};
}

function cancelProjectPhaseDateEdition() {
  const parametresUiState = ensurePhasesUiState();
  parametresUiState.projectPhasesEditing = false;
  parametresUiState.projectPhasesSubmitting = false;
  parametresUiState.projectPhasesError = "";
  parametresUiState.projectPhaseDateOpenPickerCode = "";
  parametresUiState.projectPhaseDateDrafts = {};
  parametresUiState.projectPhaseDateOriginals = {};
  parametresUiState.projectPhaseDateCalendarViews = {};
}

async function submitProjectPhaseDates() {
  const parametresUiState = ensurePhasesUiState();
  if (parametresUiState.projectPhasesSubmitting) return;

  parametresUiState.projectPhasesSubmitting = true;
  parametresUiState.projectPhasesError = "";
  rerenderProjectParametres();

  try {
    await persistProjectPhaseDatesToSupabase(parametresUiState.projectPhaseDateDrafts);
    cancelProjectPhaseDateEdition();
  } catch (error) {
    parametresUiState.projectPhasesSubmitting = false;
    parametresUiState.projectPhasesError = error instanceof Error ? error.message : String(error || "Erreur de mise à jour des dates de phases");
  }

  rerenderProjectParametres();
}

function renderProjectPhaseDateControl(item) {
  const parametresUiState = ensurePhasesUiState();
  const code = String(item?.code || "").trim();
  const phaseDate = getPhaseDateDraftValue(code, item?.phaseDate || "");

  if (!parametresUiState.projectPhasesEditing) {
    return `<span class="settings-phase-date-text">${escapeHtml(formatPhaseDateDisplay(item?.phaseDate || ""))}</span>`;
  }

  const pickerId = `projectPhaseDate-${code}`;
  const selectedDate = parseSharedDateInputValue(phaseDate);
  const calendarView = syncPhaseDateCalendarView(code, phaseDate);

  return `
    <div class="settings-phase-date-picker" data-project-phase-date-picker-wrap>
      ${renderSharedDatePicker({
        idBase: pickerId,
        value: phaseDate,
        selectedDate,
        viewYear: calendarView.year,
        viewMonth: calendarView.month,
        isOpen: parametresUiState.projectPhaseDateOpenPickerCode === code,
        placeholder: "Sélectionner une date",
        inputLabel: formatSharedDateInputValue(selectedDate) || "Sélectionner une date",
        calendarLabel: `Sélectionner une date pour la phase ${code}`
      })}
    </div>
  `;
}

function renderProjectPhasesCard() {
  const items = getProjectPhasesCatalog();
  const parametresUiState = ensurePhasesUiState();

  if (parametresUiState.projectPhasesLoading && !items.length) {
    return '<div class="settings-empty-note settings-empty-note--card">Chargement des phases…</div>';
  }

  if (!items.length) {
    return '<div class="settings-empty-note settings-empty-note--card">Aucune phase disponible pour ce projet.</div>';
  }

  return `
    <div class="settings-features-card settings-features-card--phases">
      <div class="settings-features-card__title">Phases disponibles</div>
      <div class="settings-features-list">
        ${items.map((item) => {
          const inputId = `projectPhaseToggle_${item.code}`;
          return `
            <div class="settings-feature-row settings-feature-row--phase">
              <div class="settings-feature-row__control">
                <input
                  id="${escapeHtml(inputId)}"
                  type="checkbox"
                  data-project-phase-toggle="${escapeHtml(item.code)}"
                  ${item.enabled ? "checked" : ""}
                >
              </div>
              <label class="settings-feature-row__body settings-feature-row__body--phase" for="${escapeHtml(inputId)}">
                <div class="settings-feature-row__label">
                  ${escapeHtml(item.code)} - ${escapeHtml(item.label)}
                </div>
              </label>
              <div class="settings-feature-row__aside settings-feature-row__aside--phase">
                ${renderProjectPhaseDateControl(item)}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function bindProjectPhaseToggles() {
  document.querySelectorAll("[data-project-phase-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const code = event.target.getAttribute("data-project-phase-toggle");
      if (!code || !Array.isArray(store.projectForm.phasesCatalog)) return;

      const item = store.projectForm.phasesCatalog.find((phase) => phase.code === code);
      if (!item) return;

      item.enabled = !!event.target.checked;

      const enabledPhases = getEnabledProjectPhases();

      if (!enabledPhases.length) {
        item.enabled = true;
        event.target.checked = true;
        return;
      }

      if (!enabledPhases.some((phase) => phase.code === store.projectForm.currentPhase)) {
        store.projectForm.currentPhase = enabledPhases[0].code;
      }

      if (!enabledPhases.some((phase) => phase.code === store.projectForm.phase)) {
        store.projectForm.phase = enabledPhases[0].code;
      }

      rerenderProjectParametres();
    });
  });
}

function bindProjectPhaseDateEditor() {
  const parametresUiState = ensurePhasesUiState();

  document.querySelectorAll("[data-project-phases-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      startProjectPhaseDateEdition();
      rerenderProjectParametres();
    });
  });

  document.querySelectorAll("[data-project-phases-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      cancelProjectPhaseDateEdition();
      rerenderProjectParametres();
    });
  });

  document.querySelectorAll("[data-project-phases-submit]").forEach((button) => {
    button.addEventListener("click", () => {
      void submitProjectPhaseDates();
    });
  });

  if (!parametresUiState.projectPhasesEditing) return;

  getProjectPhasesCatalog().forEach((item) => {
    const code = String(item.code || "").trim();
    const pickerId = `projectPhaseDate-${code}`;

    document.querySelectorAll(`[data-shared-date-input-trigger='${pickerId}']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        parametresUiState.projectPhaseDateOpenPickerCode = parametresUiState.projectPhaseDateOpenPickerCode === code ? "" : code;
        rerenderProjectParametres();
      });
    });

    document.querySelectorAll(`[data-shared-date-nav='${pickerId}-prev']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const view = syncPhaseDateCalendarView(code, getPhaseDateDraftValue(code, item.phaseDate));
        const shifted = shiftSharedCalendarMonth(view.year, view.month, -1);
        parametresUiState.projectPhaseDateCalendarViews[code] = shifted;
        rerenderProjectParametres();
      });
    });

    document.querySelectorAll(`[data-shared-date-nav='${pickerId}-next']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const view = syncPhaseDateCalendarView(code, getPhaseDateDraftValue(code, item.phaseDate));
        const shifted = shiftSharedCalendarMonth(view.year, view.month, 1);
        parametresUiState.projectPhaseDateCalendarViews[code] = shifted;
        rerenderProjectParametres();
      });
    });

    document.querySelectorAll(`[data-shared-date-owner='${pickerId}'][data-shared-date-day]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextValue = String(button.getAttribute("data-shared-date-day") || "");
        parametresUiState.projectPhaseDateDrafts[code] = nextValue;
        parametresUiState.projectPhaseDateOpenPickerCode = "";
        const selectedDate = parseSharedDateInputValue(nextValue);
        if (selectedDate) {
          parametresUiState.projectPhaseDateCalendarViews[code] = {
            year: selectedDate.getFullYear(),
            month: selectedDate.getMonth()
          };
        }
        rerenderProjectParametres();
      });
    });

    document.querySelectorAll(`[data-shared-date-clear='${pickerId}']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        parametresUiState.projectPhaseDateDrafts[code] = "";
        parametresUiState.projectPhaseDateOpenPickerCode = "";
        rerenderProjectParametres();
      });
    });

    document.querySelectorAll(`[data-shared-date-today='${pickerId}']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const today = new Date();
        parametresUiState.projectPhaseDateDrafts[code] = toSharedDateInputValue(today);
        parametresUiState.projectPhaseDateCalendarViews[code] = {
          year: today.getFullYear(),
          month: today.getMonth()
        };
        parametresUiState.projectPhaseDateOpenPickerCode = "";
        rerenderProjectParametres();
      });
    });
  });
}

function ensureProjectPhasesLoaded(root) {
  const parametresUiState = ensurePhasesUiState();
  const currentProjectKey = String(store.currentProjectId || store.currentProject?.id || "default");

  if (parametresUiState.projectPhasesLoadedProjectKey !== currentProjectKey) {
    parametresUiState.projectPhasesLoadedProjectKey = currentProjectKey;
    parametresUiState.projectPhasesLoaded = false;
    parametresUiState.projectPhasesLoading = false;
    cancelProjectPhaseDateEdition();
  }

  if (!parametresUiState.projectPhasesLoading && !parametresUiState.projectPhasesLoaded) {
    parametresUiState.projectPhasesLoading = true;
    syncProjectPhasesFromSupabase({ force: true })
      .catch((error) => {
        console.warn("syncProjectPhasesFromSupabase failed", error);
        parametresUiState.projectPhasesError = error instanceof Error ? error.message : String(error || "Erreur de chargement des phases");
      })
      .finally(() => {
        parametresUiState.projectPhasesLoading = false;
        parametresUiState.projectPhasesLoaded = true;
        if (!root?.isConnected) return;
        rerenderProjectParametres();
      });
  }
}

function renderPhasesCardAction() {
  const parametresUiState = ensurePhasesUiState();

  if (!parametresUiState.projectPhasesEditing) {
    return `
      <button type="button" class="gh-btn" data-project-phases-edit>
        <span>Modifier</span>
      </button>
    `;
  }

  return `
    <div class="settings-phases-card__actions">
      <button type="button" class="gh-btn" data-project-phases-cancel ${parametresUiState.projectPhasesSubmitting ? "disabled" : ""}>
        <span>Annuler</span>
      </button>
      <button type="button" class="gh-btn gh-btn--primary" data-project-phases-submit ${parametresUiState.projectPhasesSubmitting ? "disabled" : ""}>
        <span>${parametresUiState.projectPhasesSubmitting ? "Mise à jour…" : "Mettre à jour"}</span>
      </button>
    </div>
  `;
}

export function renderPhasesParametresContent() {
  const parametresUiState = ensurePhasesUiState();
  return `${renderSettingsBlock({
    id: "parametres-phase",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Phases",
        description: "Les cases sont toutes cochées par défaut. Cette structure est stockée dans le store pour préparer le branchement backend.",
        action: renderPhasesCardAction(),
        body: `
          ${renderProjectPhasesCard()}
          ${parametresUiState.projectPhasesError ? `<div class="settings-inline-error">${escapeHtml(parametresUiState.projectPhasesError)}</div>` : ""}
        `
      })
    ]
  })}`;
}

export function bindPhasesParametresSection(root) {
  bindBaseParametresUi();
  bindProjectPhaseToggles();
  bindProjectPhaseDateEditor();
  ensureProjectPhasesLoaded(root);
}

export function getPhasesProjectParametresTab() {
  return {
    id: "parametres-phase",
    label: "Phases",
    iconName: "checklist",
    isPrimary: false,
    renderContent: () => renderPhasesParametresContent(),
    bind: (root) => bindPhasesParametresSection(root)
  };
}
