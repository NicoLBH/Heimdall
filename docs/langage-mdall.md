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

---

## Les cinq objets, et pourquoi ils ne se mélangent pas

| l'objet | ce qu'il est | où il s'écrit |
| --- | --- | --- |
| la **donnée** | « Hauteur du plancher bas du logement le plus haut » | le sujet, en tête de ligne |
| la **valeur** | « 26 m » | après le `=` |
| la **règle** | `si … alors …` | un fichier `.ref` |
| la **preuve** | la provenance, puis sa citation | `texte:` puis `parce que:` |
| le **statut** | « retenu », « supposé » | `statut:`, sur sa ligne |

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
note: écriture Mdall v4.0                 une note, jamais interprétée

zone: Bâtiment A {                        une section de portée

   Sujet = valeur {                       une affirmation
      le: 12 mars 2026                    quand — pour un constat
      texte: arrêté …, article 3, 3°)     d'où cela vient, typé par le mot-clé
         parce que: "citation exacte"     la preuve, sous sa provenance
      statut: retenu                      l'état du raisonnement ici
   }

   fonction Sujet(entrée, entrée) {       la tête d'une règle, et ses entrées
      soit texte = "…";                   d'où elle sort, déclaré en tête
      soit parce que = "…";               la citation qui la fonde
      // un commentaire, jamais interprété
      si (Sujet <= 28 m)                  une condition
      et (Sujet = "collective")
      ou (Sujet parmi "a" ou "b")
      non (Sujet = "x")
      alors ("3e famille B");             ce que la règle pose
      sinon ("3e famille A");
      sauf si (Sujet = oui)               ce qui la borne
   }

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

## Une règle se lit comme une fonction

```
fonction Classement du bâtiment(Habitation individuelle ou collective, Nombre d'étages retenu pour le classement) {
   soit texte = "arrêté du 31 janvier 1986 modifié, article 3, 2°), quatrième tiret";
   soit parce que = "habitations collectives comportant au plus trois étages sur rez-de-chaussée.";

   si (Habitation individuelle ou collective = "collective")
   et (Nombre d'étages retenu pour le classement <= 3)
   alors ("2e famille");
}
```

**Ce qui fonde la règle se déclare en tête**, comme les `const` d'une fonction :
`soit texte = …` porte la provenance, `soit parce que = …` la citation, et le
nom de la locale **est** le type de provenance. En bas, après la conclusion, on
ne les cherchait plus.

**Les commentaires** s'écrivent `// …` ou `/* … */`, et se lisent en gris. Ils
ne posent rien : dire *pourquoi* une condition existe est autre chose que dire
ce qu'elle teste, et une règle de quinze lignes en a besoin.

**Un `.ref` est le seul fichier qui s'exécute**, et sa ponctuation le dit : une
parenthèse par clause, un point-virgule sur ce que la règle pose. Trois
conditions enchaînées sans bornes ne se relisent déjà pas ; elles ne se
parseraient pas du tout. Les autres fichiers n'en portent pas : un `.ctr` énonce
des paires, il n'a pas de clause à borner.

La ponctuation rend la règle exécutable, elle ne la rend pas obligatoire : un
fichier tapé à la main sans parenthèses se lit exactement pareil.

La parenthèse nomme les **entrées**, et c'est ce qui manquait le plus : on voit
d'un coup d'œil de quoi la règle a besoin sans lire ses conditions. Ce n'est pas
une concession à l'informatique — un article d'arrêté commence lui aussi par
dire de quoi il parle.

**Elle ne se stocke pas** : les entrées *sont* les sujets des conditions, et une
signature recopiée diverge le jour où quelqu'un ajoute une condition. Elle se
calcule à l'écriture.

Les accolades bornent la règle : on voit où elle commence et où elle finit,
même sur un écran où l'indentation se perd. Mais pas de `retourne(…)` :
`alors` dit déjà ce que la règle pose, et deux façons d'écrire la même chose
finissent par ne plus dire la même chose.

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

## La zone est une section, pas un répertoire

L'unité de production est le **domaine** : une étude incendie touche plusieurs
zones d'un coup. Avec la zone en répertoire, une seule étude se dispersait en
autant de fichiers, donc autant de groupes dans le diff, pour un seul acte.

La zone est une **facette**, pas un lieu. Elle ouvre une section dans le
fichier, et « Toutes zones » vient toujours en premier : ce qui vaut partout se
lit avant ce qui ne vaut qu'ici.

```
zone: Toutes zones {
   Champ d'application de l'arrêté (Hauteur du plancher bas) { … }
}

zone: Bâtiment A {
   Classement du bâtiment (Habitation individuelle ou collective, Nombre d'étages) { … }
}
```

Comparer le bâtiment A et le bâtiment B se fait donc dans un seul fichier. Une
affirmation qui vaut pour deux zones ouvre les deux sections : c'est la même,
vue de deux endroits, avec le même identifiant.

Le risque, qu'il faut connaître : `zone:` est un séparateur **à état**, donc un
bloc copié hors de son contexte perd sa zone. C'est acceptable parce que le diff
transporte la zone dans le repère, jamais dans le texte seul.

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
