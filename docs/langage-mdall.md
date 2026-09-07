# Le langage Mdall

Un langage de **traçabilité du raisonnement de projet**. Pas un langage de
règles : les règles ne sont qu'une des sources de raisonnement qu'un projet
capitalise, à côté des décisions, des relevés, des calculs et des hypothèses.

Il s'adresse à des contrôleurs techniques, des architectes, des maîtres
d'ouvrage, des conducteurs de travaux. Aucun de ses mots n'est emprunté à un
langage de programmation, et un test le vérifie.

---

## Les cinq objets, et pourquoi ils ne se mélangent pas

Une même ligne portait autrefois cinq choses de natures différentes. Les
séparer est tout l'intérêt de la version 3.

| l'objet | ce qu'il est | où il s'écrit |
| --- | --- | --- |
| la **donnée** | « Hauteur du plancher bas du logement le plus haut » | le sujet, en tête de ligne |
| la **valeur** | « 26 m » | après le `=` |
| la **règle** | `si … alors …` | un fichier de référentiel |
| la **preuve** | l'article, puis sa citation | `←` puis `parce que` |
| le **statut** | « retenu », « supposé » | `statut`, sur sa ligne |

---

## Les trois lois de lecture

1. **L'indentation est l'appartenance.** Une ligne indentée détaille la ligne
   pleine qui la précède. Trois espaces, jamais une tabulation : la largeur
   d'une tabulation dépend de qui la lit, et une mémoire qui se lit
   différemment selon l'écran n'est pas une mémoire.
2. **Un mot-clé ne compte qu'en tête de ligne**, après le retrait. « Habitation
   individuelle **ou** collective » est un sujet, pas une disjonction. C'est la
   seule subtilité de la grammaire, et elle règle le seul vrai piège.
3. **Une valeur textuelle porte des guillemets, une valeur mesurée n'en porte
   pas.** `= "3e famille B"` contre `= 26 m`. Sans cette différence, on ne
   saurait pas relire `= 3` : le chiffre trois, ou la catégorie « 3 » ?

---

## Les huit constructions

```
§ contraintes/incendie.mdall              le fichier
¶ écriture Mdall v3.0                     une note, jamais interprétée

Sujet = valeur                            une affirmation
Sujet = valeur @ bâtiment A               sa portée, quand ce n'est pas l'ouvrage entier
Sujet                                     une donnée, en tête d'une règle

   si Sujet ≤ 28 m                        une condition
   et Sujet = "collective"
   ou Sujet parmi "a" ou "b"
   non Sujet = "x"
   alors "3e famille B"                   ce que la règle pose
   sinon "3e famille A"
   sauf si Sujet = oui                    ce qui la borne

   ← texte      arrêté …, article 3, 3°)  d'où cela vient, typé
      parce que "citation exacte"         la preuve, sous sa provenance

   statut retenu                          l'état du raisonnement ici
```

### Les comparateurs

`=` `≠` `≤` `≥` `<` `>` `parmi` `renseigné` `non renseigné`

La lecture accepte aussi `<=`, `>=`, `!=`, `<>` : personne ne doit être refusé
pour une raison de clavier. L'écriture rend toujours le signe, parce que c'est
ce qu'on lit dans un CCTP.

### Les six provenances

Le **type de la provenance est l'origine de la valeur**. Rien à déclarer en
plus : une ligne qui renvoie à une règle est déduite, une ligne qui renvoie à un
plan est lue, une ligne qui renvoie à un calcul est calculée.

| type | ce qu'il dit |
| --- | --- |
| `texte` | un texte réglementaire, une norme, un DTU |
| `document` | une pièce du projet : plan, note, compte rendu |
| `calcul` | un calcul, avec ce qu'il a lu |
| `règle` | une règle d'un référentiel |
| `décision` | quelqu'un a tranché |
| `hypothèse` | on suppose, en attendant mieux |

Les deux dernières sont les seules qui ne se déduisent de rien d'autre, et les
seules qui engagent quelqu'un.

### Les sept statuts

`retenu` · `supposé` · `contesté` · `remplacé` · `écarté` · `sans objet` ·
`en attente`

Le statut n'est pas une propriété de la valeur, ni de la règle : c'est ce que
**ce projet** en fait aujourd'hui. La même règle donne « retenu » ici et
« contesté » là, sans que rien ne change dans le référentiel.

---

## Deux niveaux : la connaissance, et le projet

C'est le partage le plus important du langage.

### Un référentiel — ce que le texte exige

```
§ referentiels/incendie-habitation.mdall

Classement du bâtiment
   si Logements superposés = oui
   et Hauteur du plancher bas du logement le plus haut ≤ 28 m
   et Voie-échelles parmi "non conforme" ou "non décrite"
   alors "3e famille B"
   ← texte arrêté du 31 janvier 1986 modifié, article 3, 3°)
      parce que "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes."

Colonne sèche
   si Classement du bâtiment parmi "3e famille B" ou "4e famille"
   alors "exigée, une colonne sèche de 65 mm par escalier"
   ← texte arrêté du 31 janvier 1986 modifié, article 98, premier alinéa
      parce que "Les habitations de la 3ème famille B et de la 4ème famille doivent comporter une colonne sèche de 65 mm par escalier."
```

Aucune valeur de projet n'y figure. Ce fichier vaut pour mille bâtiments et ne
change que si l'arrêté change.

### Un projet — ce qu'il retient

```
§ contraintes/incendie.mdall

Classement du bâtiment = "3e famille B"
   ← règle Classement du bâtiment — arrêté du 31 janvier 1986 modifié, article 3, 3°)
   statut retenu

Colonne sèche = "exigée, une colonne sèche de 65 mm par escalier"
   ← règle Colonne sèche — arrêté du 31 janvier 1986 modifié, article 98, premier alinéa
   statut retenu
```

La règle n'est pas recopiée : on sait où elle est, on peut l'ouvrir, et elle ne
se réécrit pas à chaque projet.

**Pourquoi cela compte.** Tant que la règle vivait dans le fichier du projet,
elle était fabriquée à partir des valeurs conclues, et l'on écrivait `si Hauteur
du plancher bas = 26` là où l'arrêté dit `≤ 28 m`. Trois conséquences :

- une règle vraie d'un seul bâtiment ne capitalise rien ;
- le diff mentait dans les deux sens — il annonçait un changement de règle quand
  une cote du projet bougeait, et n'annonçait rien quand l'arrêté était modifié ;
- le graphe ne se reconstruisait pas depuis le texte.

---

## La réciprocité

```
lire(écrire(G)) = G
```

Chaque information du graphe apparaît **une fois** dans le texte, et rien de
déductible n'y apparaît. Un test le vérifie sur des blocs réels, dans
`memoire-en-lecture.test.mjs`.

C'est cette loi qui autorise à dire que le texte **est** la mémoire, et pas une
vue de la mémoire. C'est elle aussi qui interdit d'ajouter au langage une
information qu'on ne saurait pas relire.

Deux conséquences pratiques :

- **un architecte écrit à la main.** Trois lignes dans un éditeur, collées dans
  l'Atelier, et le projet retient une décision. La porte d'entrée la moins chère
  qui existe, et elle ne demande aucun utilitaire ;
- **les utilitaires n'écrivent que du mdall.** Si le texte est le format commun,
  un utilitaire nouveau n'a plus rien à brancher.

Ce qui n'est pas compris n'est jamais avalé en silence : la lecture rend la
ligne, son numéro et la raison du refus.

---

## Ce qui a disparu, et pourquoi

| disparu | remplacé par | la raison |
| --- | --- | --- |
| `dépend de A · B` | rien | la dépendance se déduit des conditions ; recopiée, elle diverge |
| `alors X ✓ retenu` | `statut retenu` | mélangeait la conséquence de la règle et l'état du projet |
| `⇐ calcul(…)` | `← calcul …` | un calcul est une provenance comme une autre |
| `on retient` / `on suppose` | `← décision` / `← hypothèse` | un geste n'est pas un préfixe, c'est une provenance |
| ligne « sans objet » | `statut sans objet` | la valeur doit rester : d'autres règles en dépendent |

Ce dernier point était un vrai défaut. « Voie-engins » concluait « non décrite »
**et** n'imposait rien ; l'écriture posait « sans objet » à la place de la
valeur, et le graphe se cassait — « Voie-échelles » dépend de « Voie-engins »,
dont le fichier ne disait plus rien.

---

## Le graphe, sans en avoir l'air

Pour le lecteur, c'est du texte. Pour Mdall, `grapheDesBlocs()` en tire les
producteurs, les liens et les **entrées** — les sujets qu'aucune règle ne
produit, et qu'il faudra donc demander ou relever.

`aRevoirSi("Hauteur du plancher bas du logement le plus haut")` répond alors à
la question qui fait tout l'intérêt d'une mémoire de projet :

> La hauteur passe de 26 à 28,40 m. Cela remet en cause le **classement du
> bâtiment**, et par lui la **colonne sèche**, la **circulation horizontale
> protégée**, le **type d'escalier** et le **désenfumage**.

Un corpus circulaire ne fait pas boucler : un sujet déjà vu ne se reparcourt pas.

---

## Où cela vit dans le code

| fichier | ce qu'il fait |
| --- | --- |
| `apps/web/js/services/memoire-en-texte.js` | écrit — graphe → texte |
| `apps/web/js/services/memoire-en-lecture.js` | lit — texte → graphe |
| `apps/web/js/services/incendie-en-texte.js` | branche l'utilitaire incendie sur les deux |
| `supabase/functions/incendie-habitation/conditions.js` | publie les conditions de la branche empruntée |
