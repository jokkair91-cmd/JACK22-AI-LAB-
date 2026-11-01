# JACK22 9.2 candidate — mode Pro (fenêtres façon Pro Tools)

Phase 2 du chantier demandé par Bob. Base : la 9.1 candidate (9.0 corrigée + interface allégée). Un seul bloc ajouté : `claude92Styles` et `claude92Module` (copie dans `sources/claude92-pro.html`). Le moteur audio, les projets, les sauvegardes et les raccourcis ne changent pas.

## Comment l'utiliser

1. Ouvre **Projet ▾ → Mode Pro (fenêtres)…**. L'accueil n'a aucun bouton en plus.
2. Le haut de l'écran reste le même : transport, BPM, volume, Sauvegarder, Projet et ligne de messages. Dessous, la **barre MODE PRO** et le **bureau** avec les fenêtres.
3. **Déplacer une fenêtre :** attrape sa barre de titre. Au clavier, sélectionne la barre puis utilise les flèches.
4. **Changer sa taille :** tire la poignée dorée en bas à droite. Au clavier : **Maj + flèches**.
5. **Ouvrir ou fermer une fenêtre :** ses boutons dans la barre MODE PRO, ou le **×** de la fenêtre.
6. **Ta disposition est mémorisée** dans le navigateur : tu la retrouves au prochain passage en mode Pro. **Disposition par défaut** remet la disposition d'origine.
7. **Quitter le mode Pro :** chaque panneau retourne à sa place et l'accueil redevient exactement celui d'avant.

## Les fenêtres

| Fenêtre | Contenu | Ouverte au départ |
| --- | --- | --- |
| Arrangement | La timeline et son menu « Réglages ▾ » (zoom, inspecter, annuler…) | oui |
| Inspecteur | Description du bloc ou du clip sélectionné (piste, pattern, début, longueur), ses commandes (déplacer, longueur, dupliquer, supprimer) et « Modifier en détail… » | oui |
| Effets master | Égaliseur, réverb, delay, compresseur | oui |
| Mixeur | Les tranches Kick, Snare, Hi-hat, Clap, Synthé, Master, et la banque Voix | oui |
| Synthé Orbite | Le synthé, le cadran et le piano | oui |
| Piano Roll, Batterie, Patterns, Prise de notes, Voix, Effets voix | Les outils des onglets Composer et Voix | à ouvrir depuis la barre |

Ce sont **les vrais panneaux du studio**, pas des copies : chaque bouton, curseur et réglage fonctionne exactement comme sur l'accueil.

Pour un écran moins chargé, les titres en double sont masqués en mode Pro : la barre de la fenêtre suffit. Les titres de marque « GRAND STUDIO » et « ORBITE » restent.

Sur écran étroit (téléphone, moins de 900 px de large), les fenêtres s'empilent l'une sous l'autre, sans déplacement.

## Vérifications

- **Accueil comparé à la 8.9 validée** (408 éléments, six tailles dont 1249×848) : **0 écart**. Après une entrée puis une sortie du mode Pro, avec une fenêtre déplacée entre-temps, l'accueil est aussi identique : 408 éléments, 0 écart.
- **Suite de Claude** (nouveau test 28 sur le mode Pro), à 1249×848, 1536×864, 1366×768 et 1024×768 : **26 réussis, 2 non applicables, 0 échec**. À 390×844, 25 réussis et 3 non applicables (le test 28 vise les grands écrans). Le mode Pro empilé y est vérifié à part : aucun débordement, 57 commandes toutes cliquables.
- **Ce que vérifie le test 28 :**
  - entrée par le menu Projet ;
  - 5 fenêtres ouvertes, sans chevauchement et dans le bureau ;
  - déplacement à la souris (+40, +30 px exactement), redimensionnement par la poignée, déplacement au clavier ;
  - disposition mémorisée, puis retrouvée au retour ;
  - fermeture et réouverture d'une fenêtre ;
  - menu Réglages entier et au premier plan ;
  - lecture, Mute, inspecteur (description et Dupliquer), note du Piano Roll, pas de batterie ;
  - sortie : chaque panneau à sa place, plus aucune trace du mode Pro.
- **Suite de ChatGPT pour les cinq outils :** **23 sur 23**.
- **Export WAV :** identique à l'octet près à toutes les versions depuis la 8.6.

**Corrigé pendant les essais :**
- l'arrangement prenait toute la largeur, à cause d'une règle de la 8.6 : la taille passe maintenant par des variables ;
- une fenêtre fermée enregistrait une taille nulle ;
- la taille du bureau comptait sa bordure ;
- le défilement de l'arrangement n'était pas rétabli à la sortie ;
- une bande de contenu dépassait au-dessus de la barre de titre ;
- le menu Réglages passait sous le Mixeur.

## Non vérifié et limites

- **Matériel :** Edge sur Windows, le tactile (le déplacement au doigt est prévu mais pas essayé), un vrai micro et l'écoute.
- **Démarrage :** le mode Pro ne se rouvre pas tout seul au lancement. Le studio démarre toujours sur l'accueil, conformément à la règle de l'accueil identique.
- **Design :** il est fonctionnel et suit la charte (ambre, police à chasse fixe pour les titres). ChatGPT pourra le peaufiner sans toucher au fonctionnement.
- **Prochaines phases prévues :** les packs (Shire voix avec de-esser, Warlick mixage/mastering avec limiteur, Hardy Bay instruments), puis l'afro et la guitare.

## Captures

- `captures/1-mode-pro-depart.jpg` : disposition de départ, avec un bloc sélectionné dans l'inspecteur.
- `captures/2-mode-pro-piano-roll-batterie.jpg` : Piano Roll et Batterie ouverts, fenêtre déplacée, note sélectionnée nommée.
- `captures/3-mode-pro-menu-reglages.jpg` : menu Réglages de l'arrangement, entier et par-dessus les autres fenêtres.
