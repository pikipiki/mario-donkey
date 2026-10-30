# Défaite contre un gardien Yoshi dans DKC — 30 octobre2026

Demande : avec un seul héros contre Raphaël, entendre la défaite et revenir proprement à la carte. Le retour natif après la perte du dernier héros reste le comportement attendu ; aucun stage n’est complété par cette défaite.

## Conflit corrigé

La musique web du gardien continuait tant que l’acteur DKC était présent. Le dispatcher de musique native recevait encore « stop » pendant les états de blessure/mort du dernier héros et pouvait couper DeathMusic. `DkcDefeat` observe maintenant le dernier héros perdu en états0B/0D/3A/3B/54 et l’absence de compagnon disponible. L’état11 peut être une victoire : il n’est jamais une preuve suffisante de défaite. L’état3B (chute/mort native) est ajouté au décompte des héros perdus.

Pendant la défaite : le thème web s’arrête, les attaques et l’horloge du gardien s’arrêtent, les contrôles d’attaque sont relâchés, le moteur natif continue son animation, sa perte de vie, sa transition et sa carte. Le message devient « Défaite · Retour à la carte… », puis « Défaite · Choisis le niveau pour réessayer ». Les coordonnées, vitesses, compteurs, scripts de progression et timings de fade ne sont pas réécrits. La pose de saut suit les coordonnées de la mort native du héros personnalisé.

Le son reste celui de la ROM DKC : MusicID DeathMusic=11 (hex), défini dans le disassembly local Misc_Defines_DKC1.asm. Si l’ancien stop a déjà coupé le morceau et que051D est nul, le dispatcher natif existant reçoit resume11 jusqu’à accusé de lecture. Si une musique native joue déjà, aucune commande supplémentaire n’est émise ; le morceau ne redémarre pas après sa fin et la demande s’arrête sur la carte. Aucun audio synthétique ou son de défaite du boss n’est substitué.

## Validation

Neuf tests : cinq états de mort natifs, mémoire inchangée, un seul déclenchement, fade/carte/reprise, partenaire encore disponible, état de victoire11, intégration DkcGame avec Raphaël et absence d’attaques ou de commande stop, demande DeathMusic jusqu’à accusé sans répétition. Build TypeScript/Vite. Vérification sur le téléphone et la sauvegarde exacte de l’utilisateur encore à faire.
