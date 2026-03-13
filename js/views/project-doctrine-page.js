import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function renderBulletList(items = []) {
  if (!items.length) return "";
  return `
    <ul class="settings-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderActionButtons(actions = []) {
  if (!actions.length) return "";
  return `
    <div class="settings-actions-row">
      ${actions.map((action) => `
        <button class="gh-btn ${action.primary ? "gh-btn--validate" : ""}" type="button" disabled title="Maquette explicative uniquement">
          ${escapeHtml(action.label)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderSection(section) {
  return `
    <section class="settings-section" id="${escapeHtml(section.id)}">
      <h3>${escapeHtml(section.title)}</h3>
      ${section.lead ? `<p class="settings-lead">${escapeHtml(section.lead)}</p>` : ""}

      ${section.callout ? `
        <div class="gh-alert settings-callout">
          ${escapeHtml(section.callout)}
        </div>
      ` : ""}

      ${section.blocks.map((block) => `
        <div class="settings-card">
          <div class="settings-card__head">
            <div>
              <h4>${escapeHtml(block.title)}</h4>
              ${block.description ? `<p>${escapeHtml(block.description)}</p>` : ""}
            </div>
            ${block.badge ? `<span class="settings-badge mono">${escapeHtml(block.badge)}</span>` : ""}
          </div>

          ${block.items?.length ? renderBulletList(block.items) : ""}
          ${block.actions?.length ? renderActionButtons(block.actions) : ""}
        </div>
      `).join("")}
    </section>
  `;
}

export function renderDoctrinePage(root, config) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: config.contextLabel,
    variant: config.variant,
    title: config.title || "",
    subtitle: config.subtitle || "",
    metaHtml: config.metaHtml || "",
    toolbarHtml: config.toolbarHtml || ""
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="${config.scrollId}">
        <div class="settings-layout">
          <aside class="settings-nav">
            <div class="settings-nav__group">
              <div class="settings-nav__title">${escapeHtml(config.navTitle || config.contextLabel)}</div>
              ${config.navItems.map((item, index) => `
                <a href="#${escapeHtml(item.id)}" class="settings-nav__item ${index === 0 ? "is-active" : ""}">
                  ${escapeHtml(item.label)}
                </a>
              `).join("")}
            </div>
          </aside>

          <div class="settings-content">
            <header class="settings-page-header">
              <h2>${escapeHtml(config.pageTitle || config.contextLabel)}</h2>
              ${config.pageIntro ? `<p>${escapeHtml(config.pageIntro)}</p>` : ""}
            </header>

            ${config.topHtml || ""}
            ${config.sections.map(renderSection).join("")}
          </div>
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById(config.scrollId));
}
