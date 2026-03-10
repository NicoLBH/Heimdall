import { PROJECT_TABS } from "../constants.js";
import { renderProjectDashboard } from "./project-dashboard.js";
import { renderProjectIdentity } from "./project-identity.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectIntervenants } from "./project-intervenants.js";
import { renderProjectDocuments } from "./project-documents.js";

export function renderProjectLayout(root, projectId, tab) {

  root.innerHTML = `
    <div class="project">

      <div class="project-tabs">
        ${PROJECT_TABS.map(t => `
          <a href="#project/${projectId}/${t.id}" 
             class="${t.id === tab ? "active" : ""}">
             ${t.label}
          </a>
        `).join("")}
      </div>

      <div id="project-content"></div>

    </div>
  `;

  const content = document.getElementById("project-content");

  if (tab === "dashboard") renderProjectDashboard(content);
  if (tab === "identity") renderProjectIdentity(content);
  if (tab === "situations") renderProjectSituations(content);
  if (tab === "intervenants") renderProjectIntervenants(content);
  if (tab === "documents") renderProjectDocuments(content);
}
