import { renderParametresSectionContent } from "./project-parametres-core.js";

export function getAutomatisationsProjectParametresTab() {
  return {
    id: "parametres-automatisations",
    label: "Automatisations",
    iconName: "checklist",
    false
    renderContent: () => renderParametresSectionContent("parametres-automatisations")
  };
}
