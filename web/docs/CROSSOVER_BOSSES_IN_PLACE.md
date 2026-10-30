# Boss croisés dans le monde hôte — correction du 30 octobre 2026

La demande utilisateur porte sur les boss et leurs animations dans l'autre univers, pas sur un voyage dans le jeu du boss. Le départ automatique ajouté par bb49cf4 est retiré.

- Dans Yoshi’s Island, les sept boss DKC de la rotation sont dessinés et combattent dans le niveau Yoshi en cours.
- Dans DKC, les sept boss Yoshi de la rotation sont dessinés et combattent dans le niveau DKC en cours, après le boss natif lorsque le stage en possède un.
- Les banques de poses/déplacements, blessures, déformations et morts déjà extraites des ROMs sont de nouveau utilisées pendant tout le combat. Musiques et effets du donneur sont réactivés. Le décor, la caméra et les collisions appartiennent au jeu hôte.
- Les œufs, sauts, roulades et tonneaux passent par les contrôleurs de combat croisés existants. Les sorties restent verrouillées jusqu'à la fin de l'animation de défaite.
- Les compteurs de vies, sauvegardes réversibles et autosauvegardes sont conservés.

## Anciennes sauvegardes en transfert

Une URL ou un pointeur d'arène de bb49cf4 ne lance plus l'autre moteur pour combattre. Si le voyage est encore en phase fight, il devient relocated et revient automatiquement dans le niveau source, face au boss encore vivant et avec la sortie toujours verrouillée. Aucun stage n'est validé et aucune défaite n'est fabriquée. Les résultats won/lost/abandoned déjà enregistrés gardent leur traitement idempotent pour ne pas annuler une victoire acquise. Les copies sources et récépissés sont conservés.

Les classes NativeArenaGame restent dans les sources pour compatibilité et tests historiques ; aucun nouveau départ n'est déclenché par la boucle de jeu. Une éventuelle suppression ultérieure doit préserver la migration des anciennes transactions.

## Limites explicites

Les animations extraites et les comportements adaptés ne sont pas l'exécution intégrale du moteur du donneur. La planète avec gravité circulaire/piquets de Raphaël et l'estomac jouable/déglutition de Froggy ne sont pas implémentés dans DKC par cette correction. Ils demandent des sous-arènes et collisions propres au jeu hôte. Ne pas réintroduire un changement de ROM pour contourner cette exigence. La copie d'arènes natives de bb49cf4 est une expérience abandonnée à la demande de l'utilisateur.

Validation : 831 tests/74 fichiers et build TypeScript/Vite. Trois nouvelles régressions couvrent le rapatriement des voyages et le maintien des boss vivants/sorties verrouillées dans chaque jeu. Recette navigateur séparée en cours ; ne pas assimiler ces tests à quatorze victoires manuelles sur téléphone.
