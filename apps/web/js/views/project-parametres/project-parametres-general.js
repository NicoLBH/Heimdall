import {
  renderGeneralParametresContent,
  bindGeneralParametresSection
} from "./project-parametres-core.js";

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
