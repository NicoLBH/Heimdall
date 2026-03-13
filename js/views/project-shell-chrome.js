import { PROJECT_TABS } from "../constants.js";

let cleanupProjectShellChrome = null;

function getTabLabel(tab) {
  return PROJECT_TABS.find((item) => item.id === tab)?.label || tab || "";
}

function setCompactState({ isCompact, tab }) {
  const body = document.body;
  const globalHeader = document.querySelector("#globalHeaderHost .gh-header");
  const projectTabs = document.querySelector(".project-tabs");

  body.classList.add("route--project");
  body.classList.toggle("project-shell-compact", isCompact);

  globalHeader?.classList.toggle("gh-header--compact", isCompact);
  projectTabs?.classList.toggle("project-tabs--hidden", isCompact);

  document.querySelectorAll(".js-project-view-head").forEach((node) => {
    node.classList.toggle("project-view-head--compact-active", isCompact);
    node.dataset.projectTab = tab || "";
  });

  const tabLabel = getTabLabel(tab);
  document.querySelectorAll(".js-project-view-tab-label").forEach((node) => {
    node.textContent = tabLabel;
  });
}

export function mountProjectShellChrome({ tab }) {
  cleanupProjectShellChrome?.();
  cleanupProjectShellChrome = null;

  const app = document.getElementById("app");
  if (!app) return;

  const onScroll = () => {
    const isCompact = app.scrollTop > 12;
    setCompactState({ isCompact, tab });
  };

  const onResize = () => {
    const isCompact = app.scrollTop > 12;
    setCompactState({ isCompact, tab });
  };

  app.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  setCompactState({
    isCompact: app.scrollTop > 12,
    tab
  });

  cleanupProjectShellChrome = () => {
    app.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
  };
}

export function unmountProjectShellChrome() {
  cleanupProjectShellChrome?.();
  cleanupProjectShellChrome = null;

  const body = document.body;
  const globalHeader = document.querySelector("#globalHeaderHost .gh-header");
  const projectTabs = document.querySelector(".project-tabs");

  body.classList.remove("route--project", "project-shell-compact");
  globalHeader?.classList.remove("gh-header--compact");
  projectTabs?.classList.remove("project-tabs--hidden");
}
