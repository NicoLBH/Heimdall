import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";
import { renderExecutionInsightsCardsSection } from "./project-insights.js";

function renderPilotageNav() {
  return renderSideNavGroup({
    title: "Pilotage",
    items: [
      renderSideNavItem({
        label: "Indicateurs d'exécution",
        isActive: true
      })
    ]
  });
}

export function renderProjectPilotage(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Pilotage",
    variant: "pilotage"
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectPilotageScroll">
        ${renderSideNavLayout({
          className: "settings-layout side-nav-layout--settings",
          navClassName: "settings-nav side-nav-layout--settings-nav",
          contentClassName: "settings-content side-nav-layout--settings-content",
          navHtml: renderPilotageNav(),
          contentHtml: `
            <header class="settings-page-header">
              <h2>Pilotage</h2>
              <p>
                Cette vue est volontairement réduite : le menu de gauche reste en place comme structure visuelle pour les futures implémentations.
              </p>
            </header>

            ${renderExecutionInsightsCardsSection()}
          `
        })}
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectPilotageScroll"));
}
