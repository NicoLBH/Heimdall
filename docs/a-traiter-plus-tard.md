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

## 1. Les utilitaires nommeront leurs sources

**État :** ouvert · **Nature :** chantier serveur · **Débloque :** la dernière
part du rejeu, et la fin de la table `RELECTURES`.

### Le problème

Une règle Mdall dit ce qu'elle lit : ses conditions portent des sujets, et
depuis l'étape 1 chaque lecture est enregistrée avec l'affirmation qu'elle
désignait. Un **utilitaire**, non.

`deduction_profondeur_hors_gel_altitude_V1` lit un *fait de contexte* —
`fact_value.frost_depth_m`, `inputs.altitude` — produit par
`resolve-climate-tool` au serveur. Ce fait n'est pas une affirmation de la
mémoire : il n'a pas d'identifiant à citer. La contrainte qui en sort garde donc
l'altitude **comme un nombre**, pas comme un lien vers la donnée de base que le
projet a versée.

Trois conséquences, aujourd'hui :

- une donnée de base employée **uniquement** par un utilitaire n'apparaît dans
  aucun compte d'emplois — `données-de-base.ddb` la donne pour « aucun emploi »
  alors que la cote hors gel repose dessus ;
- l'étude d'impact ne voit pas ce chemin-là : elle dit « rien ne repose sur
  l'altitude » à un projet dont la moitié des fondations en dépend ;
- la variante doit passer par `RELECTURES`, une table de correspondance écrite à
  la main dans `variante-utilitaires.js`, qui redit en JavaScript ce que
  l'utilitaire sait déjà faire. Depuis l'étape 6 du plan, ce fichier ne contient
  plus **que** cela : le reste de la variante s'appuie sur le moteur de rejeu, et
  ce qui reste est nommément une exception, prête à être supprimée le jour où ce
  chantier sera fait.

### Ce qu'il faut faire

Que **le producteur nomme sa source**. Quand `resolve-climate-tool` écrit un
fait de contexte, il connaît la donnée de base dont il s'est servi : il doit
l'écrire à côté du nombre.

```
fact_value: {
  frost_depth_m: 0.93,
  inputs: { altitude: 13 },
  sources: { altitude: "<assertion_id>" }     ← ce qui manque
}
```

À partir de là, tout retombe dans le chemin commun : `plannedConstraintRows`
recopie `sources` dans le `payload` de la contrainte, et
`memoire-applications.js` en fait des lectures enregistrées comme les autres,
avec leur rang et leur zone. L'index dans les deux sens, l'étude d'impact et le
plan de recalcul n'ont **rien** à changer — la colonne `utility` et
l'`input_assertion_id` nullable de `assertion_applications` ont été posés pour
ça.

### Pourquoi ce n'est pas une étape du plan

Parce que ce n'est pas le même côté. Le plan de `rejouer-la-memoire.md` est
entièrement dans le navigateur et dans la mémoire ; celui-ci touche une fonction
serveur, sa table de zonage, et le format des faits de contexte déjà écrits — il
demandera une reprise de l'existant, et il ne se vérifie pas de la même façon.
Le mélanger aux étapes 1 à 6 aurait fait dépendre un chantier client d'un
déploiement serveur.

### Ce qui se passe si on le laisse

Rien ne casse. Le rejeu marche pour tout ce que les règles produisent — c'est le
gros —, et les utilitaires restent au rang **opaque**, nommés, jamais recalculés
en douce. C'est honnête, et c'est déjà ce que l'écran dit.

Le coût est un angle mort : sur un projet où le raisonnement passe surtout par
des utilitaires plutôt que par des règles, la couverture affichée sera basse et
la variante rendra peu. Le chiffre le dira lui-même — c'est à cela qu'il sert.

### Ce qu'il ne faut pas faire en attendant

**Rapprocher `inputs.altitude` d'une donnée de base par le nom.** « altitude »
n'est pas « Altitude du site », et deviner ici referait exactement l'erreur que
l'étape 1 a corrigée : un lien qui a l'air établi et qui n'est qu'une
ressemblance.

**Allonger `RELECTURES`.** Elle porte deux cas parce qu'ils servent la
démonstration ; un troisième voudrait dire qu'on réécrit le serveur dans le
navigateur, un utilitaire à la fois.

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
