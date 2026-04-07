import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";
import { getPublicProfilePersonalSettingsTab } from "./personal-settings/public-profile.js";

const personalSettingsTabs = [
  getPublicProfilePersonalSettingsTab()
];

function renderPersonalSettingsNav(activeTabId) {
  return renderSideNavGroup({
    items: personalSettingsTabs.map((tab) => renderSideNavItem({
      label: tab.label,
      targetId: tab.id,
      iconHtml: tab.iconHtml,
      isActive: tab.id === activeTabId,
      isPrimary: Boolean(tab.isPrimary)
    }))
  });
}

export function renderPersonalSettings(root) {
  if (!root) return;

  const activeTab = personalSettingsTabs[0];

  root.innerHTML = `
    <section class="page personal-settings-page">
      ${renderSideNavLayout({
        className: "settings-layout settings-layout--parametres personal-settings-layout",
        navClassName: "settings-nav settings-nav--parametres personal-settings-layout__nav",
        contentClassName: "settings-content settings-content--parametres personal-settings-layout__content",
        navHtml: renderPersonalSettingsNav(activeTab.id),
        contentHtml: activeTab.renderContent()
      })}
    </section>
  `;

  const activePanelRoot = root.querySelector(`[data-side-nav-panel="${activeTab.id}"]`);
  activeTab.bind?.(activePanelRoot);
}
