# Les six extensions de la mémoire

**À quoi sert cette page :** on n'ouvre pas un fichier de mémoire par curiosité,
on l'ouvre pour y verser quelque chose ou pour y chercher une réponse. Dans les
deux cas il faut savoir lequel — et six suffixes de trois lettres ne se
retiennent pas. Cette page les nomme un par un.

Le principe est celui du web : `app.html`, `app.css` et `app.js` disent trois
choses du même `app`. L'extension dit **ce que le fichier contient**, et chaque
contenu a **sa forme d'écriture**.

Deux `incendie.mdall` à deux endroits de l'arborescence n'ont pas de sens, et
c'est dangereux : on ouvre l'un en croyant l'autre.

---

## En un coup d'œil

| | ce qu'il contient | la question à laquelle il répond | il ne contient jamais |
| --- | --- | --- | --- |
| **`.ref`** | les règles appliquées | « qu'est-ce que le texte dit ? » | aucune valeur de **ce** projet |
| **`.ddb`** | les données de base | « qu'est-ce que le bâtiment **est** ? » | rien qui se discute |
| **`.ctr`** | les contraintes | « qu'est-ce qui s'impose ? » | rien qu'on puisse refuser |
| **`.hyp`** | les hypothèses | « qu'est-ce qu'on suppose en attendant ? » | rien de confirmé |
| **`.cst`** | les constats | « qu'a-t-on observé, et quand ? » | un constat sans date |
| **`.crp`** | le corpus | « qu'est-ce qui est entré au dossier ? » | une pièce qu'on n'a pas reçue |

Et une septième, qui ne devrait pas exister : **`.mdall`**. Elle marque ce dont
personne n'a dit la nature. Un fichier `.mdall` qui se remplit est un signal :
un utilitaire a oublié de se prononcer.

---

## `.ref` — les règles appliquées

Ce que le texte dit, tel qu'il le disait **le jour où on l'a appliqué**. Une
règle vaut pour mille bâtiments ; c'est ce qui la distingue de tout le reste.

Le projet en garde un instantané, et pas un lien vers le corpus vivant : six
mois plus tard l'arrêté aura peut-être bougé, et un renvoi vers un texte qui
change réécrirait l'histoire en silence.

**Un `.ref` s'exécute.** C'est le seul des six, et sa forme le dit : le mot
`fonction`, les entrées entre parenthèses, une parenthèse par clause, un
point-virgule sur ce que la règle pose.

```
// Classe le bâtiment en famille au sens de l'article 3 : c'est le nom que
// presque toutes les autres exigences citent.
fonction Classement du bâtiment(zones, Logements superposés, Hauteur du plancher bas) {
   importe (variable: Logements superposés, depuis: donnees-de-base.ddb);
   importe (variable: Hauteur du plancher bas, depuis: donnees-de-base.ddb);

   soit texte = "arrêté du 31 janvier 1986 modifié, article 3, 3°";
   soit parce que = "Troisième famille B : habitations ne satisfaisant pas à…";

   si (Logements superposés = oui)
   et (Hauteur du plancher bas <= 28 m)
   alors (
      enregistre (
         Classement du bâtiment: "3e famille B",
         dans: donnees-de-base.ddb,
         zones: zones
      )
   );
   sinon ("3e famille A");
}
```

- La parenthèse de tête nomme les **entrées** : on voit de quoi la règle a
  besoin sans lire ses conditions. Elle ne se stocke pas — les entrées **sont**
  les sujets des conditions, et une signature recopiée diverge.
- **Un commentaire dit à quoi elle sert**, toujours. Sans lui il faut lire les
  conditions pour deviner l'objet, et sur douze mille fonctions personne ne le
  fera. Une fonction qui n'en a pas porte, à sa place, une ligne qui appelle :
  `// À DÉCRIRE — à quoi sert « … » ?`.
- **La portée est un paramètre**, et le premier. Un raisonnement ne s'applique
  pas « dans le bâtiment A », il s'applique : un `.ref` ne se découpe donc pas
  par zone et n'y répète pas une fonction. La même recopiée trois fois ferait
  trois versions à corriger, et deux d'entre elles resteraient en arrière.
- **`importe` dit d'où vient chaque entrée** : le fichier qui la déclare, ou le
  dictionnaire à défaut — c'est là qu'on verra qu'elle manque.
- **Ce qui fonde la règle se déclare en tête**, comme les `const` d'une
  fonction : `soit texte = …` porte la provenance, `soit parce que = …` la
  citation. Le nom de la locale **est** le type de provenance — `soit
  document = …`, `soit règle = …` —, et c'est ce qui dit comment la valeur a été
  obtenue. En bas, après la conclusion, on ne les cherchait plus.
- **`enregistre` dit où va le résultat.** C'est la question qui vient toujours
  après « alors quoi ? ». Une règle peut conclure sans rien écrire quand elle
  produit une valeur intermédiaire que d'autres reprennent.
- **Les commentaires** s'écrivent `// …` ou `/* … */`. Ils ne posent rien, ne
  conditionnent rien, et deviennent nécessaires dès qu'une règle passe quinze
  lignes : dire *pourquoi* une condition existe est autre chose que dire ce
  qu'elle teste.
- **Aucun statut.** Un référentiel n'a pas d'état dans un projet : il est
  appliqué, ou il ne l'est pas.
- **Aucune valeur de ce projet.** `si hauteur = 26` serait une règle vraie d'un
  bâtiment et d'aucun autre : elle ne capitaliserait rien.

La ponctuation rend la règle exécutable, elle ne la rend pas obligatoire : un
fichier tapé à la main sans parenthèses se lit exactement pareil.

### `Mémoire/variables-du-projet.ref`

À la racine de la mémoire, un `.ref` d'un genre particulier : il ne porte aucune
règle, seulement les **noms** que le projet partage.

```
// Les noms que le projet partage. Une règle qui cite un nom absent d'ici
// s'appuie sur ce que personne n'a versé.
// Ce fichier s'engendre depuis les autres : il ne se verse pas, il se relit.
// Une déclaration doit suffire à décider si l'on réutilise ce nom ou si l'on
// en crée un autre.

const Hauteur du plancher bas = {
   type: "mesure",
   unité: "m",
   description: "Hauteur du plancher bas du dernier niveau accessible, depuis le sol.",
   utilisation: "Entrée du classement en famille (article 3), et du désenfumage selon l'IT 246.",
   déjà utilisé dans: [
      Classement du bâtiment (incendie.ref)
   ]
};
```

Six champs, et aucun n'est décoratif — voir
[`langage-mdall.md`](langage-mdall.md), « une déclaration de variable doit être
explicite ». Dix-huit mois de chantier font des milliers de noms : si personne ne
sait dire ce que fait celui-ci, chacun en recréera un voisin. Ce qui manque porte
à sa place un `À DÉCRIRE —` suivi de la question à laquelle répondre.

C'est ce qu'on lit **avant** d'écrire une règle : pour réutiliser un nom qui
existe plutôt que d'en inventer un voisin. Entre « Hauteur du plancher bas » et
« Hauteur du dernier plancher », on se trompe vite, et un nom mal orthographié
fabrique une seconde variable qui ne servira jamais.

**Il ne dit pas ce qu'une variable vaut.** Une variable prend plusieurs valeurs
au fil d'une étude, et une définition qui en porterait une cesserait d'être vraie
au premier versement. Ce qu'elle vaut aujourd'hui, qui la déclare et qui s'en
sert relèvent de l'**analyse** : c'est l'écran `Atelier › Développements › Suivre
les variables mutualisées`. Le même partage se retrouve au survol d'un nom, dans
n'importe quel fichier.

Il s'engendre depuis les autres fichiers, et ne se verse donc pas : le verser en
ferait une seconde vérité, qui divergerait au premier versement.

---

## `.ddb` — les données de base

Ce qui a été relevé sur le site ou le programme. **Ne se discute pas, ne se
calcule pas.**

C'est ici que vivent les **variables mutualisées** du projet : les noms qu'une
discipline pose et que les autres citent. « Hauteur du plancher bas » sert
l'incendie ; « nombre d'étages » sert l'incendie, la structure et l'acoustique.

```
Hauteur du plancher bas = 26 m {
   document: plan de masse APD, indice C
   statut: retenu
}
```

Une donnée de base est **transversale** : elle appartient au bâtiment, pas à une
discipline. La dupliquer par domaine la ferait diverger — voir
[`fondamentaux.md`](fondamentaux.md), règle 4. Elle se range donc dans
`Mémoire/Données de base/`, jamais dans le dossier d'un domaine.

Le classement incendie d'un bâtiment y figure aussi, pour la même raison : c'est
le nom que trente règles citent, et il sert au-delà de l'incendie.

---

## `.ctr` — les contraintes

Ce qui s'impose au projet. **Si vous n'êtes pas d'accord, vous n'avez pas de
recours** — c'est ce qui distingue une contrainte d'une décision.

```
Colonne sèche = "exigée, une colonne sèche de 65 mm par escalier" {
   règle: Colonne sèche — arrêté du 31 janvier 1986, article 98
   statut: retenu
}
```

Une paire, sa provenance, son statut : la forme d'un objet, et c'est bien ce que
c'est. La règle n'est pas recopiée ici — elle a son fichier à côté, et la ligne
dit seulement de laquelle la valeur sort.

---

## `.hyp` — les hypothèses

Ce qu'on suppose en attendant mieux. **Se remplace, et ce qui en dépend devient
suspect.**

```
Contrainte admissible du sol = 0,20 MPa {
   hypothèse: en attente du rapport géotechnique G2
   statut: supposé
}
```

Une hypothèse écrite comme une donnée de base est le pire des mensonges : elle
se lit comme acquise, et personne ne va vérifier ce qui paraît déjà décidé.

---

## `.cst` — les constats

Ce qui a été observé, **à une date**. Un constat sans date ne vaut rien :
« l'escalier n'était pas encloisonné » — quand ? avant ou après la reprise ? Une
observation qu'on ne peut pas situer dans le temps ne se conteste ni ne se lève.

```
Encloisonnement de l'escalier B = "absent" {
   le: 12 mars 2026
   document: rapport de visite VRT-04
      parce que: "Aucune porte coupe-feu n'équipe le palier du R+3."
}
```

Un constat reste **par domaine** : il observe un manquement au regard d'une
exigence, donc d'une discipline.

---

## `.crp` — le corpus

Ce qui est entré au dossier : documents, pièces jointes, avis. Le fichier ne
porte pas les pièces — elles vivent dans `Documents/` — il porte **le fait
qu'elles sont entrées**, quand, et sous quel indice.

---

## Où chaque fichier vit

```
Mémoire/
   Données de base/  donnees-de-base.ddb
   Hypothèses/       hypotheses.hyp
   Corpus/           corpus.crp
   Incendie/         incendie.ref  incendie.ctr  incendie.cst
   Structure/        structure.ref  structure.ctr
Documents/
   … rangés comme l'utilisateur veut
```

**Ce qui est observé est transversal, ce qui est déduit est par domaine.** Une
règle, une contrainte et un constat viennent d'un corpus, donc d'une discipline.
Une donnée de base, une hypothèse et le corpus appartiennent au bâtiment.

La **zone** n'est pas un répertoire : c'est une section dans le fichier, parce
que l'unité de production est le domaine — une étude incendie touche plusieurs
zones d'un coup.

```
zone: Bâtiment A {
   Classement du bâtiment = "3e famille B" { … }
}
```

---

## Trois langages, pas six

Ce qui distingue deux fichiers n'est pas leur suffixe, c'est **ce que leurs
lignes font**. C'est ce que la coloration montre :

| | | |
| --- | --- | --- |
| `.ref` | une **fonction** | les couleurs du JavaScript |
| `.ddb` `.hyp` | une **déclaration** | celles d'un `const` |
| `.ctr` `.cst` `.crp` | un **énoncé** | celles du JSON |

Une palette par extension ferait croire à six langages là où il y en a trois, et
raterait le point : distinguer un nom **posé** d'un nom **cité**.

---

## Ce qui écrit ces fichiers

Personne, directement. **Rien n'entre jamais directement dans la mémoire du
projet** — voir [`fondamentaux.md`](fondamentaux.md), règle 1. Un utilitaire de
l'Atelier prépare une proposition ; quelqu'un la relit, arbitre ce qui contredit
ce que le projet a déjà décidé, et signe. C'est la signature qui écrit.

Une étude incendie, par exemple, en écrit trois d'un coup :

```
incendie.ref          les règles qu'elle a appliquées, avec leurs conditions
donnees-de-base.ddb   le classement — la variable que tout le reste cite
incendie.ctr          ce qui s'impose au projet
```

---

## Où c'est écrit dans le code

| fichier | ce qu'il porte |
| --- | --- |
| `apps/web/js/services/memoire-rangement.js` | quelle extension pour quelle nature, et où le fichier vit |
| `apps/web/js/services/memoire-en-texte.js` | comment chaque nature s'écrit |
| `apps/web/js/services/memoire-en-lecture.js` | comment elle se relit — `lire(écrire(G)) = G` |
| `apps/web/js/services/memoire-identifiants.js` | ce qu'un nom désigne, et ce qu'il ne désigne pas |

Voir aussi [`langage-mdall.md`](langage-mdall.md) pour la grammaire complète.
