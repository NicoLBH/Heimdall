import { renderParametresSectionContent } from "./project-parametres-core.js";

export function getGeneralProjectParametresTab() {
  return {
    id: "parametres-general",
    label: "Général",
    iconName: "general",
    isPrimary: true,
    renderContent: () => renderParametresSectionContent("parametres-general")
  };
}
