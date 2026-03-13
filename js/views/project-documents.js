import { store } from "../store.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";

export function renderProjectDocuments(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Documents",
    variant: "documents"
  });

  const fileLabel = store.projectForm.pdfFile?.name
    ? `<div class="mono" style="margin-top:8px;">Fichier sélectionné : ${store.projectForm.pdfFile.name}</div>`
    : "";

  root.innerHTML = `
    <section class="project-simple-page">
      <div class="project-simple-scroll" id="projectDocumentsScroll">
        <h2>Documents</h2>

        <div class="form-row">
          <label>PDF étude</label>
          <input id="pdfFile" type="file" accept="application/pdf">
          ${fileLabel}
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectDocumentsScroll"));
  bindDocumentsEvents();
}

function bindDocumentsEvents() {
  const pdfFile = document.getElementById("pdfFile");

  if (pdfFile) {
    pdfFile.addEventListener("change", (e) => {
      store.projectForm.pdfFile = e.target.files?.[0] || null;
      renderProjectDocuments(document.getElementById("project-content"));
    });
  }
}
