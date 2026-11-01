# JACK22 8.8 — rendu de Claude : contrôle de la 8.8 de ChatGPT et version finale

## En bref

La version finale reprend le fichier 8.8 de ChatGPT sans y toucher, design compris. Claude a seulement ajouté un bloc à la fin du fichier (`claude88Styles` et `claude88Module`) : une correction d'affichage sur téléphone et deux ajouts de fonctions. Tous les tests applicables passent, à quatre tailles d'écran.

## Tests (suite `tests/lot8-tests.js`, navigateur Chromium, mémoire vidée avant chaque version)

| | 8.8 ChatGPT seule | 8.8 finale |
| --- | --- | --- |
| Fonctions du studio (tests 01 à 18) | 17 réussis, raccourcis non présents | 18 réussis |
| Espaces compacts de ChatGPT (test 22) | réussi | réussi |
| Commandes atteignables à 1536×864, 1366×768 et 1024×768 | 288/288 | 288/288 (289 à 1536 px) |
| Commandes atteignables à 390×844 (téléphone) | **9 commandes recouvertes dans Voix** | 288/288 |
| Erreurs JavaScript | aucune | aucune |
| Export WAV | identique à l'octet près à la 8.6 et à la 8.7 (SHA-256 3bafcb07…) | identique |

Le test 22 vérifie les 20 sous-vues, les 12 panneaux qu'on peut replier ou agrandir, les 7 onglets d'effets voix, les boutons de taille du texte des paroles et les 5 vues du Studio. Le test 23 amène chaque commande visible à l'écran et vérifie que rien ne la recouvre. Il couvre aussi chaque panneau agrandi à 1024×768, l'un des points que l'audit de ChatGPT demandait de contrôler.

## Contrôle du travail de ChatGPT

**Ce qui est bien fait**
- Les dix scripts du moteur sont inchangés. Seule l'organisation des panneaux est remplacée, et le WAV produit est identique à celui des versions précédentes.
- Les points signalés dans le rendu précédent sont corrigés : le nom du cache web a changé, et le titre comme le diagnostic affichent bien 8.8.
- Le fichier `web/index.html` correspond exactement au studio (plus le manifeste), et l'empreinte annoncée est la bonne.
- Sous-vues, repli, agrandissement, onglets d'effets voix et taille du texte fonctionnent tous.

**Défaut trouvé et corrigé dans la version finale**
- Sur un écran de moins de 950 px de large, chaque panneau est limité à 650 px de haut, sans défilement. Le panneau des prises voix fait environ 950 px : son bas passait sous le panneau d'effets. Neuf commandes ne recevaient plus le clic, dont « ● Enregistrer » de la voix 3, les cases du décompte et du clic, et l'aide.
- Correction : sur écran étroit, ce panneau s'affiche en entier. Le reste du design de ChatGPT n'est pas modifié.

**À signaler, sans correction (choix d'interface de ChatGPT)**
- Les titres des outils affichent encore les numéros de lots internes : « LOT 3 / EFFETS VOIX », « LOT 4 / ÉDITION », etc. La 8.7 de Claude les avait retirés.
- Son lanceur `ouvrir-JACK22.cmd` ouvre le navigateur par défaut. Un lanceur `ouvrir-dans-Edge.cmd`, qui revient au navigateur par défaut si Edge est absent, est ajouté à côté.

## Ajouts de Claude (fonctions uniquement)

- **Raccourcis :** Espace = Play / Pause, Ctrl+S = Sauvegarder. L'espace est ignoré quand on écrit dans un champ ou qu'un bouton a le focus. Les raccourcis sont signalés au survol des boutons Play et Sauvegarder, sans ajouter d'élément à l'interface.
- **Sampler :** les touches sont grisées et une phrase d'aide s'affiche tant qu'aucun son n'est disponible. Avant, elles semblaient ne rien faire.
- **Téléphone :** la correction du panneau des prises voix décrite plus haut.
- **Version web :** nouveau nom de cache, puisque le fichier a changé.

## Non vérifié

- Edge sur Windows : les tests ont tourné sur le même moteur (Chromium), pas dans Edge lui-même.
- Un vrai micro (prise réelle, latence), l'écoute humaine et le tactile.
- L'installation PWA réelle et le fonctionnement hors connexion.
- L'aspect visuel : les captures d'écran de cette session n'étaient pas fiables, le contrôle s'est fait par mesures.

## Relancer les tests

Ouvre le studio, puis la console du navigateur (F12). Colle le contenu de `tests/lot8-tests.js`, puis tape :

```
JACK22_LOT8_TESTS().then(r => console.table(r.results))
```

La suite modifie le morceau ouvert : lance-la sur un studio vide.
