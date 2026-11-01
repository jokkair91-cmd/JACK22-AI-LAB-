# JACK22 9.1 candidate — interface allégée (Claude)

## En bref

- **Base :** la 9.0 candidate corrigée. Le HTML de ChatGPT (empreinte d4409c34… contrôlée), le bloc de corrections `claude90` et toutes les corrections précédentes sont conservés.
- **Nouveauté :** un seul bloc ajouté, `claude91Styles` et `claude91Module`. Une copie se trouve dans `sources/claude91-style.html`.
- **Ce qui ne change pas :** le moteur audio, les notes enregistrées, les raccourcis, les sauvegardes et le format de projet. Seuls le titre et le nom du fichier passent à « 9.1 CANDIDATE ».
- **Versions précédentes :** la 9.0 corrigée reste conservée, et la 8.9 validée reste la version de secours.
- **Captures :** voir `captures/AVANT-APRES.html` (quatre comparaisons avant / après, annotées).

## Ce qui a été allégé

Inventaire fait dans tous les onglets. Les seules inscriptions de notes ou de numéros répétées hors de l'accueil sont les trois suivantes.

| Où | Avant | Après |
| --- | --- | --- |
| Composer · Piano Roll, colonne de gauche | Un nom de note sur chacune des 72 lignes (B6, A#6, A6…) | Seuls les « C » (C1 à C6) restent écrits, en repère discret avec un trait de séparation. La ligne sous la souris s'allume en ambre avec son nom. |
| Composer · Piano Roll, notes | Nom seulement dans une info-bulle lente | Note sélectionnée : contour ambre et étiquette avec son nom. Note survolée : nom discret. |
| Composer · Batterie, règle | Numéros 1 à 16 ; pistes flottant au milieu du panneau | Numéros 1, 5, 9, 13 (débuts de temps) ; le pas survolé s'affiche en ambre et est encadré ; pistes collées à la règle (16 px). |
| Studio · vue détaillée Orbite (hors accueil) | Lettre du clavier d'ordinateur sur chaque touche | Lettres masquées ; C4 / C5 en repère discret ; la touche survolée ou jouée affiche son nom (« G4 ») et sa lettre. |

Typographie : les noms de notes et les numéros utilisent la police à chasse fixe de la charte (Consolas), en 9,5–10 px. Les éléments sélectionnés ou survolés utilisent l'ambre de la charte (#f5b13f).

## Ce qui n'a pas été touché, et pourquoi

- **Le clavier de l'accueil** garde ses repères C4 / C5 et ses lettres de clavier d'ordinateur, puisque l'accueil doit rester strictement identique à la 8.9 validée. Bob voit sans doute ces « C4 / C5 » en premier : s'il veut aussi les alléger sur l'accueil, il faut lever la règle de l'accueil identique pour ce seul point.
- **Les blocs de l'arrangement** (« Pattern 1 ») sont sur l'accueil : non touchés.
- **La vue Patterns, la prise de notes, les voix, les paroles, l'export et les outils** ne contiennent pas d'inscriptions de notes répétées. Rien n'y a été retiré.

## Vérifications

- **Accueil comparé à la 8.9 validée :** 408 éléments à 1249×848, 1874×1272, 1536×864, 1366×768 et 1024×768, et 407 à 390×844. Position, taille, couleur, opacité et police comparées : **0 écart**, même hauteur de page. Les captures de l'accueil avant et après sont **identiques octet par octet**.
- **Suite de Claude** (nouveau test 27 sur l'allègement), aux 5 tailles : **25 réussis, 2 non applicables, 0 échec**. Le test 27 vérifie :
  - l'accueil intact, avec les lettres du piano visibles ;
  - dans le Piano Roll, seulement des « C » écrits, la ligne survolée et la note sélectionnée correctement nommées, et la note ajoutée bien enregistrée ;
  - dans la Batterie, les numéros 1, 5, 9, 13 et le pas survolé affiché ;
  - dans la vue Orbite, les lettres masquées et la touche jouée nommée.
- **Suite de ChatGPT pour les cinq outils :** **23 sur 23**.
- **Export WAV :** identique à l'octet près à toutes les versions depuis la 8.6 (SHA-256 3bafcb07…).
- **Commandes atteignables :** 292 visibles à chaque taille, toutes cliquables. Les 7 outils de « Réglages ▾ » restent cliquables quand le menu est ouvert.

Corrigé pendant les essais : un fondu de 80 ms sur l'apparition des noms restait bloqué quand le navigateur de test était masqué. Il a été retiré : l'affichage est maintenant immédiat.

## Non vérifié

- Edge sur Windows, l'écoute humaine, un vrai micro et le tactile. Sur écran tactile, il n'y a pas de survol : les noms apparaissent à la sélection d'une note, et sur la touche jouée.
- Les captures viennent du navigateur intégré, en basse résolution (800 px de large). L'œil de Bob dans Edge reste le juge final.
