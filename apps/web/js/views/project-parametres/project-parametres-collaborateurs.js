import { renderParametresSectionContent } from "./project-parametres-core.js";

export function getCollaborateursProjectParametresTab() {
  return {
    id: "parametres-collaborateurs",
    label: "Collaborateurs",
    iconName: "people",
    false
    renderContent: () => renderParametresSectionContent("parametres-collaborateurs")
  };
}
