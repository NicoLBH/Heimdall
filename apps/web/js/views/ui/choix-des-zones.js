/**
 * À quelles parties de l'ouvrage ce qu'on verse s'applique-t-il.
 *
 * ## Pourquoi une étape de plus
 *
 * Un utilitaire sait ce qu'il calcule ; il ne sait pas **où**. « Degré
 * coupe-feu CF 1 h » vaut-il pour tout le projet, ou pour le seul bâtiment A ?
 * Personne d'autre que celui qui lance l'étude ne peut le dire — et sans cette
 * réponse, tout finissait dans « Toutes zones », c'est-à-dire posé comme valant
 * partout alors que ce n'était vrai que d'une partie.
 *
 * Une affirmation posée trop large est pire qu'une affirmation absente : elle
 * se lit comme acquise là où elle ne l'est pas, et personne ne va vérifier ce
 * qui paraît déjà décidé.
 *
 * ## Pourquoi une question, et pas une déduction
 *
 * On pourrait deviner : reprendre la zone de l'étude précédente, ou celle des
 * données de base qui ont nourri le calcul. Deviner ici reviendrait à décider
 * de la portée d'une exigence réglementaire à la place de quelqu'un — voir
 * `docs/fondamentaux.md`, règle 5 : ne pas savoir n'autorise pas à prétendre.
 *
 * ## Ce que la fenêtre rend
 *
 * Les clés de zone cochées, ou `null` si l'on renonce. « Toutes zones » n'est
 * pas une zone du découpage : c'est l'absence de restriction, et elle se rend
 * comme une liste vide — ce que `zonesDeRangement` lit déjà comme « partout ».
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { definedZones } from "../../services/project-zones.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les zones qu'on peut proposer, telles que le découpage du projet les définit.
 *
 * « Toutes zones » vient en tête et n'a pas de clé : cocher « partout » n'est
 * pas cocher une zone de plus, c'est ne rien restreindre.
 */
export function choixDePortee(assertions = []) {
  return [
    { key: "", label: "Toutes zones", definition: "Ce qui vaut pour l'ensemble du projet, sans distinction de partie." },
    ...definedZones(assertions)
  ];
}

/**
 * Ce qu'une sélection veut dire.
 *
 * Cocher « Toutes zones » **efface** les autres : dire « partout » et « dans le
 * bâtiment A » à la fois n'a pas de sens, et laisser les deux produirait un
 * fichier où la même affirmation apparaît en double.
 */
export function porteeRetenue(cochees = []) {
  const clefs = [...new Set((Array.isArray(cochees) ? cochees : []).map(texte).filter(Boolean))];
  return clefs.sort();
}

function renderFenetre(zones, cochees) {
  const ligne = (zone) => {
    const coche = zone.key ? cochees.includes(zone.key) : cochees.length === 0;
    return `
      <label class="zones-choix__ligne">
        <input type="checkbox" data-zone-choix="${escapeHtml(zone.key)}" ${coche ? "checked" : ""}>
        <span class="zones-choix__corps">
          <span class="zones-choix__nom">${escapeHtml(zone.label)}</span>
          ${zone.definition ? `<span class="zones-choix__quoi">${escapeHtml(zone.definition)}</span>` : ""}
        </span>
      </label>
    `;
  };

  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Portée de la proposition">
      <form class="fichiers-saisie__boite zones-choix" data-zones-form>
        <header class="fichiers-saisie__tete">
          <b>À quelles zones cela s'applique-t-il ?</b>
          <button type="button" class="fichiers-saisie__fermer" data-zones-annuler
            aria-label="Renoncer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="zones-choix__lead">
          Ce qui va être versé sera écrit sous les zones cochées. Une exigence posée
          plus large qu'elle ne vaut se lit comme acquise là où elle ne l'est pas.
        </p>

        <div class="zones-choix__liste">${zones.map(ligne).join("")}</div>

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-zones-annuler>Annuler</button>
          <button type="submit" class="gh-btn gh-btn--primary" data-zones-valider>Continuer</button>
        </footer>
      </form>
    </div>
  `;
}

/**
 * Poser la question, et attendre la réponse.
 *
 * Le découpage se lit ici quand l'appelant ne l'a pas sous la main : chaque
 * utilitaire n'a pas à garder la mémoire du projet en mémoire pour poser une
 * question qui la concerne.
 *
 * @param {object} options
 * @param {string} [options.projectId] de quoi lire le découpage, à défaut
 * @param {object[]} [options.assertions] la mémoire du projet, si on l'a déjà
 * @returns {Promise<string[]|null>} les clés cochées, `[]` pour « toutes zones »,
 *   `null` si l'on renonce
 */
export async function demanderLesZones({ projectId = "", assertions = null } = {}) {
  let memoire = Array.isArray(assertions) ? assertions : null;

  if (!memoire && texte(projectId)) {
    try {
      const { listProjectAssertions } = await import("../../services/project-memory-supabase.js");
      memoire = (await listProjectAssertions(texte(projectId))) ?? [];
    } catch {
      // Un découpage illisible ne bloque pas le versement : on ne restreint
      // rien plutôt que d'empêcher de proposer.
      memoire = [];
    }
  }

  const zones = choixDePortee(memoire ?? []);

  // Un projet sans découpage n'a pas de question à poser : tout y vaut partout,
  // et une fenêtre à une seule case serait une formalité sans objet.
  if (zones.length <= 1) return [];

  return new Promise((resoudre) => {
    const hote = document.createElement("div");
    hote.innerHTML = renderFenetre(zones, []);
    document.body.appendChild(hote);

    const fermer = (reponse) => {
      hote.remove();
      resoudre(reponse);
    };

    const cochees = () => [...hote.querySelectorAll("[data-zone-choix]")]
      .filter((case_) => case_.checked && case_.getAttribute("data-zone-choix"))
      .map((case_) => case_.getAttribute("data-zone-choix"));

    for (const case_ of hote.querySelectorAll("[data-zone-choix]")) {
      case_.addEventListener("change", () => {
        const partout = hote.querySelector('[data-zone-choix=""]');
        if (case_ === partout && case_.checked) {
          // « Partout » efface le reste : les deux à la fois n'ont pas de sens.
          for (const autre of hote.querySelectorAll("[data-zone-choix]")) {
            if (autre !== partout) autre.checked = false;
          }
        } else if (case_ !== partout && case_.checked && partout) {
          partout.checked = false;
        }

        // Ne rien cocher, c'est dire « partout » : on le montre plutôt que de
        // laisser une fenêtre sans réponse possible.
        if (partout && !cochees().length) partout.checked = true;
      });
    }

    for (const bouton of hote.querySelectorAll("[data-zones-annuler]")) {
      bouton.addEventListener("click", () => fermer(null));
    }

    hote.querySelector("[data-zones-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      fermer(porteeRetenue(cochees()));
    });
  });
}
