/**
 * « Cette modification passe par une proposition » — la fenêtre qui le dit.
 *
 * ## Pourquoi elle existe
 *
 * Trois écrans modifient une chose que la mémoire devra apprendre, et les trois
 * s'y prenaient différemment : l'un rangeait sans rien dire et attendait un
 * second bouton, l'autre partait droit sur une proposition sans prévenir, le
 * troisième quittait l'écran. Le détail est dans
 * `services/versement-avertissement.js`.
 *
 * Cette fenêtre est le geste commun. Elle dit **ce qui va être proposé**, ligne
 * par ligne, avec ce que la mémoire dit aujourd'hui en regard — c'est là qu'on
 * voit qu'on change six choses en croyant en changer une —, et elle rappelle que
 * **rien ne sera effectif avant la fusion**. Puis elle demande où le lot va :
 * une proposition neuve, ou une déjà ouverte.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Elle n'écrit rien et n'ouvre rien. Elle rend un choix ; l'écran qui l'a posée
 * décide de la suite. C'est la règle 1 tenue jusque dans le composant : une
 * fenêtre qui préparerait la proposition elle-même serait un quatrième chemin
 * d'écriture.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { libelleDeLaBranche } from "../../services/proposition-branche.js";
import { lignesDuLot, compteDuLot, phraseDuLot, destinationRetenue } from "../../services/versement-avertissement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * La phrase qui compte le plus de toute l'application.
 *
 * Elle est ici, écrite une fois, parce que c'est la règle 1 dite à l'utilisateur
 * — et qu'une règle expliquée en trois formulations différentes cesse d'être
 * une règle.
 */
export const APRES_FUSION = "Rien n'entre dans la mémoire du projet tant que la proposition "
  + "n'est pas fusionnée. Jusque-là, le projet continue de valoir ce qu'il vaut aujourd'hui.";

/** Une ligne du lot : le sujet, ce que la mémoire dit, ce qu'on propose. */
function renderLigne(ligne) {
  const etat = ligne.bouge ? "bouge" : ligne.nouveau ? "neuve" : "stable";

  return `
    <li class="avert-ligne avert-ligne--${etat}">
      <span class="avert-ligne__sujet">${escapeHtml(ligne.sujet)}</span>
      <span class="avert-ligne__valeurs">
        ${
          // `null` : la mémoire n'a pas pu être lue. On ne prétend ni « nouveau »
          // ni « inchangé » — on dit qu'on ne sait pas (règle 5).
          ligne.aujourdhui === null
            ? `<i class="avert-ligne__inconnu">état actuel non lu</i>`
            : ligne.nouveau
              ? `<i class="avert-ligne__inconnu">rien aujourd'hui</i>`
              : `<b class="avert-ligne__avant">${escapeHtml(ligne.aujourdhui)}</b>`
        }
        ${svgIcon("arrow-right", { className: "octicon" })}
        <b class="avert-ligne__apres">${escapeHtml(ligne.propose || "—")}</b>
      </span>
    </li>
  `;
}

/**
 * Où le lot va.
 *
 * `null` — la base n'a pas répondu — n'affiche **pas** « aucune proposition
 * ouverte » : on en ouvrirait une deuxième à côté de celle qu'on ne voyait pas.
 * Voir `services/branches-ouvertes.js`, qui tient déjà cette distinction.
 */
function renderDestination(branches, imposee) {
  if (imposee) {
    return `
      <p class="avert-destination avert-destination--imposee">
        ${svgIcon("git-pull-request", { className: "octicon" })}
        Sera ajouté à <b>${escapeHtml(imposee.libelle)}</b>.
      </p>
    `;
  }

  if (branches === null) {
    return `
      <p class="avert-destination avert-destination--muette">
        ${svgIcon("alert", { className: "octicon" })}
        Les propositions ouvertes n'ont pas pu être lues. Ce lot ouvrira donc une proposition
        neuve — il en existe peut-être déjà une qui l'attendait.
      </p>
    `;
  }

  const ouvertes = Array.isArray(branches) ? branches : [];
  if (!ouvertes.length) {
    return `<p class="avert-destination">Ce lot ouvrira une proposition, qui restera à signer.</p>`;
  }

  return `
    <fieldset class="avert-destination avert-destination__choix">
      <legend>Où porter ce lot ?</legend>
      <label>
        <input type="radio" name="avertDestination" value="" checked>
        <span>Ouvrir une <b>nouvelle</b> proposition</span>
      </label>
      ${ouvertes.map((branche) => `
        <label>
          <input type="radio" name="avertDestination" value="${escapeHtml(texte(branche.id))}">
          <span>Ajouter à <b>${escapeHtml(libelleDeLaBranche(branche))}</b></span>
        </label>
      `).join("")}
    </fieldset>
  `;
}

function renderFenetre({ quoi, lignes, compte, branches, imposee }) {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true"
      aria-label="Cette modification passe par une proposition">
      <div class="fichiers-saisie__boite avert-proposition">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("compare", { className: "octicon" })} Cette modification passe par une proposition</b>
          <button type="button" class="fichiers-saisie__fermer" data-avert-annuler
            aria-label="Annuler">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="avert-quoi">${escapeHtml(quoi)}</p>
        <p class="avert-compte">${escapeHtml(phraseDuLot(compte))}</p>

        <ul class="avert-lignes">${lignes.map(renderLigne).join("")}</ul>

        <p class="avert-apres">${svgIcon("shield", { className: "octicon" })} ${escapeHtml(APRES_FUSION)}</p>

        ${renderDestination(branches, imposee)}

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-avert-annuler>Annuler</button>
          <button type="button" class="gh-btn gh-btn--primary" data-avert-continuer>Continuer</button>
        </footer>
      </div>
    </div>
  `;
}

/**
 * La fenêtre déjà posée, s'il y en a une.
 *
 * Comme pour les zones et le titre : deux fenêtres superposées ne se
 * distinguent pas, et chacune préparerait sa proposition — un geste, deux
 * propositions à relire.
 */
let fenetreOuverte = null;

/**
 * Prévenir, et demander où.
 *
 * @param {object} options
 * @param {string} options.quoi ce que l'écran est en train de faire, en une phrase
 * @param {object[]} options.affirmations le lot, tel qu'il sera proposé
 * @param {object[]|null} [options.memoire] ce que le projet dit aujourd'hui ;
 *   `null` si on n'a pas pu le lire — la fenêtre le dira plutôt que d'inventer
 * @param {object[]|null} [options.branches] les propositions ouvertes ; `null` si
 *   la base n'a pas répondu
 * @param {object|null} [options.imposee] la branche déjà choisie ailleurs — le
 *   menu « Transformer » l'a déjà demandée, et la redemander serait deux fois
 * @returns {Promise<{propositionId: string}|null>} `null` si l'on renonce
 */
export async function avertirAvantDeProposer({
  quoi = "", affirmations = [], memoire = null, branches = [], imposee = null
} = {}) {
  if (fenetreOuverte) return null;

  const lignes = lignesDuLot(affirmations, memoire);
  const compte = compteDuLot(lignes);

  return new Promise((resoudre) => {
    const hote = document.createElement("div");
    hote.innerHTML = renderFenetre({ quoi, lignes, compte, branches, imposee });
    document.body.appendChild(hote);
    fenetreOuverte = hote;

    const fermer = (reponse) => {
      document.removeEventListener("keydown", auClavier);
      hote.remove();
      fenetreOuverte = null;
      resoudre(reponse);
    };

    // Échap annule. Une fenêtre modale dont on ne connaît qu'un seul moyen de
    // sortie se referme mal quand ce moyen défaille.
    function auClavier(evenement) {
      if (evenement.key === "Escape") fermer(null);
    }
    document.addEventListener("keydown", auClavier);

    for (const bouton of hote.querySelectorAll("[data-avert-annuler]")) {
      bouton.addEventListener("click", () => fermer(null));
    }

    hote.querySelector("[data-avert-continuer]")?.addEventListener("click", () => {
      // Une branche imposée l'emporte : elle a été choisie dans le menu, et la
      // fenêtre n'offre alors pas de second choix.
      const choisi = imposee
        ? texte(imposee.id)
        : texte(hote.querySelector('input[name="avertDestination"]:checked')?.value);
      fermer(destinationRetenue(choisi));
    });
  });
}

/**
 * Ce qui s'affiche **après**, sur l'écran qu'on n'a pas quitté.
 *
 * ## Pourquoi une phrase, et pas une navigation
 *
 * Les trois gestes partaient sur Propositions > détail. C'est utile une fois sur
 * dix — quand on veut signer tout de suite — et gênant les neuf autres : on
 * venait d'essayer une adresse, on en essayait une autre, et l'on se retrouvait
 * ailleurs sans avoir demandé à partir. Le lien est donc **offert**.
 *
 * Ce qui n'a pas pu être porté se dit ici, puisqu'on ne quitte plus l'écran : le
 * taire ferait croire que tout est passé (règle 5). Une ligne se refuse quand la
 * proposition visée a déjà tranché sa clé — voir
 * `services/proposition-branche.js`.
 *
 * @param {object} options
 * @param {string} options.projet l'identifiant **d'écran** du projet, celui de l'URL
 * @param {{id: string, numero: number|null, titre: string, tranches: object[]}} options.proposition
 */
export function renderPropositionOuverte({ projet = "", proposition = null } = {}) {
  if (!proposition) return "";

  const numero = Number(proposition.numero);
  const nom = Number.isFinite(numero) && numero > 0
    ? `#${numero} ${texte(proposition.titre)}`
    : texte(proposition.titre) || "la proposition";
  const tranches = Array.isArray(proposition.tranches) ? proposition.tranches : [];
  const lien = texte(projet) ? `#project/${texte(projet)}/propositions` : "";

  return `
    <div class="proposition-ouverte">
      <p class="proposition-ouverte__quoi">
        ${svgIcon("git-pull-request", { className: "octicon" })}
        <span><b>${escapeHtml(nom)}</b> est ouverte. ${escapeHtml(APRES_FUSION)}</span>
      </p>
      ${
        tranches.length
          ? `<p class="proposition-ouverte__tranches">
              ${svgIcon("alert", { className: "octicon" })}
              <span>${tranches.length} ${tranches.length > 1 ? "lignes n'ont pas" : "ligne n'a pas"} pu y être
              ${tranches.length > 1 ? "portées" : "portée"} : cette proposition a déjà tranché
              ${tranches.length > 1 ? "ces clés" : "cette clé"}.
              ${escapeHtml(tranches.map((tranche) => texte(tranche?.sujet ?? tranche?.itemKey)).filter(Boolean).join(", "))}</span>
            </p>`
          : ""
      }
      ${lien ? `<a class="gh-btn gh-btn--sm" href="${escapeHtml(lien)}" data-proposition-ouverte-lien="${escapeHtml(texte(proposition.id))}">Aller la relire</a>` : ""}
    </div>
  `;
}
