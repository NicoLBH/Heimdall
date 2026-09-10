/**
 * L'appel qui fait écrire le titre d'une proposition.
 *
 * Seul le transport vit ici. Ce qui décide de la phrase — quelles lignes du diff
 * partent, et quand on ne paie pas du tout — est dans `titre-de-proposition.js`,
 * qui n'importe pas `auth.js` et se teste donc en Node.
 *
 * La **consigne** donnée au modèle n'est ni ici ni là : elle vit au serveur, et
 * n'en sort pas. Ce fichier n'envoie que des données.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le titre et le résumé, écrits au serveur.
 *
 * Ne lève jamais. Les pannes se rendent, nommées, parce que l'appelant a
 * toujours un titre à afficher — celui qu'il avait — et qu'il doit pouvoir dire
 * pourquoi il l'a gardé.
 *
 * `refus` accompagne `"refused"` quand c'est le **contrôle** qui a écarté la
 * rédaction, et non un incident : la nuance compte, parce que l'une se retente
 * et l'autre non.
 *
 * @returns {Promise<{titre: string, resume: string}
 *   |{error: string, refus?: string, valeurs?: string[]}>}
 */
export async function redigerLeTitre({ projectId = "", faits = null } = {}) {
  if (!texte(projectId) || !faits) return { error: "empty" };

  let reponse = null;
  try {
    reponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-proposition-title`, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ project_id: texte(projectId), facts: faits })
    });
  } catch {
    return { error: "unreachable" };
  }

  if (!reponse.ok) {
    const charge = await reponse.json().catch(() => null);
    const code = texte(charge?.code);
    if (reponse.status === 503 || code === "LLM_NOT_CONFIGURED") return { error: "unconfigured" };
    if (reponse.status === 404) return { error: "unreachable" };
    if (code === "LLM_REFUSED") {
      return {
        error: "refused",
        refus: texte(charge?.refus),
        valeurs: Array.isArray(charge?.valeurs) ? charge.valeurs : []
      };
    }
    return { error: "refused" };
  }

  const charge = await reponse.json().catch(() => null);
  const titre = texte(charge?.titre);
  if (!titre) return { error: "empty" };

  return { titre, resume: texte(charge?.resume) };
}
