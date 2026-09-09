/**
 * L'écran d'une variante.
 *
 * ## Pourquoi un écran, et non trois fenêtres
 *
 * Essayer une valeur se faisait dans une pile de fenêtres modales : choisir,
 * saisir, attendre, lire les conséquences. Chacune recouvrait la précédente, on
 * ne voyait jamais la question et la réponse ensemble, et rien de tout cela ne
 * survivait à un clic à côté. Une variante n'est pas une boîte de dialogue :
 * c'est **un état du projet qu'on regarde**, et cela demande un écran.
 *
 * Il tient en deux rangs :
 *
 * ```
 * Variante — quelle valeur essaie-t-on ?              [ Exporter ]
 * ┌──────────────────────────┬──────────────────────────────────┐
 * │ le socle, cherchable     │ aujourd'hui → dans la variante   │
 * │                          │                     [ Calculer ] │
 * ├──────────────────────────┴──────────────────────────────────┤
 * │ ce qui bouge, ce qui est à revérifier, ce qui ne bouge pas  │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## L'export
 *
 * Le bouton rend un JSON qui porte **tout ce qui a servi** : la valeur de
 * départ, celle qu'on essaie, les liens de dépendance qu'on a suivis, ce que le
 * rejeu a rendu, et ce qui est resté suspect. Une variante qui se comporte mal
 * ne se diagnostique pas sur une capture d'écran : il faut ce qu'elle a lu.
 *
 * ## Ce que cet écran ne fait pas
 *
 * Il n'écrit rien. Il ne parle à personne : il reçoit un état et rend du HTML.
 * Ce qui appelle le serveur — le rejeu des utilitaires — vit dans l'écran de la
 * mémoire, qui sait déjà attendre.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { phraseDeReserve } from "../../utilitaires/reserves.js";
import { TOUTES_ZONES } from "../../services/memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les quatre temps de l'écran. Un seul à la fois, et il se lit sur l'état. */
export const ETAPE = { CHOIX: "choix", SAISIE: "saisie", ATTENTE: "attente", RESULTAT: "resultat" };

/** L'accord d'un mot avec son nombre. Pas de « 1 recalculées » à l'écran. */
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);


/**
 * Une valeur qu'on peut essayer, avec ce qu'elle vaut, **où** elle vaut, et ce
 * qu'elle sert.
 *
 * La portée n'est pas un détail : un projet de quatre bâtiments pose quatre
 * « Altitude du site », qui ne diffèrent que par elle. Sans la lire, on en
 * choisissait une au hasard — et l'on faisait varier autre chose que ce qu'on
 * croyait.
 */
function renderChoixDUneValeur(valeur, choisie = null) {
  const zones = (valeur.zones ?? []).filter(Boolean);

  return `
    <button type="button" class="impact-choix${
      choisie?.id === valeur.id ? " is-active" : ""
    }" data-variante-choisir="${escapeHtml(valeur.id)}">
      <span class="impact-choix__titre">${escapeHtml(valeur.sujet)} : ${escapeHtml(valeur.valeur || "—")}</span>
      <span class="impact-choix__portee">${
        // « Toutes zones » se dit : une valeur sans portée vaut partout, et
        // laisser la ligne muette la ferait passer pour une portée oubliée.
        escapeHtml(zones.length ? zones.join(", ") : TOUTES_ZONES)
      }</span>
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
    <li class="variante-ligne variante-ligne--${bouge ? "bouge" : "stable"}">
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
      ${!nees.length && !levees.length ? renderReserves(ligne.reservesApres) : ""}
      ${
        // Qui a recalculé, et dans quelle version. Ce n'est pas une formalité :
        // c'est ce qui distingue un chiffre rendu par le référentiel d'un chiffre
        // qu'on aurait refait de son côté — et c'est bien le référentiel qui a
        // répondu, avec sa table, sans rien écrire.
        ligne.utilitaire
          ? `<span class="variante-ligne__pourquoi">recalculée par ${escapeHtml(ligne.utilitaire)}, au serveur</span>`
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


/* ────────────────────────────────────────────────────────────────────────────
 * Le premier rang : ce qu'on essaie
 * ────────────────────────────────────────────────────────────────────────── */

/** La colonne de gauche : le socle, cherchable. */
function renderQuelleValeur(valeurs, { cherche = "", choisie = null } = {}) {
  const filtre = texte(cherche).toLowerCase();
  const retenues = filtre ? valeurs.filter((valeur) => valeur.sujet.toLowerCase().includes(filtre)) : valeurs;

  return `
    <section class="variante-colonne">
      <h4>${svgIcon("beaker", { className: "octicon" })} Quelle valeur essaie-t-on ?</h4>
      <p class="variante-lead">
        On ne fait varier que le <b>socle</b> : ce que le projet pose, suppose ou constate.
        Ce que ses règles en concluent se recalcule.
      </p>

      <label class="fichiers-saisie__champ">
        <span>Chercher une valeur</span>
        <input type="text" class="gh-input" data-variante-recherche value="${escapeHtml(cherche)}"
          placeholder="altitude, classement, hauteur…" autocomplete="off">
      </label>

      <div class="impact-liste" data-variante-liste>${
        retenues.length
          ? retenues.map((valeur) => renderChoixDUneValeur(valeur, choisie)).join("")
          : renderListeDesValeurs([], { cherche: Boolean(filtre) })
      }</div>
    </section>
  `;
}

/** La colonne de droite : l'ancienne valeur, la nouvelle, et le bouton. */
function renderTesterUneVariante(choisie, { saisie = "", echec = "", etape = ETAPE.CHOIX } = {}) {
  if (!choisie) {
    return `
      <section class="variante-colonne variante-colonne--vide">
        <h4>${svgIcon("arrow-right", { className: "octicon" })} Tester une variante</h4>
        <p class="variante-rang__vide">Choisissez d'abord une valeur, à gauche.</p>
      </section>
    `;
  }

  const calcule = etape === ETAPE.ATTENTE;

  return `
    <section class="variante-colonne">
      <h4>${svgIcon("arrow-right", { className: "octicon" })} Tester une variante</h4>
      <p class="variante-lead">
        Rien ne sera écrit. On substitue une valeur, on relit la mémoire, on regarde,
        et on ressort — la mémoire du projet ne bouge pas d'un octet.
      </p>

      <div class="variante-saisie">
        <label class="fichiers-saisie__champ variante-saisie__champ">
          <span>${escapeHtml(choisie.sujet)}, aujourd'hui</span>
          <input type="text" class="gh-input" value="${escapeHtml(choisie.valeur)}" readonly disabled>
          <small>${escapeHtml((choisie.zones ?? []).length ? choisie.zones.join(", ") : TOUTES_ZONES)}</small>
        </label>
        <span class="variante-saisie__fleche">${svgIcon("arrow-right", { className: "octicon" })}</span>
        <label class="fichiers-saisie__champ variante-saisie__champ">
          <span>dans la variante</span>
          <input type="text" class="gh-input" data-variante-valeur value="${escapeHtml(saisie)}"
            placeholder="${escapeHtml(choisie.valeur || "la valeur essayée")}" autocomplete="off"
            ${calcule ? "disabled" : ""}>
          <small>Écrite comme le projet l'écrit : c'est ainsi que les règles la reliront.</small>
        </label>
      </div>

      ${echec ? `<p class="fichiers-saisie__echec">${escapeHtml(echec)}</p>` : ""}

      <footer class="variante-colonne__pied">
        <button type="button" class="gh-btn gh-btn--primary" data-variante-calculer ${calcule ? "disabled" : ""}>
          ${calcule ? "Calcul en cours…" : "Calculer"}
        </button>
      </footer>
    </section>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le second rang : ce que cela change
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Le tableau des résultats, dans ses trois états.
 *
 * Avant tout calcul, il dit ce qu'il attend plutôt que de rester blanc — un
 * cadre vide se lit comme un écran cassé. Pendant, il montre l'attente et dit
 * surtout ce qui **ne** se passe pas : rien ne s'écrit au serveur.
 */
function renderResultat(etat) {
  const { etape, choisie, saisie, rendu } = etat;

  if (etape === ETAPE.ATTENTE) {
    return `
      <section class="variante-resultat variante-resultat--attente">
        <p class="variante-lead variante-attente">
          ${svgIcon("sync", { className: "octicon" })}
          Les règles du projet se rejouent ici, et les utilitaires sont redemandés à leur
          référentiel avec cette valeur. <b>Rien n'y est écrit</b> : ils calculent et se taisent.
        </p>
      </section>
    `;
  }

  if (!rendu?.ok) {
    return `
      <section class="variante-resultat variante-resultat--vide">
        <p class="variante-rang__vide">
          ${choisie
            ? "Donnez une valeur à essayer, puis calculez : ce qui en découle s'affichera ici."
            : "Choisissez une valeur du socle : ce qui en découle s'affichera ici."}
        </p>
      </section>
    `;
  }

  const bougees = rendu.recalculees.filter((ligne) => ligne.valeurABouge || ligne.reservesOntBouge).length
    + rendu.rejouees.length;

  return `
    <section class="variante-resultat">
      <header class="variante-resultat__tete">
        <b>${svgIcon("beaker", { className: "octicon" })} ${escapeHtml(choisie?.sujet ?? "")} :
          ${escapeHtml(choisie?.valeur ?? "")} → ${escapeHtml(saisie)}</b>
        <span class="variante-resultat__compte">${
          bougees ? `${bougees} ${accorde(bougees, "valeur bouge", "valeurs bougent")}` : "aucune valeur ne bouge"
        }</span>
      </header>

      <div class="variante-rangs">
        <section class="variante-rang variante-rang--sur">
          <h5>${svgIcon("check", { className: "octicon" })} Recalculé</h5>
          ${
            rendu.recalculees.length || rendu.rejouees.length
              ? `<ul class="variante-lignes">${
                  rendu.rejouees.map(renderRejouee).join("")
                }${rendu.recalculees.map(renderRecalculee).join("")}</ul>`
              : `<p class="variante-rang__vide">Aucune règle ni aucun utilitaire ne se rejoue sur cette valeur.</p>`
          }
          ${
            rendu.cycles?.length
              ? `<p class="variante-rang__note">${svgIcon("alert", { className: "octicon" })}
                  ${rendu.cycles.length} ${rendu.cycles.length > 1 ? "zones ne se stabilisent" : "zone ne se stabilise"} pas :
                  leurs règles se lisent en rond.</p>`
              : ""
          }
        </section>

        <section class="variante-rang variante-rang--suspect">
          <h5>${svgIcon("alert", { className: "octicon" })} À revérifier</h5>
          <p>
            Ces valeurs reposent sur ce qui vient de bouger, et nous ne savons pas les rejouer ici.
            Elles sont <b>nommées</b>, jamais devinées.
          </p>
          ${
            rendu.aRevoir.length
              ? `<ul class="variante-lignes">${rendu.aRevoir.map(renderARevoir).join("")}</ul>`
              : `<p class="variante-rang__vide">Rien de ce que le projet tient ne repose sur ce qui vient de bouger.</p>`
          }
        </section>

        <section class="variante-rang variante-rang--inchange">
          <h5>${svgIcon("dot-fill-pending", { className: "octicon" })} Inchangé</h5>
          <p>
            ${rendu.inchangees} ${accorde(rendu.inchangees, "affirmation n'a", "affirmations n'ont")}
            aucun lien avec cette donnée.
          </p>
        </section>
      </div>

      <footer class="variante-resultat__pied">
        <button type="button" class="gh-btn" data-variante-abandonner>Abandonner</button>
        <button type="button" class="gh-btn gh-btn--primary" data-variante-lire ${bougees ? "" : "disabled"}>
          ${svgIcon("book", { className: "octicon" })} Lire la mémoire avec cette variante
        </button>
      </footer>
    </section>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'écran
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Ce que l'export emporte.
 *
 * Tout ce qui a servi, et rien de décoratif : la valeur de départ avec sa
 * portée, celle qu'on essaie, et les trois rangs du résultat tels que le service
 * les a rendus. C'est de quoi refaire le raisonnement sans l'écran.
 */
export function varianteEnJson(etat = {}) {
  const { choisie = null, saisie = "", rendu = null, projet = "" } = etat;

  return {
    format: "mdall.variante/1",
    genereLe: new Date().toISOString(),
    projet: texte(projet) || null,
    depart: choisie
      ? {
          id: choisie.id, sujet: choisie.sujet, valeur: choisie.valeur,
          zones: choisie.zones ?? [], nature: choisie.nature ?? null,
          emplois: choisie.lectures ?? 0
        }
      : null,
    essaye: texte(saisie) || null,
    resultat: rendu?.ok
      ? {
          recalculees: rendu.recalculees ?? [],
          rejouees: rendu.rejouees ?? [],
          aRevoir: rendu.aRevoir ?? [],
          cycles: rendu.cycles ?? [],
          inchangees: rendu.inchangees ?? 0,
          confirmees: rendu.confirmees ?? 0,
          depart: rendu.depart ?? []
        }
      : null,
    refus: rendu && !rendu.ok ? texte(rendu.raison) : null
  };
}

/**
 * L'écran entier.
 *
 * @param {{valeurs: object[], etape: string, choisie: object|null,
 *          saisie: string, echec: string, cherche: string, rendu: object|null}} etat
 */
export function renderEcranDeVariante(etat = {}) {
  const { valeurs = [], etape = ETAPE.CHOIX, choisie = null, saisie = "", echec = "", cherche = "" } = etat;

  return `
    <div class="variante-ecran">
      <header class="variante-ecran__tete">
        <span class="variante-ecran__marque">
          ${svgIcon("beaker", { className: "octicon" })} Variante
        </span>
        <span class="variante-ecran__titre">${
          choisie
            ? `${escapeHtml(choisie.sujet)} — ce que le projet dirait`
            : "Essayer une valeur, sans rien écrire"
        }</span>
        <button type="button" class="gh-btn variante-ecran__exporter" data-variante-exporter>
          ${svgIcon("download", { className: "octicon" })} Exporter
        </button>
      </header>

      <div class="variante-ecran__rang variante-ecran__rang--haut">
        ${renderQuelleValeur(valeurs, { cherche, choisie })}
        ${renderTesterUneVariante(choisie, { saisie, echec, etape })}
      </div>

      <div class="variante-ecran__rang">
        ${renderResultat(etat)}
      </div>
    </div>
  `;
}
