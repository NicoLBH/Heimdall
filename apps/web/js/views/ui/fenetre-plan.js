/**
 * Le plan de recalcul, montré.
 *
 * ## Ce qu'on vient y lire
 *
 * La **forme** du raisonnement d'un projet, et sa **frontière**. Deux questions,
 * et l'écran ne sert qu'à elles :
 *
 * - jusqu'où le raisonnement s'enchaîne — « la plus longue chaîne fait huit
 *   pas » se comprend, une liste de quatre cents lignes non ;
 * - ce qui se rejoue et ce qui ne se rejoue pas. Le compte des opaques est la
 *   mesure honnête de la promesse : un graphe à moitié opaque se lit comme un
 *   graphe entièrement rejouable tant qu'on ne le dit pas.
 *
 * ## Il se dérive à chaque ouverture
 *
 * Rien n'est stocké : ce qui est dérivé se recalcule tant qu'il sert à décider.
 * Un plan gardé de côté divergerait dès la règle suivante, et l'on ne saurait
 * plus si l'on regarde le raisonnement du projet ou son souvenir.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { planDeRecalcul } from "../../services/memoire-plan.js";
import { titreDeLAffirmation } from "../../services/project-memory.js";

const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/** Le nom d'une zone, ou ce que « partout » veut dire. */
function nomDeLaZone(zone) {
  return String(zone ?? "").trim() || "Toutes zones";
}

function renderLigne(assertion) {
  return `<li class="plan-ligne">${escapeHtml(titreDeLAffirmation(assertion))}</li>`;
}

function renderStrate(rang, strate) {
  return `
    <section class="plan-strate">
      <h5>
        <span class="plan-strate__rang">${rang}</span>
        ${rang === 1 ? "ne dépend que du socle" : `dépend de la strate ${rang - 1}`}
        <span class="plan-strate__compte">${strate.length}</span>
      </h5>
      <ul class="plan-lignes">${strate.map(renderLigne).join("")}</ul>
    </section>
  `;
}

function renderZone(zone) {
  return `
    <section class="plan-zone">
      <header class="plan-zone__tete">
        <b>${escapeHtml(nomDeLaZone(zone.zone))}</b>
        <span>${zone.strates.length} ${accorde(zone.strates.length, "strate", "strates")}
          · ${zone.socle.length} au socle</span>
      </header>

      ${zone.strates.map((strate, rang) => renderStrate(rang + 1, strate)).join("")}

      ${
        // Les opaques n'ont pas de rang : ils ne s'enchaînent pas, ils bordent.
        // Les ranger dans une strate laisserait croire qu'on sait les refaire.
        zone.opaques.length
          ? `<section class="plan-strate plan-strate--opaque">
              <h5>${svgIcon("alert", { className: "octicon" })} hors du plan
                <span class="plan-strate__compte">${zone.opaques.length}</span></h5>
              <p>Un utilitaire les a déduites au serveur, sur des faits de contexte. On sait
                qu'elles dépendent ; on ne sait pas les refaire ici — elles se nomment,
                elles ne se rejouent pas.</p>
              <ul class="plan-lignes">${zone.opaques.map(renderLigne).join("")}</ul>
            </section>`
          : ""
      }

      ${
        zone.cycles.length
          ? `<section class="plan-strate plan-strate--cycle">
              <h5>${svgIcon("alert", { className: "octicon" })} se lisent en rond
                <span class="plan-strate__compte">${zone.cycles.length}</span></h5>
              <p>Ces valeurs se produisent l'une l'autre : aucune ne peut être calculée en
                premier. Un cycle est une erreur de modèle, et il se montre plutôt que de
                faire tourner un calcul sans fin.</p>
              <ul class="plan-lignes">${zone.cycles.map(renderLigne).join("")}</ul>
            </section>`
          : ""
      }
    </section>
  `;
}

/** Le résumé, en tête : la forme et la frontière, en une phrase chacune. */
function renderResume(plan) {
  const part = plan.derivees ? Math.round((plan.rejouables / plan.derivees) * 100) : 0;

  return `
    <div class="plan-resume">
      <span class="plan-chiffre">
        <b>${plan.profondeur}</b>
        ${accorde(plan.profondeur, "pas", "pas")} au plus long
      </span>
      <span class="plan-chiffre plan-chiffre--rejouable">
        <b>${plan.rejouables}</b> ${accorde(plan.rejouables, "rejouable", "rejouables")}
      </span>
      <span class="plan-chiffre plan-chiffre--opaque">
        <b>${plan.opaques}</b> ${accorde(plan.opaques, "opaque", "opaques")}
      </span>
      <span class="plan-chiffre plan-chiffre--socle">
        <b>${plan.socle}</b> au socle
      </span>
      ${
        plan.derivees
          ? `<span class="plan-part">${part} % du calque dérivé se rejoue</span>`
          : ""
      }
    </div>
  `;
}

function renderPlan(plan) {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Plan de recalcul">
      <div class="fichiers-saisie__boite plan-boite">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("beaker", { className: "octicon" })} Le plan de recalcul</b>
          <button type="button" class="fichiers-saisie__fermer" data-plan-fermer
            aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="variante-lead">
          Dans quel ordre le raisonnement du projet se refait, et jusqu'où il s'enchaîne.
          Il se dérive à chaque ouverture — rien n'est gardé de côté, un plan stocké
          divergerait dès la règle suivante.
        </p>

        ${renderResume(plan)}

        ${
          plan.zones.length
            ? `<div class="plan-zones">${plan.zones.map(renderZone).join("")}</div>`
            : `<p class="variante-rang__vide">
                Ce projet ne porte aucune règle appliquée : il n'y a pas de calque dérivé,
                donc rien à ordonner. Les règles arrivent avec une étude de l'Atelier.
              </p>`
        }

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn gh-btn--primary" data-plan-fermer>Fermer</button>
        </footer>
      </div>
    </div>
  `;
}

/** Une seule fenêtre à la fois : deux superposées ne se distinguent pas. */
let ouverte = null;

/** Ouvrir le plan de recalcul sur cette mémoire. */
export function ouvrirLePlanDeRecalcul({ assertions = [] } = {}) {
  // Une fenêtre dont l'hôte a quitté le document est fermée, quoi qu'en dise le
  // verrou : sans cette ligne, un rendu qui balaie la page laisse le verrou posé
  // et l'écran ne se rouvre plus jamais.
  if (ouverte && !ouverte.isConnected) ouverte = null;
  if (ouverte) return;

  const hote = document.createElement("div");
  hote.innerHTML = renderPlan(planDeRecalcul(assertions));
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

  for (const bouton of hote.querySelectorAll("[data-plan-fermer]")) {
    bouton.addEventListener("click", fermer);
  }
}
