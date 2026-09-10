/**
 * Zone de sismicité, déduite de la commune via Géorisques.
 *
 * C'est la seule donnée de Géorisques dont la portée communale n'est **pas** une
 * approximation : le zonage sismique est réglementairement communal (décret
 * 2010-1255). Répondre « pour la commune » est ici la bonne réponse, et non un
 * défaut de précision — d'où la réserve `PORTEE_COMMUNALE`, qui informe sans
 * accuser.
 *
 * C'est aussi ce qui la sépare d'un PPRi, qu'on ne déduit pas : « un PPRi existe
 * sur cette commune » ne dit rien de votre parcelle, alors que « la commune est
 * en zone 4 » dit tout du projet qui s'y trouve.
 *
 * **La zone ne fait que la moitié de la règle.** L'accélération à retenir dépend
 * aussi de la catégorie d'importance de l'ouvrage, que l'adresse ignore. La zone
 * est donc versée seule, et ce qui en découle attend qu'on demande la catégorie.
 *
 * ## Lire une réponse dont la forme n'est pas garantie
 *
 * Géorisques ne publie pas de schéma stable. On cherche une **colonne** dont le
 * nom parle de zone et dont la valeur est un chiffre de 1 à 5, puis un libellé.
 * Si rien ne correspond, on ne rend rien : une zone inventée serait pire qu'une
 * zone absente.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT } from "./vocabulaire.js";
import { RESERVE } from "./reserves.js";
import { lecturesDeclarees } from "./lecture-fait.js";
import { valeurParColonne } from "./lecture-tabulaire.js";
import { LIT_LA_LOCALISATION } from "./agents-climatiques.js";

const COLONNE_ZONE = /(zone(_?sismi\w*)?|code_?zone|niveau_?zone)/i;
const COLONNE_LIBELLE = /(libelle|label|intitule|niveau|qualification)/i;

/** Le chiffre de zone, de 1 à 5, ou `""`. Jamais un autre nombre de la réponse. */
function numeroDeZone(valeur = "") {
  const trouve = String(valeur).match(/(?:^|\b)([1-5])(?:\b|\s*-)/);
  return trouve ? trouve[1] : "";
}

export const DEDUCTION_ZONE_SISMIQUE_GEORISQUES_V1 = {
  nom: "deduction_zone_sismique_georisques",
  version: "V1",
  libelle: "Zone de sismicité d'après la commune",
  source: "Géorisques · décret 2010-1255",
  produit: PRODUIT.CONTRAINTE,
  sujet: "Zone de sismicité",
  domaine: DOMAIN.STRUCTURE,
  cleDonnee: "seismic_zone",

  /**
   * Elle lit la commune, et elle le dit.
   *
   * Sans cette ligne, changer la localisation laissait la zone de sismicité
   * hors de la chaîne, sans un mot — comme si rien n'en dépendait. Or tout en
   * dépend : c'est la commune, et rien d'autre, qui décide de la zone.
   *
   * Elle ne sait pas se rejouer pour autant : sa valeur vient de Géorisques, et
   * il n'y a pas de `rejeu` à déclarer ici. Elle apparaîtra donc à revérifier,
   * en disant pourquoi. C'est la règle 5 : ne pas savoir rejouer n'autorise pas
   * à prétendre que rien ne dépend de la commune.
   *
   * **La déclaration partagée**, et non sa copie. Elle la recopiait, et la copie
   * avait perdu `champ: "codeInsee"` : quand la localisation varie par ses
   * quatre colonnes à la fois, cette lecture-ci ne savait plus laquelle elle
   * lit, et prenait la première venue — le nom de la commune dans le champ du
   * code INSEE. C'est le défaut même que `champ` existe pour empêcher, revenu
   * par une recopie (règle 4).
   */
  lit: [
    {
      ...LIT_LA_LOCALISATION,
      lire: (fait) => fait?.fact_value?.inputs?.code_insee ?? fait?.fact_value?.codeInsee
    }
  ],

  deduire(fait = {}) {
    const valeurConservee = String(fait?.fact_value?.value ?? "").trim();
    const brut = fait?.fact_value?.data ?? fait?.fact_value?.raw ?? null;

    const zone = valeurConservee
      ? numeroDeZone(valeurConservee)
      : numeroDeZone(valeurParColonne(brut, COLONNE_ZONE, (v) => Boolean(numeroDeZone(v))));

    if (!zone) return null;

    const libelle = valeurConservee.replace(/^\s*\d\s*[-–—]?\s*/, "").trim()
      || valeurParColonne(brut, COLONNE_LIBELLE, (v) => v.length > 1);

    return {
      valeur: libelle ? `${zone} — ${libelle}` : zone,
      entrees: {
        codeInsee: fait?.fact_value?.codeInsee ?? null,
        commune: fait?.fact_value?.commune ?? null
      },
      lectures: lecturesDeclarees(DEDUCTION_ZONE_SISMIQUE_GEORISQUES_V1, fait),
      reserves: [RESERVE.PORTEE_COMMUNALE]
    };
  }
};
