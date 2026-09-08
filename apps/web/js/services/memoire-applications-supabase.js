/**
 * Les allers-retours des lectures d'une règle.
 *
 * Quatre gestes : lire les lectures d'un projet, écrire celles d'un versement,
 * reconstruire celles de la mémoire déjà en place, et compter. La règle de ce
 * qui lit quoi vit dans `memoire-applications.js`, qui est pur et testé ; ici on
 * ne fait que porter le résultat à la base.
 *
 * Comme partout dans la mémoire : `null` quand la lecture a échoué, `[]` quand
 * il n'y a rien. Confondre les deux ferait afficher « aucun emploi » à une donnée
 * qui en a — c'est-à-dire exactement le mensonge que cette étape existe pour
 * éviter.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { RESOLUTION, applicationsDeLaMemoire, applicationsDuVersement } from "./memoire-applications.js";

const SUPABASE_URL = getSupabaseUrl();
const COLUMNS = [
  "id", "project_id", "rule_assertion_id", "output_assertion_id", "input_assertion_id",
  "input_subject", "input_rank", "zone", "utility", "proposition_id", "resolution", "created_at"
].join(",");

/** Les colonnes qu'on écrit. La base pose le reste. */
const ECRITES = [
  "project_id", "rule_assertion_id", "output_assertion_id", "input_assertion_id",
  "input_subject", "input_rank", "zone", "utility", "proposition_id", "resolution"
];

/**
 * Postgres refuse un lot au premier doublon.
 *
 * Un versement peut recouper des appels déjà écrits — une règle reversée à
 * l'identique, une reconstruction relancée. On demande donc la fusion sur la clé
 * de l'appel plutôt que de faire échouer les quarante lignes pour une.
 */
const CONFLIT = "output_assertion_id,zone,input_rank";

async function request(path, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!response.ok) throw new Error(`${path} (${response.status})`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

/** Une ligne réduite à ce que la base attend. */
function pourLaBase(ligne) {
  const propre = {};
  for (const colonne of ECRITES) propre[colonne] = ligne?.[colonne] ?? null;
  return propre;
}

/**
 * Toutes les lectures d'un projet, dans l'ordre où elles ont été faites.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué — la table
 *   peut ne pas exister encore.
 */
export async function listerLesApplications(projectId) {
  if (!projectId) return null;

  try {
    return (await request("assertion_applications", {
      params: {
        select: COLUMNS,
        project_id: `eq.${projectId}`,
        order: "output_assertion_id.asc,zone.asc,input_rank.asc"
      }
    })) ?? [];
  } catch {
    return null;
  }
}

/**
 * Écrit des lectures.
 *
 * Par paquets : un versement d'étude porte des centaines de lignes, et une seule
 * requête de cette taille se fait couper avant d'arriver.
 *
 * @returns {Promise<number>} combien ont été écrites. Zéro n'est pas un échec —
 *   une mémoire sans règle n'a rien à enregistrer.
 */
export async function ecrireLesApplications(lignes = []) {
  const propres = (Array.isArray(lignes) ? lignes : [])
    .filter((ligne) => ligne?.project_id && ligne?.output_assertion_id && ligne?.input_subject)
    .map(pourLaBase);
  if (!propres.length) return 0;

  const PAQUET = 200;
  let ecrites = 0;

  for (let debut = 0; debut < propres.length; debut += PAQUET) {
    const lot = propres.slice(debut, debut + PAQUET);
    try {
      await request("assertion_applications", {
        method: "POST",
        params: { on_conflict: CONFLIT },
        headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
        body: lot
      });
      ecrites += lot.length;
    } catch {
      // Un paquet perdu ne doit pas emporter les autres : le graphe se complète,
      // il ne s'écroule pas. La reconstruction rattrapera ce qui manque.
    }
  }

  return ecrites;
}

/**
 * Enregistre ce qu'un versement a fait lire.
 *
 * Appelé après l'écriture des affirmations, quand elles ont leurs identifiants.
 * Il n'échoue jamais bruyamment : la mémoire est versée, et lui manquer son
 * graphe ne doit pas défaire la fusion. La reconstruction est là pour ça.
 *
 * @returns {Promise<number>} combien de lectures ont été enregistrées
 */
export async function enregistrerLeVersement({ memoire = [], ecrites = [], projectId = "", propositionId = null } = {}) {
  try {
    const lignes = applicationsDuVersement({ memoire, ecrites, projectId, propositionId });
    return await ecrireLesApplications(lignes);
  } catch {
    return 0;
  }
}

/**
 * Reconstruit les lectures de toute la mémoire déjà en place.
 *
 * Pour rattraper ce qui a été versé avant que cette table existe. Les noms sont
 * résolus contre la mémoire **d'aujourd'hui**, pas contre celle que les règles
 * ont vue : les lignes portent donc `reconstruit`, et l'écran doit le dire.
 *
 * Ce qui a déjà été enregistré au versement n'est pas écrasé — la fusion se fait
 * sur la clé de l'appel, et une ligne enregistrée en son temps vaut mieux qu'une
 * ligne reconstruite aujourd'hui. On ne rejoue donc la reconstruction que sur ce
 * qui n'a pas d'appel.
 *
 * @returns {Promise<{lues: number, ecrites: number, deja: number}|null>}
 */
export async function reconstruireLesApplications(projectId) {
  if (!projectId) return null;

  try {
    const [{ listProjectAssertions }] = await Promise.all([import("./project-memory-supabase.js")]);
    const memoire = (await listProjectAssertions(projectId)) ?? [];

    const existantes = (await listerLesApplications(projectId)) ?? [];
    const deja = new Set(
      existantes
        .filter((ligne) => String(ligne?.resolution ?? "") === RESOLUTION.ENREGISTRE)
        .map((ligne) => String(ligne?.output_assertion_id ?? ""))
        .filter(Boolean)
    );

    const toutes = applicationsDeLaMemoire(memoire, { projectId, resolution: RESOLUTION.RECONSTRUIT });
    const aEcrire = toutes.filter((ligne) => !deja.has(String(ligne.output_assertion_id)));

    return { lues: toutes.length, ecrites: await ecrireLesApplications(aEcrire), deja: toutes.length - aEcrire.length };
  } catch {
    return null;
  }
}
