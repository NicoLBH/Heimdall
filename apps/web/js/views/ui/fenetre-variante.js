/**
 * Essayer une valeur du projet, et lire ce que le projet en dirait.
 *
 * ## Ce que cette fenêtre doit prouver
 *
 * Qu'on peut **se promener dans une mémoire qui n'existe pas, sans jamais croire
 * qu'elle existe**. Tout le reste — la comparaison de deux variantes, l'adoption
 * en hypothèse — n'est que du volume par-dessus.
 *
 * ## Ce que l'étape 6 change ici
 *
 * La fenêtre ne connaissait qu'un sujet : l'altitude. Elle s'ouvrait sur un
 * champ, et le champ était toujours le même. Maintenant qu'un nœud quelconque du
 * socle se fait varier, elle s'ouvre sur la **question qui précède** — quelle
 * valeur essaie-t-on ? — comme le fait déjà l'étude d'impact.
 *
 * Trois temps, donc : on choisit une valeur, on dit ce qu'elle deviendrait, on
 * lit les conséquences.
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
 * qui devient suspect sans en deviner la valeur. **Inchangé** se compte, parce
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
  consequencesDeLaVariante, valeursSubstituables, variantePourLEcran
} from "../../services/memoire-variante.js";
import { emploisParAffirmation } from "../../services/memoire-applications.js";
import { essayerLaVariante } from "../../services/variante-en-cours.js";
import { RESERVE, phraseDeReserve } from "../../utilitaires/reserves.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'accord d'un mot avec son nombre. Pas de « 1 recalculées » à l'écran. */
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/* ────────────────────────────────────────────────────────────────────────────
 * Le choix de la valeur
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Les valeurs qu'on peut faire varier, celles qui servent le plus en tête.
 *
 * Le compte des emplois vient des lectures enregistrées quand on les a. Il ne
 * décide de rien — on fait varier ce qu'on veut —, mais il place en haut de la
 * liste ce sur quoi la question se pose vraiment : une donnée lue quarante fois
 * et une donnée lue jamais ne méritent pas le même rang.
 */
function valeursAuChoix(assertions, emplois) {
  return valeursSubstituables(assertions)
    .map((entree) => ({ ...entree, lectures: emplois.get(entree.id)?.lectures ?? 0 }))
    .sort((gauche, droite) =>
      droite.lectures - gauche.lectures || gauche.sujet.localeCompare(droite.sujet, "fr"));
}

/** Une valeur qu'on peut essayer, avec ce qu'elle vaut et ce qu'elle sert. */
function renderChoixDUneValeur(valeur) {
  return `
    <button type="button" class="impact-choix" data-variante-choisir="${escapeHtml(valeur.id)}">
      <span class="impact-choix__titre">${escapeHtml(valeur.sujet)} : ${escapeHtml(valeur.valeur || "—")}</span>
      <span class="impact-choix__compte${valeur.lectures ? "" : " impact-choix__compte--vide"}">${
        valeur.lectures
          ? `${valeur.lectures} ${accorde(valeur.lectures, "emploi", "emplois")}`
          : "aucun emploi connu"
      }</span>
    </button>
  `;
}

/** La liste, ou la phrase qui dit pourquoi elle est vide. */
function renderListeDesValeurs(valeurs, { cherche = false } = {}) {
  if (valeurs.length) return valeurs.map(renderChoixDUneValeur).join("");
  return `<p class="variante-rang__vide">${
    cherche
      ? "Aucune valeur du socle ne porte ce mot."
      : "Ce projet ne pose aucune valeur qu'on puisse faire varier."
  }</p>`;
}

function renderChoix(valeurs) {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Tester une variante">
      <div class="fichiers-saisie__boite impact-boite">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("beaker", { className: "octicon" })} Quelle valeur essaie-t-on ?</b>
          <button type="button" class="fichiers-saisie__fermer" data-variante-fermer
            aria-label="Renoncer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="variante-lead">
          On ne fait varier que le <b>socle</b> : ce que le projet pose, suppose ou constate.
          Ce que ses règles en concluent se recalcule — le réécrire à la main afficherait une
          chaîne qui ne mène plus à ce qu'elle montre.
        </p>

        <label class="fichiers-saisie__champ">
          <span>Chercher une valeur</span>
          <input type="text" class="gh-input" data-variante-recherche placeholder="altitude, classement, hauteur…"
            autocomplete="off">
        </label>

        <div class="impact-liste" data-variante-liste>${renderListeDesValeurs(valeurs)}</div>

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-variante-fermer>Fermer</button>
        </footer>
      </div>
    </div>
  `;
}

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
            <input type="text" class="gh-input" data-variante-valeur
              placeholder="${escapeHtml(depart.valeur || "la valeur essayée")}" autocomplete="off">
            <small>
              Écrite comme le projet l'écrit : c'est ainsi que les règles la reliront.
            </small>
          </label>
        </div>

        ${echec ? `<p class="fichiers-saisie__echec">${escapeHtml(echec)}</p>` : ""}

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-variante-fermer>Annuler</button>
          <button type="button" class="gh-btn" data-variante-retour>Choisir une autre valeur</button>
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
              supposée calculée à ${escapeHtml(String(ligne.altitudeDepart))} m — ce calcul ne conservait pas ses entrées
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
        escapeHtml(ligne.pourquoi || (ligne.motif === "utilitaire"
          ? "un utilitaire l'a déduite, et nous ne savons pas rejouer son calcul ici"
          : ligne.motif === "sans-objet"
            ? "la règle qui la concluait ne s'applique plus"
            : "repose sur une valeur qui vient de bouger"))
      }${ligne.provenance ? ` — ${escapeHtml(ligne.provenance)}` : ""}</span>
    </li>
  `;
}

function renderConsequences(depart, vers, rendu) {
  // Une valeur supposée compte : elle bouge, sous une condition dite. Ne compter
  // que les certaines ferait écrire « rien ne bouge » sous une liste qui bouge.
  const bougees = rendu.recalculees.filter((ligne) => ligne.valeurABouge || ligne.reservesOntBouge).length
    + (rendu.rejouees ?? []).length;

  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Conséquences de la variante">
      <div class="fichiers-saisie__boite variante-boite variante-boite--large">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("beaker", { className: "octicon" })} ${escapeHtml(depart.sujet)} :
            ${escapeHtml(depart.valeur)} → ${escapeHtml(vers)}</b>
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
          <button type="button" class="gh-btn" data-variante-retour>Choisir une autre valeur</button>
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
 * @param {object[]|null} [options.applications] les lectures enregistrées, si on les a
 * @param {string} [options.depart] la valeur à essayer d'emblée, si l'écran la connaît
 * @param {(variante: object) => void} [options.quandOnLit] appelé quand on entre
 *   dans la variante — c'est à l'appelant d'emmener l'utilisateur à la mémoire
 */
export async function ouvrirLaFenetreDeVariante({
  projectId = "", assertions = null, applications = null, depart = "", quandOnLit = null
} = {}) {
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

  const emplois = emploisParAffirmation(Array.isArray(applications) ? applications : []);
  const valeurs = valeursAuChoix(memoire ?? [], emplois);

  if (!valeurs.length) {
    // Une fenêtre à une liste vide ne dit rien. On dit pourquoi on ne peut pas.
    alerter("Ce projet ne pose aucune valeur qu'on puisse faire varier : il n'y a rien à essayer.");
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

  /** La valeur qu'on fait varier, et la dernière saisie faite pour elle. */
  let choisie = null;
  let saisieRetenue = "";

  /** Ce que la recherche retient : le sujet, et rien d'autre — c'est lui qu'on lit. */
  const retenues = (cherche) =>
    cherche ? valeurs.filter((valeur) => valeur.sujet.toLowerCase().includes(cherche)) : valeurs;

  const montrerLeChoix = (filtre = "") => {
    hote.innerHTML = renderChoix(retenues(filtre.trim().toLowerCase()));
    brancherCommun();
    brancherLeChoix(filtre);
  };

  const montrerLaSaisie = (echec = "", valeur = "") => {
    if (!choisie) return montrerLeChoix();
    hote.innerHTML = renderSaisie(choisie, echec);
    brancherCommun();
    brancherLaSaisie();
    const champ = hote.querySelector("[data-variante-valeur]");
    if (champ) {
      champ.value = valeur;
      champ.focus();
      champ.select();
    }
  };

  const choisir = (id) => {
    const valeur = valeurs.find((entree) => entree.id === texte(id));
    if (!valeur) return;
    choisie = valeur;
    saisieRetenue = "";
    montrerLaSaisie();
  };

  const calculer = ({ supposer = false } = {}) => {
    if (!choisie) return;
    const saisie = hote.querySelector("[data-variante-valeur]")?.value ?? saisieRetenue;
    saisieRetenue = texte(saisie);
    const rendu = consequencesDeLaVariante({
      assertions: memoire ?? [],
      substitutions: new Map([[choisie.id, saisieRetenue]]),
      applications,
      supposer
    });

    if (!rendu.ok) {
      montrerLaSaisie(rendu.raison, saisieRetenue);
      return;
    }

    hote.innerHTML = renderConsequences(choisie, saisieRetenue, rendu);
    brancherCommun();
    for (const bouton of hote.querySelectorAll("[data-variante-lire]")) {
      bouton.addEventListener("click", () => {
        const variante = variantePourLEcran({ consequences: rendu });
        essayerLaVariante(variante);
        fermer();
        if (typeof quandOnLit === "function") quandOnLit(variante);
      });
    }
    for (const bouton of hote.querySelectorAll("[data-variante-refaire]")) {
      bouton.addEventListener("click", () => montrerLaSaisie("", saisieRetenue));
    }
    // Refaire le même calcul, la supposition acceptée. C'est un second passage
    // complet, pas une retouche de l'affichage : une conséquence supposée en
    // entraîne d'autres, et rafistoler la liste les manquerait.
    for (const bouton of hote.querySelectorAll("[data-variante-supposer]")) {
      bouton.addEventListener("click", () => calculer({ supposer: true }));
    }
  };

  /** Ce que toutes les étapes partagent : fermer, et revenir au choix. */
  function brancherCommun() {
    for (const bouton of hote.querySelectorAll("[data-variante-fermer]")) {
      bouton.addEventListener("click", fermer);
    }
    for (const bouton of hote.querySelectorAll("[data-variante-retour]")) {
      bouton.addEventListener("click", () => montrerLeChoix());
    }
  }

  function brancherLeChoix(filtre) {
    const champ = hote.querySelector("[data-variante-recherche]");
    if (champ) {
      champ.value = filtre;
      champ.focus();
      // Redessiner la liste seule : refaire la fenêtre entière ferait perdre le
      // curseur à chaque lettre.
      champ.addEventListener("input", () => {
        const cherche = champ.value.trim().toLowerCase();
        const liste = hote.querySelector("[data-variante-liste]");
        if (!liste) return;
        liste.innerHTML = renderListeDesValeurs(retenues(cherche), { cherche: Boolean(cherche) });
        brancherLesChoix();
      });
    }

    brancherLesChoix();
  }

  function brancherLesChoix() {
    for (const bouton of hote.querySelectorAll("[data-variante-choisir]")) {
      bouton.addEventListener("click", () => choisir(bouton.getAttribute("data-variante-choisir") || ""));
    }
  }

  function brancherLaSaisie() {
    for (const bouton of hote.querySelectorAll("[data-variante-calculer]")) {
      bouton.addEventListener("click", () => calculer());
    }
    // Entrée calcule : on tape une valeur, on veut le résultat, pas un
    // déplacement au bouton suivant.
    const champ = hote.querySelector("[data-variante-valeur]");
    if (champ) {
      champ.addEventListener("keydown", (evenement) => {
        if (evenement.key !== "Enter") return;
        evenement.preventDefault();
        calculer();
      });
    }
  }

  if (texte(depart) && valeurs.some((valeur) => valeur.id === texte(depart))) choisir(texte(depart));
  else montrerLeChoix();
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
