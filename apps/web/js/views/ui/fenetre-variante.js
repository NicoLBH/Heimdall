/**
 * Essayer une altitude, et lire ce que le projet en dirait.
 *
 * ## Ce que cette fenêtre doit prouver
 *
 * Qu'on peut **se promener dans une mémoire qui n'existe pas, sans jamais croire
 * qu'elle existe**. Tout le reste — plusieurs substitutions, la comparaison de
 * deux variantes, l'adoption en hypothèse — n'est que du volume par-dessus.
 *
 * ## Pourquoi une fenêtre et pas un écran
 *
 * Un écran appelle des champs, les champs appellent des champs, et l'on obtient
 * un formulaire que personne ne remplit. La question tient en une ligne : *cette
 * valeur passe de ceci à cela*. Le départ est déjà rempli — il se lit dans la
 * mémoire —, il ne reste qu'une case.
 *
 * ## Les trois rangs, et pourquoi ils ne se ressemblent pas
 *
 * **Recalculé** rend une vraie valeur, avec son écart. **À revérifier** nomme ce
 * qui devient suspect sans en deviner la valeur — le référentiel est au serveur
 * et prend le questionnaire entier, pas un champ. **Inchangé** se compte, parce
 * que « rien n'a bougé là » est une information : sans elle, on ne sait pas si
 * l'outil a regardé.
 *
 * Les trois blocs ne partagent ni couleur, ni vocabulaire, ni forme. Un chiffre
 * qui aurait l'air recalculé alors qu'il n'était que propagé suffirait, une
 * seule fois, à ce que plus personne ne fasse confiance à l'écran.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import {
  altitudeDeLaMemoire, altitudeEnTexte, consequencesDeLaVariante, lireUnNombre, variantePourLEcran
} from "../../services/variante-altitude.js";
import { essayerLaVariante } from "../../services/variante-en-cours.js";
import { RESERVE, phraseDeReserve } from "../../utilitaires/reserves.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'accord d'un mot avec son nombre. Pas de « 1 recalculées » à l'écran. */
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/* ────────────────────────────────────────────────────────────────────────────
 * La saisie
 * ────────────────────────────────────────────────────────────────────────── */

function renderSaisie(depart, echec = "") {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Tester une variante">
      <div class="fichiers-saisie__boite variante-boite">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("beaker", { className: "octicon" })} Tester une variante</b>
          <button type="button" class="fichiers-saisie__fermer" data-variante-fermer
            aria-label="Renoncer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="variante-lead">
          Rien ne sera écrit. On substitue une valeur, on relit la mémoire, on regarde,
          et on ressort — la mémoire du projet ne bouge pas d'un octet.
        </p>

        <div class="variante-saisie">
          <label class="fichiers-saisie__champ variante-saisie__champ">
            <span>${escapeHtml(depart.sujet)}, aujourd'hui</span>
            <input type="text" class="gh-input" value="${escapeHtml(depart.valeur)}" readonly disabled>
          </label>
          <span class="variante-saisie__fleche">${svgIcon("arrow-right", { className: "octicon" })}</span>
          <label class="fichiers-saisie__champ variante-saisie__champ">
            <span>dans la variante</span>
            <input type="text" class="gh-input" data-variante-valeur placeholder="890"
              inputmode="decimal" autocomplete="off">
            <small>En mètres. La virgule et le point se lisent tous les deux.</small>
          </label>
        </div>

        ${echec ? `<p class="fichiers-saisie__echec">${escapeHtml(echec)}</p>` : ""}

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-variante-fermer>Annuler</button>
          <button type="button" class="gh-btn gh-btn--primary" data-variante-calculer>Calculer</button>
        </footer>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les conséquences
 * ────────────────────────────────────────────────────────────────────────── */

/** Les réserves d'une contrainte, dites en français, ou rien. */
function renderReserves(codes = []) {
  const phrases = codes.map(phraseDeReserve).filter(Boolean);
  if (!phrases.length) return "";
  return `<span class="variante-ligne__reserve">${escapeHtml(phrases.join(" · "))}</span>`;
}

/**
 * Une valeur recalculée : ce qu'elle disait, ce qu'elle dirait.
 *
 * Une valeur identique dont la réserve apparaît n'est pas une valeur inchangée :
 * un doute vient de naître, et le taire ferait passer pour acquis ce qui ne
 * l'est plus.
 */
function renderRecalculee(ligne) {
  const bouge = ligne.valeurABouge;
  const nees = ligne.reservesApres.filter((code) => !ligne.reservesAvant.includes(code));
  const levees = ligne.reservesAvant.filter((code) => !ligne.reservesApres.includes(code));

  return `
    <li class="variante-ligne variante-ligne--${bouge ? "bouge" : "stable"}${ligne.suppose ? " variante-ligne--supposee" : ""}">
      <span class="variante-ligne__sujet">${escapeHtml(ligne.sujet)}</span>
      <span class="variante-ligne__valeurs">
        <b class="variante-ligne__avant">${escapeHtml(ligne.avant)}</b>
        ${
          bouge
            ? `${svgIcon("arrow-right", { className: "octicon" })}
               <b class="variante-ligne__apres">${escapeHtml(ligne.apres)}</b>`
            : `<span class="variante-ligne__egal">inchangée</span>`
        }
      </span>
      ${nees.length ? `<span class="variante-ligne__reserve variante-ligne__reserve--nee">Réserve : ${escapeHtml(nees.map(phraseDeReserve).filter(Boolean).join(" · "))}</span>` : ""}
      ${levees.length ? `<span class="variante-ligne__reserve variante-ligne__reserve--levee">Réserve levée : ${escapeHtml(levees.map(phraseDeReserve).filter(Boolean).join(" · "))}</span>` : ""}
      ${
        // « ce calcul ne dit pas sur quoi il a été fait » et « supposée
        // calculée à 13 m » disent la même chose deux fois. La seconde est plus
        // utile : elle nomme la valeur supposée.
        !nees.length && !levees.length
          ? renderReserves(ligne.suppose
              ? ligne.reservesApres.filter((code) => code !== RESERVE.ENTREES_INCONNUES)
              : ligne.reservesApres)
          : ""
      }
      ${
        // La supposition ne se dit pas une fois pour toutes en haut du bloc :
        // elle se dit sur chaque ligne qu'elle porte, sans quoi on retiendrait
        // le chiffre sans retenir sa condition.
        ligne.suppose
          ? `<span class="variante-ligne__pourquoi variante-ligne__pourquoi--suppose">
              supposée calculée à ${escapeHtml(altitudeEnTexte(ligne.altitudeDepart))} — ce calcul ne conservait pas ses entrées
            </span>`
          : ""
      }
    </li>
  `;
}

/**
 * Une règle rejouée : la valeur que la règle du projet conclut avec les
 * nouvelles entrées, et ce qu'elle a lu pour y arriver.
 *
 * La trace n'est pas un détail : une valeur nouvelle sans elle est une
 * affirmation qu'il faut croire sur parole, et c'est exactement ce que Mdall
 * existe pour éviter.
 */
function renderRejouee(ligne) {
  const lues = (ligne.trace ?? [])
    .map((clause) => `${clause.sujet} ${clause.operateur} ${(clause.attendu ?? []).join(" ou ")} → ${clause.lu || "—"}`)
    .join("\n");

  return `
    <li class="variante-ligne variante-ligne--bouge">
      <span class="variante-ligne__sujet">${escapeHtml(ligne.sujet)}</span>
      <span class="variante-ligne__valeurs">
        <b class="variante-ligne__avant">${escapeHtml(ligne.avant || "—")}</b>
        ${svgIcon("arrow-right", { className: "octicon" })}
        <b class="variante-ligne__apres">${escapeHtml(ligne.apres)}</b>
      </span>
      <span class="variante-ligne__pourquoi" title="${escapeHtml(lues)}">
        règle rejouée${ligne.zone ? ` — ${escapeHtml(ligne.zone)}` : ""} · ${
          (ligne.trace ?? []).length
        } ${(ligne.trace ?? []).length > 1 ? "conditions relues" : "condition relue"}
      </span>
    </li>
  `;
}

/** Une ligne devenue suspecte : nommée, jamais devinée. */
function renderARevoir(ligne) {
  return `
    <li class="variante-ligne variante-ligne--suspecte">
      <span class="variante-ligne__sujet">${escapeHtml(ligne.sujet)}</span>
      <span class="variante-ligne__valeurs">
        <b class="variante-ligne__avant">${escapeHtml(ligne.valeur || "—")}</b>
        <span class="variante-ligne__egal">à revérifier</span>
      </span>
      <span class="variante-ligne__pourquoi">${
        // La raison précise plutôt que la phrase générale : « à revérifier »
        // sans motif est une inquiétude sans adresse, et l'on ne sait pas s'il
        // faut corriger la donnée ou l'outil.
        escapeHtml(ligne.pourquoi || (ligne.motif === "lit-altitude"
          ? "lit l'altitude, et nous ne savons pas rejouer son calcul ici"
          : "repose sur une valeur qui vient de bouger"))
      }${ligne.provenance ? ` — ${escapeHtml(ligne.provenance)}` : ""}</span>
    </li>
  `;
}

function renderConsequences(depart, altitude, rendu) {
  // Une valeur supposée compte : elle bouge, sous une condition dite. Ne compter
  // que les certaines ferait écrire « rien ne bouge » sous une liste qui bouge.
  const bougees = rendu.recalculees.filter((ligne) => ligne.valeurABouge || ligne.reservesOntBouge).length
    + (rendu.rejouees ?? []).length;

  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Conséquences de la variante">
      <div class="fichiers-saisie__boite variante-boite variante-boite--large">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("beaker", { className: "octicon" })} ${escapeHtml(depart.sujet)} :
            ${escapeHtml(depart.valeur)} → ${escapeHtml(altitudeEnTexte(altitude))}</b>
          <button type="button" class="fichiers-saisie__fermer" data-variante-fermer
            aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="variante-lead">
          ${rendu.recalculees.length + (rendu.rejouees ?? []).length} ${
            accorde(rendu.recalculees.length + (rendu.rejouees ?? []).length, "valeur relue", "valeurs relues")
          }
          · ${rendu.aRevoir.length} ${accorde(rendu.aRevoir.length, "à revérifier", "à revérifier")}
          · ${rendu.inchangees} ${accorde(rendu.inchangees, "sans rapport", "sans rapport")}.
          Rien n'a été écrit.
        </p>

        <div class="variante-rangs">
          <section class="variante-rang variante-rang--calcule">
            <h5>${svgIcon("check-circle", { className: "octicon" })} Recalculé</h5>
            <p>
              Les utilitaires déterministes et les <b>règles du projet</b> ont été rejoués avec la
              nouvelle valeur. Ces chiffres-là sont vrais, et chaque règle dit au survol ce qu'elle
              a lu pour conclure.
            </p>
            ${
              rendu.recalculees.length || (rendu.rejouees ?? []).length
                ? `<ul class="variante-lignes">${[
                    ...rendu.recalculees.map(renderRecalculee),
                    ...(rendu.rejouees ?? []).map(renderRejouee)
                  ].join("")}</ul>`
                : `<p class="variante-rang__vide">Aucune déduction ni aucune règle du projet ne lit cette donnée d'une façon que nous savons rejouer.</p>`
            }
            ${
              (rendu.cycles ?? []).length
                ? `<p class="variante-rang__suppose">${svgIcon("alert", { className: "octicon" })}
                    ${rendu.cycles.length} ${rendu.cycles.length > 1 ? "zones ne se stabilisent" : "zone ne se stabilise"} pas :
                    leurs règles se lisent en rond. Rien n'en sort — un état de passage n'est pas un résultat.</p>`
                : ""
            }
          </section>

          <section class="variante-rang variante-rang--suspect">
            <h5>${svgIcon("alert", { className: "octicon" })} À revérifier</h5>
            <p>
              Ces valeurs reposent sur ce qui vient de bouger, et nous ne savons pas les rejouer ici.
              Elles sont <b>nommées</b>, jamais devinées : aucun chiffre nouveau n'est affiché à leur place.
            </p>
            ${
              rendu.aRevoir.length
                ? `<ul class="variante-lignes">${rendu.aRevoir.map(renderARevoir).join("")}</ul>`
                : `<p class="variante-rang__vide">Rien de ce que le projet tient ne repose sur ce qui vient de bouger.</p>`
            }
            ${
              // Une contrainte à qui il ne manque que son altitude de départ
              // peut être relue — à condition de supposer qu'elle a été
              // calculée sur celle que le projet dit aujourd'hui. C'est
              // probable, ce n'est pas certain, et c'est donc une question :
              // l'outil la pose, quelqu'un y répond. Deviner à sa place
              // reviendrait à rendre un chiffre indiscernable d'un chiffre
              // calculé, ce qu'on refuse partout ailleurs.
              rendu.supposables && !rendu.suppose
                ? `<button type="button" class="gh-btn gh-btn--sm variante-supposer" data-variante-supposer>
                    ${svgIcon("beaker", { className: "octicon" })}
                    Supposer ${rendu.supposables > 1 ? "qu'elles ont" : "qu'elle a"} été calculée${rendu.supposables > 1 ? "s" : ""}
                    à ${escapeHtml(depart.valeur)}, et ${rendu.supposables > 1 ? "les" : "la"} relire
                  </button>`
                : ""
            }
            ${
              rendu.suppose
                ? `<p class="variante-rang__suppose">
                    ${svgIcon("beaker", { className: "octicon" })}
                    Relues en supposant qu'elles avaient été calculées à ${escapeHtml(depart.valeur)}.
                    Chaque ligne concernée le dit, ici et dans la mémoire.
                  </p>`
                : ""
            }
          </section>

          <section class="variante-rang variante-rang--inchange">
            <h5>${svgIcon("dot-fill-pending", { className: "octicon" })} Inchangé</h5>
            <p>
              ${rendu.inchangees} ${accorde(rendu.inchangees, "affirmation n'a", "affirmations n'ont")}
              aucun lien avec cette donnée. ${accorde(rendu.inchangees, "Elle reste", "Elles restent")} vraie${rendu.inchangees > 1 ? "s" : ""}.
            </p>
          </section>
        </div>

        <p class="variante-suite">
          ${
            bougees
              ? "Adopter cette variante, ce sera la faire monter d'un barreau : de valeur essayée à hypothèse assumée, par une proposition. Ce barreau-là n'est pas encore posé."
              : "Aucune valeur ne bouge : il n'y a rien à adopter."
          }
        </p>

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-variante-fermer>Abandonner</button>
          <button type="button" class="gh-btn" data-variante-refaire>Changer la valeur</button>
          <button type="button" class="gh-btn gh-btn--primary" data-variante-lire>
            ${svgIcon("book", { className: "octicon" })} Lire la mémoire avec cette variante
          </button>
        </footer>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'ouverture
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Une seule fenêtre à la fois.
 *
 * Deux fenêtres identiques superposées ne se distinguent pas : on répond à celle
 * du dessus, elle disparaît, et celle du dessous donne l'impression que le clic
 * n'a rien fait.
 */
let ouverte = null;

/**
 * Ouvrir la fenêtre, essayer une valeur, et entrer dans la variante si on le veut.
 *
 * @param {object} options
 * @param {string} [options.projectId] de quoi lire la mémoire, à défaut
 * @param {object[]} [options.assertions] la mémoire, si on l'a déjà sous la main
 * @param {(variante: object) => void} [options.quandOnLit] appelé quand on entre
 *   dans la variante — c'est à l'appelant d'emmener l'utilisateur à la mémoire
 */
export async function ouvrirLaFenetreDeVariante({ projectId = "", assertions = null, quandOnLit = null } = {}) {
  // Une fenêtre dont l'hôte a quitté le document est fermée, quoi qu'en dise le
  // verrou : sans cette ligne, un rendu qui balaie la page laisse le verrou posé
  // et l'écran ne se rouvre plus jamais.
  if (ouverte && !ouverte.isConnected) ouverte = null;
  if (ouverte) return;

  // Une liste vide n'est pas une mémoire : c'est « je n'ai rien sous la main ».
  let memoire = Array.isArray(assertions) && assertions.length ? assertions : null;

  if (!memoire) {
    try {
      const [{ resolveCurrentBackendProjectId }, { listProjectAssertions }] = await Promise.all([
        import("../../services/project-supabase-sync.js"),
        import("../../services/project-memory-supabase.js")
      ]);
      // L'identifiant de la route n'est pas celui de la base : l'appelant n'a
      // pas à le savoir, et le résoudre ici évite qu'un écran passe le mauvais.
      const cible = texte(projectId) || (await resolveCurrentBackendProjectId().catch(() => ""));
      memoire = cible ? (await listProjectAssertions(cible)) ?? [] : [];
    } catch {
      memoire = [];
    }
  }

  const depart = altitudeDeLaMemoire(memoire ?? []);

  if (!depart || depart.metres === null) {
    // Une fenêtre à un champ mort ne dit rien. On dit pourquoi on ne peut pas.
    alerter(
      depart
        ? `L'altitude en mémoire ne se lit pas comme un nombre : « ${depart.valeur} ».`
        : "Ce projet n'a pas d'altitude en mémoire : il n'y a rien à faire varier."
    );
    return;
  }

  const hote = document.createElement("div");
  document.body.appendChild(hote);
  ouverte = hote;

  const fermer = () => {
    document.removeEventListener("keydown", auClavier);
    hote.remove();
    ouverte = null;
  };

  // Échap renonce. Une fenêtre modale dont on ne connaît qu'un seul moyen de
  // sortie se referme mal quand ce moyen défaille.
  const auClavier = (evenement) => {
    if (evenement.key === "Escape") fermer();
  };
  document.addEventListener("keydown", auClavier);

  const montrerLaSaisie = (echec = "", valeur = "") => {
    hote.innerHTML = renderSaisie(depart, echec);
    brancher();
    const champ = hote.querySelector("[data-variante-valeur]");
    if (champ) {
      champ.value = valeur;
      champ.focus();
      champ.select();
    }
  };

  /** La dernière valeur saisie, pour la retrouver en refaisant le calcul. */
  let saisieRetenue = "";

  const calculer = ({ supposer = false } = {}) => {
    const saisie = hote.querySelector("[data-variante-valeur]")?.value ?? saisieRetenue;
    saisieRetenue = texte(saisie);
    const altitude = lireUnNombre(saisie);
    const rendu = consequencesDeLaVariante({ assertions: memoire ?? [], altitude, supposer });

    if (!rendu.ok) {
      montrerLaSaisie(rendu.raison, saisieRetenue);
      return;
    }

    hote.innerHTML = renderConsequences(depart, altitude, rendu);
    brancher({
      lire: () => {
        const variante = variantePourLEcran({ altitude, consequences: rendu });
        essayerLaVariante(variante);
        fermer();
        if (typeof quandOnLit === "function") quandOnLit(variante);
      },
      refaire: () => montrerLaSaisie("", saisieRetenue),
      // Refaire le même calcul, la supposition acceptée. C'est un second passage
      // complet, pas une retouche de l'affichage : une conséquence supposée en
      // entraîne d'autres, et rafistoler la liste les manquerait.
      supposer: () => calculer({ supposer: true })
    });
  };

  function brancher({ lire = null, refaire = null, supposer = null } = {}) {
    for (const bouton of hote.querySelectorAll("[data-variante-fermer]")) {
      bouton.addEventListener("click", fermer);
    }
    for (const bouton of hote.querySelectorAll("[data-variante-calculer]")) {
      bouton.addEventListener("click", () => calculer());
    }
    // Entrée calcule : on tape un nombre, on veut le résultat, pas un déplacement
    // au bouton suivant.
    const champ = hote.querySelector("[data-variante-valeur]");
    if (champ) {
      champ.addEventListener("keydown", (evenement) => {
        if (evenement.key !== "Enter") return;
        evenement.preventDefault();
        calculer();
      });
    }
    if (lire) {
      for (const bouton of hote.querySelectorAll("[data-variante-lire]")) bouton.addEventListener("click", lire);
    }
    if (refaire) {
      for (const bouton of hote.querySelectorAll("[data-variante-refaire]")) bouton.addEventListener("click", refaire);
    }
    if (supposer) {
      for (const bouton of hote.querySelectorAll("[data-variante-supposer]")) bouton.addEventListener("click", supposer);
    }
  }

  montrerLaSaisie();
}

/**
 * Dire pourquoi on n'ouvre pas, sans fabriquer une fenêtre pour le dire.
 *
 * `alert` est laid, mais il est franc et il n'existe qu'un instant. Une fenêtre
 * dessinée pour un refus serait un écran de plus à entretenir.
 */
function alerter(message) {
  if (typeof window !== "undefined" && typeof window.alert === "function") window.alert(message);
}
