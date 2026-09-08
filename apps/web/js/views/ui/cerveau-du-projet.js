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
  cerveauDuProjet, chaleurDuLien, chaleurDuNoeud, dansLEnveloppe, dilaterLEnveloppe, dispositionDuCerveau,
  dispositionEnVolume, domainesDuCerveau, enveloppeConvexe, noeudsIsoles, ondeDepuis,
  pencherVersLesDomaines, phraseDuSignal, signauxDeLAudit
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

/** Ce que l'audit signale bat de cette couleur, et d'aucune autre à l'écran. */
const ROUGE = "248,81,73";

/**
 * La couleur d'une impulsion, selon ce que l'écran est en train de dire.
 *
 * En **nature**, le bleu : c'est la couleur de ce qui se rejoue, et l'onde parle
 * de rejeu.
 *
 * En **chaleur**, surtout pas. Un écran entièrement orange où l'onde passe en
 * bleu fait deux langages à la fois : on croit que le bleu **veut dire** quelque
 * chose de plus froid, alors qu'il ne dit que « ceci vient de s'allumer ». La
 * même idée doit se dire dans la même langue : l'onde y est donc du blanc chaud,
 * le haut du dégradé poussé jusqu'à l'incandescence.
 */
const ECLAT = {
  nature: { vif: "88,166,255", coeur: "160,205,255" },
  chaleur: { vif: "255,201,132", coeur: "255,243,214" }
};

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

/** La teinte d'une chaleur, interpolée entre deux arrêts du dégradé. */
function teinteDeLaChaleur(chaleur) {
  const t = borne(Number(chaleur) || 0, 0, 1);
  for (let i = 1; i < CHALEUR.length; i += 1) {
    if (t > CHALEUR[i].a) continue;
    const bas = CHALEUR[i - 1];
    const haut = CHALEUR[i];
    const part = (t - bas.a) / (haut.a - bas.a || 1);
    return bas.teinte.map((canal, k) => Math.round(canal + (haut.teinte[k] - canal) * part)).join(",");
  }
  return CHALEUR.at(-1).teinte.join(",");
}

/**
 * Le cadrage de départ de chaque vue.
 *
 * Elles n'ont pas le même cadrage naturel : les colonnes remplissent la largeur
 * d'elles-mêmes, le volume est une boule qu'il faut approcher pour qu'elle ne
 * flotte pas au milieu d'un écran vide. Un seul réglage pour les deux laissait
 * l'une des deux mal posée.
 */
const CADRAGE = {
  strates: { zoom: 1, dx: 0, dy: 0, orbite: 0, elevation: 0 },
  volume: { zoom: 1.7, dx: 0, dy: 0, orbite: 0.6, elevation: 0.42 }
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
  const bande = [0, 0.2, 0.4, 0.6, 0.8, 1]
    .map((chaleur) => `<i style="--trait:rgb(${teinteDeLaChaleur(chaleur)})"></i>`).join("");

  return `
    <div class="cerveau-legende" data-cerveau-legende="chaleur" hidden>
      <span class="cerveau-legende__item cerveau-legende__echelle">
        <span class="cerveau-echelle">${bande}</span>
        <b>Ce qui passe par là</b>
        <small>emplois et liens réunis — la taille suit le même poids</small>
      </span>
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

function renderCadre(cerveau, isoles, signales) {
  const { compte, profondeur, noeuds, cycles } = cerveau;

  return `
    <div class="cerveau" role="dialog" aria-modal="true" aria-label="Le cerveau du projet">
      <header class="cerveau__tete">
        <b>${svgIcon("beaker", { className: "octicon" })} Le cerveau du projet</b>
        <span class="cerveau__compte">
          ${noeuds.length} ${accorde(noeuds.length, "affirmation", "affirmations")}
          · ${compte.liens} ${accorde(compte.liens, "lien", "liens")}
          · la plus longue chaîne fait <b>${profondeur}</b> ${accorde(profondeur, "pas", "pas")}
        </span>
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

      <div class="cerveau__scene">
        <canvas data-cerveau-toile></canvas>
        <div class="cerveau__bulle" data-cerveau-bulle hidden></div>
      </div>

      <div class="cerveau__pied">
        ${renderLegende(cerveau, signales)}
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

/** L'aire d'un contour fermé, par la formule du lacet. Toujours positive. */
function aireDuContour(contour = []) {
  let deux = 0;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i, i += 1) {
    deux += (contour[j].x + contour[i].x) * (contour[j].y - contour[i].y);
  }
  return Math.abs(deux / 2);
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
    // Un lien est **malade** quand l'une de ses extrémités l'est : c'est par lui
    // que le défaut se propage, et le laisser gris ferait chercher d'où ça vient.
    const malade = signales.has(lien.de) || signales.has(lien.vers);

    if (vif > 0) {
      const eclat = ECLAT[etat.couleur] ?? ECLAT.nature;
      // Une impulsion brille : elle est plus claire et plus opaque que tout le
      // reste, pour qu'on la suive à travers un écran déjà coloré.
      ctx.strokeStyle = `rgba(${vif > 0.6 ? eclat.coeur : eclat.vif},${0.45 + 0.55 * vif})`;
    } else if (proche) {
      ctx.strokeStyle = "rgba(240,246,252,.7)";
    } else if (malade) {
      ctx.strokeStyle = `rgba(${ROUGE},${0.2 + 0.3 * fond})`;
    } else if (etat.couleur === "chaleur") {
      const chaleur = chaleurDuLien(lien, etat.parId, etat.poidsMax);
      ctx.strokeStyle = `rgba(${teinteDeLaChaleur(chaleur)},${(0.14 + 0.5 * chaleur) * (0.45 + 0.55 * fond)})`;
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
    const trait = NATURES[noeud.nature]?.trait ?? "#8b949e";
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
        const teinte = ECLAT[etat.couleur] ?? ECLAT.nature;
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
    ctx.beginPath();
    ctx.arc(x, y, rayon, 0, Math.PI * 2);

    if (signal) {
      ctx.fillStyle = `rgba(${ROUGE},.9)`;
      ctx.fill();
    } else if (etat.couleur === "chaleur") {
      // La chaleur dit **combien de raisonnement passe par là**, et rien d'autre.
      // La nature reste lisible à la forme : plein pour une source, cerclé pour
      // ce qui se rejoue, creux pour ce qu'on ne sait pas refaire.
      const chaud = teinteDeLaChaleur(chaleurDuNoeud(noeud, etat.poidsMax));
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

  if (etat.parDomaine) dessinerLesDomaines(ctx, etat, points, ou);
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

  rangs.forEach((rang, index) => {
    const modele = etat.places.find((noeud) => noeud.x === rang);
    const x = points.get(modele.id).x;
    if (x < -40 || x > largeur + 40) return;

    ctx.strokeStyle = "rgba(139,148,158,.10)";
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, hauteur - 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(139,148,158,.55)";
    ctx.fillText(index === 0 ? "socle" : modele.enRond ? "en rond" : `${index} pas`, x, 16);
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

  for (const [strate, combien] of [...parStrate.entries()].sort((g, d) => g[0] - d[0])) {
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
      `${strate === 0 ? "socle" : `${strate} pas`} · ${combien}`,
      cx + rayon + 8, cy + 4 + strate * 15
    );
  }
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

  for (const entree of etat.domaines) {
    const siens = etat.places
      .filter((noeud) => texte(noeud.domaine) === entree.domaine)
      .map((noeud) => points.get(noeud.id))
      .filter(Boolean);
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
 * Le nom de chaque domaine, posé au milieu de sa zone.
 *
 * **C'est ce qui rend le regroupement utile.** Une zone dense sans nom est une
 * tache : on voit qu'il se passe quelque chose là, on ne sait pas quoi. Avec le
 * nom, on se dit « tiens, ce paquet, c'est la sécurité incendie » — et c'est
 * exactement ce qu'on est venu chercher.
 *
 * Le nom se pose au **barycentre** des nœuds du domaine, pas à l'angle théorique
 * de son secteur : le barycentre suit ce que le projet contient vraiment, et un
 * domaine à deux nœuds ne réclame pas la même place qu'un domaine à quarante.
 *
 * Un domaine trop maigre ne se nomme pas : trois points isolés portant une
 * étiquette feraient croire à une zone qui n'existe pas.
 */
function dessinerLesDomaines(ctx, etat, points, ou) {
  ctx.textAlign = "center";
  ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  for (const entree of etat.domaines) {
    ctx.fillStyle = etat.survoleLeDomaine === entree.domaine
      ? "rgba(240,246,252,.92)"
      : "rgba(201,209,217,.38)";
    const siens = etat.places.filter((noeud) => texte(noeud.domaine) === entree.domaine);
    // Trois points isolés portant une étiquette feraient croire à une zone qui
    // n'existe pas. En dessous, on se tait.
    if (siens.length < 3) continue;

    if (etat.vue !== "volume") {
      // En strates, le barycentre suffit : les bandes sont horizontales, et la
      // moyenne tombe au milieu de la bande.
      const somme = siens.reduce((acc, noeud) => {
        const point = points.get(noeud.id);
        return point ? { x: acc.x + point.x, y: acc.y + point.y, n: acc.n + 1 } : acc;
      }, { x: 0, y: 0, n: 0 });
      if (!somme.n) continue;
      ctx.fillText(entree.libelle.toUpperCase(), somme.x / somme.n, somme.y / somme.n);
      continue;
    }

    // En volume, **surtout pas le barycentre** : les nœuds d'un domaine
    // s'étalent de part et d'autre du centre, leur moyenne y retombe, et les
    // cinq libellés s'empilent au milieu de l'écran — ce qui ne nomme plus rien.
    //
    // On prend la direction moyenne — une moyenne d'angles, sur le cercle — et
    // l'on pose le nom **au bord** de cette direction, là où la zone se voit.
    const angles = siens.map((noeud) => Math.atan2(noeud.z, noeud.x));
    const cap = Math.atan2(
      angles.reduce((acc, angle) => acc + Math.sin(angle), 0) / angles.length,
      angles.reduce((acc, angle) => acc + Math.cos(angle), 0) / angles.length
    );
    const hauteur = siens.reduce((acc, noeud) => acc + noeud.y, 0) / siens.length;

    const point = ou({ x: Math.cos(cap) * 1.12, y: hauteur, z: Math.sin(cap) * 1.12, phase: 0 });
    ctx.fillText(entree.libelle.toUpperCase(), point.x, point.y);
  }
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
    const nom = abrege(noeud.sujet);

    // Près du bord droit, l'étiquette passe à gauche du nœud. Sinon la dernière
    // strate — celle qui porte les conclusions, celle qu'on vient lire — serait
    // la seule dont on ne lit pas les noms.
    const aGauche = x + rayon + 10 + ctx.measureText(nom).width > largeur - 8;
    ctx.textAlign = aGauche ? "right" : "left";
    ctx.globalAlpha = etat.vue === "volume" ? borne(p * 1.3, 0.25, 1) : 1;
    ctx.fillStyle = eclat > 0 || noeud.id === etat.survole
      ? "#f0f6fc"
      : signale ? `rgba(${ROUGE},.9)` : "rgba(201,209,217,.62)";
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

  const cerveau = cerveauDuProjet(assertions, applications);
  if (!cerveau.noeuds.length) {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert("Ce projet ne porte encore aucune affirmation : il n'y a pas de raisonnement à montrer.");
    }
    return;
  }

  const isoles = noeudsIsoles(cerveau);
  const signales = signauxDeLAudit(assertions);
  const lectures = Array.isArray(applications) ? applications : [];

  const hote = document.createElement("div");
  hote.innerHTML = renderCadre(cerveau, isoles.size, [...signales.keys()].length);
  document.body.appendChild(hote);
  ouverte = hote;

  const toile = hote.querySelector("[data-cerveau-toile]");
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
    domaines: domainesDuCerveau(cerveau),
    poidsMax: cerveau.compte.poidsMax,
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
    camera: { ...CADRAGE.strates }
  };

  /**
   * Ce qu'on dessine : la vue choisie, moins les isolés si on les a masqués.
   *
   * Les deux dispositions sont calculées à la demande, pas gardées : elles
   * dépendent de ce qu'on montre, et une disposition mise en cache finirait par
   * décrire une liste de nœuds qui n'est plus celle qu'on dessine.
   */
  const recomposer = () => {
    const retenus = etat.montrerLesIsoles
      ? cerveau
      : { ...cerveau, noeuds: cerveau.noeuds.filter((noeud) => !isoles.has(noeud.id)) };

    const brutes = etat.vue === "volume" ? dispositionEnVolume(retenus) : dispositionDuCerveau(retenus);
    etat.domaines = domainesDuCerveau(retenus);
    etat.places = etat.parDomaine ? pencherVersLesDomaines(brutes, retenus) : brutes;
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
    const onde = ondeDepuis(depart, lectures);
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

    dit.innerHTML = onde.total
      ? `<b>${escapeHtml(noeud?.sujet ?? "")}</b> — ${onde.total}
         ${accorde(onde.total, "affirmation en découle", "affirmations en découlent")},
         sur ${onde.strates.length} ${accorde(onde.strates.length, "strate", "strates")}.
         ${
           opaques
             ? `${opaques} ${accorde(opaques, "vient", "viennent")} d'un utilitaire : on sait
                ${accorde(opaques, "qu'elle dépend", "qu'elles dépendent")}, l'onde ne prétend pas
                ${accorde(opaques, "la", "les")} recalculer ici.`
             : "Toutes se rejouent."
         }`
      : `<b>${escapeHtml(noeud?.sujet ?? "")}</b> — rien ne repose sur cette valeur.
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

  const recadrer = () => { etat.camera = { ...CADRAGE[etat.vue] }; };

  const zoomer = (facteur, versX = null, versY = null) => {
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
    if (noeud) { etat.choisi = noeud.id; allumer(noeud.id, { duree: TENUE.onde, dire: true }); }
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
              ${escapeHtml(chauds.map((noeud) => noeud.sujet).join(", "))}</span>`
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

    bulle.hidden = false;
    bulle.innerHTML = `
      <b>${escapeHtml(noeud.sujet)}</b>
      <span class="cerveau-bulle__valeur">${escapeHtml(noeud.valeur || "—")}</span>
      <span class="cerveau-bulle__nature" style="--trait:${nature?.trait ?? "#8b949e"}">
        ${escapeHtml(nature?.nom ?? "")}${noeud.rejouable ? " · recalculable au serveur" : ""}
      </span>
      ${
        noeud.lectures
          ? `<span class="cerveau-bulle__compte">${noeud.lectures}
              ${accorde(noeud.lectures, "emploi", "emplois")} · strate ${noeud.strate}</span>`
          : `<span class="cerveau-bulle__compte">aucun emploi connu · strate ${noeud.strate}</span>`
      }
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

  const changerDeCouleur = (couleur) => {
    if (etat.couleur === couleur) return;
    etat.couleur = couleur;
    marquer("couleur", couleur);
    // La légende suit : un dégradé expliqué par une légende de natures ne dit
    // rien de ce qu'on regarde.
    for (const bloc of hote.querySelectorAll("[data-cerveau-legende]")) {
      bloc.hidden = bloc.getAttribute("data-cerveau-legende") !== couleur;
    }
  };

  /* ── La boucle ─────────────────────────────────────────────────────────── */

  let image = 0;
  const boucle = (temps) => {
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
  const caseDesDomaines = hote.querySelector("[data-cerveau-domaines]");
  if (caseDesDomaines) {
    caseDesDomaines.addEventListener("change", () => {
      etat.parDomaine = caseDesDomaines.checked;
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
  const cerveau = cerveauDuProjet(assertions, applications);
  return renderCadre(cerveau, noeudsIsoles(cerveau).size, signauxDeLAudit(assertions).size);
}
