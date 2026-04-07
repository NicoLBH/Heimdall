import { store } from "../../store.js";
import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { persistCurrentProjectState } from "../../services/project-state-storage.js";
import {
  bindBaseParametresUi,
  renderSectionCard,
  renderSettingsBlock,
  rerenderProjectParametres,
  setCurrentProjectParametresRoot
} from "./project-parametres-core.js";

const collaborateursUiState = {
  collaboratorsModalOpen: false,
  collaboratorDraftEmail: ""
};

function renderCollaboratorsRows(collaborators = []) {
  if (!collaborators.length) {
    return `
      <div class="project-collaborators__empty">
        Aucun collaborateur pour le moment.
      </div>
    `;
  }

  return collaborators.map((item) => `
    <div class="project-collaborators__row">
      <div class="project-collaborators__cell project-collaborators__cell--checkbox">
        <input type="checkbox" disabled>
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--mail-icon">
        <span class="project-collaborators__mail-icon">
          ${svgIcon("mail", { width: 20, height: 20 })}
        </span>
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--email">
        <div class="project-collaborators__email">${escapeHtml(item.email)}</div>
        <div class="project-collaborators__sub mono">${escapeHtml(item.status || "Actif")}</div>
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--role mono">
        ${escapeHtml(item.role || "Lecteur")}
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--status mono">
        ${escapeHtml(item.status || "Actif")}
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--action">
        <button
          type="button"
          class="project-collaborators__remove"
          data-remove-collaborator-id="${escapeHtml(item.id)}"
        >
          Supprimer
        </button>
      </div>
    </div>
  `).join("");
}

function renderCollaboratorsCard() {
  const collaborators = Array.isArray(store.projectForm.collaborators)
    ? store.projectForm.collaborators
    : [];

  return `
    <div class="project-collaborators">
      <div class="project-collaborators__toolbar">
        <div class="project-collaborators__toolbar-left">
          <div class="project-collaborators__toolbar-title">Liste des collaborateurs</div>
          <div class="project-collaborators__toolbar-sub">Quelques données fictives pour la démo UI.</div>
        </div>

        <div class="project-collaborators__toolbar-right">
          <button
            type="button"
            class="gh-btn"
            data-open-collaborator-modal="true"
          >
            Ajouter une personne
          </button>
        </div>
      </div>

      <div class="project-collaborators__table">
        <div class="project-collaborators__head">
          <div class="project-collaborators__cell project-collaborators__cell--checkbox">
            <input type="checkbox" disabled>
          </div>
          <div class="project-collaborators__cell project-collaborators__cell--mail-icon"></div>
          <div class="project-collaborators__cell project-collaborators__cell--email">Adresse e-mail</div>
          <div class="project-collaborators__cell project-collaborators__cell--role">Rôle</div>
          <div class="project-collaborators__cell project-collaborators__cell--status">Statut</div>
          <div class="project-collaborators__cell project-collaborators__cell--action"></div>
        </div>

        <div class="project-collaborators__body">
          ${renderCollaboratorsRows(collaborators)}
        </div>
      </div>
    </div>
  `;
}

function renderCollaboratorModal() {
  if (!collaborateursUiState.collaboratorsModalOpen) return "";

  return `
    <div class="project-collaborators-modal" id="projectCollaboratorsModal">
      <div class="project-collaborators-modal__backdrop" data-close-collaborator-modal="true"></div>

      <div class="project-collaborators-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="projectCollaboratorsModalTitle">
        <div class="project-collaborators-modal__head">
          <h3 id="projectCollaboratorsModalTitle" class="project-collaborators-modal__title">
            Ajouter une personne
          </h3>

          <button
            type="button"
            class="project-collaborators-modal__close"
            data-close-collaborator-modal="true"
            aria-label="Fermer"
          >
            ${svgIcon("x")}
          </button>
        </div>

        <div class="project-collaborators-modal__body">
          <label class="project-collaborators-modal__label" for="projectCollaboratorEmail">
            Adresse e-mail
          </label>

          <div class="project-collaborators-modal__input-wrap">
            <span class="project-collaborators-modal__input-icon">
              ${svgIcon("mail", { width: 18, height: 18 })}
            </span>

            <input
              id="projectCollaboratorEmail"
              class="project-collaborators-modal__input"
              type="email"
              value="${escapeHtml(collaborateursUiState.collaboratorDraftEmail)}"
              placeholder="prenom.nom@entreprise.com"
            >
          </div>
        </div>

        <div class="project-collaborators-modal__footer">
          <button
            type="button"
            class="gh-btn"
            data-close-collaborator-modal="true"
          >
            Annuler
          </button>

          <button
            type="button"
            class="gh-btn gh-btn--primary"
            data-submit-collaborator="true"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  `;
}

function persistCollaborateursState() {
  persistCurrentProjectState();
}

function openCollaboratorModal() {
  collaborateursUiState.collaboratorsModalOpen = true;
  collaborateursUiState.collaboratorDraftEmail = "";
  rerenderProjectParametres();
}

function closeCollaboratorModal() {
  collaborateursUiState.collaboratorsModalOpen = false;
  collaborateursUiState.collaboratorDraftEmail = "";
  rerenderProjectParametres();
}

function buildCollaboratorId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `collab-${crypto.randomUUID()}`;
  }
  return `collab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function submitCollaboratorDraft() {
  const email = String(collaborateursUiState.collaboratorDraftEmail || "").trim().toLowerCase();
  if (!email) return;

  if (!Array.isArray(store.projectForm.collaborators)) {
    store.projectForm.collaborators = [];
  }

  const alreadyExists = store.projectForm.collaborators.some((item) => String(item?.email || "").trim().toLowerCase() === email);
  if (alreadyExists) {
    closeCollaboratorModal();
    return;
  }

  store.projectForm.collaborators = [
    ...store.projectForm.collaborators,
    {
      id: buildCollaboratorId(),
      email,
      role: "Lecteur",
      status: "Invitation en attente"
    }
  ];

  persistCollaborateursState();
  closeCollaboratorModal();
}

function removeCollaborator(id) {
  if (!id || !Array.isArray(store.projectForm.collaborators)) return;
  store.projectForm.collaborators = store.projectForm.collaborators.filter((item) => item.id !== id);
  persistCollaborateursState();
  rerenderProjectParametres();
}

export function renderCollaborateursParametresContent() {
  return `${renderSettingsBlock({
    id: "parametres-collaborateurs",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Collaborateurs",
        description: "Gestion des accès projet et suivi des invitations.",
        body: renderCollaboratorsCard()
      })
    ]
  })}
      ${renderCollaboratorModal()}`;
}

export function bindCollaborateursParametresSection(root) {
  setCurrentProjectParametresRoot(root);
  bindBaseParametresUi();

  document.querySelectorAll("[data-open-collaborator-modal]").forEach((btn) => btn.addEventListener("click", () => openCollaboratorModal()));
  document.querySelectorAll("[data-close-collaborator-modal]").forEach((btn) => btn.addEventListener("click", () => closeCollaboratorModal()));
  document.querySelectorAll("[data-submit-collaborator]").forEach((btn) => btn.addEventListener("click", () => submitCollaboratorDraft()));

  const collaboratorEmailInput = document.getElementById("projectCollaboratorEmail");
  if (collaboratorEmailInput) {
    collaboratorEmailInput.addEventListener("input", (event) => {
      collaborateursUiState.collaboratorDraftEmail = event.target.value || "";
    });
    collaboratorEmailInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitCollaboratorDraft();
      }
    });
    setTimeout(() => collaboratorEmailInput.focus(), 0);
  }

  document.querySelectorAll("[data-remove-collaborator-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeCollaborator(btn.getAttribute("data-remove-collaborator-id"));
    });
  });
}

export function getCollaborateursProjectParametresTab() {
  return {
    id: "parametres-collaborateurs",
    label: "Collaborateurs",
    iconName: "people",
    isPrimary: false,
    renderContent: () => renderCollaborateursParametresContent(),
    bind: (root) => bindCollaborateursParametresSection(root)
  };
}
