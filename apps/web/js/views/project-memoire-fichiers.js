/**
 * La mémoire du projet, parcourue comme un dépôt.
 *
 * ## Pourquoi un navigateur de fichiers, et pas une liste
 *
 * La mémoire s'affichait en tableau : une ligne par affirmation, filtrable par
 * nature. Cela répond à « montre-moi toutes les hypothèses », et c'est une
 * question qu'on se pose. Mais ce n'est pas celle qu'on se pose en arrivant :
 * on arrive avec « qu'est-ce que le projet dit de l'incendie ? », et un tableau
 * de trois cents lignes filtrables demande de savoir quoi filtrer.
 *
 * Depuis que la mémoire s'écrit — voir `memoire-en-texte.js` —, elle a une
 * forme naturelle : des dossiers, des fichiers, des lignes. On la parcourt donc
 * comme l'onglet Documents, avec les mêmes gestes, parce que ce sont les mêmes
 * gestes.
 *
 * ## Code, ou Blame
 *
 * Deux lectures d'un même fichier, et ce sont deux questions différentes :
 * « qu'est-ce que le projet tient pour vrai ? » et « qui a décidé cela, et
 * quand ? ». La seconde est la raison d'être de cette mémoire — une valeur sans
 * son auteur ni sa date n'est qu'un chiffre dans un tableur. Voir
 * `memoire-blame.js` pour ce que chaque lecture montre, et ce qu'elle cache.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";
import { renderSideResizer } from "./ui/side-resizer.js";
import { renderBoutonCopier } from "./ui/bouton-copier.js";
import {
  blocDAffirmation, blocDeRegle, cheminDeFichier, nomDeFichier, couperLUnite, estMesuree,
  ligneDeZone, ligneFermante, blocDeVariable, ligneDeCommentaire,
  JETON, OPERATEUR, TOUTES_ZONES, PROVENANCE, STATUT
} from "../services/memoire-en-texte.js";
import {
  phraseDeLExtension, rangDuDossier, rangDeLExtension, langageDeLExtension, SANS_NATURE,
  MEMOIRE, EXTENSION_REGLE, LANGAGES, zonesDeRangement, rangDeLaZone
} from "../services/memoire-rangement.js";
import {
  fichiersDeLaMemoire, dossiersDeLaMemoire, blameDeLaLigne, chaleurDeLaLigne, bornesDuFichier,
  dernierVersementDe, contributeursDuFichier, zonesLisibles, PARTS_DANCIENNETE
} from "../services/memoire-blame.js";
import {
  resolutionDuSujet, renvoisSansDeclaration, variablesDeLaMemoire, definitionsDesVariables,
  cleDuSujet, typeDeLaValeur
} from "../services/memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Un jeton, comme l'écriture en fabrique. Voir `memoire-en-texte.js`. */
const jeton = (type, contenu) => ({ type, texte: contenu });

/** Les deux lectures d'un fichier. */
export const LECTURE = { CODE: "code", BLAME: "blame" };

/** Une clé de chemin, utilisable comme identifiant HTML. */
const cleHtml = (valeur) => texte(valeur).replace(/[^\w-]+/g, "-");

/**
 * Ce que l'écran a sous la main.
 *
 * Une seule lecture de la mémoire, découpée une fois. Recalculer l'arborescence
 * à chaque rendu ferait trier trois cents affirmations à chaque frappe.
 */
export function preparerLaMemoire(assertions = []) {
  const dossiers = dossiersDeLaMemoire(assertions)
    .map((dossier) => ({ ...dossier, fichiers: dossier.fichiers.slice().sort(parLecture) }))
    .sort((gauche, droite) => rangDuDossier(gauche.nom) - rangDuDossier(droite.nom)
      || gauche.nom.localeCompare(droite.nom, "fr"));

  // Où chaque valeur est écrite. C'est ce qui permet à une règle de dire d'où
  // viennent ses entrées et où va son résultat, sans le deviner : la mémoire le
  // sait, il suffit de le lui demander une fois.
  const ouEcrit = ouChaqueValeurEstEcrite(fichiersDeLaMemoire(assertions));

  // La racine porte ce qui ne relève d'aucun domaine et d'aucune nature : la
  // liste des noms que le projet partage. Elle se calcule depuis les dossiers,
  // et n'y figure donc pas elle-même — sinon chaque variable se déclarerait
  // dans le fichier qui la liste, ce qui ne veut rien dire.
  const racine = [fichierDesVariables(dossiers, { ouEcrit })].filter(Boolean);

  return { dossiers, racine, ouEcrit, fichiers: [...fichiersDeLaMemoire(assertions), ...racine] };
}

/**
 * Où chaque valeur du projet est écrite : `sujet → memoire/incendie.ctr`.
 *
 * Une **règle** n'y entre pas : elle produit la valeur, elle ne la porte pas.
 * Sans cette distinction, une règle dirait qu'elle enregistre son résultat dans
 * le fichier où elle vit elle-même, ce qui est un cercle.
 */
export function ouChaqueValeurEstEcrite(fichiers = []) {
  const ou = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const assertion of fichier.lignes ?? []) {
      if (assertion?.payload?.referentiel === true) continue;
      const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
      if (cle && !ou.has(cle)) ou.set(cle, fichier.fichier);
    }
  }

  return ou;
}

/** Le nom du fichier des variables. Il est à la racine, et il est unique. */
export const FICHIER_DES_VARIABLES = "variables-du-projet.ref";

/**
 * `Mémoire/variables-du-projet.ref` — les noms que le projet partage.
 *
 * ## Pourquoi un fichier, et non un écran
 *
 * Parce qu'on l'ouvre au même endroit que les règles qui s'en servent. Un
 * dictionnaire rangé ailleurs ne se consulte pas ; celui-ci est à un clic de la
 * règle qu'on est en train de lire.
 *
 * ## Pourquoi il s'engendre
 *
 * Il est **entièrement déductible** des autres fichiers : les noms sont ceux
 * que les blocs déclarent et que les conditions citent. Le verser en ferait une
 * seconde vérité, qui divergerait au premier versement — voir
 * `docs/fondamentaux.md`, règle 4. Il ne porte donc que ce qui se déduit : le
 * nom, son type, son unité. Ce qu'une variable **vaut** n'y est pas : elle en
 * prend plusieurs au fil d'un projet, et une définition qui en porterait une
 * cesserait d'être vraie au premier versement.
 *
 * @returns {object|null} un fichier, ou `null` si le projet n'a encore aucun nom
 */
export function fichierDesVariables(dossiers = [], { ouEcrit = null } = {}) {
  const fichiers = (Array.isArray(dossiers) ? dossiers : []).flatMap((dossier) => dossier.fichiers ?? []);
  const variables = variablesDeLaMemoire(fichiers, (fichier) => lignesAffichables(fichier, { ouEcrit }));
  const definitions = definitionsDesVariables(variables, explicationsVersees(fichiers));
  if (!definitions.length) return null;

  const lignesPretes = [
    { nature: "commentaire", jetons: ligneDeCommentaire(
      "Les noms que le projet partage. Une règle qui cite un nom absent d'ici s'appuie sur ce que personne n'a versé.") },
    { nature: "commentaire", jetons: ligneDeCommentaire(
      "Ce fichier s'engendre depuis les autres : il ne se verse pas, il se relit.") },
    { nature: "commentaire", jetons: ligneDeCommentaire(
      "Une déclaration doit suffire à décider si l'on réutilise ce nom ou si l'on en crée un autre.") },
    ...definitions.flatMap((definition, rang) => {
      // Un bloc par variable, repliable : à douze mille noms, c'est le repli
      // qui rend la liste parcourable. Le blanc au-dessus sépare deux blocs.
      const bloc = `v${rang + 1}`;
      const lignes = blocDeVariable(definition);
      return [
        { nature: "vide", jetons: [] },
        ...lignes.map((jetons, place) => ({
          nature: place === 0 ? "variable" : "detail",
          jetons,
          ouvre: place === 0 ? bloc : null,
          ferme: place === lignes.length - 1 ? bloc : null,
          ancetres: place === 0 ? [] : [bloc]
        }))
      ];
    })
  ];

  return {
    chemin: [MEMOIRE],
    extension: EXTENSION_REGLE,
    nom: FICHIER_DES_VARIABLES,
    fichier: `${normaliserPourChemin(MEMOIRE)}/${FICHIER_DES_VARIABLES}`,
    lignes: [],
    ecartees: [],
    sections: [],
    lignesPretes
  };
}

/**
 * Ce que les utilitaires ont dit d'une variable, quand ils l'ont dit.
 *
 * Le type et l'unité se déduisent des valeurs ; ce qu'un nom **désigne** et ce
 * à quoi il **sert** ne se déduisent de rien. Ils se versent, avec
 * l'affirmation, et se relisent ici.
 */
function explicationsVersees(fichiers = []) {
  const dites = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const assertion of fichier.lignes ?? []) {
      const payload = assertion?.payload ?? {};
      const cle = cleDuSujet(texte(payload.subject) || texte(assertion?.subject_key));
      if (!cle || dites.has(cle)) continue;
      const description = texte(payload.quoi);
      const utilisation = texte(payload.utilisation);
      if (description || utilisation) dites.set(cle, { description, utilisation });
    }
  }

  return dites;
}

/** Le même passage en minuscules sans accents que `cheminDeFichier`. */
function normaliserPourChemin(morceau) {
  return texte(morceau)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "memoire";
}

/**
 * L'ordre des fichiers d'une zone : les textes appliqués, puis ce qu'on en tire.
 *
 * On lit un `.ref` avant un `.ctr` pour la même raison qu'on lit l'arrêté avant
 * la note de synthèse : la conclusion ne s'apprécie qu'une fois la règle connue.
 */
function parLecture(gauche, droite) {
  return rangDeLExtension(gauche.extension) - rangDeLExtension(droite.extension)
    || gauche.fichier.localeCompare(droite.fichier, "fr");
}

/**
 * Le chemin d'un fichier, tel qu'on y navigue : `Escalier B/incendie.ctr`.
 *
 * L'extension fait partie de l'adresse. Sans elle, `Escalier B/Incendie`
 * désignerait six fichiers à la fois, et l'écran en ouvrirait un au hasard.
 */
export function adresseDuFichier(fichier) {
  // Relative à la branche : `Incendie/incendie.ctr`, et non `Mémoire/…`. La
  // racine est celle de l'onglet, pas un dossier où l'on entre.
  //
  // Un fichier **à la racine** n'a donc pas de dossier devant lui : son adresse
  // est son nom. Sans cela, `variables-du-projet.ref` s'adressait
  // `Mémoire/variables-du-projet.ref`, et le fil d'Ariane affichait
  // « Fichiers / Mémoire / Mémoire / variables-du-projet.ref ».
  if (fichier.chemin.length <= 1) return nomDuFichier(fichier);

  const dossier = fichier.chemin[fichier.chemin.length - 1];
  return `${dossier}/${nomDuFichier(fichier)}`;
}

/**
 * Le nom d'un fichier.
 *
 * Il se calcule d'ordinaire depuis le chemin — un dossier « Incendie » porte
 * `incendie.ctr`. Un fichier engendré porte le sien : `variables-du-projet.ref`
 * ne se déduit d'aucun dossier, il est ce qu'il est.
 */
export function nomDuFichier(fichier) {
  return texte(fichier?.nom) || nomDeFichier(fichier.chemin, fichier.extension);
}

/**
 * Le fichier d'un chemin, s'il existe.
 *
 * Deux formes d'adresse : `Incendie/incendie.ctr` pour un fichier de dossier,
 * et le seul nom pour un fichier de la racine. C'est ce que
 * `adresseDuFichier` rend, et il n'y a qu'une façon de comparer.
 */
export function fichierDuChemin(memoire, chemin = []) {
  if (!chemin.length) return null;
  const cle = chemin.slice(0, 2).join("/");
  const seul = texte(chemin[0]);
  return (memoire.fichiers ?? []).find((fichier) => {
    const adresse = adresseDuFichier(fichier);
    return adresse === cle || (chemin.length === 1 && adresse === seul);
  }) ?? null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'arborescence
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Une ligne de l'arbre des Fichiers.
 *
 * ## Une seule arborescence, un seul nœud
 *
 * L'onglet portait deux constructions parallèles : les dossiers de la Mémoire
 * d'un côté, ceux des Documents de l'autre, avec chacune son balisage, ses
 * attributs et son écouteur. Elles se ressemblaient assez pour paraître une
 * seule, et se comportaient assez différemment pour que cliquer un fichier de
 * mémoire depuis un dossier de documents ne fasse rien.
 *
 * Il n'y a plus qu'un type de nœud et qu'un rendu. Les deux moitiés du projet
 * décrivent ce qu'elles contiennent ; l'arbre les dessine de la même façon, et
 * un seul geste les ouvre.
 *
 * @typedef {object} Noeud
 * @property {string} aller l'adresse à ouvrir : `memoire:Incendie/incendie.ref`,
 *   `documents:<id de dossier>`, `document:<id de pièce>`, ou `` pour la racine
 * @property {string} libelle
 * @property {number} profondeur zéro pour une racine
 * @property {"dossier"|"fichier"} genre
 * @property {boolean} [ouvrable] porte un caret
 * @property {boolean} [ouvert] déplié — l'icône du dossier le dit aussi
 * @property {string} [plier] l'adresse que le caret plie, si elle diffère
 * @property {boolean} [actif]
 * @property {string|number} [compte]
 */

/** Le retrait d'une ligne d'arbre : un trait de continuité par niveau. */
function retraitDArbre(profondeur) {
  if (profondeur <= 0) return "";
  const traits = Array.from({ length: profondeur })
    .map(() => `<span class="documents-tree__divider is-expanded" aria-hidden="true"></span>`)
    .join("");
  return `<span class="documents-tree__indent">${traits}</span>`;
}

/**
 * L'icône d'un nœud.
 *
 * Un dossier déplié n'a pas la même icône qu'un dossier fermé : c'est la seule
 * marque qui reste quand le caret est hors du champ de vision, en bas d'une
 * longue arborescence.
 */
function iconeDuNoeud(noeud) {
  if (noeud.genre === "dossier") {
    return svgIcon(noeud.ouvert ? "file-directory-open" : "file-directory", { className: "octicon" });
  }
  return svgIcon("file", { className: "octicon" });
}

/** Une ligne, quelle que soit la matière qu'elle porte. */
export function renderLigneDArbre(noeud) {
  const actif = noeud.actif === true;
  const plier = noeud.plier ?? noeud.aller;

  return `
    <div class="documents-tree__row${actif ? " is-active" : ""}">
      ${retraitDArbre(noeud.profondeur)}
      ${
        noeud.ouvrable
          ? `<button type="button" class="documents-tree__caret" data-arbre-plier="${escapeHtml(plier)}"
               aria-expanded="${noeud.ouvert ? "true" : "false"}"
               aria-label="${noeud.ouvert ? "Replier" : "Déplier"} ${escapeHtml(noeud.libelle)}">
               ${svgIcon(noeud.ouvert ? "chevron-down" : "chevron-right", { className: "octicon" })}
             </button>`
          : `<span class="documents-tree__caret-spacer"></span>`
      }
      <button type="button" class="documents-tree__item${actif ? " is-active" : ""}"
        data-arbre-aller="${escapeHtml(noeud.aller)}">
        <span class="documents-tree__icon-slot">${iconeDuNoeud(noeud)}</span>
        <span class="documents-tree__label">${escapeHtml(noeud.libelle)}</span>
        ${noeud.compte === undefined || noeud.compte === "" ? "" : `<span class="diff-tree__compte">${escapeHtml(String(noeud.compte))}</span>`}
      </button>
    </div>
  `;
}

/**
 * Les nœuds de la Mémoire : ses dossiers, et leurs fichiers.
 *
 * @returns {Noeud[]}
 */
export function noeudsDeLaMemoire(memoire, { chemin = [], replies = new Set(), profondeur = 1 } = {}) {
  const noeuds = [];

  // Ce qui vit à la racine se lit avant les dossiers : c'est le dictionnaire du
  // projet, et on l'ouvre avant d'entrer dans une discipline.
  for (const fichier of memoire.racine ?? []) {
    const adresse = adresseDuFichier(fichier);
    noeuds.push({
      aller: `memoire:${adresse}`,
      libelle: nomDuFichier(fichier),
      profondeur,
      genre: "fichier",
      actif: chemin.join("/") === adresse,
      compte: (fichier.lignesPretes ?? []).filter((ligne) => ligne.nature === "variable").length
    });
  }

  for (const dossier of memoire.dossiers ?? []) {
    const replie = replies.has(dossier.nom);
    noeuds.push({
      aller: `memoire:${dossier.nom}`,
      plier: `dossier:${dossier.nom}`,
      libelle: dossier.nom,
      profondeur,
      genre: "dossier",
      ouvrable: dossier.fichiers.length > 0,
      ouvert: !replie,
      actif: chemin[0] === dossier.nom && chemin.length === 1,
      compte: dossier.lignes
    });

    if (replie) continue;

    for (const fichier of dossier.fichiers) {
      const adresse = adresseDuFichier(fichier);
      noeuds.push({
        aller: `memoire:${adresse}`,
        libelle: nomDuFichier(fichier),
        profondeur: profondeur + 1,
        genre: "fichier",
        actif: chemin.join("/") === adresse,
        compte: fichier.lignes.length
      });
    }
  }

  return noeuds;
}

/**
 * Le panneau, autour de lignes venues d'ailleurs.
 *
 * Une seule poignée pour tout l'onglet, et une seule largeur : l'arbre est le
 * même des deux côtés, et deux largeurs pour un seul panneau finiraient par
 * diverger — on tirait la Mémoire, les Documents restaient où ils étaient.
 */
export function renderPanneauDArbre(corps, { ouverte = true, largeur = 280, query = "" } = {}) {
  // Repliée, la barre **n'existe pas** : son bouton rejoint le fil d'Ariane.
  // Une colonne réduite à la largeur d'un bouton prend quand même sa place, et
  // c'est de la largeur d'affichage perdue pour rien.
  if (!ouverte) return "";

  const bornee = Math.max(220, Math.min(520, Number(largeur) || 280));
  return `
    <aside class="documents-tree memoire-tree is-open"
      style="--memoire-tree-width:${bornee}px;--documents-tree-width:${bornee}px"
      aria-label="Les fichiers du projet">
      <div class="memoire-tree__tete">
        ${renderReplieDuRail(true)}
        ${
          // La recherche se pose en haut de l'arborescence quand elle est
          // ouverte, et rejoint le fil d'Ariane quand elle ne l'est plus : elle
          // est toujours à la même hauteur, jamais au même endroit inutile.
          renderRechercheDuProjet(query)
        }
      </div>
      <div class="documents-tree__panel">
        ${corps || `<p class="diff-tree__vide">Le projet n'a encore rien reçu ni rien versé.</p>`}
      </div>
      ${renderSideResizer({ id: "fichiersTreeResize", className: "documents-tree__resize-handle" })}
    </aside>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * La barre : fil d'Ariane, et la recherche à droite
 * ──────────────────────────────────────────────────────────────────────────── */

export function renderFilDAriane({ chemin = [] } = {}) {
  // Le fil remonte jusqu'à la racine de l'onglet : sans elle, on entrait dans
  // la Mémoire sans pouvoir en ressortir vers les Documents.
  //
  // « Mémoire » est la racine de la branche, pas un dossier : elle se cible par
  // une adresse vide, et le chemin qui suit est relatif.
  //
  // Le dernier morceau est là où l'on se trouve : il s'écrit en clair, il ne se
  // clique pas. Un lien vers l'endroit où l'on est déjà ne mène nulle part.
  const morceaux = [
    { libelle: "Fichiers", cible: `data-fichiers-branche=""` },
    { libelle: "Mémoire", cible: `data-memoire-aller=""` },
    ...chemin.map((morceau, rang) => ({
      libelle: morceau,
      cible: `data-memoire-aller="${escapeHtml(chemin.slice(0, rang + 1).join("/"))}"`
    }))
  ];

  // Un répertoire garde son slash final, un fichier n'en a pas : « Fichiers /
  // Mémoire / » se lit comme un endroit où l'on est, « … / incendie.ref » comme
  // une chose qu'on regarde.
  const surUnFichier = /\.[a-z0-9]+$/i.test(morceaux[morceaux.length - 1]?.libelle ?? "");

  const miettes = morceaux
    .map((morceau, rang) =>
      rang === morceaux.length - 1
        ? `<span class="documents-breadcrumb__current">${escapeHtml(morceau.libelle)}</span>`
        : `<button type="button" class="documents-breadcrumb__link" ${morceau.cible}>${escapeHtml(morceau.libelle)}</button>`)
    .join(`<span class="documents-breadcrumb__sep">/</span>`)
    + (surUnFichier ? "" : `<span class="documents-breadcrumb__sep">/</span>`);

  // Le chemin, tel qu'on le cite : c'est ce qu'on colle dans un message pour
  // dire à quelqu'un où regarder. Le retaper à la main d'après l'écran est le
  // genre de geste où l'on se trompe d'un accent, et le destinataire ne trouve
  // rien.
  const aCopier = morceaux.slice(1).map((morceau) => morceau.libelle).join("/");

  return `
    <nav class="documents-breadcrumb" aria-label="Chemin">
      ${miettes}
      ${renderBoutonCopier({
        texte: aCopier,
        className: "documents-breadcrumb__copier",
        titre: "Copier le chemin dans le presse-papiers",
        titreCopie: "Chemin copié"
      })}
    </nav>
  `;
}

/**
 * La tête d'un contenu : où l'on est, et ce qu'on peut y faire.
 *
 * ## Une seule barre pour les deux matières
 *
 * La Mémoire et les Documents avaient chacune la leur — `.memoire-corps__tete`
 * et `.documents-topbar` —, avec deux balisages, deux jeux de règles et deux
 * façons de se coller en haut de l'écran. Elles montrent la même chose : un fil
 * d'Ariane à gauche, ce qu'on peut faire à droite. Deux composants pour un
 * geste finissent par ne plus se ressembler, et il faudrait tenir la logique de
 * défilement à deux endroits.
 *
 * @param {object} options
 * @param {string} options.fil le fil d'Ariane, déjà rendu
 * @param {string} [options.droite] les gestes, alignés à droite
 */
export function renderTeteDuContenu({ fil = "", droite = "", replie = false } = {}) {
  return `
    <div class="memoire-corps__tete">
      ${replie ? renderReplieDuRail(false) : ""}
      ${fil}
      <span class="memoire-corps__espace"></span>
      ${droite}
    </div>
  `;
}

/** Le champ de recherche. Il change de place, jamais de forme. */
export function renderRechercheDuProjet(query = "") {
  return `
    <label class="memoire-recherche">
      ${svgIcon("search", { className: "octicon" })}
      <input type="search" class="gh-input" data-memoire-query value="${escapeHtml(query)}"
        placeholder="Chercher dans le projet">
    </label>
  `;
}

/**
 * Le bouton qui replie la barre latérale.
 *
 * Il vit **dans** la barre, en haut, et n'en bouge pas : un bouton qui se
 * déplace selon l'état qu'il commande oblige à le chercher chaque fois qu'on
 * veut revenir en arrière. Replié, la barre n'est plus qu'une bande large de ce
 * bouton — il reste exactement où il était.
 */
export function renderReplieDuRail(ouverte) {
  const dit = ouverte ? "Replier la barre latérale" : "Étendre la barre latérale";
  return `
    <button type="button" class="documents-tree__toggle" data-memoire-replier
      aria-label="${escapeHtml(dit)}" title="${escapeHtml(dit)}">
      ${svgIcon(ouverte ? "sidebar-collapse" : "sidebar-expand", { className: "octicon" })}
    </button>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les trois écrans
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * La racine : les dossiers, et ce qu'on y range.
 *
 * Chaque dossier porte sa phrase. « Contraintes » et « Données de base » se
 * ressemblent assez pour qu'on y range au hasard, et un dossier nommé sans être
 * expliqué se remplit de travers.
 */
/**
 * L'en-tête d'un tableau de fichiers.
 *
 * Un seul, partout : dans la Mémoire, dans les Documents, à chaque niveau. Ce
 * qu'on cherche en parcourant un dépôt est toujours la même chose — de quoi il
 * s'agit, ce qui lui est arrivé en dernier, et quand — et deux en-têtes
 * différents pour cette question-là donnaient l'impression de deux
 * applications.
 *
 * L'accueil de l'onglet n'en porte pas : il ne montre pas des fichiers, il
 * montre les deux matières du projet.
 */
export const COLONNES_DU_TABLEAU = [
  { cle: "nom", libelle: "Nom" },
  { cle: "message", libelle: "Message du dernier versement" },
  { cle: "date", libelle: "Date du dernier versement" }
];

/** La largeur des trois colonnes. Un seul gabarit, sinon elles se décalent. */
export const GABARIT_DU_TABLEAU = "minmax(160px, 2fr) minmax(0, 3fr) minmax(90px, auto)";

export function renderEnteteDuTableau() {
  return `
    <div class="memoire-entete">
      ${COLONNES_DU_TABLEAU
        .map((colonne) => `<span class="memoire-entete__${colonne.cle}">${escapeHtml(colonne.libelle)}</span>`)
        .join("")}
    </div>
  `;
}

/**
 * La racine de la Mémoire : ses dossiers.
 *
 * Les mêmes trois colonnes qu'ailleurs. Les phrases explicatives sous chaque
 * nom sont parties avec elles : elles doublaient la hauteur d'un tableau qu'on
 * parcourt du regard, et elles disaient une fois pour toutes ce qu'on
 * n'apprend qu'une fois.
 */
export function renderDossiers(memoire, { auteurs = new Map(), propositions = new Map() } = {}) {
  if (!(memoire.dossiers ?? []).length) {
    return `<div class="propositions-empty"><b>La mémoire est vide</b>
      <p>Rien n'y entre directement : ce que le projet retient passe par une proposition, et quelqu'un la signe.</p></div>`;
  }

  return `
    <div class="memoire-liste memoire-liste--tableau">
      ${renderEnteteDuTableau()}
      ${(memoire.racine ?? []).map((fichier) => `
        <button type="button" class="memoire-entree memoire-entree--fichier"
          data-memoire-aller="${escapeHtml(adresseDuFichier(fichier))}">
          <span class="memoire-entree__nom">
            <span class="memoire-entree__icone">${svgIcon("file", { className: "octicon" })}</span>
            ${escapeHtml(nomDuFichier(fichier))}
          </span>
          <span class="memoire-entree__message">Les noms que le projet partage — engendré depuis les autres fichiers.</span>
          <span class="memoire-entree__date">—</span>
        </button>
      `).join("")}
      ${memoire.dossiers
        .map((dossier) => {
          const dernier = dernierVersementDe(
            dossier.fichiers.flatMap((fichier) => fichier.lignes),
            { auteurs, propositions }
          );
          return `
            <button type="button" class="memoire-entree memoire-entree--fichier" data-memoire-aller="${escapeHtml(dossier.nom)}">
              <span class="memoire-entree__nom">
                <span class="memoire-entree__icone">${svgIcon("file-directory", { className: "octicon" })}</span>
                ${escapeHtml(dossier.nom)}
              </span>
              <span class="memoire-entree__message">${escapeHtml(dernier?.message || "—")}</span>
              <span class="memoire-entree__date">${escapeHtml(dernier ? ilYA(dernier.quand) : "—")}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

/** Un dossier : ses fichiers. */
export function renderFichiers(memoire, dossier, { auteurs = new Map(), propositions = new Map() } = {}) {
  const entree = (memoire.dossiers ?? []).find((candidat) => candidat.nom === dossier);
  if (!entree) {
    return `<div class="propositions-empty"><b>Ce dossier est vide</b>
      <p>Aucune affirmation ne s'y range aujourd'hui.</p></div>`;
  }

  return `
    <div class="memoire-liste memoire-liste--tableau">
      ${renderEnteteDuTableau()}
      ${entree.fichiers
        .map((fichier) => {
          const dernier = dernierVersementDe(fichier.lignes, { auteurs, propositions });
          return `
            <button type="button" class="memoire-entree memoire-entree--fichier" data-memoire-aller="${escapeHtml(adresseDuFichier(fichier))}">
              <span class="memoire-entree__nom">
                <span class="memoire-entree__icone">${svgIcon("file", { className: "octicon" })}</span>
                ${escapeHtml(nomDuFichier(fichier))}
                <span class="memoire-entree__quoi">${escapeHtml(phraseDeLExtension(fichier.extension))}</span>
              </span>
              <span class="memoire-entree__message">${escapeHtml(dernier?.message || "—")}</span>
              <span class="memoire-entree__date">${escapeHtml(dernier ? ilYA(dernier.quand) : "—")}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

/**
 * L'encart du dernier versement, en tête d'un dossier ou d'un fichier.
 *
 * Qui, quoi, quand — dans cet ordre, parce que c'est l'ordre dans lequel on lit
 * un changement : on regarde de qui il vient avant de lire ce qu'il dit.
 */
export function renderDernierVersement(lignes, { auteurs = new Map(), avatars = new Map(), propositions = new Map() } = {}) {
  const dernier = dernierVersementDe(lignes, { auteurs, propositions });
  if (!dernier) return "";

  const qui = dernier.qui || "auteur inconnu";
  return `
    <div class="memoire-versement">
      ${renderPortrait(dernier.quiId, qui, { avatars })}
      <span class="memoire-versement__qui">${escapeHtml(qui)}</span>
      <span class="memoire-versement__message">${escapeHtml(dernier.message || "sans intitulé")}</span>
      <span class="memoire-versement__espace"></span>
      ${
        dernier.propositionId
          ? `<button type="button" class="memoire-versement__ref" data-memoire-proposition="${escapeHtml(dernier.propositionId)}">${escapeHtml(dernier.intitule)}</button>`
          : `<span class="memoire-versement__ref">${escapeHtml(dernier.intitule)}</span>`
      }
      <span class="memoire-versement__sep">·</span>
      <span class="memoire-versement__date">${escapeHtml(ilYA(dernier.quand))}</span>
    </div>
  `;
}

/** Les initiales d'un nom, faute d'une photo. */
function initialesDe(nom) {
  const mots = texte(nom).split(/\s+/).filter(Boolean);
  if (!mots.length) return "?";
  return (mots[0][0] + (mots.length > 1 ? mots[mots.length - 1][0] : "")).toUpperCase();
}

/**
 * Le portrait de quelqu'un, ou de quoi tenir sa place.
 *
 * L'image d'abord : c'est à cela qu'on reconnaît quelqu'un dans une liste. Les
 * initiales ne sont pas un choix, c'est ce qui reste quand il n'y a pas de
 * photo — et l'écran affichait les initiales même quand la photo existait.
 */
function renderPortrait(identifiant, nom, { avatars = new Map(), titre = "" } = {}) {
  const url = texte(avatars.get?.(texte(identifiant)));
  const infobulle = texte(titre) || texte(nom);

  if (url) {
    return `<img class="memoire-versement__avatar" src="${escapeHtml(url)}"
      alt="" title="${escapeHtml(infobulle)}" loading="lazy" decoding="async">`;
  }

  return `<span class="memoire-versement__avatar" title="${escapeHtml(infobulle)}"
    aria-hidden="true">${escapeHtml(initialesDe(nom))}</span>`;
}

/**
 * L'échelle d'ancienneté, en tête d'un fichier lu par son origine.
 *
 * ## Pourquoi une légende, et pas seulement des couleurs
 *
 * La marge colorée dit déjà « ceci est vieux, ceci est récent ». Mais elle ne
 * dit pas dans quel sens : sans repère, une bande sombre à gauche peut aussi
 * bien vouloir dire « le plus ancien » que « le plus important ». Deux mots aux
 * deux bouts suffisent, et c'est ce que fait un dépôt.
 *
 * ## Les contributeurs à droite
 *
 * Ce sont ceux **de ce fichier**, du plus récent au plus ancien : la question
 * qu'on se pose en ouvrant l'origine d'un fichier est « qui a écrit ça », et la
 * réponse tient en trois portraits.
 */
export function renderEchelleDAnciennete(lignes = [], { auteurs = new Map(), avatars = new Map() } = {}) {
  const gens = contributeursDuFichier(lignes, auteurs);

  const degres = Array.from({ length: PARTS_DANCIENNETE })
    .map((_, rang) => `<span class="memoire-anciennete__degre memoire-anciennete__degre--${rang}"></span>`)
    .join("");

  return `
    <div class="memoire-anciennete">
      <span class="memoire-anciennete__bout">Older</span>
      <span class="memoire-anciennete__echelle" aria-hidden="true">${degres}</span>
      <span class="memoire-anciennete__bout">Newer</span>
      <span class="memoire-anciennete__espace"></span>
      ${
        gens.length
          ? `<span class="memoire-anciennete__gens">
               ${gens.map((qui) => renderPortrait(qui.id, qui.nom, { avatars })).join("")}
               <span class="memoire-anciennete__compte">${gens.length}</span>
             </span>`
          : ""
      }
    </div>
  `;
}

/**
 * Depuis combien de temps, en français.
 *
 * Une date absolue demande de compter ; « il y a 5 mois » se lit sans y penser.
 * La date exacte reste dans l'infobulle, pour qui en a besoin.
 */
export function ilYA(quand) {
  const date = Date.parse(texte(quand));
  if (!Number.isFinite(date)) return "date inconnue";

  const jours = Math.floor((Date.now() - date) / 86400000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 31) return `il y a ${jours} jours`;
  const mois = Math.round(jours / 30.44);
  if (mois < 12) return `il y a ${mois} mois`;
  const ans = Math.round(jours / 365.25);
  return `il y a ${ans} an${ans > 1 ? "s" : ""}`;
}

/**
 * Les lignes d'un fichier, prêtes à s'afficher : numérotées, et pliables.
 *
 * ## Pourquoi le pliage a besoin d'accolades
 *
 * Un fichier de cent affirmations fait cinq cents lignes. Replié sur ses têtes,
 * il en fait cent, et l'on retrouve la lecture qu'on avait perdue. Mais pour
 * plier, il faut savoir où un bloc finit : c'est ce que l'accolade dit, et
 * qu'aucune indentation ne dit aussi sûrement.
 *
 * Chaque ligne porte donc son bloc d'appartenance. Le caret ouvre et ferme, la
 * numérotation ne bouge pas — c'est ce que fait un dépôt, et c'est ce qu'on
 * attend.
 *
 * @returns {{rang, jetons, nature, bloc, ouvre, assertion, position}[]}
 */
export function lignesAffichables(fichier, { ouEcrit = null, auteurs = null } = {}) {
  // Un fichier engendré porte ses lignes toutes faites : il n'y a pas
  // d'affirmation derrière elles, et il n'y a rien à recomposer.
  if (Array.isArray(fichier?.lignesPretes)) {
    return fichier.lignesPretes.map((ligne, place) => ({
      rang: place + 1,
      jetons: ligne.jetons ?? [],
      nature: ligne.nature ?? "detail",
      profondeur: 0,
      ouvre: ligne.ouvre ?? null,
      ferme: ligne.ferme ?? null,
      ancetres: ligne.ancetres ?? [],
      assertion: null,
      position: 0
    }));
  }

  const sorties = [];
  let rang = 0;
  let numeroDeBloc = 0;

  const groupes = groupesDuFichier(fichier);

  groupes.forEach((groupe, place) => {
    // Un blanc entre deux groupes : sans lui, la fermeture de l'un et la tête
    // du suivant se collent, et l'œil ne voit plus où l'un finit.
    if (place > 0) {
      rang += 1;
      sorties.push({
        rang, jetons: [], nature: "vide", profondeur: 0,
        ancetres: [], ouvre: null, ferme: null, assertion: null, position: 0
      });
    }

    numeroDeBloc += 1;
    const blocDuGroupe = `g${numeroDeBloc}`;
    // Un tableau de valeurs décale ses entrées d'un cran, et les prend pour
    // enfants : replier la variable replie toutes ses zones.
    const dedans = groupe.tableau ? 1 : 0;
    const dansLeGroupe = groupe.tableau ? [blocDuGroupe] : [];

    if (groupe.tableau) {
      rang += 1;
      sorties.push({
        rang, jetons: teteDuTableau(groupe.sujet), nature: "affirmation", profondeur: 0,
        ancetres: [], ouvre: blocDuGroupe, ferme: null, assertion: groupe.entrees[0]?.assertion ?? null, position: 0
      });
    }

    groupe.entrees.forEach((entree, place2) => {
      if (place2 > 0 && !groupe.tableau) {
        rang += 1;
        sorties.push({
          rang, jetons: [], nature: "vide", profondeur: dedans,
          ancetres: dansLeGroupe, ouvre: null, ferme: null, assertion: null, position: 0
        });
      }

      numeroDeBloc += 1;
      const cle = `b${numeroDeBloc}`;
      const { assertion } = entree;
      const lignes = lignesDeLAssertion(assertion, dedans, {
        ouEcrit, auteurs,
        zone: groupe.tableau ? entree.zone : "",
        virgule: groupe.tableau && place2 < groupe.entrees.length - 1
      });
      const aUnCorps = lignes.length > 1;

      lignes.forEach((ligne, position) => {
        rang += 1;
        const tete = position === 0;
        const fermante = position === lignes.length - 1 && aUnCorps;

        sorties.push({
          rang, jetons: ligne.jetons, nature: ligne.nature,
          profondeur: dedans,
          // Les ancêtres, du plus large au plus proche. Replier l'un d'eux
          // cache la ligne : c'est ce qui rend le pliage **récursif**. Sans
          // cela, replier une variable ne cachait que les têtes de ses zones et
          // laissait leurs détails orphelins à l'écran.
          ancetres: tete ? dansLeGroupe : [...dansLeGroupe, cle],
          // Seule la tête porte le caret, et seulement si le bloc a un corps.
          ouvre: tete && aUnCorps ? cle : null,
          // L'accolade fermante reste visible quand le bloc est replié : deux
          // lignes — la tête et sa fermeture — se lisent d'un coup d'œil, là où
          // une seule ligne « { … } » demande de reconstruire la paire.
          ferme: fermante ? cle : null,
          assertion, position
        });
      });
    });

    if (groupe.tableau) {
      rang += 1;
      sorties.push({
        rang, jetons: piedDuTableau(), nature: "accolade", profondeur: 0,
        ancetres: dansLeGroupe, ouvre: null, ferme: blocDuGroupe, assertion: null, position: 1
      });
    }
  });

  return sorties;
}

/** `Sujet = [` — la tête d'un tableau de valeurs par zone. */
function teteDuTableau(sujet) {
  return [
    jeton(JETON.SUJET, texte(sujet)),
    jeton(JETON.NEUTRE, " "),
    jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
    jeton(JETON.NEUTRE, " "),
    jeton(JETON.PONCTUATION, "[")
  ];
}

/** `];` — sa fermeture. */
function piedDuTableau() {
  return [jeton(JETON.PONCTUATION, "]"), jeton(JETON.PONCTUATION, ";")];
}

/**
 * Les groupes d'un fichier : une entrée par **variable**, et ses valeurs.
 *
 * ## Ce qui a changé, et pourquoi
 *
 * Le fichier se découpait par zone, et le nom d'une variable se répétait dans
 * chacune. Trois fois le même nom à trois endroits différents, pour une seule
 * chose : une variable du projet, qui prend une valeur par partie d'ouvrage.
 * Chercher « degré coupe-feu des planchers » donnait trois réponses sans dire
 * qu'il s'agissait de la même.
 *
 * Une variable, un bloc, ses valeurs par zone. Et de ce fait, la question
 * devient impossible à éviter : **dans quelle zone ?**
 *
 * Un fichier de **règles** ne se groupe pas ainsi : une fonction n'a pas de
 * valeur par zone — la portée est son paramètre. Elle n'y figure donc qu'une
 * fois, quel que soit le nombre de zones où elle a été appliquée.
 */
export function groupesDuFichier(fichier) {
  if (langageDeLExtension(fichier?.extension) === LANGAGES.REGLE) {
    return fonctionsSansDoublon(fichier?.lignes ?? [])
      .map((assertion) => ({ tableau: false, sujet: sujetDeLAssertion(assertion), entrees: [{ assertion, zone: "" }] }));
  }

  const parSujet = new Map();

  for (const assertion of fichier?.lignes ?? []) {
    const sujet = sujetDeLAssertion(assertion);
    const cle = cleDuSujet(sujet);
    if (!cle) continue;

    if (!parSujet.has(cle)) parSujet.set(cle, { tableau: false, sujet, entrees: [] });
    const groupe = parSujet.get(cle);

    // Une affirmation qui vaut pour deux zones ouvre deux entrées : c'est la
    // même, vue de deux endroits, et l'effacer de l'une la cacherait à qui lit
    // cette zone-là.
    for (const zone of zonesDeRangement({ zones: zonesLisibles(assertion) })) {
      groupe.entrees.push({ assertion, zone });
    }
  }

  return [...parSujet.values()].map((groupe) => ({
    ...groupe,
    // « Toutes zones » d'abord : ce qui vaut partout se lit avant ce qui ne
    // vaut qu'ici.
    entrees: groupe.entrees.slice().sort((gauche, droite) =>
      rangDeLaZone(gauche.zone) - rangDeLaZone(droite.zone) || gauche.zone.localeCompare(droite.zone, "fr")),
    // Une valeur unique qui vaut partout n'ouvre pas de tableau : une paire de
    // crochets autour d'une seule entrée serait du bruit.
    tableau: !(groupe.entrees.length === 1 && groupe.entrees[0].zone === TOUTES_ZONES)
  }));
}

/** Le sujet d'une affirmation, en clair. */
function sujetDeLAssertion(assertion) {
  return texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
}

/**
 * Le versement qui a fait naître une ligne.
 *
 * Une proposition, ou une déclaration à la main — qui est un acte aussi, avec
 * son auteur et sa date. `""` pour ce qui n'appartient à personne : la balise
 * de zone et son accolade fermante ne sont écrites par aucun versement.
 */
export function versementDeLaLigne(assertion) {
  if (!assertion) return "";
  const proposition = texte(assertion.proposition_id);
  return proposition || (assertion.id ? `main:${texte(assertion.id)}` : "");
}

/**
 * Les lignes, groupées par versement.
 *
 * ## Pourquoi grouper
 *
 * Répéter « #P29 · 7 septembre 2026 » devant chaque bloc dit trente fois la
 * même chose. Un dépôt écrit l'origine **une fois**, en tête du groupe de
 * lignes qu'elle a versées, et trace un filet là où l'origine change. On lit
 * alors « ces quarante lignes viennent de là » d'un coup d'œil.
 *
 * La ligne vide appartient au bloc qu'elle précède : elle est née avec lui —
 * c'est son insertion qui l'a créée. Sans quoi elle laissait un blanc au
 * milieu d'un groupe, et le groupe paraissait coupé en deux.
 *
 * @returns {object[]} les mêmes lignes, avec `versement` et `debutDeGroupe`
 */
export function grouperParVersement(lignes = []) {
  const avecVersement = lignes.map((ligne, rang) => {
    if (ligne.nature !== "vide") return { ...ligne, versement: versementDeLaLigne(ligne.assertion) };

    // La suivante qui appartient à quelqu'un : c'est elle qui a fait naître ce
    // blanc.
    const suivante = lignes.slice(rang + 1).find((autre) => autre.assertion);
    return { ...ligne, versement: versementDeLaLigne(suivante?.assertion) };
  });

  let precedent = null;
  return avecVersement.map((ligne) => {
    const change = Boolean(ligne.versement) && ligne.versement !== precedent;
    if (ligne.versement) precedent = ligne.versement;
    return { ...ligne, debutDeGroupe: change };
  });
}

/**
 * Une ligne se cache-t-elle, vu ce qui est replié ?
 *
 * Elle se cache si **l'un de ses ancêtres** est replié — c'est ce qui rend le
 * pliage récursif : replier une zone emporte ses blocs et leurs détails, pas
 * seulement ses enfants immédiats.
 *
 * Sauf sa propre accolade fermante : un bloc replié garde ses deux bornes, et
 * l'on voit d'où à où il va sans reconstruire la paire.
 */
export function ligneCachee(ligne, plies) {
  if (!plies?.size) return false;
  return (ligne.ancetres ?? []).some((ancetre) => ancetre !== ligne.ferme && plies.has(ancetre));
}

/**
 * Un fichier : ce qu'il dit, ou qui l'a écrit.
 *
 * Le contenu est le même dans les deux lectures — c'est la marge qui change.
 * Deux rendus différents du même fichier finiraient par ne plus montrer la même
 * chose, et l'on ne saurait plus lequel croire.
 *
 * ## Le caret ne s'affiche qu'en lecture Code
 *
 * En lecture Origine, on cherche **qui a décidé** : replier un bloc y cacherait
 * précisément ce qu'on est venu voir. La colonne du caret n'existe donc que
 * dans Code, à droite des numéros de ligne.
 *
 * ## Une affirmation, plusieurs lignes
 *
 * La marge du Blame ne se répète pas sur chacune des lignes d'un bloc : elles
 * viennent toutes du même versement, et répéter le même numéro quatre fois
 * ferait croire à quatre décisions.
 */
export function renderFichier(fichier, {
  lecture = LECTURE.CODE, auteurs = new Map(), avatars = new Map(),
  propositions = new Map(), plies = new Set(), declares = null, variables = null, ouEcrit = null
} = {}) {
  const bornes = bornesDuFichier(fichier.lignes);
  const clair = fichierEnClair(fichier, { enClair: enClairDesJetons });
  const lignes = grouperParVersement(lignesAffichables(fichier, { ouEcrit, auteurs }));
  const pliable = lecture === LECTURE.CODE;

  const corps = lignes.map((ligne) => {
    const porteuse = ligne.assertion ?? ligneDuVersement(lignes, ligne.versement);
    const blame = porteuse ? blameDeLaLigne(porteuse, auteurs) : null;
    const replie = pliable && ligne.ouvre && plies.has(ligne.ouvre);
    const cachee = pliable && ligneCachee(ligne, plies);

    return `
      <div class="memoire-ligne${lecture === LECTURE.BLAME ? " memoire-ligne--blame" : ""}${
        ligne.nature === "detail" ? " memoire-ligne--detail" : ""
      }${replie ? " memoire-ligne--plie" : ""}${
        lecture === LECTURE.BLAME && ligne.debutDeGroupe && ligne.rang > 1 ? " memoire-ligne--versement" : ""
      }"
        style="--memoire-profondeur:${ligne.profondeur ?? 0}"
        data-memoire-ancetres="${escapeHtml((ligne.ancetres ?? []).join(" "))}"${
        ligne.ferme ? ` data-memoire-ferme="${escapeHtml(ligne.ferme)}"` : ""
      }${cachee ? " hidden" : ""}>
        ${
          // L'ancienneté colore **chaque** ligne, la première d'un bloc comme
          // les suivantes : c'est une bande continue qu'on lit sans y penser,
          // et un trait qui s'interrompt trois lignes sur quatre ne se lit plus.
          // Le blâme, lui, ne se répète pas : les lignes d'un bloc viennent du
          // même versement, et le redire quatre fois ferait croire à quatre
          // décisions.
          lecture === LECTURE.BLAME
            ? blame && ligne.debutDeGroupe
              ? `<button type="button" class="memoire-blame memoire-blame--chaleur-${chaleurDeLaLigne(ligne.assertion, bornes)}"
                   ${blame.propositionId ? `data-memoire-proposition="${escapeHtml(blame.propositionId)}"` : "disabled"}
                   title="${escapeHtml([blame.qui, blame.quand ? formatDate(blame.quand) : ""].filter(Boolean).join(" · ") || "origine inconnue")}">
                   <span class="memoire-blame__ref">${escapeHtml(blame.intitule)}</span>
                   <span class="memoire-blame__date">${escapeHtml(blame.quand ? formatDate(blame.quand) : "—")}</span>
                 </button>`
              : `<span class="memoire-blame memoire-blame--suite${
                  ligne.versement ? ` memoire-blame--chaleur-${chaleurDeLaLigne(ligne.assertion ?? ligneDuVersement(lignes, ligne.versement), bornes)}` : ""
                }" aria-hidden="true"></span>`
            : ""
        }
        <span class="memoire-ligne__num">${ligne.rang}</span>
        ${
          pliable
            ? ligne.ouvre
              ? `<button type="button" class="memoire-ligne__caret" data-memoire-plier-bloc="${escapeHtml(ligne.ouvre)}"
                   aria-expanded="${replie ? "false" : "true"}"
                   aria-label="${replie ? "Déplier ce bloc" : "Replier ce bloc"}">
                   ${svgIcon(replie ? "chevron-right" : "chevron-down", { className: "octicon" })}
                 </button>`
              : `<span class="memoire-ligne__caret" aria-hidden="true"></span>`
            : ""
        }
        <span class="memoire-ligne__code">${renderJetons(ligne.jetons, { declares, variables })}${
          ligne.ouvre
            ? `<span class="memoire-ligne__replie" aria-hidden="true">${svgIcon("fold", { className: "octicon" })}</span>`
            : ""
        }</span>
      </div>
    `;
  }).join("");

  const manquants = renvoisSansDeclaration(lignes, declares);

  return `
    ${renderDernierVersement(fichier.lignes, { auteurs, avatars, propositions })}
    <section class="memoire-fichier memoire-fichier--${escapeHtml(langageDeLExtension(fichier.extension))}">
      <header class="memoire-fichier__tete">
        <span class="memoire-fichier__lectures">
          ${[[LECTURE.CODE, "Code"], [LECTURE.BLAME, "Origine"]]
            .map(([cle, libelle]) => `
              <button type="button" class="memoire-lecture${lecture === cle ? " is-active" : ""}"
                data-memoire-lecture="${cle}" aria-pressed="${lecture === cle}">${libelle}</button>
            `)
            .join("")}
        </span>
        <span class="memoire-fichier__mesure">${lignes.length} ligne${lignes.length > 1 ? "s" : ""} · ${octets(clair)}</span>
        <span class="memoire-fichier__espace"></span>
        ${renderBoutonCopier({
          cible: `fichier:${adresseDuFichier(fichier)}`,
          className: "memoire-fichier__copier",
          titre: "Copier le fichier dans le presse-papiers",
          titreCopie: "Fichier copié"
        })}
      </header>
      ${lecture === LECTURE.BLAME ? renderEchelleDAnciennete(fichier.lignes, { auteurs, avatars }) : ""}
      ${
        // `.mdall` n'est pas une nature, c'est l'absence de nature. Un fichier
        // qui porte cette extension dit qu'un utilitaire a versé sans se
        // prononcer : ses lignes ne se colorent pas, ne se rangent pas, et
        // personne ne saura si elles s'imposent ou si elles se supposent. Le
        // taire laisserait ce fichier grossir sans que rien ne le signale.
        fichier.extension === SANS_NATURE
          ? `<p class="memoire-fichier__manquants">
               ${svgIcon("alert", { className: "octicon" })}
               <b>Sans nature.</b> Ce que ce fichier contient n'a pas été déclaré :
               ni règle, ni donnée de base, ni contrainte. Il ne devrait pas exister —
               l'utilitaire qui a versé ces lignes ne s'est pas prononcé.
             </p>`
          : ""
      }
      ${
        manquants.length
          ? `<p class="memoire-fichier__manquants">
               ${svgIcon("alert", { className: "octicon" })}
               <b>${manquants.length}</b> renvoi${manquants.length > 1 ? "s" : ""} sans déclaration —
               ${escapeHtml(manquants.slice(0, 4).join(", "))}${manquants.length > 4 ? "…" : ""}.
               Ce fichier s'appuie sur ce que personne n'a versé.
             </p>`
          : ""
      }
      <div class="memoire-fichier__corps">
        ${corps || `<p class="review-empty-note">Ce fichier ne porte plus aucune valeur : tout ce qu'il contenait a été remplacé ou écarté.</p>`}
      </div>
      ${
        fichier.ecartees.length
          ? `<footer class="memoire-fichier__ecartees">
               <b>${fichier.ecartees.length} écartée${fichier.ecartees.length > 1 ? "s" : ""}</b>
               <p>Un refus est une information — mais ce n'est pas une valeur du projet.</p>
               ${fichier.ecartees.map((assertion) => `
                 <div class="memoire-ligne memoire-ligne--ecartee">
                   <span class="memoire-ligne__code">${renderJetons(jetonsDeLAssertion(assertion))}</span>
                 </div>`).join("")}
             </footer>`
          : ""
      }
    </section>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * La recherche
 * ───────────────────────────────────────────────────────────────────────────── */

/** Sans accents ni casse : « Bâtiment » se trouve en tapant « batiment ». */
function pourChercher(valeur) {
  return String(valeur ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Les lignes de la mémoire qui portent les mots cherchés.
 *
 * On cherche dans le **texte du fichier**, pas dans les champs de la base :
 * c'est ce que l'écran montre, et une recherche qui trouverait autre chose que
 * ce qu'on lit ne serait pas croyable. Tous les mots doivent y être, dans
 * n'importe quel ordre.
 */
export function lignesTrouvees(memoire, query = "") {
  const mots = pourChercher(query).split(/\s+/).filter(Boolean);
  if (!mots.length) return [];

  return (memoire.fichiers ?? [])
    .map((fichier) => {
      const lignes = lignesAffichables(fichier).filter((ligne) => {
        if (!ligne.jetons.length) return false;
        const clair = pourChercher(enClairDesJetons(ligne.jetons));
        return mots.every((mot) => clair.includes(mot));
      });
      return { fichier, lignes };
    })
    .filter((trouvaille) => trouvaille.lignes.length);
}

/**
 * Les pièces déposées dont le nom porte les mots cherchés.
 *
 * Un PDF n'a pas de texte que l'écran montre : on cherche donc son **nom**, et
 * on le dit. Prétendre chercher dans son contenu alors qu'on n'y a pas accès
 * ferait conclure qu'il n'y est pas.
 */
export function piecesTrouvees(pieces = [], query = "") {
  const mots = pourChercher(query).split(/\s+/).filter(Boolean);
  if (!mots.length) return [];

  return (Array.isArray(pieces) ? pieces : []).filter((piece) => {
    const nom = pourChercher(piece?.name || piece?.original_filename || piece?.filename || "");
    return nom && mots.every((mot) => nom.includes(mot));
  });
}

/** Les pièces trouvées, en tête des résultats : elles s'ouvrent, elles ne se lisent pas ici. */
function renderPiecesTrouvees(pieces = []) {
  if (!pieces.length) return "";

  return `
    <p class="memoire-recherche-resultats__compte">
      <b>${pieces.length} pièce${pieces.length > 1 ? "s" : ""} déposée${pieces.length > 1 ? "s" : ""}</b>
      — cherchée${pieces.length > 1 ? "s" : ""} par leur nom
    </p>
    <div class="memoire-liste memoire-liste--tableau">
      ${pieces
        .map((piece) => `
          <button type="button" class="memoire-entree memoire-entree--fichier"
            data-tree-document-id="${escapeHtml(String(piece?.id || ""))}">
            <span class="memoire-entree__nom">
              <span class="memoire-entree__icone">${svgIcon("file", { className: "octicon" })}</span>
              ${escapeHtml(String(piece?.name || piece?.original_filename || piece?.filename || "Document"))}
            </span>
            <span class="memoire-entree__message">Documents</span>
            <span class="memoire-entree__date">${escapeHtml(
              piece?.updated_at || piece?.updatedAt ? ilYA(piece.updated_at || piece.updatedAt) : "—"
            )}</span>
          </button>
        `)
        .join("")}
    </div>
  `;
}

/**
 * Ce que la recherche a trouvé, fichier par fichier.
 *
 * La ligne garde **son numéro** : c'est ce qui permet de la retrouver dans le
 * fichier une fois ouvert, et une liste de résultats renumérotée de 1 à n
 * n'aiderait personne à y revenir.
 */
export function renderRecherche(memoire, query = "", { pieces = [] } = {}) {
  const trouvailles = lignesTrouvees(memoire, query);
  const deposees = piecesTrouvees(pieces, query);

  if (!trouvailles.length && !deposees.length) {
    return `<div class="propositions-empty"><b>Rien ne porte ces mots</b>
      <p>Le projet ne dit rien de « ${escapeHtml(query)} », et n'a rien reçu qui s'appelle ainsi.</p></div>`;
  }

  const lignes = trouvailles.reduce((total, trouvaille) => total + trouvaille.lignes.length, 0);

  return `
    <div class="memoire-recherche-resultats">
      ${renderPiecesTrouvees(deposees)}
      ${!lignes ? "" : `<p class="memoire-recherche-resultats__compte">
        <b>${lignes} ligne${lignes > 1 ? "s" : ""}</b> dans
        ${trouvailles.length} fichier${trouvailles.length > 1 ? "s" : ""} de la mémoire
      </p>`}
      ${trouvailles
        .map(({ fichier, lignes: trouvees }) => `
          <section class="memoire-fichier memoire-fichier--trouvaille">
            <header class="memoire-fichier__tete">
              <button type="button" class="memoire-recherche-resultats__fichier"
                data-memoire-aller="${escapeHtml(adresseDuFichier(fichier))}">
                ${svgIcon("file", { className: "octicon" })}
                ${escapeHtml(nomDuFichier(fichier))}
              </button>
              <span class="memoire-fichier__mesure">${trouvees.length} ligne${trouvees.length > 1 ? "s" : ""}</span>
            </header>
            <div class="memoire-fichier__corps">
              ${trouvees
                .map((ligne) => `
                  <div class="memoire-ligne">
                    <span class="memoire-ligne__num">${ligne.rang}</span>
                    <span class="memoire-ligne__code">${renderJetons(ligne.jetons)}</span>
                  </div>
                `)
                .join("")}
            </div>
          </section>
        `)
        .join("")}
    </div>
  `;
}

/** Une affirmation de ce versement, pour en lire la date et l'auteur. */
function ligneDuVersement(lignes, versement) {
  if (!versement) return null;
  return lignes.find((ligne) => ligne.assertion && ligne.versement === versement)?.assertion ?? null;
}

/** Le poids d'un fichier, comme un dépôt l'affiche. */
export function octets(contenu) {
  const taille = typeof TextEncoder === "function"
    ? new TextEncoder().encode(String(contenu ?? "")).length
    : String(contenu ?? "").length;
  return taille < 1024 ? `${taille} octets` : `${(taille / 1024).toFixed(1)} Ko`;
}

/** Les jetons, remis à plat — ce que le presse-papiers reçoit. */
function enClairDesJetons(jetons = []) {
  return jetons.map((entree) => entree.texte).join("");
}

/** Le fichier, en clair — ce que le bouton met dans le presse-papiers. */
export function fichierEnClair(fichier, { enClair } = {}) {
  const lignes = [
    `fichier: ${cheminDeFichier(fichier.chemin, fichier.extension)}`,
    "",
    ...lignesAffichables(fichier).map((ligne) => enClair(ligne.jetons))
  ];

  if (fichier.ecartees.length) {
    lignes.push("", `¶ ${fichier.ecartees.length} écartée(s)`);
    lignes.push(...fichier.ecartees.map((assertion) => `— ${enClair(jetonsDeLAssertion(assertion))}`));
  }

  return lignes.join("\n");
}

/**
 * Une fonction, une fois — quelle que soit la zone où elle s'applique.
 *
 * Le même raisonnement versé pour trois bâtiments produit trois affirmations,
 * qui ne diffèrent que par leur portée. Les écrire trois fois donnerait trois
 * fonctions identiques à relire, et à corriger séparément le jour où le texte
 * change : c'est exactement ce qu'une mémoire est censée éviter.
 *
 * On garde la première, et la portée devient ce qu'elle a toujours été — un
 * paramètre.
 */
export function fonctionsSansDoublon(lignes = []) {
  const vues = new Set();
  const gardees = [];

  for (const assertion of Array.isArray(lignes) ? lignes : []) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!cle || vues.has(cle)) continue;
    vues.add(cle);
    gardees.push(assertion);
  }

  return gardees;
}

/**
 * Le fichier où une variable est déclarée, pour un `importe`.
 *
 * À défaut, le dictionnaire : il les liste toutes, y compris celles que
 * personne n'a versées. Renvoyer vers lui n'est pas un pis-aller — c'est
 * exactement l'endroit où l'on verra qu'elle manque.
 */
function fichierQuiDeclare(nom, ouEcrit) {
  const dit = ouEcrit instanceof Map ? texte(ouEcrit.get(cleDuSujet(nom))) : "";
  return dit || FICHIER_DES_VARIABLES;
}

/**
 * Où une règle enregistre ce qu'elle conclut, quand la mémoire le sait.
 *
 * `null` quand elle ne le sait pas : la règle conclut alors sans dire où, ce
 * qui est la vérité du moment. Deviner un fichier ferait lire « écrit dans
 * incendie.ctr » là où rien n'est écrit.
 */
function fichierOuEcrire(sujet, ouEcrit) {
  const dans = ouEcrit instanceof Map ? texte(ouEcrit.get(cleDuSujet(sujet))) : "";
  return dans ? { dans } : null;
}

/**
 * Ce qu'une fonction fait, quand personne ne l'a écrit.
 *
 * ## Pourquoi on ne se tait pas
 *
 * Une fonction sans commentaire oblige à lire ses conditions pour deviner son
 * objet. Sur douze mille fonctions, personne ne le fera : on en réécrira une
 * treize millième plutôt que de comprendre celle qui existe.
 *
 * On n'invente donc pas une description — on **nomme le manque**. Une phrase
 * qui dit « à décrire » se voit dans le fichier, se cherche d'un coup d'œil, et
 * appelle quelqu'un à l'écrire ; une ligne absente ne se voit pas.
 */
export function quoiParDefaut(sujet) {
  const nom = texte(sujet);
  return nom ? `À DÉCRIRE — à quoi sert « ${nom} » ? Ce que la fonction établit, et dans quel cas on l'applique.` : "";
}

/**
 * Une affirmation de la mémoire, en un bloc.
 *
 * ## Ce qu'un bloc porte, et ce qu'il ne porte plus
 *
 * La donnée et sa valeur en tête ; d'où elle vient, indentée dessous ; la
 * preuve sous sa provenance ; le statut en dernier. Quatre objets, quatre
 * lignes, et l'indentation dit à quoi chacune se rapporte.
 *
 * **La règle n'y est plus.** Une règle vaut pour mille projets, une valeur pour
 * un seul : elle vit dans un fichier de référentiel, et la ligne dit seulement
 * de laquelle la valeur sort. La recopier ici en produisait des fausses — « si
 * hauteur = 26 » — vraies d'un bâtiment et d'aucun autre.
 *
 * **`dépend de` n'y est plus** non plus : la dépendance se déduit des
 * conditions de la règle, et une dépendance recopiée diverge le jour où
 * quelqu'un modifie la règle sans y penser.
 *
 * @returns {{jetons: object[], nature: string}[]}
 */
export function lignesDeLAssertion(assertion = {}, profondeur = 0, {
  ouEcrit = null, auteurs = null, zone = "", virgule = false
} = {}) {
  const payload = assertion.payload ?? {};
  const brute = texte(payload.value) || texte(assertion.statement);
  const coupe = brute && estMesuree(brute) ? couperLUnite(brute) : { nombre: brute, unite: "" };

  // Une règle appliquée s'écrit comme une règle : la donnée en tête, sans `=`,
  // puis ses conditions. Écrite comme une affirmation, elle se lirait comme un
  // fait de ce projet — et c'est justement ce qu'elle n'est pas.
  //
  // `alors` n'est pas stocké : c'est `payload.value`, et une valeur écrite à
  // deux endroits finit par diverger. On la remet ici.
  if (payload.regle) {
    const sujet = texte(payload.subject) || texte(assertion.subject_key);
    const conditions = payload.regle.conditions ?? [];
    const exceptions = payload.regle.sauf ?? [];

    const regle = blocDeRegle({
      sujet,
      quoi: texte(payload.quoi) || quoiParDefaut(sujet),
      // D'où viennent ses entrées : le fichier qui déclare chacune, quand la
      // mémoire le sait. À défaut le dictionnaire, qui les liste toutes — même
      // celles que personne n'a versées, et c'est là qu'on le verra.
      importe: [...conditions, ...exceptions]
        .map((condition) => texte(condition?.sujet))
        .filter(Boolean)
        .filter((nom, rang, tous) => tous.indexOf(nom) === rang)
        .map((nom) => ({ variable: nom, depuis: fichierQuiDeclare(nom, ouEcrit) })),
      conditions,
      alors: brute,
      sinon: texte(payload.regle.sinon),
      sauf: exceptions,
      provenance: provenanceDeLAssertion(assertion, { auteurs }),
      preuve: texte(payload.citation),
      // Où le résultat s'écrit. On ne l'invente pas : si la mémoire ne porte
      // pas encore la valeur produite, la règle conclut sans dire où — ce qui
      // est la vérité du moment.
      enregistre: fichierOuEcrire(sujet, ouEcrit)
    }, profondeur);
    return regle.map((jetons, rang) => ({ nature: rang === 0 ? "regle" : "detail", jetons }));
  }

  const lignes = blocDAffirmation({
    sujet: texte(payload.subject) || texte(assertion.subject_key),
    valeur: coupe.nombre,
    unite: coupe.unite,
    // La date d'un constat : elle passe avant la provenance, parce qu'un
    // constat se situe d'abord dans le temps.
    le: texte(payload.le) || (texte(assertion.nature) === "constat" ? dateLisible(assertion.decided_at) : ""),
    provenance: provenanceDeLAssertion(assertion, { auteurs }),
    preuve: texte(payload.citation),
    statut: statutDeLAssertion(assertion),
    // Dans un tableau de valeurs, la tête porte la zone : le sujet est écrit
    // une fois, au-dessus.
    zone,
    virgule
  }, profondeur);

  return lignes.map((jetons, rang) => ({ nature: rang === 0 ? "affirmation" : "detail", jetons }));
}

/** Une date, en clair. Un constat sans date ne vaut rien. */
function dateLisible(valeur) {
  const date = new Date(valeur);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * D'où une valeur vient, et donc comment elle a été obtenue.
 *
 * Le **type de la provenance est l'origine** : une ligne qui renvoie à une
 * règle est déduite, une ligne qui renvoie à un plan est lue, une ligne qui
 * renvoie à un calcul est calculée. Rien de plus à déclarer — un champ
 * « origine » à côté redirait la même chose, et finirait par la contredire.
 *
 * L'ordre de lecture n'est pas arbitraire : le calcul l'emporte sur la règle,
 * qui l'emporte sur le texte. Une valeur calculée à partir d'une règle se
 * refait en refaisant le calcul, et c'est cela qu'on veut savoir en premier.
 */
export function provenanceDeLAssertion(assertion = {}, { auteurs = null } = {}) {
  const payload = assertion.payload ?? {};

  // Qui a tranché, et quand. La mémoire le sait pour chaque ligne, et ne le
  // montrait que dans la lecture « Origine ». Une décision est le seul cas où
  // cela appartient à la ligne elle-même : sans nom ni date, un choix se relit
  // comme un fait.
  const signature = {
    par: auteurs instanceof Map ? texte(auteurs.get(texte(assertion?.decided_by))) : "",
    le: dateLisible(assertion?.decided_at)
  };

  const declaree = payload.provenance ?? null;
  if (declaree && texte(declaree.type) && texte(declaree.quoi)) {
    return texte(declaree.type) === PROVENANCE.DECISION
      ? { type: texte(declaree.type), quoi: texte(declaree.quoi), ...signature }
      : { type: texte(declaree.type), quoi: texte(declaree.quoi) };
  }

  const calcul = payload.deduitDe ?? null;
  if (calcul && texte(calcul.calcul)) {
    const entrees = (calcul.entrees ?? [])
      .map((entree) => [texte(entree?.sujet), texte(entree?.valeur)].filter(Boolean).join(" = "))
      .filter(Boolean);
    return { type: PROVENANCE.CALCUL, quoi: `${texte(calcul.calcul)}${entrees.length ? ` (${entrees.join(" ; ")})` : ""}` };
  }

  const texteApplique = [texte(payload.source), texte(payload.article)].filter(Boolean).join(", ");
  if (!texteApplique) return null;

  // Une contrainte sort d'un texte appliqué ; une donnée de base est relevée
  // dans une pièce du projet. C'est la nature qui le dit, et elle le sait.
  return {
    type: texte(assertion?.nature) === "contrainte" ? PROVENANCE.TEXTE : PROVENANCE.DOCUMENT,
    quoi: texteApplique
  };
}

/**
 * L'état du raisonnement dans ce projet.
 *
 * Il vient de l'utilitaire quand celui-ci le dit. Sinon il se lit sur ce que la
 * mémoire sait déjà : une hypothèse **se suppose**, une affirmation remplacée
 * n'est plus l'état, un refus n'est pas une valeur du projet. Écrire une
 * hypothèse comme un fait est exactement l'erreur que cette mémoire existe
 * pour éviter.
 */
export function statutDeLAssertion(assertion = {}) {
  const dit = texte(assertion?.payload?.statut);
  if (dit) return dit;

  if (texte(assertion?.status) === "rejected") return STATUT.ECARTE;
  if (texte(assertion?.superseded_by)) return STATUT.REMPLACE;
  if (texte(assertion?.nature) === "hypothese") return STATUT.SUPPOSE;
  return STATUT.RETENU;
}

/**
 * Une affirmation, sur sa seule ligne de valeur — sans son détail.
 *
 * L'accolade tombe : elle borne un bloc, et il n'y a pas de bloc quand la ligne
 * est citée seule. Une ouvrante sans fermante se lirait comme une faute.
 */
export function jetonsDeLAssertion(assertion = {}) {
  const tete = lignesDeLAssertion(assertion)[0].jetons.filter((jeton) => jeton.texte !== "{");
  // L'espace qui précédait l'accolade n'a plus rien à séparer.
  while (tete.length && !tete[tete.length - 1].texte.trim()) tete.pop();
  return tete;
}

/**
 * Les jetons d'une ligne, colorés.
 *
 * Un sujet porte en plus **ce qu'il vaut** : il se pose, il renvoie à quelque
 * chose de connu, ou il renvoie à rien. C'est cette dernière couleur qui
 * transforme la mémoire en quelque chose qui se vérifie en la lisant — une
 * condition qui porte sur une donnée jamais versée se voit sans la chercher.
 */
function renderJetons(jetons = [], { declares = null, variables = null } = {}) {
  return jetons
    .map((entree) => {
      const resolution = entree.type === "sujet"
        ? resolutionDuSujet(entree.texte, { jetons, declares })
        : "";
      const classes = `mdall-${escapeHtml(entree.type)}${resolution ? ` mdall-sujet--${resolution}` : ""}`;
      const dit = entree.type === "sujet" ? contexteDuSujet(entree.texte, { resolution, variables }) : "";
      return `<span class="${classes}"${dit ? ` title="${escapeHtml(dit)}"` : ""}>${escapeHtml(entree.texte)}</span>`;
    })
    .join("");
}

/**
 * Ce qu'un nom dit de lui-même, au survol.
 *
 * ## Pourquoi cela ne peut pas attendre
 *
 * « Hauteur du plancher bas » et « Hauteur du dernier plancher » sont deux
 * variables ; à la lecture d'une condition, on ne sait pas laquelle on regarde
 * sans aller ouvrir le fichier qui la déclare. Se tromper entre deux noms
 * voisins ne se voit pas : la règle reste vraie d'apparence, et fausse.
 *
 * Le survol donne donc ce que l'écran de suivi des variables donne — ce qu'elle
 * vaut aujourd'hui, où elle est déclarée, combien de fois elle sert — sans
 * quitter la ligne qu'on lit.
 */
export function contexteDuSujet(sujet, { resolution = "", variables = null } = {}) {
  const nom = texte(sujet);
  if (!nom) return "";

  const variable = variables instanceof Map ? variables.get(cleDuSujet(nom)) : null;
  if (!variable) {
    return resolution === "inconnu"
      ? `${nom}\nAucune ligne de la mémoire ne la déclare : ce renvoi ne mène nulle part.`
      : "";
  }

  const lignes = [nom];
  const { type, unite } = typeDeLaValeur(variable.valeur);
  lignes.push([type, unite].filter(Boolean).join(" · "));

  if (variable.declaree) {
    lignes.push(`vaut ${variable.valeur || "—"}`);
    lignes.push(`déclarée dans ${variable.declarePar}`);
  } else {
    lignes.push("personne ne l'a versée");
  }

  // Les fonctions qui l'emploient, nommément : savoir dans quel fichier
  // chercher ne dit pas quoi y lire, et c'est ce qu'on veut avant de réutiliser
  // un nom ou d'en créer un autre.
  const usages = Array.isArray(variable.usages) ? variable.usages : [];
  lignes.push(usages.length
    ? `${usages.length} usage${usages.length > 1 ? "s" : ""} — ${
        usages.map((usage) => `${usage.fonction} (${usage.fichier})`).join(", ")}`
    : variable.citeePar.length
      ? `${variable.citeePar.length} fichier${variable.citeePar.length > 1 ? "s" : ""} — ${variable.citeePar.join(", ")}`
      : "aucun usage");

  return lignes.join("\n");
}

function formatDate(valeur) {
  const date = new Date(valeur);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export { cleHtml };
