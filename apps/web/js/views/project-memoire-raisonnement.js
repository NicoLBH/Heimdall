/**
 * L'espace de raisonnement : un poste de travail, pas un panneau.
 *
 * ## Ce qu'il remplace
 *
 * Deux fenêtres côte à côte — le code à gauche, les valeurs à droite — chacune
 * avec son ascenseur. Elles se lisaient ligne à ligne, ce qui est exactement ce
 * qu'il faut pour vérifier une condition, et **rien ne garantissait qu'elles
 * restent alignées** : une ligne qui repliait à droite et pas à gauche décalait
 * tout le reste, et l'on comparait la condition d'une ligne à la valeur d'une
 * autre sans le voir. Une erreur de lecture silencieuse, dans l'écran dont le
 * seul travail est de rendre le raisonnement vérifiable.
 *
 * Le code et les valeurs sont donc **une seule grille**. Le décalage n'est plus
 * improbable, il est impossible : c'est la même rangée.
 *
 * ## Sa forme
 *
 * ```
 * ┌───────────────────────────────────────────────┬──────────┐
 * │  le schéma des dépendances                    │          │
 * ├───────────────────────────────────────────────│ la       │
 * │  ce que le projet dit  │ n° │  le raisonnement │ discussion│
 * └───────────────────────────────────────────────┴──────────┘
 * ```
 *
 * Les valeurs sont **à gauche**, le code à droite : on lit d'abord ce que le
 * projet dit, puis pourquoi. L'inverse obligeait à traverser cent caractères de
 * code avant d'atteindre la valeur qu'on était venu vérifier.
 *
 * Les numéros de ligne sont **au milieu**. Ils séparent les deux lectures, et
 * ce sont eux qu'on saisit pour changer le partage : la frontière est là où
 * elle se voit.
 *
 * Les valeurs et les numéros restent **collés à gauche** pendant qu'on fait
 * défiler le code. Une citation d'arrêté fait mille pixels de large ; sans
 * cela, la lire emportait les valeurs hors de l'écran, et l'on se retrouvait
 * devant du code sans savoir ce qu'il vaut — c'est-à-dire devant la moitié de
 * ce qu'on était venu voir.
 *
 * La discussion prend toute la hauteur, schéma compris : elle porte un fil de
 * messages, et une colonne haute de la moitié de l'écran n'en montre que deux.
 *
 * Le schéma commande le code : cliquer une carte y fait défiler jusqu'à la
 * fonction. C'est le geste qu'on fait vingt fois — « et celle-là, elle a lu
 * quoi ? » — et le faire à la molette sur cent lignes fait perdre le fil.
 *
 * ## Pourquoi une colonne pour le copilote
 *
 * Parce que la question qu'on se pose devant une chaîne fausse — « pourquoi
 * l'arrêté dit-il ça ? », « qu'est-ce qui change si la hauteur passe à 28 ? » —
 * n'a pas de réponse dans l'écran. Elle en avait une deux onglets plus loin,
 * dans l'Atelier, ce qui voulait dire perdre la chaîne pour aller la poser.
 *
 * C'est **le composant de l'Atelier**, monté ici : même fil, mêmes
 * discussions, même modèle. Une seconde salle de discussion aurait deux
 * historiques et deux comportements, et l'on ne saurait plus où l'on a posé
 * quoi.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";
import { dessinerGrapheLiaisons } from "./ui/graphe-liaisons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les bornes des zones qu'on peut tirer. En deçà, elles ne montrent plus rien. */
export const BORNES = {
  schema: { min: 160, max: 720, defaut: 300 },
  etat: { min: 220, max: 760, defaut: 380 },
  copilote: { min: 280, max: 620, defaut: 360 }
};

/** L'état d'un espace, à sa première ouverture. */
export function espaceParDefaut() {
  return {
    carte: null,
    survol: null,
    zoom: 1,
    pleinEcran: false,
    copiloteOuvert: false,
    hauteurSchema: BORNES.schema.defaut,
    largeurEtat: BORNES.etat.defaut,
    largeurCopilote: BORNES.copilote.defaut
  };
}

/**
 * Les jetons d'une ligne, colorés comme dans un fichier.
 *
 * Le même balisage que la Mémoire en lecture : `mdall-<type>`. Un second jeu de
 * classes donnerait deux façons de colorer le même langage, et la seconde
 * finirait par ne plus ressembler à la première.
 */
function renderJetons(jetons = [], paires = null) {
  return (jetons ?? [])
    .map((jeton, index) => {
      const teinte = paires?.get(index);
      const classes = `mdall-${escapeHtml(jeton.type)}${
        teinte === undefined ? "" : ` raison-paire raison-paire--${teinte}`}`;
      return `<span class="${classes}">${escapeHtml(jeton.texte)}</span>`;
    })
    .join("");
}

/** Ce que le projet dit d'une ligne, dit court. */
function renderEtat(entree) {
  if (!entree?.sujet) return "";
  if (entree.manquant) return `<span class="raison-grille__trou">personne ne l'a versée</span>`;

  return `<b>${escapeHtml(entree.valeur)}</b>${
    entree.zone ? `<span class="raison-grille__note">${escapeHtml(entree.zone)}</span>` : ""}${
    // Déduite, et non relevée : les confondre ferait prendre une conclusion de
    // règle pour un constat de terrain.
    entree.deduite ? `<span class="raison-grille__note">déduit</span>` : ""}`;
}

/**
 * Le code et les valeurs, en une grille.
 *
 * Trois cellules par rangée, dans l'ordre où l'œil les prend : le raisonnement,
 * son numéro, ce que le projet en dit. Un seul défilement horizontal pour les
 * trois — c'est le conteneur qui l'a, pas les colonnes.
 */
function renderGrille(lignes = [], trace = [], ancres = new Map()) {
  const paires = niveauxDesPaires(lignes);

  const rangees = lignes.map((ligne, rang) => {
    const dite = trace[rang] ?? {};
    const ancre = ancres.get(rang);

    // Les valeurs **à gauche**, le code à droite. On lit d'abord ce que le
    // projet dit, puis pourquoi : l'inverse obligeait à traverser cent
    // caractères de code avant d'atteindre la valeur qu'on était venu vérifier.
    return `
      <div class="raison-ligne${dite.manquant ? " raison-ligne--manquante" : ""}"
        ${ancre ? `data-raison-ancre="${escapeHtml(ancre)}"` : ""} data-raison-rang="${rang}">
        <span class="raison-ligne__etat">${renderEtat(dite)}</span>
        <span class="raison-ligne__num">${rang + 1}</span>
        <span class="raison-ligne__code">${renderJetons(ligne.jetons, paires.get(rang))}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="raison-grille">
      <div class="raison-ligne raison-ligne--tete">
        <span class="raison-ligne__etat">Ce que le projet dit aujourd'hui</span>
        <span class="raison-ligne__num raison-ligne__num--poignee" data-raison-poignee="etat"
          title="Tirez pour changer le partage" aria-label="Changer le partage entre les valeurs et le code">⋮</span>
        <span class="raison-ligne__code">Le raisonnement</span>
      </div>
      ${rangees}
    </div>
  `;
}

/** Ce qui ouvre un niveau, et ce qui le ferme. */
const OUVRANTS = new Set(["(", "[", "{"]);
const FERMANTS = new Set([")", "]", "}"]);

/** Combien de teintes tournent avant de se répéter. Au-delà, on ne distingue plus. */
const TEINTES_DE_PAIRE = 3;

/**
 * Le niveau d'imbrication de chaque borne, ligne par ligne.
 *
 * ## Pourquoi les colorer
 *
 * Une fonction Mdall imbrique trois niveaux — `si (…)`, `alors (`, `enregistre
 * (` — et se ferme sur trois lignes qui ne portent que `)`, `);`, `}`. Sans
 * couleur, retrouver quelle fermeture répond à quelle ouverture se fait en
 * comptant à voix basse, et l'on se trompe d'un cran une fois sur trois.
 *
 * La teinte tourne avec la profondeur, comme dans un éditeur de code : une
 * ouverture et sa fermeture portent la même, et deux niveaux voisins n'ont
 * jamais la même.
 *
 * Une fermeture orpheline — il y en a, dans un extrait de code — ne prend
 * aucune teinte plutôt qu'une fausse : mentir sur l'appariement est pire que de
 * ne rien dire.
 *
 * @returns {Map<number, Map<number, number>>} rang de ligne → index du jeton → teinte
 */
export function niveauxDesPaires(lignes = []) {
  const parLigne = new Map();
  const pile = [];
  let profondeur = 0;

  const marquer = (rang, index, teinte) => {
    if (!parLigne.has(rang)) parLigne.set(rang, new Map());
    parLigne.get(rang).set(index, teinte);
  };

  (Array.isArray(lignes) ? lignes : []).forEach((ligne, rang) => {
    (ligne?.jetons ?? []).forEach((jeton, index) => {
      const dit = texte(jeton?.texte);
      if (OUVRANTS.has(dit)) {
        const teinte = profondeur % TEINTES_DE_PAIRE;
        marquer(rang, index, teinte);
        pile.push(teinte);
        profondeur += 1;
        return;
      }
      if (!FERMANTS.has(dit) || pile.length === 0) return;
      marquer(rang, index, pile.pop());
      profondeur -= 1;
    });
  });

  return parLigne;
}

/**
 * L'espace entier.
 *
 * @param {object} options
 * @param {object} options.graphe les cartes et les liens
 * @param {object[]} options.lignes le code, ligne à ligne
 * @param {object[]} options.trace ce que le projet dit de chaque ligne
 * @param {Map<number,string>} options.ancres rang de ligne → carte du schéma
 * @param {string} options.resume la phrase de tête
 * @param {object} options.etat ce que l'écran garde entre deux rendus
 */
export function renderEspaceDuRaisonnement({
  graphe = { noeuds: [], liens: [] }, lignes = [], trace = [], ancres = new Map(),
  resume = "", etat = espaceParDefaut()
} = {}) {
  const style = [
    `--raison-schema:${Math.round(etat.hauteurSchema)}px`,
    `--raison-etat:${Math.round(etat.largeurEtat)}px`,
    `--raison-copilote:${Math.round(etat.largeurCopilote)}px`
  ].join(";");

  return `
    <section class="raison-espace${etat.pleinEcran ? " est-plein-ecran" : ""}${
      etat.copiloteOuvert ? " est-accompagne" : ""}" style="${style}" data-raison-espace>
      <header class="raison-espace__barre">
        <b class="raison-espace__titre">Comment on en est arrivé là</b>
        <span class="raison-espace__resume">${resume}</span>
        <div class="raison-espace__outils">
          <button type="button" class="bouton-discret raison-espace__outil${
            etat.copiloteOuvert ? " est-actif" : ""}" data-raison-copilote
            aria-pressed="${etat.copiloteOuvert ? "true" : "false"}"
            title="${etat.copiloteOuvert ? "Fermer la discussion" : "En parler au copilote"}"
            aria-label="${etat.copiloteOuvert ? "Fermer la discussion" : "En parler au copilote"}">
            ${svgIcon("comment-discussion", { className: "octicon" })}
          </button>
          <button type="button" class="bouton-discret raison-espace__outil${
            etat.pleinEcran ? " est-actif" : ""}" data-raison-plein-ecran
            aria-pressed="${etat.pleinEcran ? "true" : "false"}"
            title="${etat.pleinEcran ? "Quitter le plein écran" : "Plein écran"}"
            aria-label="${etat.pleinEcran ? "Quitter le plein écran" : "Plein écran"}">
            ${svgIcon("screen-full", { className: "octicon" })}
          </button>
        </div>
      </header>

      <div class="raison-espace__corps">
        <div class="raison-espace__principal">
          ${graphe.noeuds.length ? `
            <div class="raison-espace__schema" data-raison-schema>
              ${dessinerGrapheLiaisons({
                graphe,
                selection: etat.carte,
                zoom: etat.zoom,
                legende: "<b>Le schéma des dépendances</b> — de gauche à droite : ce qui décide, "
                  + "puis ce qui en découle. La colonne de gauche est ce qu'aucune règle ne produit : "
                  + "les données de base. Survolez une carte pour voir ses liens, cliquez-la pour aller "
                  + "à sa fonction dans le code.",
                rangNomme: "Étape",
                // L'espace porte déjà le sien, dans sa barre : deux boutons pour
                // un même geste font douter qu'ils fassent la même chose.
                peutSAgrandir: false
              })}
            </div>
            <div class="raison-espace__poignee raison-espace__poignee--horizontale"
              data-raison-poignee="schema" role="separator" aria-orientation="horizontal"
              aria-label="Changer la hauteur du schéma"></div>` : ""}

          <div class="raison-espace__code" data-raison-code>
            ${renderGrille(lignes, trace, ancres)}
          </div>
        </div>

        ${etat.copiloteOuvert ? `
          <div class="raison-espace__poignee raison-espace__poignee--verticale"
            data-raison-poignee="copilote" role="separator" aria-orientation="vertical"
            aria-label="Changer la largeur de la discussion"></div>
          <aside class="raison-espace__copilote" data-raison-discussion></aside>` : ""}
      </div>
    </section>
  `;
}

/**
 * Les rangées où chaque fonction commence.
 *
 * C'est ce qui permet au schéma de commander le code. Une carte de règle vise
 * la première ligne de sa fonction ; une carte de donnée de base n'a pas de
 * fonction à elle — elle vise la première ligne qui la cite, c'est-à-dire
 * l'`importe` de la règle qui la lit.
 *
 * @returns {{parRang: Map<number,string>, parCarte: Map<string,number>}}
 */
export function ancresDuCode(lignes = [], trace = [], graphe = { noeuds: [] }) {
  const parRang = new Map();
  const parCarte = new Map();

  const poser = (carte, rang) => {
    if (!carte || parCarte.has(carte)) return;
    parCarte.set(carte, rang);
    if (!parRang.has(rang)) parRang.set(rang, carte);
  };

  // Les règles d'abord : une tête de fonction est un repère plus sûr qu'une
  // citation au milieu d'un bloc.
  for (const noeud of graphe.noeuds ?? []) {
    if (!texte(noeud?.id).startsWith("regle:")) continue;
    const cherche = texte(noeud.titre);
    const rang = lignes.findIndex((ligne) => estUneTeteDeFonction(ligne, cherche));
    if (rang >= 0) poser(noeud.id, rang);
  }

  for (const noeud of graphe.noeuds ?? []) {
    if (!texte(noeud?.id).startsWith("donnee:")) continue;
    const cherche = texte(noeud.titre);
    const rang = trace.findIndex((entree) => texte(entree?.sujet) === cherche);
    if (rang >= 0) poser(noeud.id, rang);
  }

  return { parRang, parCarte };
}

/**
 * Une ligne qui ouvre la fonction d'un sujet donné.
 *
 * Le premier jeton n'est pas le mot : c'est le **retrait**, un jeton neutre que
 * l'écriture pose pour que le texte se colle tel quel. On cherche donc le
 * premier jeton qui dit quelque chose.
 */
function estUneTeteDeFonction(ligne, sujet) {
  const jetons = ligne?.jetons ?? [];
  const premier = jetons.find((jeton) => texte(jeton?.texte));
  if (premier?.type !== "mot-fonction") return false;
  return jetons.some((jeton) => jeton?.type === "sujet" && texte(jeton.texte) === sujet);
}
