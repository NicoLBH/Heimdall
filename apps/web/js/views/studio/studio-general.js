import { registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";

export function renderStudioGeneral(root) {
  if (!root) return;

  root.innerHTML = `
    <section class="settings-section is-active">
      <div class="settings-card settings-card--param">
        <div class="settings-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Général</h4>
            </span>
            <p>Cette section est prête à accueillir les paramètres transverses de l'atelier.</p>
          </div>
        </div>
        <div class="settings-placeholder-card">
          <div class="settings-placeholder-card__title">Placeholder</div>
          <p>Contenu à définir.</p>
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}
