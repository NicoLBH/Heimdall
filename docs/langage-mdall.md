# Le langage Mdall

Un langage de **traçabilité du raisonnement de projet**. Pas un langage de
règles : les règles ne sont qu'une des sources de raisonnement qu'un projet
capitalise, à côté des décisions, des relevés, des calculs et des hypothèses.

Il s'adresse à des contrôleurs techniques, des architectes, des maîtres
d'ouvrage, des conducteurs de travaux. Aucun de ses mots n'est emprunté à un
langage de programmation, et **tout se tape au clavier**.

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
fichier: escalier-b/incendie.ctr          le chemin du fichier
note: écriture Mdall v4.0                 une note, jamais interprétée

Sujet = valeur                            une affirmation
Sujet (entrée, entrée)                    la tête d'une règle, et ses entrées

   si Sujet <= 28 m                       une condition
   et Sujet = "collective"
   ou Sujet parmi "a" ou "b"
   non Sujet = "x"
   alors "3e famille B"                   ce que la règle pose
   sinon "3e famille A"
   sauf si Sujet = oui                    ce qui la borne

   le: 12 mars 2026                       quand — pour un constat
   texte: arrêté …, article 3, 3°)        d'où cela vient, typé par le mot-clé
      parce que: "citation exacte"        la preuve, sous sa provenance
   statut: retenu                         l'état du raisonnement ici
```

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
Classement du bâtiment (Habitation individuelle ou collective, Nombre d'étages retenu pour le classement)
   si Habitation individuelle ou collective = "collective"
   et Nombre d'étages retenu pour le classement <= 3
   alors "2e famille"
   texte: arrêté du 31 janvier 1986 modifié, article 3, 2°), quatrième tiret
      parce que: "habitations collectives comportant au plus trois étages sur rez-de-chaussée."
```

La parenthèse nomme les **entrées**, et c'est ce qui manquait le plus : on voit
d'un coup d'œil de quoi la règle a besoin sans lire ses conditions. Ce n'est pas
une concession à l'informatique — un article d'arrêté commence lui aussi par
dire de quoi il parle.

**Elle ne se stocke pas** : les entrées *sont* les sujets des conditions, et une
signature recopiée diverge le jour où quelqu'un ajoute une condition. Elle se
calcule à l'écriture.

Pas d'accolades, et pas de `retourne(…)` : l'indentation délimite déjà le bloc,
et `alors` dit déjà ce que la règle pose. Deux façons d'écrire la même chose
finissent par ne plus dire la même chose.

---

## L'arborescence part de la zone

Elle partait de la nature : `contraintes/incendie`, `donnees-de-base/structure`.
C'était logique pour qui range, pas pour qui cherche. Sur un chantier on ne dit
pas « les données de base de l'incendie, pour l'escalier B » : on dit
**« l'escalier B, l'incendie, ce qui a été relevé »**.

```
Escalier B/
   incendie.ref     les règles appliquées à cet escalier
   incendie.ddb     ce qui y a été relevé
   incendie.ctr     ce qui s'y impose
   incendie.hyp     ce qu'on y suppose
   incendie.cst     ce qui y a été constaté, à une date
Escalier A/
   incendie.ref     et ce ne sont pas les mêmes règles
Tout l'ouvrage/
   structure.ddb    ce qui vaut partout
```

Le gain est double : l'arborescence est **plus courte** — deux niveaux au lieu
de trois, la nature ayant migré dans l'extension — et tout ce qui concerne une
zone se lit d'un seul endroit.

Ce qu'on y perd : « montre-moi toutes les hypothèses du projet » demande la
recherche plutôt qu'un dossier. C'est le bon échange — la première question se
pose tous les jours, la seconde une fois par mois.

**Une affirmation qui vaut pour deux zones se lit dans les deux fichiers.** Ce
n'est pas une copie : c'est la même, vue de deux endroits, et elle porte le même
identifiant des deux côtés. L'alternative — un dossier « A + B » — la cacherait
à qui ouvre l'escalier A.

---

## Une extension par nature, et une forme par extension

Deux `incendie.mdall` à deux endroits de l'arborescence n'ont pas de sens, et
c'est dangereux : on ouvre l'un en croyant l'autre. Comme `app.html`, `app.css`
et `app.js` disent trois choses du même `app`, l'extension dit la nature — et
**chaque nature a sa forme**.

| extension | ce qu'elle contient | sa forme |
| --- | --- | --- |
| `.ref` | des règles | `Sujet (entrées)` · `si` · `alors` · `texte:` · `parce que:` |
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
son sujet : `si Hauteur du plancher bas`. Deux conditions réordonnées ne
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
