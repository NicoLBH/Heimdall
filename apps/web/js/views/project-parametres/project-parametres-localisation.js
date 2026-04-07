import {
  renderLocalisationParametresContent,
  bindLocalisationParametresSection
} from "./project-parametres-core.js";

export function getLocalisationProjectParametresTab() {
  return {
    id: "parametres-localisation",
    label: "Localisation",
    iconName: "pin",
    isPrimary: false,
    renderContent: () => renderLocalisationParametresContent(),
    bind: (root) => bindLocalisationParametresSection(root)
  };
}
