# Accueil Studio : instruments entiers

La hauteur fixe et le masquage du débordement pouvaient couper le piano. Ce correctif ajoute uniquement des règles CSS ciblées sur la page Studio visible. Les autres espaces, les scripts et les fonctions sont inchangés. Le mixeur et le synthé ont une hauteur minimale suffisante ; sur un écran court la page peut défiler verticalement. L’accueil conserve arrangement et effets au-dessus, mixeur et synthé/piano au-dessous. Aucune promesse de faire tenir tous ces contrôles lisibles sur une seule hauteur de 768 px. M6/15 restent retirés.

Contrôles et limites : scripts identiques à la variante précédente ; intégrité ZIP et cache actualisés. Voir le complément de test joint pour les mesures navigateur, si disponible. Ne pas présenter les anciens rapports comme un audit de ce correctif. Claude doit contrôler les quatre panneaux et le clavier aux résolutions de Bob avant validation Edge/micro.

## Essai Chromium via Firecrawl

Mesures à 1536×864, 1366×768 et 1024×768 : clavier de 110 px de haut, centre non recouvert et défilement de page possible ; pas de largeur dépassant la fenêtre. À 1536×864, en bas de page, le clavier est entièrement visible de y=711 à y=821 (fenêtre 864), ses 24 touches sont présentes, un clic réussit. Composer puis Studio s’ouvrent. La copie de test réduit uniquement le PNG Jackbot à 160 px pour le transfert, sans changer les scripts/CSS. Aucun nouveau test audio, Edge, micro réel ou écoute. Le défilement est volontaire et nécessaire sur les écrans courts.
