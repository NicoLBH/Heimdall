import { store } from "../store.js";

function parseHash() {
  const hash = String(location.hash || "").replace(/^#/, "").trim();
  if (!hash) return ["dashboard"];
  return hash.split("/");
}

function menuIcon() {
  return `<svg aria-hidden="true" focusable="false" class="octicon octicon-three-bars" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;"><path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H1.75Z"></path></svg>`;
}

function getHeaderModel() {
  const [root] = parseHash();
  const isProjectRoute = root === "project";
  const projectName = String(store.currentProject?.name || store.projectForm?.projectName || "Projet demo").trim();

  return {
    isProjectRoute,
    headerClass: isProjectRoute ? "gh-header gh-header--project" : "gh-header gh-header--global",
    repoLabel: isProjectRoute ? projectName : "Projets",
    brandHref: isProjectRoute
      ? `#project/${store.currentProjectId || ""}/documents`
      : "#projects"
  };
}

export function renderGlobalHeader() {
  const host = document.getElementById("globalHeaderHost");
  if (!host) return;

  const model = getHeaderModel();

  host.innerHTML = `
    <header class="${model.headerClass}">
      <div class="gh-header__left">
        <button id="menuBtn" class="icon-btn" type="button" aria-label="Ouvrir le menu">
          ${menuIcon()}
        </button>

        <a class="gh-brand" href="${model.brandHref}">
          <img class="gh-brand__logo" src="assets/images/logo.png" alt="Rapsobot">
          <span class="gh-brand__name">RAPSOBOT</span>
          <span class="gh-brand__sep">/</span>
          <span class="gh-brand__repo">${model.repoLabel}</span>
        </a>

        <div id="projectCompactTab" class="gh-brand__compact-tab is-empty" aria-hidden="true">
          <span class="gh-brand__compact-tab-label" id="projectCompactTabLabel"></span>
        </div>
      </div>

      <div class="gh-header__center"></div>
      <div class="gh-header__right"></div>
    </header>
  `;
}

let globalHeaderBound = false;

export function bindGlobalHeader() {
  if (globalHeaderBound) return;
  globalHeaderBound = true;
}
