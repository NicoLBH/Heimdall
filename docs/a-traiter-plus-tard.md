# À traiter plus tard

**À quoi sert cette page :** un chantier qu'on repousse et qu'on n'écrit pas
revient sous forme de surprise. Ce carnet garde ceux qu'on a **vus, compris et
décidé de ne pas faire maintenant** — avec la raison, ce qu'ils débloqueraient,
et ce qui se passe si on les laisse.

Il ne remplace pas le plan : [`rejouer-la-memoire.md`](rejouer-la-memoire.md)
portait une suite d'étapes qu'on a faite, jusqu'au bout. Elle est close. **Le
plan qui vient est donc écrit ici**, en tête, et les sections numérotées qui
suivent gardent leur rôle : le détail, et ce qu'on a mis de côté en chemin.

Une ligne quitte cette page quand elle est faite, ou quand on décide qu'elle ne
se fera pas — et alors on écrit pourquoi.

---

# Le plan qui vient

## L'ordre, et pourquoi celui-là

Trois principes ont décidé de cet ordre, et ils valent d'être dits parce qu'ils
trancheront les hésitations à venir.

**On rend l'application lisible avant de l'agrandir.** Le premier besoin n'est
pas une fonction de plus : c'est de voir le parcours entier — copilote, atelier,
proposition, mémoire — et de se l'approprier. Les déplacements coûtent peu et
changent tout ce qu'on comprend de l'outil. Ils passent donc en premier.

**On finit une démonstration avant d'en commencer une autre.** La cascade
`localisation → altitude → hors gel → fondations` **et** `localisation → zone
sismique → spectre` est le meilleur argument que le produit possède. Elle demande
trois choses — la localisation versée, les utilitaires climatiques aux
standards, l'écran qui dessine un arbre plutôt qu'une file — et rien d'autre. On
les fait à la suite, on la montre, et on s'en sert pour juger le reste.

**On change le geste avant de changer le modèle.** Verser des décisions une par
une, dans une proposition par décision, referait exactement le défaut qu'on veut
corriger. La proposition-branche vient donc **avant** le modèle des décisions,
pas après.

## Les dix étapes

| # | Étape | Ce qu'elle débloque | Section |
|---|---|---|---|
| 1 | Les explorations passent dans l'Atelier — *fait* | le parcours entier se lit d'un coup | [§ 14](#14-les-explorations-passent-dans-latelier) |
| 2 | Décisions et Raisonnements entrent dans la barre latérale — vides, et qui disent pourquoi — *fait* | l'intention devient visible, la lacune aussi | [§ 15](#15-ce-quest-une-décision) |
| 3 | Neige, vent et gel aux standards — *fait* ; le spectre suit | la chaîne climatique devient rejouable | [§ 20](#20-neige-vent-et-gel-aux-standards-puis-le-spectre) |
| 4 | La localisation et les zones se changent par proposition | la tête de la cascade existe, et se trace | [§ 19](#19-la-localisation-et-les-zones-se-changent-par-proposition) |
| 5 | La cascade parallèle | **la démonstration** | [§ 21](#21-la-cascade-parallèle-la-démonstration) |
| 6 | La proposition devient une branche | on peut enfin proposer plusieurs choses à la fois | [§ 17](#17-la-proposition-devient-une-branche) |
| 7 | Un modèle rédige le titre et le corps d'une proposition | l'historique redevient lisible six mois plus tard | [§ 18](#18-le-titre-et-le-corps-dune-proposition) |
| 8 | Le modèle des décisions | ce que Mdall avait oublié de garder | [§ 15](#15-ce-quest-une-décision) |
| 9 | Le modèle des raisonnements | ce qu'une donnée nouvelle remet en cause, nommément | [§ 16](#16-ce-quest-un-raisonnement) |
| 10 | Le cerveau, requalifié et filtré | la mémoire et les raisonnements, vus ensemble | [§ 22](#22-le-cerveau-requalifié) |

[§ 23](#23-incendie-habitation-finir) — *incendie habitation* — ne dépend de rien
et ne bloque rien : elle se glisse entre deux étapes, quand on veut souffler.

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

> **Repris par le plan.** Ce qui manque ici est désormais l'étape 6 :
> [§ 17 — la proposition devient une branche](#17-la-proposition-devient-une-branche).
> La sortie d'une variante n'est plus « créer une proposition » mais « ajouter
> cet essai à une proposition ouverte », ce qui est mieux et plus simple. La
> variante elle-même a changé de place : [§ 14](#14-les-explorations-passent-dans-latelier).

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
> **Les secteurs, ensuite.** La question posée ici — « deux systèmes de secteurs
> qui se battraient » — a trouvé sa réponse, et ce n'était pas celle qu'on
> attendait. On ne classe pas les règles par nature de fonction (réflexe,
> capteur) : on **plie l'axe libre en deux**, la mémoire d'un côté, le
> raisonnement de l'autre. La hauteur en strates, la latitude en volume ; les
> domaines gardent leur axe — la bande, le méridien — et ne se battent avec rien.
>
> Le pliage garde l'ordre : un domaine posé au tiers de la hauteur se retrouve au
> tiers de **chaque** moitié. Les mêmes lobes, dans le même ordre, dans les deux
> hémisphères — « la structure, côté mémoire » et « la structure, côté
> raisonnement » —, et un voile par lobe et par côté plutôt qu'un seul qui
> enjamberait l'équateur. **Chaque secteur porte son nom** : « INCENDIE ·
> mémoire » et « INCENDIE · raisonnement », dans les deux vues. Un seul nom pour
> les deux tomberait entre eux, c'est-à-dire nulle part. La part de cadre qui revient à chaque moitié suit la
> population : la forme du projet se lit dans l'épaisseur des deux bandes.
>
> L'équateur est **pointillé**, jamais plein : tout le traverse, puisqu'une règle
> lit une valeur d'un côté et en produit une autre de l'autre. Ce n'est pas une
> frontière, c'est un repère de lecture.
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
> **La seconde mesure est là aussi.** `avalDeLaRegle` fait partir l'onde de la
> règle elle-même et compte ce qu'elle atteint : « Ce qui en dépend : 4
> affirmations, sur 2 strates, par 1 règle. » C'est la **même fonction** que la
> phrase de l'onde au clic — `valeursDeLOnde` —, et non un second comptage qui
> finirait par ne plus dire la même chose. Elle se calcule au survol : la faire
> pour chaque règle à l'ouverture paierait un parcours qu'on ne regardera pas.
>
> **Les électrons, par-dessus.** Un sujet peut valoir plusieurs choses *à la
> fois* : le rez-de-chaussée est un ERP, les étages du logement, et la clé d'une
> donnée de base porte le sujet **et** ses portées pour que l'une ne périme pas
> l'autre. Ces valeurs restent **plusieurs nœuds** — les fondre ferait converger
> vers un point des liens qui n'existent pas, et l'onde propagerait la valeur
> d'une zone dans le raisonnement d'une autre. Chaque nœud sait seulement qu'il
> est l'un de plusieurs, et fait graviter un électron par valeur, le sien le plus
> vif. Ce n'est pas un effet : c'est exactement là qu'un lecteur se trompe, en
> retenant « la » valeur d'un sujet qui en a quatre. La bulle les nomme avec leur
> portée ; la légende compte les sujets concernés, pas les nœuds.

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

---

## 7. Les chaînes coupées : un index qui perdait le milieu — *fait*

**État :** fait · **Nature :** un défaut d'index, découvert par un chiffre qui ne
collait pas. **Débloque :** tout ce qui remonte une chaîne.

### Le symptôme

Un projet dont une contrainte s'établit en **six étapes** — données de base,
« Habitation individuelle ou collective », « Nombre d'étages retenu », « Classement
du bâtiment », « Famille », « Degré coupe-feu des planchers » — s'annonçait dans le
cerveau à **deux pas**. L'écran « Comment on en est arrivé là » montrait bien les
six ; le cerveau en voyait deux. Deux écrans du même projet, deux réponses.

Reconstruire les liens du raisonnement n'y changeait rien, ce qui était le bon
indice : ce n'était pas un index en retard, c'était un index qui reconstruisait
la même chose fausse.

### La cause, et elle était double

**Un.** `applicationsDeLaMemoire` résolvait le sujet d'une règle — son entrée
comme sa sortie — **uniquement parmi les valeurs**. Or un projet ne verse pas
toujours une valeur pour chaque conclusion : « Famille : 2 » peut n'exister que
dans la règle qui l'établit, sa valeur portée dans son propre bloc. Le sujet est
pourtant déclaré, et `sujetsDeclares` le compte depuis toujours.

Conséquence, deux fois : la règle qui conclut « Famille » n'avait **pas de sortie**
et *aucune* de ses lectures n'était enregistrée ; et chacune des soixante-huit
règles qui lisent « Famille » perdait son entrée. Sur la mémoire d'essai : 13
sujets dans ce cas, 45 liens perdus sur 114.

**Deux.** « La plus longue chaîne » se mesurait en **sauts d'une valeur à
l'autre**, ce qui suppose qu'entre deux règles il y ait toujours une valeur
versée. Toute chaîne traversant une conclusion sans valeur était coupée là.

Les deux fautes se renforçaient : la première creusait le trou, la seconde le
comptait comme une fin de chaîne.

### Ce qui a été fait

`resoudre` remonte à la **règle** qui conclut un sujet quand aucune valeur ne le
porte — en dernier recours seulement, une valeur versée étant plus proche de ce
que le projet affirme aujourd'hui que le bloc qui l'a produite. Une règle devient
alors sa propre sortie, ce qu'elle est déjà en fait.

Et le compte change d'unité : **un pas est une règle appliquée**, pas un saut de
valeur en valeur. Il se mesure sur le graphe déplié, avec ou sans les règles à
l'écran — le chiffre ne dépend plus d'un bouton d'affichage. Sur la mémoire
d'essai, il passe de 2 à 5, ce que l'écran des étapes annonçait depuis le début.

**Il faut relancer « Verser › Reconstruire les liens du raisonnement » une fois** :
les lignes déjà écrites restent valides, il en manquait.

### La leçon, qui vaut au-delà de ce cas

**Un index à moitié rempli est plus dangereux qu'un index vide.** Vide, on s'en
méfie ; à moitié plein, on lit ses chiffres comme s'ils décrivaient le projet.
L'écran ne se taisait que dans un cas — zéro lecture dans tout le projet — et
affichait sans réserve dès qu'il en existait une seule.

Deux lacunes se comptent donc et se disent, en haut de l'écran : les règles dont
**aucune entrée** n'est enregistrée, et les conclusions qu'**aucune valeur** ne
porte. La seconde n'est pas une faute — la valeur est là, dans le bloc —, mais
elle n'est ni auditable, ni rattachable à un document, ni comparable d'une version
à l'autre. C'est un choix de modèle, et il doit se voir.

### La suite, tranchée : chaque conclusion verse sa valeur

La question posée ici — faut-il verser une valeur pour chaque conclusion de
règle ? — a été tranchée : **oui**. `conclusionsDesDeductions` verse, à côté de
chaque déduction du référentiel, la valeur qu'elle établit. « Famille : 2 » est
désormais une affirmation du projet, pas une ligne dans un bloc.

Ce qu'on y gagne, et qui n'était pas rattrapable autrement : l'audit la relit ;
un document peut s'y rattacher ; elle se remplace, datée, comme n'importe quelle
autre valeur ; et une correction se voit à l'étape où elle a lieu.

La règle et sa conclusion sortent du **même module, au même instant** :
`module.valeur` est lu une fois et écrit dans les deux lignes. Ce n'est pas une
copie qu'on entretient — c'est un instantané, comme la règle elle-même en est un
(`docs/fondamentaux.md`, règle 4).

Un sujet déjà posé plus haut ne se repose pas : « Classement du bâtiment » partait
déjà comme donnée de base, et la base refuse l'envoi entier sur un doublon de clé.

### Ce qui reste, et qui n'est pas un défaut de l'outil

Sur la mémoire d'essai, cent vingt-trois lectures restent sans entrée après
reconstruction. Elles ne sont pas un bug : ce sont des **règles qui lisent un
sujet que leur zone ne porte pas**. Une règle du magasin lit « Famille » ; aucune
famille n'est déclarée pour le magasin. Emprunter celle du bâtiment A serait le
mensonge que le code refuse — elle se lirait comme la valeur d'ici.

Elles se comptent en haut de l'écran. C'est au projet d'y répondre, pas à l'outil.

---

## 8. Le volume cachait ses strates — *fait*

**État :** fait · **Nature :** un encodage qui ne pouvait pas marcher.

### Le symptôme

Huit strates, trois cents nœuds, et pas une strate visible : la vue Volume
montrait une boule. Les libellés des coquilles étaient là, la structure non.

### Pourquoi aucun espacement ne pouvait le corriger

Parce que le rayon **est** l'axe qu'on ne peut pas voir à travers. Des coquilles
concentriques se cachent les unes les autres par construction : la plus externe
masque tout ce qu'elle contient, et cela ne dépend ni de leur écartement, ni
d'une échelle logarithmique. Espacer les coquilles ne fait qu'écarter des voiles
qui continuent de se recouvrir.

L'échelle logarithmique avait d'ailleurs un défaut de plus : elle **déforme**. Un
pas vaut un pas, et rien ne justifie que la sixième étape paraisse plus loin de
la cinquième que la seconde ne l'est de la première.

### Ce qui a été fait : sortir la strate du rayon

Une troisième vue, **Éclatée**. Chaque strate devient un disque, les disques
s'empilent le long d'un axe qu'on voit, et la caméra les regarde presque de côté
— une élévation basse rend les ellipses fines, et des ellipses fines s'empilent
sans se confondre. On compte les étages du raisonnement comme les étages d'un
immeuble.

Le disque rétrécit quand les étages se multiplient : c'est la seule contrainte
géométrique de cette vue. Deux disques larges à des hauteurs voisines se
recouvrent à l'écran, et l'on retrouve la boule qu'on venait de quitter.

Rien d'autre ne change : le plan du disque est un plan `x`/`z`, et
`pencherVersLesDomaines` y tourne les nœuds vers le cap de leur domaine sans
toucher à la hauteur — exactement comme en volume. Un domaine reste un secteur,
une strate reste une strate.

Deux choses n'ont pas leur place ici, et pour la même raison — la hauteur est
prise : les **hémisphères**, qui s'en servaient pour séparer mémoire et
raisonnement (les règles ont de toute façon leurs propres étages dans la pile), et
les **voiles de domaine**, dont l'enveloppe traverserait tous les étages en une
bande verticale qui recouvre sans rien situer. Le nom du secteur suffit.

### Ce qui reste

La vue Volume ne bouge pas. Elle répond à une autre question — *où est la
matière* — et elle y répond bien tant qu'on ne lui demande pas de compter les
strates.

---

## 9. Le cerveau : la place, la prise, et un zoom qui se retournait — *fait*

**État :** fait · **Nature :** de l'usage, plus un défaut de projection trouvé en
route.

### La place

Barre de réglages, bandeau d'alerte et légende occupaient un tiers de la hauteur
— et c'est la hauteur qui manque à un graphe. Ils passent dans un **rail debout à
gauche**, qui se rétracte. Restent en tête, quoi qu'il arrive : le nom de
l'écran, la loupe, le recadrage, la fermeture — les gestes qu'on fait sans
réfléchir, et qu'on ne doit pas avoir à déplier pour retrouver.

Les compteurs, eux, **passent** d'un endroit à l'autre : dans le rail quand il
est ouvert, en tête quand il est replié. Les afficher aux deux endroits ferait
deux vérités à tenir d'accord, et l'une des deux finirait par mentir.

### La prise

**Des barres de défilement.** En volume, le glissé tourne — c'est le geste qu'on
attend d'un objet. Il ne restait donc rien pour se déplacer : on approchait un
détail, il sortait du cadre, et l'on ne pouvait plus aller le chercher. Le zoom
devenait inutilisable au moment précis où il servait.

Elles ne sont pas celles du navigateur : une toile n'a pas de contenu à faire
défiler, elle se redessine. Elles lisent **l'étendue réellement dessinée**,
relevée sur les points projetés à chaque image, et écrivent le décalage de la
caméra — le même que la molette et le glissé écrivent. Le facteur se fige au
moment où l'on saisit le pouce : le relire en cours de glissé le ferait varier
avec le déplacement qu'il vient de causer, et le pouce s'emballerait.

**Le clic sur un secteur.** Le survol éclaircissait un voile — assez pour dire
« c'est par là », pas assez pour lire ce qu'il contient. Le clic le **retient** :
tout ce qui n'en est pas s'efface à seize pour cent, sauf les liens qui le
touchent, par lesquels on voit ce qui y entre et ce qui en sort. Un secteur sans
lien serait un îlot, et le cerveau n'en a pas.

Les noms de secteur sont cliquables autant que les voiles : c'est la seule prise
de la vue éclatée, qui n'a pas de voile.

### Le quart de tour

Un bouton **Couché / Debout**. Couché, la mémoire est au-dessus du raisonnement
et les strates se lisent de gauche à droite. Debout, la mémoire est **à gauche**
du raisonnement et les strates descendent — la coupe sagittale d'un cerveau
plutôt que sa coupe horizontale.

Le quart de tour se prend **dans la projection**, une fois, et non sur les
positions : tout ce que l'écran dessine passe par cette fonction — les nœuds,
mais aussi les colonnes, les disques, l'équateur et les noms de secteur. Tourner
les positions seules aurait laissé les repères dans l'ancien sens, et le dessin
aurait dit une chose pendant que ses repères en disaient une autre.

### Le défaut trouvé en route

En volume, `recul = 3,2 / zoom` : la caméra s'approchait pour zoomer. Au-delà
d'un zoom de deux, elle **entrait dans le volume** — les nœuds passés derrière
l'œil projetaient des coordonnées aberrantes, l'image se retournait, et le dessin
disparaissait de l'écran au moment précis où l'on cherchait à le voir de près.

La caméra recule maintenant jusqu'à une **distance plancher**, après quoi c'est
le grossissement qui prend le relais — exactement ce que le recul ne fait plus, de
sorte que l'échelle apparente au centre est inchangée à tous les zooms.

Ce défaut ne s'était jamais vu : il fallait zoomer fort en volume, ce que rien
n'invitait à faire tant qu'il n'y avait pas de quoi se déplacer ensuite.

---

## 10. La reprise d'étude — faite, et ce qu'elle ne fait pas encore

L'utilitaire de fondations est une **fonction native du langage**
(`docs/fondamentaux.md`, règle 9), et la chaîne
`altitude → profondeur hors gel → résultat du calcul` se **refait** maintenant
toute seule : `fondations-reprise.js` relit le tableau d'entrée que le projet
porte, y applique la nouvelle profondeur — on enterre le massif, on ne
l'épaissit pas —, redemande le calcul au serveur et rend le tableau d'après.

Ce qui l'a rendue possible n'est pas du code : c'est que **les entrées entrent
dans la mémoire**. Tant que les massifs vivaient dans l'étude privée de
l'Atelier, il n'y avait rien à renvoyer.

### Ce qui reste ouvert

- **L'écran de la variante ne montre pas le tableau d'après.** La reprise le
  rend — il voyage sur la ligne recalculée — mais la fenêtre de variante affiche
  une phrase : « 13 massifs, 20,66 m³ de béton, assise mini 1,50 m — 2 vérifiées ».
  C'est déjà ce qu'il faut pour décider ; ce n'est pas ce qu'il faut pour
  vérifier ligne à ligne.
- **Seule la profondeur hors gel commande une reprise.** C'est la seule entrée
  du projet qui décide d'une cote de fondation. Le jour où la portance du sol
  sera une donnée de base versée, elle devra en commander une aussi — et le
  branchement est déjà là : il suffit de la déclarer dans `lit` avec son `entree`.
- **Le tableau d'entrée devient visible de l'équipe.** L'étude des fondations
  était privée ; le verser la partage. C'est le prix de la reprise, et c'est le
  bon — une cote que personne ne peut relire n'est pas une cote du projet — mais
  il faut le dire à qui verse, et l'écran ne le dit pas encore.
- **Le résultat est un tableau sous un seul nom.** La mémoire le porte dans
  `payload.tableau` et l'affiche par sa phrase. Aucun écran ne sait encore
  déplier un tableau de mémoire ligne à ligne ; c'est le même manque que pour le
  point 1, et ils se traiteront ensemble.

---

## 11. La variante : deux façons de changer la même valeur — expliqué

**C'était bien deux lignes.** Le projet porte deux « Profondeur hors gel » :

```
memoire/sol.ctr          Profondeur hors gel = 0.47 m { texte: NF DTU 13.1 }
memoire/structure.ctr    Profondeur hors gel = [ Toutes zones: 0.466 m {…}, batiment-a: 0.466 m {…} ]
```

L'une est du socle — posée à la main, donc substituable —, l'autre est déduite
par l'utilitaire climat. Chacune a ses héritiers, et le calcul lit celle que la
résolution choisit. Changer l'une ne touche pas l'autre : d'où deux résultats
pour ce qui ressemble au même geste.

Ce n'est pas un défaut du moteur de variante : c'est le défaut que la **règle
10** décrit — un nom qui vit à deux endroits. Le premier temps de la réponse est
livré : un fichier qui déclare un nom déclaré ailleurs l'affiche en tête, en
rouge, avec l'autre fichier. Les temps 2 et 3 — le registre qui fait autorité,
et le versement qui ouvre un conflit plutôt qu'une seconde ligne — restent à
écrire.

**Corrigé au passage.** Un utilitaire écrivait ses mesures avec un point —
`2.59 m` — quand tout le reste de la mémoire écrit `2,59 m`. La même valeur
s'écrivait de deux façons selon qui l'avait posée, et deux écritures ne se
comparent pas.

---

## 12. Ce qui reste sur les agents et la recherche

- **`agent-IA` n'a pas d'appelant.** Le verbe existe, se lit, s'écrit et se
  colore ; aucun utilitaire ne l'emploie encore. Le jour où l'un le fera, ce qu'il
  a rendu devra se conserver ligne à ligne — un `agent-IA` ne se rejoue pas pour
  vérifier.
- **L'orchestration n'existe pas.** Deux agents dans une même fonction, en
  parallèle, avec une reprise si l'un échoue : le langage le rendra lisible, le
  moteur ne le fait pas.
- **Le marché de fonctions** suppose deux choses qui manquent : une signature
  qu'on puisse vérifier avant d'exécuter, et une façon de dire d'où une fonction
  vient. Le second point est déjà à moitié là — `utilitaire` et `version` sont
  écrits sur chaque appel.
- **La recherche ne cherche que ce que l'écran montre.** Un fichier replié, une
  ligne écartée : ni l'un ni l'autre n'est parcouru. C'est cohérent — on cherche
  ce qu'on lit — mais cela se dira mieux le jour où un compte le rappellera.


---

## 13. Retirer ce qu'une ancienne version d'utilitaire a versé

Une version de l'utilitaire fondations versait quatre-vingts cotes une par une —
`Section Lx de la semelle Portique courant file A`, et ainsi de suite. La suivante
range tout dans un seul tableau, `Résultat du calcul des fondations
superficielles`. Les quatre-vingts noms restent en mémoire : plus rien ne les
produit, plus rien ne les lit, et ils se lisent pourtant comme l'état du projet.

Les deux premiers cas de la **règle 11** se règlent tout seuls — une valeur
fausse se reverse, un nom mal rangé ouvre un conflit. Celui-ci, non : il ne s'agit
pas de corriger une valeur mais de **retirer un nom**, et rien ne permet de le
faire sans effacer, ce qu'on refuse.

Ce qu'il faudrait : qu'un versement déclare ce qu'il remplace **par son origine**
plutôt que ligne à ligne — « `dimensionnement_fondations_superficielles` V2
remplace tout ce que V1 a versé sur ces zones ». Chaque ligne porte déjà
l'utilitaire et la version qui l'ont produite ; l'information est là, il manque
le verbe et l'écran qui le montre.

Deux précautions le jour où on l'écrira :

- **cela reste de l'histoire.** Les lignes retirées ne s'effacent pas ; elles
  cessent d'être l'état, comme une affirmation remplacée ;
- **cela se voit.** Un versement qui retire quatre-vingts lignes est un acte
  considérable : il se lit dans le fil du projet, avec son auteur et sa date, et
  il se refuse.

**Livré depuis.** Le mécanisme existe : `memoire-perimetre.js`. Une version
d'utilitaire qui reprend le travail d'une précédente, et une zone retirée du
projet, sortent leurs lignes du présent — au pied du fichier, avec leur motif.

**Le retrait délibéré est abandonné.** Un verbe pour retirer une ligne « parce
qu'on le veut », sans qu'un utilitaire ni une zone ne l'y oblige, a été écarté :
il n'y a pas de geste sans motif dans ce projet, et un motif qui n'est ni une
version reprise ni une zone partie n'a pas été trouvé. Ce qui sort du présent en
sort parce que quelque chose de nommable l'en a sorti.

Ce qui reste :

- **le versement qui déclare ce qu'il remplace.** Aujourd'hui la reprise se
  **déduit** des numéros de version. C'est juste, et c'est fragile : un
  utilitaire qui changerait de lignée en changeant de nom ne reprendrait rien.
  Le dire explicitement vaudrait mieux que de le calculer.

---

## 14. Les explorations passent dans l'Atelier

**État :** fait. Les trois explorations vivent dans l'Atelier, sous « Explorations », entre le
Copilote et la Solidité. Le cerveau est resté dans la Mémoire, sous un bouton simple.

**Décision : on revient sur une décision.** La variante avait été mise dans
l'onglet Mémoire. C'était une erreur, et elle se nomme : **une variante est une
exploration, pas une mémoire**. On essaie, on ajuste, on recommence — puis on en
fait une proposition, et c'est la proposition qui devient de la mémoire. Rien de
ce qu'on essaie n'a sa place dans ce qui est tranché.

Le même raisonnement vaut pour **Auditer la mémoire** et pour l'**Étude
d'impact** : les deux explorent, aucune ne verse.

### Le critère, pour ne plus se tromper

> **La Mémoire ne contient que des écrans de lecture. Tout ce qui prépare une
> proposition vit dans l'Atelier.**

Il est net, il se vérifie sans discuter, et il donne la réponse d'avance pour les
écrans qu'on n'a pas encore écrits.

### Ce que ça donne

L'Atelier, de haut en bas — les trois explorations sont **au-dessus** des
utilitaires parce qu'elles les englobent : elles portent sur tout le projet,
alors qu'un utilitaire porte sur un sujet.

```
Copilote
Variante
Étude d'impact
Auditer la mémoire
──────────────
Solidité
  Neige, Vent & Gel
  Risques Naturels & Technologiques
  Fondations superficielles
  Spectre
Sécurité incendie
  …
```

La Mémoire garde : les fichiers, la recherche, le cerveau, et la barre latérale
des lectures.

### Ce qu'il faut surveiller

- La variante en cours vit en portée de module et **meurt au rechargement**
  (`services/variante-en-cours.js`). Le bandeau qui la signale continue de
  s'afficher **dans la Mémoire** quand on y retourne : c'est là qu'on lit sous
  variante, même si c'est dans l'Atelier qu'on la fabrique. « Lire la mémoire
  avec cette variante » pose donc la variante, puis change d'onglet.
- L'entrée « Tester » de la Mémoire a disparu : ses trois premiers items sont
  partis, et un menu déroulant à une seule entrée n'est plus un menu. Le cerveau
  est devenu un bouton simple, et il n'y a pas de doublon.

### Comment c'est fait

- `services/usages-du-rejeu.js` — la liste des quatre usages porte désormais
  `ou` : `OU.ATELIER` ou `OU.MEMOIRE`. Les deux écrans lisent la même liste
  plutôt que d'en tenir chacun la sienne (règle 4). Le module a quitté `views/ui`
  pour `services` : il ne dessinait plus rien.
- `views/studio/explorations/explorations.js` — l'hôte des trois écrans dans
  l'Atelier, avec **une seule** lecture de la mémoire pour les trois : trois
  lectures donneraient trois états, et on comparerait un impact mesuré sur l'un à
  une variante calculée sur l'autre.
- Les deux fenêtres — impact, audit — acceptent un `hote` et se dessinent alors
  sans voile, sans rôle de dialogue et sans croix de fermeture. Ce sont les mêmes
  fenêtres : les recopier en panneaux en aurait fait deux qui divergent.
- Les explorations ne se dessinent **qu'à la visite** : elles lisent la mémoire,
  et l'étude d'impact pose le curseur dans son champ de recherche — dessinées au
  montage, elles voleraient le clavier au Copilote.

### Ce qui reste ouvert

- L'écran de variante n'accueille toujours qu'**une** valeur essayée à la fois.
  Le déplacement ne change rien à cela, et l'essai de plusieurs valeurs reste
  à faire.

---

## 15. Ce qu'est une décision

*C'est l'essentiel qu'on avait oublié. La réflexion tient en trois questions :
qu'est-ce qu'une décision, où vit-elle, comment la rend-on explicite.*

### Ce qu'une décision n'est pas

**Ce n'est pas une proposition fusionnée.** Une proposition est l'**acte
d'enregistrement** ; la décision, elle, a eu lieu avant, dans une réunion, et
personne ne l'a écrite. Confondre les deux revient à ne connaître que les
décisions que Mdall a lui-même provoquées — une fraction minuscule de celles qui
font le projet.

**Ce n'est pas une valeur.** « Toiture en bac acier » est une valeur. Elle ne
devient une décision que si l'ardoise et la membrane étaient sur la table.

### Ce qu'une décision est : quatre parties, et l'une manque partout

1. **Une question.** Ce sur quoi on a tranché. Sans elle, il reste une valeur,
   et une valeur n'engage personne.
2. **Les possibles écartés.** C'est ce qui distingue une décision de tout le
   reste, et c'est exactement ce que personne ne retrouve six mois plus tard.
   *Le plus grand service que Mdall peut rendre est de garder ce qui a été
   écarté.* Quand quelqu'un demande « pourquoi pas de l'ardoise ? », la réponse
   existe quelque part dans la tête de trois personnes — ou nulle part.
3. **Un auteur et une date.** Déjà là, pour tout ce que Mdall garde.
4. **Un motif — ou l'aveu qu'il n'y en a pas.** Certaines décisions sont
   arbitraires : le choix d'une couleur, d'une trame, d'un nom. Écrire « choix du
   maître d'œuvre, sans justification technique » est plus honnête, et plus
   utile, qu'une justification fabriquée après coup (règle 5).

### Où elle vit : une ligne à part, et la valeur la cite

Deux façons de la modéliser, et il faut trancher.

- **(a) Une marque sur une affirmation** — « cette valeur a été choisie par un
  humain ». Simple, mais la question et les écartés n'y tiennent pas : ce ne sont
  pas des attributs d'une valeur, c'est le contenu même de la décision.
- **(b) Une nature à part entière**, qui **produit** des valeurs. La décision est
  sa propre ligne ; la valeur reste une donnée de base ou une hypothèse, et elle
  **cite** la décision qui l'a fixée.

**Recommandation : (b).** Et pour une raison qui n'est pas seulement esthétique :
c'est exactement ce que Mdall fait déjà pour les **règles**. Une règle est une
ligne, sa conclusion en est une autre, et la seconde cite la première. Une
décision est le pendant humain d'une règle — même forme, même lien, même écran
de raisonnement. On ne réinvente rien, on étend.

Conséquences à écrire : une septième extension — `.dec` — dans
[`extensions.md`](extensions.md), et une entrée « Décisions » dans la barre
latérale, dans l'ordre demandé :

```
Tout · Contraintes · Décisions · Raisonnements · Constats · Hypothèses · Données de base
```

### Premier temps — *fait* : l'entrée vide qui dit pourquoi

Avant tout modèle, les deux entrées sont entrées dans la barre latérale et
affichent la vérité du moment : *« Le projet n'a encore enregistré aucune
décision. Ce n'est pas qu'il n'en a pas pris — c'est que Mdall ne savait pas
encore les garder. »* Une lacune nommée vaut mieux qu'une absence silencieuse
(règle 5), et c'est ce qui rend l'étape suivante évidente à tout le monde.

Le rail lit désormais, de haut en bas :

```
Tout · Contraintes · Décisions · Raisonnements · Constats · Hypothèses · Données de base
```

**Ce que l'étape a posé, et rien de plus.**

- `NATURE.DECISION` et `NATURE.RAISONNEMENT` sont **déclarées** dans le
  vocabulaire (`services/assertion-taxonomy.js`), avec ce qui les tranche : un
  **arbitrage** pour l'une — un cinquième `SETTLED_BY` —, rien pour l'autre, qui
  n'affirme pas, elle dit par où l'on est passé.
- **Rien ne les produit.** Aucun `kind` ne s'y rattrape, aucun écran ne les
  écrit : le rattrapage par provenance ne les invente pas, et un test le tient.
- Les deux lectures s'écrivent comme les autres — `nature:décision` se tape dans
  la barre et rend zéro ligne, ce qui est exact. Le jour où l'étape 8 en verse,
  elles se remplissent sans qu'on touche à un filtre.
- L'ordre du rail est **celui des natures** (`NATURES`), et il n'y en a qu'un :
  le menu des filtres suit le même. Deux ordres finiraient par ne plus se
  ressembler.
- Le dossier de contexte nomme le vocabulaire entier dans sa légende, décision
  comprise, mais **n'écrit aucun bloc vide** : un titre « Décision » sans ligne
  ferait croire que le projet n'a rien tranché.

Deux fautes de français dormaient à côté et sont parties avec : « on ne se
prononce pas sur *une* constat » — l'article vit maintenant avec le nom —, et la
phrase « rien ne *la* tranche : elle sert de matière », écrite pour l'intendance,
qui aurait été deux fois fausse sur le raisonnement.

**Ce qui n'est pas fait**, et qui est l'étape 8 : ce qui écrit une décision — le
`.dec`, la forme de sa charge (question, écartés, motif), le repérage par le
copilote, la signature. Les deux suffixes réservés sont nommés dans
[`extensions.md`](extensions.md) pour que personne n'en invente d'autres.

### Comment la rendre explicite : le copilote propose, un humain signe

Les décisions se cachent dans les comptes rendus de réunion de conception et de
chantier, dans les fils de sujets, dans les courriels. Le copilote sait les y
**repérer** ; il ne sait pas les trancher.

Le mécanisme respecte la règle 1 sans exception :

```
compte rendu → copilote propose des décisions candidates
             → l'atelier les met en forme (question, écartés, motif)
             → une proposition
             → la mémoire
```

Ce que le modèle produit est une **lecture proposée**, jamais une valeur. Il
souligne un paragraphe et dit « ceci ressemble à une décision : voici la
question, voici ce qui semble avoir été écarté, voici qui semble avoir tranché ».
Chacune de ces trois choses est **corrigeable**, et rien n'entre sans signature.

### Fermer un sujet est une décision — *tranché*

Aujourd'hui, fermer un sujet ne laisse qu'un état. C'est perdre exactement
l'information qu'on cherche. La fermeture doit demander : **qu'a-t-on tranché ?**
— et ce qu'on répond devient une décision, avec sa question et ses écartés.

**C'est acquis** : la question a été posée et la réponse est oui. Reste à
l'implémenter avec le modèle, à l'étape 8 — et à respecter la consigne
permanente : aucun sujet réel ne s'ouvre ni ne se ferme automatiquement.

### Questions ouvertes, à trancher avant d'écrire du code

- Une décision peut-elle être **révisée** ? Oui — mais alors elle se reverse
  par-dessus (règle 11), et la première reste lisible avec sa date. Une décision
  révisée est une information de premier ordre.
- Une décision porte-t-elle une **zone** ? Oui, comme tout le reste.
- Que fait-on des décisions **anciennes** d'un projet en cours ? On ne les
  invente pas. Le copilote les propose à partir des documents versés, et le reste
  reste inconnu — et se dit.

---

## 16. Ce qu'est un raisonnement

### Ce qu'il n'est pas

Mdall sait deux choses aujourd'hui : la **règle** (`.ref`, conditions →
conclusion) et la **fonction native** (agent-D). Les deux sont **déterministes** :
mêmes entrées, même sortie, toujours. Un enchaînement de fonctions dépendantes
l'est aussi.

Or un raisonnement de projet ne l'est pas, et c'est tout le sujet.

### Ce qu'il est : une chaîne qui traverse des décisions

> **Un raisonnement est une suite d'étapes dont certaines sont des décisions
> humaines.**

Il avance logiquement, il bute sur un choix que rien ne détermine — une couleur,
une trame, une valeur retenue dans une fourchette —, quelqu'un tranche, et il
repart. C'est exactement la forme de l'enchaînement qu'on vient de dessiner pour
la variante, mais **versé** et **relu**, pas seulement affiché pour un essai.

### Le point dur, et c'est là que le produit vaut cher

**Un raisonnement qui traverse une décision ne se rejoue pas tout seul.**

Si l'altitude change, la chaîne se rejoue jusqu'à la décision — puis elle
s'arrête et dit :

> Ici, le 12 mars, Marie a retenu **H0 = 0,50 m** entre 0,45 et 0,55.
> Ce choix tenait sous une altitude de 13 m. Tient-il encore à 800 m ?

C'est le « à revérifier » d'aujourd'hui, mais avec **un nom, une date, une
question précise et les possibles d'origine**, au lieu d'un doute général. Savoir
quelles décisions humaines une donnée nouvelle remet en cause est probablement ce
que Mdall a de plus à offrir à un projet — et personne d'autre ne le fait.

### Ce qu'un raisonnement porte

- ses **étapes**, dans l'ordre : règle, fonction native, décision ;
- ses **liens** : ce que chaque étape lit et écrit — le composant
  `views/ui/enchainement.js` le dessine déjà ;
- pour chaque décision : **la question, les écartés, qui, quand** ;
- **où il s'est arrêté** la dernière fois qu'on l'a rejoué, et pourquoi.

Une huitième extension — `.rai` — et une entrée « Raisonnements » dans la barre
latérale.

**L'entrée existe depuis l'étape 2** ; elle est vide et le dit. Le reste — ce
qu'un `.rai` contient, comment un raisonnement se verse, comment il s'arrête sur
une décision quand on le rejoue — est l'étape 9.

### Ce qu'on ne fera pas

Deviner les raisonnements à partir du graphe de dépendances. Le graphe donne les
chaînes **déterministes** ; il ne saura jamais qu'entre deux d'entre elles
quelqu'un a choisi. Un raisonnement se **verse**, comme le reste.

---

## 17. La proposition devient une branche

### Ce qu'on cherchait vraiment

L'idée de branche revient — et le débat d'alors partait d'une mauvaise analogie.
**On n'a pas besoin de deux réalités parallèles** comme dans le développement
logiciel : une seule mémoire, une seule vérité, c'est le principe.

Ce dont on a besoin est plus simple et plus utile : **une proposition qui ne soit
pas mono-action**. On l'ouvre, on l'enrichit d'une modification, puis d'une
autre, et quand elle est complète on la fusionne. Une branche est donc **une
proposition ouverte à laquelle on attache des modifications**. Plusieurs peuvent
vivre en même temps.

### Le geste

Le bouton « Faire une proposition » se dédouble :

```
Faire une proposition ▾
  ├── Créer une proposition
  └── Ajouter à une proposition ouverte ▸  #58 Reprise des fondations
                                           #61 Mise à jour incendie
```

### Ce que ça entraîne, et qu'il faut traiter

- **Le diff devient cumulatif.** Une proposition montre l'écart entre la mémoire
  et l'ensemble de ce qu'elle porte, pas la dernière modification.
- **Deux branches qui touchent le même sujet.** Le conflit se **dit** avant la
  fusion — jamais résolu en silence. Le mécanisme existe déjà pour les domiciles
  de noms (`services/memoire-domiciles.js`) ; c'est la même discipline.
- **La variante alimente une branche.** « Ajouter cet essai à la proposition
  ouverte » est la sortie qui manquait à l'écran de variante.
- **Une branche est visible de l'équipe**, contrairement aux conversations avec
  le copilote qui restent privées, sans exception.
- **Une branche vieillit.** Une proposition ouverte depuis trois semaines sur une
  mémoire qui a bougé doit le dire — `laMemoireABouge` sait déjà répondre à cette
  question pour une variante.

---

## 18. Le titre et le corps d'une proposition

### Le défaut, mesurable

Vingt-cinq propositions intitulées « Fondations superficielles — dimensionnement »
ou « Incendie — étude du 6 septembre 2026 ». Six mois plus tard, la liste ne dit
plus rien, et retrouver *la* proposition qui a descendu les massifs demande de
les ouvrir une à une.

### Ce qu'un modèle fait ici, et ce qu'il ne fait pas

Il reçoit le **diff** — ce qui change, de quelle valeur à quelle valeur, dans
quelle zone — et il écrit un titre et un résumé. Trois garde-fous, les mêmes que
partout :

- **il ne produit aucune valeur.** Il redit ce que le diff contient ; un chiffre
  qui viendrait de lui serait indiscernable des autres à l'écran ;
- **il est éditable avant l'envoi**, et le titre proposé est marqué comme
  proposé ;
- **il tourne au serveur**, jamais dans le navigateur.

Le titre qu'on veut : *« Massifs du bâtiment A descendus à 0,66 m après relevé
d'altitude »*. Pas *« Fondations superficielles — dimensionnement »*.

---

## 19. La localisation et les zones se changent par proposition

Aujourd'hui, la localisation du projet et son découpage en zones se changent
**hors mémoire**. Deux conséquences, et la seconde est pire :

- on perd le **qui, quand, pourquoi** sur la donnée la plus structurante du
  projet ;
- **rien ne se recalcule**, alors que changer la commune change la neige, le
  vent, le gel et la zone sismique — donc les fondations et le spectre.

Les deux deviennent des affirmations du socle, et se changent comme tout le
reste : par une proposition. Une zone **retirée** est déjà traitée
([§ 13](#13-retirer-ce-quune-ancienne-version-dutilitaire-a-versé)) : ce qui ne
valait que pour elle quitte le présent, avec son motif.

---

## 20. Neige, vent et gel aux standards, puis le spectre

**État :** neige, vent et gel sont faits. Le spectre reste à faire.

L'utilitaire « Neige, Vent & Gel » était antérieur aux standards actuels —
entrées déclarées, sorties déclarées, appel à un agent-D, rejeu. Il est découpé
en **deux agents**, et pas trois :

| agent | ce qu'il lit | ce qu'il pose |
| --- | --- | --- |
| **zones climatiques** | la localisation | zone de neige, zone de vent |
| **profondeur hors gel** | la localisation, l'altitude | la cote hors gel, le H0 retenu |

Le premier ne lit qu'une commune ; le second lit une altitude, et c'est lui seul
qu'une variante d'altitude concerne. Les tenir ensemble aurait rejoué les tables
communales à chaque mètre essayé, pour rien.

Le serveur, lui, garde ses **trois** clés — `snow`, `wind`, `frost` — et c'est
juste : les zonages neige et vent ne sont pas révisés ensemble, chacun a son
fichier et sa version. Un **agent** est un appel ; un **utilitaire** est la
lecture d'un des sujets que cet appel pose. Les confondre revenait soit à perdre
l'appel — c'est ce qui se passait —, soit à ne plus pouvoir monter la version
d'un seul zonage.

### Ce qui manquait, et que l'étape referme

L'écran calculait bien ; rien de ce qu'il faisait ne s'écrivait comme un
raisonnement.

- **L'appel n'existait nulle part.** Cinq valeurs entraient dans la mémoire,
  chacune seule, sans que rien dise qu'un même calcul les avait posées ensemble.
- **Son entrée non plus.** La commune vivait dans le formulaire du projet, pas
  dans sa mémoire : on ne pouvait ni la relire, ni la faire varier, ni savoir
  laquelle avait servi.
- **Rien ne se rejouait.** La reprise ne reconnaissait qu'un `kind` — celui du
  versement automatique depuis les faits de contexte — et laissait de côté tout
  ce qui entre par une **proposition**, c'est-à-dire le chemin normal. Une zone
  de neige signée citait pourtant son utilitaire, sa version et ce qu'elle avait
  lu : tout était là, et rien ne la reprenait. Ce qui décide est désormais ce
  dont on a besoin pour refaire — l'utilitaire cité, et ce qu'il sait faire.

### Ce que l'étape a posé

- `utilitaires/agents-climatiques.js` — les deux agents, leurs entrées, leurs
  sorties. Une sortie qui renvoie à un outil (`{ outil: "snow" }`) prend le sujet
  de l'utilitaire qui la déduit ; celles qu'aucun utilitaire ne déduit — le H0 de
  la table départementale — se déclarent en entier. **Chaque sortie déclare aussi
  la clé du résultat où elle se lit** : `frost_depth_m` n'est pas `frost_depth`,
  et deviner l'une depuis l'autre lisait un champ absent sans le dire.
- `services/climat-versement.js` — huit lignes, dans l'ordre de la chaîne : la
  localisation, l'altitude, l'appel des zones, ce qu'il pose, l'appel du gel, ce
  qu'il pose. C'est cette forme qui rend la chaîne rejouable.
- **La localisation se saisit**, sur l'écran, pré-remplie par le projet et
  modifiable. Le calcul refuse de partir sans le code INSEE et le dit à côté du
  champ : « code_insee is required » n'était une phrase pour personne.
- L'altitude cesse d'être versée comme un **produit** des zonages. Le serveur ne
  la calcule pas, il la reçoit ; l'écrire comme une sortie faisait de la chaîne
  climatique une boucle sur elle-même.
- Les cartes de l'écran écrivent leurs nombres **comme la mémoire les écrira** —
  virgule, unité : « 0.894 » d'un côté et « 0,89 m » de l'autre auraient fait
  chercher longtemps d'où venait la différence.

Les calculs restent au serveur, sans exception.

### Ce qui reste : le spectre

Aux mêmes standards. Il lit la zone sismique, la classe de sol et la catégorie
d'importance — trois champs que la déclaration des fondations nomme déjà — voir
[`variante-lecture.md`](variante-lecture.md). Son calcul, lui, est aujourd'hui
dans le **navigateur** (`vendor/utilitaires/seismic-spectrum.js`, copié au build)
et c'est la première question à trancher : y reste-t-il, puisque la courbe se
trace à l'écran, ou passe-t-il au serveur comme les autres ?

---

## 21. La cascade parallèle, la démonstration

```
Localisation du projet
 ├── Altitude ──────► Profondeur hors gel ──────► Fondations
 └── Zone sismique ─► Spectre
```

Une seule valeur changée, deux chaînes qui partent, quatre utilitaires rejoués.
C'est la démonstration que le produit existe.

**Ce qui manque techniquement est petit et précis :** l'enchaînement livré est
une **file**, et il faut un **arbre**. Le composant sait dessiner une suite de
boîtes reliées ; il lui faut le **rang** de propagation, pas seulement l'ordre du
rejeu. Les arêtes existent déjà (`lecturesDeLaRegle`, `sortiesDeLaFonction`, le
`lit` de chaque utilitaire) ; il ne manque que le trait qui fourche.

---

## 22. Le cerveau, requalifié

Le cerveau a bien sa place dans la Mémoire, mais il est mal nommé dans les têtes :
ce n'est pas une vue de la mémoire, c'est **le cerveau du projet — mémoire plus
raisonnements**. Il prendra tout son sens quand les décisions et les
raisonnements y seront ([§ 15](#15-ce-quest-une-décision),
[§ 16](#16-ce-quest-un-raisonnement)) : une décision y sera un nœud d'un genre
nouveau, celui où la chaîne s'arrête et où quelqu'un a tranché.

Deux manques, et ils vont ensemble :

- **il ignore le filtre.** La barre latérale filtre la liste, pas le dessin. On
  doit pouvoir ne voir que les raisonnements, que les contraintes, que le domaine
  incendie ;
- **il n'y a pas de bascule.** La même sélection doit se lire en tableau ou se
  voir en cerveau — le tableau pour lire, le cerveau pour voir.

**Un seul état de filtrage, deux rendus.** Deux filtres finiraient par diverger
(règle 4), et l'on croirait voir la même chose sans la voir.

---

## 23. Incendie habitation, finir

Reprendre l'utilitaire pour régler les détails et compléter les manques. Sans
dépendance avec le reste du plan : il se glisse entre deux étapes.

À faire d'abord, quand on l'ouvrira : lister ce qui manque, précisément, plutôt
que de le reprendre au fil de l'eau. Un manque nommé se corrige ; un manque
ressenti se repousse.
