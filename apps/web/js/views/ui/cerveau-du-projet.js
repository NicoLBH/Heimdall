/**
 * Le cerveau du projet : voir le raisonnement en entier, et le faire réagir.
 *
 * ## Pourquoi un écran, alors que tout est déjà lisible
 *
 * Parce que « lisible » et « visible » ne sont pas la même chose. Le tableau,
 * l'étude d'impact et l'audit répondent chacun à une question, posée une à une.
 * Aucun ne montre la **forme** : combien de strates, où est le socle, où sont les
 * nœuds qu'on ne sait pas refaire, et jusqu'où une valeur se propage.
 *
 * Un projet de quatre cents affirmations se lisait par le trou d'une serrure.
 *
 * ## Deux vues, et elles ne disent pas la même chose
 *
 * **Les strates** rangent les nœuds en colonnes, une par pas depuis le socle.
 * C'est la vue qui répond à *dans quel ordre* : on suit une chaîne de gauche à
 * droite, on compte les pas.
 *
 * **Le volume** met le socle au centre et éloigne chaque strate en coquilles
 * concentriques. C'est la vue qui répond à *où est la matière* : une strate
 * chargée fait une coquille dense, une strate maigre un semis clairsemé. Les
 * colonnes ne montraient pas cela — sur un vrai projet, elles empilaient trois
 * cents nœuds sur une seule verticale, et l'on ne voyait plus rien.
 *
 * ## Deux modes, et ils ne posent pas la même question
 *
 * **L'onde au clic** répond à *qu'est-ce qui repose là-dessus ?*. Elle part d'une
 * valeur et remonte les liens strate par strate ; la profondeur cesse d'être un
 * chiffre et devient des pulsations qu'on regarde passer.
 *
 * **Le battement** répond à *où ça ne va pas ?*. Le projet pense tout seul —
 * les impulsions partent du socle en boucle — et ce que l'audit signale bat en
 * rouge, sans qu'on ait rien demandé.
 *
 * ## Ce que l'écran refuse de faire joli
 *
 * **L'onde est `impactDe`** et **les signaux sont `auditerLaMemoire`**, sans une
 * ligne de plus. Si ce dessin ment, l'étude d'impact et l'audit mentent aussi, et
 * les trois se corrigent ensemble. Un écran qui jugerait de son côté finirait par
 * ne pas signaler les mêmes choses, et l'on ne saurait plus lequel croire.
 *
 * **Un nœud qu'on ne sait pas refaire ne s'allume pas comme les autres.** Il
 * dépend — c'est vrai — mais d'un halo creux, et le compteur le range à part.
 *
 * **Les liens disent d'où ils viennent.** Sans lectures enregistrées, ils sont
 * déduits d'une ressemblance de noms, et le bandeau le dit. Une belle image tirée
 * d'à-peu-près serait le pire de ce qu'on puisse produire.
 *
 * **Rien ne s'écrit, et rien ne s'ouvre.** Un clic pose une question au graphe,
 * pas au projet.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { NOEUD } from "../../services/memoire-plan.js";
import {
  GENRE, avalDeLaRegle, cerveauDuProjet, chaleurDuLien, chaleurDuNoeud, dansLEnveloppe, dilaterLEnveloppe,
  dispositionDuCerveau, dispositionEnVolume, domainesDuCerveau, enveloppeConvexe, noeudsIsoles,
  ondeDepuis, partDeLaMemoire, pencherVersLesDomaines, phraseDuSignal, separerLesGenres, signauxDeLAudit,
  valeursDeLOnde
} from "../../services/memoire-cerveau.js";

const texte = (valeur) => String(valeur ?? "").trim();
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);
const borne = (valeur, bas, haut) => Math.min(haut, Math.max(bas, valeur));

/** Combien de temps une strate met à s'allumer. Assez lent pour être compté. */
const PAS_DE_LONDE = 260;
/** Combien de temps une impulsion reste visible après son passage. */
const TENUE = { onde: 3200, battement: 1800 };
/** L'écart entre deux impulsions du battement. Un pouls, pas une agitation. */
const POULS = 1100;

/**
 * Les trois natures, et leur traitement.
 *
 * Ce sont les couleurs de la mémoire — un écran qui inventerait les siennes
 * demanderait d'apprendre deux langages pour une seule chose.
 */
const NATURES = {
  [NOEUD.SOCLE]: { nom: "Socle", trait: "#3fb950", quoi: "ce que le projet pose, suppose ou constate" },
  [NOEUD.REJOUABLE]: { nom: "Rejouable", trait: "#58a6ff", quoi: "une règle du projet le conclut : il se rejoue ici" },
  [NOEUD.OPAQUE]: { nom: "Opaque", trait: "#8b949e", quoi: "un utilitaire le déduit : on sait qu'il dépend" }
};

/**
 * Les mêmes trois couleurs, en composantes.
 *
 * Le canevas dessine en `rgba(...)` avec une opacité calculée ; répéter les
 * hexadécimaux ici ferait deux tables d'une seule vérité, et le jour où l'une
 * change l'autre ne suit pas.
 */
const TEINTES = {
  [NOEUD.SOCLE]: "63,185,80",
  [NOEUD.REJOUABLE]: "88,166,255",
  [NOEUD.OPAQUE]: "139,148,158"
};

/** Ce que l'audit signale bat de cette couleur, et d'aucune autre à l'écran. */
const ROUGE = "248,81,73";

/**
 * Le violet d'une règle.
 *
 * Une règle n'a pas de nature de valeur — ce n'est pas une valeur. Lui donner le
 * bleu du rejouable la ferait passer pour une conclusion parmi les autres, alors
 * qu'elle est le mécanisme qui les produit.
 */
const REGLE = "163,113,247";

/**
 * La couleur d'une impulsion, selon ce que l'écran est en train de dire.
 *
 * En **nature**, le bleu : c'est la couleur de ce qui se rejoue, et l'onde parle
 * de rejeu.
 *
 * En **chaleur**, surtout pas de bleu pour une valeur : un écran entièrement
 * orange où l'onde passerait en bleu ferait deux langages à la fois, et l'on
 * croirait que le bleu *veut dire* quelque chose de plus froid, alors qu'il ne
 * dit que « ceci vient de s'allumer ».
 *
 * L'éclat reste donc **dans la couleur de sa famille**, poussé au haut de son
 * dégradé : une valeur qui s'allume devient de l'orange incandescent, une règle
 * du bleu incandescent. Le blanc était l'erreur inverse — il effaçait la famille
 * au moment précis où l'onde la traverse, c'est-à-dire au moment où on la
 * regarde.
 */
const ECLAT = {
  nature: {
    valeur: { vif: "88,166,255", coeur: "160,205,255" },
    fonction: { vif: "163,113,247", coeur: "208,178,255" }
  },
  chaleur: {
    valeur: { vif: "255,173,96", coeur: "255,216,167" },
    fonction: { vif: "120,190,255", coeur: "190,226,255" }
  }
};

/** L'éclat de la famille d'un nœud, dans la couleur en cours. */
function eclatDeLaFamille(couleur, genre) {
  const table = ECLAT[couleur] ?? ECLAT.nature;
  return genre === GENRE.FONCTION ? table.fonction : table.valeur;
}

/**
 * Le dégradé de chaleur : du froid au brûlant, puis le rouge à part.
 *
 * L'orange est celui de l'écran Incendie (`#f0883e`), où ce dégradé est né. Le
 * réemployer plutôt que d'en inventer un évite d'apprendre deux langages pour la
 * même idée : *plus c'est chaud, plus il s'en passe*.
 *
 * Le **rouge est hors de l'échelle**, et c'est délibéré. Il ne dit pas « très
 * chaud », il dit « l'audit signale ». Si le rouge était le bout du dégradé, un
 * nœud très employé se lirait comme un nœud malade, et l'on apprendrait à ignorer
 * la couleur qui compte.
 */
const CHALEUR = [
  { a: 0, teinte: [88, 110, 140] },
  { a: 0.35, teinte: [187, 128, 9] },
  { a: 0.7, teinte: [240, 136, 62] },
  { a: 1, teinte: [255, 173, 96] }
];

/**
 * Le même dégradé pour les **règles**, en bleu.
 *
 * Deux familles de nœuds, deux dégradés : c'est ce qui les rend séparables d'un
 * coup d'œil sur un écran entier d'orange. La forme le disait déjà — losange,
 * cube —, mais une forme se distingue de près et une couleur se distingue de
 * loin, et c'est de loin qu'on regarde un cerveau.
 *
 * L'échelle reste la même : mêmes arrêts, même racine, même sens. Un bleu vif et
 * un orange vif disent la même chose de deux choses différentes — « il passe
 * beaucoup par là ». Sans ce parallèle, on aurait appris deux langages.
 */
const CHALEUR_REGLE = [
  { a: 0, teinte: [70, 92, 132] },
  { a: 0.35, teinte: [56, 118, 199] },
  { a: 0.7, teinte: [88, 166, 255] },
  { a: 1, teinte: [150, 208, 255] }
];

/** La teinte d'une chaleur, interpolée entre deux arrêts du dégradé. */
function teinteDeLaChaleur(chaleur, echelle = CHALEUR) {
  const t = borne(Number(chaleur) || 0, 0, 1);
  for (let i = 1; i < echelle.length; i += 1) {
    if (t > echelle[i].a) continue;
    const bas = echelle[i - 1];
    const haut = echelle[i];
    const part = (t - bas.a) / (haut.a - bas.a || 1);
    return bas.teinte.map((canal, k) => Math.round(canal + (haut.teinte[k] - canal) * part)).join(",");
  }
  return echelle.at(-1).teinte.join(",");
}

/** La chaleur d'un nœud, dans le dégradé de sa famille. */
function teinteDuNoeud(noeud, poidsMax) {
  return teinteDeLaChaleur(
    chaleurDuNoeud(noeud, poidsMax),
    noeud.genre === GENRE.FONCTION ? CHALEUR_REGLE : CHALEUR
  );
}

/**
 * Le cadrage de départ de chaque vue.
 *
 * Elles n'ont pas le même cadrage naturel : les colonnes remplissent la largeur
 * d'elles-mêmes, le volume est une boule qu'il faut approcher pour qu'elle ne
 * flotte pas au milieu d'un écran vide. Un seul réglage pour les deux laissait
 * l'une des deux mal posée.
 */
/**
 * Le zoom auquel un clic amène, par vue.
 *
 * C'est un **plancher** : on n'approche que si l'on était plus loin. Le volume
 * demande davantage — la boule tient dans un cercle, et ses nœuds y sont plus
 * serrés que les colonnes ne le sont dans la largeur de l'écran.
 */
const APPROCHE = { strates: 2.1, volume: 3 };

/** La part du chemin restant parcourue à chaque image. Sous 0,1, ça traîne. */
const PAS_DU_VISEUR = 0.13;

const CADRAGE = {
  strates: { zoom: 1, dx: 0, dy: 0, orbite: 0, elevation: 0 },
  // Reculé depuis que la boule est coupée en deux : les deux calottes s'étirent
  // vers les pôles, et à 1,7 le raisonnement sortait par le bas du cadre.
  volume: { zoom: 1.45, dx: 0, dy: 0, orbite: 0.6, elevation: 0.42 }
};

/* ────────────────────────────────────────────────────────────────────────────
 * Le cadre
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * L'échelle de chaleur, dite en clair.
 *
 * Un dégradé sans échelle est une décoration : on voit que c'est plus orange à
 * droite sans savoir ce que « plus orange » veut dire. Ici, il veut dire *plus de
 * raisonnement passe par là* — et le rouge, à part, veut dire tout autre chose.
 */
function renderEchelleDeChaleur(cerveau, signales) {
  const bande = (echelle) => [0, 0.2, 0.4, 0.6, 0.8, 1]
    .map((chaleur) => `<i style="--trait:rgb(${teinteDeLaChaleur(chaleur, echelle)})"></i>`).join("");

  return `
    <div class="cerveau-legende" data-cerveau-legende="chaleur" hidden>
      <span class="cerveau-legende__item cerveau-legende__echelle">
        <span class="cerveau-echelle">${bande(CHALEUR)}</span>
        <b>Ce qui passe par une valeur</b>
        <small>emplois et liens réunis — la taille suit le même poids</small>
      </span>
      ${
        // Deux familles, deux dégradés, une seule échelle : le bleu ne dit pas
        // autre chose que l'orange, il le dit d'autre chose. Sur un écran entier
        // d'orange, une règle se retrouve de loin.
        cerveau.compte.fonctions
          ? `<span class="cerveau-legende__item cerveau-legende__echelle">
              <span class="cerveau-echelle">${bande(CHALEUR_REGLE)}</span>
              <b>Ce qui passe par une règle</b>
              <small>même échelle, en bleu — losange à plat, cube en volume</small>
            </span>
            <span class="cerveau-legende__item">
              <b>Un lien resté orange</b>
              <small>ne passe par aucune règle du projet : un utilitaire l'a déduit,
                ou le lien vient d'un rapprochement de noms</small>
            </span>`
          : ""
      }
      ${
        signales
          ? `<span class="cerveau-legende__item cerveau-legende__item--signale">
              <i></i>
              <b>${signales} ${accorde(signales, "signalée", "signalées")}</b>
              <small>hors de l'échelle : le rouge dit que l'audit signale, pas que c'est chaud</small>
            </span>`
          : ""
      }
      <span class="cerveau-legende__item">
        <b>La forme dit la nature</b>
        <small>plein pour le socle, cerclé pour ce qui se rejoue, creux pour l'opaque</small>
      </span>
    </div>
  `;
}

function renderLegende(cerveau, signales) {
  const auServeur = cerveau.compte.auServeur;

  return `
    <div class="cerveau-legende" data-cerveau-legende="nature">
      ${Object.entries(NATURES).map(([nature, quoi]) => `
        <span class="cerveau-legende__item cerveau-legende__item--${nature}">
          <i style="--trait:${quoi.trait}"></i>
          <b>${escapeHtml(quoi.nom)}</b>
          <small>${escapeHtml(quoi.quoi)}</small>
        </span>
      `).join("")}
      ${
        // Ce qu'une livraison récente a changé, et qui se voit d'ici : un nœud
        // opaque n'est plus forcément un nœud perdu.
        auServeur
          ? `<span class="cerveau-legende__item cerveau-legende__item--serveur">
              <i></i>
              <b>${auServeur} au serveur</b>
              <small>opaque, mais son référentiel sait le recalculer</small>
            </span>`
          : ""
      }
      ${
        // Une règle n'est pas une nature de valeur : c'est un autre genre de nœud.
        // Sa taille dit son poids comme partout ; ses crans disent sa complexité,
        // qui est une autre question — coûteuse à relire n'est pas lourde à porter.
        cerveau.compte.fonctions
          ? `<span class="cerveau-legende__item cerveau-legende__item--regle">
              <i></i>
              <b>${cerveau.compte.fonctions} ${accorde(cerveau.compte.fonctions, "règle", "règles")}</b>
              <small>entre ses entrées et sa sortie — un losange à plat, un cube en volume,
                et les crans disent sa complexité</small>
            </span>`
          : ""
      }
      ${
        // Sans cette ligne, les points en orbite passeraient pour un effet.
        cerveau.compte.familles
          ? `<span class="cerveau-legende__item cerveau-legende__item--famille">
              <i></i>
              <b>${cerveau.compte.familles} ${accorde(cerveau.compte.familles, "sujet", "sujets")}
                à plusieurs valeurs</b>
              <small>un électron par valeur, en orbite — le sien est le plus vif</small>
            </span>`
          : ""
      }
      ${
        signales
          ? `<span class="cerveau-legende__item cerveau-legende__item--signale">
              <i></i>
              <b>${signales} ${accorde(signales, "signalée", "signalées")}</b>
              <small>l'audit dit que cette valeur ne tient plus</small>
            </span>`
          : ""
      }
    </div>
    ${renderEchelleDeChaleur(cerveau, signales)}
  `;
}

/** Un groupe de boutons dont un seul est actif. */
function renderChoix(nom, actif, options) {
  return `
    <div class="cerveau-choix" role="group" aria-label="${escapeHtml(nom)}">
      ${options.map((option) => `
        <button type="button" class="cerveau-choix__bouton${option.cle === actif ? " est-actif" : ""}"
          data-cerveau-${escapeHtml(nom)}="${escapeHtml(option.cle)}"
          aria-pressed="${option.cle === actif ? "true" : "false"}" title="${escapeHtml(option.quoi)}">
          ${option.icone ? svgIcon(option.icone, { className: "octicon" }) : ""}
          ${escapeHtml(option.nom)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderBarre(isoles) {
  return `
    <div class="cerveau__barre">
      ${renderChoix("vue", "strates", [
        { cle: "strates", nom: "Strates", icone: "stack", quoi: "Une colonne par pas depuis le socle : dans quel ordre le raisonnement se fait." },
        { cle: "volume", nom: "Volume", icone: "north-star", quoi: "Le socle au centre, les strates en coquilles : où se trouve la matière." }
      ])}
      ${renderChoix("mode", "vivant", [
        { cle: "vivant", nom: "Vivant", icone: "heimdall", quoi: "Le projet bat tout seul ; il s'arrête quand vous survolez, et repart quand vous partez. Un clic lance l'onde." },
        { cle: "onde", nom: "Onde au clic", icone: "graph", quoi: "Rien ne bouge tant qu'on ne demande rien : cliquez une valeur." },
        { cle: "battement", nom: "Battement", icone: "pulse", quoi: "Le projet pense tout seul, sans jamais s'arrêter." }
      ])}
      ${renderChoix("couleur", "nature", [
        { cle: "nature", nom: "Nature", icone: "labels-distribution", quoi: "Socle, rejouable, opaque : ce que chaque valeur est." },
        { cle: "chaleur", nom: "Chaleur", icone: "fire", quoi: "Du froid au brûlant selon ce qui passe par là. Le rouge reste à ce que l'audit signale." }
      ])}
      <div class="cerveau__navigation">
        <button type="button" class="cerveau__outil" data-cerveau-zoom="-1" aria-label="Reculer">−</button>
        <button type="button" class="cerveau__outil" data-cerveau-zoom="1" aria-label="Approcher">+</button>
        <button type="button" class="cerveau__outil cerveau__outil--large" data-cerveau-recadrer>Recadrer</button>
      </div>
      <label class="cerveau__isoles">
        <input type="checkbox" data-cerveau-fonctions checked>
        <span>Montrer les règles</span>
      </label>
      <label class="cerveau__isoles">
        <input type="checkbox" data-cerveau-genres checked>
        <span>Mémoire et raisonnement à part</span>
      </label>
      <label class="cerveau__isoles">
        <input type="checkbox" data-cerveau-domaines checked>
        <span>Grouper par domaine</span>
      </label>
      ${
        // Les isolés se comptent et se remettent. Leur absence de lien a deux
        // causes qui ne se confondent pas, et l'écran ne choisit pas pour vous.
        isoles
          ? `<label class="cerveau__isoles">
              <input type="checkbox" data-cerveau-isoles>
              <span>Montrer les ${isoles} ${accorde(isoles, "affirmation", "affirmations")}
                ${accorde(isoles, "qu'aucun lien ne touche", "qu'aucun lien ne touche")}</span>
            </label>`
          : ""
      }
    </div>
  `;
}

/**
 * Ce que l'écran compte, en une ligne.
 *
 * La profondeur affichée est celle du **raisonnement**, jamais celle du dessin :
 * déplier les règles ajoute un rang par étape, et le même projet ne doit pas
 * changer de profondeur selon un bouton d'affichage — ce qui ferait douter du
 * chiffre, à raison.
 */
function renderResume(cerveau) {
  const valeurs = cerveau.noeuds.filter((noeud) => noeud.genre !== GENRE.FONCTION).length;
  const pas = cerveau.pasDeRaisonnement;

  return `
    ${valeurs} ${accorde(valeurs, "affirmation", "affirmations")}
    ${cerveau.compte.fonctions ? `· ${cerveau.compte.fonctions} ${accorde(cerveau.compte.fonctions, "règle", "règles")}` : ""}
    · ${cerveau.compte.liens} ${accorde(cerveau.compte.liens, "lien", "liens")}
    ${
      // Un chiffre qu'on ne peut pas établir ne s'affiche pas à zéro : « la plus
      // longue chaîne fait 0 pas » se lit comme un projet sans raisonnement,
      // alors que c'est l'index qui manque.
      cerveau.enregistres
        ? `· la plus longue chaîne traverse <b>${pas}</b> ${accorde(pas, "règle", "règles")}`
        : "· la longueur des chaînes n'est pas mesurable ici"
    }
  `;
}

/**
 * Ce que l'écran ne sait pas, dit avant qu'on le croie.
 *
 * Un index à moitié rempli est plus dangereux qu'un index vide : vide, on s'en
 * méfie ; à moitié plein, on lit ses chiffres comme s'ils décrivaient le projet.
 * Deux lacunes se comptent, et aucune ne se déduit du dessin :
 *
 * **Une règle sans entrée enregistrée** pend : on voit ce qu'elle conclut, jamais
 * ce qu'elle a lu. Toute chaîne qui devait passer par elle est coupée, et la
 * longueur annoncée est plus courte que la réalité.
 *
 * **Une conclusion qu'aucune valeur ne porte** vit dans le bloc de sa règle. Elle
 * est vraie, elle est lisible — mais elle n'est ni auditable, ni rattachable à un
 * document, ni comparable d'une version à l'autre.
 */
function renderLacunes(cerveau) {
  const { reglesSansEntree, conclusionsSansValeur, fonctions } = cerveau.compte;
  if (!reglesSansEntree && !conclusionsSansValeur) return "";

  const dits = [];
  if (reglesSansEntree) {
    dits.push(`<b>${reglesSansEntree} ${accorde(reglesSansEntree, "règle", "règles")}</b>
      sur ${fonctions} ${accorde(reglesSansEntree, "n'a", "n'ont")} aucune lecture enregistrée :
      ${accorde(reglesSansEntree, "elle est coupée", "elles sont coupées")} de ce
      ${accorde(reglesSansEntree, "qu'elle lit", "qu'elles lisent")}, et les chaînes qui
      ${accorde(reglesSansEntree, "la", "les")} traversent s'annoncent plus courtes qu'elles ne sont`);
  }
  if (conclusionsSansValeur) {
    dits.push(`<b>${conclusionsSansValeur} ${accorde(conclusionsSansValeur, "conclusion", "conclusions")}</b>
      ${accorde(conclusionsSansValeur, "n'existe", "n'existent")} que dans la règle qui
      ${accorde(conclusionsSansValeur, "l'établit", "les établit")} : aucune valeur du projet ne
      ${accorde(conclusionsSansValeur, "la", "les")} porte, donc l'audit ne
      ${accorde(conclusionsSansValeur, "la", "les")} vérifie pas`);
  }

  return `
    <p class="cerveau__provenance cerveau__provenance--lacune">
      ${svgIcon("alert", { className: "octicon" })}
      ${dits.join(" · ")}.
    </p>
  `;
}

function renderCadre(cerveau, isoles, signales) {
  const { compte, noeuds, cycles } = cerveau;

  return `
    <div class="cerveau" role="dialog" aria-modal="true" aria-label="Le cerveau du projet">
      <header class="cerveau__tete">
        <b>${svgIcon("beaker", { className: "octicon" })} Le cerveau du projet</b>
        <span class="cerveau__compte" data-cerveau-resume>${renderResume(cerveau)}</span>
        <button type="button" class="cerveau__fermer" data-cerveau-fermer
          aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
      </header>

      ${renderBarre(isoles)}

      ${
        // D'où viennent les liens. Le taire ferait passer un rapprochement de
        // noms pour ce que les règles ont réellement lu.
        cerveau.enregistres
          ? ""
          : `<p class="cerveau__provenance">
              ${svgIcon("alert", { className: "octicon" })}
              Aucune lecture n'est enregistrée pour ce projet : ces liens sont déduits des noms que
              les règles citent. C'est vrai, en moins sûr.
              Lancez « Verser › Reconstruire les liens du raisonnement » pour les établir.
            </p>`
      }

      <div data-cerveau-lacunes>${cerveau.enregistres ? renderLacunes(cerveau) : ""}</div>

      <div class="cerveau__scene">
        <canvas data-cerveau-toile></canvas>
        <div class="cerveau__bulle" data-cerveau-bulle hidden></div>
      </div>

      <div class="cerveau__pied">
        <div data-cerveau-legendes>${renderLegende(cerveau, signales)}</div>
        <p class="cerveau__onde" data-cerveau-onde>
          Le projet bat tout seul, et s'arrête dès que vous le survolez.
          Cliquez une valeur : l'onde remonte ce qui en découle, une strate à la fois.
          Molette pour zoomer, glissé pour déplacer.
        </p>
        ${
          cycles.length
            ? `<p class="cerveau__cycle">
                ${svgIcon("alert", { className: "octicon" })}
                ${cycles.length} ${accorde(cycles.length, "affirmation se lit", "affirmations se lisent")}
                en rond : ${accorde(cycles.length, "elle est placée", "elles sont placées")} à part.
                Rien n'en sort — un état de passage n'est pas un résultat.
              </p>`
            : ""
        }
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le dessin
 * ────────────────────────────────────────────────────────────────────────── */

/** Le contour d'un losange : la forme d'une **fonction**, jamais d'une valeur. */
function losange(ctx, x, y, rayon) {
  ctx.beginPath();
  ctx.moveTo(x, y - rayon);
  ctx.lineTo(x + rayon, y);
  ctx.lineTo(x, y + rayon);
  ctx.lineTo(x - rayon, y);
  ctx.closePath();
}

/**
 * La silhouette d'un cube vu par un coin : un hexagone.
 *
 * Le losange est la même règle **à plat**. En volume, un losange reste plat au
 * milieu d'un nuage de sphères, et l'œil le lit comme une étiquette posée sur
 * l'image plutôt que comme un objet qui s'y trouve. Le cube a un volume : il
 * tourne avec le reste.
 */
function cube(ctx, x, y, rayon) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * rayon;
    const py = y + Math.sin(angle) * rayon;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Les trois arêtes qui font qu'un hexagone devient un cube.
 *
 * Sans elles, c'est une pastille à six côtés. Avec, l'œil voit trois faces et le
 * volume apparaît — pour trois traits.
 */
function aretesDuCube(ctx, x, y, rayon, couleur) {
  ctx.strokeStyle = couleur;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const i of [1, 3, 5]) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * rayon, y + Math.sin(angle) * rayon);
  }
  ctx.stroke();
}

/** Au-delà, on ne compte plus les crans : on lit « beaucoup », et c'est assez. */
const CRANS_MAX = 9;

/** Au-delà, les électrons se recouvrent et l'on ne les compte plus. La bulle dit le nombre exact. */
const ELECTRONS_MAX = 8;

/** Un tour d'orbite, en millisecondes. Lent : ça respire, ça ne clignote pas. */
const TOUR_DELECTRON = 7400;

/**
 * Les électrons d'un nœud : une par valeur que son sujet prend.
 *
 * ## Ce qu'ils disent
 *
 * Qu'un chiffre lu à l'écran n'est **pas le seul** pour ce sujet. Le
 * rez-de-chaussée est un ERP, les étages du logement : deux valeurs vraies en
 * même temps, chacune avec sa portée. Un nœud sans électron porte la seule valeur
 * de son sujet, et on peut le lire sans se demander s'il en cache d'autres.
 *
 * ## Pourquoi le sien est plus vif
 *
 * Parce que ce nœud **est** l'une d'elles, pas leur résumé. L'électron clair dit
 * « celle-ci, c'est moi » ; les autres disent « et il y en a trois autres ». Sans
 * cette distinction, le nœud se lirait comme un total, et un total de valeurs qui
 * ne s'additionnent pas ne veut rien dire.
 *
 * ## Pourquoi une ellipse, et inclinée
 *
 * Un cercle plat se confondrait avec l'anneau du cycle et avec le halo de l'onde.
 * L'ellipse inclinée se lit comme une orbite vue de biais — et l'inclinaison,
 * tirée de l'identifiant, empêche deux nœuds voisins de tourner comme un seul.
 */
function dessinerLesElectrons(ctx, noeud, x, y, rayon, temps, couleur, respire) {
  const total = noeud.famille?.total ?? 0;
  if (total < 2 || rayon < 3) return;

  const combien = Math.min(ELECTRONS_MAX, total);
  const sien = Math.max(0, noeud.famille.valeurs.findIndex((autre) => autre.id === noeud.id));
  // Assez loin du bord pour ne pas se confondre avec lui : une bille collée au
  // nœud se lit comme une bavure, pas comme une valeur qui lui appartient.
  const orbite = rayon * 1.2 + 11;
  const inclinaison = noeud.phase * 0.5;
  const cos = Math.cos(inclinaison);
  const sin = Math.sin(inclinaison);
  // Un pas figé quand on a demandé moins de mouvement : les électrons restent —
  // ils portent une information — mais ils ne tournent pas.
  const avance = respire ? (temps / TOUR_DELECTRON) * Math.PI * 2 : 0;

  for (let i = 0; i < combien; i += 1) {
    const angle = avance + noeud.phase + (i / combien) * Math.PI * 2;
    // Une orbite aplatie sur un axe, puis penchée : de face on verrait un anneau.
    const ex = Math.cos(angle) * orbite;
    const ey = Math.sin(angle) * orbite * 0.42;
    const px = x + ex * cos - ey * sin;
    const py = y + ex * sin + ey * cos;

    // Devant ou derrière : c'est ce qui fait qu'on lit une orbite plutôt qu'un
    // anneau de points. Sans cela, le mouvement se voit et le volume ne se voit
    // pas — et l'on ne distingue plus une bille qui passe d'une bille arrêtée.
    const devant = (Math.sin(angle) + 1) / 2;
    const propre = i === sien % combien;

    ctx.beginPath();
    ctx.arc(px, py, (propre ? 2.1 : 1.5) * (0.78 + 0.34 * devant), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${couleur},${(propre ? 0.95 : 0.55) * (0.55 + 0.45 * devant)})`;
    ctx.fill();
  }
}

/**
 * La couronne d'une règle : un cran par point de complexité.
 *
 * ## Pourquoi des crans et pas une taille
 *
 * Parce que la taille dit déjà autre chose — le poids, comme pour tout le monde.
 * Une règle **compliquée** dont rien ne dépend est un coût ; une règle **simple**
 * dont tout dépend est un risque. Ce sont deux problèmes, on n'y répond pas de la
 * même façon, et les fondre dans un seul rayon les confondrait.
 *
 * Des crans, enfin, parce qu'ils se **comptent** : on voit d'un coup d'œil qu'une
 * règle en a sept là où sa voisine en a deux. Un dégradé ferait deviner, là où
 * l'on peut simplement montrer.
 */
function couronneDeComplexite(ctx, x, y, rayon, complexite, couleur) {
  const crans = Math.min(CRANS_MAX, Math.max(0, Number(complexite?.total) || 0));
  if (!crans) return;

  ctx.strokeStyle = couleur;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < crans; i += 1) {
    const angle = (i / CRANS_MAX) * Math.PI * 2 - Math.PI / 2;
    const dedans = rayon + 3.5;
    const dehors = dedans + 3.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * dedans, y + Math.sin(angle) * dedans);
    ctx.lineTo(x + Math.cos(angle) * dehors, y + Math.sin(angle) * dehors);
    ctx.stroke();
  }
}

/**
 * La complexité d'une règle, en toutes lettres.
 *
 * On énumère ce qui la compose plutôt que d'annoncer un score : « 7 » ne se
 * discute pas, « 3 conditions, 2 sujets lus, 1 exception » se relit et se
 * conteste. Le total ne sert qu'à compter les crans.
 */
function phraseDeLaComplexite(complexite) {
  const morceaux = [];
  if (complexite?.conditions) {
    morceaux.push(`${complexite.conditions} ${accorde(complexite.conditions, "condition", "conditions")}`);
  }
  if (complexite?.sujets) {
    morceaux.push(`${complexite.sujets} ${accorde(complexite.sujets, "sujet lu", "sujets lus")}`);
  }
  if (complexite?.exceptions) {
    morceaux.push(`${complexite.exceptions} ${accorde(complexite.exceptions, "exception", "exceptions")}`);
  }
  if (complexite?.deuxIssues) morceaux.push("deux issues");
  if (complexite?.zones) {
    morceaux.push(`${complexite.zones} ${accorde(complexite.zones, "zone", "zones")}`);
  }
  return morceaux.length ? `Complexité : ${morceaux.join(" · ")}` : "Complexité : rien à tenir en tête";
}

/**
 * Ce qui dépend d'une règle, en toutes lettres.
 *
 * Dit à côté de la complexité, et jamais mélangé avec : la complexité est ce
 * qu'il faut tenir en tête pour la relire, l'aval est ce que la corriger
 * remuerait. Une règle compliquée dont rien ne dépend est un **coût** ; une règle
 * simple dont tout dépend est un **risque**. On n'y répond pas de la même façon.
 *
 * Une règle dont rien ne découle n'est pas une règle inutile : sa conclusion est
 * peut-être le résultat qu'on cherchait. On dit ce qu'on sait, pas ce qu'on en
 * conclut.
 */
function phraseDeLAval(aval) {
  if (!aval?.valeurs) return "Rien ne repose sur sa conclusion.";

  return `Ce qui en dépend : ${aval.valeurs}
    ${accorde(aval.valeurs, "affirmation", "affirmations")}, sur ${aval.strates}
    ${accorde(aval.strates, "strate", "strates")}${
      aval.regles ? `, par ${aval.regles} ${accorde(aval.regles, "règle", "règles")}` : ""
    }.`;
}

/** Combien de valeurs d'un sujet on nomme dans la bulle avant d'abréger. */
const VALEURS_DITES = 4;

/**
 * Les autres valeurs du même sujet.
 *
 * C'est là qu'un lecteur se trompe : il retient « la » valeur d'un sujet qui en a
 * quatre, puis raisonne sur la mauvaise. Les nommer **avec leur portée** est la
 * seule façon de dire qu'elles ne se contredisent pas — le rez-de-chaussée est un
 * ERP, les étages du logement, et les deux sont vrais.
 */
function renderFamille(noeud) {
  const soeurs = noeud.famille.valeurs.filter((autre) => autre.id !== noeud.id);
  if (!soeurs.length) return "";

  const dites = soeurs.slice(0, VALEURS_DITES).map((autre) => {
    const ou = autre.zones.length ? autre.zones.join(", ") : "partout";
    return `${escapeHtml(autre.valeur || "—")} <i>(${escapeHtml(ou)})</i>`;
  });
  const reste = soeurs.length - dites.length;

  return `
    <span class="cerveau-bulle__famille">
      Ce sujet vaut ${noeud.famille.total} choses selon la zone :
      ${dites.join(" · ")}${reste ? ` · et ${reste} ${accorde(reste, "autre", "autres")}` : ""}
    </span>
  `;
}

/** L'aire d'un contour fermé, par la formule du lacet. Toujours positive. */
function aireDuContour(contour = []) {
  let deux = 0;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i, i += 1) {
    deux += (contour[j].x + contour[i].x) * (contour[j].y - contour[i].y);
  }
  return Math.abs(deux / 2);
}

/**
 * Le nom d'un nœud, tel qu'on l'écrit.
 *
 * Une règle porte comme sujet **ce qu'elle conclut** : « Degré coupe-feu des
 * planchers » nomme donc à la fois la valeur et le mécanisme qui la produit. Les
 * deux dessinés, on lit deux nœuds du même nom de part et d'autre de l'équateur
 * et l'on croit à un doublon — alors que ce sont deux choses différentes, et que
 * c'est précisément ce que l'écran est venu montrer.
 *
 * La flèche le dit sans une ligne de plus : ce nœud **mène à** ce sujet, il ne
 * l'est pas.
 */
function nomDuNoeud(noeud) {
  return noeud?.genre === GENRE.FONCTION ? `→ ${noeud.sujet}` : noeud?.sujet ?? "";
}

/** Un sujet trop long coupe le voisin : on le raccourcit plutôt que de l'empiler. */
function abrege(sujet, max = 26) {
  const brut = texte(sujet);
  return brut.length > max ? `${brut.slice(0, max - 1)}…` : brut;
}

/**
 * Le rayon d'un nœud : ce qui pèse le plus est plus gros, sans écraser le reste.
 *
 * Le **poids**, pas les seuls emplois : une donnée lue dix fois par une seule
 * règle et une donnée lue une fois par dix règles ne pèsent pas pareil dans un
 * raisonnement, et ne compter que les lectures les dessinerait identiques.
 *
 * En racine, comme la chaleur, et pour la même raison : les poids d'un projet ne
 * se répartissent pas également, et une échelle linéaire ferait trois grosses
 * billes au milieu d'une poussière.
 */
function rayonDe(noeud) {
  return 3.6 + Math.min(9, Math.sqrt(Math.max(0, noeud.poids ?? noeud.lectures ?? 0)) * 2.1);
}

/**
 * Où chaque nœud se pose à l'écran, dans la vue choisie.
 *
 * Une seule fonction pour les deux vues : le reste du dessin ne sait pas laquelle
 * est active, et n'a donc aucun moyen de les traiter différemment par accident.
 *
 * Elle rend aussi `p`, la **profondeur perçue** — 1 devant, 0 au loin. Les
 * strates l'ignorent (tout est au même plan) ; le volume s'en sert pour la
 * taille, l'opacité et l'ordre de tracé.
 */
function projeteur(etat, largeur, hauteur, temps) {
  const { camera, respire } = etat;
  const souffle = (noeud) => (respire ? Math.sin(temps / 1400 + noeud.phase) * 3 : 0);

  if (etat.vue === "strates") {
    const marge = { x: 74, y: 44 };
    const utile = { x: Math.max(1, largeur - marge.x * 2), y: Math.max(1, hauteur - marge.y * 2) };
    return (noeud) => ({
      x: (marge.x + noeud.x * utile.x) * camera.zoom + camera.dx,
      y: (marge.y + noeud.y * utile.y + souffle(noeud)) * camera.zoom + camera.dy,
      p: 1,
      k: camera.zoom
    });
  }

  // Le volume : on tourne autour de Y (l'orbite) puis de X (l'élévation), et on
  // projette. La distance focale est fixe ; c'est la caméra qui recule.
  const cosA = Math.cos(camera.orbite);
  const sinA = Math.sin(camera.orbite);
  const cosB = Math.cos(camera.elevation);
  const sinB = Math.sin(camera.elevation);
  const echelle = Math.min(largeur, hauteur) * 0.42;
  const recul = 3.2 / Math.max(0.2, camera.zoom);

  return (noeud) => {
    const x1 = noeud.x * cosA - noeud.z * sinA;
    const z1 = noeud.x * sinA + noeud.z * cosA;
    const y1 = noeud.y * cosB - z1 * sinB;
    const z2 = noeud.y * sinB + z1 * cosB;

    // `recul + z2` ne s'annule pas : le recul minimal dépasse le rayon du volume,
    // qui vaut 1. Sans cette garantie, un nœud passant par l'œil enverrait des
    // coordonnées infinies et le tracé entier disparaîtrait.
    const k = 2.6 / (recul + z2);
    return {
      x: largeur / 2 + x1 * echelle * k + camera.dx,
      y: hauteur / 2 + y1 * echelle * k + camera.dy + souffle(noeud) * 0.5,
      p: borne((2.2 - z2) / 3.2, 0.12, 1),
      k
    };
  };
}

/** L'éclat d'une impulsion à cet instant : 1 au passage, 0 quand elle est éteinte. */
function eclatDe(impulsion, temps) {
  const age = temps - impulsion.debut;
  if (age < 0) return 0;
  if (age > impulsion.duree) return 0;
  // Montée brève, descente longue : c'est ce qui fait lire un passage plutôt
  // qu'un clignotement.
  const montee = Math.min(1, age / 120);
  return montee * (1 - age / impulsion.duree);
}

function dessiner(ctx, etat, largeur, hauteur, temps) {
  const { places, parId, survole, choisi, signales } = etat;

  // Les éclats de l'image : une seule passe sur les impulsions vivantes, et le
  // reste du dessin lit une table plutôt que de refaire le calcul par nœud.
  const eclats = new Map();
  etat.impulsions = etat.impulsions.filter((impulsion) => temps - impulsion.debut <= impulsion.duree);
  for (const impulsion of etat.impulsions) {
    const eclat = eclatDe(impulsion, temps);
    if (eclat > 0) eclats.set(impulsion.id, Math.max(eclats.get(impulsion.id) ?? 0, eclat));
  }

  const ou = projeteur(etat, largeur, hauteur, temps);
  const points = new Map(places.map((noeud) => [noeud.id, ou(noeud)]));

  ctx.clearRect(0, 0, largeur, hauteur);

  if (etat.vue === "strates") dessinerLesColonnes(ctx, etat, largeur, hauteur, points);
  else dessinerLesCoquilles(ctx, etat, largeur, hauteur, points);

  if (etat.deuxHemispheres) dessinerLEquateur(ctx, etat, largeur, hauteur, ou);

  // Le voile en premier, sous les liens et les nœuds : c'est un fond, pas un
  // cadre. Posé par-dessus, il voilerait ce qu'il est censé situer.
  if (etat.parDomaine) etat.voiles = dessinerLesVoiles(ctx, etat, points, temps);
  else etat.voiles = [];

  // Les liens. Une courbe, pas une droite : à cette densité, des droites font un
  // treillis dans lequel on ne suit plus rien.
  //
  // Ils étaient trop pâles pour qu'on suive une chaîne : à `0.05` de base, un
  // lien entre deux nœuds éloignés disparaissait dans le fond. Le plancher est
  // remonté, et un lien **chaud** se voit de loin — c'est par eux que passe le
  // gros du raisonnement, et ce sont eux qu'on cherche à suivre.
  for (const lien of etat.liens) {
    const a = points.get(lien.de);
    const b = points.get(lien.vers);
    if (!a || !b) continue;

    const vif = Math.min(eclats.get(lien.de) ?? 0, eclats.get(lien.vers) ?? 0);
    const proche = survole && (survole === lien.de || survole === lien.vers);
    const fond = Math.min(a.p, b.p);
    // Un lien qui touche une règle **est** un lien de règle : dans le graphe
    // déplié, il n'a qu'une extrémité de chaque genre. Le laisser orange le
    // rattachait visuellement à la mémoire alors qu'il en part ou y arrive.
    const genre = parId.get(lien.de)?.genre === GENRE.FONCTION
      || parId.get(lien.vers)?.genre === GENRE.FONCTION
      ? GENRE.FONCTION
      : GENRE.VALEUR;
    // Un lien est **malade** quand l'une de ses extrémités l'est : c'est par lui
    // que le défaut se propage, et le laisser gris ferait chercher d'où ça vient.
    const malade = signales.has(lien.de) || signales.has(lien.vers);

    if (vif > 0) {
      const eclat = eclatDeLaFamille(etat.couleur, genre);
      // Une impulsion brille : plus claire et plus opaque que le reste, pour
      // qu'on la suive à travers un écran déjà coloré — mais **dans sa
      // couleur**. Un lien qui blanchit en s'allumant perd sa famille au moment
      // précis où on le regarde.
      ctx.strokeStyle = `rgba(${vif > 0.6 ? eclat.coeur : eclat.vif},${0.45 + 0.55 * vif})`;
    } else if (proche) {
      ctx.strokeStyle = `rgba(${eclatDeLaFamille(etat.couleur, genre).coeur},.8)`;
    } else if (malade) {
      ctx.strokeStyle = `rgba(${ROUGE},${0.2 + 0.3 * fond})`;
    } else if (etat.couleur === "chaleur") {
      const chaleur = chaleurDuLien(lien, etat.parId, etat.poidsMax);
      const teinte = teinteDeLaChaleur(chaleur, genre === GENRE.FONCTION ? CHALEUR_REGLE : CHALEUR);
      ctx.strokeStyle = `rgba(${teinte},${(0.14 + 0.5 * chaleur) * (0.45 + 0.55 * fond)})`;
    } else {
      ctx.strokeStyle = `rgba(139,148,158,${(0.16 + 0.24 * fond)})`;
    }

    ctx.lineWidth = Math.min(3.4, 0.8 + lien.poids * 0.4) * (vif > 0 ? 2 : 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y);
    ctx.stroke();
  }

  // Les nœuds, du fond vers le devant : sans ce tri, un nœud lointain se dessine
  // par-dessus un nœud proche et le volume se lit à l'envers.
  const ordonnes = etat.vue === "volume"
    ? [...places].sort((g, d) => points.get(g.id).p - points.get(d.id).p)
    : places;

  for (const noeud of ordonnes) {
    const { x, y, p, k } = points.get(noeud.id);
    const rayon = rayonDe(noeud) * (etat.vue === "volume" ? borne(k, 0.45, 1.8) : 1);
    const trait = noeud.genre === GENRE.FONCTION
      ? `rgb(${REGLE})`
      : NATURES[noeud.nature]?.trait ?? "#8b949e";
    const eclat = eclats.get(noeud.id) ?? 0;
    const signal = signales.get(noeud.id);

    // Ce que l'audit signale bat tout seul, sans qu'on ait rien demandé. C'est
    // toute la question du battement : voir ce qui ne va pas sans le chercher.
    if (signal) {
      const pouls = etat.respire ? 0.5 + 0.5 * Math.sin(temps / 420) : 0.7;
      ctx.beginPath();
      ctx.arc(x, y, rayon + 5 + pouls * 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ROUGE},${0.1 + 0.16 * pouls})`;
      ctx.fill();
    }

    if (eclat > 0) {
      // Le halo de l'onde. **Creux pour un nœud opaque** : il dépend, on ne sait
      // pas le refaire, et lui donner le même éclat qu'à une valeur recalculée
      // ferait passer du propagé pour du calculé.
      ctx.beginPath();
      ctx.arc(x, y, rayon + 6 + eclat * 10, 0, Math.PI * 2);
      if (noeud.nature === NOEUD.OPAQUE) {
        ctx.strokeStyle = `rgba(210,153,34,${0.55 * eclat})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        const teinte = eclatDeLaFamille(etat.couleur, noeud.genre);
        ctx.fillStyle = `rgba(${teinte.vif},${0.22 * eclat})`;
        ctx.fill();
        // Un cœur clair au centre du halo : c'est lui qui fait qu'une impulsion
        // se voit passer, plutôt que de se deviner.
        ctx.beginPath();
        ctx.arc(x, y, rayon + 2 + eclat * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${teinte.coeur},${0.3 * eclat})`;
        ctx.fill();
      }
    }

    ctx.globalAlpha = etat.vue === "volume" ? borne(0.3 + p * 0.7, 0.25, 1) : 1;

    const fonction = noeud.genre === GENRE.FONCTION;
    // Un losange à plat, un cube en volume : la même règle, dans la géométrie de
    // la vue. Un losange au milieu d'un nuage de sphères se lit comme une
    // étiquette collée sur l'image, pas comme un objet qui s'y trouve.
    const enVolume = etat.vue === "volume";
    // Un multiplicateur, pas un forfait. À `rayon + 2,4`, une règle qui ne pèse
    // presque rien recevait autant de bonus qu'une règle centrale : les petites
    // paraissaient grosses et l'échelle des poids ne se lisait plus. Le facteur
    // ne fait que compenser l'aire perdue par la forme — un losange et un
    // hexagone inscrits dans le même cercle couvrent moins qu'un disque.
    const cote = rayon * (enVolume ? 1.16 : 1.3);
    if (fonction) {
      if (enVolume) cube(ctx, x, y, cote);
      else losange(ctx, x, y, cote);
    } else { ctx.beginPath(); ctx.arc(x, y, rayon, 0, Math.PI * 2); }

    if (signal) {
      ctx.fillStyle = `rgba(${ROUGE},.9)`;
      ctx.fill();
    } else if (etat.couleur === "chaleur") {
      // La chaleur dit **combien de raisonnement passe par là**, et rien d'autre.
      // La nature reste lisible à la forme : plein pour une source, cerclé pour
      // ce qui se rejoue, creux pour ce qu'on ne sait pas refaire.
      const chaud = teinteDuNoeud(noeud, etat.poidsMax);
      if (noeud.nature === NOEUD.OPAQUE) {
        ctx.strokeStyle = `rgba(${chaud},.85)`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(${chaud},${noeud.nature === NOEUD.SOCLE ? 0.95 : 0.6})`;
        ctx.fill();
        if (noeud.nature === NOEUD.REJOUABLE) {
          ctx.strokeStyle = `rgba(${chaud},.95)`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
    } else if (fonction) {
      ctx.fillStyle = `rgba(${REGLE},.20)`;
      ctx.fill();
      ctx.strokeStyle = trait;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (noeud.nature === NOEUD.SOCLE) {
      // Plein : c'est une source. C'est de là que part une onde.
      ctx.fillStyle = trait;
      ctx.fill();
    } else if (noeud.nature === NOEUD.REJOUABLE) {
      ctx.fillStyle = "rgba(88,166,255,.18)";
      ctx.fill();
      ctx.strokeStyle = trait;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else {
      // Creux, éteint : on sait qu'il dépend, pas le refaire.
      ctx.strokeStyle = noeud.rejouable ? "#a371f7" : trait;
      ctx.lineWidth = noeud.rejouable ? 1.8 : 1.2;
      ctx.stroke();
    }

    if (fonction) {
      const teinte = signal
        ? `rgba(${ROUGE},.9)`
        : etat.couleur === "chaleur"
          ? `rgba(${teinteDuNoeud(noeud, etat.poidsMax)},.9)`
          : `rgba(${REGLE},.85)`;
      if (enVolume) aretesDuCube(ctx, x, y, cote, teinte);

      // La couronne dit ce que la règle demande pour être comprise, en clair et
      // à côté du poids — jamais fondu dedans.
      couronneDeComplexite(
        ctx, x, y, cote, noeud.complexite,
        signal
          ? `rgba(${ROUGE},.8)`
          : etat.couleur === "chaleur"
            ? `rgba(${teinteDuNoeud(noeud, etat.poidsMax)},.7)`
            : `rgba(${REGLE},.75)`
      );
    }

    if (!fonction) {
      // Les valeurs du même sujet, en orbite. Elles suivent la couleur du nœud :
      // elles sont **à lui**, ce ne sont pas une décoration posée par-dessus.
      dessinerLesElectrons(
        ctx, noeud, x, y, rayon, temps,
        signal
          ? ROUGE
          : etat.couleur === "chaleur"
            ? teinteDuNoeud(noeud, etat.poidsMax)
            : TEINTES[noeud.nature] ?? "139,148,158",
        etat.respire
      );
    }

    if (noeud.enRond) {
      ctx.strokeStyle = "rgba(210,153,34,.85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, rayon + 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (noeud.id === choisi || noeud.id === survole) {
      ctx.strokeStyle = "#f0f6fc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, rayon + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (etat.parDomaine) dessinerLesDomaines(ctx, etat, points, ou, hauteur);
  dessinerLesNoms(ctx, etat, largeur, points, eclats);
  etat.points = points;
}

/**
 * Les colonnes, à peine visibles, et **nommées**.
 *
 * Elles disent qu'il y a des strates sans faire une grille — une grille se lit
 * comme un tableau, et on a déjà un tableau. Sans le nom, on verrait des colonnes
 * sans savoir ce qu'elles comptent.
 */
function dessinerLesColonnes(ctx, etat, largeur, hauteur, points) {
  const rangs = [...new Set(etat.places.map((noeud) => noeud.x))].sort((a, b) => a - b);
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";

  // Un rang de règles n'est pas un pas de raisonnement : c'est le mécanisme
  // *entre* deux pas. Le compter en ferait doubler la profondeur affichée selon
  // un bouton d'affichage, et le chiffre ne voudrait plus rien dire.
  let pas = -1;

  rangs.forEach((rang) => {
    const modele = etat.places.find((noeud) => noeud.x === rang);
    const regles = etat.rangsDeFonctions.has(modele.strate);
    if (!regles) pas += 1;

    const x = points.get(modele.id).x;
    if (x < -40 || x > largeur + 40) return;

    ctx.strokeStyle = "rgba(139,148,158,.10)";
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, hauteur - 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(139,148,158,.55)";
    ctx.fillText(
      regles ? "règles" : pas === 0 ? "socle" : modele.enRond ? "en rond" : `${pas} pas`,
      x, 16
    );
  });
}

/**
 * Les coquilles : un cercle par strate, pour qu'on voie où l'on est.
 *
 * Sans elles, le volume est un nuage de points dont on ne sait pas s'il a une
 * structure. Avec elles, on voit **les strates s'éloigner du centre** — ce que la
 * vue est venue montrer.
 */
function dessinerLesCoquilles(ctx, etat, largeur, hauteur, points) {
  const parStrate = new Map();
  for (const noeud of etat.places) {
    parStrate.set(noeud.strate, (parStrate.get(noeud.strate) ?? 0) + 1);
  }

  const cx = largeur / 2 + etat.camera.dx;
  const cy = hauteur / 2 + etat.camera.dy;
  const echelle = Math.min(largeur, hauteur) * 0.42;
  const recul = 3.2 / Math.max(0.2, etat.camera.zoom);
  const profondeur = Math.max(1, etat.profondeur);

  ctx.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";

  let pas = -1;

  for (const [strate, combien] of [...parStrate.entries()].sort((g, d) => g[0] - d[0])) {
    const regles = etat.rangsDeFonctions.has(strate);
    if (!regles) pas += 1;
    const rayonReel = strate === 0 ? 0.24 : 0.42 + 0.58 * Math.sqrt(strate / profondeur);
    const rayon = rayonReel * echelle * (2.6 / recul);
    if (!Number.isFinite(rayon) || rayon <= 0) continue;

    ctx.strokeStyle = "rgba(139,148,158,.13)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rayon, rayon * Math.max(0.12, Math.abs(Math.cos(etat.camera.elevation))), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sur le **flanc** de la coquille, pas au sommet : au sommet, l'aplatissement
    // de l'ellipse les tasse les unes sur les autres et l'on ne lit plus laquelle
    // nomme quoi. Sur le flanc, elles s'égrènent le long d'une ligne.
    // Décalées en escalier : les coquilles du milieu ont des rayons voisins, et
    // trois libellés posés à la même hauteur se recouvrent exactement là où l'on
    // cherche à les lire.
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(139,148,158,.5)";
    ctx.fillText(
      `${regles ? "règles" : pas === 0 ? "socle" : `${pas} pas`} · ${combien}`,
      cx + rayon + 8, cy + 4 + strate * 15
    );
  }
}

/**
 * L'équateur : où la mémoire s'arrête et où le raisonnement commence.
 *
 * Un trait **pointillé**, et pas plein. Plein, il dirait qu'il sépare deux
 * territoires ; or tout le passe : chaque lien du dessin le traverse, puisqu'une
 * règle lit une valeur d'un côté et en produit une autre de l'autre. Ce n'est pas
 * une frontière, c'est un repère de lecture.
 *
 * Les deux mots sont posés **aux extrémités**, là où les nœuds ne vont pas :
 * au milieu, ils tomberaient dans la zone la plus dense de l'écran.
 */
function dessinerLEquateur(ctx, etat, largeur, hauteur, ou) {
  // Les deux points où l'on écrira, l'un à gauche l'autre à droite du trait. En
  // strates ce sont ses extrémités ; en volume, les flancs de l'ellipse — là où
  // elle est le plus haute et le plus basse à l'écran, donc là où les mots ne
  // tombent pas dans le nuage.
  let gauche = null;
  let droite = null;

  ctx.save();
  ctx.setLineDash([3, 7]);
  ctx.strokeStyle = "rgba(139,148,158,.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();

  if (etat.vue === "strates") {
    // La séparation est à `part` dans l'espace des nœuds, pas au milieu de
    // l'écran : la caméra a pu se déplacer, et un trait posé à `hauteur / 2`
    // mentirait dès le premier glissé.
    const { y } = ou({ x: 0, y: etat.partDeLaMemoire, phase: 0 });
    ctx.moveTo(0, y);
    ctx.lineTo(largeur, y);
    gauche = { x: 12, y, align: "left" };
    droite = { x: largeur - 12, y, align: "right" };
  } else {
    // En volume, l'équateur est un **cercle**, et la caméra le voit de biais. On
    // le projette comme n'importe quel nœud : un trait droit posé au milieu de
    // l'écran serait faux dès qu'on incline la vue.
    //
    // Le plan de coupe est à `2 × part − 1`, le même que celui du service, pour
    // que le trait passe exactement là où les nœuds se séparent.
    const coupe = 2 * etat.partDeLaMemoire - 1;
    const rayon = 1.06 * Math.sqrt(Math.max(0.04, 1 - coupe * coupe));

    for (let i = 0; i <= 96; i += 1) {
      const angle = (i / 96) * Math.PI * 2;
      const point = ou({
        x: Math.cos(angle) * rayon, y: coupe, z: Math.sin(angle) * rayon, phase: 0
      });
      if (i === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      // **En dehors** de la boule, pas sur son flanc : posés dessus, les deux
      // mots tombent sur le nom du domaine qui occupe déjà ce bord.
      if (!gauche || point.x < gauche.x) gauche = { ...point, x: point.x - 10, align: "right" };
      if (!droite || point.x > droite.x) droite = { ...point, x: point.x + 10, align: "left" };
    }
  }

  ctx.stroke();
  ctx.restore();

  // Quand les secteurs sont nommés, chacun dit déjà de quel côté il est : deux
  // mots de plus aux flancs répéteraient dix fois la même information et
  // tomberaient sur les noms qu'ils redoublent. Le trait, lui, reste toujours.
  if (etat.parDomaine) return;

  ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "rgba(139,148,158,.45)";

  for (const ancre of [gauche, droite]) {
    if (!ancre) continue;
    ctx.textAlign = ancre.align;
    const x = Math.min(largeur - 10, Math.max(10, ancre.x));

    // Quand le trait sort du cadre, un seul des deux mots a encore un sens : les
    // écrire tous les deux les empilerait au même bord, et deux mots superposés
    // disent moins que rien.
    if (ancre.y < 26) ctx.fillText("RAISONNEMENT", x, 16);
    else if (ancre.y > hauteur - 26) ctx.fillText("MÉMOIRE", x, hauteur - 8);
    else {
      ctx.fillText("MÉMOIRE", x, ancre.y - 8);
      ctx.fillText("RAISONNEMENT", x, ancre.y + 17);
    }
  }
  ctx.textAlign = "left";
}

/** De combien la frontière d'un voile s'écarte des nœuds qu'elle entoure. */
const MARGE_DU_VOILE = 26;

/**
 * Le voile d'un domaine : un territoire, pas un cadre.
 *
 * ## Pourquoi une enveloppe, et pas une forme régulière
 *
 * Elle n'invente aucun point : elle entoure ceux qui existent. Un cercle posé sur
 * le barycentre envelopperait du vide et ferait croire à une zone là où il n'y a
 * personne — exactement le genre de dessin qui décide à la place de celui qui
 * regarde.
 *
 * ## Pourquoi la frontière bouge
 *
 * Parce qu'elle **n'est pas une frontière**. Les secteurs se chevauchent d'un
 * tiers, une valeur sert souvent deux disciplines, et un trait net dirait le
 * contraire : que le raisonnement se range en cases. Une bordure qui respire
 * dit ce qu'il faut — « c'est par là », pas « ça s'arrête ici ».
 *
 * ## Ce que le survol ajoute
 *
 * Rien de neuf : le même voile, plus lisible. On désigne un domaine en pointant
 * **le vide entre ses valeurs**, ce qui est le geste qu'on fait naturellement en
 * disant « ce paquet, là ».
 *
 * @returns {{domaine: string, libelle: string, contour: object[]}[]} de quoi
 *   savoir, au pointeur, dans quelle zone on se trouve
 */
function dessinerLesVoiles(ctx, etat, points, temps) {
  const voiles = [];

  for (const { entree, siens: places } of secteursDuCerveau(etat)) {
    const siens = places.map((noeud) => points.get(noeud.id)).filter(Boolean);
    // Sous trois points il n'y a pas de territoire, seulement des points.
    if (siens.length < 3) continue;

    const brut = dilaterLEnveloppe(enveloppeConvexe(siens), MARGE_DU_VOILE);
    if (brut.length < 3) continue;

    // La respiration : chaque sommet s'écarte et revient, à son propre rythme.
    const centre = brut.reduce(
      (acc, point) => ({ x: acc.x + point.x / brut.length, y: acc.y + point.y / brut.length }),
      { x: 0, y: 0 }
    );
    const contour = brut.map((point, index) => {
      if (!etat.respire) return point;
      const dx = point.x - centre.x;
      const dy = point.y - centre.y;
      const distance = Math.hypot(dx, dy) || 1;
      const souffle = Math.sin(temps / 1900 + index * 1.7 + entree.rang) * 5;
      return { x: point.x + (dx / distance) * souffle, y: point.y + (dy / distance) * souffle };
    });

    voiles.push({ domaine: entree.domaine, libelle: entree.libelle, contour });

    const vif = etat.survoleLeDomaine === entree.domaine;
    ctx.beginPath();
    ctx.moveTo((contour.at(-1).x + contour[0].x) / 2, (contour.at(-1).y + contour[0].y) / 2);
    // Des courbes passant par les milieux : les sommets d'une enveloppe convexe
    // font des angles, et une zone à angles se lit comme un cadre.
    for (let i = 0; i < contour.length; i += 1) {
      const point = contour[i];
      const suivant = contour[(i + 1) % contour.length];
      ctx.quadraticCurveTo(point.x, point.y, (point.x + suivant.x) / 2, (point.y + suivant.y) / 2);
    }
    ctx.closePath();

    // Au repos, assez pour qu'on **voie qu'il y a des zones** ; au survol, assez
    // pour qu'on voie laquelle. Un voile invisible au repos ne dirait rien tant
    // qu'on ne l'a pas trouvé par hasard.
    ctx.fillStyle = vif ? "rgba(201,209,217,.09)" : "rgba(139,148,158,.055)";
    ctx.fill();
    ctx.strokeStyle = vif ? "rgba(201,209,217,.42)" : "rgba(139,148,158,.2)";
    ctx.lineWidth = vif ? 1.4 : 1;
    ctx.stroke();
  }

  return voiles;
}

/**
 * Les secteurs du cerveau : un domaine, d'un côté de l'équateur.
 *
 * Un domaine coupé en deux fait **deux** secteurs, un par hémisphère : « la
 * structure, côté mémoire » et « la structure, côté raisonnement ». Un seul
 * voile enjamberait l'équateur et rendrait la séparation illisible — exactement
 * ce qu'on venait de gagner.
 *
 * Le voile et le nom lisent la même liste : deux regroupements calculés à part
 * finiraient par nommer un territoire et en dessiner un autre.
 *
 * Un secteur trop maigre n'est pas un secteur : trois points isolés portant une
 * étiquette feraient croire à une zone qui n'existe pas.
 */
function secteursDuCerveau(etat) {
  const cotes = etat.deuxHemispheres ? [GENRE.VALEUR, GENRE.FONCTION] : [null];

  return etat.domaines
    .flatMap((entree) => cotes.map((cote) => ({
      entree,
      cote,
      siens: etat.places.filter((noeud) => texte(noeud.domaine) === entree.domaine
        && (!cote || noeud.genre === cote))
    })))
    .filter((secteur) => secteur.siens.length >= 3);
}

/**
 * Le nom de chaque secteur, posé au milieu de sa zone.
 *
 * **C'est ce qui rend le regroupement utile.** Une zone dense sans nom est une
 * tache : on voit qu'il se passe quelque chose là, on ne sait pas quoi. Avec le
 * nom, on se dit « tiens, ce paquet, c'est la sécurité incendie » — et c'est
 * exactement ce qu'on est venu chercher.
 *
 * Un secteur, c'est un domaine **d'un côté de l'équateur** : la sécurité incendie
 * a une zone de mémoire et une zone de raisonnement, et chacune porte son nom.
 * Un seul nom pour les deux tomberait entre elles, c'est-à-dire nulle part, et
 * l'on ne saurait pas lequel des deux paquets il désigne.
 *
 * Le côté se dit **sous** le nom, en petit : la lecture principale reste la
 * discipline, et l'hémisphère n'est là que pour lever l'ambiguïté entre les deux
 * paquets d'une même discipline.
 *
 * Le nom se pose au **barycentre** des nœuds du secteur, pas à l'angle théorique
 * de sa part : le barycentre suit ce que le projet contient vraiment, et un
 * secteur à trois nœuds ne réclame pas la même place qu'un secteur à quarante.
 */
function dessinerLesDomaines(ctx, etat, points, ou, hauteur) {
  ctx.textAlign = "center";

  const nommes = ecarterLesEtiquettes(
    secteursDuCerveau(etat)
      .map((secteur) => ({
        ...secteur,
        ancre: etat.vue === "volume"
          ? capDuSecteur(secteur.siens, ou)
          : barycentreDuSecteur(secteur.siens, points)
      }))
      .filter((secteur) => secteur.ancre),
    hauteur
  );

  for (const { entree, cote, ancre } of nommes) {
    const vif = etat.survoleLeDomaine === entree.domaine;
    ctx.fillStyle = vif ? "rgba(240,246,252,.92)" : "rgba(201,209,217,.38)";

    ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(entree.libelle.toUpperCase(), ancre.x, ancre.y);

    if (!cote) continue;
    ctx.font = "500 9.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = vif ? "rgba(201,209,217,.6)" : "rgba(139,148,158,.34)";
    ctx.fillText(cote === GENRE.FONCTION ? "raisonnement" : "mémoire", ancre.x, ancre.y + 12);
  }
}

/** L'écart vertical au-dessous duquel deux noms de secteur se recouvrent. */
const ECART_DES_NOMS = 30;

/**
 * Écarter les noms qui se marchent dessus.
 *
 * Les barycentres de cinq domaines qui traversent tous les mêmes colonnes
 * tombent presque à la même abscisse : leurs noms s'empilent, et cinq noms
 * empilés nomment moins qu'un seul. On les décale vers le bas, dans l'ordre où
 * ils viennent, et seulement quand ils sont **aussi** proches horizontalement —
 * deux noms aux deux bouts de l'écran ne se gênent pas.
 *
 * Le nom bouge, jamais le secteur : le voile reste où il est, et le nom lui
 * reste assez près pour qu'on sache lequel il désigne.
 */
function ecarterLesEtiquettes(secteurs, hauteur) {
  const tries = [...secteurs].sort((gauche, droite) => gauche.ancre.y - droite.ancre.y);
  const poses = [];

  for (const secteur of tries) {
    let y = secteur.ancre.y;
    for (const pose of poses) {
      if (Math.abs(pose.ancre.x - secteur.ancre.x) > 110) continue;
      if (y - pose.ancre.y < ECART_DES_NOMS) y = pose.ancre.y + ECART_DES_NOMS;
    }
    // Un nom poussé hors du cadre ne nomme plus rien : on le retient au bord.
    poses.push({ ...secteur, ancre: { ...secteur.ancre, y: Math.min(hauteur - 20, y) } });
  }

  return poses;
}

/** En strates, le barycentre suffit : les bandes sont horizontales. */
function barycentreDuSecteur(siens, points) {
  const somme = siens.reduce((acc, noeud) => {
    const point = points.get(noeud.id);
    return point ? { x: acc.x + point.x, y: acc.y + point.y, n: acc.n + 1 } : acc;
  }, { x: 0, y: 0, n: 0 });

  return somme.n ? { x: somme.x / somme.n, y: somme.y / somme.n } : null;
}

/**
 * En volume, **surtout pas le barycentre**.
 *
 * Les nœuds d'un secteur s'étalent de part et d'autre du centre, leur moyenne y
 * retombe, et les libellés s'empilent au milieu de l'écran — ce qui ne nomme plus
 * rien. On prend la direction moyenne — une moyenne d'angles, sur le cercle — et
 * l'on pose le nom **au bord** de cette direction, là où la zone se voit.
 */
function capDuSecteur(siens, ou) {
  const angles = siens.map((noeud) => Math.atan2(noeud.z, noeud.x));
  const cap = Math.atan2(
    angles.reduce((acc, angle) => acc + Math.sin(angle), 0) / angles.length,
    angles.reduce((acc, angle) => acc + Math.cos(angle), 0) / angles.length
  );
  const hauteur = siens.reduce((acc, noeud) => acc + noeud.y, 0) / siens.length;

  return ou({ x: Math.cos(cap) * 1.12, y: hauteur, z: Math.sin(cap) * 1.12, phase: 0 });
}

/**
 * Les étiquettes en dernier, pour qu'aucun trait ne passe dessus.
 *
 * Sans elles, l'écran est une jolie image dont on ne peut rien tirer. Avec
 * elles, sur trois cents nœuds, c'est une bouillie — et une bouillie ne dit rien
 * de moins qu'un écran vide, elle donne en plus l'impression d'avoir été lue.
 *
 * On les écrit donc **tant qu'elles se lisent**. Au-delà, on ne garde que ce que
 * l'onde touche, ce qui est survolé et ce que l'audit signale : de quoi lire
 * l'écran sans le noircir. Zoomer en fait réapparaître — c'est à cela que sert le
 * zoom, et c'est pour cela qu'il compte les nœuds **visibles à l'écran** plutôt
 * que tous.
 */
function dessinerLesNoms(ctx, etat, largeur, points, eclats) {
  ctx.font = "500 11.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const visibles = etat.places.filter((noeud) => {
    const point = points.get(noeud.id);
    return point.x > -60 && point.x < largeur + 60;
  });
  const toutesLisibles = visibles.length <= etat.seuilDesNoms;

  for (const noeud of visibles) {
    const eclat = eclats.get(noeud.id) ?? 0;
    const signale = etat.signales.has(noeud.id);
    const montre = toutesLisibles || eclat > 0 || signale || noeud.id === etat.survole
      || (etat.vue === "strates" && noeud.nature === NOEUD.SOCLE && etat.places.length <= etat.seuilDesNoms * 3);
    if (!montre) continue;

    const { x, y, p } = points.get(noeud.id);
    const rayon = rayonDe(noeud);
    const nom = abrege(nomDuNoeud(noeud));

    // Près du bord droit, l'étiquette passe à gauche du nœud. Sinon la dernière
    // strate — celle qui porte les conclusions, celle qu'on vient lire — serait
    // la seule dont on ne lit pas les noms.
    const aGauche = x + rayon + 10 + ctx.measureText(nom).width > largeur - 8;
    ctx.textAlign = aGauche ? "right" : "left";
    ctx.globalAlpha = etat.vue === "volume" ? borne(p * 1.3, 0.25, 1) : 1;
    // Un nom qui s'allume prend la couleur de sa famille, pas du blanc. Le blanc
    // était le seul endroit de l'écran où l'onde effaçait ce qu'elle traverse :
    // au moment où l'on regarde un nœud, il cessait de dire s'il était une
    // valeur ou une règle, chaude ou froide.
    const eclatant = eclatDeLaFamille(etat.couleur, noeud.genre);
    ctx.fillStyle = signale
      ? `rgba(${ROUGE},.9)`
      : eclat > 0
        ? `rgba(${eclatant.coeur},${0.8 + 0.2 * eclat})`
        : noeud.id === etat.survole
          ? `rgba(${eclatant.coeur},.95)`
          : "rgba(201,209,217,.62)";
    ctx.fillText(nom, x + (aGauche ? -(rayon + 6) : rayon + 6), y + 4);
    ctx.globalAlpha = 1;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'ouverture
 * ────────────────────────────────────────────────────────────────────────── */

/** Une seule fenêtre à la fois : deux superposées ne se distinguent pas. */
let ouverte = null;

/**
 * Ouvrir le cerveau du projet.
 *
 * @param {object} options
 * @param {object[]} options.assertions la mémoire lue
 * @param {object[]|null} [options.applications] les lectures enregistrées
 */
export function ouvrirLeCerveau({ assertions = [], applications = null } = {}) {
  // Une fenêtre dont l'hôte a quitté le document est fermée, quoi qu'en dise le
  // verrou : sans cette ligne, un rendu qui balaie la page laisse le verrou posé
  // et l'écran ne se rouvre plus jamais.
  if (ouverte && !ouverte.isConnected) ouverte = null;
  if (ouverte) return;

  let cerveau = cerveauDuProjet(assertions, applications, { avecLesFonctions: true });
  if (!cerveau.noeuds.length) {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert("Ce projet ne porte encore aucune affirmation : il n'y a pas de raisonnement à montrer.");
    }
    return;
  }

  let isoles = noeudsIsoles(cerveau);
  const signales = signauxDeLAudit(assertions);

  const hote = document.createElement("div");
  hote.innerHTML = renderCadre(cerveau, isoles.size, [...signales.keys()].length);
  document.body.appendChild(hote);
  ouverte = hote;

  const toile = hote.querySelector("[data-cerveau-toile]");
  const resume = hote.querySelector("[data-cerveau-resume]");
  const legendes = hote.querySelector("[data-cerveau-legendes]");
  const lacunes = hote.querySelector("[data-cerveau-lacunes]");
  const bulle = hote.querySelector("[data-cerveau-bulle]");
  const dit = hote.querySelector("[data-cerveau-onde]");
  const ctx = toile.getContext("2d");

  // Un utilisateur qui a demandé moins de mouvement en a demandé partout. Les
  // impulsions restent — elles portent l'information — mais rien ne respire et
  // rien ne pulse.
  const calme = typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  const etat = {
    vue: "strates",
    mode: "vivant",
    couleur: "nature",
    parDomaine: true,
    /** Les règles dessinées comme des nœuds, entre leurs entrées et leur sortie. */
    avecLesFonctions: true,
    /** La mémoire d'un côté, le raisonnement de l'autre. */
    parGenre: true,
    deuxHemispheres: false,
    /** Quelle fraction du cadre revient à la mémoire. Zéro : rien n'est séparé. */
    partDeLaMemoire: 0,
    domaines: domainesDuCerveau(cerveau),
    poidsMax: cerveau.compte.poidsMax,
    rangsDeFonctions: cerveau.rangsDeFonctions,
    places: [], parId: new Map(), points: new Map(),
    liens: cerveau.liens,
    profondeur: cerveau.profondeur,
    signales,
    impulsions: [],
    survole: "", choisi: "",
    /** La zone sous le pointeur, quand il ne désigne aucun nœud. */
    survoleLeDomaine: "",
    voiles: [],
    respire: !calme,
    /** Au-delà de ce nombre de nœuds **à l'écran**, les étiquettes ne se lisent plus. */
    seuilDesNoms: 45,
    camera: { ...CADRAGE.strates },
    /** La caméra vers laquelle on glisse, ou rien quand on est arrivé. */
    vise: null
  };

  /**
   * Ce qu'on dessine : la vue choisie, moins les isolés si on les a masqués.
   *
   * Les deux dispositions sont calculées à la demande, pas gardées : elles
   * dépendent de ce qu'on montre, et une disposition mise en cache finirait par
   * décrire une liste de nœuds qui n'est plus celle qu'on dessine.
   */
  /**
   * Redemander le cerveau au service, quand ce qu'on veut voir a changé.
   *
   * Le dessin n'est jamais retouché après coup : montrer ou cacher les règles
   * change le graphe lui-même — ses nœuds, ses liens, et les lectures que l'onde
   * suivra. Filtrer un dessin déjà fait laisserait des liens qui pointent vers
   * des nœuds absents, et l'onde sauterait dans le vide.
   */
  const relire = () => {
    cerveau = cerveauDuProjet(assertions, applications, { avecLesFonctions: etat.avecLesFonctions });
    isoles = noeudsIsoles(cerveau);
    etat.poidsMax = cerveau.compte.poidsMax;
    etat.rangsDeFonctions = cerveau.rangsDeFonctions;
    etat.profondeur = cerveau.profondeur;
    etat.impulsions = [];
    if (resume) resume.innerHTML = renderResume(cerveau);
    // La légende aussi : annoncer « 41 règles » sous un dessin qui n'en montre
    // aucune ferait chercher longtemps ce qui n'y est pas.
    if (legendes) {
      legendes.innerHTML = renderLegende(cerveau, [...signales.keys()].length);
      accorderLesLegendes();
    }
    // Les lacunes se comptent sur ce qui est dessiné : cacher les règles cache
    // aussi celles qui pendent, et l'avertissement doit suivre.
    if (lacunes) lacunes.innerHTML = cerveau.enregistres ? renderLacunes(cerveau) : "";
  };

  const recomposer = () => {
    const retenus = etat.montrerLesIsoles
      ? cerveau
      : { ...cerveau, noeuds: cerveau.noeuds.filter((noeud) => !isoles.has(noeud.id)) };

    const brutes = etat.vue === "volume" ? dispositionEnVolume(retenus) : dispositionDuCerveau(retenus);
    etat.domaines = domainesDuCerveau(retenus);
    // Les domaines d'abord, les hémisphères ensuite : le pliage garde l'ordre des
    // bandes, si bien qu'un domaine se retrouve à la même hauteur relative dans
    // les deux moitiés. L'inverse plierait des bandes qui n'existent pas encore.
    const penchees = etat.parDomaine ? pencherVersLesDomaines(brutes, retenus) : brutes;
    etat.partDeLaMemoire = etat.parGenre ? partDeLaMemoire(penchees) : 0;
    etat.places = separerLesGenres(penchees, { actif: etat.parGenre });
    etat.deuxHemispheres = etat.partDeLaMemoire > 0;
    etat.parId = new Map(etat.places.map((noeud) => [noeud.id, noeud]));
    const dedans = new Set(etat.places.map((noeud) => noeud.id));
    etat.liens = cerveau.liens.filter((lien) => dedans.has(lien.de) && dedans.has(lien.vers));
  };

  etat.montrerLesIsoles = false;
  recomposer();

  let largeur = 0;
  let hauteur = 0;

  const redimensionner = () => {
    const scene = toile.parentElement;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    largeur = Math.max(1, scene.clientWidth);
    hauteur = Math.max(1, scene.clientHeight);
    toile.width = Math.round(largeur * ratio);
    toile.height = Math.round(hauteur * ratio);
    toile.style.width = `${largeur}px`;
    toile.style.height = `${hauteur}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  /* ── Les impulsions ────────────────────────────────────────────────────── */

  /**
   * Allumer ce qui découle de cette valeur, strate par strate.
   *
   * Rien n'est programmé par minuterie : chaque impulsion porte son heure de
   * départ, et l'image en cours calcule son éclat. Deux ondes peuvent donc se
   * croiser — ce dont le battement a besoin — et il n'y a aucune minuterie à
   * annuler quand on change de mode.
   */
  const allumer = (depart, { duree, dire = false } = {}) => {
    // Les lectures du cerveau, pas celles d'origine : dépliées, elles passent
    // *par* les règles. Avec les lectures d'origine, l'onde sauterait par-dessus
    // les nœuds qu'on vient de dessiner, et ils ne s'allumeraient jamais.
    const onde = ondeDepuis(depart, cerveau.lectures);
    const debut = performance.now();

    etat.impulsions.push({ id: depart, debut, duree });
    onde.strates.forEach((strate, rang) => {
      for (const id of strate) {
        if (!etat.parId.has(id)) continue;
        etat.impulsions.push({ id, debut: debut + (calme ? 0 : (rang + 1) * PAS_DE_LONDE), duree });
      }
    });

    if (!dire) return onde;

    const noeud = etat.parId.get(depart);
    const opaques = onde.strates.flat()
      .filter((id) => etat.parId.get(id)?.nature === NOEUD.OPAQUE).length;

    // Les règles traversées se comptent à part, et par la même fonction que la
    // bulle d'une règle : deux comptages de la même chose finiraient par ne plus
    // dire la même chose.
    const { valeurs, regles, strates: pas } = valeursDeLOnde(onde, cerveau);

    dit.innerHTML = onde.total
      ? `<b>${escapeHtml(nomDuNoeud(noeud))}</b> — ${valeurs}
         ${accorde(valeurs, "affirmation en découle", "affirmations en découlent")}${
           regles ? `, par ${regles} ${accorde(regles, "règle", "règles")}` : ""
         },
         sur ${pas} ${accorde(pas, "strate", "strates")}.
         ${
           opaques
             ? `${opaques} ${accorde(opaques, "vient", "viennent")} d'un utilitaire : on sait
                ${accorde(opaques, "qu'elle dépend", "qu'elles dépendent")}, l'onde ne prétend pas
                ${accorde(opaques, "la", "les")} recalculer ici.`
             : "Toutes se rejouent."
         }`
      : `<b>${escapeHtml(nomDuNoeud(noeud))}</b> — rien ne repose sur cette valeur.
         ${
           cerveau.enregistres
             ? "C'est une information : la changer n'entraîne rien."
             : "Aucune lecture n'étant enregistrée, l'absence de lien ne prouve rien."
         }`;
    return onde;
  };

  /* ── Le battement ──────────────────────────────────────────────────────── */

  /**
   * Ce dont partent les impulsions du battement.
   *
   * Le socle, et seulement ce qui a une suite : une impulsion sur un nœud dont
   * rien ne dépend n'allumerait que lui-même, et le battement passerait son temps
   * à faire clignoter des points isolés.
   */
  const sources = () => etat.places
    .filter((noeud) => noeud.nature === NOEUD.SOCLE)
    .filter((noeud) => etat.liens.some((lien) => lien.de === noeud.id))
    .map((noeud) => noeud.id);

  let pouls = null;
  let prochaine = 0;

  const battre = () => {
    const depart = sources();
    if (!depart.length) {
      dit.innerHTML = `Aucune valeur du socle n'a de suite : il n'y a rien à faire battre.`;
      return;
    }
    prochaine = prochaine % depart.length;
    allumer(depart[prochaine], { duree: TENUE.battement });
    prochaine += 1;
  };

  const arreterLeBattement = () => { clearInterval(pouls); pouls = null; };

  /**
   * Le cumul des deux modes : le projet bat, et se tait quand on le regarde.
   *
   * Le battement seul finit par fatiguer, et il gêne au moment précis où l'on
   * veut lire quelque chose — on survole un nœud pour lire sa bulle, et le fond
   * continue de clignoter derrière. L'onde seule, elle, laisse un écran mort tant
   * qu'on n'a rien demandé, et l'on ne voit pas ce qui va mal.
   *
   * Ensemble : ça bat tant qu'on ne s'approche pas, ça s'arrête dès qu'on
   * survole, et ça repart quand on s'éloigne. Le clic garde son onde. Personne
   * n'a rien à régler — c'est le mode par défaut.
   */
  const accorderLeBattement = () => {
    const doitBattre = etat.mode === "battement"
      || (etat.mode === "vivant" && !etat.survole && !glisse);

    if (doitBattre && !pouls) demarrerLeBattement({ dire: false });
    else if (!doitBattre && pouls) arreterLeBattement();
  };

  const demarrerLeBattement = ({ dire = true } = {}) => {
    arreterLeBattement();
    const combien = etat.signales.size;
    if (dire) dit.innerHTML = combien
      ? `Le projet pense tout seul. <b>${combien}
         ${accorde(combien, "valeur bat", "valeurs battent")} en rouge</b> :
         ${escapeHtml(phraseDuSignal([...etat.signales.values()][0]))}${combien > 1 ? ", entre autres" : ""}.
         Survolez-les pour savoir laquelle.`
      : `Le projet pense tout seul. <b>L'audit ne signale rien</b> : chaque règle rejouée rend ce
         que le projet affirme.`;
    battre();
    pouls = setInterval(battre, POULS);
  };

  /* ── La caméra ─────────────────────────────────────────────────────────── */

  const recadrer = () => { etat.camera = { ...CADRAGE[etat.vue] }; etat.vise = null; };

  /**
   * Amener un nœud au centre, et l'approcher.
   *
   * ## Pourquoi la caméra bouge d'elle-même
   *
   * Parce que sur un projet réel, le nœud qu'on vient de cliquer est un point de
   * trois pixels dans un nuage de trois cents. On lit sa bulle, on suit son onde,
   * et l'on ne voit ni l'un ni l'autre : il faut molette, glissé, molette encore,
   * et l'on a perdu de vue ce qu'on cherchait. Le clic dit déjà « celui-là » —
   * l'écran n'a pas besoin qu'on le lui redemande à la main.
   *
   * ## Pourquoi on vise sans sauter
   *
   * Un saut ne dit pas d'où l'on vient. Le glissement garde le lien entre l'avant
   * et l'après : on voit le reste du dessin s'écarter autour du nœud, et l'on sait
   * donc encore où l'on est. C'est la même raison qui fait que l'onde monte strate
   * par strate au lieu de tout allumer d'un coup.
   *
   * ## Pourquoi on n'approche que si l'on est loin
   *
   * Le zoom visé est un **plancher**, jamais une remise à zéro : quelqu'un qui a
   * déjà approché sa zone garde son échelle, et le clic ne fait que recentrer.
   * Reculer quelqu'un qui vient d'approcher serait lui reprendre son geste.
   */
  const viser = (id) => {
    const noeud = etat.parId.get(id);
    if (!noeud) return;

    const zoom = borne(Math.max(etat.camera.zoom, APPROCHE[etat.vue]), 0.25, 8);
    // On projette avec la caméra visée mais sans décalage : ce qu'on lit alors
    // est exactement le décalage qu'il faut pour amener ce nœud au centre.
    const sansDecalage = { ...etat, camera: { ...etat.camera, zoom, dx: 0, dy: 0 } };
    const point = projeteur(sansDecalage, largeur, hauteur, performance.now())(noeud);

    etat.vise = { zoom, dx: largeur / 2 - point.x, dy: hauteur / 2 - point.y };
  };

  /** Un pas de glissement vers la caméra visée. Rien à faire si l'on n'y va pas. */
  const glisserVersLaCible = () => {
    if (!etat.vise) return;
    const reste = Math.abs(etat.vise.zoom - etat.camera.zoom) * 60
      + Math.hypot(etat.vise.dx - etat.camera.dx, etat.vise.dy - etat.camera.dy);

    // Assez près : on se pose exactement, plutôt que d'approcher indéfiniment par
    // moitiés — une caméra qui ne s'arrête jamais redessine l'écran pour rien.
    if (reste < 0.6) {
      etat.camera = { ...etat.camera, ...etat.vise };
      etat.vise = null;
      return;
    }

    for (const champ of ["zoom", "dx", "dy"]) {
      etat.camera[champ] += (etat.vise[champ] - etat.camera[champ]) * PAS_DU_VISEUR;
    }
  };

  const zoomer = (facteur, versX = null, versY = null) => {
    // La molette reprend la main : on ne se bat pas avec un mouvement qu'on n'a
    // pas demandé.
    etat.vise = null;
    const avant = etat.camera.zoom;
    etat.camera.zoom = borne(avant * facteur, 0.25, 8);
    const reel = etat.camera.zoom / avant;

    // Zoomer sous le curseur, pas au centre : sans cela, approcher un détail le
    // fait fuir hors de l'écran et l'on passe son temps à le rattraper.
    if (etat.vue === "strates" && versX !== null) {
      etat.camera.dx = versX - (versX - etat.camera.dx) * reel;
      etat.camera.dy = versY - (versY - etat.camera.dy) * reel;
    }
  };

  let glisse = null;

  const auPointeurBas = (evenement) => {
    const cadre = toile.getBoundingClientRect();
    glisse = {
      x: evenement.clientX, y: evenement.clientY,
      dx: etat.camera.dx, dy: etat.camera.dy,
      orbite: etat.camera.orbite, elevation: etat.camera.elevation,
      // Un glissé n'est pas un clic. Sans ce seuil, déplacer la vue déclenche
      // une onde en la relâchant, et l'on ne peut plus se promener.
      bouge: false,
      dansLaScene: evenement.clientX - cadre.left, y0: evenement.clientY - cadre.top
    };
    toile.setPointerCapture?.(evenement.pointerId);
  };

  const auPointeurBouge = (evenement) => {
    if (glisse) {
      const dx = evenement.clientX - glisse.x;
      const dy = evenement.clientY - glisse.y;
      if (Math.hypot(dx, dy) > 4) glisse.bouge = true;

      // Le glissé reprend la main, comme la molette.
      etat.vise = null;

      if (etat.vue === "volume") {
        // En volume, le glissé fait tourner : c'est le geste qu'on attend d'un
        // objet, et déplacer une sphère centrée n'aurait aucun sens.
        etat.camera.orbite = glisse.orbite + dx * 0.006;
        etat.camera.elevation = borne(glisse.elevation - dy * 0.005, -1.4, 1.4);
      } else {
        etat.camera.dx = glisse.dx + dx;
        etat.camera.dy = glisse.dy + dy;
      }
      toile.style.cursor = "grabbing";
      bulle.hidden = true;
      accorderLeBattement();
      return;
    }

    const noeud = sousLeCurseur(evenement);
    etat.survole = noeud?.id ?? "";
    // Un nœud l'emporte sur sa zone : on désigne d'abord ce qu'on montre du
    // doigt, et la zone n'est là que pour ce qu'on désigne entre les doigts.
    etat.survoleLeDomaine = noeud ? "" : domaineSousLeCurseur(evenement);
    toile.style.cursor = noeud ? "pointer" : "grab";
    accorderLeBattement();

    if (!noeud) {
      if (etat.survoleLeDomaine) montrerLaBulleDuDomaine(etat.survoleLeDomaine, evenement);
      else bulle.hidden = true;
      return;
    }
    montrerLaBulle(noeud, evenement);
  };

  const auPointeurHaut = (evenement) => {
    const bouge = glisse?.bouge;
    glisse = null;
    toile.style.cursor = "grab";
    accorderLeBattement();
    if (bouge) return;
    const noeud = sousLeCurseur(evenement);
    if (noeud) {
      etat.choisi = noeud.id;
      allumer(noeud.id, { duree: TENUE.onde, dire: true });
      viser(noeud.id);
    }
  };

  const alaMolette = (evenement) => {
    evenement.preventDefault();
    const cadre = toile.getBoundingClientRect();
    zoomer(
      evenement.deltaY < 0 ? 1.12 : 1 / 1.12,
      evenement.clientX - cadre.left,
      evenement.clientY - cadre.top
    );
  };

  /* ── Le pointeur ───────────────────────────────────────────────────────── */

  const sousLeCurseur = (evenement) => {
    const cadre = toile.getBoundingClientRect();
    const x = evenement.clientX - cadre.left;
    const y = evenement.clientY - cadre.top;

    let trouve = null;
    let distance = Infinity;
    for (const noeud of etat.places) {
      const point = etat.points.get(noeud.id);
      if (!point) continue;
      const ecart = Math.hypot(point.x - x, point.y - y);
      if (ecart < rayonDe(noeud) + 8 && ecart < distance) { trouve = noeud; distance = ecart; }
    }
    return trouve;
  };

  /** La zone sous le pointeur, ou rien. La plus petite gagne : elle est dedans. */
  const domaineSousLeCurseur = (evenement) => {
    const cadre = toile.getBoundingClientRect();
    const point = { x: evenement.clientX - cadre.left, y: evenement.clientY - cadre.top };

    let trouve = "";
    let aire = Infinity;
    for (const voile of etat.voiles) {
      if (!dansLEnveloppe(point, voile.contour)) continue;
      // Deux voiles se chevauchent : c'est voulu. Le plus petit l'emporte, sans
      // quoi une grande zone masquerait toujours la petite qu'elle recouvre.
      const etendue = aireDuContour(voile.contour);
      if (etendue < aire) { trouve = voile.domaine; aire = etendue; }
    }
    return trouve;
  };

  const montrerLaBulleDuDomaine = (domaine, evenement) => {
    const entree = etat.domaines.find((autre) => autre.domaine === domaine);
    if (!entree) { bulle.hidden = true; return; }

    const siens = etat.places.filter((noeud) => texte(noeud.domaine) === domaine);
    const chauds = [...siens].sort((g, d) => d.poids - g.poids).slice(0, 3);
    const malades = siens.filter((noeud) => etat.signales.has(noeud.id)).length;

    bulle.hidden = false;
    bulle.innerHTML = `
      <b>${escapeHtml(entree.libelle)}</b>
      <span class="cerveau-bulle__compte">${siens.length}
        ${accorde(siens.length, "affirmation", "affirmations")} dans cette zone</span>
      ${
        chauds.length
          ? `<span class="cerveau-bulle__nature" style="--trait:#f0883e">Ce qui pèse le plus :
              ${escapeHtml(chauds.map(nomDuNoeud).join(", "))}</span>`
          : ""
      }
      ${
        malades
          ? `<span class="cerveau-bulle__signal">${malades}
              ${accorde(malades, "valeur signalée", "valeurs signalées")} par l'audit</span>`
          : ""
      }
    `;

    const cadre = toile.getBoundingClientRect();
    const gauche = Math.min(cadre.width - 250, Math.max(8, evenement.clientX - cadre.left + 14));
    const haut = Math.min(cadre.height - 110, evenement.clientY - cadre.top + 14);
    bulle.style.transform = `translate(${gauche}px, ${haut}px)`;
  };

  const montrerLaBulle = (noeud, evenement) => {
    const nature = NATURES[noeud.nature];
    const signal = etat.signales.get(noeud.id);
    const fonction = noeud.genre === GENRE.FONCTION;

    bulle.hidden = false;
    bulle.innerHTML = `
      <b>${escapeHtml(nomDuNoeud(noeud))}</b>
      <span class="cerveau-bulle__valeur">${escapeHtml(noeud.valeur || "—")}</span>
      ${
        fonction
          ? `<span class="cerveau-bulle__nature" style="--trait:#a371f7">Règle appliquée —
              le mécanisme, pas la valeur</span>
             <span class="cerveau-bulle__compte">${phraseDeLaComplexite(noeud.complexite)}</span>
             <span class="cerveau-bulle__aval">${phraseDeLAval(avalDeLaRegle(noeud.id, cerveau))}</span>`
          : `<span class="cerveau-bulle__nature" style="--trait:${nature?.trait ?? "#8b949e"}">
              ${escapeHtml(nature?.nom ?? "")}${noeud.rejouable ? " · recalculable au serveur" : ""}
             </span>`
      }
      ${
        fonction
          ? `<span class="cerveau-bulle__compte">${noeud.entrant}
              ${accorde(noeud.entrant, "entrée lue", "entrées lues")} · ${noeud.sortant}
              ${accorde(noeud.sortant, "sortie", "sorties")}</span>`
          : noeud.lectures
            ? `<span class="cerveau-bulle__compte">${noeud.lectures}
                ${accorde(noeud.lectures, "emploi", "emplois")} · strate ${noeud.strate}</span>`
            : `<span class="cerveau-bulle__compte">aucun emploi connu · strate ${noeud.strate}</span>`
      }
      ${!fonction && noeud.famille ? renderFamille(noeud) : ""}
      ${signal ? `<span class="cerveau-bulle__signal">${escapeHtml(phraseDuSignal(signal))}</span>` : ""}
      ${noeud.enRond ? `<span class="cerveau-bulle__cycle">se lit en rond</span>` : ""}
    `;

    const cadre = toile.getBoundingClientRect();
    const gauche = Math.min(cadre.width - 250, Math.max(8, evenement.clientX - cadre.left + 14));
    const haut = Math.min(cadre.height - 110, evenement.clientY - cadre.top + 14);
    bulle.style.transform = `translate(${gauche}px, ${haut}px)`;
  };

  /* ── La barre ──────────────────────────────────────────────────────────── */

  const marquer = (nom, valeur) => {
    for (const bouton of hote.querySelectorAll(`[data-cerveau-${nom}]`)) {
      const actif = bouton.getAttribute(`data-cerveau-${nom}`) === valeur;
      bouton.classList.toggle("est-actif", actif);
      bouton.setAttribute("aria-pressed", actif ? "true" : "false");
    }
  };

  const changerDeVue = (vue) => {
    if (etat.vue === vue) return;
    etat.vue = vue;
    etat.impulsions = [];
    recadrer();
    recomposer();
    marquer("vue", vue);
  };

  const changerDeMode = (mode) => {
    if (etat.mode === mode) return;
    etat.mode = mode;
    etat.impulsions = [];
    marquer("mode", mode);
    arreterLeBattement();

    if (mode === "onde") {
      dit.innerHTML = `Cliquez une valeur : l'onde remonte ce qui en découle, une strate à la fois.
        Molette pour zoomer, glissé pour ${etat.vue === "volume" ? "tourner" : "déplacer"}.`;
      return;
    }

    const combien = etat.signales.size;
    dit.innerHTML = `${
      mode === "vivant"
        ? "Le projet bat tout seul, et s'arrête dès que vous le survolez. Un clic lance l'onde."
        : "Le projet pense tout seul, sans s'arrêter."
    } ${
      combien
        ? `<b>${combien} ${accorde(combien, "valeur bat", "valeurs battent")} en rouge</b> :
           ${escapeHtml(phraseDuSignal([...etat.signales.values()][0]))}${combien > 1 ? ", entre autres" : ""}.`
        : "<b>L'audit ne signale rien.</b>"
    }`;
    accorderLeBattement();
  };

  /** La légende suit la couleur : celle de l'autre ne dit rien de ce qu'on voit. */
  const accorderLesLegendes = () => {
    for (const bloc of hote.querySelectorAll("[data-cerveau-legende]")) {
      bloc.hidden = bloc.getAttribute("data-cerveau-legende") !== etat.couleur;
    }
  };

  const changerDeCouleur = (couleur) => {
    if (etat.couleur === couleur) return;
    etat.couleur = couleur;
    marquer("couleur", couleur);
    accorderLesLegendes();
  };

  /* ── La boucle ─────────────────────────────────────────────────────────── */

  let image = 0;
  const boucle = (temps) => {
    glisserVersLaCible();
    dessiner(ctx, etat, largeur, hauteur, temps);
    image = requestAnimationFrame(boucle);
  };

  const fermer = () => {
    cancelAnimationFrame(image);
    arreterLeBattement();
    window.removeEventListener("resize", redimensionner);
    document.removeEventListener("keydown", auClavier);
    hote.remove();
    ouverte = null;
  };

  const auClavier = (evenement) => {
    if (evenement.key === "Escape") fermer();
  };

  window.addEventListener("resize", redimensionner);
  document.addEventListener("keydown", auClavier);
  toile.addEventListener("pointerdown", auPointeurBas);
  toile.addEventListener("pointermove", auPointeurBouge);
  toile.addEventListener("pointerup", auPointeurHaut);
  toile.addEventListener("pointercancel", () => { glisse = null; });
  toile.addEventListener("pointerleave", () => {
    etat.survole = "";
    etat.survoleLeDomaine = "";
    bulle.hidden = true;
    accorderLeBattement();
  });
  toile.addEventListener("wheel", alaMolette, { passive: false });

  for (const bouton of hote.querySelectorAll("[data-cerveau-fermer]")) {
    bouton.addEventListener("click", fermer);
  }
  for (const bouton of hote.querySelectorAll("[data-cerveau-vue]")) {
    bouton.addEventListener("click", () => changerDeVue(bouton.getAttribute("data-cerveau-vue")));
  }
  for (const bouton of hote.querySelectorAll("[data-cerveau-mode]")) {
    bouton.addEventListener("click", () => changerDeMode(bouton.getAttribute("data-cerveau-mode")));
  }
  for (const bouton of hote.querySelectorAll("[data-cerveau-zoom]")) {
    bouton.addEventListener("click", () => zoomer(Number(bouton.getAttribute("data-cerveau-zoom")) > 0 ? 1.3 : 1 / 1.3));
  }
  for (const bouton of hote.querySelectorAll("[data-cerveau-recadrer]")) {
    bouton.addEventListener("click", recadrer);
  }
  for (const bouton of hote.querySelectorAll("[data-cerveau-couleur]")) {
    bouton.addEventListener("click", () => changerDeCouleur(bouton.getAttribute("data-cerveau-couleur")));
  }
  const caseDesGenres = hote.querySelector("[data-cerveau-genres]");
  if (caseDesGenres) {
    caseDesGenres.addEventListener("change", () => {
      etat.parGenre = caseDesGenres.checked;
      recomposer();
    });
  }
  const caseDesDomaines = hote.querySelector("[data-cerveau-domaines]");
  if (caseDesDomaines) {
    caseDesDomaines.addEventListener("change", () => {
      etat.parDomaine = caseDesDomaines.checked;
      recomposer();
    });
  }
  const caseDesFonctions = hote.querySelector("[data-cerveau-fonctions]");
  if (caseDesFonctions) {
    caseDesFonctions.addEventListener("change", () => {
      etat.avecLesFonctions = caseDesFonctions.checked;
      relire();
      recomposer();
    });
  }
  const casedesIsoles = hote.querySelector("[data-cerveau-isoles]");
  if (casedesIsoles) {
    casedesIsoles.addEventListener("change", () => {
      etat.montrerLesIsoles = casedesIsoles.checked;
      etat.impulsions = [];
      recomposer();
    });
  }

  toile.style.cursor = "grab";
  redimensionner();
  accorderLeBattement();
  image = requestAnimationFrame(boucle);
}

/** Pour les pages d'essai : le cadre seul, sans boucle ni pointeur. */
export function __renderCerveauPourPreview(assertions, applications) {
  const cerveau = cerveauDuProjet(assertions, applications, { avecLesFonctions: true });
  return renderCadre(cerveau, noeudsIsoles(cerveau).size, signauxDeLAudit(assertions).size);
}
