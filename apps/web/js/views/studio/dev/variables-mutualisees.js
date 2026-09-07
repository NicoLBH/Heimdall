/**
 * Suivre les variables mutualisées.
 *
 * ## Pourquoi un utilitaire, et pas un écran de la Mémoire
 *
 * Ce tableau a d'abord vécu en tête de `Fichiers › Mémoire`, et c'était un
 * amalgame. La Mémoire montre **ce que le projet dit** ; ici on montre ce qu'on
 * en **déduit** — qui déclare quoi, avec quelle valeur, et qui s'en sert. Ce
 * n'est pas la même matière, et surtout ce n'est pas la même vérité : une
 * variable prend plusieurs valeurs au fil d'un projet, et une seule ligne de
 * tableau ne peut pas en rendre compte sans mentir un peu.
 *
 * Le fichier `Mémoire/variables-du-projet.ref`, lui, ne porte que les
 * **définitions** : le nom, son type, son unité. C'est ce qu'on lit avant
 * d'écrire une règle — pour réutiliser un nom qui existe plutôt que d'en
 * inventer un voisin.
 *
 * ## Ce que cet écran sert à faire
 *
 * Deux gestes, et ce sont ceux qu'on a devant un raisonnement à écrire :
 *
 * 1. **Réutiliser** — « comment s'appelle déjà la hauteur du plancher bas ? ».
 *    Entre deux noms proches, on se trompe vite, et un nom mal orthographié
 *    fabrique une seconde variable qui ne servira jamais.
 * 2. **Compléter** — « sur quoi mes règles s'appuient-elles sans que personne
 *    l'ait versé ? ». C'est le trou du raisonnement, et il se voit en rouge.
 *
 * Rien ne s'écrit d'ici : cet écran lit.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { store } from "../../../store.js";
import { variablesDeLaMemoire } from "../../../services/memoire-identifiants.js";
import { preparerLaMemoire, lignesAffichables } from "../../project-memoire-fichiers.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";

const texte = (valeur) => String(valeur ?? "").trim();

const etat = {
  projet: "",
  chargement: false,
  lu: false,
  erreur: "",
  variables: [],
  recherche: ""
};

/** Le projet affiché, pour repartir de zéro quand on en change. */
function clefDuProjet() {
  return texte(store.currentProject?.backendProjectId || store.currentProjectId);
}

/**
 * Les variables du projet, telles que ses fichiers les dessinent.
 *
 * Elles se recalculent à chaque venue : la mémoire a pu bouger dans un autre
 * onglet, et un tableau de variables périmé est pire qu'un tableau vide — on y
 * chercherait un nom qui n'existe plus.
 */
export async function lireLesVariables(projet) {
  const { listProjectAssertions } = await import("../../../services/project-memory-supabase.js");
  const assertions = (await listProjectAssertions(projet)) ?? [];
  const memoire = preparerLaMemoire(assertions);
  const fichiers = (memoire.dossiers ?? []).flatMap((dossier) => dossier.fichiers ?? []);
  return variablesDeLaMemoire(fichiers, (fichier) => lignesAffichables(fichier));
}

/** Ce que la recherche retient : le nom, et rien d'autre — c'est lui qu'on cherche. */
export function variablesFiltrees(variables = [], recherche = "") {
  const cherche = texte(recherche).toLowerCase();
  if (!cherche) return variables;
  return variables.filter((variable) => texte(variable.nom).toLowerCase().includes(cherche));
}

/**
 * Une variable, en une ligne.
 *
 * Le nom d'abord — c'est ce qu'on vient chercher —, puis ce qu'elle vaut, où
 * elle est déclarée, et combien de fois elle sert. Une variable sans
 * déclaration porte sa couleur : elle est citée par des règles qui s'appuient
 * sur ce que personne n'a versé.
 */
function renderLigne(variable) {
  return `
    <li class="memoire-variable${variable.declaree ? "" : " memoire-variable--inconnue"}">
      <span class="memoire-variable__nom">${escapeHtml(variable.nom)}</span>
      <span class="memoire-variable__valeur">${
        variable.declaree
          ? (variable.valeur ? escapeHtml(variable.valeur) : "—")
          : "personne ne l'a versée"
      }</span>
      <span class="memoire-variable__ou">${variable.declaree ? escapeHtml(variable.declarePar) : ""}</span>
      <span class="memoire-variable__usages" title="${escapeHtml(variable.citeePar.join(", "))}">${
        variable.citeePar.length
          ? `${variable.citeePar.length} usage${variable.citeePar.length > 1 ? "s" : ""}`
          : "aucun usage"
      }</span>
    </li>
  `;
}

export function renderTableauDesVariables(variables = [], recherche = "") {
  const montrees = variablesFiltrees(variables, recherche);
  const manquantes = variables.filter((variable) => !variable.declaree).length;

  if (!variables.length) {
    return `<div class="propositions-empty"><b>Aucune variable</b>
      <p>Ce projet n'a encore versé aucun nom. La première proposition signée en posera.</p></div>`;
  }

  return `
    <section class="memoire-variables">
      <header class="memoire-variables__tete">
        <b>Variables du projet</b>
        <span class="memoire-variables__compte">${variables.length}</span>
        ${manquantes
          ? `<span class="memoire-variables__manquantes">${manquantes} sans déclaration</span>`
          : ""}
      </header>
      <div class="memoire-variable memoire-variable--tete">
        <span>Nom</span><span>Valeur</span><span>Déclarée dans</span><span>Citée par</span>
      </div>
      ${montrees.length
        ? `<ul class="memoire-variables__liste">${montrees.map(renderLigne).join("")}</ul>`
        : `<p class="memoire-variables__quoi">Aucun nom ne contient « ${escapeHtml(recherche)} ».</p>`}
    </section>
  `;
}

function dessiner(root) {
  root.innerHTML = `
    <section class="studio-panel">
      <header class="studio-panel__head">
        <h2 class="studio-panel__title">Suivre les variables mutualisées</h2>
        <p class="studio-panel__lead">
          Les noms que le projet partage d'une discipline à l'autre. On les lit
          avant d'écrire une règle : pour réutiliser un nom qui existe plutôt que
          d'en inventer un voisin, et pour voir ce sur quoi le raisonnement
          s'appuie sans que personne l'ait versé.
        </p>
        <p class="studio-panel__lead">
          La valeur, le fichier qui déclare et les usages sont de l'<b>analyse</b> :
          ils changent avec la mémoire. Ce qu'une variable <b>est</b> — son type,
          son unité — se lit dans <code>Mémoire/variables-du-projet.ref</code>.
        </p>
      </header>

      <div class="memoire-variables__barre">
        <input type="search" class="gh-input" id="variablesRecherche" placeholder="Chercher un nom…"
          value="${escapeHtml(etat.recherche)}" aria-label="Chercher une variable">
        <button type="button" class="gh-btn gh-btn--sm" data-variables-relire>
          ${svgIcon("sync", { className: "octicon" })} Relire la mémoire
        </button>
      </div>

      ${etat.erreur
        ? `<div class="propositions-empty propositions-empty--warn"><b>La mémoire n'a pas pu être lue</b>
             <p>${escapeHtml(etat.erreur)}</p></div>`
        : etat.chargement
          ? `<p class="review-empty-note">Lecture de la mémoire du projet…</p>`
          : renderTableauDesVariables(etat.variables, etat.recherche)}
    </section>
  `;

  const champ = root.querySelector("#variablesRecherche");
  if (champ) {
    champ.addEventListener("input", () => {
      etat.recherche = champ.value;
      // On ne redessine que la liste : redessiner l'écran entier ferait perdre
      // le curseur à chaque frappe.
      const hote = root.querySelector(".memoire-variables")?.parentElement;
      if (!hote) return;
      const ancien = root.querySelector(".memoire-variables");
      const neuf = document.createElement("div");
      neuf.innerHTML = renderTableauDesVariables(etat.variables, etat.recherche);
      if (ancien && neuf.firstElementChild) ancien.replaceWith(neuf.firstElementChild);
    });
  }

  for (const bouton of root.querySelectorAll("[data-variables-relire]")) {
    bouton.addEventListener("click", () => { etat.lu = false; void charger(root); });
  }
}

async function charger(root) {
  const projet = clefDuProjet();
  if (!projet) {
    etat.erreur = "Ce projet n'est pas relié à la base.";
    dessiner(root);
    return;
  }

  etat.chargement = true;
  etat.erreur = "";
  dessiner(root);

  try {
    etat.variables = await lireLesVariables(projet);
    etat.lu = true;
  } catch (erreur) {
    // Une lecture qui échoue se dit. Un tableau vide se lirait comme « ce
    // projet n'a aucune variable », ce qui est une autre phrase.
    etat.erreur = erreur instanceof Error ? erreur.message : "Lecture impossible.";
    etat.variables = [];
  }

  etat.chargement = false;
  if (root.isConnected) dessiner(root);
}

export function renderVariablesMutualisees(root, { force = false } = {}) {
  if (!root) return;

  const projet = clefDuProjet();
  const aChange = projet !== etat.projet;
  if (aChange) {
    etat.projet = projet;
    etat.variables = [];
    etat.lu = false;
    etat.recherche = "";
  }

  if (!force && !aChange && root.dataset.variablesMonte === "true") return;
  root.dataset.variablesMonte = "true";

  dessiner(root);
  if (!etat.lu || aChange) void charger(root);

  registerProjectPrimaryScrollSource(
    root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}
