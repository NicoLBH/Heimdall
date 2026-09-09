/**
 * Écrire un ZIP, sans rien installer.
 *
 * ## Pourquoi pas une bibliothèque
 *
 * Un ZIP **sans compression** est un format court : un en-tête par fichier, les
 * octets, un répertoire central, une fin. Quatre-vingts lignes ici valent mieux
 * qu'une dépendance de plus dans une application qui n'en a aucune — et le jour
 * où quelque chose ne s'ouvre pas, on lit le format plutôt que le paquet.
 *
 * La compression ne manque pas : ce qu'on emballe est du texte de quelques
 * centaines de kilo-octets, et tout outil sait ouvrir un ZIP stocké. Le format
 * dit « méthode 0 », et c'est prévu depuis 1989.
 *
 * ## Les extensions inventées ne posent aucun problème
 *
 * Un ZIP ne connaît pas les extensions : il porte des **chemins**, et
 * `Mémoire/structure.ref` en est un comme un autre. Ce qu'on écrit se
 * décompresse tel quel, y compris les accents — c'est le drapeau UTF-8 qui le
 * garantit, et il est posé sur chaque entrée.
 */

/** La table de CRC-32, calculée une fois. C'est ce que le format exige. */
const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let octet = 0; octet < 256; octet += 1) {
    let valeur = octet;
    for (let tour = 0; tour < 8; tour += 1) {
      valeur = valeur & 1 ? (valeur >>> 1) ^ 0xEDB88320 : valeur >>> 1;
    }
    table[octet] = valeur >>> 0;
  }
  return table;
})();

/** Le CRC-32 d'une suite d'octets. */
export function crc32(octets) {
  let valeur = 0xFFFFFFFF;
  for (const octet of octets) valeur = TABLE[(valeur ^ octet) & 0xFF] ^ (valeur >>> 8);
  return (valeur ^ 0xFFFFFFFF) >>> 0;
}

/** Une suite d'octets qu'on remplit en avançant. */
function tampon() {
  const morceaux = [];
  let taille = 0;

  const ajouter = (octets) => { morceaux.push(octets); taille += octets.length; };

  return {
    get taille() { return taille; },
    octets: (valeurs) => ajouter(Uint8Array.from(valeurs)),
    // Les entiers du format sont **petit-boutiens**, toujours.
    court: (valeur) => ajouter(Uint8Array.from([valeur & 0xFF, (valeur >>> 8) & 0xFF])),
    long: (valeur) => ajouter(Uint8Array.from([
      valeur & 0xFF, (valeur >>> 8) & 0xFF, (valeur >>> 16) & 0xFF, (valeur >>> 24) & 0xFF
    ])),
    brut: (octets) => ajouter(octets),
    fini: () => {
      const tout = new Uint8Array(taille);
      let place = 0;
      for (const morceau of morceaux) { tout.set(morceau, place); place += morceau.length; }
      return tout;
    }
  };
}

/**
 * La date d'une entrée, au format MS-DOS que le ZIP demande.
 *
 * Une seconde sur deux : le format ne compte pas plus fin, et prétendre le
 * contraire ferait afficher une heure fausse d'une seconde à qui ouvre
 * l'archive.
 */
function horodatage(date) {
  const quand = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const heure = (quand.getHours() << 11) | (quand.getMinutes() << 5) | Math.floor(quand.getSeconds() / 2);
  const jour = ((quand.getFullYear() - 1980) << 9) | ((quand.getMonth() + 1) << 5) | quand.getDate();
  return { heure, jour };
}

/**
 * Une archive ZIP, à partir de fichiers texte.
 *
 * @param {{chemin: string, contenu: string}[]} fichiers
 * @param {Date} [le] la date portée par chaque entrée
 * @returns {Uint8Array} les octets de l'archive
 */
export function ecrireUnZip(fichiers = [], le = new Date()) {
  const encodeur = new TextEncoder();
  const { heure, jour } = horodatage(le);

  const corps = tampon();
  const central = tampon();
  const entrees = [];

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    const chemin = String(fichier?.chemin ?? "").trim();
    if (!chemin) continue;

    const nom = encodeur.encode(chemin);
    const donnees = encodeur.encode(String(fichier?.contenu ?? ""));
    const somme = crc32(donnees);
    const depuis = corps.taille;

    // En-tête local : signature, version, drapeaux, méthode 0 (stocké).
    corps.long(0x04034B50);
    corps.court(20);
    // Bit 11 : le nom est en UTF-8. Sans lui, « Mémoire » s'ouvre en « MÃ©moire ».
    corps.court(0x0800);
    corps.court(0);
    corps.court(heure);
    corps.court(jour);
    corps.long(somme);
    corps.long(donnees.length);
    corps.long(donnees.length);
    corps.court(nom.length);
    corps.court(0);
    corps.brut(nom);
    corps.brut(donnees);

    entrees.push({ nom, somme, taille: donnees.length, depuis });
  }

  for (const entree of entrees) {
    central.long(0x02014B50);
    central.court(20);
    central.court(20);
    central.court(0x0800);
    central.court(0);
    central.court(heure);
    central.court(jour);
    central.long(entree.somme);
    central.long(entree.taille);
    central.long(entree.taille);
    central.court(entree.nom.length);
    central.court(0);
    central.court(0);
    central.court(0);
    central.court(0);
    central.long(0);
    central.long(entree.depuis);
    central.brut(entree.nom);
  }

  const fin = tampon();
  fin.long(0x06054B50);
  fin.court(0);
  fin.court(0);
  fin.court(entrees.length);
  fin.court(entrees.length);
  fin.long(central.taille);
  fin.long(corps.taille);
  fin.court(0);

  const tout = new Uint8Array(corps.taille + central.taille + fin.taille);
  tout.set(corps.fini(), 0);
  tout.set(central.fini(), corps.taille);
  tout.set(fin.fini(), corps.taille + central.taille);
  return tout;
}
