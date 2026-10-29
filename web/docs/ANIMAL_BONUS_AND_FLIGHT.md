# Bonus animaux, Squawks et sol de Raphael

## Bonus animal invisible

Recette privée du véritable bonus EnguardeA6 : Kong actif slot2 en état30, lien0512=6, animal0C état7. L’acteur6 reste àx0/y0 (propriétaire technique dormant), alors que le corps contrôlé a x688 et y8248 dans les slots Kong. Le rendu utilisait les coordonnées dormantes, ce qui déplaçait l’animal ET le cavalier hors écran. nativeDkcMount utilise désormais les coordonnées du corps contrôlé pour les quatre bonus6C/A6/D2/D3, en conservant lien, ID et physique originaux. Les niveaux ordinaires conservent les coordonnées de leur vraie monture.

Les petites figurines dorées sont des bitmaps natifs de formations. La collecte par œuf passe par la même requête de cellule et le collecteur65816 d’origine ; aucun compteur de score n’est écrit directement. Zone de contact16×16 pour les quatre bonus,8×8 pour les bananes ordinaires. Un tir DEV traversant la vraie collision web puis le vrai collecteur natif a fait passer le compteur du bonus0→1. Espadon et Bobope visibles ensemble lors de cette recette.

## Raphael

La correction de rotation précédente redressait le sprite mais la trajectoire restait une orbite floor−45±35, donc ne touchait jamais réellement le sol. Il patrouille désormais à45px/s entre les bords de l’arène, pieds sur floor, vy0. Une sauvegarde avec l’ancien vol est recalée dès la prochaine mise à jour normale. Les séquences natives de blessure et de défaite ainsi que le verrou de victoire restent conservés. Il s’agit d’une adaptation à un sol DKC, pas de la planète ronde de Yoshi’s Island.

## Squawks

Preuve dans le code de la ROM DKC1 : NorSpr0D, CODE_B6F581/F5EF suit le héros avec sa lampe et ses animationsFly/Turn ; le tableau des montures jouables ne comprend que Rambi/Expresso/Winky/Enguarde. Le vol pilotable est une capacité du mod, pas une capacité originale à activer.

Nouveau DkcFlight : maintien Fly/Espace sans durée limite, vitesse native ascendante plafonnée400h, ralentissement près du haut de la vue courante pour rester visible ; le moteur original conserve terrain et caméra. Relâcher restitue la gravité native. Aucune position, salle, vie, collision ou scène de transition n’est réécrite. Les états d’eau, de blessure et de sortie sont exclus. Lors d’un saut du wagon natif (héros2E, acteur51 en état5 via1E0F), la vitesse est appliquée au wagon propriétaire plutôt qu’au corps passager. Les collisions/crashs et atterrissages du wagon restent originaux.

Recette réelle : maintien physique du bouton4s dans Mine Cart Carnage, puis maintien clavier Right+Space4s : montée continue, héros visible, x175→617 et y273→102, retour à la descente au relâchement. Le cas précis d’un wagon déjà occupé reste couvert par tests de mémoire et lecture du code original, sans recette prolongée sur les rails après prise du wagon. La limitation supérieure suit la vue native DKC ; le contrôle de caméra dédié à Yoshi’s Island n’est pas modifié.

Le choix du duo rend maintenant le focus au jeu : Espace ne doit plus rouvrir le boutonDuo après fermeture du dialogue.

## Validation et suite

758 tests /68 fichiers et build TypeScript/Vite réussis. Pas de nouvelle clé ni de format de sauvegarde. Toujours à faire : recette iPhone/Android physiques, parcours prolongé de chaque bonus et des rails, campagne complète. Les fixtures de tir et de chargement de niveau sont DEV seulement ou dans les diagnostics existants, elles ne modifient pas les sauvegardes de production lors des tests privés.

Contrôle visuel final dans le vrai combat : Raphael en phasefight, y205=floor205, vy0, marche au niveau du sol de l’arène. Le verrou de sortie du lot précédent reste actif.
