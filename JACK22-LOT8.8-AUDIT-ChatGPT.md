# JACK22 8.8 — complément d'audit navigateur

Audit du 1 novembre 2026. Ce complément remplace la mention « essais distants bloqués » du bilan initial. L'autorisation explicite a ensuite permis les essais Firecrawl dans Chromium. Aucun essai Firefox, Edge Windows, micro physique ou écoute humaine.

## Version et protocole

HTML livré inchangé : SHA-256 `9111f43afb06938efc2cd489972764d3e879df269b08ae08c1d66243320f4125`.

Le navigateur distant a exécuté le HTML sur une origine de test HTTPS interceptée, sans publication du studio. Pour limiter le transfert, l'image Jackbot embarquée était réduite à 160 px dans la copie de test seulement. Les scripts et styles de cette copie sont ceux de la livraison ; la fidélité haute résolution du logo n'est pas vérifiée par cette copie.

## Résultats observés

- Les sept espaces principaux s'ouvrent par clic : Studio, Composer, Voix, Paroles, Exporter, Outils, Version.
- Pour chacun, les dimensions du document restent 1536 × 1024 et 1024 × 768 aux deux résolutions de bureau testées : pas de défilement global vertical ou horizontal. Cela n'exclut pas le défilement interne des panneaux.
- À 390 × 844, aucune largeur de document supérieure à la fenêtre. Le défilement vertical est conservé et nécessaire : Studio 2227 px, Composer 1624, Voix 1661, Paroles 1007, Exporter 844, Outils 1572, Version 933. Le design n'est pas présenté comme tenant sur un écran de téléphone.
- Les 19 boutons de sous-vue des espaces Composer, Voix, Paroles, Outils et Version révèlent les panneaux attendus. Le statut des outils reste présent.
- Replier/rétablir Patterns modifie correctement son état ; agrandir le Piano Roll active le mode de focus, puis Vue complète le quitte.
- Les sept onglets d'effets révèlent chacun leur carte d'origine (indices 0 à 6).
- Un texte d'essai reste identique dans Écriture, Prompteur et Vue double.
- Un clic sur Kick pas 2 passe son état de false à true. Un clic dans la grille du Piano Roll ajoute une note ; le statut annonce « 1 note · 2 mesures ».
- Sauvegarder, nouvelle navigation vers le même studio, puis Charger : le Kick modifié, la note et les paroles sont retrouvés. Ce n'est pas une fermeture complète du navigateur.
- Play passe à Pause ; Stop répond. Aucune écoute humaine n'est faite.
- Depuis le panneau Exporter, le vrai bouton produit un Blob WAV : 3 087 044 octets, RIFF/WAVE, stéréo 44 100 Hz, PCM 16 bits, 17,5 s. Crête 0,74115 et RMS 0,05426 : le rendu n'est pas silencieux. Le studio annonce 0,4 s de rendu. Le téléchargement sur Windows n'est pas vérifié.
- Une capture Composer a été examinée : disposition en quatre zones, barre fine et avertissement jaune visibles, Piano Roll réduit, Patterns dans son panneau à défilement interne. Les trois pistes Patterns restent dans le DOM ; la troisième se rejoint en faisant défiler ce panneau.

## Incidents du banc d'essai

Une première commande groupée a expiré parce qu'elle tentait de remplir le texte encore masqué par la sous-vue Prompteur, conservée d'un essai précédent. Rejouée après sélection de Vue double, elle réussit. Une tentative de rechargement a perdu l'interception réseau de l'origine de test et renvoyé une erreur DNS ; l'interception a été réinstallée et la navigation/restauration a ensuite réussi. Ces incidents ne justifient aucune modification du studio.

## Portée et suite pour Claude

Aucun défaut nouveau confirmé dans ces parcours ; aucun changement du code HTML pendant cet audit. Ce résultat n'est pas une certification exhaustive. Les 114 anciens tests audio ne sont pas rejoués ici. La voix réelle, J-Tune sur de nouvelles prises, l'import portable, les archives invalides, les performances lourdes, l'accessibilité, l'installation PWA et Edge Windows restent à contrôler indépendamment. Les essais historiques 8.6 ne deviennent pas des essais 8.8 par héritage du code.

Claude peut effectuer sa contre-expertise de la 8.8 en priorité sur l'accès aux commandes dans les panneaux à défilement interne, le focus/repli à faible hauteur, la voix et l'import/export portable. Conserver la 8.7 et les projets sources. Ne pas publier ni modifier GitHub sur la seule base de ce complément.
