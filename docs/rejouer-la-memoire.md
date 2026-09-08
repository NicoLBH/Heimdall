# Rejouer la mémoire

**À quoi sert cette page :** Mdall promet de rendre le raisonnement visible, et
de dire ce qu'un changement entraîne. Tant qu'on ne sait pas **rejouer** le
raisonnement, cette promesse tient à la parole de celui qui la fait. Cette page
dit ce qui existe aujourd'hui, ce qui manque, et dans quel ordre le construire.

Elle a été écrite en vérifiant le code, pas de mémoire. Chaque affirmation de
l'état des lieux est vérifiable en ouvrant le fichier cité.

---

## L'état des lieux, vérifié

### Ce qui existe

| ce qui existe | où | ce que ça donne |
| --- | --- | --- |
| Les conditions de chaque règle appliquée | `payload.regle.conditions` | le **texte** de ce que la règle a testé |
| La déclaration des entrées d'une fonction | `ligneDImport` dans `memoire-en-texte.js` | où la fonction va lire — le bon crochet, inexploité |
| Des arêtes reconstruites à la lecture | `dependancesDeLaMemoire()` | un graphe déduit **par nom**, zone par zone |
| La remontée d'une chaîne | `chaineDuRaisonnement()` | l'amont **d'un sujet**, et son schéma |
| Une table de dépendances | `assertion_dependencies` | `assertion_id → depends_on_assertion_id`, qui nourrit le drapeau « à revérifier » |
| Un index des variables | `variablesDeLaMemoire()` | qui déclare et qui cite chaque nom, **dédupliqué** |

### Ce qui n'existe pas

**Aucun enregistrement à la source.** Le graphe est reconstitué *par nom*
(`cleDuSujet`) à chaque lecture. Un sujet renommé, une faute de frappe, et le
lien disparaît sans bruit. La table qui pourrait porter la vérité n'est remplie
que par une déclaration manuelle que plus personne ne fait — c'est pourquoi le
formulaire a été retiré.

**Aucun compte.** `unique (assertion_id, depends_on_assertion_id)` interdit
littéralement d'écrire « employée trois fois ». Et `variablesDeLaMemoire`
déduplique : « 4 usages » veut dire quatre **fonctions**, pas quatre emplois.

**Aucun ordre.** Il n'y a pas un seul tri topologique dans le dépôt.
`chaineDuRaisonnement` ordonne l'amont d'un nœud ; rien n'ordonne l'ensemble.

**Aucun évaluateur.** `OPERATEUR` ne sert qu'à **écrire** et à **colorer** du
texte. Rien n'évalue `si Hauteur du plancher bas ≤ 28 m`. Le seul moteur du
dépôt est `supabase/functions/incendie-habitation/moteur.js`, écrit à la main
pour un domaine.

**Aucun index sur les données de base.** Ce qui a été fait pour
`variables-du-projet.ref` — savoir qui emploie chaque nom — n'a pas été fait
pour `données-de-base.ddb`.

> Une règle en mémoire est **l'instantané d'une exécution passée**, pas un
> programme. On sait la lire, la dessiner, la remonter. On ne sait pas la
> rejouer.

---

## Le recadrage : on ne rejoue pas la mémoire, on rejoue le calque dérivé

« Rejouer la mémoire en entier » est la mauvaise cible.

La mémoire contient des **constats**, des **décisions**, des **arbitrages**, des
documents. Ils ne se rejouent pas : ils ont eu lieu. Les rejouer voudrait dire
re-décider ce que des gens ont décidé.

Ce qui se rejoue, c'est le **calque dérivé** : le sous-graphe des affirmations
qu'une règle ou un utilitaire a produites à partir d'autres affirmations. C'est
un ensemble fermé, fini, et le seul où le mot « rejouer » a un sens.

La cible est donc : **rendre le calque dérivé recalculable, et rendre sa
frontière visible.** Tout le reste est un point fixe — une entrée, ou une
décision. Ce recadrage rend le problème fini : au lieu de « 460 emplois, dans
quel ordre ? », la question devient « quel est le sous-graphe dérivé, est-ce un
graphe sans cycle, et chaque nœud est-il réévaluable depuis ses parents ? ».

### Les trois natures de nœud

| nature | ce que c'est | ce qu'on en fait |
| --- | --- | --- |
| **Socle** | donnée de base, hypothèse, constat, décision | on le **change** ; il ne se recalcule pas |
| **Dérivé rejouable** | une règle Mdall ou un utilitaire déterministe dont on a le code **et** les entrées | il se **recalcule** |
| **Dérivé opaque** | le référentiel serveur, une extraction PDF, un jugement | on sait qu'il **dépend** ; on ne sait pas le refaire — **nommé, jamais recalculé** |

La troisième catégorie est de plein droit, pas une exception : elle ne
disparaîtra jamais. Son compte est la mesure honnête de la promesse —
« sur 460 nœuds dérivés, 380 sont rejouables, 80 ne le sont pas, les voici » —
et ce chiffre s'affiche.

---

## Les six étapes

### 1. Enregistrer l'application, pas sa description — *fait*

Aujourd'hui on stocke la *description* d'un appel. Il faut stocker l'**appel** :

```
règle (nom + version) · zone · quand · par quel versement
  entrées : [{ sujet, assertion_id, valeur, rang }]
  sortie  :  { sujet, assertion_id, valeur }
```

#### Ce que « enregistré » veut dire, exactement

Une précision qu'il a fallu faire en écrivant l'étape, et qui corrige la
première formulation de ce document.

Le moteur qui applique les règles **ne travaille pas sur la mémoire** : il
travaille sur un questionnaire, et il rend des conditions portant des **noms**
(`supabase/functions/incendie-habitation/conditions.js`). Il n'a donc aucun
identifiant à nous donner, et cette étape ne prétend pas le contraire.

Ce qui change est ailleurs, et c'est l'essentiel : le nom est résolu **une fois,
au moment du versement**, contre la mémoire contemporaine de la règle — les
valeurs qu'elle a réellement vues —, puis conservé. Après quoi il ne bouge plus.
Une lecture faite en mars continue de désigner ce que mars affirmait, même si le
sujet est renommé en juin, même si la valeur est remplacée en juillet.

C'est exactement la sémantique que `assertion_dependencies` documente déjà :
*« la note repose sur la valeur A2 telle qu'elle était affirmée le 12 août »*.

#### Ce que cela donne

Une arête par identifiant, **rangée** et **zonée**, donne d'un coup le **compte**
(comptez les lignes), le **sens**, l'**ordre**, et **qui emploie chaque donnée de
base** — la même requête prise par l'autre bout.

Une **table nouvelle**, `assertion_applications`, pas un élargissement de
`assertion_dependencies` : son unicité empêche le comptage, et son rôle actuel —
nourrir le drapeau « à revérifier » — reste bon. Une table de plus est
strictement additive ; élargir une contrainte d'unicité ne l'est pas.

Une lecture dont le nom ne désigne rien s'écrit quand même, avec un
`input_assertion_id` nul : c'est le **trou du raisonnement**, et il se compte
comme le reste. Ne rien écrire le ferait disparaître.

#### Les deux résolutions, qui ne se valent pas

| `resolution` | quand | ce que ça vaut |
| --- | --- | --- |
| `enregistre` | au versement | résolu contre la mémoire que la règle a vue ; survit à un renommage |
| `reconstruit` | après coup | résolu contre la mémoire d'aujourd'hui ; une approximation, et l'écran le dit |

La reconstruction — *Mémoire › Verser › Reconstruire les liens du raisonnement* —
rattrape tout ce qui a été versé avant la table. Elle **ne touche jamais** une
lecture enregistrée en son temps : un lien figé contre la mémoire d'alors vaut
mieux qu'un rapprochement de noms fait aujourd'hui.

Les liens de dépendance suivent la même hiérarchie : `listAssertionDependencies`
sert d'abord les lectures enregistrées, et ne déduit par nom que pour les
affirmations qui n'en ont pas. Le graphe déduit **recule** à mesure qu'on
enregistre.

#### Ce que cette étape ne couvre pas encore

Les contraintes déduites par un **utilitaire** — zone de neige, profondeur hors
gel — lisent des faits de contexte, pas des affirmations : leurs entrées n'ont
pas d'identifiant à citer. La colonne `utility` et l'`input_assertion_id`
nullable leur laissent la place, et rien n'aura à changer ici le jour où l'outil
climatique nommera ses sources. En attendant, une donnée de base employée
*uniquement* par un utilitaire n'apparaît pas encore dans le compte — celles que
les règles citent, si.

### 2. L'index dans les deux sens

`données-de-base.ddb` gagne sa colonne **« employée par »** : le compte exact,
les fonctions, les zones, un lien vers chacune. `variables-du-projet.ref` gagne
le compte exact au lieu du nombre de fonctions.

Premier bénéfice visible, et il ne demande pas d'évaluateur.

### 3. L'évaluateur du `.ref`

Sans lui, rien de ce qui précède ne rejoue quoi que ce soit.

Le langage a un vocabulaire fermé — `OPERATEUR`, `MOTS`, `si/alors/sinon/sauf`,
`importe`, `enregistre`. Un interpréteur de ce vocabulaire est un travail borné,
entièrement testable, et qui a une propriété rare : il se **vérifie contre
l'existant** (étape 5).

Une exigence non négociable : l'évaluateur ne donne à une règle **que ses entrées
déclarées**. Une règle qui lit ce qu'elle n'a pas déclaré échoue bruyamment au
lieu de diverger en silence. C'est ainsi qu'on **gagne** le droit d'écrire
« rejouable ».

### 4. Le plan de recalcul, en strates

Le sous-graphe dérivé, trié topologiquement, montré non comme une liste de 460
étapes — illisible — mais comme des **niveaux** : strate 1, ce qui ne dépend que
du socle ; strate 2, ce qui dépend de la strate 1 ; et ainsi de suite. Un projet
à 460 nœuds a peut-être 8 strates. « La plus longue chaîne fait 8 pas » se
comprend ; 460 lignes, non.

Ce plan se **dérive**, il ne se stocke pas — *ce qui est dérivé se recalcule*. Un
ordre tenu à la main divergerait dès la règle suivante. Pour la même raison, pas
de septième extension : les fichiers sont ce que les gens écrivent et lisent ;
ceci est une vue.

### 5. Le rejeu à blanc

Rejouer tout le calque dérivé depuis le socle **actuel**, sans rien écrire, et
comparer chaque sortie à ce que la mémoire tient. Trois issues par nœud :
**identique** · **différent** · **non rejouable**.

C'est le cœur du chantier, et il vaut par lui-même :

> Un rejeu à blanc sur des entrées inchangées qui produit une différence est un
> **défaut de la mémoire**. Il dit que ce que le projet affirme n'est plus ce que
> ses propres règles concluent.

Une règle a changé de version, une entrée a bougé sans que l'aval suive,
quelqu'un a corrigé une valeur à la main. Aujourd'hui, personne ne peut le
savoir. C'est la question pour laquelle le produit existe, et elle mérite d'être
posée même si les variantes ne sortent jamais.

C'est aussi le banc d'essai de l'évaluateur : chaque écart est soit un défaut de
l'évaluateur, soit une dérive de la mémoire. On ne peut pas rêver mieux.

### 6. La variante, enfin triviale

On change un nœud du socle, on rejoue les strates en aval, on affiche le diff. Le
mécanisme est déjà écrit et déjà éprouvé sur le cas dont on connaît la réponse.

Et la variante n'est alors qu'**un** des usages du moteur, pas le plus précieux :

- **L'audit permanent** de la mémoire (étape 5) ;
- **L'étude d'impact** — « qu'est-ce qui casse si cette valeur bouge ? » —, qui
  est la vraie question qu'un ingénieur pose ;
- **La variante** — « et si ? ».

Trois usages pour un moteur : c'est ce qui justifie de le construire pour de bon
plutôt que de rejouer deux formules à la main.

---

## Les pièges, nommés d'avance

**Les cycles.** Un graphe écrit par des humains en contiendra un. Le détecter, le
nommer, refuser de rejouer cette composante. Un cycle est une erreur de modèle à
montrer, pas une boucle infinie.

**Les zones.** Une arête est *par zone*. La même règle appliquée à trois zones,
ce sont trois appels. Compter « 460 emplois » sans les zones ne voudrait rien
dire.

**Le temps.** Une règle appliquée en mars n'est pas la règle d'aujourd'hui. Le
rejeu utilise les règles **d'aujourd'hui** ; la mémoire tient celles **du jour**.
L'écart entre les deux est une information — le `V1`/`V2` des utilitaires,
étendu à tout le graphe. Il s'affiche, il ne se lisse pas.

**Les entrées cachées.** Une règle qui lit ce qu'elle n'a pas déclaré fait
diverger le rejeu en silence. D'où le bac à sable de l'étape 3.

**Le coût.** 460 nœuds ne sont rien. 460 nœuds × un référentiel serveur × N zones
peuvent faire des minutes. Les strates donnent le parallélisme — et les nœuds
coûteux sont justement les opaques, ce qui est une raison de plus de les nommer.

---

## Ce que l'écran montre, à chaque étape

Le bouton **éprouvette › Tester** de la Mémoire porte les trois usages du moteur.
Ils s'allument à mesure que le plan avance.

| usage | s'allume à | ce qu'il fera |
| --- | --- | --- |
| **Tester une variante** | déjà là, honnête à l'étape 2 | changer une valeur du socle, voir les conséquences, ne rien écrire |
| **Auditer la mémoire** | étape 5 | rejouer à blanc, et dire ce qui a dérivé |
| **Étude d'impact** | étape 2 | « qu'est-ce qui repose sur cette valeur ? », avec le compte exact |

Un item qui n'est pas encore servi par le moteur est **désactivé et dit son
étape**. Un bouton qui prétend faire ce qu'il ne fait pas coûte plus cher que
l'absence du bouton.

---

## L'état d'aujourd'hui, sans complaisance

La variante livrée rejoue **deux formules** réécrites à la main dans une table de
correspondance (`RELECTURES`, dans `variante-altitude.js`). Ce n'est pas un
mécanisme : c'est une démonstration sur deux cas, encadrée de garde-fous
précisément parce qu'elle ne généralise pas.

Cette table doit **disparaître** à l'étape 3, au lieu de s'allonger d'un cas à
chaque projet. C'est elle, la poudre aux yeux.
