# JACK22 9.0 candidate (cinq outils) — contre-expertise de Claude

ZIP contrôlé : `JACK22-9.0-CINQ-OUTILS-CANDIDATE.zip`. Les quatre copies dans Téléchargements sont identiques (SHA-256 fe6ae6af…). Rien n'a été modifié dans ce ZIP.

## Corrections appliquées (accord de Bob : « Oui, tout »)

Version livrée : `JACK22-9.0-CANDIDATE-CORRIGEE.zip`. Le HTML de ChatGPT est inchangé (empreinte d4409c34… contrôlée) ; un seul bloc est ajouté à la fin (`claude90Styles` et `claude90Module`, copie dans `sources/claude90-fix.html`).

1. **Accueil identique à la 8.9 validée.**
   - Les outils de l'arrangement passent dans le menu « Réglages ▾ » de la timeline, sur une ligne ÉDITION : « Inspecter · Annuler · Rétablir », puis le zoom « − 100 % + · Tout voir · Taille normale ».
   - Le bouton « 100 % » devient « Taille normale ».
   - Ctrl+Z et Ctrl+Y / Ctrl+Maj+Z restent disponibles partout.
2. **« Annuler » et « Rétablir » de l'arrangement** se recalculent aussi après la lecture et après chaque opération. Ils ne restent plus grisés après Play puis Stop.
3. **Barre d'espace :** elle ne lance plus la lecture derrière une fenêtre ouverte. Sur un bouton ou un champ de la fenêtre, elle garde son rôle normal.
4. **Bibliothèque :** le curseur va directement dans le champ de recherche.

Vérifications après correction :
- **Accueil comparé à la 8.9 validée :** 408 éléments à 1249×848, 1874×1272, 1536×864, 1366×768 et 1024×768, et 407 à 390×844. **0 écart**, même hauteur de page.
- **Suite de Claude (nouveau test 26 sur les corrections)** aux 5 tailles : 24 réussis, 2 non applicables, **0 échec**. Les 7 boutons ÉDITION sont cliquables, menu ouvert, à chaque taille.
- **Suite de ChatGPT pour les cinq outils :** **23 sur 23**.
- **Export WAV :** toujours identique à l'octet près (SHA-256 3bafcb07…).

Non repris dans cette correction, car non bloquant : nommer la version retirée par la rotation, et le libellé « VISION8.9-ORBITE » du diagnostic.

## Verdict initial (avant corrections)

**Solide sur le fond. Trois défauts à corriger avant validation, et un point à trancher par Bob : la barre de l'accueil.**

- Le moteur audio n'a pas bougé : l'export WAV est identique à l'octet près à celui de la 8.9 et de toutes les versions précédentes (SHA-256 3bafcb07…).
- La base est bien la 8.9 validée. Les modifications du code d'origine sont ciblées, et chacune est vérifiée pour ne s'appliquer qu'une fois. Les cinq outils tiennent dans un module séparé (`extension.js`).

## Tests rejoués (navigateur Chromium, mémoire vidée avant chaque passage)

| Suite | Résultat |
| --- | --- |
| Suite héritée de Claude, à 1249×848 (taille de Bob), 1536×864, 1366×768, 1024×768 et 390×844 | 23 réussis, 2 non applicables, **0 échec** à chaque taille |
| Commandes atteignables (avec les 9 nouveaux boutons) | 299 sur 299, à chaque taille |
| Suite de ChatGPT pour les cinq outils (`JACK22_WORKFLOW_TESTS`) | **23 sur 23** |

La suite de ChatGPT couvre :
- **l'inspecteur :** modification valide, valeur vide refusée, chevauchement refusé, volume voix ;
- **l'historique :** annuler et rétablir, y compris d'une restauration ;
- **le zoom :** sans changement musical, avec ses limites, et « Tout voir » ;
- **la recherche :** sans tenir compte des accents ni des majuscules, et le cas « aucun résultat » ;
- **les versions :** empreinte des sources, BPM invalide et audio tronqué refusés, restauration annulable sans écrire dans la sauvegarde principale, limite de cinq versions, verrous libérés après chaque opération.

Le test 22 (espaces compacts) signalait des panneaux « sans effet ». C'était **mon test**, qui cliquait dans le même instant que le changement d'onglet. Avec une courte attente, il passe sans remarque. ChatGPT l'avait vu et vérifié par de vrais clics.

## Contrôles propres à cette contre-expertise

- **Code relu :** `extension.js` en entier, et chacune des modifications appliquées au code d'origine.
  - La copie des réglages voix et de la prise pendant un retour arrière est correcte.
  - La mémoire de l'historique est plafonnée.
  - Les versions sont stockées dans une base séparée de la sauvegarde principale ; leur suppression ne touche pas cette sauvegarde.
- **Points vérifiés et sains :**
  - la variable de grille `--bw` est bien définie ;
  - l'inspecteur audio retrouve le clip sélectionné ;
  - un preset voix écrit dans le bon réglage (`processing`) ;
  - le quadrillage de la timeline est identique à celui de la 8.9.
- **Ctrl+Z dans le Piano Roll :** il passe par l'historique général et retire bien les notes une par une. Le bouton « ↶ Annuler » du Piano Roll reste grisé ensuite, sans perte.
- **Réglage fait pendant la lecture :** il est bien enregistré, et Ctrl+Z l'annule après l'arrêt.
- **Fenêtres :** Échap ferme la fenêtre, et l'inspecteur sans sélection affiche un message clair au lieu d'une fenêtre vide.

## Défauts trouvés

1. **« Annuler » et « Rétablir » de l'arrangement restent grisés après Play puis Stop,** alors que l'historique contient des étapes. Ctrl+Z et les boutons de l'onglet Outils fonctionnent, eux.
   - Cause : ces boutons ne se recalculent que quand l'historique change. S'il change pendant la lecture, ils gardent l'état « verrouillé ».
   - Écouter puis vouloir annuler est le geste le plus courant.
   - Correction simple : les recalculer aussi à l'arrêt de la lecture et à la fin d'une opération.
2. **La barre d'espace lance la lecture derrière une fenêtre ouverte** (Bibliothèque, Versions, Inspecteur) quand on a cliqué dans une zone vide de la fenêtre.
   - Ce défaut vient du raccourci ajouté par Claude en 8.8.
   - Correction : ignorer l'espace tant qu'une fenêtre est ouverte.
3. **À l'ouverture de la Bibliothèque, le curseur est sur « Fermer »** au lieu du champ de recherche : il faut cliquer avant de taper.
   - Correction : placer le curseur dans le champ de recherche.

## Point à trancher : l'écran d'accueil

Bob avait demandé que l'accueil reste exactement celui de la référence. Or la 9.0 ajoute **9 boutons** dans la barre sous l'arrangement : Inspecter, −, 100 %, +, Tout voir, 100 %, Annuler, Rétablir. Les boutons d'origine (◀ Mesure … Supprimer le bloc) se décalent de 350 px vers la gauche.

En dehors de cette barre, la comparaison avec la 8.9 validée à 1249×848 ne montre aucun écart : même hauteur de page, aucun autre élément déplacé.

Deux choix possibles :
- **Garder la barre de ChatGPT :** les outils sont à portée de main, mais l'accueil change.
- **Remettre l'accueil à l'identique :** les outils de l'arrangement passent dans le menu « Réglages ▾ » de la timeline, et Ctrl+Z / Ctrl+Y restent disponibles partout.

Détail de libellé dans cette barre : « 100 % » apparaît deux fois, une fois comme affichage du zoom et une fois comme bouton. Le bouton gagnerait à s'appeler « Taille normale ».

## Améliorations suggérées (non bloquantes)

- **Versions :** quand une sixième version efface la plus ancienne, nommer la version retirée dans le message.
- **Diagnostic :** il annonce encore « VISION8.9-ORBITE » ; ChatGPT le signale lui-même.

## Non vérifié

- Edge sur Windows, un vrai micro, l'écoute humaine et le tactile.
- Les limites de 200 et 256 Mo en charge réelle, et les pannes de stockage du navigateur provoquées volontairement.
- Une fermeture complète du navigateur avant de restaurer une version.
