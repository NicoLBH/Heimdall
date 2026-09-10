/**
 * La carte qu'on déplace, et le point qu'on y pose.
 *
 * ## Ce qu'elle sert à faire
 *
 * Situer un projet **qui n'a pas d'adresse**. On tape la commune, on arrive
 * au-dessus du bourg, et l'on se déplace jusqu'à reconnaître le terrain sur la
 * vue satellite — la haie, le chemin, la forme de la parcelle. Puis on **tire le
 * marqueur** jusqu'à l'endroit exact.
 *
 * Il a d'abord fallu un appui long, et c'était une mauvaise idée : rien à
 * l'écran ne dit qu'un appui long existe, et l'on ne découvre un geste caché que
 * si quelqu'un vous le montre. Un marqueur qu'on déplace se voit — c'est ce
 * qu'on fait sur toutes les cartes du monde.
 *
 * ## Pourquoi un voile par-dessus la carte
 *
 * La vue satellite est servie dans une `iframe` : on ne peut ni lui demander où
 * elle est centrée, ni écouter ses clics. On pose donc un voile transparent
 * par-dessus, on écoute les gestes **dessus**, et l'on recalcule le centre
 * nous-mêmes — `services/carte-pointee.js` fait les mathématiques.
 *
 * ## Elle suit le doigt, et se repose au relâchement
 *
 * Pendant qu'on tire, la vue satellite et les marqueurs sont **déplacés en
 * bloc** par une transformation CSS : l'image suit la souris, comme sur
 * n'importe quelle carte. C'est un déplacement de ce qui est déjà chargé — les
 * bords découvrent du vide, et c'est visible.
 *
 * Au relâchement, le centre est recalculé et la vue redemandée. On ne peut pas
 * faire autrement : une `iframe` se recharge à chaque changement de centre, et
 * un rechargement par pixel donnerait un clignotement continu. Le viseur, lui,
 * ne bouge jamais : il marque le centre de l'écran, pas un endroit.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Elle n'écrit rien et ne résout rien. Elle rend un point à celui qui l'a
 * branchée ; c'est cet écran-là qui va demander la commune, l'altitude, et qui
 * décide quoi en faire.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderProjectLocationMapCard } from "../shared/project-location-map-card.js";
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
 * Un marqueur, posé **par la pointe** au décalage donné.
 *
 * `null` quand le point sort du cadre ou n'existe pas : le coller au bord ferait
 * croire que le projet est là.
 */
function renderMarqueur(decalage, { ancien = false } = {}) {
  if (!decalage) return "";

  return `
    <div class="carte-pointee__marqueur${ancien ? " carte-pointee__marqueur--ancien" : ""}"
      style="transform:translate(calc(-50% + ${decalage.dx.toFixed(1)}px), calc(-100% + ${decalage.dy.toFixed(1)}px));">
      ${svgIcon("location", { className: "octicon" })}
    </div>
  `;
}

/**
 * La carte, en HTML.
 *
 * @param {object} options
 * @param {string} options.nom l'identité de la carte, celle qu'on rebranche
 * @param {{latitude: number, longitude: number}|null} options.centre où l'on regarde
 * @param {{latitude: number, longitude: number}|null} [options.point] le point posé
 * @param {number} [options.zoom]
 * @param {string} [options.embedUrl] la vue satellite, déjà résolue
 * @param {boolean} [options.chargement]
 * @param {string} [options.hauteur]
 */
export function renderCarteAPointer({
  nom, centre = null, point = null, pointAncien = null, zoom = 14,
  embedUrl = "", chargement = false, hauteur = "420px"
} = {}) {
  const cle = escapeHtml(String(nom ?? ""));
  const niveau = zoomBorne(zoom);

  // Les marqueurs se dessinent **où ils sont**, pas au milieu de l'écran : c'est
  // ce qui permet de s'éloigner pour se resituer sans croire que le projet suit.
  const decalage = pixelsDepuisLeCentre(centre, point, { zoom: niveau });
  const ancien = pixelsDepuisLeCentre(centre, pointAncien, { zoom: niveau });

  // Deux marqueurs rouges de la même taille, et l'on ne sait plus lequel est le
  // projet. Celui d'avant passe donc en **bleu, plus petit, translucide**, et
  // celui qu'on vient de poser prend le rouge et la taille : on voit d'un coup
  // d'œil ce qui remplace quoi, et qu'il reste un geste à faire.
  const enAttente = Boolean(decalage && ancien);

  return `
    <div class="carte-pointee" data-carte-pointee="${cle}" style="height:${escapeHtml(hauteur)};">
      <div class="carte-pointee__fond">
        ${renderProjectLocationMapCard({
          latitude: centre?.latitude ?? null,
          longitude: centre?.longitude ?? null,
          embedUrl,
          isLoading: chargement,
          showSpinner: true,
          iframeTitle: "Vue satellite, à déplacer pour pointer le projet",
          height: "100%",
          containerClassName: "carte-pointee__carte"
        })}
      </div>

      <div class="carte-pointee__voile" data-carte-voile="${cle}" role="application"
        aria-label="Déplacer la carte, appui long pour poser le projet">
        <div class="carte-pointee__viseur" aria-hidden="true">
          ${svgIcon("viseur", { className: "octicon" })}
        </div>
        <!-- Les marqueurs vivent dans une couche qui **suit le doigt** pendant
             qu'on tire, comme le fond. Le viseur, lui, reste au centre de
             l'écran : c'est son rôle. -->
        <div class="carte-pointee__pins" aria-hidden="true">
          ${renderMarqueur(ancien, { ancien: true })}
          ${renderMarqueur(decalage, { ancien: false })}
        </div>
      </div>

      <div class="carte-pointee__zoom">
        <button type="button" class="gh-btn gh-btn--sm" data-carte-zoom="+"
          ${niveau >= ZOOM_MAX ? "disabled" : ""} aria-label="Zoomer">+</button>
        <button type="button" class="gh-btn gh-btn--sm" data-carte-zoom="-"
          ${niveau <= ZOOM_MIN ? "disabled" : ""} aria-label="Dézoomer">−</button>
      </div>

      <p class="carte-pointee__mode${enAttente ? " carte-pointee__mode--attente" : ""}">
        ${svgIcon(enAttente ? "alert" : "location", { className: "octicon" })}
        <!-- La phrase dans un span : sans lui, chaque nœud devient un élément
             de la boîte flexible, et « appuyez longuement » se retrouve dans sa
             propre colonne au milieu du reste. -->
        <span>${
          // Une fois le point posé, la consigne d'avant ne sert plus : elle
          // décrit un geste qu'on vient de faire, pendant que celui qui reste à
          // faire n'est écrit nulle part.
          enAttente
            ? `Nouvel endroit posé. Cliquez sur <b>« Calculer ici »</b> pour actualiser les valeurs.`
            : `<b>Tirez le marqueur</b> jusqu'au terrain. Glissez ailleurs pour déplacer la carte,
               la roulette pour zoomer.`
        }</span>
      </p>

      <button type="button" class="gh-btn gh-btn--sm carte-pointee__poser" data-carte-poser>
        ${svgIcon("location", { className: "octicon" })} Poser le projet au centre
      </button>
    </div>
  `;
}

/**
 * Les gestes de la carte.
 *
 * @param {Element} racine où chercher la carte
 * @param {object} options
 * @param {string} options.nom l'identité passée au rendu
 * @param {Function} options.etat rend `{centre, point, zoom}` au moment du geste —
 *   une fonction et non un objet : l'écran redessine, et un objet capturé à la
 *   liaison porterait le centre d'il y a trois déplacements
 * @param {Function} options.quandDeplacee reçoit le nouveau centre
 * @param {Function} options.quandPointee reçoit le point posé
 * @param {Function} [options.quandZoomee] reçoit le nouveau zoom
 * @param {Function} [options.quandGeste] `true` quand un geste commence, `false`
 *   quand il finit. **À écouter** : un écran qui se redessine au milieu d'un
 *   glissement remplace le voile, et le geste meurt sur un nœud détaché — la
 *   carte reste alors immobile sous le doigt sans qu'on sache pourquoi. Une
 *   lecture différée qui rappelle son écran suffit à le provoquer.
 */
export function brancherLaCarteAPointer(racine, { nom, etat, quandDeplacee, quandPointee, quandZoomee, quandGeste } = {}) {
  const cle = String(nom ?? "");
  const voile = racine?.querySelector(`[data-carte-voile="${cle}"]`);
  const carte = racine?.querySelector(`[data-carte-pointee="${cle}"]`);
  if (!voile || !carte || voile.dataset.carteBranchee === "true") return;
  voile.dataset.carteBranchee = "true";

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
    const ou_ = pixelsDepuisLeCentre(centre, point, { zoom });
    if (!ou_) return false;

    const dx = vise.dx - ou_.dx;
    const dy = vise.dy - ou_.dy;
    return Math.abs(dx) <= PRISE_DU_MARQUEUR && dy <= PRISE_DU_MARQUEUR / 2 && dy >= -PRISE_DU_MARQUEUR * 1.6;
  };

  let depart = null;
  let aGlisse = false;
  /** Ce qu'on tire : le marqueur, ou la carte. Décidé à l'appui, tenu jusqu'au bout. */
  let tireLeMarqueur = false;
  let roulette = null;

  const relacher = () => {
    carte.style.removeProperty("--carte-glissement-x");
    carte.style.removeProperty("--carte-glissement-y");
    carte.classList.remove("est-tiree");
    carte.classList.remove("tire-le-marqueur");
    quandGeste?.(false);
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
    // L'écran est prévenu **dès l'appui** : c'est à partir de là qu'un rendu
    // détacherait le voile et tuerait le geste.
    quandGeste?.(true);
  });

  voile.addEventListener("pointermove", (evenement) => {
    if (!depart) return;
    const dx = evenement.clientX - depart.x;
    const dy = evenement.clientY - depart.y;
    if (!aGlisse && Math.hypot(dx, dy) < GLISSEMENT_MINIMAL) return;

    aGlisse = true;
    // La vue et les marqueurs suivent le doigt ; la vue se **repose** au
    // relâchement. Sans ce retour, on tire dans le vide et l'on croit que le
    // geste n'est pas pris.
    //
    // Quand on tire le marqueur, c'est **lui seul** qui bouge : déplacer la
    // carte avec lui ferait un endroit qui ne bouge pas, ce qui est exactement
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

    if (!glisse) return;

    const { centre, zoom } = ou();
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
  let zoomVise = null;

  voile.addEventListener("wheel", (evenement) => {
    evenement.preventDefault();

    const depuis = zoomBorne(ou().zoom);
    const pas = evenement.deltaY < 0 ? 1 : -1;
    // Les crans **s'accumulent** : sans cette mémoire, chaque cran repartirait du
    // zoom de l'état — qui n'a pas encore bougé —, et douze crans en feraient un.
    zoomVise = zoomBorne((zoomVise ?? depuis) + pas);

    // Le retour est immédiat, même si la vue arrive après : la vue déjà chargée
    // est agrandie le temps qu'on redemande la bonne. Sans cela, on tourne la
    // roulette et rien ne bouge pendant un quart de seconde.
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
      const { zoom } = ou();
      const pas = bouton.getAttribute("data-carte-zoom") === "+" ? 1 : -1;
      quandZoomee?.(zoomBorne(zoomBorne(zoom) + pas));
    });
  }

  carte.querySelector("[data-carte-poser]")?.addEventListener("click", () => {
    const { centre } = ou();
    if (centre) quandPointee?.({ latitude: centre.latitude, longitude: centre.longitude });
  });
}
