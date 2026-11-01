# JACK22 8.8 — intégration des espaces compacts

## Livraison

Version autonome codée sur la 8.7 fournie dans JACK22-LOT8.7-ORBITE-utilisateur.zip. Elle conserve l'habillage Orbite : couleurs, logos, synthé, piano, mixeur et avertissements. Elle réorganise les outils et réduit les marges, barres et commandes. Ce n'est plus seulement une image ; les commandes existantes restent celles du studio. Ce n'est pas encore une version validée dans un navigateur réel.

## Organisation intégrée

- Navigation principale affinée, sous-vues accessibles dans chaque espace.
- Composer : Patterns et prise de notes à gauche, batterie et Piano Roll à droite. Des sous-vues permettent de se concentrer sur un seul outil. La grille musicale garde sa géométrie et son défilement interne ; aucune formule de placement des notes n'est changée.
- Voix : trois prises et panneau d'effets côte à côte sur grand écran. Sept catégories d'effets sélectionnables par petits boutons ; les vrais champs restent présents. Latence et aides repliables, messages et commandes importantes conservés.
- Paroles : texte et prompteur en double vue, vues dédiées disponibles, taille du texte réglable pour cette session. Pas de nouvelle gestion de sections inventée à partir des images.
- Exporter : panneau centré et compact. Outils : édition, automation et sons en panneaux ou sous-vues. Version : général, diagnostic, installation et informations séparés.
- Boutons de panneau : replier et agrandir/rétablir dans les espaces d'outils. Vues complètes ou dédiées de la 8.7 conservées dans le Studio.
- Sur ordinateur, les panneaux occupent l'espace sous la navigation ; leur contenu détaillé peut défiler à l'intérieur. Sur écran étroit, ils s'empilent pour préserver des commandes lisibles : l'absence de tout défilement sur téléphone n'est pas promise.

## Conservation des fonctions

205 commandes statiques de la 8.7 conservées avec leurs attributs initiaux, et tous les identifiants conservés et uniques. Les dix scripts existants sont identiques, hors nom du build. Le seul contrôleur remplacé est l'organisation des panneaux de la 8.7 ; le moteur audio, les notes, les prises, les effets/J-Tune, les sauvegardes et le format portable ne sont pas réécrits. Le schéma musical n'est pas modifié.

La charte graphique reçue séparément n'est pas appliquée : l'utilisateur a demandé de garder ce design. Les illustrations approuvées servent à l'agencement ; les commandes fictives de ces images ne sont pas ajoutées.

## Vérifications réalisées

- Onze scripts passent le contrôle de syntaxe.
- Comparaison statique des commandes et identifiants ; références des labels résolues.
- Huit tests d'organisation exécutés dans une VM avec adaptateurs DOM : changement de sous-vue, retour à la vue complète, conservation du texte, bascule des effets, présence du statut d'outil, bornes de taille du texte et retour de la vue dédiée du Studio.

Ces tests contrôlent le code et sa logique, pas le rendu CSS ni le fonctionnement complet du studio. Les 114 contrôles de 8.6 et ses essais Chromium historiques ne sont pas présentés comme rejoués sur ces nouveaux écrans. Les scripts musicaux étant conservés, leurs correctifs le sont aussi ; cela ne dispense pas d'une vérification des interactions après déplacement des panneaux.

## Essais distants bloqués

Une session Firecrawl a été ouverte, mais l'envoi du HTML a été rejeté par le contrôle automatique : il juge que l'autorisation utilisateur ne nomme pas suffisamment clairement le contenu et sa destination. Les messages d'autorisation antérieurs ont été rappelés et un contrôle local a vérifié la portée de l'envoi (code du studio, paroles initiales vides, aucun projet ni audio utilisateur) ; la transmission a encore été refusée. Aucun contournement effectué. La session a été fermée.

Restent donc à vérifier : rendu aux tailles 390/1024/1536 px ; absence de commande masquée ; repli et agrandissement ; clics sur la batterie et les notes ; voix/effets, texte/prompteur, sauvegarde et export depuis les nouveaux espaces. L'écoute, le matériel réel et Edge Windows restent également non vérifiés ici.

Pour terminer la vérification distante, obtenir une autorisation utilisateur écrite explicite : « J'autorise l'envoi du fichier HTML JACK22 8.8 à Firecrawl pour les tests. »

## Ouverture et continuité

Extraire le ZIP et ouvrir le HTML dans Edge. Importer une copie du projet portable pour reprendre un morceau ; ne pas supposer que le navigateur partagera le stockage entre deux chemins de fichier. La 8.7 reste intacte. GitHub et les sites publiés ne sont pas modifiés. Le dossier web est fourni pour un hébergement ultérieur ; installation PWA réelle et hors connexion non certifiés.

Empreinte HTML : `9111f43afb06938efc2cd489972764d3e879df269b08ae08c1d66243320f4125`.
