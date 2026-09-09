# Les fondamentaux

Ce qui suit ne se discute pas au cas par cas. Ce sont les règles dont tout le
reste dépend, et une fonctionnalité qui en contredit une est fausse même si elle
marche.

---

## 1. Rien n'entre jamais directement dans la mémoire du projet

**Aucun écran, aucun utilitaire, aucun calcul, aucun modèle n'écrit dans la
mémoire du projet.** La seule voie est une **proposition**, et c'est un humain
qui la signe.

Ce n'est pas une précaution de plus : c'est ce qui donne sa valeur à la mémoire.
Une écriture directe perdrait quatre choses d'un coup.

- **L'histoire.** Une proposition dit ce qui a changé, et par rapport à quoi.
  Une écriture directe laisse une valeur nouvelle sans rien pour la comparer à
  l'ancienne.
- **La responsabilité.** Quelqu'un assume le changement, avec son nom et sa
  date. « L'utilitaire l'a écrit » n'est pas une réponse en réunion.
- **Les conflits.** Une proposition se confronte à ce que le projet a déjà
  décidé, et les contradictions se règlent **avant** d'entrer, pas après.
- **Le retour en arrière.** On pourra défaire une proposition — *on avance en
  défaisant, on ne recule jamais*. On ne défait pas une écriture qui n'a jamais
  été un acte.

### Le chemin, et il n'y en a pas d'autre

```
Copilote            l'Atelier              la Proposition            la Mémoire
on discute,   →   on entre dans le    →   ce qui a changé,      →   ce que le
on échange,       détail, on produit      qui l'assume, les         projet tient
on réfléchit      de la matière           conflits arbitrés,        pour vrai
                  exploitable             la signature humaine
```

Une étape intermédiaire existe et compte autant : **le sujet**. On y débat avec
l'équipe du projet avant de proposer quoi que ce soit.

> L'architecte : « Socotec, j'ai mis 2 niveaux sous le niveau de référence,
> pouvez-vous confirmer ? »
> Socotec : « Non, le premier niveau n'est pas comptabilisé, les secours peuvent
> y accéder : un seul niveau de sous-sol. »
> L'architecte : « Ok, je modifie, je ferme le sujet et je fais une proposition
> dans ce sens. »

Il met alors ses données à jour dans l'utilitaire, il recalcule, **puis** il
transforme en proposition — et c'est là que les tests, la détection de conflits,
leur arbitrage et la signature ont lieu.

### Défaire, c'est proposer de plus

Une proposition fusionnée se **défait**, depuis la ligne qui raconte sa fusion.
Rien n'est effacé et rien n'est rejoué à l'envers : le geste prépare **une
proposition de plus** — celle qui remet ce qui valait avant — et quelqu'un la
signe. La mémoire portera l'aller *et* le retour, ce qui est exactement ce qu'on
veut relire six mois plus tard.

Deux cas, et le second compte autant que le premier :

- l'affirmation en remplaçait une autre → on remet **celle d'avant**, telle
  qu'elle était écrite ;
- elle n'en remplaçait aucune → elle est **écartée**. Elle reste lisible ; un
  refus est une information.

Ce qu'on ne défait pas : une affirmation qu'une décision **plus récente** a déjà
remplacée. La défaire ressusciterait une valeur périmée par-dessus un choix
postérieur que personne n'a demandé d'annuler. La proposition le dit, plutôt que
de laisser croire à un retour en arrière complet qui n'a pas eu lieu.

### Un retrait est un refus

Sortir un document du corpus, écarter une affirmation : c'est le même geste, et
le vocabulaire existait déjà. Un **item refusé** — un document refusé passe hors
corpus, une affirmation refusée entre en mémoire comme écartée. Rien n'est
effacé : le fichier reste en base, visible et marqué, et l'on sait quand et par
qui.

C'est ce qui manquait pour oser déposer. Un document ajouté par erreur n'avait
aucune correction, et la seule issue était de vivre avec.

### On ne signe pas sans savoir ce que le projet dit déjà

Une proposition qui n'affiche que ce qu'elle apporte demande de connaître par
cœur l'état de la mémoire. Personne ne le connaît. L'onglet **Changements**
montre donc les deux valeurs côte à côte, une ligne par sujet — ce que le projet
dit aujourd'hui, ce que la proposition en dirait — et l'écart se lit sans rien
ouvrir.

Quatre lectures, et une seule demande une décision :

| Ce qu'on voit | Ce que ça veut dire |
| --- | --- |
| la colonne de gauche est vide | une **entrée nouvelle** |
| les deux diffèrent | une **correction** — c'est pour elle que le tableau existe |
| la colonne de droite est vide | un **retrait** |
| les deux disent la même chose | rien ne change, et on l'affiche quand même |

Sur une proposition **fusionnée**, « aujourd'hui » mentirait : la mémoire porte
déjà ce que la proposition a écrit, et les deux colonnes afficheraient la même
valeur. On lit alors ce qu'elle a réellement écrit et ce que cette écriture
remplaçait — l'histoire est en base, il suffit de la lire au bon endroit.

Et si la mémoire n'a pas pu être lue, aucune ligne ne se prétend nouvelle : une
lecture ratée qui afficherait « le projet ne dit rien » ferait signer douze
corrections prises pour douze ajouts (règle 5).

### Ce que cela impose au code

- Un écran d'Atelier propose un bouton **« Transformer »**, jamais un bouton qui
  écrit. Ses deux issues sont *ouvrir un sujet* et *faire une proposition*.
- Le système **prépare** la proposition à partir de la matière produite dans
  l'Atelier : il la remplit, il ne la signe pas. Elle reste ouverte jusqu'à ce
  que quelqu'un la fusionne.
- `rememberProposition` est la porte de la mémoire. Les chemins
  `rememberHypothesis` et `rememberBaseDatum` restent réservés à la déclaration
  faite **à la main** dans l'écran Mémoire, où l'auteur est présent et signe par
  son geste. Aucun utilitaire ne les appelle.

---

## 2. Ce qui est dérivé se recalcule, ce qui a été décidé se conserve

Un degré coupe-feu se recalcule tant qu'il sert à décider : le référentiel
progresse, et une valeur gelée deviendrait fausse sans le dire. Le jour où
quelqu'un le **retient** — il l'écrit dans la notice, il l'annonce au maître
d'ouvrage —, ce n'est plus une lecture, c'est une décision : elle passe par une
proposition, et elle se conserve.

Corollaire : une base ne conserve jamais un résultat de calcul. Elle conserve
les **réponses** qui l'ont produit, et le calcul se refait.

---

## 3. Une conversation avec le copilote est privée

Elle appartient à qui l'a ouverte, dans les deux sens, et aucun collaborateur du
projet ne la voit. Ce n'est pas un réglage : c'est une propriété de la
construction — la table le refuse.

Ce qu'on veut partager se **transforme** : « Créer un sujet à partir de la
discussion » ouvre un sujet visible par l'équipe, dont les messages deviennent
des commentaires. Le geste est explicite, et c'est ce qui permet de parler
librement au copilote le reste du temps.

---

## 4. Une valeur écrite à deux endroits finit par diverger

Quand deux fichiers doivent porter la même liste et ne peuvent pas s'importer
l'un l'autre, **un test les compare**. Une divergence casse la construction
plutôt que de se découvrir six mois plus tard.

---

## 5. Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien

Un écran qui n'a pas pu lire dit qu'il n'a pas pu lire. Il n'affiche pas une
liste vide, il ne remplit pas un champ d'une valeur plausible, et un modèle
n'invente jamais une entrée de calcul : il la demande, ou il s'en passe et le
dit.

---

## 6. Une mémoire de projet ne garde pas que des valeurs

Un projet ne se souvient pas d'une liste de chiffres. Il se souvient de ce qu'on
a **décidé**, de ce qu'on **suppose** en attendant mieux, de la **règle** qui a
produit une valeur, de la **preuve** qui la fonde, et de l'**état** de tout cela
aujourd'hui.

Ces cinq objets ne se mélangent pas — la donnée, sa valeur, la règle, la preuve,
le statut. Le langage les sépare, et `docs/langage-mdall.md` en porte la
grammaire entière.

```
zone: Bâtiment A {
   Classement du bâtiment = "3e famille B" {
      règle: Classement du bâtiment — arrêté du 31 janvier 1986, article 3, 3°)
      statut: retenu
   }
}
```

Quatre conséquences pour le code :

1. **La règle a son propre fichier, et le projet en garde un instantané.** Une
   règle vaut pour mille bâtiments, une valeur pour un seul : les mêler
   produisait des règles fabriquées à partir des cotes du projet — `si hauteur =
   26` là où l'arrêté dit `<= 28 m`. Mais elle doit être **dans** le projet,
   dans un `.ref`, sans quoi le renvoi `règle: …` pointe vers rien, le graphe ne
   se reconstruit pas, et un arrêté modifié plus tard réécrirait l'histoire en
   silence — ce que la règle 2 interdit.
2. **Le mot-clé de provenance est l'origine.** `règle:` est déduite,
   `document:` est lue, `calcul:` est calculée. Un champ « origine » à côté
   redirait la même chose et finirait par la contredire (règle 4).
3. **Rien ne se recopie de ce qui se déduit.** Les dépendances sortent des
   conditions de la règle : les écrire aussi les laisserait diverger le jour où
   quelqu'un modifie la règle sans y penser.
4. **Rien ne s'invente.** Un « parce que » fabriqué serait pire que pas de
   « parce que », puisqu'on le citerait en réunion (règle 5). Un utilitaire qui
   ne sait pas pourquoi écrit la valeur, et c'est tout.

---

## 7. Le texte est la mémoire, dans les deux sens

```
lire(écrire(G)) = G
```

Chaque information du graphe apparaît une fois dans le texte, et rien de
déductible n'y apparaît. Un test le vérifie.

Cette loi n'est pas une élégance : c'est ce qui permet à un architecte d'écrire
trois lignes à la main et de les injecter, et c'est ce qui fait qu'un utilitaire
nouveau n'a rien à brancher — il écrit du mdall, comme tous les autres.

Elle interdit aussi quelque chose : **on n'ajoute au langage aucune information
qu'on ne saurait pas relire.** Toute construction nouvelle passe d'abord par ce
test.

Elle impose enfin que **tout se tape au clavier**. Un langage qu'un architecte
doit pouvoir écrire à la main ne peut pas exiger une table de caractères : les
marques `§`, `¶`, `←`, `≤` sont devenues des mots suivis de deux points. La
grammaire entière est dans `docs/langage-mdall.md`.

Ce qui n'est pas compris n'est jamais avalé en silence. La lecture rend la
ligne, son numéro et la raison du refus — un fichier amputé qui entrerait sans
bruit en mémoire serait pire qu'un fichier refusé.

---

## 8. Les sources vivent dans Fichiers, la mémoire s'exécute

L'onglet **Fichiers** porte les **sources** du projet, et elles sont de même
nature qu'elles viennent d'un PDF ou de l'application : un plan déposé, une
valeur relevée, une règle appliquée, une décision signée sont toutes des choses
à partir desquelles le projet se reconstruit. Deux racines, et pas une de plus :
`Mémoire/` pour ce que l'application écrit, `Documents/` pour ce que
l'utilisateur dépose.

L'onglet **Mémoire** ne stocke rien. Il *exécute* ces sources comme un
navigateur exécute le dépôt : il cherche, il croise, il remonte les
dépendances, il exporte. Tout ce qu'il montre se recalcule depuis les fichiers
— ce qui est exactement la règle 2, appliquée à l'écran.

Deux conséquences pour le code :

1. **Ce qui agit sur les documents ne s'affiche que sur les documents.** Le
   menu et le bouton « Déplacer » n'apparaissent pas dans `Mémoire/` : on ne
   déplace pas à la main un fichier que l'application écrit.
2. **Aucun écran de la mémoire n'a d'état à lui.** Un pliage de bloc, un
   chemin, un mode de lecture sont des vues ; les effacer ne perd rien.

---

## 9. Une règle se lit, une fonction native ne se lit pas — et le dit

Mdall écrit le raisonnement d'un projet en clair. Une règle d'incendie s'écrit
`si (Hauteur ≤ 28 m) alors ("3e famille B")`, avec son article et sa citation :
sa loi est publique — c'est un arrêté —, et l'écrire est ce qui permet de la
rejouer, de la contester et de la voir vieillir quand le texte change.

Certains utilitaires n'ont pas cette loi-là. Un pré-dimensionnement de
fondations superficielles parcourt trois cent quatre-vingt-huit combinaisons,
pondère, compare des portances, choisit un ferraillage : **sa loi est le
produit**. L'écrire dans le fichier d'un projet reviendrait à la donner, et un
projet exporté la donnerait à qui l'ouvre.

On ne peut pas non plus le cacher. Une fois employé, il a décidé de cotes que le
client paiera en béton. Les taire ferait de la moitié du raisonnement un trou —
et « ne pas savoir n'autorise pas à prétendre qu'il n'y a rien » (règle 5).

**Un tel utilitaire est donc une fonction native du langage.**

```
fonction native Prédimensionnement des fondations superficielles(Bâtiment A, Profondeur hors gel) {
   // Dimensionne les massifs superficiels d'une zone : descente de charge,
   // combinaisons, portance du sol, glissement, renversement et ferraillage.
   // La loi de calcul appartient à l'utilitaire — elle ne s'écrit pas ici.

   importe (variable: Profondeur hors gel, depuis: Sol/climat.ctr, zones: Bâtiment A);

   résultat = calcul natif (utilitaire: dimensionnement_fondations_superficielles, version: V1);

   enregistre (
      Section Lx de la semelle File A: 1,20 m,
      Section Ly de la semelle File A: 1,20 m,
      Hauteur de la semelle File A: 0,90 m,
      Vérification de la semelle File A: "vérifiée",
      dans: Structure/fondations.ctr,
      zones: Bâtiment A
   )
}
```

### Ce qui ne change pas, et c'est l'essentiel

Le commentaire dans la fonction, les `importe`, l'`enregistre`, la portée en
premier paramètre : tout ce que Mdall lit d'une fonction se lit de celle-ci
exactement pareil. Elle compte dans les fonctions, ses variables comptent dans
les variables, le cerveau la dessine comme un nœud de raisonnement — parce
qu'elle en est un —, et l'onde de choc la traverse.

### Ce qui change, et c'est une ligne

Là où une règle enchaîne ses `si … alors`, celle-ci dit `résultat = calcul natif
(…)`. Le mot `native` sur la première ligne l'annonce : **on ne cherchera pas un
corps qui manque, on saura qu'il n'y en a pas à lire.** Un blanc dans un fichier
se lit comme un oubli ; une ligne qui dit « la loi est ailleurs, la voici
nommée » se lit comme une décision.

L'utilitaire et sa version sont écrits, et c'est ce qui permet de refaire le
calcul — en le **redemandant**, jamais en le recopiant. Six mois plus tard, on
saura avec quoi ces cotes ont été trouvées.

### Une fonction native pose plusieurs sujets

Une règle conclut sur son propre nom : « Classement du bâtiment » conclut le
classement. Un calcul qui dimensionne vingt massifs pose cent quarante cotes, et
aucune ne porte le nom de la fonction. Trois endroits du code en dépendent, et
le manquer coupait la chaîne en silence :

| où | ce qu'il faut lire |
| --- | --- |
| `memoire-applications.js` | les lectures se rattachent à **chaque** sortie |
| `memoire-plan.js` | une valeur produite par la fonction est **dérivée**, pas du socle |
| `memoire-evaluateur.js` | elle est **indécidable** au navigateur : sa loi n'est pas dans le texte |

Ce dernier point est le garde-fou. Sans lui, une fonction sans conditions
s'évaluait sur zéro condition, donc « vraie », et le rejeu annonçait qu'elle
tient — sans avoir rien calculé. Une confirmation qu'on n'a pas obtenue est pire
qu'un silence : elle apprend à croire l'écran.

### Ce que cela n'autorise pas

Le mot `native` n'est pas une porte de sortie pour ce qu'on n'a pas eu le
courage d'écrire. Il se justifie par **une** raison, et elle se dit en une
phrase : la loi est le produit. Une règle qu'on trouve fastidieuse à transcrire
reste une règle, et s'écrit.
