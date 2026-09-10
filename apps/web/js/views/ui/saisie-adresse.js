/**
 * Le champ d'adresse, **une fois**, pour tous les écrans qui en demandent une.
 *
 * ## Un seul champ, et non quatre
 *
 * On tape une adresse ; le service la résout ; la commune, le code postal, le
 * code INSEE et les coordonnées viennent avec. Demander ces quatre-là
 * séparément, c'était demander à quelqu'un le code INSEE de sa commune —
 * personne ne le connaît, et l'inventer rend le zonage d'une homonyme.
 *
 * ## Où vit quoi
 *
 * - ce qu'on garde d'une réponse, et ce qui manque pour calculer :
 *   `services/adresse-saisie.js` (pur, testé) ;
 * - le réseau : `services/georisques-service.js` ;
 * - le champ, la liste, les flèches, le clic dehors : ici.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il n'écrit **rien**. Il rend une localisation à celui qui l'a branché, et
 * c'est cet écran-là qui décide ce qu'il en fait — dessiner une carte, relancer
 * un calcul, ou préparer une proposition. Rien n'entre jamais directement dans
 * la mémoire (`docs/fondamentaux.md`, règle 1).
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { searchIgnAddresses, resolveFrenchAddress } from "../../services/georisques-service.js";
import {
  LONGUEUR_MINIMALE,
  DELAI_DE_FRAPPE,
  propositionsDAdresse,
  localisationDeLAdresse
} from "../../services/adresse-saisie.js";

/**
 * L'état de chaque champ, par nom.
 *
 * Dans le module, et non dans l'écran : deux écrans peuvent porter un champ en
 * même temps — la variante et les paramètres vivent dans deux onglets —, et un
 * état unique ferait clignoter la liste de l'un pendant qu'on tape dans l'autre.
 */
const saisies = new Map();

function etatDeLaSaisie(nom) {
  if (!saisies.has(nom)) {
    saisies.set(nom, { propositions: [], cherche: false, ouverte: false, actif: -1, resolution: false });
  }
  return saisies.get(nom);
}

/**
 * Le champ, tel qu'il se dessine.
 *
 * Les classes sont celles des Paramètres — `gh-editable-field--autocomplete`,
 * `gh-autocomplete` — parce que c'est de là que le composant a été sorti : un
 * habillage neuf aurait donné deux champs d'adresse d'apparence différente le
 * temps que les écrans basculent.
 *
 * `modifiable` rend la variante des Paramètres : le champ y est **verrouillé**
 * jusqu'au crayon, et se valide par un bouton — parce qu'y toucher engage la
 * fiche du projet. Ailleurs, on tape directement : une saisie d'Atelier n'écrit
 * rien, et lui demander deux clics de plus serait deux clics pour rien.
 *
 * @param {object} options
 * @param {string} options.nom l'identité du champ, celle qu'on rebranche
 * @param {string} [options.id] l'identifiant HTML, quand un écran le nomme déjà
 * @param {string} [options.label] au-dessus du champ ; vide pour n'en pas mettre
 * @param {string} [options.valeur] ce qu'il porte déjà
 * @param {string} [options.aide] la phrase sous le champ
 * @param {boolean} [options.modifiable] avec crayon et « Valider »
 */
export function renderSaisieAdresse({
  nom,
  id = "",
  label = "Adresse",
  valeur = "",
  placeholder = "Ex. 12 avenue de la Gare, Annecy",
  aide = "",
  desactive = false,
  modifiable = false,
  placeholderFort = false
} = {}) {
  const cle = escapeHtml(String(nom ?? ""));
  const champId = escapeHtml(String(id ?? "").trim() || `saisieAdresse-${String(nom ?? "")}`);
  const listeId = `${champId}-propositions`;
  const crayon = svgIcon("pencil", { className: "octicon" });
  const coche = svgIcon("check", { className: "octicon" });

  return `
    <div class="saisie-adresse" data-saisie-adresse="${cle}">
      ${label ? `<label class="saisie-adresse__label" for="${champId}">${escapeHtml(label)}</label>` : ""}
      <div class="gh-editable-field gh-editable-field--autocomplete"${modifiable ? " data-editable-field" : ""}>
        <div class="gh-editable-field__control">
          <input
            id="${champId}"
            type="text"
            class="gh-input gh-editable-field__input${placeholderFort ? " gh-input--placeholder-strong" : ""}"
            value="${escapeHtml(valeur)}"
            placeholder="${escapeHtml(placeholder)}"
            autocomplete="off"
            ${desactive ? "disabled" : ""}
            ${modifiable ? "readonly data-editable-input" : ""}
            data-saisie-adresse-champ="${cle}"
            aria-autocomplete="list"
            aria-expanded="false"
            aria-controls="${listeId}"
          >
          <div
            class="gh-autocomplete gh-autocomplete--cities"
            id="${listeId}"
            data-saisie-adresse-liste="${cle}"
            role="listbox"
            hidden
          ></div>
        </div>
        ${
          modifiable
            ? `<button
                type="button"
                class="gh-btn gh-btn--ghost gh-editable-field__btn"
                data-editable-toggle
                aria-label="Modifier"
                data-edit-label="Modifier"
                data-validate-label="Valider"
              >
                <span class="gh-editable-field__btn-icon" data-editable-icon>${crayon}</span>
                <span class="gh-editable-field__btn-text" data-editable-text>Modifier</span>
              </button>

              <template data-icon-edit>${crayon}</template>
              <template data-icon-validate>${coche}</template>`
            : ""
        }
      </div>
      ${aide ? `<small class="saisie-adresse__aide">${escapeHtml(aide)}</small>` : ""}
    </div>
  `;
}

/** La liste des propositions, redessinée seule : le champ garde son curseur. */
function dessinerLaListe(nom, liste, champ) {
  if (!liste || !champ) return;

  const etat = etatDeLaSaisie(nom);
  const ouverte = etat.ouverte && (etat.cherche || etat.propositions.length > 0);

  champ.setAttribute("aria-expanded", ouverte ? "true" : "false");
  liste.hidden = !ouverte;

  if (!ouverte) {
    liste.innerHTML = "";
    return;
  }

  if (etat.cherche) {
    liste.innerHTML = `<div class="gh-autocomplete__status">Recherche…</div>`;
    return;
  }

  liste.innerHTML = etat.propositions.map((proposition, rang) => `
    <button
      type="button"
      class="gh-autocomplete__item ${rang === etat.actif ? "is-active" : ""}"
      data-saisie-adresse-choix="${escapeHtml(String(nom))}"
      data-saisie-adresse-rang="${rang}"
      role="option"
      aria-selected="${rang === etat.actif ? "true" : "false"}"
    >
      <span class="gh-autocomplete__item-main">${escapeHtml(proposition.libelle)}</span>
    </button>
  `).join("");
}

/**
 * Brancher un champ déjà dessiné.
 *
 * @param {Element} racine où chercher le champ
 * @param {object} options
 * @param {string} options.nom l'identité passée au rendu
 * @param {Function} options.quandChoisie reçoit la localisation résolue —
 *   `{address, city, postalCode, codeInsee, latitude, longitude}`
 * @param {Function} [options.quandTapee] reçoit le texte à chaque frappe, pour
 *   les écrans qui veulent effacer ce qui découlait de l'adresse précédente
 * @param {Function} [options.quandEchoue] reçoit le motif quand la résolution
 *   n'aboutit pas : se taire laisserait croire que l'adresse a été prise
 */
export function brancherLaSaisieDAdresse(racine, { nom, quandChoisie, quandTapee, quandEchoue } = {}) {
  const cle = String(nom ?? "");
  const champ = racine?.querySelector(`[data-saisie-adresse-champ="${cle}"]`);
  const liste = racine?.querySelector(`[data-saisie-adresse-liste="${cle}"]`);
  if (!champ || !liste || champ.dataset.saisieBranchee === "true") return;
  champ.dataset.saisieBranchee = "true";

  let demande = 0;
  let attente = null;

  const fermer = () => {
    const etat = etatDeLaSaisie(cle);
    etat.propositions = [];
    etat.cherche = false;
    etat.ouverte = false;
    etat.actif = -1;
    dessinerLaListe(cle, liste, champ);
  };

  /**
   * Résoudre l'adresse choisie, puis la rendre.
   *
   * La résolution est un second appel : la complétion rend un libellé, elle ne
   * rend ni code INSEE ni coordonnées. C'est ce second appel qui donne au
   * calcul de quoi partir.
   */
  const choisir = async (proposition) => {
    if (!proposition) return;

    const etat = etatDeLaSaisie(cle);
    etat.resolution = true;
    champ.value = proposition.libelle;
    fermer();

    try {
      const localisation = localisationDeLAdresse(await resolveFrenchAddress(proposition.libelle));
      if (!localisation) throw new Error("Adresse introuvable.");
      champ.value = localisation.address || proposition.libelle;
      if (typeof quandChoisie === "function") await quandChoisie(localisation);
    } catch (erreur) {
      // Se taire ferait croire que l'adresse a été prise, et l'écran resterait
      // sur la précédente sans qu'un mot le dise (règle 5).
      if (typeof quandEchoue === "function") {
        quandEchoue(erreur instanceof Error ? erreur.message : String(erreur));
      }
    } finally {
      etatDeLaSaisie(cle).resolution = false;
    }
  };

  champ.addEventListener("input", () => {
    const tape = String(champ.value || "").trim();
    if (typeof quandTapee === "function") quandTapee(tape);

    if (attente) clearTimeout(attente);
    if (tape.length < LONGUEUR_MINIMALE) { fermer(); return; }

    const etat = etatDeLaSaisie(cle);
    etat.cherche = true;
    etat.ouverte = true;
    etat.propositions = [];
    etat.actif = -1;
    dessinerLaListe(cle, liste, champ);

    const laMienne = ++demande;
    attente = setTimeout(async () => {
      try {
        const propositions = propositionsDAdresse(await searchIgnAddresses({ query: tape, limit: 6 }));
        // Une réponse en retard ne remplace pas une plus récente : sans cela, la
        // liste affiche les propositions d'un texte qu'on a fini d'effacer.
        if (laMienne !== demande) return;

        const courant = etatDeLaSaisie(cle);
        courant.propositions = propositions;
        courant.cherche = false;
        courant.ouverte = propositions.length > 0;
        courant.actif = propositions.length ? 0 : -1;
        dessinerLaListe(cle, liste, champ);
      } catch {
        if (laMienne === demande) fermer();
      }
    }, DELAI_DE_FRAPPE);
  });

  champ.addEventListener("keydown", (evenement) => {
    const etat = etatDeLaSaisie(cle);
    if (!etat.ouverte || !etat.propositions.length) return;

    if (evenement.key === "ArrowDown" || evenement.key === "ArrowUp") {
      evenement.preventDefault();
      const pas = evenement.key === "ArrowDown" ? 1 : -1;
      etat.actif = (etat.actif + pas + etat.propositions.length) % etat.propositions.length;
      dessinerLaListe(cle, liste, champ);
      return;
    }

    if (evenement.key === "Enter") {
      const choisie = etat.propositions[etat.actif] || etat.propositions[0];
      if (!choisie) return;
      evenement.preventDefault();
      void choisir(choisie);
      return;
    }

    if (evenement.key === "Escape") {
      evenement.preventDefault();
      fermer();
    }
  });

  // `mousedown` et non `click` : le `blur` du champ ferme la liste, et un `click`
  // n'arriverait jamais sur un élément qu'on vient de retirer du document.
  liste.addEventListener("mousedown", (evenement) => {
    const option = evenement.target.closest("[data-saisie-adresse-choix]");
    if (!option || option.getAttribute("data-saisie-adresse-choix") !== cle) return;
    evenement.preventDefault();
    const rang = Number(option.getAttribute("data-saisie-adresse-rang"));
    void choisir(etatDeLaSaisie(cle).propositions[rang]);
  });

  champ.addEventListener("blur", () => {
    setTimeout(() => {
      if (!document.activeElement || !liste.contains(document.activeElement)) fermer();
    }, 120);
  });
}
