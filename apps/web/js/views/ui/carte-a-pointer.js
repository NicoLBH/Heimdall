/**
 * La carte qu'on déplace, et le point qu'on y pose.
 *
 * ## Ce qu'elle sert à faire
 *
 * Situer un projet **qui n'a pas d'adresse**. On tape la commune, on arrive
 * au-dessus du bourg, et l'on se déplace jusqu'à reconnaître le terrain sur la
 * vue satellite — la haie, le chemin, la forme de la parcelle. Puis on pose le
 * point : appui long à l'endroit exact, ou bouton qui prend le centre du
 * viseur.
 *
 * ## Pourquoi un voile par-dessus la carte
 *
 * La vue satellite est servie dans une `iframe` : on ne peut ni lui demander où
 * elle est centrée, ni écouter ses clics. On pose donc un voile transparent
 * par-dessus, on écoute les gestes **dessus**, et l'on recalcule le centre
 * nous-mêmes — `services/carte-pointee.js` fait les mathématiques.
 *
 * La conséquence est visible et assumée : la carte ne glisse pas sous le doigt.
 * Elle se **repose** au relâchement, parce qu'un `iframe` se recharge à chaque
 * changement de centre et qu'un rechargement par pixel donnerait un clignotement
 * continu. Le voile, lui, suit le doigt : on voit où l'on va pendant qu'on tire.
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

/** Le temps d'un appui long. En deçà, c'est un clic, et l'on ne pose rien. */
const APPUI_LONG = 500;

/** En deçà, un déplacement du doigt n'est pas un glissement : c'est un tremblement. */
const GLISSEMENT_MINIMAL = 6;

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
  nom, centre = null, point = null, zoom = 14,
  embedUrl = "", chargement = false, hauteur = "420px"
} = {}) {
  const cle = escapeHtml(String(nom ?? ""));
  const niveau = zoomBorne(zoom);

  // Le marqueur se dessine **où il est**, pas au milieu de l'écran : c'est ce
  // qui permet de s'éloigner pour se resituer sans croire que le projet suit.
  const decalage = pixelsDepuisLeCentre(centre, point, { zoom: niveau });
  const memeQueLeCentre = decalage && Math.abs(decalage.dx) < 0.5 && Math.abs(decalage.dy) < 0.5;

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
          ${svgIcon("plus", { className: "octicon" })}
        </div>
        ${
          decalage && !memeQueLeCentre
            ? `<div class="carte-pointee__marqueur" aria-hidden="true"
                 style="transform:translate(calc(-50% + ${decalage.dx.toFixed(1)}px), calc(-100% + ${decalage.dy.toFixed(1)}px));">
                 ${svgIcon("location", { className: "octicon" })}
               </div>`
            : ""
        }
        ${
          memeQueLeCentre
            ? `<div class="carte-pointee__marqueur carte-pointee__marqueur--centre" aria-hidden="true">
                 ${svgIcon("location", { className: "octicon" })}
               </div>`
            : ""
        }
      </div>

      <div class="carte-pointee__zoom">
        <button type="button" class="gh-btn gh-btn--sm" data-carte-zoom="+"
          ${niveau >= ZOOM_MAX ? "disabled" : ""} aria-label="Zoomer">+</button>
        <button type="button" class="gh-btn gh-btn--sm" data-carte-zoom="-"
          ${niveau <= ZOOM_MIN ? "disabled" : ""} aria-label="Dézoomer">−</button>
      </div>

      <p class="carte-pointee__mode">
        ${svgIcon("beaker", { className: "octicon" })}
        <!-- La phrase dans un span : sans lui, chaque nœud devient un élément
             de la boîte flexible, et « appuyez longuement » se retrouve dans sa
             propre colonne au milieu du reste. -->
        <span>Déplacez la carte, puis <b>appuyez longuement</b> sur le terrain — ou posez le
        projet au centre du viseur.</span>
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
 */
export function brancherLaCarteAPointer(racine, { nom, etat, quandDeplacee, quandPointee, quandZoomee } = {}) {
  const cle = String(nom ?? "");
  const voile = racine?.querySelector(`[data-carte-voile="${cle}"]`);
  const carte = racine?.querySelector(`[data-carte-pointee="${cle}"]`);
  if (!voile || !carte || voile.dataset.carteBranchee === "true") return;
  voile.dataset.carteBranchee = "true";

  const ou = () => (typeof etat === "function" ? etat() : {}) ?? {};

  let depart = null;
  let minuterie = null;
  let aGlisse = false;

  const relacher = () => {
    if (minuterie) { clearTimeout(minuterie); minuterie = null; }
    voile.style.removeProperty("--carte-glissement-x");
    voile.style.removeProperty("--carte-glissement-y");
    voile.classList.remove("est-tiree");
  };

  voile.addEventListener("pointerdown", (evenement) => {
    // Le bouton du milieu et le clic droit ne déplacent rien : ils ouvrent des
    // menus, et les capturer les casserait sans rien apporter.
    if (evenement.button !== 0) return;
    evenement.preventDefault();
    voile.setPointerCapture(evenement.pointerId);

    const cadre = voile.getBoundingClientRect();
    depart = {
      x: evenement.clientX, y: evenement.clientY,
      // Le point visé, dans le repère du voile : c'est là que l'appui long
      // posera le projet, et non au centre.
      dx: evenement.clientX - (cadre.left + cadre.width / 2),
      dy: evenement.clientY - (cadre.top + cadre.height / 2)
    };
    aGlisse = false;

    minuterie = setTimeout(() => {
      minuterie = null;
      // Un appui long qui a glissé est un glissement lent, pas un appui : poser
      // le projet là ferait sauter le marqueur au milieu d'un déplacement.
      if (aGlisse || !depart) return;

      const { centre, zoom } = ou();
      const pose = pointADistance(centre, { dx: depart.dx, dy: depart.dy, zoom });
      if (pose) {
        depart = null;
        relacher();
        quandPointee?.(pose);
      }
    }, APPUI_LONG);
  });

  voile.addEventListener("pointermove", (evenement) => {
    if (!depart) return;
    const dx = evenement.clientX - depart.x;
    const dy = evenement.clientY - depart.y;
    if (!aGlisse && Math.hypot(dx, dy) < GLISSEMENT_MINIMAL) return;

    aGlisse = true;
    if (minuterie) { clearTimeout(minuterie); minuterie = null; }
    // Le voile suit le doigt pendant qu'on tire : la carte, elle, se repose au
    // relâchement. Sans ce retour, on ne sait pas si le geste est pris.
    voile.classList.add("est-tiree");
    voile.style.setProperty("--carte-glissement-x", `${dx}px`);
    voile.style.setProperty("--carte-glissement-y", `${dy}px`);
  });

  const finir = (evenement) => {
    if (!depart) { relacher(); return; }

    const dx = evenement.clientX - depart.x;
    const dy = evenement.clientY - depart.y;
    const glisse = aGlisse;
    depart = null;
    relacher();

    if (!glisse) return;

    const { centre, zoom } = ou();
    const nouveau = centreApresGlissement(centre, { dx, dy, zoom });
    if (nouveau) quandDeplacee?.(nouveau);
  };

  voile.addEventListener("pointerup", finir);
  voile.addEventListener("pointercancel", () => { depart = null; relacher(); });

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
