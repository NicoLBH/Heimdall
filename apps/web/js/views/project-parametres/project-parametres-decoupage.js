/**
 * Le découpage du projet en zones.
 *
 * Un corpus de données de base peut valoir pour une partie de l'ouvrage et un
 * autre pour une autre : le rez-de-chaussée est un ERP, les étages 1 à 3 du
 * logement. Sans zones, « usage : ERP » et « usage : habitation » se
 * contredisent sur le même projet, alors qu'ils sont tous les deux vrais,
 * chacun chez lui.
 *
 * ## Un paramétrage qui est aussi une donnée de base
 *
 * Le découpage se règle ici, mais il n'est pas rangé ici : chaque zone est une
 * donnée de base de la mémoire. C'est ce qui lui donne une histoire — quelle
 * définition, quand, par qui — et c'est ce que Mémoire → Données de base montre.
 * Un paramètre qui ne vit que dans un formulaire ne se relit pas six mois plus
 * tard, quand il faut comprendre sur quoi un calcul a été fait.
 *
 * ## Cet écran **propose**, il n'écrit pas
 *
 * Il écrivait directement, et c'était une exception à la règle 1 — *rien
 * n'entre jamais directement dans la mémoire* — dont on ne s'apercevait pas.
 * Pas la moindre : le découpage porte tout le reste, et retirer une zone sort du
 * présent tout ce qu'elle portait. Un acte pareil se relit avant d'avoir lieu.
 *
 * Définir, renommer, retirer ouvrent donc une **proposition**, que quelqu'un
 * signe. Voir `services/zones-versement.js`.
 *
 * ## Retirer n'est pas effacer
 *
 * Une zone retirée quitte les listes et **reste dans l'histoire**, avec son
 * auteur, sa date et son motif. Effacer la ligne ferait disparaître le fait
 * qu'une zone a existé, et rendrait incompréhensibles les affirmations qui la
 * portent encore.
 */

import { store } from "../../store.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { definedZones, normalizeZoneKey } from "../../services/project-zones.js";
import { resolveCurrentBackendProjectId } from "../../services/project-supabase-sync.js";
import { avertirAvantDeProposer, renderPropositionOuverte } from "../ui/avertissement-proposition.js";
import { branchesOuvertes, rafraichirLesBranches } from "../../services/branches-ouvertes.js";
import { definitionVersable, renommageVersable, retraitVersable } from "../../services/zones-versement.js";
import { preparerUneProposition } from "../../services/atelier-proposition.js";
import { renderSectionCard, rerenderProjectParametres } from "./project-parametres-core.js";

/**
 * Des exemples qui tournent, pour apprendre le découpage plutôt que le deviner.
 *
 * Le premier réflexe est de nommer « Zone A » et de s'arrêter là. Ces exemples
 * montrent qu'un découpage utile nomme **un endroit** et **son usage** — c'est
 * l'usage qui commande les règles, et deux étages de familles différentes ne
 * suivent pas les mêmes.
 *
 * Ils changent à chaque zone ajoutée : un exemple figé finit par être recopié
 * tel quel.
 */
const EXEMPLES = [
  { label: "Bâtiment A / Rdc", definition: "ERP type M, 5ème catégorie" },
  { label: "Bâtiment A / Étages", definition: "Habitation 2ème famille" },
  { label: "Ensemble / Sous-sol", definition: "Parc de stationnement couvert" },
  { label: "Bâtiment B / Étages", definition: "Habitation 3ème famille B" }
];

const state = {
  loading: false,
  error: "",
  notice: "",
  assertions: null,
  brouillon: { label: "", definition: "" },
  edite: "",
  busy: false,
  /** Garder le formulaire ouvert pour la zone suivante. */
  encore: true,
  /** L'exemple montré. Il avance d'un cran à chaque zone ajoutée. */
  exemple: 0,
  /**
   * La proposition qu'on vient d'ouvrir, tant qu'on est sur cet écran.
   *
   * L'écran partait sur Propositions > détail, ce qui empêchait d'ajouter deux
   * zones de suite. Voir `views/ui/avertissement-proposition.js`.
   */
  proposition: null
};

/** L'exemple du moment, sans jamais sortir de la liste. */
function exempleCourant() {
  return EXEMPLES[state.exemple % EXEMPLES.length];
}

function texte(value) {
  return String(value ?? "").trim();
}

async function lireZones({ force = false } = {}) {
  if (state.loading) return;
  if (!force && state.assertions !== null) return;

  state.loading = true;
  state.error = "";

  try {
    const projectId = await resolveCurrentBackendProjectId();
    if (!projectId) throw new Error("Projet introuvable.");
    const { listProjectAssertions } = await import("../../services/project-memory-supabase.js");
    state.assertions = await listProjectAssertions(projectId);
    if (state.assertions === null) throw new Error("La mémoire n'a pas pu être lue.");
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    state.assertions = null;
  } finally {
    state.loading = false;
    rerenderProjectParametres();
  }
}

/**
 * Une zone dans le tableau.
 *
 * Le nom et sa définition sont l'un sous l'autre dans la même colonne : ce sont
 * deux faces d'une même chose, et les mettre en deux colonnes ferait chercher
 * la définition à côté du nom plutôt qu'avec lui.
 */
function renderZone(zone) {
  const enEdition = state.edite === zone.key;

  if (enEdition) {
    return `
      <tr data-decoupage-row="${escapeHtml(zone.key)}">
        <td colspan="2">
          <div class="decoupage-form__row">
            <input class="gh-input decoupage-form__input" data-decoupage-edit="label"
              value="${escapeHtml(state.brouillon.label)}" placeholder="${escapeHtml(exempleCourant().label)}" autocomplete="off">
            <input class="gh-input decoupage-form__input" data-decoupage-edit="definition"
              value="${escapeHtml(state.brouillon.definition)}" placeholder="${escapeHtml(exempleCourant().definition)}" autocomplete="off">
          </div>
          <div class="subject-create-footer">
            <div class="subject-create-footer__left"></div>
            <div class="subject-create-footer__right">
              <button type="button" class="gh-btn" data-decoupage-cancel>Annuler</button>
              <button type="button" class="gh-btn gh-btn--primary" data-decoupage-save="${escapeHtml(zone.key)}"
                ${state.busy ? "disabled" : ""}>Enregistrer</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  return `
    <tr data-decoupage-row="${escapeHtml(zone.key)}">
      <td class="decoupage-table__zone">
        <b>${escapeHtml(zone.label)}</b>
        <span>${escapeHtml(zone.definition || "Aucune définition écrite : personne n'a dit ce que cette zone recouvre.")}</span>
      </td>
      <td class="decoupage-table__actions">
        <button type="button" class="gh-btn" data-decoupage-open="${escapeHtml(zone.key)}" ${state.busy ? "disabled" : ""}>
          ${svgIcon("pencil", { className: "octicon" })} Modifier
        </button>
        <button type="button" class="gh-btn" data-decoupage-remove="${escapeHtml(zone.key)}" ${state.busy ? "disabled" : ""}>
          ${svgIcon("x", { className: "octicon" })} Retirer
        </button>
      </td>
    </tr>
  `;
}

/**
 * Le formulaire d'ajout : les deux champs sur une ligne, puis le pied.
 *
 * Le pied est celui de la création d'un sujet — « En ajouter d'autres » à
 * gauche, Annuler et Ajouter à droite. Deux formulaires d'ajout dessinés
 * différemment demanderaient d'apprendre deux fois le même geste.
 */
function renderFormulaire() {
  const bloque = state.busy || Boolean(state.edite);

  return `
    <div class="decoupage-form">
      <div class="decoupage-form__row">
        <input class="gh-input decoupage-form__input" data-decoupage-draft="label"
          value="${escapeHtml(state.edite ? "" : state.brouillon.label)}"
          placeholder="${escapeHtml(exempleCourant().label)}" autocomplete="off" ${bloque ? "disabled" : ""}>
        <input class="gh-input decoupage-form__input" data-decoupage-draft="definition"
          value="${escapeHtml(state.edite ? "" : state.brouillon.definition)}"
          placeholder="${escapeHtml(exempleCourant().definition)}" autocomplete="off" ${bloque ? "disabled" : ""}>
      </div>
      <div class="subject-create-footer">
        <div class="subject-create-footer__left">
          <label class="subject-create-checkbox">
            <input type="checkbox" data-decoupage-more ${state.encore ? "checked" : ""}>
            <span>En ajouter d'autres</span>
          </label>
        </div>
        <div class="subject-create-footer__right">
          <button type="button" class="gh-btn" data-decoupage-reset ${bloque ? "disabled" : ""}>Annuler</button>
          <button type="button" class="gh-btn gh-btn--primary" data-decoupage-create ${bloque ? "disabled" : ""}>Ajouter</button>
        </div>
      </div>
    </div>
  `;
}

function renderCorps() {
  if (state.loading) return `<p class="gh-text-muted">Lecture des zones…</p>`;
  if (state.error) return `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>`;

  const zones = definedZones(state.assertions ?? []);

  const tableau = zones.length
    ? `<table class="decoupage-table"><tbody>${zones.map(renderZone).join("")}</tbody></table>`
    : `<p class="gh-text-muted">
         Aucune zone. Tout ce que porte la mémoire vaut alors pour l'ensemble du projet — ce qui est
         la bonne réponse tant qu'aucune partie ne se distingue.
       </p>`;

  return `
    ${state.notice ? `<div class="settings-inline-notice">${escapeHtml(state.notice)}</div>` : ""}
    ${renderPropositionOuverte({
      projet: String(store.currentProjectId || "").trim(),
      proposition: state.proposition
    })}
    ${renderFormulaire()}
    ${tableau}
  `;
}

function renderDecoupageParametresContent() {
  void lireZones();

  return renderSectionCard({
    id: "parametres-decoupage",
    title: "Découpage du projet",
    description:
      "Les parties de l'ouvrage auxquelles une donnée de base peut s'appliquer. " +
      "Ce qui n'est rattaché à aucune zone vaut pour l'ouvrage entier. " +
      "Définir, renommer ou retirer une zone ouvre une proposition : rien n'entre dans la " +
      "mémoire sans que quelqu'un l'ait signé.",
    body: `<div class="settings-card__body">${renderCorps()}</div>`
  });
}

/**
 * Ouvrir une proposition pour ce que l'écran vient de demander.
 *
 * Elle reste **ouverte** : quelqu'un la relit, voit ce qu'elle change au
 * découpage, et signe. C'est cette signature qui fait entrer la zone dans la
 * mémoire, jamais ce bouton.
 *
 * On va ensuite **sur la proposition elle-même** : la laisser dans une liste
 * qu'il faudrait retrouver ferait croire que rien ne s'est passé — c'est
 * exactement ce qu'on reprochait à l'écriture directe, en sens inverse.
 */
async function proposer({ titre, intro, lignes, quoi }) {
  const dites = (Array.isArray(lignes) ? lignes : []).filter(Boolean);
  if (!dites.length) {
    state.notice = "Rien à proposer.";
    rerenderProjectParametres();
    return;
  }

  // Prévenir **avant**. L'écran partait droit sur une proposition : on cliquait
  // « Ajouter » en croyant ajouter une zone, et l'on se retrouvait sur un écran
  // de relecture sans avoir su qu'on venait d'ouvrir quelque chose à signer.
  const vers = await avertirAvantDeProposer({
    quoi: quoi || "Cette modification du découpage va être proposée à la mémoire du projet.",
    affirmations: dites,
    memoire: Array.isArray(state.assertions) ? state.assertions : null,
    branches: branchesOuvertes()
  });
  if (!vers) return;

  state.busy = true;
  state.notice = "";
  rerenderProjectParametres();

  try {
    const projectId = await resolveCurrentBackendProjectId();
    if (!projectId) throw new Error("Projet introuvable.");

    const rendu = await preparerUneProposition({
      projectId, titre, intro, affirmations: dites,
      propositionId: vers.propositionId,
      // Pas de portée : une définition de zone vaut pour l'ouvrage, pas pour la
      // partie qu'elle décrit — sans quoi elle disparaîtrait de toute lecture
      // autre que la sienne, y compris de celle où on la cherche.
      zones: []
    });
    if (!rendu.ok) throw new Error(rendu.raison);

    state.exemple += 1;
    state.assertions = null;
    // **On reste ici.** L'écran partait sur Propositions > détail, ce qui
    // empêchait d'ajouter deux zones de suite : on revenait à la main entre
    // chaque. Le lien vers la proposition est offert, pas imposé.
    state.proposition = {
      id: rendu.proposition.id,
      numero: rendu.proposition.number ?? null,
      titre: rendu.proposition.title ?? titre,
      tranches: rendu.tranches ?? []
    };
    void rafraichirLesBranches();
  } catch (error) {
    state.notice = error instanceof Error ? error.message : String(error);
  } finally {
    state.busy = false;
    state.edite = "";
    state.brouillon = { label: "", definition: "" };
    rerenderProjectParametres();
    void lireZones({ force: true });
  }
}

function bindDecoupageParametresSection(root) {
  if (!root) return;

  for (const champ of root.querySelectorAll("[data-decoupage-draft], [data-decoupage-edit]")) {
    const cle = champ.getAttribute("data-decoupage-draft") || champ.getAttribute("data-decoupage-edit");
    // Le brouillon se garde à la frappe : un rendu ne doit pas effacer ce qu'on
    // est en train d'écrire.
    champ.addEventListener("input", (event) => {
      state.brouillon = { ...state.brouillon, [cle]: event.target.value };
    });
  }

  root.querySelector("[data-decoupage-create]")?.addEventListener("click", () => {
    const nom = texte(state.brouillon.label);
    if (!nom) {
      state.notice = `Une zone a besoin d'un nom : « ${exempleCourant().label} », par exemple.`;
      rerenderProjectParametres();
      return;
    }

    // Le nom fait la clé d'une zone. Réutiliser un nom existant remplacerait la
    // zone précédente en silence — c'est un découpage qu'on perd sans s'en
    // apercevoir. On refuse et on dit où modifier.
    const deja = definedZones(state.assertions ?? []).find(
      (zone) => normalizeZoneKey(zone.label) === normalizeZoneKey(nom)
    );
    if (deja) {
      state.notice = `« ${deja.label} » existe déjà. Modifiez-la plutôt que de la redéfinir : deux zones de même nom n'en font qu'une.`;
      rerenderProjectParametres();
      return;
    }

    void proposer({
      quoi: `Ajouter la zone « ${nom} » au découpage du projet. Ce qui la portera ne vaudra `
        + `que pour elle — et rien ne vaudra pour elle tant que la proposition n'est pas fusionnée.`,
      titre: `Découpage du projet — ajouter « ${nom} »`,
      intro: "Une partie de l'ouvrage de plus, et ce qu'elle recouvre. Ce qui la portera ne "
        + "vaudra que pour elle.",
      lignes: [definitionVersable({ label: state.brouillon.label, definition: state.brouillon.definition })]
    });
  });

  for (const bouton of root.querySelectorAll("[data-decoupage-open]")) {
    bouton.addEventListener("click", () => {
      const cle = bouton.getAttribute("data-decoupage-open");
      const zone = definedZones(state.assertions ?? []).find((entry) => entry.key === cle);
      state.edite = cle;
      state.brouillon = { label: zone?.label ?? "", definition: zone?.definition ?? "" };
      rerenderProjectParametres();
    });
  }

  root.querySelector("[data-decoupage-more]")?.addEventListener("change", (event) => {
    state.encore = event.target.checked;
  });

  root.querySelector("[data-decoupage-reset]")?.addEventListener("click", () => {
    state.brouillon = { label: "", definition: "" };
    state.notice = "";
    rerenderProjectParametres();
  });

  root.querySelector("[data-decoupage-cancel]")?.addEventListener("click", () => {
    state.edite = "";
    state.brouillon = { label: "", definition: "" };
    rerenderProjectParametres();
  });

  for (const bouton of root.querySelectorAll("[data-decoupage-save]")) {
    bouton.addEventListener("click", () => {
      const cle = bouton.getAttribute("data-decoupage-save");
      const zone = definedZones(state.assertions ?? []).find((entry) => entry.key === cle);
      const nouveauNom = texte(state.brouillon.label);
      if (!nouveauNom) {
        state.notice = "Une zone a besoin d'un nom.";
        rerenderProjectParametres();
        return;
      }

      // La clé d'une zone vient de son nom : la renommer revient à en définir
      // une autre, et à retirer la première — sinon les deux vaudraient à la
      // fois, et le projet aurait un bâtiment de trop.
      const renommee = Boolean(zone) && zone.label !== nouveauNom;

      void proposer({
        quoi: renommee
          ? `Renommer « ${zone?.label ?? ""} » en « ${nouveauNom} ». La clé d'une zone vient de `
            + `son nom : renommer, c'est en définir une et en retirer une autre.`
          : `Préciser ce que « ${nouveauNom} » recouvre.`,
        titre: renommee
          ? `Découpage du projet — renommer « ${zone.label} » en « ${nouveauNom} »`
          : `Découpage du projet — préciser « ${nouveauNom} »`,
        intro: renommee
          ? "Une zone renommée est une zone de plus et une zone qui part : la clé vient du nom."
          : "Ce que cette partie de l'ouvrage recouvre.",
        lignes: renommageVersable({
          ancien: zone?.label ?? "",
          label: nouveauNom,
          definition: state.brouillon.definition
        })
      });
    });
  }

  for (const bouton of root.querySelectorAll("[data-decoupage-remove]")) {
    bouton.addEventListener("click", () => {
      const cle = bouton.getAttribute("data-decoupage-remove");
      const zone = definedZones(state.assertions ?? []).find((entry) => entry.key === cle);
      if (!zone) return;
      void proposer({
        quoi: `Retirer « ${zone.label} » du découpage. Tout ce qui ne valait que pour cette zone `
          + `quittera le présent — et restera lisible dans l'histoire.`,
        titre: `Découpage du projet — retirer « ${zone.label} »`,
        intro: "Cette partie ne fait plus partie du projet. Ce qui ne valait que pour elle "
          + "quitte le présent, avec son motif — et reste lisible dans l'histoire.",
        lignes: [retraitVersable({ label: zone.label })]
      });
    });
  }
}

export function getDecoupageProjectParametresTab() {
  return {
    id: "parametres-decoupage",
    label: "Découpage du projet",
    iconName: "table",
    isPrimary: false,
    renderContent: () => renderDecoupageParametresContent(),
    bind: (root) => bindDecoupageParametresSection(root)
  };
}
