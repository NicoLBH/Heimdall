import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";

export function renderProjectIntervenants(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Intervenants",
    variant: "intervenants"
  });

  root.innerHTML = `
    <section class="project-simple-page">
      <div class="project-simple-scroll" id="projectIntervenantsScroll">
        <h2>Intervenants</h2>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectIntervenantsScroll"));
}
