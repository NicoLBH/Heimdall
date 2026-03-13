import { store } from "../store.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function ensureProjectFormDefaults() {
  const form = store.projectForm;
  if (typeof form.city !== "string") form.city = "";
  if (typeof form.postalCode !== "string") form.postalCode = "";
  if (typeof form.zoneSismique !== "string") form.zoneSismique = "";
  if (typeof form.liquefactionText !== "string") {
    form.liquefactionText = form.liquefaction && form.liquefaction !== "no"
      ? form.liquefaction
      : "";
  }
  if (typeof form.importanceCategory !== "string") {
    form.importanceCategory = form.importance || "II";
  }

  if ((!form.city || !form.postalCode) && form.communeCp) {
    const raw = String(form.communeCp).trim();
    const match = raw.match(/^(.*?)(?:\s*[,-]?\s*)(\d{4,5})$/);
    if (match) {
      form.city = form.city || match[1].trim();
      form.postalCode = form.postalCode || match[2].trim();
    } else {
      form.city = form.city || raw;
    }
  }
}

function renderNavIcon(name) {
  const icons = {
    general: `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" class="octicon octicon-gear"><path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z"></path></svg>`,
    people: `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" class="octicon octicon-people"><path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z"></path></svg>`,
    pin: `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" class="octicon"><path d="M7.75 0a4.75 4.75 0 0 1 4.75 4.75c0 3.124-3.266 6.717-4.148 7.63a.5.5 0 0 1-.704 0C6.766 11.467 3.5 7.874 3.5 4.75A4.25 4.25 0 0 1 7.75 0Zm0 6.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"></path><path d="M7.75 15.5a.75.75 0 0 1-.75-.75v-1.3a.75.75 0 0 1 1.5 0v1.3a.75.75 0 0 1-.75.75Z"></path></svg>`,
    book: `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" class="octicon"><path d="M2.75 1h8.5A1.75 1.75 0 0 1 13 2.75v9.5A1.75 1.75 0 0 1 11.25 14h-8.5A1.75 1.75 0 0 1 1 12.25v-9.5C1 1.784 1.784 1 2.75 1Zm0 1.5a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Z"></path><path d="M4 4.75A.75.75 0 0 1 4.75 4h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 4 4.75Zm0 3A.75.75 0 0 1 4.75 7h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 4 7.75Z"></path></svg>`,
    shield: `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" class="octicon"><path d="M7.467.133a1.748 1.748 0 0 1 1.066 0l4.25 1.457c.71.243 1.217.91 1.217 1.66v3.476c0 3.56-2.137 6.79-5.42 8.13a1.75 1.75 0 0 1-1.32 0C3.977 13.516 1.84 10.286 1.84 6.726V3.25c0-.75.507-1.417 1.217-1.66Zm.533 1.42-4.25 1.457a.25.25 0 0 0-.17.24v3.476c0 2.933 1.757 5.59 4.453 6.69a.249.249 0 0 0 .187 0c2.696-1.1 4.453-3.757 4.453-6.69V3.25a.25.25 0 0 0-.17-.24Z"></path></svg>`,
    checklist: `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" class="octicon"><path d="M3.75 2a.75.75 0 0 1 .75.75V3h7.75a.75.75 0 0 1 0 1.5H4.5v.25a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 3.75 2Zm0 4.5a.75.75 0 0 1 .75.75v.25h7.75a.75.75 0 0 1 0 1.5H4.5v.25a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Zm0 4.5a.75.75 0 0 1 .75.75V12h7.75a.75.75 0 0 1 0 1.5H4.5v.25a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Z"></path></svg>`
  };
  return icons[name] || icons.general;
}

function renderSectionCard({ title, description = "", body = "", badge = "" }) {
  return `
    <div class="settings-card settings-card--param">
      <div class="settings-card__head">
        <div>
          <h4>${escapeHtml(title)}</h4>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
        ${badge ? `<span class="settings-badge mono">${escapeHtml(badge)}</span>` : ""}
      </div>
      ${body}
    </div>
  `;
}

function renderInputField({ id, label, value = "", placeholder = "", width = "" }) {
  return `
    <div class="form-row form-row--settings ${width}">
      <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <input id="${escapeHtml(id)}" type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
    </div>
  `;
}

function renderSelectField({ id, label, value = "", options = [] }) {
  return `
    <div class="form-row form-row--settings">
      <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <select id="${escapeHtml(id)}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderPlaceholderList(items) {
  return `
    <ul class="settings-list settings-list--tight">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function getPageHtml(form) {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--parametres">
      <div class="project-simple-scroll project-simple-scroll--parametres" id="projectParametresScroll">
        <div class="settings-shell settings-shell--parametres">
          <div class="settings-layout settings-layout--parametres">
            <aside class="settings-nav settings-nav--parametres">
              <div class="settings-nav__group settings-nav__group--project">
                <div class="settings-nav__title">Paramètres</div>

                <a href="#parametres-general" class="settings-nav__item settings-nav__item--main is-active" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("general")}</span>
                  <span>Général</span>
                </a>

                <div class="settings-nav__separator"></div>
                <div class="settings-nav__section-label">Données de base projet</div>
                <a href="#parametres-localisation" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("pin")}</span>
                  <span>localisation</span>
                </a>
                <a href="#parametres-type-ouvrage" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("general")}</span>
                  <span>type d’ouvrage</span>
                </a>
                <a href="#parametres-phase" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("checklist")}</span>
                  <span>phase</span>
                </a>
                <a href="#parametres-collaborateurs" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("people")}</span>
                  <span>Collaborateurs</span>
                </a>
                <a href="#parametres-lots" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>lots</span>
                </a>
                <a href="#parametres-zones-batiments" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>zones / bâtiments / niveaux</span>
                </a>

                <div class="settings-nav__separator"></div>
                <div class="settings-nav__section-label">Référentiels techniques et réglementaires</div>
                <a href="#parametres-zones-climatiques" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("pin")}</span>
                  <span>zones climatiques</span>
                </a>
                <a href="#parametres-zones-reglementaires" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("shield")}</span>
                  <span>zones réglementaires</span>
                </a>
                <a href="#parametres-incendie" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("shield")}</span>
                  <span>règlement incendie applicable</span>
                </a>
                <a href="#parametres-accessibilite" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("shield")}</span>
                  <span>règlement accessibilité</span>
                </a>
                <a href="#parametres-parasismiques" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("shield")}</span>
                  <span>règlements parasismiques</span>
                </a>
                <a href="#parametres-thermiques" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>référentiels thermiques</span>
                </a>
                <a href="#parametres-acoustique" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>référentiels acoustique</span>
                </a>
                <a href="#parametres-normes" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>DTU / Eurocodes / normes projet</span>
                </a>
                <a href="#parametres-doctrines" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>doctrines particulières du maître d’ouvrage</span>
                </a>

                <div class="settings-nav__separator"></div>
                <div class="settings-nav__section-label">Gouvernance</div>
                <a href="#parametres-droits" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("people")}</span>
                  <span>droits par acteur</span>
                </a>
                <a href="#parametres-circuits" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("checklist")}</span>
                  <span>circuits de validation</span>
                </a>
                <a href="#parametres-taxonomie" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>taxonomie des sujets</span>
                </a>
                <a href="#parametres-criticite" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("shield")}</span>
                  <span>règles de criticité</span>
                </a>
                <a href="#parametres-nomenclature" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>nomenclature documentaire</span>
                </a>
                <a href="#parametres-workflow-pr" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("checklist")}</span>
                  <span>workflow de PR</span>
                </a>
                <a href="#parametres-cloture" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("shield")}</span>
                  <span>politique de clôture des sujets</span>
                </a>

                <div class="settings-nav__separator"></div>
                <div class="settings-nav__section-label">Paramètres opérationnels</div>
                <a href="#parametres-jalons" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("checklist")}</span>
                  <span>jalons</span>
                </a>
                <a href="#parametres-responsabilites" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("people")}</span>
                  <span>responsabilités</span>
                </a>
                <a href="#parametres-champs" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("checklist")}</span>
                  <span>champs obligatoires</span>
                </a>
                <a href="#parametres-modeles" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>modèles de documents</span>
                </a>
                <a href="#parametres-templates" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("book")}</span>
                  <span>templates de remarques</span>
                </a>
                <a href="#parametres-diffusion" class="settings-nav__item" data-settings-anchor>
                  <span class="settings-nav__icon">${renderNavIcon("people")}</span>
                  <span>matrices de diffusion</span>
                </a>
              </div>
            </aside>

            <div class="settings-content settings-content--parametres">
              <header class="settings-page-header settings-page-header--parametres" id="parametres-general">
                <h2>General</h2>
                <p>Configuration structurante du projet, sur un gabarit Settings proche de GitHub : navigation latérale, zone centrale resserrée et grands respirations latérales. Les champs réellement branchés au store sont saisis ici, les autres blocs posent la doctrine cible de la page.</p>
              </header>

              <section class="settings-section settings-section--top" id="parametres-localisation">
                <h3>Données de base projet</h3>
                <p class="settings-lead">Cette première section regroupe les informations d’identité du projet et les paramètres de cadrage initial.</p>

                ${renderSectionCard({
                  title: "localisation",
                  description: "Localisation administrative et d’usage du projet.",
                  badge: "LIVE",
                  body: `<div class="settings-form-grid settings-form-grid--thirds">
                    ${renderInputField({ id: "projectCity", label: "Ville", value: form.city || "", placeholder: "Ex. Annecy" })}
                    ${renderInputField({ id: "projectPostalCode", label: "CP", value: form.postalCode || "", placeholder: "Ex. 74000" })}
                  </div>`
                })}

                ${renderSectionCard({
                  title: "type d’ouvrage",
                  description: "Qualification réglementaire et niveau d’importance du projet.",
                  badge: "LIVE",
                  body: `<div class="settings-form-grid settings-form-grid--thirds">
                    ${renderInputField({ id: "importanceCategory", label: "catégorie d'importance", value: form.importanceCategory || form.importance || "II", placeholder: "Ex. II" })}
                  </div>`
                })}

                ${renderSectionCard({
                  title: "phase",
                  description: "Positionnement du projet dans son cycle de production.",
                  body: `<div class="settings-form-grid settings-form-grid--thirds">
                    ${renderSelectField({ id: "projectPhase", label: "Phase", value: form.phase || "APS", options: ["ESQ", "APS", "APD", "PRO", "DCE", "EXE", "DET", "AOR"] })}
                  </div>`
                })}

                ${renderSectionCard({
                  title: "Collaborateurs",
                  description: "Acteurs clés, profils et rôles mobilisés sur le projet.",
                  body: `${renderPlaceholderList([
                    "MOA, MOE, architecte, BET, CT, SPS, OPC, entreprises, exploitant.",
                    "Droits d'écriture, validation, revue et diffusion par acteur.",
                    "Capacités de création de sujets, propositions et clôtures."
                  ])}`
                })}

                ${renderSectionCard({
                  title: "lots",
                  description: "Structuration technique et répartition par macro-lots ou spécialités.",
                  body: `${renderPlaceholderList([
                    "Structure, façade, CVC, CFO/CFA, sécurité incendie, accessibilité, thermique, acoustique.",
                    "Affectation des responsables et circuits de revue par lot."
                  ])}`
                })}

                ${renderSectionCard({
                  title: "zones / bâtiments / niveaux",
                  description: "Découpage spatial servant à l’adressage des documents, sujets et avis.",
                  body: `${renderPlaceholderList([
                    "Bâtiments, ailes, blocs, zones fonctionnelles, niveaux et locaux.",
                    "Règles de nommage réutilisables dans les sujets et propositions."
                  ])}`
                })}
              </section>

              <section class="settings-section" id="parametres-zones-climatiques">
                <h3>Référentiels techniques et réglementaires</h3>
                <p class="settings-lead">Référentiels de calcul, doctrines et cadres réglementaires applicables au projet.</p>

                ${renderSectionCard({
                  title: "zones climatiques",
                  description: "Références climatiques utilisées par les volets thermique, enveloppe et exploitation.",
                  body: `${renderPlaceholderList([
                    "Zone climatique hiver / été.",
                    "Altitude, exposition, vent dominant, neige, températures de base."
                  ])}`
                })}

                ${renderSectionCard({
                  title: "zones réglementaires",
                  description: "Paramètres territoriaux imposés par la réglementation applicable.",
                  badge: "LIVE",
                  body: `<div class="settings-form-grid settings-form-grid--thirds">
                    ${renderInputField({ id: "zoneSismique", label: "zone sismique", value: form.zoneSismique || "", placeholder: "Ex. 3" })}
                    ${renderInputField({ id: "liquefactionText", label: "liquéfaction", value: form.liquefactionText || "", placeholder: "Ex. non / possible / avérée" })}
                  </div>`
                })}

                ${renderSectionCard({
                  title: "règlement incendie applicable",
                  description: "Corpus incendie principal retenu pour le projet.",
                  body: `${renderPlaceholderList([
                    "ERP / IGH / habitation / bureaux / code du travail / ICPE selon le cas.",
                    "Références d’arrêtés, versions et doctrines internes applicables."
                  ])}`
                })}

                ${renderSectionCard({
                  title: "règlement accessibilité",
                  description: "Base normative accessibilité PMR et dispositions complémentaires retenues.",
                  body: `${renderPlaceholderList([
                    "Exigences réglementaires, cas particuliers, dérogations et pièces justificatives attendues."
                  ])}`
                })}

                ${renderSectionCard({
                  title: "règlements parasismiques",
                  description: "Cadre réglementaire et hypothèses d’entrée du lot parasismique.",
                  badge: "LIVE",
                  body: `<div class="settings-form-grid settings-form-grid--thirds">
                    ${renderSelectField({ id: "referential", label: "référentiel", value: form.referential || "EC8", options: ["EC8", "PS92"] })}
                    ${renderSelectField({ id: "soilClass", label: "classe de sol", value: form.soilClass || "A", options: ["A", "B", "C", "D", "E"] })}
                  </div>`
                })}

                ${renderSectionCard({
                  title: "référentiels thermiques",
                  description: "Références thermiques et énergétiques applicables.",
                  body: `${renderPlaceholderList([
                    "RE2020, RT existant, labels et exigences contractuelles complémentaires."
                  ])}`
                })}

                ${renderSectionCard({
                  title: "référentiels acoustique",
                  description: "Normes, objectifs contractuels et seuils d’acceptation acoustiques.",
                  body: `${renderPlaceholderList([
                    "NRA, programmes spécifiques, cahiers des charges de performance et modalités de contrôle."
                  ])}`
                })}

                ${renderSectionCard({
                  title: "DTU / Eurocodes / normes projet",
                  description: "Bibliothèque normative de référence du projet.",
                  body: `${renderPlaceholderList([
                    "DTU, Eurocodes, NF, guides, règles professionnelles et prescriptions spécifiques."
                  ])}`
                })}

                ${renderSectionCard({
                  title: "doctrines particulières du maître d’ouvrage",
                  description: "Exigences internes et doctrines projet non strictement réglementaires.",
                  body: `${renderPlaceholderList([
                    "Standards internes, listes rouges, bibliothèques de détails, prescriptions d’exploitation et d’entretien."
                  ])}`
                })}
              </section>

              <section class="settings-section" id="parametres-droits">
                <h3>Gouvernance</h3>
                <p class="settings-lead">Garde-fous organisationnels qui encadrent la production, la revue, la qualification et la clôture.</p>

                ${renderSectionCard({ title: "droits par acteur", body: renderPlaceholderList(["Droits d’ouverture, commentaire, validation, rejet, diffusion et clôture par rôle."]) })}
                ${renderSectionCard({ title: "circuits de validation", body: renderPlaceholderList(["Règles d’approbation, escalade, quorum et cas bloquants selon la nature du sujet."]) })}
                ${renderSectionCard({ title: "taxonomie des sujets", body: renderPlaceholderList(["Arborescence de thèmes, sous-thèmes, disciplines et codes de classification réutilisés partout."]) })}
                ${renderSectionCard({ title: "règles de criticité", body: renderPlaceholderList(["Critères de sévérité, probabilité, impact, urgence et seuils d’alerte."]) })}
                ${renderSectionCard({ title: "nomenclature documentaire", body: renderPlaceholderList(["Convention de nommage, identifiants, versions, lots, zones et statuts documentaires."]) })}
                ${renderSectionCard({ title: "workflow de PR", body: renderPlaceholderList(["Règles d’ouverture, revue, approbation, intégration et traçabilité des propositions."]) })}
                ${renderSectionCard({ title: "politique de clôture des sujets", body: renderPlaceholderList(["Preuves minimales, validations attendues et critères de fermeture / réouverture."]) })}
              </section>

              <section class="settings-section" id="parametres-jalons">
                <h3>Paramètres opérationnels</h3>
                <p class="settings-lead">Paramètres d’exécution utiles au quotidien pour produire, revoir et diffuser de manière homogène.</p>

                ${renderSectionCard({ title: "jalons", body: renderPlaceholderList(["Jalons de revue, échéances, fenêtres de diffusion et points de contrôle."]) })}
                ${renderSectionCard({ title: "responsabilités", body: renderPlaceholderList(["Répartition RACI ou équivalent par type d’action, lot et phase."]) })}
                ${renderSectionCard({ title: "champs obligatoires", body: renderPlaceholderList(["Données minimales exigées selon l’objet créé : sujet, avis, document, proposition, diffusion."]) })}
                ${renderSectionCard({ title: "modèles de documents", body: renderPlaceholderList(["Gabarits de fiches, bordereaux, rapports, notices et documents de synthèse."]) })}
                ${renderSectionCard({ title: "templates de remarques", body: renderPlaceholderList(["Bibliothèque de formulations normalisées par discipline et niveau de criticité."]) })}
                ${renderSectionCard({ title: "matrices de diffusion", body: renderPlaceholderList(["Destinataires, visas, pièces jointes et conditions de diffusion selon le contexte."]) })}
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderProjectParametres(root) {
  ensureProjectFormDefaults();

  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Paramètres",
    variant: "parametres",
    title: "",
    subtitle: "",
    metaHtml: "",
    toolbarHtml: ""
  });

  root.innerHTML = getPageHtml(store.projectForm);

  registerProjectPrimaryScrollSource(document.getElementById("projectParametresScroll"));
  bindParametresEvents();
  bindParametresNav();
}

function bindValue(id, handler, eventName = "input") {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(eventName, (e) => handler(e.target.value));
}

function bindParametresEvents() {
  bindValue("projectCity", (value) => {
    store.projectForm.city = value;
    store.projectForm.communeCp = [store.projectForm.city, store.projectForm.postalCode].filter(Boolean).join(" ").trim();
  });

  bindValue("projectPostalCode", (value) => {
    store.projectForm.postalCode = value;
    store.projectForm.communeCp = [store.projectForm.city, store.projectForm.postalCode].filter(Boolean).join(" ").trim();
  });

  bindValue("importanceCategory", (value) => {
    store.projectForm.importanceCategory = value;
    store.projectForm.importance = value;
  });

  bindValue("projectPhase", (value) => {
    store.projectForm.phase = value;
  }, "change");

  bindValue("zoneSismique", (value) => {
    store.projectForm.zoneSismique = value;
  });

  bindValue("liquefactionText", (value) => {
    store.projectForm.liquefactionText = value;
    store.projectForm.liquefaction = value;
  });

  bindValue("referential", (value) => {
    store.projectForm.referential = value;
  }, "change");

  bindValue("soilClass", (value) => {
    store.projectForm.soilClass = value;
  }, "change");
}

function bindParametresNav() {
  const scrollEl = document.getElementById("projectParametresScroll");
  const links = Array.from(document.querySelectorAll("[data-settings-anchor]"));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!scrollEl || !links.length || !sections.length) return;

  const setActive = (id) => {
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
    });
  };

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      const top = target.offsetTop - 8;
      scrollEl.scrollTo({ top, behavior: "smooth" });
      setActive(target.id);
    });
  });

  const onScroll = () => {
    const current = sections.reduce((best, section) => {
      const delta = Math.abs(section.offsetTop - scrollEl.scrollTop - 12);
      if (!best || delta < best.delta) {
        return { id: section.id, delta };
      }
      return best;
    }, null);

    if (current?.id) setActive(current.id);
  };

  scrollEl.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
