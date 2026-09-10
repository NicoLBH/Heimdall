/**
 * Ce qu'on dit à quelqu'un **avant** que sa modification parte en proposition.
 *
 * ## Pourquoi cet avertissement existe
 *
 * Trois écrans modifient une chose que la mémoire devra apprendre — la
 * localisation du projet, son découpage en zones, les charges climatiques — et
 * les trois s'y prenaient différemment :
 *
 * | l'écran | ce que faisait le clic |
 * | --- | --- |
 * | Paramètres > Localisation | « Valider » rangeait dans la fiche ; un **second** bouton proposait |
 * | Paramètres > Découpage | « Ajouter » partait **directement** sur une proposition, sans prévenir |
 * | Atelier > Neige, Vent & Gel | « Transformer » ouvrait la proposition **et quittait l'écran** |
 *
 * Trois gestes pour un même acte, dont deux ne disaient pas ce qu'ils faisaient.
 * Le troisième le disait en emmenant ailleurs, ce qui fait perdre le fil de ce
 * qu'on était en train de régler.
 *
 * ## Ce que l'avertissement doit dire, et rien de plus
 *
 * Deux choses, et elles sont l'application directe de la règle 1 —
 * *rien n'entre jamais directement dans la mémoire* :
 *
 * 1. **ce qui va être proposé**, ligne par ligne, avec ce que la mémoire dit
 *    aujourd'hui en regard. C'est là que quelqu'un voit qu'il change six choses
 *    en croyant en changer une ;
 * 2. **que rien ne sera effectif avant la fusion.** Une proposition ouverte n'est
 *    pas un enregistrement : tant que personne ne l'a signée, le projet continue
 *    de valoir ce qu'il valait.
 *
 * Ce fichier tient la part qui ne parle à personne : ce qu'on montre, comment on
 * le compte, et où le lot peut aller. La fenêtre est dans
 * `views/ui/avertissement-proposition.js`.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Où un lot peut aller. Il n'y a que deux destinations, et elles s'excluent. */
export const DESTINATION = {
  /** Une proposition qui n'existe pas encore. */
  NEUVE: "neuve",
  /** Une proposition déjà ouverte, qu'on enrichit. */
  BRANCHE: "branche"
};

/**
 * Les lignes du lot, telles que la fenêtre les montre.
 *
 * Le sujet, ce qu'on propose, et **ce que la mémoire dit aujourd'hui** quand on
 * le sait. Sans la colonne de gauche, on lit une liste de valeurs sans savoir
 * lesquelles bougent — et c'est précisément la question qu'on se pose devant un
 * avertissement.
 *
 * Ce qu'on ne sait pas reste vide : une ligne dont on n'a pas trouvé l'état
 * actuel ne se voit pas offrir un « — » qui se lirait « il n'y avait rien »
 * (règle 5). L'absence se dit par `aujourdhui: null`.
 */
export function lignesDuLot(affirmations = [], memoire = null) {
  const parSujet = new Map();
  for (const assertion of Array.isArray(memoire) ? memoire : []) {
    if (texte(assertion?.superseded_by)) continue;
    const sujet = texte(assertion?.payload?.subject);
    if (sujet && !parSujet.has(sujet)) parSujet.set(sujet, texte(assertion?.payload?.value));
  }

  const connue = Array.isArray(memoire);

  return (Array.isArray(affirmations) ? affirmations : [])
    .filter(Boolean)
    .map((affirmation) => {
      const sujet = texte(affirmation.sujet ?? affirmation.subject);
      const propose = texte(affirmation.valeur ?? affirmation.value);
      // `null` quand on n'a pas pu lire la mémoire, `""` quand on l'a lue et
      // que ce sujet n'y est pas : « nouveau » et « on ne sait pas » ne se
      // disent pas de la même façon.
      const aujourdhui = connue ? (parSujet.get(sujet) ?? "") : null;

      return {
        sujet,
        propose,
        aujourdhui,
        nouveau: aujourdhui === "",
        bouge: typeof aujourdhui === "string" && aujourdhui !== "" && aujourdhui !== propose
      };
    })
    .filter((ligne) => ligne.sujet);
}

/**
 * Combien de lignes bougent, combien sont nouvelles, combien ne changent rien.
 *
 * C'est ce compte qui fait la première phrase de la fenêtre. « 8 lignes » ne dit
 * rien ; « 3 valeurs changent, 5 arrivent » se lit et se décide.
 */
export function compteDuLot(lignes = []) {
  const dites = Array.isArray(lignes) ? lignes : [];
  return {
    total: dites.length,
    bougent: dites.filter((ligne) => ligne.bouge).length,
    nouvelles: dites.filter((ligne) => ligne.nouveau).length,
    // Ni nouvelle ni changée : la proposition la portera quand même — c'est ce
    // qui permet de tout rejouer —, mais elle ne change rien.
    inchangees: dites.filter((ligne) => !ligne.bouge && !ligne.nouveau).length
  };
}

/**
 * La phrase du compte, accordée.
 *
 * Écrite ici plutôt qu'à l'écran : trois écrans posent la fenêtre, et trois
 * phrases écrites trois fois finiraient par ne plus dire la même chose (règle 4).
 */
export function phraseDuLot(compte = {}) {
  const bougent = Number(compte?.bougent || 0);
  const nouvelles = Number(compte?.nouvelles || 0);

  const morceaux = [];
  if (bougent) morceaux.push(`${bougent} ${bougent > 1 ? "valeurs changent" : "valeur change"}`);
  if (nouvelles) morceaux.push(`${nouvelles} ${nouvelles > 1 ? "arrivent" : "arrive"}`);

  if (!morceaux.length) {
    const total = Number(compte?.total || 0);
    return total
      ? `${total} ${total > 1 ? "lignes seront portées" : "ligne sera portée"}, et aucune ne change ce que le projet dit aujourd'hui.`
      : "Rien à proposer.";
  }

  return `${morceaux.join(" et ")}.`;
}

/**
 * La destination retenue, à partir de ce que la fenêtre a rendu.
 *
 * Un identifiant vide **est** le choix « nouvelle proposition » : c'est aussi ce
 * qu'attend `preparerUneProposition`, qui ouvre quand on ne lui donne rien. Une
 * seconde convention ici obligerait à traduire à chaque appel.
 */
export function destinationRetenue(choix = "") {
  const dit = texte(choix);
  return dit && dit !== DESTINATION.NEUVE
    ? { destination: DESTINATION.BRANCHE, propositionId: dit }
    : { destination: DESTINATION.NEUVE, propositionId: "" };
}
