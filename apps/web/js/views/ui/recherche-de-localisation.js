/**
 * « Où est ce projet, exactement ? » — la fenêtre qui répond quand le champ ne suffit pas.
 *
 * ## Le cas qu'elle couvre
 *
 * Le champ d'adresse suffit tant que le projet a une adresse. Il n'en a pas
 * toujours : un terrain qui n'est pas construit n'a ni rue ni numéro, et l'on ne
 * connaît que la commune. Il arrive aussi que l'adresse existe mais ne désigne
 * pas le bon endroit — une entrée de lotissement, un siège social, une parcelle
 * à cinq cents mètres de la boîte aux lettres.
 *
 * Dans les deux cas, ce qui situe le projet est un **point** qu'on reconnaît sur
 * une vue satellite. Cette fenêtre met les deux gestes côte à côte : on cherche
 * grossièrement, puis on pointe précisément.
 *
 * ## Ce qu'elle rend
 *
 * Une localisation complète — commune, code INSEE, code postal, adresse quand il
 * y en a une, et le point —, ou `null` si l'on renonce. Elle **n'écrit rien** :
 * l'écran qui l'a ouverte décide ce qu'il en fait, et la mémoire n'apprend que
 * par une proposition (`docs/fondamentaux.md`, règle 1).
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSaisieAdresse, brancherLaSaisieDAdresse } from "./saisie-adresse.js";
import { creerLaCarteAPointer, brancherLaCarteAPointer, majCarteAPointer } from "./carte-a-pointer.js";
import { renderSpinnerHtml } from "./spinner.js";
import {
  adresseEnUneLigne, localisationCalculable, localisationDeLAdresse, nombreOuRien
} from "../../services/adresse-saisie.js";
import { resolveFrenchCoordinates, fetchFrenchAltitude } from "../../services/georisques-service.js";
import { fetchGoogleMapsPlaceEmbedUrl } from "../../services/google-maps-embed-service.js";
import { ZOOM_COMMUNE, ZOOM_PARCELLE, zoomBorne } from "../../services/carte-pointee.js";
import { pointDit } from "../../services/localisation-versement.js";
import { deplacementEntre, MOUVEMENT } from "../../services/localisation-mouvement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le nom des deux composants, dans cette fenêtre. */
const SAISIE = "rechercheLocalisation";
const CARTE = "rechercheLocalisation";

/** La fenêtre déjà posée, s'il y en a une. Deux superposées ne se distinguent pas. */
let fenetreOuverte = null;

/**
 * La coquille, dessinée **une seule fois**.
 *
 * Tout ce qui change vit dans les deux zones qu'elle réserve. La carte, elle,
 * est un nœud gardé qu'on rattache une fois : réécrire ce qui l'entoure la
 * détacherait, et un navigateur qui réinsère une vue satellite la recharge
 * depuis zéro — c'est la page blanche qu'on veut faire disparaître.
 */
function renderCoquille() {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Recherche de localisation">
      <div class="fichiers-saisie__boite recherche-localisation">
        <header class="fichiers-saisie__tete">
          <b>${svgIcon("location", { className: "octicon" })} <span>Où est ce projet, exactement ?</span></b>
          <button type="button" class="fichiers-saisie__fermer" data-recherche-annuler
            aria-label="Renoncer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <div data-recherche-haut></div>

        <div data-recherche-carte></div>

        <div class="recherche-localisation__retenue" data-recherche-bas></div>

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-recherche-annuler>Annuler</button>
          <button type="button" class="gh-btn gh-btn--primary" data-recherche-retenir disabled>
            Retenir cette localisation
          </button>
        </footer>
      </div>
    </div>
  `;
}

/** Le champ d'adresse, et ce qui a échoué. Redessinés à chaque changement. */
function renderHaut({ retenue, depart, echec, occupee }) {
  return `
    ${renderSaisieAdresse({
      nom: SAISIE, label: "",
      valeur: adresseEnUneLigne(retenue ?? depart),
      placeholder: "Une adresse, ou seulement la commune…",
      desactive: occupee
    })}
    ${echec ? `<p class="recherche-localisation__echec">${escapeHtml(echec)}</p>` : ""}
  `;
}

/** Ce qui est retenu pour l'instant, et de combien le projet s'est déplacé. */
function renderBas({ depart, retenue, occupee }) {
  const bouge = depart && retenue ? deplacementEntre(depart, retenue) : null;

  return `
    ${
      occupee
        ? `<span>${renderSpinnerHtml({ label: "Recherche", size: "sm" })} Recherche de la commune…</span>`
        : retenue
          ? `<span><b>${escapeHtml(texte(retenue.city) || "commune inconnue")}</b>
               ${texte(retenue.codeInsee) ? `· INSEE ${escapeHtml(retenue.codeInsee)}` : ""}
               ${texte(retenue.address) ? `· ${escapeHtml(retenue.address)}` : ""}
               ${pointDit(retenue) ? `· ${escapeHtml(pointDit(retenue))}` : ""}</span>`
          : `<span class="recherche-localisation__vide">Rien de retenu pour l'instant.</span>`
    }
    ${
      // Ce qui a bougé, et de combien. Un projet peut se déplacer de cent
      // mètres sans changer de commune — c'est un versant, donc une altitude,
      // donc une cote hors gel.
      bouge && bouge.mouvement !== MOUVEMENT.AUCUN
        ? `<span class="recherche-localisation__bouge">${escapeHtml(bouge.phrase)}</span>`
        : ""
    }
  `;
}

/**
 * Ouvrir la recherche, et attendre ce qu'elle rend.
 *
 * @param {object} options
 * @param {object|null} [options.depart] la localisation d'aujourd'hui, pour
 *   partir de là et dire de combien on s'en éloigne
 * @returns {Promise<object|null>} la localisation retenue, ou `null`
 */
export async function chercherUneLocalisation({ depart = null } = {}) {
  if (fenetreOuverte) return null;

  const etat = {
    depart,
    retenue: depart && localisationCalculable(depart) ? { ...depart } : null,
    centre: pointDe(depart),
    zoom: pointDe(depart) ? ZOOM_PARCELLE : ZOOM_COMMUNE,
    mapUrl: "", mapCle: "", echec: "", occupee: false
  };

  return new Promise((resoudre) => {
    const hote = document.createElement("div");
    document.body.appendChild(hote);
    fenetreOuverte = hote;

    const fermer = (reponse) => {
      document.removeEventListener("keydown", auClavier);
      hote.remove();
      fenetreOuverte = null;
      resoudre(reponse);
    };

    function auClavier(evenement) {
      if (evenement.key === "Escape") fermer(null);
    }
    document.addEventListener("keydown", auClavier);

    // La coquille, une fois. Ce qui change est repeint zone par zone : réécrire
    // la fenêtre entière détacherait la carte, et sa vue se rechargerait.
    hote.innerHTML = renderCoquille();

    for (const bouton of hote.querySelectorAll("[data-recherche-annuler]")) {
      bouton.addEventListener("click", () => fermer(null));
    }
    hote.querySelector("[data-recherche-retenir]")
      ?.addEventListener("click", () => fermer(etat.retenue));

    const carte = creerLaCarteAPointer({ nom: CARTE, hauteur: "380px" });
    hote.querySelector("[data-recherche-carte]")?.appendChild(carte);
    brancherLaCarteAPointer(carte, {
      etat: () => ({ centre: etat.centre, point: pointDe(etat.retenue), zoom: etat.zoom }),
      quandDeplacee: (centre) => { etat.centre = centre; void rafraichirLaCarte(etat, dessiner); },
      quandZoomee: (zoom) => { etat.zoom = zoomBorne(zoom); void rafraichirLaCarte(etat, dessiner); },
      quandPointee: (point) => { void poser(etat, point, dessiner); }
    });

    const dessiner = () => {
      const haut = hote.querySelector("[data-recherche-haut]");
      if (haut) {
        haut.innerHTML = renderHaut(etat);
        brancherLaSaisieDAdresse(haut, {
          nom: SAISIE,
          quandChoisie: (localisation) => {
            etat.retenue = localisation;
            etat.echec = "";
            etat.centre = pointDe(localisation) ?? etat.centre;
            // Le bourg quand on n'a tapé qu'une commune, la parcelle quand
            // l'adresse en portait une : chercher son terrain à l'échelle du
            // département ne se fait pas.
            etat.zoom = texte(localisation?.address) ? ZOOM_PARCELLE : ZOOM_COMMUNE;
            dessiner();
            void rafraichirLaCarte(etat, dessiner);
          },
          quandEchoue: (motif) => { etat.echec = motif; dessiner(); }
        });
      }

      const bas = hote.querySelector("[data-recherche-bas]");
      if (bas) bas.innerHTML = renderBas(etat);

      const retenir = hote.querySelector("[data-recherche-retenir]");
      if (retenir) {
        retenir.disabled = !(etat.retenue && localisationCalculable(etat.retenue) && !etat.occupee);
      }

      majCarteAPointer(carte, {
        centre: etat.centre, point: pointDe(etat.retenue), zoom: etat.zoom, embedUrl: etat.mapUrl
      });
    };

    dessiner();
    void rafraichirLaCarte(etat, dessiner);
  });
}

/** Le point d'une localisation, ou `null`. */
function pointDe(localisation = null) {
  const latitude = nombreOuRien(localisation?.latitude);
  const longitude = nombreOuRien(localisation?.longitude);
  return latitude === null || longitude === null ? null : { latitude, longitude };
}

/**
 * Poser le projet là où l'on vient d'appuyer.
 *
 * Le service d'adresses rend la commune **à l'envers**, depuis les coordonnées :
 * c'est ce qui donne un code INSEE à un projet qui n'a pas d'adresse. Il ne rend
 * pas d'adresse — celle du voisin n'est pas celle du projet (règle 5).
 */
async function poser(etat, point, dessiner) {
  etat.retenue = { ...(etat.retenue ?? {}), ...point, address: "" };
  etat.occupee = true;
  etat.echec = "";
  dessiner();

  try {
    const commune = localisationDeLAdresse(await resolveFrenchCoordinates(point));
    let altitude = null;
    try {
      const releve = await fetchFrenchAltitude(point);
      altitude = nombreOuRien(releve?.altitude ?? releve);
    } catch {
      altitude = null;
    }
    etat.retenue = { ...commune, ...point, altitude };
  } catch (erreur) {
    etat.echec = erreur instanceof Error ? erreur.message : String(erreur);
  } finally {
    etat.occupee = false;
    dessiner();
  }
}

/** La vue satellite du centre courant. Rien à redemander si c'est déjà elle. */
async function rafraichirLaCarte(etat, dessiner) {
  const latitude = nombreOuRien(etat.centre?.latitude);
  const longitude = nombreOuRien(etat.centre?.longitude);
  if (latitude === null || longitude === null) return;

  const cle = `${latitude.toFixed(6)}|${longitude.toFixed(6)}|${etat.zoom}`;
  if (cle === etat.mapCle) return;
  etat.mapCle = cle;

  // Le marqueur bouge tout de suite, la vue arrive après ; la précédente reste
  // affichée pendant ce temps. La remplacer par un vide est exactement ce qui
  // faisait clignoter la carte.
  dessiner();

  try {
    const vue = await fetchGoogleMapsPlaceEmbedUrl({ latitude, longitude, zoom: etat.zoom, mapType: "satellite" });
    // Le centre a pu changer pendant l'attente : la vue qui arrive porte alors
    // sur un endroit qu'on ne regarde plus, et l'afficher ferait sauter la carte.
    if (cle !== etat.mapCle) return;
    etat.mapUrl = vue;
  } catch {
    etat.mapUrl = "";
    // La clé s'oublie : sans cela, une panne figerait la carte sur le dernier
    // endroit qui a répondu, et se déplacer ne ferait plus rien.
    etat.mapCle = "";
  } finally {
    dessiner();
  }
}
