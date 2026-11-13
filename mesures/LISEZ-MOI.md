# Mesures brutes de la 7.9

Chaque fichier contient le résultat tel que le test l'a renvoyé, ainsi que les conditions d'exécution : navigateur, page cachée ou non, taille.

**Où les essais ont tourné :**
- **Edge sans fenêtre** (*headless*), piloté par son protocole de débogage, page visible : pour tous les fichiers sauf `suite-claude-1536.json` ;
- **navigateur de test de l'application Claude**, page cachée : pour `suite-claude-1536.json`.

## Comparaisons avec la 7.8

| Fichier | Contenu |
|---|---|
| `f6-edge-7.8.json` | les 15 cas de `tests/f6-tests.js` lancés sur la **7.8** : les défauts de l'audit y sont reproduits |
| `f6-edge-7.8-mute.json` | sur la **7.8** : le Mute Mélodie arrête une voix de basse, et le Mute Basse une voix de mélodie |
| `f6wav-edge-7.8.json` | rendus WAV sur la **7.8** : M de l'instrument inactif, pas de M pour la prise, le M AUDIO coupe aussi la voix |
| `f6-grand-edge.json` | Grand Piano Roll à 9 tailles, sur la 7.8 et sur la 7.9 (avant les dernières retouches d'affichage) |
| `f6-depart-edge.json` | départ des pistes, 3 ouvertures × 3 lectures, sur la 7.8 et sur la 7.9 (avant les dernières retouches d'affichage : le moteur n'a pas changé depuis) |
| `t30-32-44-edge.json` | tests 30, 32 et 44 lancés seuls, sur la 7.8 et sur la 7.9 |

## Version finale (SHA `cec1447e…`)

| Fichier | Contenu |
|---|---|
| `f6-edge-7.9-final.json` | les 15 cas de la 7.9 et les 3 rendus WAV |
| `file-edge-7.9-final.json` | les mêmes 18 cas, avec le fichier ouvert en `file://` (comme un double-clic) |
| `f6save1-edge-7.9.json` puis `f6save-edge-7.9.json` | sauvegarde, fermeture d'Edge, nouvelle session, « Charger », rendus WAV |
| `f6-depart-edge-7.9-final.json` | départ des pistes à l'ouverture, puis 2e et 3e lectures |
| `f6-grand-edge-7.9-final.json` | Grand Piano Roll à 9 tailles |
| `suite-edge-7.9-final-4tailles.json` | suite complète aux 4 tailles d'ordinateur |
| `suite-claude-1536.json` | suite complète dans la page cachée du navigateur de test de l'application Claude |
