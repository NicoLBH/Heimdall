import { registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";

export function renderSeismicCalculModel(root) {
  root.innerHTML = `
    <section class="settings-section is-active">
      <div class="settings-card settings-card--param">
        <div class="settings-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Méthode de calcul</h4>
            </span>
            <p>Cette section est prête à accueillir la configuration détaillée du modèle de calcul parasismique.</p>
          </div>
        </div>
        <div class="settings-placeholder-card">
          <div class="settings-placeholder-card__title">Placeholder</div>
          <p>Contenu à définir.</p>
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(root.closest("#projectSeismicRouterScroll") || document.getElementById("projectSeismicRouterScroll"));
}
