# JACK22 8.9 — ergonomie : moins de barres, un vrai menu Projet, des onglets en étapes

Base : la 8.8 finale (interface de ChatGPT inchangée, avec la correction pour téléphone, les raccourcis et le sampler de Claude). La 8.9 ajoute un seul bloc, `claude89Styles` et `claude89Module` en fin de fichier. Il ne réécrit aucun identifiant ni aucun script du moteur. Les couleurs et le style des boutons sont ceux de ChatGPT.

## 1. Moins de barres en haut de l'écran

- **Une seule barre sous l'en-tête :** les onglets, les vues du Studio et la ligne d'état y sont réunis. Le dernier message est coupé s'il est long, mais il reste lisible en entier au survol, et l'historique s'ouvre en petit panneau.
- **Le bandeau jaune :** il se réduit avec « Réduire » en une pastille « ⚠ Sauvegarde », qui le rouvre d'un clic. Il se réduit tout seul dès qu'une copie du projet a réellement été enregistrée sur l'ordinateur, et ce choix est retenu par le navigateur.
- **Gain mesuré :** le contenu commence à 113 px du haut au lieu de 203 px à 1536, 1366 et 1024 px de large, soit 90 px de plus pour travailler. Bandeau ouvert, il commence à 147 px.

## 2. Bouton Enregistrer et menu Projet

- **« Sauvegarder » devient « Enregistrer »,** avec un témoin ● ambre tant qu'il y a des changements non enregistrés. Il utilise la détection déjà présente dans le studio, celle qui protège la fermeture de la page.
- **« Exporter projet » passe dans le menu Projet,** qui contient dans l'ordre :
  - Enregistrer une copie sur l'ordinateur… (avec une note : c'est la plus sûre, car elle garde les sons) ;
  - Ouvrir la sauvegarde du navigateur ;
  - Ouvrir un fichier projet… ;
  - Nouveau projet (tout effacer).
- **Rien ne change dans le fonctionnement :** les mêmes boutons, avec les mêmes confirmations. Seuls leur nom et leur place changent.

## 3. Des onglets qui suivent les étapes d'un morceau

- **Les étapes :** ① Composer · ② Studio · ③ Voix & paroles · ④ Exporter, puis **⚙ Plus** (Outils, Version).
- **Voix & paroles :** l'onglet reste marqué sur Paroles. Un lien dans la barre de sous-vues fait passer de Voix à Paroles, et inversement.
- **Les écrans ne changent pas :** ce sont ceux de ChatGPT. Seuls l'accès et l'ordre changent.

## Tests

Suite `tests/lot8-tests.js` (24 tests), mémoire du navigateur vidée avant chaque passage :

| Taille | Résultat |
| --- | --- |
| 1536×864 | 23 réussis, 1 non applicable (barre 8.7), 0 échec |
| 1366×768 | 23 réussis, 1 non applicable, 0 échec |
| 1024×768 | 23 réussis, 1 non applicable, 0 échec |
| 390×844 | 23 réussis, 1 non applicable, 0 échec |

- **Commandes :** les 291 commandes visibles restent cliquables à toutes les tailles.
- **Export WAV :** identique à l'octet près aux versions précédentes (SHA-256 3bafcb07…).
- **Nouveau test 24 :** il vérifie la barre unique, la hauteur gagnée (le bandeau doit réellement disparaître de l'écran), les 4 étapes et le menu ⚙, le lien Voix ⇄ Paroles, le témoin ● (allumé après une modification, éteint après Enregistrer), le contenu du menu Projet et la réduction automatique du bandeau après une copie.

Corrigé pendant les essais : une règle héritée de la 8.6 (`#storeWarn{display:block!important}`) empêchait le bandeau de disparaître. La première version du test ne contrôlait que l'attribut « masqué ». Il mesure maintenant ce qui est réellement affiché.

## Non vérifié

Edge sur Windows, un vrai micro, l'écoute humaine et le tactile. L'aspect visuel a été contrôlé sur des captures d'écran du navigateur intégré, sans regard humain.
