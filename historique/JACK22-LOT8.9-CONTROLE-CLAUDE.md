# JACK22 8.9 « Studio piano complet » (ChatGPT) — contrôle de Claude

Version contrôlée : `JACK22-STUDIO-LOT8.9.html` de ChatGPT, SHA-256 `b487e092…` (empreinte de son ZIP). Elle reprend la présentation de référence demandée par Bob et part de la 8.9 de Claude.

## Verdict

**Version validée.** Une première correction portait sur le contraste du bouton « Réduire ». Ensuite, à la demande de Bob, **l'écran d'accueil reprend exactement la présentation de la capture de référence, sans les badges M6 et 15** : voir la section suivante. Les autres onglets gardent la présentation compacte de ChatGPT.

## Accueil identique à la référence

- **Ce qu'est la capture de référence :** une capture de la 8.6 d'origine, prise avec un affichage Windows à 150 %. Elle correspond à une page d'environ 1249 × 848 pixels de page. Mesurées à cette taille, la 8.6 et la capture coïncident à 2–5 px près : bandeau, messages, onglets, panneaux, piano.
- **Ce qui différait dans la 8.9 de ChatGPT :**
  - le bandeau était plus haut, à cause du bouton « Réduire » qu'il contenait ;
  - les panneaux étaient redimensionnés, à cause de son CSS compact, de son correctif de hauteur et d'une règle qui fixait la page à la hauteur de l'écran et resserrait la grille du Studio.
- **Ce qui a été fait :**
  - sur le Studio complet, le mode compact est coupé (`c89Accueil`) et la page reprend les règles de la 8.6. Il revient dès qu'on ouvre un autre onglet ou une vue détaillée du Studio ;
  - la règle de hauteur de ChatGPT ne s'applique plus qu'en dehors de l'accueil ;
  - « Réduire » passe du bandeau au menu Projet (« Masquer l'avertissement de sauvegarde »), pour que le bandeau reste celui de la 8.6 ;
  - la hauteur des badges retirés reste réservée : 35 px pour M6 ; 54, 44 ou 46 px pour 15, comme dans la 8.6.
- **Vérification élément par élément** de l'en-tête, du bandeau, des messages, des onglets et des quatre panneaux du Studio (438 éléments), contre la 8.6, à 1249×848, 1874×1272, 1536×864, 1366×768, 1024×768 et 390×844 :
  - aucun écart de position ni de taille, à une exception voulue près : les titres « GRAND STUDIO » et « ORBITE » glissent à gauche, à la place des badges retirés ;
  - le menu Projet, fermé à l'ouverture, contient deux choix de plus ;
  - la hauteur totale de la page est identique à chaque taille.

## Tests (suite `tests/lot8-tests.js`, 25 tests, Chromium, mémoire vidée avant chaque passage)

| Taille | Version ChatGPT | Version validée |
| --- | --- | --- |
| 1249×848 (taille de la capture) | non mesuré | 23 réussis, 2 non applicables, 0 échec |
| 1536×864 | 23 réussis, 2 non applicables, 0 échec | 23 réussis, 2 non applicables, 0 échec |
| 1366×768 | idem | idem |
| 1024×768 | idem | idem |
| 390×844 | idem | idem |

Les deux tests non applicables visent des présentations retirées volontairement : la barre « Espace de travail » de la 8.7 et la barre unique avec étapes de la 8.9 de Claude.

- **Fonctions musicales** (lecture, batterie, Piano Roll, timeline, mixeur, effets, synthé, voix et J-Tune, sampler, outils) : toutes réussies. L'export WAV est identique à l'octet près à celui de toutes les versions précédentes (SHA-256 3bafcb07…).
- **Sauvegarde, projet portable, archive altérée et fichier trop court** : réussis.
- **Commandes atteignables** : les 291 commandes visibles sont cliquables aux quatre tailles, téléphone compris.
- **Nouveau test 25, propre à cette version :**
  - 7 onglets classiques et ligne de messages séparée ;
  - badges M6 et 15 retirés ;
  - témoin ● sur Sauvegarder ;
  - bandeau visible à l'ouverture, qui disparaît vraiment avec « Réduire » et que le menu Projet réaffiche ;
  - vues détaillées du Studio cachées par défaut, puis affichées depuis le menu Projet ;
  - liens Voix ⇄ Paroles ;
  - 24 touches du piano entières et cliquables (110 px de haut, 105 px sur téléphone) ;
  - faders du mixeur de 163 à 173 px.
- **Accueil :** une page rechargée avec une ancienne adresse (`#l3Editor`) s'ouvre bien sur le Studio.

## Défaut corrigé

- **Le bouton « Réduire » du bandeau était presque illisible :** texte clair (#e9e9df) sur fond doré, avec un contraste de 2,06 alors que le minimum conseillé est de 4,5. Il prend maintenant l'encre sombre du bandeau, avec un contraste de 5,61 au point le moins favorable du dégradé.

## Livraison

- **Contrôles concluants :** le ZIP de ChatGPT avait des empreintes justes, une version web identique au studio (plus le manifeste), un cache web à jour et des lanceurs corrects.
- **Mis à jour dans la version validée :**
  - `web/index.html` et le cache web, puisque le fichier a changé ;
  - `SHA256.json` ;
  - `tests/lot8-tests.js`, remplacé par la suite à jour (le ZIP contenait l'ancienne, sans test pour cette présentation).

## Non vérifié

Edge sur Windows, un vrai micro, l'écoute humaine et le tactile. L'accueil est comparé à la 8.6 par mesures et à la capture de Bob à l'œil, sur des captures du navigateur intégré. Un regard humain dans Edge, à 150 %, reste le juge final.
