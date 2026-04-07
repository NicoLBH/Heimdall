import { renderParametresSectionContent } from "./project-parametres-core.js";

export function getLotsProjectParametresTab() {
  return {
    id: "parametres-lots",
    label: "Lots",
    iconName: "book",
    false
    renderContent: () => renderParametresSectionContent("parametres-lots")
  };
}
