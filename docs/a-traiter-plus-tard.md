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

## 5. Le cerveau du projet — *fait*

**État :** fait · **Reste :** rien de nommé. Ce qui viendra viendra de l'usage.

### Ce qui manquait

On ne voyait pas l'ensemble du raisonnement. On le **lisait** — un tableau, une
étude d'impact, un audit — et chacun répond à une question, posée une à une.
Aucun ne montrait la forme. Un projet de quatre cents affirmations se lisait par
le trou d'une serrure.

### Deux vues

**Les strates** rangent les nœuds en colonnes, une par pas depuis le socle : la
vue qui répond à *dans quel ordre*. **Le volume** met le socle au centre et
éloigne chaque strate en coquilles concentriques, réparties à la spirale d'or :
la vue qui répond à *où est la matière*. Le nœud le plus employé du socle est
exactement au centre — le centre névralgique.

### Trois modes, dont le cumul

**Vivant**, par défaut : le projet bat tout seul, s'arrête dès qu'on le survole,
repart quand on s'éloigne, et un clic lance l'onde. C'est le cumul des deux
autres, et il règle ce que chacun avait de gênant — le battement seul finit par
gêner au moment précis où l'on veut lire quelque chose, l'onde seule laisse un
écran mort tant qu'on n'a rien demandé.

**Onde au clic** et **Battement** restent disponibles pour qui veut l'un sans
l'autre.

### Deux couleurs

**Nature** : socle, rejouable, opaque — ce que chaque valeur *est*.

**Chaleur** : un dégradé d'orange selon ce qui passe par là. Le **poids** d'un
nœud réunit ses emplois et son degré, parce qu'une donnée lue dix fois par une
règle et une donnée lue une fois par dix règles ne pèsent pas pareil. La taille
suit le même poids, en racine — les poids d'un projet ne se répartissent pas
également, et une échelle linéaire ferait trois grosses billes au milieu d'une
poussière.

**Le rouge est hors de l'échelle**, et c'est le point qui compte. Il ne dit pas
« très chaud », il dit « l'audit signale ». Si le rouge était le bout du dégradé,
un nœud très employé se lirait comme un nœud malade, et l'on apprendrait à
ignorer la couleur qui compte. Un lien dont une extrémité est malade passe au
rouge aussi : c'est par lui que le défaut se propage.

### Le regroupement par domaine

Chaque domaine reçoit un secteur — un quartier du volume, une bande en strates —
avec un tiers de chevauchement entre voisins. On reconnaît une zone sans pouvoir
tracer la frontière, ce qui est exactement l'état de la réalité : une hauteur de
plancher sert l'incendie **et** l'accessibilité.

L'ordre des secteurs vient du vocabulaire, pas du projet : deux projets placent
l'incendie au même endroit, faute de quoi « la zone dense, là, c'est l'incendie »
ne voudrait rien dire d'un projet à l'autre.

**Le nom se pose au bord du secteur, pas au barycentre.** En volume, les nœuds
d'un domaine s'étalent de part et d'autre du centre et leur moyenne y retombe :
les cinq libellés s'empilaient au milieu de l'écran. On prend donc la direction
moyenne — une moyenne d'angles, sur le cercle — et l'on pose le nom là où la zone
se voit. Un domaine de moins de trois nœuds ne se nomme pas : trois points isolés
portant une étiquette feraient croire à une zone qui n'existe pas.

Et le regroupement ne touche **jamais** à la strate : c'est elle qui porte le
raisonnement. Grouper d'abord et stratifier ensuite casserait la lecture des
chaînes, qui est la raison d'être de l'écran.

### La navigation

Molette pour zoomer — sous le curseur. Glissé pour déplacer en strates, pour
tourner en volume. Un seuil de quatre pixels distingue le glissé du clic.

### Ce qui est masqué, compté, et récupérable

Les nœuds qu'aucun lien ne touche : la majorité sur un vrai projet. Masqués par
défaut, comptés dans la barre, une case les remet. Leur absence de lien a deux
causes qui ne se confondent pas — rien ne repose sur eux, ou leurs lectures n'ont
pas été enregistrées — et l'écran ne fait pas croire qu'il sait laquelle.

### Les garde-fous, tenus

**L'onde est `impactDe`** et **les signaux sont `auditerLaMemoire`**, sans une
ligne de plus. Si ce dessin ment, l'étude d'impact et l'audit mentent aussi, et
les trois se corrigent ensemble.

**Les liens disent d'où ils viennent** : sans lectures enregistrées, un bandeau
dit qu'ils sont déduits d'une ressemblance de noms. **Les étiquettes ne s'écrivent
que tant qu'elles se lisent**, et le seuil compte les nœuds visibles à l'écran —
c'est ce qui fait que zoomer en fait réapparaître.

### Le voile des domaines

Chaque zone porte un **voile** : l'enveloppe convexe de ses nœuds, écartée d'une
marge, dont la frontière respire. L'enveloppe n'invente aucun point — elle entoure
ceux qui existent ; un cercle posé sur le barycentre envelopperait du vide et
ferait croire à une zone là où il n'y a personne.

La frontière bouge parce qu'elle **n'en est pas une** : les secteurs se
chevauchent d'un tiers, une valeur sert souvent deux disciplines, et un trait net
dirait le contraire — que le raisonnement se range en cases. Une bordure qui
respire dit ce qu'il faut : « c'est par là », pas « ça s'arrête ici ».

Au survol d'une zone — en pointant **le vide entre ses valeurs**, le geste qu'on
fait en disant « ce paquet, là » —, le voile s'éclaire, son nom aussi, et une
bulle dit ce qu'elle contient : combien d'affirmations, ce qui y pèse le plus, ce
que l'audit y signale.

### Ce qui reste

Rien de nommé pour cet écran-ci. La suite est ailleurs, au § 6 : les fonctions
n'y sont pas encore des objets.

---

## 6. Les fonctions deviennent des nœuds — *fait*

**État :** fait · **Nature :** un modèle avant d'être un écran. **Débloque :**
la moitié manquante de la métaphore.

> **Ce qui a été livré.** Une règle appliquée est un **nœud**, dessiné en losange
> violet entre ses entrées et sa sortie, sous la case « Montrer les règles ».
> `lecturesAvecLesFonctions` déplie chaque lecture enregistrée en deux —
> `entrée → règle` puis `règle → sortie` — et le dessin **comme l'onde** lisent
> ces mêmes lectures dépliées : sans cela l'onde sauterait par-dessus les nœuds
> qu'on vient de dessiner. `complexiteDeLaRegle` compte ce qu'il faut tenir en
> tête pour la relire (conditions, sujets lus, exceptions comptées double, deux
> issues, zones) et l'écran la rend en **crans autour du losange**, jamais en
> taille : la taille reste le poids, comme pour tout le monde.
>
> **Ce qui n'a pas été fait, et pourquoi.** Les coquilles ne s'appellent pas
> « réflexe » et « capteur ». Un rang ne porte presque jamais *que* des règles —
> deux chaînes de longueurs différentes y mettent couramment une valeur à côté
> d'un mécanisme — et le nommer ainsi nierait ce qui s'y trouve. Un rang qui ne
> porte que des règles s'appelle « règles » ; les autres gardent leur compte de
> pas. La profondeur annoncée en tête reste celle du **raisonnement**
> (`pasDeRaisonnement`), jamais celle du dessin : le même projet ne change pas de
> profondeur selon un bouton d'affichage.
>
> **Ce qui reste.** La seconde mesure — *ce qui dépend d'elle*, `impactDe` sur sa
> sortie — n'est pas encore montrée dans la bulle d'une règle. Le nœud porte déjà
> son poids et sa complexité séparément ; l'aval se lit pour l'instant en
> cliquant, par l'onde.

### Ce que le cerveau montre aujourd'hui, exactement

**Un nœud est une affirmation** : une valeur que le projet tient pour vraie —
« Altitude du site : 13 m », « Degré coupe-feu : CF 1 h ». Rien d'autre.

**Un lien est une lecture** : « pour conclure ceci, on a lu cela ». Une ligne par
lecture enregistrée, d'où son épaisseur.

**Et les fonctions ?** Elles sont **les liens**, pas des nœuds. Une règle `.ref`
n'apparaît nulle part : elle a été dissoute dans les flèches qu'elle produit. Le
choix était délibéré — les dessiner ferait un nœud de plus par sujet — mais il a
un coût, et il faut le dire : **on ne peut ni voir une fonction, ni la peser, ni
savoir laquelle est compliquée.**

Le cerveau montre donc aujourd'hui la **mémoire et ses dépendances**. Pas les
raisonnements comme objets. C'est une moitié de la métaphore.

### Ce qui est déjà là, et qu'il suffit de nommer

La structure d'un cerveau — mémoire au centre, réflexes autour, sens au bord —
est **déjà dessinée**. Elle n'est simplement pas dite avec ces mots-là.

**La mémoire, c'est le socle.** La strate 0, au centre du volume : ce que le
projet pose, suppose ou constate. Plus un projet porte de données, plus son noyau
est peuplé et chaud. Le secteur mémoire existe donc — c'est le cœur, et il n'y a
rien à construire pour cela.

**Les capteurs, ce sont les utilitaires.** Les nœuds opaques lisent le monde
extérieur : une table climatique départementale, Géorisques, un PDF extrait. C'est
exactement un organe sensoriel — il rapporte une mesure dont on ne peut pas
refaire le chemin de l'intérieur. La correspondance est juste, et déjà à l'écran :
creux, gris, halo ambre quand l'onde les traverse.

**Le réflexe, c'est la première strate.** Les règles qui ne lisent que le socle ne
dépendent d'aucun autre raisonnement : donnée → conclusion, sans intermédiaire.
C'est bien un « reptilien », et c'est la coquille la plus proche du centre.

### Ce qui manque vraiment

Que les fonctions soient des **objets** : visibles, situables, pesables. Un nœud
d'une autre forme — un losange, disons — placé entre ses entrées et sa sortie,
au lieu d'une flèche qui les court-circuite.

Attention à un piège : on aurait alors **deux systèmes de secteurs** qui se
battraient — les domaines métier (incendie, structure) et les natures de fonction
(réflexe, capteur). Il faut les mettre sur des axes différents, et l'écran le fait
déjà : **les domaines sur l'axe angulaire, la nature du raisonnement sur l'axe
radial**. Il n'y a rien à réinventer, seulement à nommer les coquilles avec ces
mots-là plutôt qu'avec « 1 pas, 2 pas ».

### Le poids d'une fonction : deux mesures, jamais un score

**La complexité seule serait un mauvais poids**, parce qu'elle mesure l'effort
d'écriture, pas l'importance. Il en faut deux, et elles ne se mélangent pas :

**Ce qu'elle demande pour être comprise.** Le nombre de conditions, le nombre de
sujets distincts lus, les exceptions (`sauf`), la présence d'un `sinon`, le nombre
de zones où elle s'applique. Tout est dans `payload.regle` : mesurable exactement,
sans rien inventer.

**Ce qui dépend d'elle.** Combien d'affirmations en aval de sa conclusion, sur
combien de strates — c'est `impactDe` sur sa sortie, la fonction que l'écran
emploie déjà.

Une fonction compliquée dont rien ne dépend est un **coût** : elle se relit mal
pour rien. Une fonction simple dont tout dépend est un **risque** : la corriger
remue le projet entier. Ce sont deux problèmes différents, on n'y répond pas de la
même façon, et un score unique les confondrait — ce qui est précisément ce que ce
projet refuse ailleurs, en séparant la chaleur (ce qui passe par là) du rouge (ce
qui ne tient plus).

### Ce qui se passait si on le laissait

Le cerveau restait juste, et incomplet : il disait tout de ce que le projet
**sait** et rien de ce qu'il **fait**. Sur un projet dont le raisonnement est riche, on voit
un nuage de valeurs reliées sans voir les mécanismes qui les relient — et l'on ne
peut pas répondre à « quelle règle est trop compliquée ? », qui est une vraie
question de relecture.
