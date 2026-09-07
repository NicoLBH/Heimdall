/**
 * Ce qu'un projet dit de lui-même : une description courte, et ses mots-clés.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * `project-supabase-sync.js` porte l'identité d'un projet — son nom, sa ville,
 * sa phase — et la synchronise avec un catalogue. « À propos » n'est pas de
 * l'identité : c'est une **présentation**, que son auteur écrit et réécrit sans
 * que rien d'autre en dépende. Les mêler ferait passer chaque correction de
 * formulation par la machinerie qui tient le catalogue à jour.
 *
 * ## La limite est ici, pas seulement dans le formulaire
 *
 * Trois cent cinquante caractères. Une limite qui ne vivrait que dans l'écran
 * de saisie laisserait entrer une description de dix mille caractères par une
 * autre porte, et l'écran qui l'affiche n'aurait aucun moyen de s'en remettre.
 */

/** La description tient en une phrase ou deux. Au-delà, ce n'est plus « à propos ». */
export const DESCRIPTION_MAX = 350;

/** Un mot-clé est court, en minuscules, sans espace : c'est une étiquette. */
export const TOPIC_MAX = 40;

/** Au-delà, la liste cesse d'être une présentation et devient un inventaire. */
export const TOPICS_MAX = 12;

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un mot-clé, ramené à sa forme.
 *
 * Les espaces deviennent des tirets et les accents tombent : « Contrôle
 * Technique » et « controle-technique » désignent la même chose, et deux
 * étiquettes qui ne diffèrent que par leur graphie se comptent pour deux.
 */
export function normaliserTopic(valeur) {
  return texte(valeur)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TOPIC_MAX);
}

/** Les mots-clés d'une saisie : dédoublonnés, bornés, dans l'ordre donné. */
export function topicsDeLaSaisie(valeur) {
  const bruts = Array.isArray(valeur) ? valeur : texte(valeur).split(/[,\s]+/);
  return [...new Set(bruts.map(normaliserTopic).filter(Boolean))].slice(0, TOPICS_MAX);
}

/** La description, ramenée à ce qu'un écran peut montrer. */
export function descriptionDeLaSaisie(valeur) {
  return texte(valeur).slice(0, DESCRIPTION_MAX);
}

/** Ce que la base rend, mis en forme. Une colonne absente n'est pas une erreur. */
export function aProposDeLaLigne(ligne = {}) {
  return {
    description: descriptionDeLaSaisie(ligne?.description),
    topics: topicsDeLaSaisie(Array.isArray(ligne?.topics) ? ligne.topics : [])
  };
}

/**
 * De quoi frapper à la porte de la base.
 *
 * L'accès se charge **à l'appel**, pas au chargement du module : `auth.js` tire
 * le client Supabase depuis un CDN, et le module entier devenait alors
 * impossible à charger hors d'un navigateur — donc impossible à tester, alors
 * que tout ce qu'il y a de délicat ici est du calcul pur.
 */
async function porte() {
  const { getSupabaseUrl, buildSupabaseAuthHeaders } = await import("../../assets/js/auth.js");
  const base = texte(getSupabaseUrl());
  if (!base) throw new Error("Supabase n'est pas configuré.");
  return { base, entetes: await buildSupabaseAuthHeaders({ Accept: "application/json" }) };
}

/**
 * Lire la présentation d'un projet.
 *
 * Un échec rend `null`, jamais une présentation vide : « ce projet n'a pas de
 * description » et « je n'ai pas pu lire » sont deux phrases différentes, et
 * les confondre effacerait une description à la première écriture.
 */
export async function lireAPropos(projetId) {
  const id = texte(projetId);
  if (!id) return null;

  try {
    const { base, entetes } = await porte();
    const url = new URL(`${base}/rest/v1/projects`);
    url.searchParams.set("select", "description,topics");
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("limit", "1");

    const reponse = await fetch(url.toString(), { headers: entetes, cache: "no-store" });
    if (!reponse.ok) return null;

    const lignes = await reponse.json();
    const ligne = Array.isArray(lignes) ? lignes[0] : null;
    return ligne ? aProposDeLaLigne(ligne) : null;
  } catch {
    return null;
  }
}

/**
 * Écrire la présentation d'un projet.
 *
 * L'échec remonte : une saisie perdue en silence est pire qu'une saisie
 * refusée, parce qu'on ne la refait pas.
 */
export async function ecrireAPropos(projetId, { description = "", topics = [] } = {}) {
  const id = texte(projetId);
  if (!id) throw new Error("Aucun projet à mettre à jour.");

  const contenu = {
    description: descriptionDeLaSaisie(description),
    topics: topicsDeLaSaisie(topics)
  };

  const { base, entetes } = await porte();
  const url = new URL(`${base}/rest/v1/projects`);
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("select", "description,topics");

  const reponse = await fetch(url.toString(), {
    method: "PATCH",
    headers: { ...entetes, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(contenu)
  });

  if (!reponse.ok) {
    throw new Error(`La présentation n'a pas pu être enregistrée (${reponse.status}).`);
  }

  const lignes = await reponse.json().catch(() => []);
  return aProposDeLaLigne(Array.isArray(lignes) ? (lignes[0] ?? contenu) : contenu);
}
