import { renderParametresSectionContent } from "./project-parametres-core.js";

export function getPhasesProjectParametresTab() {
  return {
    id: "parametres-phase",
    label: "Phases",
    iconName: "checklist",
    false
    renderContent: () => renderParametresSectionContent("parametres-phase")
  };
}
