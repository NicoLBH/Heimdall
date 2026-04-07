import { renderParametresSectionContent } from "./project-parametres-core.js";

export function getAgentsProjectParametresTab() {
  return {
    id: "parametres-agents-actives",
    label: "Agents activés",
    iconName: "shield",
    false
    renderContent: () => renderParametresSectionContent("parametres-agents-actives")
  };
}
