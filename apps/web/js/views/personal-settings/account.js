import { store } from "../../store.js";
import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";

const deleteAccountUiState = {
  modalOpen: false,
  identityValue: "",
  confirmValue: ""
};

const DELETE_CONFIRMATION_TEXT = "supprimer mon compte";

export function getAccountPersonalSettingsTab() {
  return {
    id: "personal-settings-account",
    label: "Compte",
    iconName: "gear",
    renderContent: renderAccountPanel,
    bind: bindAccountPanel
  };
}

function getAccountIdentityLabel() {
  const publicEmail = String(store.user?.publicProfile?.publicEmail || "").trim();
  const email = String(store.user?.email || "").trim();
  const name = String(store.user?.name || "").trim();
  return publicEmail || email || name || "";
}

function renderDeleteAccountModal() {
  if (!deleteAccountUiState.modalOpen) return "";

  const isSubmitEnabled =
    deleteAccountUiState.identityValue.trim().length > 0 &&
    deleteAccountUiState.confirmValue.trim().toLowerCase() === DELETE_CONFIRMATION_TEXT;

  return `
    <div class="personal-settings-delete-modal" id="personalSettingsDeleteModal">
      <div class="personal-settings-delete-modal__backdrop" data-close-delete-modal="true"></div>

      <div class="personal-settings-delete-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="personalSettingsDeleteModalTitle">
        <div class="personal-settings-delete-modal__head">
          <div id="personalSettingsDeleteModalTitle" class="personal-settings-delete-modal__title">Êtes-vous sûr de vouloir faire cela&nbsp;?</div>
          <button type="button" class="personal-settings-delete-modal__close" data-close-delete-modal="true" aria-label="Fermer">
            ${svgIcon("x")}
          </button>
        </div>

        <div class="personal-settings-delete-modal__body">
          <div class="gh-alert gh-alert--error personal-settings-delete-modal__alert">
            <span class="personal-settings-delete-modal__alert-icon">${svgIcon("alert")}</span>
            <span>Ceci est extrêmement important.</span>
          </div>

          <div class="personal-settings-delete-modal__copy">
            <p>
              Nous supprimerons immédiatement votre compte Mdall, ainsi que tous vos projets, documents, sujets, automatisations et paramètres associés.
            </p>
            <p>
              Vous ne pourrez plus accéder à Mdall avec ce compte.
            </p>
          </div>

          <label class="personal-settings-delete-modal__field">
            <span class="personal-settings-delete-modal__label">Votre nom d'utilisateur ou email&nbsp;:</span>
            <input
              type="text"
              class="gh-input personal-settings-delete-modal__input"
              id="personalSettingsDeleteIdentity"
              value="${escapeHtml(deleteAccountUiState.identityValue)}"
              autocomplete="off"
              spellcheck="false"
            >
          </label>

          <label class="personal-settings-delete-modal__field">
            <span class="personal-settings-delete-modal__label">Pour vérifier, tapez <em>${escapeHtml(DELETE_CONFIRMATION_TEXT)}</em> exactement comme affiché&nbsp;:</span>
            <input
              type="text"
              class="gh-input personal-settings-delete-modal__input"
              id="personalSettingsDeleteConfirmation"
              value="${escapeHtml(deleteAccountUiState.confirmValue)}"
              autocomplete="off"
              spellcheck="false"
            >
          </label>

          <div class="personal-settings-delete-modal__note">
            Vous devrez confirmer votre identité avant la suppression du compte.
          </div>

          <button
            type="button"
            class="gh-btn gh-btn--danger-alt personal-settings-delete-modal__submit"
            id="personalSettingsDeleteSubmit"
            ${isSubmitEnabled ? "" : "disabled"}
          >
            Annuler le forfait et supprimer ce compte
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderAccountPanel() {
  return `
    <section class="personal-settings-panel" data-side-nav-panel="personal-settings-account">
      <div class="settings-block__head personal-settings-page__header">
        <div class="settings-card__head-title settings-card__head-title--danger personal-settings-page__title">Supprimer votre compte</div>
      </div>

      <div class="personal-settings-panel__content personal-settings-panel__content--stacked">
        <p class="personal-settings-danger-copy">
          Une fois que vous aurez supprimé votre compte, aucun retour en arrière ne sera possible. S'il vous plaît, soyez certain avant de supprimer votre compte.
        </p>

        <button type="button" class="gh-btn gh-btn--danger-alt personal-settings-danger-button" id="personalSettingsDeleteAccountButton">
          Supprimer votre compte
        </button>
      </div>

      ${renderDeleteAccountModal()}
    </section>
  `;
}

function rerenderAccountPanel(panelRoot) {
  if (!panelRoot) return;
  panelRoot.outerHTML = renderAccountPanel();
  const nextPanelRoot = document.querySelector('[data-side-nav-panel="personal-settings-account"]');
  if (nextPanelRoot) bindAccountPanel(nextPanelRoot);
}

function closeDeleteModal(panelRoot) {
  if (!deleteAccountUiState.modalOpen) return;
  deleteAccountUiState.modalOpen = false;
  document.body.classList.remove("modal-open");
  rerenderAccountPanel(panelRoot);
}

function openDeleteModal(panelRoot) {
  deleteAccountUiState.modalOpen = true;
  deleteAccountUiState.identityValue = getAccountIdentityLabel();
  deleteAccountUiState.confirmValue = "";
  document.body.classList.add("modal-open");
  rerenderAccountPanel(panelRoot);

  queueMicrotask(() => {
    const confirmationInput = document.getElementById("personalSettingsDeleteConfirmation");
    confirmationInput?.focus();
  });
}

export function bindAccountPanel(panelRoot) {
  if (!panelRoot) return;

  const openButton = panelRoot.querySelector("#personalSettingsDeleteAccountButton");
  openButton?.addEventListener("click", () => openDeleteModal(panelRoot));

  const modal = panelRoot.querySelector("#personalSettingsDeleteModal");
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest?.("[data-close-delete-modal]");
    if (closeTarget) {
      closeDeleteModal(panelRoot);
    }
  });

  const identityInput = modal.querySelector("#personalSettingsDeleteIdentity");
  const confirmationInput = modal.querySelector("#personalSettingsDeleteConfirmation");
  const submitButton = modal.querySelector("#personalSettingsDeleteSubmit");

  const syncSubmitState = () => {
    deleteAccountUiState.identityValue = identityInput?.value || "";
    deleteAccountUiState.confirmValue = confirmationInput?.value || "";
    const isEnabled =
      deleteAccountUiState.identityValue.trim().length > 0 &&
      deleteAccountUiState.confirmValue.trim().toLowerCase() === DELETE_CONFIRMATION_TEXT;
    if (submitButton) submitButton.disabled = !isEnabled;
  };

  identityInput?.addEventListener("input", syncSubmitState);
  confirmationInput?.addEventListener("input", syncSubmitState);
  syncSubmitState();

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDeleteModal(panelRoot);
    }
  });
}
