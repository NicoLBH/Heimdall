import { renderProjectDocuments } from "./project-documents.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectHeader } from "./project-header.js";
import { renderProjectSituationsTopBanner } from "./project-situations-runbar.js";
import { mountProjectShellChrome } from "./project-shell-chrome.js";
import { renderProjectPropositions } from "./project-propositions.js";
import { renderProjectCoordination } from "./project-coordination.js";
import { renderProjectWorkflows } from "./project-workflows.js";
import { renderProjectJalons } from "./project-jalons.js";
import { renderProjectReferentiel } from "./project-referentiel.js";
import { renderProjectRisquesSecurite } from "./project-risques-securite.js";
import { renderProjectPilotage } from "./project-pilotage.js";
import { renderProjectParametres } from "./project-parametres.js";

function normalizeProjectTab(tab) {
  const value = String(tab || "").trim();

  switch (value) {
    case "documents":
      return "documents";

    case "situations":
      return "situations";

    case "propositions":
      return "propositions";

    case "discussions":
    case "coordination":
      return "discussions";

    case "actions":
    case "workflows":
      return "actions";

    case "pilotage":
      return "pilotage";

    case "referentiel":
      return "referentiel";

    case "risquesSecurite":
    case "risques-securite":
      return "risquesSecurite";

    case "insights":
    case "indicateurs":
    case "jalons":
      return "insights";

    case "parametres":
      return "parametres";

    default:
      return "documents";
  }
}

export function renderProjectLayout(root, projectId, tab) {
  const normalizedTab = normalizeProjectTab(tab);

  root.innerHTML = `
    <div class="project-shell" id="projectShell">
      ${renderProjectHeader(projectId, normalizedTab)}

      <div class="project-shell__body">
        ${renderProjectSituationsTopBanner()}
        <div id="projectViewHeaderHost" class="project-view-header-host"></div>
        <div id="project-content" class="project-shell__content"></div>
      </div>
    </div>
  `;

  mountProjectShellChrome({ projectId, tab: normalizedTab });

  const content = document.getElementById("project-content");
  if (!content) return;

  switch (normalizedTab) {
    case "documents":
      renderProjectDocuments(content);
      break;

    case "situations":
      renderProjectSituations(content);
      break;

    case "propositions":
      renderProjectPropositions(content);
      break;

    case "discussions":
      renderProjectCoordination(content);
      break;

    case "actions":
      renderProjectWorkflows(content);
      break;

    case "pilotage":
      renderProjectPilotage(content);
      break;

    case "referentiel":
      renderProjectReferentiel(content);
      break;

    case "risquesSecurite":
      renderProjectRisquesSecurite(content);
      break;

    case "insights":
      renderProjectJalons(content);
      break;

    case "parametres":
      renderProjectParametres(content);
      break;

    default:
      renderProjectDocuments(content);
      break;
  }
}
