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
 * ## L'onde, et pourquoi elle n'est pas un effet
 *
 * On clique une valeur, une onde part d'elle et remonte les liens **strate par
 * strate**. La profondeur du raisonnement cesse d'être un chiffre : « la plus
 * longue chaîne fait huit pas » devient huit pulsations qu'on regarde passer.
 *
 * Elle suit `ondeDepuis`, qui est `impactDe` — **la fonction de l'étude
 * d'impact**, sans une ligne de plus. Si ce dessin ment, l'étude d'impact ment
 * aussi, et les deux se corrigent ensemble. Un écran qui aurait sa propre idée de
 * ce qui dépend de quoi finirait par montrer autre chose que ce que l'outil
 * décide, et c'est exactement ainsi qu'on perd la confiance d'un lecteur.
 *
 * ## Ce que l'écran refuse de faire joli
 *
 * **Un nœud qu'on ne sait pas refaire reste éteint quand l'onde le traverse.**
 * Il s'allume — il dépend, c'est vrai — mais d'un halo creux, et le compteur le
 * range à part. La frontière de ce que Mdall sait rejouer devient une forme,
 * pas une note de bas de page.
 *
 * **Les liens dessinés disent d'où ils viennent.** Sur une mémoire sans lectures
 * enregistrées, ils sont déduits d'une ressemblance de noms, et le bandeau le dit.
 * Une belle image tirée d'à-peu-près serait le pire de ce qu'on puisse produire.
 *
 * **Rien ne s'écrit, et rien ne s'ouvre.** On regarde, on ressort. Un clic pose
 * une question au graphe, pas au projet.
 *
 * ## Le second mode viendra
 *
 * Un battement permanent — les impulsions partant du socle en boucle, les nœuds
 * que l'audit signale pulsant en rouge — est prévu, puis leur cumul : le battement
 * au repos, l'arrêt au survol, l'onde au clic. Voir
 * `docs/a-traiter-plus-tard.md`, § 5.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { NOEUD } from "../../services/memoire-plan.js";
import { cerveauDuProjet, dispositionDuCerveau, ondeDepuis } from "../../services/memoire-cerveau.js";

const texte = (valeur) => String(valeur ?? "").trim();
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/** Combien de temps une strate met à s'allumer. Assez lent pour être compté. */
const PAS_DE_LONDE = 260;
/** Ce qui reste allumé après le passage, avant de s'éteindre doucement. */
const TENUE = 2600;

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

/* ────────────────────────────────────────────────────────────────────────────
 * Le cadre
 * ────────────────────────────────────────────────────────────────────────── */

function renderLegende(cerveau) {
  const auServeur = cerveau.compte.auServeur;

  return `
    <div class="cerveau-legende">
      ${Object.entries(NATURES).map(([nature, quoi]) => `
        <span class="cerveau-legende__item cerveau-legende__item--${nature}">
          <i style="--trait:${quoi.trait}"></i>
          <b>${escapeHtml(quoi.nom)}</b>
          <small>${escapeHtml(quoi.quoi)}</small>
        </span>
      `).join("")}
      ${
        // Ce que la dernière livraison a changé, et qui se voit d'ici : un nœud
        // opaque n'est plus forcément un nœud perdu.
        auServeur
          ? `<span class="cerveau-legende__item cerveau-legende__item--serveur">
              <i></i>
              <b>${auServeur} au serveur</b>
              <small>opaque, mais son référentiel sait le recalculer</small>
            </span>`
          : ""
      }
    </div>
  `;
}

function renderCadre(cerveau) {
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
        ${renderLegende(cerveau)}
        <p class="cerveau__onde" data-cerveau-onde>
          Cliquez une valeur : l'onde remonte ce qui en découle, une strate à la fois.
        </p>
        ${
          cycles.length
            ? `<p class="cerveau__cycle">
                ${svgIcon("alert", { className: "octicon" })}
                ${cycles.length} ${accorde(cycles.length, "affirmation se lit", "affirmations se lisent")}
                en rond : ${accorde(cycles.length, "elle est placée", "elles sont placées")} au bout,
                à part. Rien n'en sort — un état de passage n'est pas un résultat.
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

/** Un sujet trop long coupe le voisin : on le raccourcit plutôt que de l'empiler. */
function abrege(sujet, max = 26) {
  const brut = texte(sujet);
  return brut.length > max ? `${brut.slice(0, max - 1)}…` : brut;
}

/** Le rayon d'un nœud : ce qui sert le plus est plus gros, sans écraser le reste. */
function rayonDe(noeud) {
  return 4 + Math.min(7, Math.sqrt(noeud.lectures) * 2.2);
}

/**
 * Le dessin d'une image, du fond vers le devant.
 *
 * Tout est recalculé à chaque image : à quelques centaines de nœuds, c'est moins
 * cher qu'un cache à tenir à jour, et cela supprime toute une classe de bogues où
 * l'écran montre l'état d'avant.
 */
function dessiner(ctx, etat, largeur, hauteur, temps) {
  const { places, parId, allumes, survole, choisi, respire } = etat;
  const marge = { x: 64, y: 42 };
  const utile = { x: Math.max(1, largeur - marge.x * 2), y: Math.max(1, hauteur - marge.y * 2) };

  // La respiration : quelques pixels, lentement. Elle doit se sentir sans se voir.
  const souffle = (noeud) => (respire ? Math.sin(temps / 1400 + noeud.phase) * 3 : 0);
  const ou = (noeud) => ({
    x: marge.x + noeud.x * utile.x,
    y: marge.y + noeud.y * utile.y + souffle(noeud)
  });

  ctx.clearRect(0, 0, largeur, hauteur);

  // Les colonnes, à peine visibles, et **nommées**. Elles disent qu'il y a des
  // strates sans faire une grille — une grille se lit comme un tableau, et on a
  // déjà un tableau. Sans le nom, on verrait des colonnes sans savoir ce qu'elles
  // comptent, et l'écran ne dirait plus rien de ce qu'il est venu dire.
  const rangs = [...new Set(places.map((noeud) => noeud.x))].sort((a, b) => a - b);
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";

  rangs.forEach((rang, index) => {
    const x = marge.x + rang * utile.x;
    ctx.strokeStyle = "rgba(139,148,158,.10)";
    ctx.beginPath();
    ctx.moveTo(x, marge.y * 0.7);
    ctx.lineTo(x, hauteur - marge.y * 0.4);
    ctx.stroke();

    const strate = places.find((noeud) => noeud.x === rang);
    ctx.fillStyle = "rgba(139,148,158,.55)";
    ctx.fillText(
      index === 0 ? "socle" : strate?.enRond ? "en rond" : `${index} pas`,
      x, marge.y * 0.45
    );
  });

  // Les liens. Une courbe, pas une droite : à cette densité, des droites font un
  // treillis dans lequel on ne suit plus rien.
  for (const lien of etat.liens) {
    const de = parId.get(lien.de);
    const vers = parId.get(lien.vers);
    if (!de || !vers) continue;

    const a = ou(de);
    const b = ou(vers);
    const vif = allumes.has(lien.de) && allumes.has(lien.vers);
    const proche = survole && (survole === lien.de || survole === lien.vers);

    ctx.strokeStyle = vif
      ? "rgba(88,166,255,.75)"
      : proche ? "rgba(139,148,158,.55)" : "rgba(139,148,158,.16)";
    ctx.lineWidth = Math.min(3, 0.6 + lien.poids * 0.35) * (vif ? 2 : 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y);
    ctx.stroke();
  }

  // Les nœuds, par-dessus.
  for (const noeud of places) {
    const { x, y } = ou(noeud);
    const rayon = rayonDe(noeud);
    const trait = NATURES[noeud.nature]?.trait ?? "#8b949e";
    const eclat = allumes.get(noeud.id) ?? 0;

    if (eclat > 0) {
      // Le halo de l'onde. **Creux pour un nœud opaque** : il dépend, on ne sait
      // pas le refaire, et lui donner le même éclat qu'à une valeur recalculée
      // ferait passer du propagé pour du calculé.
      const creux = noeud.nature === NOEUD.OPAQUE;
      ctx.beginPath();
      ctx.arc(x, y, rayon + 6 + eclat * 10, 0, Math.PI * 2);
      if (creux) {
        ctx.strokeStyle = `rgba(210,153,34,${0.55 * eclat})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(88,166,255,${0.16 * eclat})`;
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(x, y, rayon, 0, Math.PI * 2);

    if (noeud.nature === NOEUD.SOCLE) {
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
  }

  // Les étiquettes en dernier, pour qu'aucun trait ne passe dessus.
  //
  // Sans elles, l'écran est une jolie image dont on ne peut rien tirer. Avec
  // elles, sur trois cents nœuds, c'est une bouillie. On les écrit donc **tant
  // qu'elles se lisent**, et au-delà on ne garde que ce que l'onde a touché, ce
  // qui est survolé, et le socle — d'où partent les questions.
  const toutesLisibles = places.length <= etat.seuilDesNoms;
  ctx.font = "500 11.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  for (const noeud of places) {
    const vif = allumes.has(noeud.id);
    const montre = toutesLisibles || vif || noeud.id === survole || noeud.nature === NOEUD.SOCLE;
    if (!montre) continue;

    const { x, y } = ou(noeud);
    const rayon = rayonDe(noeud);
    const nom = abrege(noeud.sujet);

    // Près du bord droit, l'étiquette passe à gauche du nœud. Sinon la dernière
    // strate — celle qui porte les conclusions, celle qu'on vient lire — serait
    // la seule dont on ne lit pas les noms.
    const aGauche = x + rayon + 10 + ctx.measureText(nom).width > largeur - 8;
    ctx.textAlign = aGauche ? "right" : "left";
    ctx.fillStyle = vif || noeud.id === survole ? "#f0f6fc" : "rgba(201,209,217,.62)";
    ctx.fillText(nom, x + (aGauche ? -(rayon + 6) : rayon + 6), y + 4);
  }

  etat.ou = ou;
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

  const places = dispositionDuCerveau(cerveau);
  const parId = new Map(places.map((noeud) => [noeud.id, noeud]));
  const lectures = Array.isArray(applications) ? applications : [];

  const hote = document.createElement("div");
  hote.innerHTML = renderCadre(cerveau);
  document.body.appendChild(hote);
  ouverte = hote;

  const toile = hote.querySelector("[data-cerveau-toile]");
  const bulle = hote.querySelector("[data-cerveau-bulle]");
  const dit = hote.querySelector("[data-cerveau-onde]");
  const ctx = toile.getContext("2d");

  // Un utilisateur qui a demandé moins de mouvement en a demandé partout. L'onde
  // reste — elle porte l'information — mais elle avance d'un coup par strate, et
  // rien ne respire.
  const calme = typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  const etat = {
    places, parId, liens: cerveau.liens,
    allumes: new Map(),
    survole: "", choisi: "",
    respire: !calme,
    /**
     * Au-delà de ce nombre de nœuds, les étiquettes ne se lisent plus.
     *
     * Ce n'est pas une limite du dessin : c'est une limite de l'œil. Les écrire
     * toutes ferait une bouillie grise, et une bouillie ne dit rien de moins
     * qu'un écran vide — elle donne en plus l'impression d'avoir été lue.
     */
    seuilDesNoms: 45,
    ou: null
  };
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

  /* ── L'onde ────────────────────────────────────────────────────────────── */

  /** Les minuteries en cours, pour qu'une seconde onde annule la première. */
  let minuteries = [];
  const oublier = () => { minuteries.forEach(clearTimeout); minuteries = []; };

  const lancerLOnde = (depart) => {
    oublier();
    etat.choisi = depart;
    etat.allumes.clear();
    etat.allumes.set(depart, 1);

    const onde = ondeDepuis(depart, lectures);
    const noeud = parId.get(depart);
    const opaques = onde.strates.flat().filter((id) => parId.get(id)?.nature === NOEUD.OPAQUE).length;

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

    onde.strates.forEach((strate, rang) => {
      minuteries.push(setTimeout(() => {
        for (const id of strate) etat.allumes.set(id, 1);
      }, calme ? 0 : (rang + 1) * PAS_DE_LONDE));
    });

    // L'onde s'éteint d'elle-même. Un écran qui reste allumé après coup ne sait
    // plus dire ce qu'on vient de lui demander.
    minuteries.push(setTimeout(
      () => { etat.allumes.clear(); etat.choisi = ""; },
      (calme ? 0 : onde.strates.length * PAS_DE_LONDE) + TENUE
    ));
  };

  /* ── Le pointeur ───────────────────────────────────────────────────────── */

  const sousLeCurseur = (evenement) => {
    if (!etat.ou) return null;
    const cadre = toile.getBoundingClientRect();
    const x = evenement.clientX - cadre.left;
    const y = evenement.clientY - cadre.top;

    let trouve = null;
    let distance = Infinity;
    for (const noeud of places) {
      const point = etat.ou(noeud);
      const ecart = Math.hypot(point.x - x, point.y - y);
      if (ecart < rayonDe(noeud) + 8 && ecart < distance) { trouve = noeud; distance = ecart; }
    }
    return trouve;
  };

  const auMouvement = (evenement) => {
    const noeud = sousLeCurseur(evenement);
    etat.survole = noeud?.id ?? "";
    toile.style.cursor = noeud ? "pointer" : "default";

    if (!noeud) { bulle.hidden = true; return; }

    const nature = NATURES[noeud.nature];
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
      ${noeud.enRond ? `<span class="cerveau-bulle__cycle">se lit en rond</span>` : ""}
    `;

    const cadre = toile.getBoundingClientRect();
    const gauche = Math.min(cadre.width - 240, Math.max(8, evenement.clientX - cadre.left + 14));
    bulle.style.transform = `translate(${gauche}px, ${evenement.clientY - cadre.top + 14}px)`;
  };

  const auClic = (evenement) => {
    const noeud = sousLeCurseur(evenement);
    if (noeud) lancerLOnde(noeud.id);
  };

  /* ── La boucle ─────────────────────────────────────────────────────────── */

  let image = 0;
  const boucle = (temps) => {
    dessiner(ctx, etat, largeur, hauteur, temps);
    image = requestAnimationFrame(boucle);
  };

  const fermer = () => {
    cancelAnimationFrame(image);
    oublier();
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
  toile.addEventListener("mousemove", auMouvement);
  toile.addEventListener("mouseleave", () => { etat.survole = ""; bulle.hidden = true; });
  toile.addEventListener("click", auClic);
  for (const bouton of hote.querySelectorAll("[data-cerveau-fermer]")) {
    bouton.addEventListener("click", fermer);
  }

  redimensionner();
  image = requestAnimationFrame(boucle);
}

/** Pour les pages d'essai : le cadre seul, sans boucle ni pointeur. */
export function __renderCerveauPourPreview(assertions, applications) {
  return renderCadre(cerveauDuProjet(assertions, applications));
}
