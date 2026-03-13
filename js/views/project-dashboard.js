import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";

export function renderProjectDashboard(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Tableau de bord",
    variant: "dashboard"
  });

  root.innerHTML = `
    <section class="project-simple-page">
      <div class="project-simple-scroll" id="projectDashboardScroll">
        <h2>Tableau de bord projet</h2>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectDashboardScroll"));
}
