import { svgIcon } from "../ui/icons.js";
import { registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem,
  renderSideNavSeparator,
  bindSideNavPanels
} from "./ui/side-nav-layout.js";
import { renderStudioGeneral } from "./studio/studio-general.js";
import { renderSolidityGeneral } from "./solidity/solidity-general.js";
import { renderSolidityGeorisks } from "./solidity/solidity-georisks.js";
import { renderSolidityArkolia } from "./solidity/solidity-arkolia.js";
import { renderFireProtectionGeneral } from "./fire-protection/fireProtection-general.js";
import { renderFireProtectionFirstItem } from "./fire-protection/fireProtection-firstItem.js";
import { renderSeismicGeneral } from "./seismic/seismic-general.js";
import { renderSeismicCalculModel } from "./seismic/seismic-calculModel.js";
import { renderAccessibilityGeneral } from "./accessibility/accessibility-general.js";
import { renderAccessibilityFirstItem } from "./accessibility/accessibility-firstItem.js";
import { renderThermalGeneral } from "./thermal/thermal-general.js";
import { renderThermalFirstItem } from "./thermal/thermal-firstItem.js";
import { renderAcousticGeneral } from "./acoustic/acoustic-general.js";
import { renderAcousticFirstItem } from "./acoustic/acoustic-firstItem.js";

function renderStudioNav() {
  return [
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      items: [
        renderSideNavItem({
          label: "Général",
          targetId: "studio-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" }),
          isActive: true,
          isPrimary: true
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Solidité",
      items: [
        renderSideNavItem({
          label: "Général",
          targetId: "solidity-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" })
        }),
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
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Incendie",
      items: [
        renderSideNavItem({
          label: "Général",
          targetId: "fire-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" })
        }),
        renderSideNavItem({
          label: "Première rubrique",
          targetId: "fire-first-item",
          iconHtml: svgIcon("fire", { className: "octicon octicon-fire" })
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Parasismique",
      items: [
        renderSideNavItem({
          label: "Général",
          targetId: "seismic-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" })
        }),
        renderSideNavItem({
          label: "Méthode de calcul",
          targetId: "seismic-calcul-model",
          iconHtml: svgIcon("ai-model", { className: "octicon octicon-ai-model" })
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Accessibilité",
      items: [
        renderSideNavItem({
          label: "Général",
          targetId: "accessibility-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" })
        }),
        renderSideNavItem({
          label: "Première rubrique",
          targetId: "accessibility-first-item",
          iconHtml: svgIcon("people", { className: "octicon octicon-people" })
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Thermique",
      items: [
        renderSideNavItem({
          label: "Général",
          targetId: "thermal-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" })
        }),
        renderSideNavItem({
          label: "Première rubrique",
          targetId: "thermal-first-item",
          iconHtml: svgIcon("thermometer", { className: "octicon octicon-thermometer" })
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Acoustique",
      items: [
        renderSideNavItem({
          label: "Général",
          targetId: "acoustic-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" })
        }),
        renderSideNavItem({
          label: "Première rubrique",
          targetId: "acoustic-first-item",
          iconHtml: svgIcon("speaker", { className: "octicon octicon-speaker" })
        })
      ]
    })
  ].join("");
}

function getRouterHtml() {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--studio">
      <div class="project-simple-scroll project-simple-scroll--parametres" id="projectStudioRouterScroll">
        <div class="settings-shell settings-shell--parametres">
          ${renderSideNavLayout({
            className: "settings-layout settings-layout--parametres project-studio-router",
            navClassName: "settings-nav settings-nav--parametres",
            contentClassName: "settings-content settings-content--parametres project-studio-router__content",
            navHtml: renderStudioNav(),
            contentHtml: `
              <section class="project-studio-router__panel is-active" data-side-nav-panel="studio-general">
                <div id="projectStudioGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-general">
                <div id="projectStudioSolidityGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-georisks">
                <div id="projectStudioSolidityGeorisksPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-arkolia">
                <div id="projectStudioSolidityArkoliaPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="fire-general">
                <div id="projectStudioFireGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="fire-first-item">
                <div id="projectStudioFireFirstItemPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="seismic-general">
                <div id="projectStudioSeismicGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="seismic-calcul-model">
                <div id="projectStudioSeismicCalculModelPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="accessibility-general">
                <div id="projectStudioAccessibilityGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="accessibility-first-item">
                <div id="projectStudioAccessibilityFirstItemPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="thermal-general">
                <div id="projectStudioThermalGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="thermal-first-item">
                <div id="projectStudioThermalFirstItemPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="acoustic-general">
                <div id="projectStudioAcousticGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="acoustic-first-item">
                <div id="projectStudioAcousticFirstItemPanel"></div>
              </section>
            `
          })}
        </div>
      </div>
    </section>
  `;
}

export function renderProjectStudio(root) {
  if (!root) return;

  root.innerHTML = getRouterHtml();

  const generalRoot = root.querySelector("#projectStudioGeneralPanel");
  const solidityGeneralRoot = root.querySelector("#projectStudioSolidityGeneralPanel");
  const solidityGeorisksRoot = root.querySelector("#projectStudioSolidityGeorisksPanel");
  const solidityArkoliaRoot = root.querySelector("#projectStudioSolidityArkoliaPanel");
  const fireGeneralRoot = root.querySelector("#projectStudioFireGeneralPanel");
  const fireFirstItemRoot = root.querySelector("#projectStudioFireFirstItemPanel");
  const seismicGeneralRoot = root.querySelector("#projectStudioSeismicGeneralPanel");
  const seismicCalculModelRoot = root.querySelector("#projectStudioSeismicCalculModelPanel");
  const accessibilityGeneralRoot = root.querySelector("#projectStudioAccessibilityGeneralPanel");
  const accessibilityFirstItemRoot = root.querySelector("#projectStudioAccessibilityFirstItemPanel");
  const thermalGeneralRoot = root.querySelector("#projectStudioThermalGeneralPanel");
  const thermalFirstItemRoot = root.querySelector("#projectStudioThermalFirstItemPanel");
  const acousticGeneralRoot = root.querySelector("#projectStudioAcousticGeneralPanel");
  const acousticFirstItemRoot = root.querySelector("#projectStudioAcousticFirstItemPanel");

  if (generalRoot) renderStudioGeneral(generalRoot);
  if (solidityGeneralRoot) renderSolidityGeneral(solidityGeneralRoot);
  if (solidityGeorisksRoot) renderSolidityGeorisks(solidityGeorisksRoot);
  if (solidityArkoliaRoot) renderSolidityArkolia(solidityArkoliaRoot);
  if (fireGeneralRoot) renderFireProtectionGeneral(fireGeneralRoot);
  if (fireFirstItemRoot) renderFireProtectionFirstItem(fireFirstItemRoot);
  if (seismicGeneralRoot) renderSeismicGeneral(seismicGeneralRoot);
  if (seismicCalculModelRoot) renderSeismicCalculModel(seismicCalculModelRoot);
  if (accessibilityGeneralRoot) renderAccessibilityGeneral(accessibilityGeneralRoot);
  if (accessibilityFirstItemRoot) renderAccessibilityFirstItem(accessibilityFirstItemRoot);
  if (thermalGeneralRoot) renderThermalGeneral(thermalGeneralRoot);
  if (thermalFirstItemRoot) renderThermalFirstItem(thermalFirstItemRoot);
  if (acousticGeneralRoot) renderAcousticGeneral(acousticGeneralRoot);
  if (acousticFirstItemRoot) renderAcousticFirstItem(acousticFirstItemRoot);

  const getScrollSource = () => root.querySelector("#projectStudioRouterScroll");

  bindSideNavPanels(root, {
    defaultTarget: "studio-general",
    scrollContainer: getScrollSource()
  });

  root.querySelectorAll("[data-side-nav-target]").forEach((button) => {
    button.addEventListener("click", () => {
      registerProjectPrimaryScrollSource(getScrollSource());
    });
  });

  registerProjectPrimaryScrollSource(getScrollSource());
}
