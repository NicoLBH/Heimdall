import { PROJECT_TABS } from "../constants.js";

export function renderProjectHeader(projectId, activeTab) {
  return `
    <section class="project-context-header">
      <nav class="project-tabs" aria-label="Project navigation">
        ${PROJECT_TABS.map((t) => `
          <a
            href="#project/${projectId}/${t.id}"
            class="${t.id === activeTab ? "active" : ""}"
          >
            ${t.label}
          </a>
        `).join("")}
      </nav>
    </section>
  `;
}
