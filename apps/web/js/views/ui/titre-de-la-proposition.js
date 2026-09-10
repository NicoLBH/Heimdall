/**
 * Comment s'appellera la proposition qu'on s'apprête à ouvrir.
 *
 * ## Pourquoi une question de plus
 *
 * Le titre venait de l'écran qui proposait, et il était le même à chaque fois :
 * « Fondations superficielles — dimensionnement », vingt-cinq fois. Six mois
 * plus tard la liste ne dit plus rien, et retrouver *la* proposition qui a
 * descendu les massifs demande de les ouvrir une à une.
 *
 * ## Pourquoi **avant**, et pas après
 *
 * Un titre qu'on corrigerait sur la proposition déjà ouverte serait un titre
 * qu'on ne corrige pas : on est passé à autre chose. Ici, la question arrive
 * dans le geste — juste après « à quelles zones ? », qui a exactement la même
 * forme et pour la même raison.
 *
 * C'est aussi ce qui rend le titre **proposé** au sens propre : le champ est
 * rempli, il est modifiable, et rien ne part tant qu'on n'a pas validé.
 *
 * ## Ce que le modèle fait, et ce qu'il ne fait pas
 *
 * Il lit le **diff** — ce qui change, de quelle valeur à quelle valeur, dans
 * quelle zone — et il écrit une ligne et un résumé. Il ne produit **aucune
 * valeur** : le serveur le vérifie, et refuse une rédaction qui porterait un
 * chiffre absent du diff. Un refus se **dit** ici, il ne se remplace pas en
 * silence par le titre d'origine — sinon on croirait avoir lu la phrase du
 * modèle alors qu'on lit l'ancien libellé.
 *
 * ## La fenêtre s'ouvre sans attendre le modèle
 *
 * Elle apparaît avec le titre d'origine, et se met à jour quand la rédaction
 * arrive. Attendre pour tout montrer d'un coup laisserait un écran figé après
 * un clic — et l'on ne saurait pas si le clic a porté.
 *
 * ## La description s'écrit en Markdown, comme celle d'un sujet
 *
 * C'était une `<textarea>` nue, et la description d'une proposition finit dans
 * le même endroit que celle d'un sujet : un fil qu'on relit. Y écrire un tableau
 * ou une liste à puces donnait du texte brut d'un côté et de la mise en page de
 * l'autre, pour la même application.
 *
 * Elle emploie donc le même champ — onglets Écrire / Aperçu, barre de mise en
 * forme, même moteur de rendu. Le câblage vit dans `ui/redaction-markdown.js` :
 * les briques étaient déjà partagées, c'est le branchement qui était recopié.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { faitsDuDiff, meriteUneRedaction } from "../../services/titre-de-proposition.js";
import { dessinerRedaction, brancherRedaction } from "./redaction-markdown.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que l'écran dit de la rédaction, selon où elle en est. */
const DIT = {
  ecrit: "Un modèle lit ce qui change et propose un titre…",
  propose: "Titre proposé à partir du diff. Corrigez-le : c'est lui qui restera dans la liste.",
  garde: "Titre de l'écran, conservé.",
  refuse: "La rédaction proposée a été écartée : elle portait une valeur absente du diff.",
  panne: "Le modèle n'a pas répondu ; le titre de l'écran est conservé.",
  eteint: "La rédaction automatique n'est pas configurée sur cette installation.",
  court: "Ce lot se nomme de lui-même : le titre de l'écran suffit."
};

/**
 * Le diff de ce qu'on s'apprête à proposer, avant que la proposition existe.
 *
 * C'est le **même** calcul que celui que le relecteur lira ensuite dans l'onglet
 * Changements — `tableauAvantApres`, avec une proposition encore sans
 * identifiant. Deux calculs de diff finiraient par ne plus dire la même chose
 * (règle 4), et le titre décrirait alors autre chose que le tableau.
 */
async function diffDuLot({ projectId, affirmations, zones }) {
  const [{ itemsDeProposition }, { tableauAvantApres }] = await Promise.all([
    import("../../services/atelier-proposition.js"),
    import("../../services/proposition-avant-apres.js")
  ]);

  const portees = Array.isArray(zones) ? zones : null;
  const situees = portees === null
    ? affirmations
    : (Array.isArray(affirmations) ? affirmations : []).map((affirmation) => (
        Array.isArray(affirmation?.zones) && affirmation.zones.length
          ? affirmation
          : { ...affirmation, zones: portees }
      ));

  const items = Array.isArray(situees) && situees.length && situees[0]?.itemType
    ? situees
    : itemsDeProposition(situees);

  let memoire = null;
  try {
    const { listProjectAssertions } = await import("../../services/project-memory-supabase.js");
    memoire = await listProjectAssertions(texte(projectId));
  } catch {
    // `null` : la mémoire n'a pas pu être lue. Le tableau le dira, et le titre
    // ne se fera pas écrire sur la moitié de l'information.
    memoire = null;
  }

  return tableauAvantApres({
    // Sans identifiant : la proposition n'existe pas encore, et c'est justement
    // ce qui fait lire la colonne de gauche dans la mémoire d'aujourd'hui.
    proposition: { id: "", status: "open" },
    items,
    assertions: memoire
  });
}

/** La clé du champ rédigé, ici. Une fenêtre à la fois, un seul champ. */
const REDACTION = "propositionDescription";

function renderFenetre({ titre, resume, etat, apercu = false }) {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Titre de la proposition">
      <div class="fichiers-saisie__boite titre-propose">
        <header class="fichiers-saisie__tete">
          <b>Comment s'appellera cette proposition ?</b>
          <button type="button" class="fichiers-saisie__fermer" data-titre-annuler
            aria-label="Renoncer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="titre-propose__etat" data-titre-etat>${escapeHtml(etat)}</p>

        <label class="titre-propose__champ">
          <span>Titre</span>
          <input type="text" class="gh-input" data-titre-valeur value="${escapeHtml(titre)}"
            maxlength="120" autocomplete="off">
        </label>

        <div class="titre-propose__champ titre-propose__champ--redige">
          <span>Description <i>facultative, en Markdown</i></span>
          ${dessinerRedaction({
            cle: REDACTION, texte: resume, apercu,
            placeholder: "Ce que cette proposition change, et pourquoi. Markdown accepté."
          })}
        </div>

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-titre-annuler>Annuler</button>
          <button type="button" class="gh-btn gh-btn--primary" data-titre-valider>Ouvrir la proposition</button>
        </footer>
      </div>
    </div>
  `;
}

/**
 * La question posée, s'il y en a une à l'écran.
 *
 * Comme pour les zones : deux fenêtres superposées ne se distinguent pas, et
 * chacune préparerait sa proposition — un geste, deux propositions à relire.
 */
let questionOuverte = null;

/**
 * Poser la question, et attendre la réponse.
 *
 * @param {object} options
 * @param {string} options.projectId le projet, en base
 * @param {object[]} options.affirmations ce qu'on s'apprête à proposer
 * @param {string[]|null} options.zones la portée déjà choisie
 * @param {string} options.secours le titre de l'écran, qui vaut tant qu'on n'en
 *   a pas de meilleur — et qui reste si le modèle se tait ou se trompe
 * @returns {Promise<{titre: string, description: string}|null>} `null` si l'on renonce
 */
export async function demanderLeTitre({
  projectId = "", affirmations = [], zones = null, secours = ""
} = {}) {
  // Une question déjà posée n'en appelle pas une seconde : le deuxième appel
  // renonce, et son geste s'arrête là.
  if (questionOuverte) return null;

  const titreDOrigine = texte(secours) || "Proposition depuis l'Atelier";

  /**
   * Ce qu'on a saisi, hors du DOM.
   *
   * Le champ rédigé se **redessine** quand on bascule vers l'aperçu : garder le
   * texte dans la `<textarea>` seule le perdrait à chaque aller-retour. `repris`
   * dit que quelqu'un a écrit — le modèle, qui arrive après, n'écrase alors rien.
   */
  const brouillon = {
    titre: titreDOrigine, titreRepris: false,
    description: "", descriptionReprise: false, apercu: false, etat: DIT.ecrit
  };

  return new Promise((resoudre) => {
    const hote = document.createElement("div");
    document.body.appendChild(hote);
    questionOuverte = hote;

    const fermer = (reponse) => {
      document.removeEventListener("keydown", auClavier);
      hote.remove();
      questionOuverte = null;
      resoudre(reponse);
    };

    // Échap renonce. Une fenêtre modale dont on ne connaît qu'un seul moyen de
    // sortie se referme mal quand ce moyen défaille.
    function auClavier(evenement) {
      if (evenement.key === "Escape") fermer(null);
    }
    document.addEventListener("keydown", auClavier);

    const dessiner = () => {
      hote.innerHTML = renderFenetre({
        titre: brouillon.titre, resume: brouillon.description,
        etat: brouillon.etat, apercu: brouillon.apercu
      });

      hote.querySelector("[data-titre-valeur]")?.addEventListener("input", (evenement) => {
        brouillon.titre = evenement.target.value;
        brouillon.titreRepris = true;
      });

      for (const bouton of hote.querySelectorAll("[data-titre-annuler]")) {
        bouton.addEventListener("click", () => fermer(null));
      }

      hote.querySelector("[data-titre-valider]")?.addEventListener("click", () => {
        fermer({
          // Un titre effacé n'est pas un titre vide : c'est celui d'origine, qui
          // vaut toujours mieux qu'une proposition sans nom dans la liste.
          titre: texte(brouillon.titre) || titreDOrigine,
          description: texte(brouillon.description)
        });
      });

      brancherRedaction(hote, {
        onTexte: (_cle, dit) => {
          brouillon.description = dit;
          brouillon.descriptionReprise = true;
        },
        onOnglet: (_cle, apercu) => {
          brouillon.apercu = apercu;
          dessiner();
        }
      });
    };

    dessiner();
    void remplir(hote, brouillon, dessiner, { projectId, affirmations, zones });
  });
}

/**
 * Aller chercher la rédaction, et l'écrire dans la fenêtre déjà ouverte.
 *
 * Ce qu'on a saisi entre-temps n'est jamais écrasé : quelqu'un qui a commencé à
 * taper son titre a déjà répondu à la question, et le modèle arrive trop tard.
 * C'est `titreRepris` / `descriptionReprise` qui le disent — et non la
 * comparaison avec la valeur par défaut du champ, qui ne survit pas au premier
 * aller-retour vers l'aperçu.
 */
async function remplir(hote, brouillon, dessiner, { projectId, affirmations, zones }) {
  const dire = (mot) => {
    brouillon.etat = mot;
    const ou = hote.querySelector("[data-titre-etat]");
    if (ou) ou.textContent = mot;
  };

  let faits = null;
  try {
    faits = faitsDuDiff(await diffDuLot({ projectId, affirmations, zones }));
  } catch {
    dire(DIT.panne);
    return;
  }
  if (!hote.isConnected) return;

  if (!meriteUneRedaction(faits)) {
    dire(DIT.court);
    return;
  }

  const { redigerLeTitre } = await import("../../services/titre-de-proposition-supabase.js");
  const rendu = await redigerLeTitre({ projectId, faits });
  if (!hote.isConnected) return;

  if (rendu?.error) {
    dire(rendu.error === "unconfigured" ? DIT.eteint
      : rendu.error === "refused" && rendu.refus ? DIT.refuse
      : DIT.panne);
    return;
  }

  // Ne rien écraser de ce qui a été tapé.
  if (!brouillon.titreRepris) brouillon.titre = texte(rendu.titre) || brouillon.titre;
  if (!brouillon.descriptionReprise) brouillon.description = texte(rendu.resume);
  brouillon.etat = DIT.propose;

  // Redessiner : le champ rédigé porte son texte dans son HTML, et poser la
  // valeur sur la `<textarea>` seule laisserait l'aperçu montrer le texte
  // d'avant.
  dessiner();
}
