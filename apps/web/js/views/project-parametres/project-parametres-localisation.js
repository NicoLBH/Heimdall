import { renderParametresSectionContent } from "./project-parametres-core.js";

export function getLocalisationProjectParametresTab() {
  return {
    id: "parametres-localisation",
    label: "Localisation",
    iconName: "pin",
    false
    renderContent: () => renderParametresSectionContent("parametres-localisation")
  };
}
