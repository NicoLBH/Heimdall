import { store } from "../../store.js";
import { PROJECT_TAB_IDS } from "../../constants.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { bindGhEditableFields } from "../ui/gh-input.js";
import { persistCurrentProjectNameToSupabase } from "../../services/project-supabase-sync.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  renderInputField,
  bindBaseParametresUi,
  bindProjectTabToggles,
  refreshProjectTabsVisibility
} from "./project-parametres-core.js";

function renderProjectTabsFeatureCard(projectTabs) {
  const items = [
    {
      id: "tabVisibilityAtelier",
      key: PROJECT_TAB_IDS.STUDIO,
      label: "Atelier",
      description: "Affiche l’onglet Atelier et ses vues métier de travail projet."
    },
    {
      id: "tabVisibilitySituations",
      key: PROJECT_TAB_IDS.SITUATIONS,
      label: "Situations",
      description: "Affiche l’onglet Situations actuellement branché sur les jalons projet."
    }
  ];

  return `
    <div class="settings-features-card">
      <div class="settings-features-card__title">Fonctionnalités</div>
      <div class="settings-features-list">
        ${items.map((item) => `
          <label class="settings-feature-row" for="${escapeHtml(item.id)}">
            <div class="settings-feature-row__control">
              <input
                id="${escapeHtml(item.id)}"
                type="checkbox"
                data-project-tab-toggle="${escapeHtml(item.key)}"
                ${projectTabs?.[item.key] !== false ? "checked" : ""}
              >
            </div>
            <div class="settings-feature-row__body">
              <div class="settings-feature-row__label">${escapeHtml(item.label)}</div>
              <div class="settings-feature-row__desc">${escapeHtml(item.description)}</div>
            </div>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderGeneralParametresContent() {
  const form = store.projectForm;

  return `${renderSettingsBlock({
    id: "parametres-general",
    title: "",
    lead: "",
    isActive: true,
    isHero: false,
    cards: [
      renderSectionCard({
        title: "Nom du projet",
        description: "Description",
        body: `<div class="settings-form-grid settings-form-grid--thirds">
          ${renderInputField({ id: "projectName", label: "Nom de projet", value: form.projectName || "", placeholder: "Projet demo" })}
        </div>`
      }),
      renderSectionCard({
        title: "Fonctionnalités du projet",
        description: "Active ou masque certaines fonctionnalités optionnelles dans l’en-tête projet.",
        body: renderProjectTabsFeatureCard(form.projectTabs || {})
      })
    ]
  })}`;
}

export function bindGeneralParametresSection(root) {
  bindBaseParametresUi();

  bindGhEditableFields(document, {
    onValidate: async (id, value) => {
      if (id !== "projectName") return;

      const previousProjectName = String(store.projectForm.projectName || store.currentProject?.name || "Projet demo");
      persistCurrentProjectNameToSupabase(value).catch((error) => {
        console.warn("persistCurrentProjectNameToSupabase failed", error);
        persistCurrentProjectNameToSupabase(previousProjectName).catch(() => undefined);
      });
    }
  });

  bindProjectTabToggles();
  refreshProjectTabsVisibility();
}

export function getGeneralProjectParametresTab() {
  return {
    id: "parametres-general",
    label: "Général",
    iconName: "gear",
    isPrimary: true,
    renderContent: () => renderGeneralParametresContent(),
    bind: (root) => bindGeneralParametresSection(root)
  };
}
