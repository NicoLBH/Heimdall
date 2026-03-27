import { svgIcon } from "../ui/icons.js";
import { registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem,
  renderSideNavSeparator,
  bindSideNavPanels
} from "./ui/side-nav-layout.js";
import { renderSolidityGeneral } from "./solidity/solidity-general.js";
import { renderSolidityGeorisks } from "./solidity/solidity-georisks.js";
import { renderSolidityArkolia } from "./solidity/solidity-arkolia.js";

function renderSolidityNav() {
  return [
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      items: [
        renderSideNavItem({
          label: "Général",
          targetId: "solidity-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" }),
          isActive: true,
          isPrimary: true
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Données de base projet",
      items: [
        renderSideNavItem({
          label: "Géorisques",
          targetId: "solidity-georisks",
          iconHtml: svgIcon("shield", { className: "octicon octicon-shield" })
        }),
        renderSideNavItem({
          label: "Arkolia",
          targetId: "solidity-arkolia",
          iconHtml: svgIcon("arkolia-a", { className: "octicon octicon-arkolia" })
        })
      ]
    })
  ].join("");
}

function getRouterHtml() {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--solidite">
      <div class="project-simple-scroll project-simple-scroll--parametres" id="projectSolidityRouterScroll">
        <div class="settings-shell settings-shell--parametres">
          ${renderSideNavLayout({
            className: "settings-layout settings-layout--parametres project-solidity-router",
            navClassName: "settings-nav settings-nav--parametres",
            contentClassName: "settings-content settings-content--parametres project-solidity-router__content",
            navHtml: renderSolidityNav(),
            contentHtml: `
              <section class="project-solidity-router__panel is-active" data-side-nav-panel="solidity-general">
                <div id="projectSolidityGeneralPanel"></div>
              </section>
              <section class="project-solidity-router__panel" data-side-nav-panel="solidity-georisks">
                <div id="projectSolidityGeorisksPanel"></div>
              </section>
              <section class="project-solidity-router__panel" data-side-nav-panel="solidity-arkolia">
                <div id="projectSolidityArkoliaPanel"></div>
              </section>
            `
          })}
        </div>
      </div>
    </section>
  `;
}

export function renderProjectSolidity(root) {
  if (!root) return;

  root.innerHTML = getRouterHtml();

  const generalRoot = root.querySelector("#projectSolidityGeneralPanel");
  const georisksRoot = root.querySelector("#projectSolidityGeorisksPanel");
  const arkoliaRoot = root.querySelector("#projectSolidityArkoliaPanel");

  if (generalRoot) renderSolidityGeneral(generalRoot);
  if (georisksRoot) renderSolidityGeorisks(georisksRoot);
  if (arkoliaRoot) renderSolidityArkolia(arkoliaRoot);

  bindSideNavPanels(root, {
    defaultTarget: "solidity-general"
  });

  const getScrollSource = () => root.querySelector("#projectSolidityRouterScroll");

  root.querySelectorAll("[data-side-nav-target]").forEach((button) => {
    button.addEventListener("click", () => {
      registerProjectPrimaryScrollSource(getScrollSource());
    });
  });

  registerProjectPrimaryScrollSource(getScrollSource());
}
