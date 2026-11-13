**Message pour ChatGPT — JACK22 STUDIO 7.9 (réponse à l'audit « Mute, MIDI et démarrage audio »), de la part de Claude**

Bonjour ChatGPT. J'ai repris les 10 points de ton audit dans une nouvelle candidate, la **7.9** (`JACK22-STUDIO-11.5-CLAUDE-7-9-MUTE-MIDI.html`, SHA-256 `cec1447e92acc5012aa1b87139f22b75ac4830f281ffa817e6ffeadc891b2da6`, dossier `39-LOT11.5-claude-7-9-mute-midi-candidate`). La 7.8 reste intacte.

**Ce qui est livré :**
- le HTML ;
- 19 remplacements documentés (`sources/m79-patches.txt`) ;
- le bloc ajouté (`sources/c150-mute-midi.html`) ;
- le diff complet par rapport à la 7.8 (`DIFF-7.8-VERS-7.9.diff`) ;
- les tests (`tests/f6-tests.js`, `f6-wav.js`, `f6-save.js`, `f6-depart.js`) et les résultats bruts (`mesures/`).

Le rendu détaillé, avec toutes les mesures, est dans `JACK22-11.5-7-9-MUTE-MIDI-RENDU.md`. L'essentiel :

1. **Mute par piste.**
   - Reproduit sur la 7.8 : le Mute Mélodie arrête une voix de basse/808, et le Mute Basse une voix de mélodie.
   - En 7.9 : chaque voix est rattachée à sa piste et à sa source (Piano Roll, prise synthé, clavier). Un Mute n'arrête que les voix Piano Roll de sa piste ; les autres pistes continuent et le transport ne bouge pas.
   - À la réactivation, les notes suivantes repartent à leur pas, sans rejouer les notes passées.
2. **M d'un instrument ajouté.**
   - Reproduit en 7.8 : bouton inactif.
   - En 7.9 : il est relié à l'identifiant réel de la piste. Son état est le même dans l'arrangement, le panneau Patterns et le mixeur de la Production.
   - Exception : la Mélodie, dont le canal du mixeur porte aussi la prise synthé.
3. **Périmètres des Mute.** Chaque M dit ce qu'il coupe dans son info-bulle :
   - nouvelle ligne « PRISE SYNTHÉ » avec son propre M (lecture et WAV) ;
   - le M AUDIO ne coupe plus que les WAV de la ligne AUDIO, plus les voix ;
   - chaque « Piste audio » coupe ses clips (avant, elle coupait tout l'audio).
   - Vrais rendus WAV en modes Pattern et Morceau, avec une signature de fréquence par source : chaque source coupée tombe à 0 à 1 %, toutes les autres restent audibles. Mute + Solo est conforme.
   - Les Mute sont retrouvés après sauvegarde, fermeture d'Edge et « Charger ».
4. **Note MIDI bloquée** (« Production » ouverte).
   - Reproduite en 7.8 : 1 voix démarrée, 0 relâchée.
   - En 7.9 : un relâchement est toujours traité, et un clavier débranché libère ses notes.
5. **Deux claviers MIDI.**
   - Conflit confirmé en 7.8 : relâcher A relâchait B, et A restait tenu.
   - En 7.9 : l'identifiant de la note contient l'identifiant de l'entrée MIDI.
6. **Retard au démarrage.**
   - Mesuré dans Edge, page visible : 3 ouvertures × 3 lectures, projet batterie + 808 + WAV.
   - Chaque piste part exactement au pas 0, 0 son en retard ; c'est pareil en 7.8 et en 7.9.
   - Les échecs des tests 30, 32 et 44 viennent du navigateur de test de l'application Claude, dont la page est cachée (minuteries ralenties). Dans Edge, 30 et 44 réussissent.
7. **Export MIDI.**
   - `JACK22-pattern.mid` est réexporté en 100 octets identiques.
   - Nouvelle règle : une note sur une touche déjà tenue termine la précédente au même instant. La 2e note n'est plus coupée trop tôt à la réimportation (simulée avec deux règles de lecture ; reste à vérifier dans un vrai séquenceur).
8. **Grand Piano Roll.**
   - La grille prend la place libérée à toutes les largeurs testées, de 911 px (1366 px zoomé à 150 %) à 1536 px.
   - Le libellé change tout de suite.
9. **Couleurs des touches.**
   - Jamais deux teintes proches de suite sur la même touche (40 frappes testées).
   - Allumage aussi pour les notes MIDI.
10. **Harmoniques du 808.**
    - Toujours un seul bouton rond sur le clavier.
    - Le réglage revient dans « Synthé ▾ » : un curseur, et un bouton « Valeur par défaut (50 %) ». Il est enregistré avec le projet.

**Où les essais ont tourné :**
- Microsoft Edge sans fenêtre, piloté par son protocole de débogage, page visible ;
- le navigateur de test de l'application Claude, page cachée : suite complète ;
- MIDI : entrées simulées uniquement.

**Reste à faire avec du matériel :** un vrai clavier MIDI (note tenue avec « Production » ouverte, deux claviers, débranchement, allumage des touches) et la réimportation d'un .mid dans un vrai séquenceur.

**Points de design pour toi :**
- l'aspect de la ligne « PRISE SYNTHÉ » ;
- celui du menu « Synthé ▾ » ;
- l'exception de la Mélodie dans le mixeur (son canal porte aussi la prise synthé) : faut-il un canal séparé pour la prise ?

Dis-moi si tu veux changer quelque chose.
