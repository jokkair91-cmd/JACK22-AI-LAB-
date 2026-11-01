# JACK22 9.0 candidate — cinq outils réunis

Cette version part de `JACK22-LOT8.9-VALIDE-ACCUEIL-ORIGINAL.zip`. La 8.9 reste la référence stable et n'est pas modifiée. Aucun déploiement ni changement GitHub. L'extension s'inspire des principes d'organisation visibles dans le document Warlike Studio, sans reprendre son moteur, absent du document.

## Fonctions livrées

1. **Inspecteur** : sélectionner un bloc dans l'arrangement, puis Inspecter. Début, longueur du bloc instrument et nom du pattern partagé sont modifiables. Pour l'audio : nom dans le projet, début, volume/Mute de la voix ; pour un import ordinaire, volume/Mute de toute la piste AUDIO (annoncé explicitement). La durée source reste en lecture seule ; ce module n'invente pas un découpage audio individuel.
2. **Zoom** : −, +, Tout voir, 100 %. La largeur utilisée par la règle, les blocs, le clic de création, le déplacement et la tête de lecture est commune. Pas de changement du morceau ni du WAV. Zoom de 1 à 160 px par mesure, vue non stockée dans le projet.
3. **Annuler/rétablir du projet** : boutons dans l'arrangement, Ctrl+Z et Ctrl+Maj+Z/Ctrl+Y hors des champs de saisie ; les boutons d'Outils utilisent le même historique. État musical, réglages, paroles et références audio, au maximum 24 retours en mémoire. La mémoire des buffers décodés supplémentaires retenus est plafonnée à 256 Mo par suppression des états les plus anciens ; ce n'est pas une limite de mémoire totale du navigateur. Des actions très rapprochées peuvent être regroupées (temporisation héritée de 180 ms). Historique de session uniquement ; les réglages matériels et la navigation ne sont pas annulés. Lecture et opérations occupées bloquent les retours.
4. **Bibliothèque recherchable** : dans Projet ou Outils/Sons. Recherche sans distinction de casse ou d'accents dans les cinq sons JX-22, fichiers du projet, prises et presets d'effets voix existants. Choisir un instrument règle le synthé ; choisir un fichier prépare le sampler ; un preset s'applique à la voix sélectionnée. Aucun pack externe ou catalogue fictif ajouté.
5. **Versions persistantes** : Projet → Versions du projet. Création volontaire d'un point nommé, date, sources audio originales avec SHA-256, restauration et suppression. Cinq versions et 200 Mo de Blobs cumulés maximum ; les plus anciennes sont retirées quand une limite est atteinte. Base IndexedDB séparée de l'audio de la sauvegarde principale. La restauration valide et décode avant application, demande confirmation, ne remplace pas la sauvegarde principale et reste annulable. Ce sont des versions locales du studio, pas un historique inclus dans le projet portable ni une sauvegarde cloud. L'effacement des données navigateur les supprime. Exporter projet reste nécessaire pour conserver une copie externe.

## Accueil et modifications techniques

Même accueil Studio et sept onglets, mêmes logos, couleurs et piano ; M6/15 restent absents. Une petite rangée de commandes supplémentaires apparaît dans la barre de sélection de l'arrangement ; aucun panneau permanent supplémentaire. L'inspecteur, la bibliothèque et les versions sont des fenêtres fermables.

Le rendu audio, les algorithmes J-Tune et le format portable sont conservés. Adaptations du code existant : largeur de timeline variable ; historique exposé aux commandes nouvelles, limite augmentée et mémoire bornée ; copie des métadonnées de clips et de la prise pendant le rollback. L'extension est dans `sources/extension.js`. Le titre et le nom du HTML identifient 9.0 candidate ; certains diagnostics internes hérités indiquent encore VISION8.9-ORBITE, version du socle.

## Défaut détecté et corrigé pendant l'audit

Après un retour arrière, les objets de l'état restauré pouvaient être réutilisés par le projet ouvert. Une édition du volume voix modifiait alors cet état d'historique. Le rollback clone maintenant les métadonnées voix et la prise avant de les remettre dans le projet. Le test dédié reproduit la succession restauration → édition voix → annulation et passe après correction.

Un autre écart provenait du test de recherche : « synthé » doit également trouver un fichier nommé « démo synthétique ». Le contrôle vérifie maintenant la présence des cinq vrais presets sans refuser cet autre résultat légitime.

## Essais effectués sur le HTML final

- 15 scripts passent `node --check`.
- Chromium distant via Firecrawl : 23 tests dédiés réussis, zéro échec. Résultats joints. Inspecteur valide/invalide/chevauchement ; zoom sans changement musical ; annulation/rétablissement ; recherche ; audio et empreintes des versions ; refus BPM invalide/audio tronqué ; annulation de restauration ; conservation de la sauvegarde principale ; rotation à cinq versions ; blocage pendant une opération.
- Suite héritée exécutée : 22 réussis, 1 non applicable (ancienne barre 8.7), zéro échec. Lecture/pause/arrêt, batterie, Piano Roll, timeline, mixeur, effets, synthé, WAV stéréo 44,1 kHz, répétabilité du WAV, sauvegarde, import portable, refus d'archive altérée, voix synthétique/J-Tune, sampler, automation et diagnostic.
- Le test hérité 22 émet des notes sur les panneaux car il enchaîne ses mutations synchrones sans attendre tous les observateurs de mise en page. Ce statut « réussi » ne suffit donc pas à les certifier. Des clics réels séparés ont confirmé : Patterns replié masque son contenu ; Piano Roll agrandi masque Patterns ; Vue complète rétablit Patterns. Les traces sont jointes.
- Test de commandes atteignables : 299 commandes à 1536×864 et à 390×844, toutes atteignables selon les mesures de la suite. Contrôle de largeur sans débordement et référence/piano également rejoués à 390 px. Ce n'est pas une revue complète d'accessibilité ni une écoute.
- Nouvelle navigation vers la page : cinq versions toujours présentes ; restauration de TEST 5 avec sa prise décodée, volume AUDIO 43 et Mute actif. Pas une fermeture complète du navigateur.
- La copie de test réduit uniquement le PNG Jackbot à 160 px pour limiter le transfert. Scripts/styles fonctionnels identiques. Aucune source ni prise utilisateur n'a été transférée : les essais utilisent des sons synthétiques.

## Limites et contre-expertise de Claude

Candidate à auditer, pas nouvelle version stable. Aucun micro réel, écoute humaine, Edge Windows ou tactile. Pas d'essai de charge aux limites 200/256 Mo ni d'injection exhaustive de pannes IndexedDB. La ressemblance visuelle complète de l'accueil aux captures n'est pas certifiée pixel par pixel dans ce tour.

Claude : comparer à la 8.9 stable, examiner les changements de rollback et le verrouillage de l'historique, éprouver les quotas/pannes et les prises longues, contrôler les dialogues au clavier et les commandes à 1024/1366 px. Vérifier que la rotation des versions est compréhensible et que leur suppression ne touche aucune sauvegarde principale. Rejouer les suites sur un projet jetable : elles modifient le morceau et l'historique local. Préparer ensuite un seul essai groupé Edge avec Bob ; ne pas reprendre une refonte visuelle.

Les scripts de tests sont dans `tests/`. Charger les tests dans une copie vide, puis exécuter `JACK22_WORKFLOW_TESTS()` ; la suite héritée utilise `JACK22_LOT8_TESTS()`. L'ancienne ergonomie en quatre étapes reste non applicable.
