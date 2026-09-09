# Lire une variante

*Ce que l'écran d'une variante doit montrer, et pourquoi il ne le montre pas
encore. Écrit après un essai où l'auteur du projet a mal lu son propre écran.*

---

## Le défaut, et il est grave

Un essai à 80 m de profondeur hors gel a été fait sur un projet réel. Le calcul
a répondu juste : les douze massifs du bâtiment A basculent en défaut, le plus
sollicité à seize fois sa limite. L'écran l'a affiché. **Et il a été lu de
travers** — par la personne qui a conçu l'outil, qui savait exactement ce
qu'elle testait, et qui a conclu que les fondations n'avaient pas été
recalculées.

Ce n'est pas une inattention. C'est un défaut de l'écran, et il se nomme :

- **il montre le mécanisme, jamais la conclusion.** « Résultat du calcul des
  fondations superficielles : … 12 en défaut » est une ligne dans une liste. Ce
  que cela veut dire — *le projet ne tient plus sous cette hypothèse* — n'est
  écrit nulle part ;
- **il aplatit la chaîne.** Altitude, profondeur hors gel, fondations
  s'affichaient l'une sous l'autre, du même poids, sans qu'on voie que la
  deuxième découle de la première et la troisième de la deuxième. Le lien de
  cause est l'information principale, et c'était la seule qui manquait ;
- **il colorait en vert une mauvaise nouvelle.** « 12 vérifiées → 12 en
  défaut » s'écrivait en vert, parce que le vert marquait « la valeur nouvelle »
  et non « la bonne nouvelle ». La couleur disait le contraire du mot ;
- **il alertait à vide.** Un rang ambre « À revérifier », avec son triangle,
  s'affichait au-dessus d'une phrase disant qu'il n'y avait rien à revérifier.
  Une alarme qui rassure apprend à ne plus la regarder.

Le calcul, lui, fonctionne. Un second essai le montre de bout en bout :
altitude 13,22 m → 800 m, la profondeur hors gel passe de 0,47 m à 0,66 m par
`deduction_profondeur_hors_gel_altitude_V1`, la zone de neige est relue et ne
bouge pas, puis `dimensionnement_fondations_superficielles_V1` redescend dix
massifs de six centimètres. **Tout le problème est de le faire voir.**

---

## Ce qui est livré

Trois choses, toutes vérifiées sur les deux exports réels.

**Le tableau est ouvert.** Une fonction native ne rend pas une valeur mais douze
massifs, et sa phrase peut mentir par omission : « 12 vérifiées » avant comme
après, alors que dix arases ont bougé. Replié, ce détail se lisait comme une
option ; il est ce qu'on est venu voir. Il s'ouvre dès qu'une ligne bouge, et
reste fermé quand il n'a rien à dire.

**La colonne passe avant la ligne.** Dix massifs qui descendent tous de six
centimètres, ce n'est pas dix informations : c'en est une. Ce qui change à
l'identique partout se dit une fois, en tête ; les lignes ne portent plus que ce
qui leur est propre ; celles qui n'ont plus rien à ajouter sont comptées et
nommées. Sur l'essai à 800 m, on passe de dix lignes identiques à ceci :

```
▾ 10 lignes du tableau ont bougé sur 12
    arase supérieure  -0,10 m → -0,16 m     sur 10 lignes
    Portique courant file A   ratio déterminant 0,888 → 0,846
    Portique courant file B   ratio déterminant 0,929 → 0,890
    …
    1 ligne ne change que par ce qui précède : semelle 12.
    2 lignes n'ont pas bougé : Semelle 1, Semelle 2.
```

**La couleur ne ment plus.** Le vert quitte la valeur d'après : rien dans le
code ne sait si une valeur nouvelle est une bonne nouvelle. Il reste où il veut
dire quelque chose — une réserve qui se lève. L'ambre reste où il alerte
vraiment, et le rang « À revérifier » ne s'habille en alerte que s'il a quelque
chose à signaler.

---

## Ce qui manque — par rangs de lecture

L'ordre compte : **la conclusion, puis la chaîne, puis le détail.** Aujourd'hui
l'écran commence par le détail.

### Rang 0 — la phrase de tête

Une carte, en haut, dans la couleur de son verdict, qui dit en une phrase ce que
la variante fait au projet. Sur les deux essais réels :

> **Le projet ne tient plus.** Avec une profondeur hors gel de 80 m au lieu de
> 0,466 m, les 12 massifs du bâtiment A passent en défaut. Le plus sollicité
> atteint 16,05 fois sa limite. Une valeur du projet a été recalculée, aucune
> n'est restée en suspens.

> **Le projet tient.** Avec une altitude de 800 m au lieu de 13,22 m, la
> profondeur hors gel passe à 0,66 m et 10 massifs sur 12 descendent de 6 cm.
> Les 12 restent vérifiés ; la marge la plus faible passe de 0,978 à 0,925.

**Chaque nombre de ces phrases vient du calcul, aucun n'est produit par
l'écran.** C'est la seule règle qui compte ici : la phrase assemble, elle ne
conclut pas à la place des utilitaires. Le matériau existe déjà — nombre de
valeurs qui bougent, verdicts qui basculent, pire ratio — sauf le mot « limite »,
qui demande que l'utilitaire dise ce qu'est sa colonne de marge (voir plus bas).

### Rang 1 — la cascade, pas la liste

Ce qui aurait évité la mélecture. La profondeur indentée dit le rang de
propagation ; l'utilitaire qui a recalculé est au bout de la ligne, pas en
dessous.

```
Altitude du site                 13,22 m → 800 m       ce que vous essayez
 ├── Profondeur hors gel           0,47 m → 0,66 m     deduction_profondeur_hors_gel_altitude_V1
 │    └── Résultat des fondations  assise 0,60 → 0,66 m   ·  12 vérifiées → 12 vérifiées
 └── Zone de neige                 A1 → A1  (relue, sans changement)
```

L'information est disponible : `lecturesDeLaRegle`, `sortiesDeLaFonction` et le
`lit` de chaque utilitaire donnent déjà les arêtes, et l'ordre du rejeu suit
déjà la chaîne. Il ne manque que le rang et le trait.

### Rang 2 — l'écart, pas seulement les deux valeurs

`0,978 → 0,925` demande une soustraction mentale ; `0,978 → 0,925 (−5 %)` ne la
demande pas. Sur une colonne dont l'utilitaire déclare l'unité — `structure` la
donne déjà : `{nom: "arase supérieure", type: "nombre, en m"}` — l'écart se
calcule et s'écrit : `−0,06 m`. Sur une colonne sans unité, rien : mieux vaut
pas d'écart qu'un écart faux.

### Rang 3 — dire pourquoi une ligne n'a pas bougé

Sur l'essai à 800 m, **Semelle 1 et Semelle 2 n'ont pas bougé**, et c'est une
information de premier ordre : elles étaient déjà assez profondes. La phrase
existe dans les données :

> Semelle 1 et Semelle 2 n'ont pas bougé : leur assise est à −1,10 m, déjà plus
> bas que les 0,66 m exigés.

`arase supérieure` + `hauteur` donnent l'assise ; l'assise exigée est dans la
phrase du résultat. Rien à inventer, seulement à écrire.

### Rang 4 — une coupe, dessinée à partir des cotes

Un schéma vaut ici tout le tableau : le terrain naturel, la cote hors gel avant
et après en deux traits, et les massifs à leur profondeur, ceux qui remontent
au-dessus du trait marqués. Sur l'essai à 80 m, on verrait immédiatement que les
massifs sont à −79 m et que la ligne de gel est à −80 m.

**Dessiné à partir des cotes, jamais d'un modèle.** Un schéma produit par une
machine à texte serait une image de calcul, ce que Mdall refuse par principe.

### Rang 5 — ce qu'on fait de la variante

« Lire la mémoire avec cette variante » est la sortie d'un spike, pas d'un
produit. Ce que l'on veut à la fin d'une décision :

- **en faire une proposition** — c'est le § 4 du carnet, et c'est le chemin
  normal : Copilote → Atelier → Proposition → Mémoire. Une variante ne se verse
  jamais directement, mais elle peut ouvrir la proposition toute remplie ;
- **comparer deux variantes** — 0,466 m, 4 m, 80 m côte à côte, une colonne
  chacune. Reporté, comme convenu ;
- **emporter** — déjà là, et c'est ce qui a permis d'écrire ce document.

---

## Sur l'idée d'un LLM en fin de chaîne

Elle est juste, à une condition qui n'est pas négociable.

**Ce qu'un modèle peut faire ici :** redire en français ce que le calcul a
établi, avec le cadrage métier du lecteur — « une profondeur hors gel de 80 m
n'existe pas en France ; à cette cote vos massifs sont hors de tout domaine
d'emploi de la NF P94-261 ». C'est une **lecture**, pas un versement : rien
n'entre en mémoire, la règle 1 est respectée.

**Ce qu'il ne doit jamais faire :** produire un nombre, un verdict, ou un
schéma. Un chiffre dans Mdall se remonte à l'utilitaire qui l'a calculé et à la
version de sa loi. Un chiffre qui viendrait d'un modèle serait indiscernable des
autres à l'écran et détruirait la seule promesse du produit. La contrainte
technique qui en découle : **on lui donne les faits calculés, et il n'a le droit
que de les redire.** Ce qu'il rend est du texte, marqué comme tel à l'écran.

**Dans quel ordre.** La phrase de tête du rang 0 se calcule, elle. Elle est
disponible hors ligne, sans latence, sans coût, et elle est vraie par
construction. C'est elle qu'il faut écrire d'abord — elle porte l'essentiel de
la valeur. Le modèle vient **après**, sur cette phrase, pour l'étoffer.

**Où il tourne.** Au serveur, jamais dans le navigateur — l'orchestration ne se
montre pas. Et une synthèse de variante reste privée à qui la demande, comme les
conversations avec le copilote.

---

## Ce que cela demande aux utilitaires

Deux ajouts à `payload.structure`, tous deux additifs :

**Le sens des valeurs énumérées.** Aujourd'hui :
`{nom: "vérification", valeurs: ["vérifiée", "en défaut", "non calculée"]}`.
L'écran ne peut pas savoir que « en défaut » est mauvais sans le coder en dur,
c'est-à-dire sans savoir qu'il parle de fondations. Demain :
`valeurs: [{nom: "vérifiée", sens: "tenu"}, {nom: "en défaut", sens: "rompu"},
{nom: "non calculée", sens: "inconnu"}]`. C'est ce qui autorise la couleur, le
verdict de tête, et le compte des bascules — pour n'importe quel utilitaire, y
compris ceux qui n'existent pas encore.

**La colonne de marge et son seuil.** `{nom: "ratio déterminant", type: "nombre",
marge: {limite: 1, sens: "au plus"}}` permet d'écrire « 16 fois sa limite » et
de classer les massifs par ce qui les rapproche du bord. Sans cela, `16,050` est
un nombre sans échelle.
