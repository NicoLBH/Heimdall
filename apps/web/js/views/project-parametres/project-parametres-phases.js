import {
  renderPhasesParametresContent,
  bindPhasesParametresSection
} from "./project-parametres-core.js";

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
