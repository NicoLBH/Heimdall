/**
 * Ce qui repose sur une valeur — l'étude d'impact.
 *
 * ## La question qu'un ingénieur pose vraiment
 *
 * Pas « et si ? », mais « **qu'est-ce qui casse si ça bouge ?** ». Elle se pose
 * avant de corriger une cote, avant d'accepter une hypothèse, avant de signer.
 * Jusqu'ici elle n'avait pas de réponse : le lien entre une donnée et ce qui
 * s'appuie dessus était dans la tête de celui qui avait fait la note.
 *
 * ## Pourquoi des strates, et pas une liste
 *
 * « 47 affirmations reposent dessus » ne se lit pas : on ne sait pas par quel
 * bout reprendre. Rangées par **distance** — ce qui la lit directement, puis ce
 * qui lit cela —, la même réponse devient un chemin : « trois pas, et le
 * premier ne fait que deux lignes ». C'est le même principe que le plan de
 * recalcul de l'étape 4, en plus petit.
 *
 * ## Ce que cet écran ne prétend pas
 *
 * Il dit ce qui **repose** ; il ne dit pas ce que ça deviendrait. Recalculer
 * demande l'évaluateur — étape 3 —, et afficher un chiffre ici ferait passer du
 * propagé pour du calculé. Il dit aussi d'où viennent ses liens : enregistrés au
 * versement, ou rapprochés par nom après coup. Un graphe où l'on ne fait pas la
 * différence se lit comme s'il était tout entier sûr.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import {
  couvertureDesApplications, emploisParAffirmation, impactDe
} from "../../services/memoire-applications.js";
import { currentAssertions, titreDeLAffirmation } from "../../services/project-memory.js";

const texte = (valeur) => String(valeur ?? "").trim();
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/** Les valeurs qu'on peut interroger : celles qui valent aujourd'hui, nommées. */
export function valeursInterrogeables(assertions = [], emplois = new Map()) {
  return currentAssertions(Array.isArray(assertions) ? assertions : [])
    // Une règle appliquée n'est pas une valeur du projet : c'est le texte qui
    // en produit une. On interroge ce que le projet dit, pas ce qui le dit.
    .filter((assertion) => assertion?.payload?.referentiel !== true)
    .filter((assertion) => texte(assertion?.id) && texte(titreDeLAffirmation(assertion)))
    .map((assertion) => ({
      id: texte(assertion.id),
      titre: titreDeLAffirmation(assertion),
      sujet: texte(assertion?.payload?.subject) || texte(assertion?.subject_key),
      lectures: emplois.get(texte(assertion.id))?.lectures ?? 0
    }))
    // Ce qui sert le plus en tête : c'est là que la question se pose, et une
    // liste alphabétique ferait chercher.
    .sort((gauche, droite) =>
      droite.lectures - gauche.lectures || gauche.titre.localeCompare(droite.titre, "fr"));
}

/** Une valeur qu'on peut interroger, avec ce qu'elle sert déjà. */
function renderChoixDUneValeur(valeur) {
  return `
    <button type="button" class="impact-choix" data-impact-choisir="${escapeHtml(valeur.id)}">
      <span class="impact-choix__titre">${escapeHtml(valeur.titre)}</span>
      <span class="impact-choix__compte${valeur.lectures ? "" : " impact-choix__compte--vide"}">${
        valeur.lectures
          ? `${valeur.lectures} ${accorde(valeur.lectures, "emploi", "emplois")}`
          : "aucun emploi"
      }</span>
    </button>
  `;
}

/** La liste, ou la phrase qui dit pourquoi elle est vide. */
function renderListeDesValeurs(valeurs, { cherche = false } = {}) {
  if (valeurs.length) return valeurs.map(renderChoixDUneValeur).join("");
  return `<p class="variante-rang__vide">${
    cherche ? "Aucune valeur ne porte ce mot." : "Ce projet ne porte aucune valeur interrogeable."
  }</p>`;
}

function renderChoix(valeurs, couverture) {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Étude d'impact">
      <div class="fichiers-saisie__boite impact-boite">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("beaker", { className: "octicon" })} Qu'est-ce qui repose sur cette valeur ?</b>
          <button type="button" class="fichiers-saisie__fermer" data-impact-fermer
            aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="variante-lead">
          ${renderProvenanceDuGraphe(couverture)}
        </p>

        <label class="fichiers-saisie__champ">
          <span>Chercher une valeur</span>
          <input type="text" class="gh-input" data-impact-recherche placeholder="altitude, classement, hauteur…"
            autocomplete="off">
        </label>

        <div class="impact-liste" data-impact-liste>${renderListeDesValeurs(valeurs)}</div>

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-impact-fermer>Fermer</button>
        </footer>
      </div>
    </div>
  `;
}

/** D'où viennent les liens qu'on va montrer. Le taire les ferait tous croire sûrs. */
function renderProvenanceDuGraphe(couverture) {
  if (!couverture.lectures) {
    return "Aucune lecture n'est enregistrée pour ce projet. "
      + "Lancez « Verser › Reconstruire les liens du raisonnement » pour relire ce que ses règles ont lu.";
  }

  const morceaux = [`${couverture.lectures} ${accorde(couverture.lectures, "lecture", "lectures")}`];
  if (couverture.enregistrees) morceaux.push(`${couverture.enregistrees} enregistrée(s) au versement`);
  if (couverture.reconstruites) morceaux.push(`${couverture.reconstruites} rapprochée(s) par nom après coup`);
  if (couverture.orphelines) morceaux.push(`${couverture.orphelines} sur un nom que personne n'a versé`);

  return `${morceaux.join(" · ")}. Un lien rapproché par nom vaut moins qu'un lien figé au versement.`;
}

/** Une strate : ce qui est à n pas de la valeur qu'on fait bouger. */
function renderStrate(rang, ids, { parId, emplois }) {
  const lignes = ids
    .map((id) => ({ id, assertion: parId.get(id) }))
    .filter((entree) => entree.assertion)
    .map((entree) => {
      const suite = emplois.get(entree.id)?.lectures ?? 0;
      return `
        <li class="impact-ligne">
          <span class="impact-ligne__titre">${escapeHtml(titreDeLAffirmation(entree.assertion))}</span>
          <span class="impact-ligne__suite">${
            suite ? `${suite} ${accorde(suite, "emploi", "emplois")} en aval` : "rien ne repose dessus"
          }</span>
        </li>
      `;
    });

  return `
    <section class="impact-strate">
      <h5><span class="impact-strate__rang">${rang}</span> ${
        rang === 1 ? "la lisent directement" : `à ${rang} pas`
      } <span class="impact-strate__compte">${lignes.length}</span></h5>
      <ul class="impact-lignes">${lignes.join("")}</ul>
    </section>
  `;
}

function renderImpact(valeur, rendu, { parId, emplois }) {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Étude d'impact">
      <div class="fichiers-saisie__boite impact-boite impact-boite--large">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("beaker", { className: "octicon" })} ${escapeHtml(valeur.titre)}</b>
          <button type="button" class="fichiers-saisie__fermer" data-impact-fermer
            aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="variante-lead">
          ${
            rendu.total
              ? `<b>${rendu.lectures} ${accorde(rendu.lectures, "règle la lit", "règles la lisent")}</b> directement.
                 En tout, <b>${rendu.total} ${accorde(rendu.total, "affirmation repose", "affirmations reposent")}</b>
                 dessus, sur ${rendu.strates.length} ${accorde(rendu.strates.length, "pas", "pas")}.`
              : "<b>Rien ne repose sur cette valeur.</b> La changer n'entraîne aucune conséquence connue — "
                + "ce qui veut dire soit qu'elle est libre, soit qu'on a oublié de la brancher."
          }
          Cet écran dit ce qui repose, jamais ce que ça deviendrait : recalculer demande l'évaluateur.
        </p>

        ${
          rendu.cycles.length
            ? `<p class="impact-cycle">${svgIcon("alert", { className: "octicon" })}
                ${rendu.cycles.length} ${accorde(rendu.cycles.length, "lien reboucle", "liens rebouclent")} vers cette
                valeur. Un cycle est une erreur de modèle : elle se montre, elle ne se rejoue pas.</p>`
            : ""
        }

        <div class="impact-strates">
          ${rendu.strates.map((ids, rang) => renderStrate(rang + 1, ids, { parId, emplois })).join("")}
        </div>

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-impact-retour>Choisir une autre valeur</button>
          <button type="button" class="gh-btn gh-btn--primary" data-impact-fermer>Fermer</button>
        </footer>
      </div>
    </div>
  `;
}

/** Une seule fenêtre à la fois : deux superposées ne se distinguent pas. */
let ouverte = null;

/**
 * Ouvrir l'étude d'impact.
 *
 * @param {object} options
 * @param {object[]} options.assertions la mémoire lue
 * @param {object[]|null} options.applications les lectures enregistrées, ou
 *   `null` si elles n'ont pas pu être lues
 * @param {string} [options.depart] l'affirmation à interroger d'emblée
 */
export function ouvrirLEtudeDImpact({ assertions = [], applications = null, depart = "" } = {}) {
  if (ouverte) return;

  const lectures = Array.isArray(applications) ? applications : [];
  const emplois = emploisParAffirmation(lectures);
  const couverture = couvertureDesApplications(lectures);
  const valeurs = valeursInterrogeables(assertions, emplois);
  const parId = new Map((Array.isArray(assertions) ? assertions : []).map((a) => [texte(a?.id), a]));

  const hote = document.createElement("div");
  document.body.appendChild(hote);
  ouverte = hote;

  const fermer = () => {
    document.removeEventListener("keydown", auClavier);
    hote.remove();
    ouverte = null;
  };

  const auClavier = (evenement) => {
    if (evenement.key === "Escape") fermer();
  };
  document.addEventListener("keydown", auClavier);

  /** Ce que la recherche retient : le titre, et rien d'autre — c'est lui qu'on lit. */
  const retenues = (cherche) =>
    cherche ? valeurs.filter((valeur) => valeur.titre.toLowerCase().includes(cherche)) : valeurs;

  const montrerLeChoix = (filtre = "") => {
    hote.innerHTML = renderChoix(retenues(filtre.trim().toLowerCase()), couverture);
    brancherLeChoix(filtre);
  };

  const montrerLImpact = (id) => {
    const valeur = valeurs.find((entree) => entree.id === id);
    if (!valeur) return;
    hote.innerHTML = renderImpact(valeur, impactDe(id, lectures), { parId, emplois });
    brancherCommun();
    for (const bouton of hote.querySelectorAll("[data-impact-retour]")) {
      bouton.addEventListener("click", () => montrerLeChoix());
    }
  };

  function brancherCommun() {
    for (const bouton of hote.querySelectorAll("[data-impact-fermer]")) {
      bouton.addEventListener("click", fermer);
    }
  }

  function brancherLeChoix(filtre) {
    brancherCommun();

    const champ = hote.querySelector("[data-impact-recherche]");
    if (champ) {
      champ.value = filtre;
      champ.focus();
      // Redessiner la liste seule : refaire la fenêtre entière ferait perdre le
      // curseur à chaque lettre.
      champ.addEventListener("input", () => {
        const cherche = champ.value.trim().toLowerCase();
        const liste = hote.querySelector("[data-impact-liste]");
        if (!liste) return;
        liste.innerHTML = renderListeDesValeurs(retenues(cherche), { cherche: Boolean(cherche) });
        brancherLesChoix();
      });
    }

    brancherLesChoix();
  }

  function brancherLesChoix() {
    for (const bouton of hote.querySelectorAll("[data-impact-choisir]")) {
      bouton.addEventListener("click", () => montrerLImpact(bouton.getAttribute("data-impact-choisir") || ""));
    }
  }

  if (texte(depart) && valeurs.some((valeur) => valeur.id === texte(depart))) montrerLImpact(texte(depart));
  else montrerLeChoix();
}
