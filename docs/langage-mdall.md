# Le langage Mdall

Un langage de **traçabilité du raisonnement de projet**. Pas un langage de
règles : les règles ne sont qu'une des sources de raisonnement qu'un projet
capitalise, à côté des décisions, des relevés, des calculs et des hypothèses.

Il s'adresse à des contrôleurs techniques, des architectes, des maîtres
d'ouvrage, des conducteurs de travaux, et **tout se tape au clavier**.

Les seuls mots empruntés à un langage de programmation vivent dans les fichiers
`.ref` : `fonction` ouvre une règle, `soit` déclare ce qui la fonde, `const`
définit un nom du projet, et `//` ouvre un commentaire. Ils le sont parce qu'un
`.ref` **s'exécute**, et parce qu'un raisonnement composé de trois conditions ne
se relit pas sans bornes. Le reste du langage vient de l'écrit technique et
juridique, et les autres extensions n'en portent aucun.

Les **verbes**, eux, sont propres au métier : `importe`, `enregistre`,
`décision humaine assumée`. Voir « Les verbes du langage ».

---

## Les cinq objets, et pourquoi ils ne se mélangent pas

| l'objet | ce qu'il est | où il s'écrit |
| --- | --- | --- |
| la **donnée** | « Hauteur du plancher bas du logement le plus haut » | le sujet, en tête de ligne |
| la **valeur** | « 26 m » | après le `=` |
| la **règle** | `fonction … si … alors …` | un fichier `.ref` |
| la **preuve** | la provenance, puis sa citation | `soit texte = …` puis `soit parce que = …` |
| le **statut** | « retenu », « supposé » | `statut:`, sur sa ligne |

Et un sixième, qui n'est aucun des cinq : la **déclaration de variable**. Elle
ne dit pas ce qu'un nom vaut, elle dit ce qu'il **est** — voir « Une déclaration
de variable doit être explicite ».

---

## Les trois lois de lecture

1. **L'indentation est l'appartenance.** Une ligne indentée détaille la ligne
   pleine qui la précède. Trois espaces, jamais une tabulation : la largeur
   d'une tabulation dépend de qui la lit, et une mémoire qui se lit
   différemment selon l'écran n'est pas une mémoire.
2. **Un mot-clé ne compte qu'en tête de ligne**, après le retrait. « Habitation
   individuelle **ou** collective » est un sujet, pas une disjonction.
3. **Une valeur textuelle porte des guillemets, une valeur mesurée n'en porte
   pas.** `= "3e famille B"` contre `= 26 m`. Sans cette différence, on ne
   saurait pas relire `= 3` : le chiffre trois, ou la catégorie « 3 » ?

---

## Tout se tape au clavier

`§`, `¶`, `←`, `≤`, `≥`, `≠` étaient jolis et intapables. Un langage qu'un
architecte doit pouvoir écrire à la main ne peut pas exiger une table de
caractères : chaque marque est devenue un **mot suivi de deux points**, qui dit
en plus ce qu'elle voulait dire.

```
fichier: memoire/incendie.ctr             le chemin du fichier
note: écriture Mdall v4.4                 une note, jamais interprétée

Sujet = valeur {                          une affirmation qui vaut partout
   le: 12 mars 2026                       quand — pour un constat
   texte: arrêté …, article 3, 3°)        d'où cela vient, typé par le mot-clé
   décision humaine assumée (…)           ou : quelqu'un a tranché, et il signe
      parce que: "citation exacte"        la preuve, sous sa provenance
   statut: retenu                         l'état du raisonnement ici
}

Sujet = [                                 la même, valeur par valeur
   Bâtiment A: "CF 1 h" { … },            une entrée par partie d'ouvrage
   Bâtiment B: "CF 1/2 h" { … }
];

fonction Sujet(zones, entrée) {           la tête d'une règle, portée d'abord
   // à quoi elle sert                    dedans, pour qu'elle se copie entière
   importe (variable: entrée,             d'où vient chaque entrée, et pour
            depuis: donnees-de-base.ddb,  quelle zone
            zones: zones);
   soit texte = "…";                      d'où elle sort, déclaré en tête
   soit parce que = "…";                  la citation qui la fonde
   si (Sujet <= 28 m)                     une condition
   et (Sujet = "collective")
   ou (Sujet parmi "a" ou "b")
   non (Sujet = "x")
   sauf si (Sujet = oui)                  ce qui la borne
   alors (                                ce que la règle pose…
      enregistre (
         Sujet: "3e famille B",
         dans: incendie.ctr,              …et où cela s'écrit
         zones: zones
      )
   );
   sinon ("3e famille A");                ou : conclure sans rien écrire
}
```

### Les accolades bornent, elles ne parlent pas

L'indentation suffisait à la machine, pas à l'œil : un bloc de sept lignes dont
la fin ne se marque que par un retour au niveau zéro se relit mal, et se relit
très mal quand deux blocs se suivent.

Ce n'est pas un mot de programmeur, c'est une **borne**. Elle rend en outre le
**pliage** possible, qui est ce qui rend un fichier de cent affirmations
lisible : replié sur ses têtes, il en fait cent au lieu de cinq cents.

On ne dépend donc plus de la seule mise en forme du rendu : le texte brut, collé
dans un éditeur quelconque, garde sa structure.

Une ligne vide sépare deux blocs. Sans elle, l'accolade fermante de l'un et la
tête du suivant se collent, et l'œil ne voit plus où l'un finit. Une affirmation
qui ne porte rien d'autre que sa valeur ne s'entoure pas de bornes : une paire
autour de rien serait du bruit.

La lecture, elle, **pardonne l'absence d'accolades** : un bloc ouvert sans borne
se ferme à la première ligne non indentée. Un architecte qui tape à la main n'en
ajoutera pas toujours.

**Les comparateurs** : `=` `!=` `<=` `>=` `<` `>` `parmi` `renseigné`
`non renseigné`. La lecture accepte aussi `≤`, `≥`, `≠`, `<>`, `==` : personne
ne doit être refusé pour une raison de clavier, et une mémoire ne refuse pas ce
qu'elle a elle-même écrit hier.

**Les six provenances** : le mot-clé **est** le type, et le type **est**
l'origine de la valeur. Rien de plus à déclarer.

| mot-clé | ce qu'il dit |
| --- | --- |
| `texte:` | un texte réglementaire, une norme, un DTU |
| `document:` | une pièce du projet : plan, note, compte rendu |
| `calcul:` | un calcul, avec ce qu'il a lu |
| `règle:` | une règle d'un référentiel |
| `décision:` | quelqu'un a tranché |
| `hypothèse:` | on suppose, en attendant mieux |

Les deux dernières sont les seules qui ne se déduisent de rien, et les seules
qui engagent quelqu'un.

**Les sept statuts** : `retenu` · `supposé` · `contesté` · `remplacé` ·
`écarté` · `sans objet` · `en attente`. Le statut n'est pas une propriété de la
valeur ni de la règle : c'est ce que **ce projet** en fait aujourd'hui.

---

## À quoi sert tout ceci

Mdall code la **mémoire d'un projet** : les données factuelles, et surtout les
raisonnements. Capitaliser, et rendre explicite ce qui d'ordinaire reste
implicite.

L'objectif tient en une scène. Je lis dans `incendie.ctr` :

```
Blocs-portes des ensembles celliers ou caves = "CF 1/2 h"
```

Très bien — mais **comment est-on arrivé là ?** La mémoire doit répondre sans
qu'on aille demander à quelqu'un :

```
données de base employées  →  enchaînement des fonctions, et leurs fichiers  →  résultat
```

C'est cette chaîne que la forme d'une fonction rend lisible. Tout ce qui suit
en découle.

---

## Une fonction est auto-portée

Une fonction qu'on lit seule doit se comprendre seule. Sans cela, il faut ouvrir
les autres fichiers pour reconstituer la chaîne — et c'est précisément ce que la
mémoire existe pour éviter.

```
fonction Accès des véhicules lourds(zones, Champ d'application du titre VI) {
   // Définit si un parc de stationnement d'habitation, non soumis aux règles
   // ERP PS, peut accueillir des véhicules de plus de 3,5 t.

   importe (variable: Champ d'application du titre VI, depuis: memoire/donnees-de-base.ddb, zones: zones);

   soit texte = "arrêté du 31 janvier 1986 modifié, article 79";
   soit parce que = "L'accès des parcs est interdit aux véhicules de plus de 3,5 t de poids total en charge.";

   si (Champ d'application du titre VI = "dans le champ")
   alors (
      enregistre (
         Accès des véhicules lourds: "interdit au-delà de 3,5 t",
         dans: incendie.ctr,
         zones: zones
      )
   );
}
```

Six obligations, et une seule raison derrière chacune : **qu'on n'ait pas à
chercher ailleurs**.

### 1. Un commentaire dit à quoi elle sert — **dans** la fonction

Première ligne du corps, jamais au-dessus de la tête. Au-dessus, il appartient
au fichier : copier la fonction pour la porter dans un autre projet — ce qu'on
fait, et ce qu'on fera de plus en plus — laisserait l'explication derrière.

C'est la règle générale, dont tout ce qui suit découle : **une fonction ne
dépend pas de son contexte.** On la cherche, on la lit, on la copie, on
reconstruit le raisonnement qui a mené à un résultat — et à chacun de ces
gestes, elle doit se suffire.

Sans commentaire, il faut lire les conditions pour deviner l'objet — et sur
douze mille fonctions, personne ne le fera. Une fonction qui n'en a pas porte
donc, à sa place, une ligne qui **appelle** : `// À DÉCRIRE — à quoi sert
« … » ?`. Une absence qui se voit vaut mieux qu'une absence silencieuse.

### 2. La portée est un paramètre, jamais un rangement

`zones` est le premier paramètre, presque toujours. Une règle est le **capital
de raisonnement** du projet : la même recopiée dans trois zones ferait trois
versions à corriger le jour où l'arrêté bouge, et deux d'entre elles resteraient
en arrière.

Un fichier `.ref` ne se découpe donc pas par zone, et n'y répète pas une
fonction. Ce sont les **valeurs** qui portent une zone, pas les raisonnements.

### 3. `importe` dit d'où vient chaque entrée, et pour quelle zone

Un import par ligne : ajouter une entrée ajoute exactement une ligne, et le diff
dit « une entrée de plus » plutôt que de redessiner un bloc. Le fichier nommé
est celui qui **déclare** la variable ; à défaut, `variables-du-projet.ref`, qui
les liste toutes — et c'est là qu'on verra qu'elle manque.

`zones:` en fait partie. Une variable n'a pas *une* valeur, elle en a une par
partie d'ouvrage : emprunter sans dire laquelle reviendrait à en prendre une au
hasard.

### 4. `soit` déclare ce qui la fonde

Comme les `const` d'une fonction, en tête. Le nom de la locale **est** le type
de provenance : `soit texte = …`, `soit document = …`, `soit règle = …`. Plus
`soit parce que = …` pour la citation. En bas, après la conclusion, on ne les
cherchait plus.

### 5. `enregistre` dit où va le résultat

C'est la question qui vient toujours après « alors quoi ? ». Le bloc y répond
sur place : le sujet posé, le fichier qui reçoit, la portée sur laquelle cela
vaut. Trois lignes plutôt qu'une, parce que chacun de ces trois champs peut
changer seul.

Une règle peut conclure sans rien écrire — `alors ("2e famille");` — quand elle
produit une valeur intermédiaire que d'autres reprennent.

### 6. Les commentaires sont du langage

`// …` et `/* … */`, en gris. Ils ne posent rien, ne conditionnent rien : dire
*pourquoi* une condition existe est autre chose que dire ce qu'elle teste, et
une règle de quinze lignes en a besoin.

---

## Les verbes du langage

Un langage de métier a des **verbes** : les gestes qui reviennent dans tous les
projets. Les écrire en prose à chaque fois donnerait mille formulations pour une
seule chose.

| verbe | ce qu'il fait |
| --- | --- |
| `importe (variable: X, depuis: f)` | dit d'où vient une entrée, et où aller la lire |
| `enregistre (X: v, dans: f, zones: z)` | écrit une valeur dans un fichier, sur une portée |
| `décision humaine assumée (quoi, par: X, le: d)` | quelqu'un a tranché, et il signe |

`décision humaine assumée` remplace la ligne `décision:` dès qu'on sait qui a
tranché et quand. La différence n'est pas cosmétique : une hypothèse **se lève**
quand la donnée arrive, une décision **se conteste** devant celui qui l'a prise.
Sans nom ni date, une valeur choisie à la main se relit six mois plus tard comme
un fait établi, et personne ne sait plus que c'était un choix.

**La liste est fermée**, et c'est ce qui en fait un langage : un verbe inventé au
fil de l'eau ne se relirait nulle part. Ceux que le besoin nommera ensuite :

- `constate (X: v, le: d, document: f)` — une observation datée ;
- `suppose (X: v, jusqu'à: ce qui la lèverait)` — une hypothèse et sa sortie ;
- `sans objet (raison)` — le référentiel ne s'applique pas, ce qui n'est **pas**
  une condition fausse : « aucune exigence » et « exigence non satisfaite » sont
  deux phrases différentes ;
- `à vérifier (question, pour: qui)` — la machine s'arrête et appelle quelqu'un,
  plutôt que de conclure à sa place.

---

## Une variable, un bloc, ses valeurs par zone

Les fichiers de valeurs — `.ctr`, `.ddb`, `.hyp`, `.cst` — se découpaient par
zone, et le nom d'une variable se répétait dans chacune. Trois fois le même nom
à trois endroits différents, pour une seule chose. Chercher « degré coupe-feu
des planchers » donnait trois réponses sans dire qu'il s'agissait de la même
variable.

```
Degré coupe-feu des planchers = [
   Toutes zones: "CF 1 h" {
      règle: arrêté du 31 janvier 1986, article 6
      statut: retenu
   },
   Bâtiment A: "CF 1/2 h" {
      règle: arrêté du 31 janvier 1986, article 7
      statut: supposé
   }
];
```

**Une variable du projet, qui prend une valeur par partie d'ouvrage.** Et de ce
fait, la question devient impossible à éviter : *dans quelle zone ?* C'est
pourquoi `importe` porte lui aussi une portée.

Chaque entrée garde sa provenance et son statut : ce sont deux décisions
différentes, prises peut-être par deux personnes, à deux dates. Les mettre en
commun effacerait ce que la mémoire existe pour tenir.

Une valeur unique qui vaut partout n'ouvre pas de tableau — une paire de
crochets autour d'une seule entrée serait du bruit :

```
Colonne sèche = "exigée" {
   règle: Colonne sèche — arrêté du 31 janvier 1986, article 98
   statut: retenu
}
```

**Un `.ref` ne se groupe pas ainsi** : une fonction n'a pas de valeur par zone,
la portée est son paramètre. Elle n'y figure qu'une fois, quel que soit le
nombre de zones où elle a été appliquée.

---

## Une déclaration de variable doit être explicite

Dix-huit mois de chantier et douze mois d'études font des milliers de noms. Si
personne ne sait dire ce que fait celui-ci, **chacun en recréera un voisin** — et
la mémoire se remplira de synonymes qui ne se rejoignent jamais.

Une déclaration doit donc suffire à décider, seule, si l'on réutilise ce nom ou
si l'on en crée un autre. Six champs, et aucun n'est décoratif :

```
const Hauteur du plancher bas = {
   type: "mesure",
   unité: "m",
   description: "Hauteur du plancher bas du dernier niveau accessible au public, mesurée depuis le niveau du sol.",
   utilisation: "Entrée du classement en famille (article 3), et du désenfumage des locaux de grande surface selon l'IT 246.",
   déjà utilisé dans: [
      Classement du bâtiment (incendie.ref),
      Désenfumage des circulations (incendie.ref)
   ]
};
```

| champ | pourquoi il est obligatoire |
| --- | --- |
| **nom** | explicite, pas une abréviation : c'est lui qu'on cherchera |
| **type** | `mesure`, `texte`, `logique` — sinon on ne sait pas comparer |
| **unité** | une mesure sans unité n'est pas une mesure |
| **description** | ce que le nom **désigne**, exactement |
| **utilisation** | ce à quoi il **sert**, et selon quel texte |
| **déjà utilisé dans** | les fonctions qui l'emploient, et leurs fichiers |

Les trois premiers se **déduisent** des valeurs déjà versées ; les deux suivants
ne se déduisent de rien et se versent avec l'affirmation ; le dernier se
recalcule à chaque nouvelle utilisation. Ce qui manque porte, à sa place, un
`À DÉCRIRE —` suivi de la question à laquelle il faut répondre. Un champ absent
ne se voit pas ; une question posée se voit.

Ces déclarations vivent dans `Mémoire/variables-du-projet.ref`, à la racine — le
dictionnaire du projet. Il s'engendre depuis les autres fichiers : le verser en
ferait une seconde vérité, qui divergerait au premier versement.

**Ce qu'il ne dit pas :** ce qu'une variable *vaut*. Elle prend plusieurs valeurs
au fil d'une étude, et une définition qui en porterait une cesserait d'être vraie
au premier versement. La valeur du jour, le fichier qui la déclare et le compte
des usages relèvent de l'analyse : c'est l'écran `Atelier › Développements ›
Suivre les variables mutualisées`, et le survol d'un nom dans n'importe quel
fichier.

---

## Deux racines, et une arborescence courte

L'onglet **Fichiers** porte les deux matières du projet, et elles sont de même
nature : ce sont les **sources**, celles à partir desquelles il se reconstruit.
Les PDF ne suffisent pas — qui a dit, quand, qui assume sont aussi des sources,
et l'application les produit.

```
Mémoire/
   donnees-de-base.ddb    ce que le bâtiment est
   hypotheses.hyp         ce qu'on suppose en attendant mieux
   corpus.crp             ce qui est entré au dossier
   incendie.ref           les règles appliquées
   incendie.ctr           ce qui s'impose
   incendie.cst           ce qui a été constaté, à une date
   structure.ctr
Documents/
   … rangés comme l'utilisateur veut
```

**Ce qui est observé est transversal, ce qui est déduit est par domaine.** Une
mesure appartient au bâtiment, pas à une discipline : « nombre d'étages » sert
l'incendie, la structure et l'acoustique, et la dupliquer par domaine violerait
la règle 4. Une règle et une contrainte viennent d'un corpus, donc d'un domaine.
Un constat aussi : il observe un manquement **au regard d'une exigence**.

Pas de répertoire par domaine : trois fichiers ne méritent pas un dossier, et
`incendie.ref` à côté de `incendie.ctr` se lit comme `app.js` à côté de
`app.css`. Une quinzaine d'entrées pour un vrai projet.

## La zone est une facette, pas un répertoire

L'unité de production est le **domaine** : une étude incendie touche plusieurs
zones d'un coup. Avec la zone en répertoire, une seule étude se dispersait en
autant de fichiers, donc autant de groupes dans le diff, pour un seul acte.

La zone est une **facette**, pas un lieu. Dans les fichiers de **valeurs**, elle
ouvre une entrée du tableau d'une variable — voir « Une variable, un bloc, ses
valeurs par zone » —, et « Toutes zones » vient toujours en premier : ce qui vaut
partout se lit avant ce qui ne vaut qu'ici.

**Un `.ref` fait exception** : il ne se découpe pas par zone. Un raisonnement ne
s'applique pas « dans le bâtiment A », il s'applique — et la partie d'ouvrage
est un paramètre de la fonction. Voir « Une fonction est auto-portée ».

```
Classement du bâtiment = [
   Bâtiment A: "3e famille B" { … },
   Bâtiment B: "2e famille" { … }
];
```

Comparer le bâtiment A et le bâtiment B se fait donc **sur une seule ligne**, et
non en sautant d'une section à l'autre. Une affirmation qui vaut pour deux zones
ouvre les deux entrées : c'est la même, vue de deux endroits, avec le même
identifiant.

Une entrée copiée hors de son bloc perd son nom de variable — c'est le prix du
groupement, et il est acceptable : le diff transporte la zone dans le repère,
jamais dans le texte seul.

---

## Une extension par nature, et une forme par extension

Deux `incendie.mdall` à deux endroits de l'arborescence n'ont pas de sens, et
c'est dangereux : on ouvre l'un en croyant l'autre. Comme `app.html`, `app.css`
et `app.js` disent trois choses du même `app`, l'extension dit la nature — et
**chaque nature a sa forme**.

Chacune a sa page : [`extensions.md`](extensions.md) les prend une par une.

| extension | ce qu'elle contient | sa forme |
| --- | --- | --- |
| `.ref` | des règles | `fonction Sujet(entrées)` · `si (…)` · `alors (…);` · `texte:` · `parce que:` |
| `.ctr` | des contraintes | `Sujet = valeur` · `règle:` · `statut:` |
| `.ddb` | des données de base | `Sujet = valeur` · `document:` · `parce que:` |
| `.hyp` | des hypothèses | `Sujet = valeur` · `hypothèse:` · `statut: supposé` |
| `.cst` | des constats | `Sujet = valeur` · `le:` · `document:` · `parce que:` |
| `.crp` | le corpus | ce qui est entré au dossier |

`le:` est propre au constat, et indispensable à lui : « l'escalier n'était pas
encloisonné » — quand ? avant ou après la reprise ? Un constat sans date ne se
conteste ni ne se lève.

Un `.ref` ne porte **jamais** de statut : un référentiel n'a pas d'état dans un
projet, il est appliqué ou il ne l'est pas.

---

## Le diff est le fichier

Chaque champ comparé **est** une ligne du fichier, écrite dans la langue. Le
diff d'un `.ref` ressemble donc à un `.ref`, et celui d'un `.ctr` à un `.ctr` —
ce qui est la moindre des choses, puisque c'est le même fichier.

Les champs s'appelaient « Valeur », « Règle », « D'où », et le diff les rendait
tous sous la forme `Sujet = valeur`. Une règle s'y lisait exactement comme une
contrainte, et l'on ne voyait plus aucune règle.

**Le nom d'un champ est son identité, pas son rang.** Une condition se nomme par
son sujet : `si (Hauteur du plancher bas …)`. Deux conditions réordonnées ne
produisent donc aucun changement, et une condition ajoutée produit exactement
une ligne ajoutée.

---

## La réciprocité

```
lire(écrire(G)) = G
```

Chaque information du graphe apparaît **une fois** dans le texte, et rien de
déductible n'y apparaît. Un test le vérifie sur des blocs réels.

C'est cette loi qui autorise à dire que le texte **est** la mémoire, et pas une
vue de la mémoire. C'est elle aussi qui interdit d'ajouter au langage une
information qu'on ne saurait pas relire — et c'est elle qui permet au diff de
colorer une ligne en la relisant, plutôt que de transporter deux représentations
de la même ligne.

Ce qui n'est pas compris n'est jamais avalé en silence : la lecture rend la
ligne, son numéro et la raison du refus.

---

## Le graphe, sans en avoir l'air

`grapheDesBlocs()` tire du texte les producteurs, les liens et les **entrées** —
les sujets qu'aucune règle ne produit, et qu'il faudra donc demander ou relever.

`aRevoirSi("Hauteur du plancher bas du logement le plus haut")` répond alors à
la question qui fait tout l'intérêt d'une mémoire de projet :

> La hauteur passe de 26 à 28,40 m. Cela remet en cause le **classement du
> bâtiment**, et par lui la **colonne sèche**, la **circulation horizontale
> protégée**, le **type d'escalier** et le **désenfumage**.

---

## Où cela vit dans le code

| fichier | ce qu'il fait |
| --- | --- |
| `apps/web/js/services/memoire-en-texte.js` | écrit — graphe → texte |
| `apps/web/js/services/memoire-en-lecture.js` | lit — texte → graphe, et colore |
| `apps/web/js/services/memoire-rangement.js` | où un fichier vit, et sous quelle extension |
| `apps/web/js/services/incendie-en-texte.js` | branche l'utilitaire incendie sur le tout |
| `supabase/functions/incendie-habitation/conditions.js` | publie les conditions de la branche empruntée |
