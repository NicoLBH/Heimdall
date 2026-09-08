# À traiter plus tard

**À quoi sert cette page :** un chantier qu'on repousse et qu'on n'écrit pas
revient sous forme de surprise. Ce carnet garde ceux qu'on a **vus, compris et
décidé de ne pas faire maintenant** — avec la raison, ce qu'ils débloqueraient,
et ce qui se passe si on les laisse.

Il ne remplace pas le plan : [`rejouer-la-memoire.md`](rejouer-la-memoire.md)
porte une suite d'étapes qu'on fait. Ici, ce sont des sujets **à côté** de cette
suite.

Une ligne quitte cette page quand elle est faite, ou quand on décide qu'elle ne
se fera pas — et alors on écrit pourquoi.

---

## 1. Les utilitaires nommeront leurs sources — *fait*

**État :** fait, pour les outils climatiques · **Reste :** les utilitaires qui
lisent une API ou un document, et les entrées que la mémoire ne porte pas.

### Le problème, tel qu'il était

Une règle Mdall dit ce qu'elle lit : ses conditions portent des sujets, et depuis
l'étape 1 chaque lecture est enregistrée avec l'affirmation qu'elle désignait. Un
**utilitaire**, non.

`deduction_profondeur_hors_gel_altitude_V1` lit un *fait de contexte* —
`fact_value.inputs.altitude` — produit par `resolve-climate-tool` au serveur. La
contrainte qui en sortait gardait l'altitude **comme un nombre**, et rien dans ce
nombre ne disait qu'il venait de la donnée de base que le projet a versée.

Trois conséquences, et elles gangrenaient le reste : une donnée employée
uniquement par un utilitaire comptait « aucun emploi » ; l'étude d'impact disait
« rien ne repose sur l'altitude » à un projet dont la moitié des fondations en
dépendait ; et une altitude corrigée laissait la cote hors gel derrière elle, sans
un mot.

### Ce qui a été fait : l'utilitaire déclare ce qu'il lit

Une correction à ce qui était écrit ici. On proposait que le producteur écrive
`sources: { altitude: "<assertion_id>" }` à côté du nombre. **Ce n'était pas
faisable, et pour une raison de fond** : `resolve-climate-tool` ne voit jamais
d'affirmation. Il reçoit une adresse et une altitude depuis le navigateur, et la
donnée de base « Altitude du site » est versée *après lui*, depuis le même
résultat. Il n'a aucun identifiant à citer, et l'appelant n'en a pas non plus au
moment où il appelle.

Ce qui est faisable, et qui est fait : **l'utilitaire déclare ses entrées par
sujet**, dans son propre fichier et sous sa version.

```js
lit: [
  { sujet: "H0 retenu pour le département", lire: (fait) => fait?.fact_value?.h0_selected_m },
  { sujet: "Altitude du site", lire: (fait) => fait?.fact_value?.inputs?.altitude }
]
```

Ce n'est pas un rapprochement de noms fait après coup — c'est exactement ce que
fait une règle `.ref` quand elle écrit `sujet: "Profondeur hors gel"` dans une
condition. Elle ne cite pas d'identifiant non plus : elle **nomme un sujet**, et
le versement le résout une fois pour toutes, dans la zone, avec son rang. Les
lectures d'un utilitaire empruntent le même chemin et la même table.

À partir de là, tout est retombé dans le chemin commun sans que rien d'autre
change : l'index dans les deux sens, l'étude d'impact, le plan de recalcul et la
variante voient ce chemin. La colonne `utility` et l'`input_assertion_id` nullable
de `assertion_applications` avaient été posées pour ça.

Et une chose est apparue par-dessus le marché, qu'on n'avait pas prévue : l'audit
sait dire **« calculé sur une valeur qui a changé »**. La contrainte garde
l'altitude sur laquelle elle a été calculée ; le projet en affirme une autre ; on
ne recalcule pas — la table est au serveur — mais on dit que la valeur affichée ne
vaut plus. C'était le défaut le plus dangereux : une valeur d'apparence normale
dont l'entrée a bougé sous elle.

### Ce qui a été fait ensuite : les utilitaires se rejouent

Le carnet disait ici que rejouer un utilitaire était « un chantier serveur », et
que deux lois resteraient en dur dans le navigateur en attendant. **C'était une
mauvaise réponse**, et elle vidait la variante de son intérêt : sur un projet dont
le raisonnement passe surtout par des utilitaires, essayer une altitude ne rendait
que des noms « à revérifier », et il fallait recalculer à la main ce que l'outil
existe pour calculer.

Il manquait une chose, et une seule : le droit de **calculer sans écrire**. Sans
lui, il n'y avait que deux issues, toutes deux mauvaises — appeler l'outil et
écrire le fait de contexte, et une valeur essayée entrerait dans le projet sans
que personne l'ait décidée ; ou recopier la loi dans le navigateur, jusqu'à ce que
les deux copies divergent.

`resolve-climate-tool` accepte donc `dry_run`. Même table, même version, même loi ;
rien n'entre nulle part. Il rend en plus le **fait de contexte** qu'il aurait écrit,
si bien que l'utilitaire le relit avec sa propre fonction `deduire` — la même qu'au
versement. Une variante et un versement ne peuvent donc pas dire deux choses
différentes de la même situation.

Chaque utilitaire déclare comment se rejouer : `rejeu: { outil: "frost" }`, et sur
chaque entrée le champ de l'appel par lequel elle passe. Une entrée sans champ se
lit sans se faire varier — H0 en est une : le serveur le choisit dans sa table
départementale, et le lui imposer lui ferait dire autre chose que le DTU. La
variante le **dit** au lieu de rendre un chiffre.

`variante-utilitaires.js`, avec sa table `RELECTURES` et ses deux lois recopiées,
n'existe plus.

### Ce qui reste, et qui est vraiment serveur

**Les autres utilitaires.** Seuls les trois outils climatiques ont un mode « calcule
sans écrire ». Le zonage sismique et le retrait-gonflement lisent Géorisques, et
l'extraction d'avis lit des documents : ni l'un ni l'autre ne se rejoue avec une
valeur du projet. Ils se disent « à revérifier », avec leur nom.

**Nommer les entrées que la mémoire ne porte pas.** Le département, le canton, les
coordonnées : un utilitaire les lit et le projet ne les verse pas comme sujets. On
ne les déclare donc pas — déclarer un sujet que rien ne verse ferait un lien vers
rien. Le jour où le projet posera son adresse comme une donnée de base, ces
lectures-là se déclareront comme les autres, et se feront varier comme les autres.

**Un projet sans appel conservé.** Le rejeu repart du dernier appel de l'outil,
gardé dans `project_tool_results`. Un projet qui n'en a pas — parce que ses
contraintes ont été versées autrement — n'a rien à redemander, et le dit.

### Ce qu'il ne faut pas faire en attendant

**Rapprocher `inputs.altitude` d'une donnée de base par le nom.** « altitude »
n'est pas « Altitude du site ». Ce qui a été fait est l'inverse : l'utilitaire
**dit** le sujet, et c'est un sujet du projet, pas un nom de champ.

**Recopier une loi de calcul dans le navigateur.** C'est ce qu'on vient de
supprimer. Un utilitaire qu'on ne sait pas rejouer se **nomme** ; il ne se
réimplémente pas, fût-ce « juste pour ce cas-là ».

**Laisser passer une valeur qu'un champ ne sait pas lire.** L'appel attend un
nombre ; « à confirmer » n'en est pas un, et le passer quand même le ferait
retomber sur zéro — une cote de fondation calculée au niveau de la mer, énoncée
comme une règle. Le refus est nommé.

---

## 2. Supprimer `.project-view-header__bar`

**État :** ouvert · **Nature :** ménage.

Reste d'une barre de titre remplacée. Rien ne l'affiche plus, mais des règles la
visent encore. À enlever avec ses styles, dans une passe où l'on peut vérifier
qu'aucun écran ne la porte.

---

## 3. La cloison du fondations : le diff d'une proposition

**État :** en attente d'une décision du produit.

L'utilitaire fondations ne remplit plus le diff d'une proposition. C'est
volontaire — décidé en cours de route —, et cette ligne existe pour qu'on ne le
redécouvre pas comme un bug.

---

## 4. Adopter une variante en proposition

**État :** ouvert · **Nature :** produit, puis client. **Débloque :** le dernier
barreau de l'échelle.

### Ce qui manque

Une variante se lit, se compte et se referme. Si elle est meilleure, il n'y a
rien à faire d'elle : on note les chiffres à la main et on recommence ailleurs.
C'est le seul endroit où l'outil montre une réponse et laisse l'utilisateur la
recopier — ce qu'il existe précisément pour éviter.

### L'échelle, et pourquoi le barreau compte

Une **variante** est une valeur qu'on *essaie* : elle n'engage rien. Une
**hypothèse** est une valeur qu'on *assume* en attendant mieux. Une **donnée de
base** est une valeur qu'on *sait*. Adopter une variante, c'est la faire monter
d'un barreau — et jamais deux d'un coup.

### Ce qu'il faut faire

Un geste depuis l'écran de variante : *transformer en proposition*. Il ouvre une
proposition **ouverte**, portant la valeur essayée comme hypothèse, et le
circuit habituel reprend — quelqu'un relit, arbitre ce qui contredit ce que le
projet a déjà décidé, et signe. C'est la signature qui fait entrer la valeur en
mémoire, jamais l'écran de variante.

Rien d'autre n'y entre : **ni les valeurs recalculées, ni les rejouées**. Elles
se recalculeront d'elles-mêmes une fois la nouvelle entrée en mémoire, et les
verser serait écrire un résultat à côté de son calcul — deux copies d'une même
valeur, qui finiront par diverger.

Ce qui suit la variante dans la proposition n'est donc pas une valeur : c'est le
**dossier**. Ce qu'on a essayé, ce que ça changeait, ce qui restait à
revérifier, et l'état de la mémoire au moment du calcul. Sans lui, celui qui
relit six mois plus tard voit une hypothèse sans savoir d'où elle vient.

### Pourquoi ce n'est pas encore fait

Parce que c'est une décision de produit avant d'être du code : qui a le droit
d'adopter, ce qui se passe quand la mémoire a bougé depuis le calcul, et si une
variante à plusieurs substitutions fait une proposition ou plusieurs. La
mécanique, elle, est prête — `variantePourLEcran` porte déjà le dossier complet.

### Ce qui se passe si on le laisse

L'outil reste **honnête et inutilisable au bout** : il montre juste, et il faut
recopier. C'est le pire endroit où s'arrêter, parce que c'est celui où
quelqu'un, un jour, recopiera de travers.

---

## 5. Le cerveau du projet — *les deux modes sont faits*

**État :** deux vues, deux modes, la navigation · **Reste :** leur cumul, à juger
sur pièce.

### Ce qui manquait

On ne voyait pas l'ensemble du raisonnement. On le **lisait** — un tableau, une
étude d'impact, un audit — et chacun de ces écrans répond à une question, posée
une à une. Aucun ne montrait la forme : combien de strates, où est le socle, où
sont les nœuds qu'on ne sait pas refaire, et jusqu'où une valeur se propage.

Un projet de quatre cents affirmations se lisait par le trou d'une serrure.

### Deux vues, et elles ne disent pas la même chose

**Les strates** rangent les nœuds en colonnes, une par pas depuis le socle, chaque
colonne nommée : *socle*, *1 pas*, *2 pas*. C'est la vue qui répond à *dans quel
ordre* — on suit une chaîne de gauche à droite, on compte les pas.

**Le volume** met le socle au centre et éloigne chaque strate en coquilles
concentriques, réparties à la spirale d'or. C'est la vue qui répond à *où est la
matière* : une strate chargée fait une coquille dense, une strate maigre un semis
clairsemé. Les colonnes ne montraient pas cela — sur un vrai projet, elles
empilaient trois cents nœuds sur une seule verticale.

Le nœud le plus employé du socle est **exactement au centre**. C'est le centre
névralgique : la valeur dont le plus de choses dépendent, et l'on doit pouvoir la
montrer du doigt.

### Deux modes, et ils ne posent pas la même question

**L'onde au clic** répond à *qu'est-ce qui repose là-dessus ?*. Elle part d'une
valeur et remonte les liens strate par strate.

**Le battement** répond à *où ça ne va pas ?*. Le projet pense tout seul — les
impulsions partent du socle en boucle, une par seconde — et ce que l'audit signale
bat en rouge, sans qu'on ait rien demandé. Trois motifs, et ils se distinguent au
survol : une règle qui dérive, une règle qui a perdu son objet, un calcul fait sur
une entrée que le projet a changée depuis.

### La navigation

Molette pour zoomer — **sous le curseur**, sinon approcher un détail le fait fuir
hors de l'écran. Glissé pour déplacer en strates, pour **tourner** en volume : on
ne déplace pas une sphère centrée, on l'oriente. Un seuil de quatre pixels
distingue le glissé du clic, sans quoi se promener déclencherait une onde à chaque
relâchement.

### Ce qui est masqué, compté, et récupérable

Sur le projet réel, trois cent onze affirmations pour quatre-vingt-quatorze liens :
la plupart des nœuds ne sont touchés par **aucun** lien, et les dessiner tous fait
un mur dans lequel on ne distingue plus les soixante qui forment le raisonnement.

Ils sont donc masqués par défaut, **comptés dans la barre**, et une case les
remet. Leur absence de lien a deux causes qui ne se confondent pas — ou bien rien
ne repose sur eux, et c'est une information ; ou bien leurs lectures n'ont pas été
enregistrées, et c'est une lacune de l'outil. On ne sait pas laquelle, et l'écran
ne le fait pas croire.

### Les garde-fous, tenus

**L'onde est `impactDe`** et **les signaux sont `auditerLaMemoire`**, sans une
ligne de plus. Si ce dessin ment, l'étude d'impact et l'audit mentent aussi, et
les trois se corrigent ensemble. Deux écrans qui jugeraient chacun de leur côté
finiraient par ne pas signaler les mêmes choses, et l'on ne saurait plus lequel
croire.

**Un nœud opaque ne s'allume pas comme les autres** : halo creux, compté à part.
**Les liens disent d'où ils viennent** : sans lectures enregistrées, un bandeau dit
qu'ils sont déduits d'une ressemblance de noms. **Les étiquettes ne s'écrivent que
tant qu'elles se lisent**, et le seuil compte les nœuds **visibles à l'écran** —
c'est ce qui fait que zoomer en fait réapparaître, et c'est à cela que sert le
zoom.

### Ce qui reste : le cumul des deux modes

Le battement au repos, l'arrêt au survol, l'onde au clic. C'est probablement le
bon enchaînement — mais il se juge sur pièce, et maintenant que le battement
tourne on peut le juger. Deux questions à trancher en le regardant : est-ce que le
battement fatigue au bout de deux minutes, et est-ce qu'un arrêt au survol se
comprend ou surprend ?

### Ce qui se passe si on le laisse

Rien. Les deux modes marchent séparément, et le bouton pour passer de l'un à
l'autre est à côté. Le cumul est un confort, pas une capacité.
