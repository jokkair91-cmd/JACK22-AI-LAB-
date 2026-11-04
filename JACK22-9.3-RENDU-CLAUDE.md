# JACK22 9.3 candidate — les packs Shire, Warlick et Hardy Bay

Phase 1 du chantier demandé par Bob. Base : la 9.2 candidate (mode Pro). Un seul bloc ajouté, `claude93Styles` et `claude93Module` (copie dans `sources/claude93-packs.html`), et une seule retouche du moteur : le rendu d'une voix tient compte du de-esser.

Tout est éteint par défaut : un ancien projet sonne exactement pareil.

## Où les trouver

- **Outils → Packs** : le panneau des trois packs.
- **Mode Pro** : la fenêtre « Packs », dans la barre MODE PRO.
- **Voix → Effets voix → De-esser** : le nouvel onglet, après « Pan / Drive ».
- **L'accueil n'a rien de nouveau.**

## Les packs

### Shire · voix

Le preset s'applique à la voix choisie dans Voix → Effets voix (menu Piste). Il règle l'égaliseur, le compresseur, le de-esser, la réverb et le delay. Le J-Tune, la découpe, le panoramique et le drive sont conservés.

| Preset | Égaliseur (graves / médiums / aigus) | Compresseur | De-esser | Réverb | Delay |
| --- | --- | --- | --- | --- | --- |
| Rap | −2 / +1 / +3 dB | −20 dB, 4:1, rapide | 60 % à 6500 Hz | légère (8 %) | non |
| Chant | −1 / 0 / +2 dB | −18 dB, 3:1, doux | 45 % à 7000 Hz | 18 %, 1,6 s | court, 10 % |
| Afro | −2 / +2 / +3 dB | −22 dB, 4:1 | 55 % à 6500 Hz | 14 %, 1,2 s | 0,18 s, 12 % |

Après un preset, chaque réglage reste modifiable à la main dans Effets voix.

### Le de-esser (nouveau)

Il adoucit les « s », « ch » et « z » trop sifflants. Seuls les aigus au-dessus de la fréquence choisie sont compressés, et seulement quand ils dépassent. Il a trois réglages : actif, intensité (0 à 100 %) et fréquence (3000 à 12000 Hz).

### Warlick · mixage et mastering

Il agit sur le master, donc sur l'écoute et sur l'export.

| Preset | Égaliseur master | Compresseur master | Limiteur |
| --- | --- | --- | --- |
| Neutre | à zéro | coupé | coupé |
| Mix | +1 / 0 / +1 dB | −18 dB, 2:1, doux | coupé |
| Master | +2 / −1 / +2 dB | −14 dB, 2:1 | actif, plafond −1 dB, gain +3 dB |

La réverb et le delay du master ne sont pas touchés.

**Le limiteur (nouveau)** se règle aussi à la main dans le panneau : actif, plafond (−12 à 0 dB) et gain d'entrée (0 à 12 dB). Il fait sonner plus fort sans dépasser le plafond. Il est enregistré avec le projet. Une version plus ancienne qui ouvre ce projet l'ignore simplement.

### Hardy Bay · instruments

Il dose le mixeur : Kick, Snare, Hi-hat, Clap et Synthé.

| Preset | Kick | Snare | Hi-hat | Clap | Synthé |
| --- | --- | --- | --- | --- | --- |
| Équilibré | 100 | 85 | 65 | 75 | 80 |
| Basses en avant | 100 | 75 | 55 | 65 | 90 |
| Percussions afro | 90 | 70 | 85 | 85 | 75 |

**À savoir :** ce pack ne règle que les volumes. Le studio n'a pas encore d'égaliseur par instrument : c'est à ajouter plus tard si tu veux aller plus loin.

**Annuler :** Ctrl+Z annule un preset comme n'importe quel réglage.

## Vérifications

- **Accueil comparé à la 8.9 validée**, à six tailles dont 1249×848 (ton écran) : **0 écart**.
- **Suite de Claude**, avec le nouveau test 29 sur les packs :
  - à 1249×848, 1536×864, 1366×768 et 1024×768 : **27 réussis, 2 non applicables, 0 échec** ;
  - à 390×844 : 26 réussis et 3 non applicables (le mode Pro vise les grands écrans).
- **Suite de ChatGPT : 23 sur 23.**
- **Export WAV du morceau de test :** empreinte identique à toutes les versions depuis la 8.6 (`3bafcb07…`).
- **Ce que vérifie le test 29 :**
  - limiteur éteint : export identique ;
  - limiteur allumé à −12 dB : le son est bien plafonné (crête 0,30 au lieu de dépasser) ;
  - limiteur enregistré, puis retrouvé au chargement ; un plafond invalide est refusé ; un ancien projet l'éteint ;
  - de-esser : −36 % d'aigus sur un bruit test ; éteint, rien ne change ; absent des réglages par défaut ;
  - Shire Rap appliqué à la voix de démo, voix recalculée, onglet De-esser à jour ;
  - Warlick Master puis Neutre, Hardy Bay Percussions afro appliqués.
- **Annuler (Ctrl+Z)** vérifié à la main sur Warlick (limiteur compris), Hardy Bay et Shire.

**Corrigé dans les tests pendant les essais (pas dans le studio) :**
- le test du mode Pro partait d'une disposition mémorisée par un essai précédent ;
- il comparait l'accueil avant que les icônes des pistes soient redessinées.

**À noter :** en préparant le test, j'ai vu que deux exports de suite du même morceau diffèrent parfois d'un seul pas d'arrondi (1/32768), sur deux échantillons. C'est déjà le cas dans la 9.2, sans les packs. C'est inaudible et ça vient du navigateur. Le test des packs compare donc les exports à ce pas près.

## Non vérifié et limites

- **Écoute réelle :** les réglages des presets sont des points de départ raisonnables, pas un mixage fait à l'oreille sur tes morceaux. Il faut les écouter avec une vraie voix au micro, dans Edge.
- **Matériel :** Edge sur Windows, le tactile et un vrai micro ne sont pas vérifiés.
- **Pas d'égaliseur par instrument** (voir Hardy Bay).
- **Design :** le panneau est fonctionnel et suit la charte (ambre, titres en chasse fixe). ChatGPT peut le peaufiner sans toucher au fonctionnement.
- **Phase suivante :** l'afro (rythmes) et la guitare.

## Capture

- `captures/1-outils-packs.jpg` : Outils → Packs, avec Warlick, le limiteur, Shire (grisé tant qu'aucune voix n'est enregistrée) et Hardy Bay.
