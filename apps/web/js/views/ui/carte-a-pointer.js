/**
 * La carte qu'on déplace, et le marqueur qu'on y tire.
 *
 * ## Ce qu'elle sert à faire
 *
 * Situer un projet **qui n'a pas d'adresse**. On tape la commune, on arrive
 * au-dessus du bourg, et l'on se déplace jusqu'à reconnaître le terrain sur la
 * vue satellite — la haie, le chemin, la forme de la parcelle. Puis on **tire le
 * marqueur** jusqu'à l'endroit exact.
 *
 * ## Un nœud qu'on garde, jamais un nœud qu'on refait
 *
 * C'est la règle de ce fichier, et elle vient d'un défaut qu'on voyait à l'œil
 * nu : à chaque relâchement, l'écran se redessinait, l'`iframe` de la vue
 * satellite était **détruite et recréée**, et le navigateur affichait une page
 * blanche le temps de la recharger. On cassait nous-mêmes le fonctionnement de
 * la carte, qui sait très bien changer de centre toute seule.
 *
 * D'où le partage en trois :
 *
 * | ce que c'est | quand |
 * | --- | --- |
 * | `creerLaCarteAPointer` | **une fois** : elle rend un élément, que l'écran garde et rattache |
 * | `brancherLaCarteAPointer` | une fois, sur cet élément |
 * | `majCarteAPointer` | à chaque changement : elle **patche** ce qui a bougé |
 *
 * La mise à jour ne touche à l'`iframe` que lorsque son adresse change, et elle
 * déplace le marqueur en réécrivant sa transformation. Rien n'est recréé, donc
 * rien ne clignote.
 *
 * ## Le voile, et pourquoi il faut bien un voile
 *
 * La vue satellite est servie dans une `iframe` : on ne peut ni lui demander où
 * elle est centrée, ni écouter ses clics. On pose donc un voile transparent
 * par-dessus, on écoute les gestes **dessus**, et l'on recalcule le centre
 * nous-mêmes — `services/carte-pointee.js` fait les mathématiques.
 *
 * Pendant qu'on tire, la vue et le marqueur sont déplacés en bloc par une
 * transformation ; au relâchement, on redemande la vue au bon centre. C'est un
 * déplacement de ce qui est déjà chargé, et l'on charge volontairement plus
 * large que le cadre pour que les bords ne découvrent pas du vide.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Elle n'écrit rien et ne résout rien. Elle rend un point à celui qui l'a
 * branchée ; c'est cet écran-là qui va demander la commune, l'altitude, et qui
 * décide quoi en faire.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import {
  ZOOM_MIN, ZOOM_MAX, zoomBorne, pointADistance, centreApresGlissement, pixelsDepuisLeCentre
} from "../../services/carte-pointee.js";

/** En deçà, un déplacement du doigt n'est pas un glissement : c'est un tremblement. */
const GLISSEMENT_MINIMAL = 6;

/**
 * Le rayon, en pixels, où l'on considère qu'on a saisi le marqueur.
 *
 * Généreux, et volontairement : le marqueur fait trente pixels de haut mais sa
 * pointe est un point. Demander de viser le point exact ferait rater la prise
 * une fois sur deux, et l'on déplacerait la carte en croyant tirer le marqueur.
 */
const PRISE_DU_MARQUEUR = 26;

/** Le temps qu'on laisse à la roulette avant de redemander la vue. */
const REPOS_DE_LA_ROULETTE = 220;

/**
 * La carte, créée **une fois**.
 *
 * L'écran garde l'élément rendu et le rattache à chaque dessin ; il ne le
 * réécrit jamais. C'est ce qui empêche l'`iframe` de se recharger, donc la page
 * blanche entre deux vues.
 *
 * @param {object} options
 * @param {string} options.nom l'identité de la carte
 * @param {string} [options.hauteur]
 * @returns {HTMLElement}
 */
export function creerLaCarteAPointer({ nom, hauteur = "420px" } = {}) {
  const cle = escapeHtml(String(nom ?? ""));
  const carte = document.createElement("div");
  carte.className = "carte-pointee";
  carte.dataset.cartePointee = String(nom ?? "");
  carte.style.height = String(hauteur);

  carte.innerHTML = `
    <div class="carte-pointee__fond">
      <iframe
        class="carte-pointee__vue"
        data-carte-vue
        title="Vue satellite, à déplacer pour situer le projet"
        loading="eager"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
        hidden
      ></iframe>
      <div class="carte-pointee__attente" data-carte-attente aria-hidden="true"></div>
    </div>

    <div class="carte-pointee__voile" data-carte-voile role="application"
      aria-label="Déplacer la carte, tirer le marqueur pour situer le projet">
      <div class="carte-pointee__viseur" aria-hidden="true">
        ${svgIcon("viseur", { className: "octicon" })}
      </div>
      <div class="carte-pointee__pins" aria-hidden="true">
        <div class="carte-pointee__marqueur" data-carte-marqueur hidden>
          ${svgIcon("location", { className: "octicon" })}
        </div>
      </div>
    </div>

    <div class="carte-pointee__zoom">
      <button type="button" class="gh-btn gh-btn--sm" data-carte-zoom="+" aria-label="Zoomer">+</button>
      <button type="button" class="gh-btn gh-btn--sm" data-carte-zoom="-" aria-label="Dézoomer">−</button>
    </div>

    <p class="carte-pointee__mode">
      ${svgIcon("location", { className: "octicon" })}
      <!-- La phrase dans un span : sans lui, chaque nœud devient un élément de
           la boîte flexible, et « Tirez le marqueur » se retrouve dans sa propre
           colonne au milieu du reste. -->
      <span data-carte-consigne></span>
    </p>
  `;

  void cle;
  return carte;
}

/**
 * Mettre la carte à jour, **sans rien recréer**.
 *
 * L'`iframe` ne bouge que si son adresse change ; le marqueur se déplace par sa
 * transformation ; les boutons de zoom s'allument ou s'éteignent. Une vue qui
 * n'est pas encore arrivée laisse la précédente à l'écran : la remplacer par un
 * vide ferait clignoter la carte à chaque déplacement.
 *
 * @param {HTMLElement} carte l'élément rendu par `creerLaCarteAPointer`
 * @param {object} etat
 * @param {{latitude: number, longitude: number}|null} etat.centre où l'on regarde
 * @param {{latitude: number, longitude: number}|null} [etat.point] le marqueur
 * @param {number} [etat.zoom]
 * @param {string} [etat.embedUrl] la vue satellite, déjà résolue
 */
export function majCarteAPointer(carte, { centre = null, point = null, zoom = 14, embedUrl = "" } = {}) {
  if (!carte) return;

  const niveau = zoomBorne(zoom);
  const vue = carte.querySelector("[data-carte-vue]");
  const attente = carte.querySelector("[data-carte-attente]");
  const marqueur = carte.querySelector("[data-carte-marqueur]");

  // L'adresse ne se réécrit que si elle a changé. La réécrire à l'identique
  // recharge l'`iframe` — c'est exactement la page blanche qu'on veut éviter.
  if (vue && embedUrl && vue.getAttribute("src") !== embedUrl) {
    vue.setAttribute("src", embedUrl);
    vue.hidden = false;
  }
  if (attente) attente.hidden = Boolean(vue && !vue.hidden);

  // Le marqueur se dessine **où il est**, pas au milieu de l'écran : c'est ce
  // qui permet de s'éloigner pour se resituer sans croire que le projet suit.
  const decalage = pixelsDepuisLeCentre(centre, point, { zoom: niveau });
  if (marqueur) {
    marqueur.hidden = !decalage;
    if (decalage) {
      marqueur.style.transform =
        `translate(calc(-50% + ${decalage.dx.toFixed(1)}px), calc(-100% + ${decalage.dy.toFixed(1)}px))`;
    }
  }

  for (const bouton of carte.querySelectorAll("[data-carte-zoom]")) {
    const plus = bouton.getAttribute("data-carte-zoom") === "+";
    bouton.disabled = plus ? niveau >= ZOOM_MAX : niveau <= ZOOM_MIN;
  }

  // La consigne dit le geste **qui existe**. Sans marqueur, « tirez le
  // marqueur » demande de tirer quelque chose qu'on ne voit nulle part.
  const consigne = carte.querySelector("[data-carte-consigne]");
  if (consigne) consigne.innerHTML = decalage ? CONSIGNE.tirer : CONSIGNE.poser;
}

/** Ce que la carte demande, selon qu'un marqueur y est posé ou non. */
const CONSIGNE = {
  poser: "<b>Cliquez sur le terrain</b> pour poser le projet. Glissez pour déplacer la carte, "
    + "la roulette pour zoomer.",
  tirer: "<b>Tirez le marqueur</b> jusqu'au terrain. Glissez ailleurs pour déplacer la carte, "
    + "la roulette pour zoomer."
};

/**
 * Les gestes de la carte, branchés **une fois** sur son élément.
 *
 * @param {HTMLElement} carte l'élément rendu par `creerLaCarteAPointer`
 * @param {object} options
 * @param {Function} options.etat rend `{centre, point, zoom}` au moment du geste —
 *   une fonction et non un objet : l'écran change, et un objet capturé à la
 *   liaison porterait le centre d'il y a trois déplacements
 * @param {Function} options.quandDeplacee reçoit le nouveau centre
 * @param {Function} options.quandPointee reçoit le point où le marqueur a été posé
 * @param {Function} [options.quandZoomee] reçoit le nouveau zoom
 */
export function brancherLaCarteAPointer(carte, { etat, quandDeplacee, quandPointee, quandZoomee } = {}) {
  const voile = carte?.querySelector("[data-carte-voile]");
  if (!carte || !voile || carte.dataset.carteBranchee === "true") return;
  carte.dataset.carteBranchee = "true";

  const ou = () => (typeof etat === "function" ? etat() : {}) ?? {};

  /** Le point visé, dans le repère du voile — son centre pour origine. */
  const viseAu = (evenement) => {
    const cadre = voile.getBoundingClientRect();
    return {
      dx: evenement.clientX - (cadre.left + cadre.width / 2),
      dy: evenement.clientY - (cadre.top + cadre.height / 2)
    };
  };

  /**
   * Vrai quand on vient de saisir le marqueur, et non la carte.
   *
   * Le marqueur est posé **par sa pointe** : sa forme s'étend vers le haut. La
   * zone de prise suit donc cette forme — un peu au-dessus, très peu en dessous
   * — au lieu d'un cercle centré sur la pointe, qui obligerait à viser sous le
   * dessin qu'on voit.
   */
  const saisitLeMarqueur = (vise) => {
    const { centre, point, zoom } = ou();
    const pose = pixelsDepuisLeCentre(centre, point, { zoom });
    if (!pose) return false;

    const dx = vise.dx - pose.dx;
    const dy = vise.dy - pose.dy;
    return Math.abs(dx) <= PRISE_DU_MARQUEUR && dy <= PRISE_DU_MARQUEUR / 2 && dy >= -PRISE_DU_MARQUEUR * 1.6;
  };

  let depart = null;
  let aGlisse = false;
  /** Ce qu'on tire : le marqueur, ou la carte. Décidé à l'appui, tenu jusqu'au bout. */
  let tireLeMarqueur = false;
  let roulette = null;
  let zoomVise = null;

  const relacher = () => {
    carte.style.removeProperty("--carte-glissement-x");
    carte.style.removeProperty("--carte-glissement-y");
    carte.classList.remove("est-tiree", "tire-le-marqueur");
  };

  voile.addEventListener("pointerdown", (evenement) => {
    // Le bouton du milieu et le clic droit ne déplacent rien : ils ouvrent des
    // menus, et les capturer les casserait sans rien apporter.
    if (evenement.button !== 0) return;
    evenement.preventDefault();
    voile.setPointerCapture(evenement.pointerId);

    const vise = viseAu(evenement);
    depart = { x: evenement.clientX, y: evenement.clientY, ...vise };
    aGlisse = false;
    tireLeMarqueur = saisitLeMarqueur(vise);
    carte.classList.toggle("tire-le-marqueur", tireLeMarqueur);
  });

  voile.addEventListener("pointermove", (evenement) => {
    if (!depart) return;
    const dx = evenement.clientX - depart.x;
    const dy = evenement.clientY - depart.y;
    if (!aGlisse && Math.hypot(dx, dy) < GLISSEMENT_MINIMAL) return;

    aGlisse = true;
    // La vue et le marqueur suivent le doigt ; la vue se **repose** au
    // relâchement. Quand on tire le marqueur, c'est **lui seul** qui bouge :
    // déplacer la carte avec lui ferait un endroit qui ne change pas, ce qui est
    // le contraire du geste.
    carte.classList.add("est-tiree");
    carte.style.setProperty("--carte-glissement-x", `${dx}px`);
    carte.style.setProperty("--carte-glissement-y", `${dy}px`);
  });

  const finir = (evenement) => {
    if (!depart) { relacher(); return; }

    const dx = evenement.clientX - depart.x;
    const dy = evenement.clientY - depart.y;
    const glisse = aGlisse;
    const marqueur = tireLeMarqueur;
    const vise = { dx: depart.dx + dx, dy: depart.dy + dy };
    depart = null;
    relacher();

    const { centre, zoom, point } = ou();

    // **Un clic pose le premier marqueur.** Tant qu'il n'y en a aucun, il n'y a
    // rien à tirer : la consigne le dit, et sans ce clic un projet sans point
    // n'aurait aucun moyen d'en recevoir un. Une fois posé, il se déplace — un
    // clic ailleurs ne le téléporte pas par mégarde.
    if (!glisse) {
      if (point) return;
      const pose = pointADistance(centre, { dx: vise.dx, dy: vise.dy, zoom });
      if (pose) quandPointee?.(pose);
      return;
    }

    if (marqueur) {
      const pose = pointADistance(centre, { dx: vise.dx, dy: vise.dy, zoom });
      if (pose) quandPointee?.(pose);
      return;
    }

    const nouveau = centreApresGlissement(centre, { dx, dy, zoom });
    if (nouveau) quandDeplacee?.(nouveau);
  };

  voile.addEventListener("pointerup", finir);
  voile.addEventListener("pointercancel", () => { depart = null; relacher(); });

  /**
   * La roulette zoome, comme sur toutes les cartes.
   *
   * Elle est **retenue** : chaque cran redemande une vue satellite, et douze
   * crans en une seconde feraient douze appels dont onze pour rien. On attend
   * que la main s'arrête.
   */
  voile.addEventListener("wheel", (evenement) => {
    evenement.preventDefault();

    const depuis = zoomBorne(ou().zoom);
    const pas = evenement.deltaY < 0 ? 1 : -1;
    // Les crans **s'accumulent** : sans cette mémoire, chaque cran repartirait du
    // zoom de l'état — qui n'a pas encore bougé —, et douze crans en feraient un.
    zoomVise = zoomBorne((zoomVise ?? depuis) + pas);

    // Le retour est immédiat, même si la vue arrive après : la vue déjà chargée
    // est agrandie le temps qu'on redemande la bonne.
    carte.style.setProperty("--carte-echelle", String(2 ** (zoomVise - depuis)));
    carte.classList.add("est-zoomee");

    if (roulette) clearTimeout(roulette);
    roulette = setTimeout(() => {
      roulette = null;
      const demande = zoomVise;
      zoomVise = null;
      carte.style.removeProperty("--carte-echelle");
      carte.classList.remove("est-zoomee");
      if (demande !== null && demande !== depuis) quandZoomee?.(demande);
    }, REPOS_DE_LA_ROULETTE);
  }, { passive: false });

  for (const bouton of carte.querySelectorAll("[data-carte-zoom]")) {
    bouton.addEventListener("click", () => {
      const pas = bouton.getAttribute("data-carte-zoom") === "+" ? 1 : -1;
      quandZoomee?.(zoomBorne(zoomBorne(ou().zoom) + pas));
    });
  }
}
