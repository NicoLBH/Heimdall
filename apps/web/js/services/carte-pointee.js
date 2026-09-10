/**
 * Pointer un projet sur une carte, quand il n'a pas d'adresse.
 *
 * ## Le cas qu'aucun champ ne couvrait
 *
 * Un projet qui n'est pas construit n'a pas d'adresse. On connaît la commune, et
 * le terrain est « dans un champ, au milieu de nulle part ». Le champ d'adresse
 * ne peut rien pour lui : il n'y a rien à taper. Ce qui le situe est un point
 * qu'on va **reconnaître** sur une vue satellite — la haie, le chemin, la forme
 * de la parcelle — et qu'on pose du doigt.
 *
 * ## Pourquoi ce calcul, et pas une bibliothèque de cartes
 *
 * La carte est une vue satellite servie dans une `iframe` : on ne peut ni lui
 * demander son centre, ni écouter ses clics. Ce qu'on peut faire, c'est
 * **poser un voile transparent par-dessus**, écouter les gestes dessus, et
 * recalculer nous-mêmes le centre à afficher. Il faut alors savoir ce qu'un
 * pixel vaut en mètres, et c'est tout ce que ce fichier sait.
 *
 * Une bibliothèque de cartes aurait apporté ses tuiles, son style, ses trois
 * cents kilo-octets et un deuxième fond de carte à côté de celui que
 * l'application emploie déjà partout.
 *
 * ## La formule
 *
 * Mercator est **conforme** : localement, un pixel vaut la même distance en
 * hauteur et en largeur. Cette distance dépend de la latitude — un pixel couvre
 * moins de terrain près des pôles —, d'où le cosinus.
 *
 *   mètres par pixel = 156 543,034 × cos(latitude) / 2^zoom
 *
 * Ce fichier ne parle à personne : des pixels entrent, des degrés sortent.
 */

import { nombreOuRien } from "./adresse-saisie.js";

/** La circonférence de la Terre divisée par 256 : un pixel au zoom 0, à l'équateur. */
const METRES_PAR_PIXEL_ZERO = 156_543.03392;

/** Un degré de latitude, en mètres. Il ne dépend pas de l'endroit. */
const METRES_PAR_DEGRE_LATITUDE = 110_540;

/** Un degré de longitude à l'équateur, en mètres. Il rétrécit vers les pôles. */
const METRES_PAR_DEGRE_LONGITUDE = 111_320;

/**
 * Les zooms qu'on offre.
 *
 * 5, c'est la France entière — utile pour se resituer quand on s'est perdu.
 * 20, c'est le mètre : au-delà, la vue satellite n'a plus de détail à montrer et
 * l'on zoome sur du flou en croyant gagner en précision.
 */
export const ZOOM_MIN = 5;
export const ZOOM_MAX = 20;

/** Le zoom d'arrivée sur une commune : on voit le bourg et ses abords. */
export const ZOOM_COMMUNE = 14;

/** Le zoom auquel on reconnaît une parcelle : haies, chemins, bâtiments. */
export const ZOOM_PARCELLE = 18;

const radians = (degres) => (degres * Math.PI) / 180;

/** Un zoom ramené dans ce qu'on sait afficher. */
export function zoomBorne(zoom) {
  const n = nombreOuRien(zoom);
  if (n === null) return ZOOM_COMMUNE;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n)));
}

/** Ce qu'un pixel de la carte vaut en mètres, à cette latitude et à ce zoom. */
export function metresParPixel(latitude, zoom) {
  const lat = nombreOuRien(latitude);
  if (lat === null) return null;
  return (METRES_PAR_PIXEL_ZERO * Math.cos(radians(lat))) / 2 ** zoomBorne(zoom);
}

/**
 * Le point qui se trouve à tant de pixels du centre.
 *
 * `dx` vers la droite, `dy` vers le bas — les axes de l'écran, pas ceux d'une
 * carte : c'est ce que rend un `pointerdown`, et le convertir chez l'appelant
 * ferait faire deux fois le même changement de repère.
 *
 * `null` si le centre n'en est pas un : sans latitude, un pixel ne vaut rien de
 * connu, et rendre le centre inchangé laisserait croire qu'on n'a pas bougé.
 */
export function pointADistance(centre = null, { dx = 0, dy = 0, zoom = ZOOM_COMMUNE } = {}) {
  const lat = nombreOuRien(centre?.latitude);
  const lon = nombreOuRien(centre?.longitude);
  if (lat === null || lon === null) return null;

  const mpp = metresParPixel(lat, zoom);
  const cos = Math.cos(radians(lat));
  // Sous les pôles, la longitude n'a plus de sens : un mètre y vaut des degrés
  // sans nombre. On refuse plutôt que de rendre l'infini.
  if (!Number.isFinite(mpp) || Math.abs(cos) < 1e-9) return null;

  return {
    // Vers le bas de l'écran, c'est vers le sud : la latitude décroît.
    latitude: lat - (dy * mpp) / METRES_PAR_DEGRE_LATITUDE,
    longitude: lon + (dx * mpp) / (METRES_PAR_DEGRE_LONGITUDE * cos)
  };
}

/**
 * Le centre après qu'on a **tiré** la carte de tant de pixels.
 *
 * Tirer la carte vers la droite fait aller le centre vers la **gauche** : on
 * déplace ce qu'on regarde, pas le point de vue. Confondre les deux donne une
 * carte qui part dans le sens inverse du doigt, et l'on croit que c'est cassé.
 */
export function centreApresGlissement(centre = null, { dx = 0, dy = 0, zoom = ZOOM_COMMUNE } = {}) {
  return pointADistance(centre, { dx: -dx, dy: -dy, zoom });
}

/**
 * De combien de pixels un point est-il décalé du centre, à ce zoom ?
 *
 * L'inverse de `pointADistance` : c'est ce qui permet de dessiner le marqueur
 * là où il est, plutôt qu'au milieu de l'écran quel que soit l'endroit qu'on
 * regarde. `null` quand il sort du cadre qu'on lui donne — un marqueur collé au
 * bord ferait croire que le projet est là.
 */
export function pixelsDepuisLeCentre(centre = null, point = null, { zoom = ZOOM_COMMUNE, largeur = 0, hauteur = 0 } = {}) {
  const latCentre = nombreOuRien(centre?.latitude);
  const lonCentre = nombreOuRien(centre?.longitude);
  const lat = nombreOuRien(point?.latitude);
  const lon = nombreOuRien(point?.longitude);
  if (latCentre === null || lonCentre === null || lat === null || lon === null) return null;

  const mpp = metresParPixel(latCentre, zoom);
  const cos = Math.cos(radians(latCentre));
  if (!Number.isFinite(mpp) || mpp === 0 || Math.abs(cos) < 1e-9) return null;

  const dx = ((lon - lonCentre) * METRES_PAR_DEGRE_LONGITUDE * cos) / mpp;
  const dy = ((latCentre - lat) * METRES_PAR_DEGRE_LATITUDE) / mpp;

  if (largeur > 0 && Math.abs(dx) > largeur / 2) return null;
  if (hauteur > 0 && Math.abs(dy) > hauteur / 2) return null;

  return { dx, dy };
}
