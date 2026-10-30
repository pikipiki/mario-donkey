> **Remplacé après clarification utilisateur :** les boss doivent combattre dans le décor du jeu hôte. Le départ automatique vers le moteur/arène du donneur est retiré. Voir `CROSSOVER_BOSSES_IN_PLACE.md`. Le code des transactions reste uniquement pour rapatrier les anciennes sauvegardes en transfert. Le texte ci-dessous décrit l'expérience précédente, pas le comportement actuel.

# Combats dans les arènes natives — 30 octobre 2026

Les rencontres croisées utilisent maintenant le moteur et l'arène du boss d'origine. Un seul émulateur fonctionne à la fois : sauvegarde du niveau source, chargement du jeu du boss, combat natif, puis retour automatique dans le jeu source. Les forteresses/châteaux gardent leur boss original avant cette rencontre ajoutée. La rotation existante est conservée.

## Boss concernés

| Depuis DKC, arène Yoshi | Salle | Stage natif |
| --- | --- | --- |
| Bélixo | 3D | 3 |
| Salvo | 70 | 7 |
| Bigger Boo | 74 | 15 |
| Milde | 82 | 39 |
| Prince Froggy | BF | 31 |
| Raphaël | CB | 55 |
| Tap-Tap | CC | 64 |

| Depuis Yoshi, arène DKC | Entrée native |
| --- | --- |
| Very Gnawty | 224 |
| Master Necky | 225 |
| Queen B. | 229 |
| Really Gnawty | 226 |
| Dumb Drum | 227 |
| Master Necky Snr. | 228 |
| King K. Rool | 104 |

Ce sont les sept boss de chaque rotation déjà définie dans le mod, pas tous les boss existants dans les ROMs. Les comportements, décors, caméra, musiques, animations de blessure et de victoire viennent du jeu natif. Les anciennes sauvegardes déjà dans une animation de mort du gardien gardent leur chemin de compatibilité.

## Commandes et apparence

Dans une arène Yoshi, le corps et les pouvoirs natifs de Yoshi sont conservés. Le héros choisi peut le chevaucher ; le duo reste sauvegardé. Le bouton d'attaque devient **Attaque ↓** pour le saut écrasant : sauter, puis attaquer. Froggy avale réellement Yoshi ; Raphaël utilise sa planète tournante et ses piquets. Les montures simulées ne remplacent pas ces mécaniques natives.

Dans une arène DKC, les acteurs natifs affrontent le héros et le pont existant garde les œufs, la langue et le duo. La victoire suit les règles natives du boss ; cette modification ne transforme pas tous les boss en simples jauges vulnérables à toutes les attaques. Dumb Drum conserve notamment son combat natif par vagues. Les œufs sont illimités pendant ces combats.

## Sauvegardes et retour

`native-arena.ts` définit un voyage versionné et validé. Une copie immuable de la sauvegarde source, le duo et les vies sont enregistrés avant le départ. Les sauvegardes de l'arène sont isolées par UUID ; elles ne remplacent pas la campagne normale de l'autre jeu. Un pointeur permet de reprendre un voyage interrompu. L'autosauvegarde reste toutes les vingt secondes.

La victoire est prouvée par le moteur : clé/mode de victoire Yoshi ou véritable banane géante DKC, jamais par un délai, une jauge web ou le faux KO de K. Rool. Le passage rapide de la banane entre ses états 0 à 3 est accepté. Les valeurs de vies invalides de game over ne deviennent pas 99.

Au retour, un récépissé dans la sauvegarde source rend l'application du résultat idempotente. Une sauvegarde différente provenant d'un autre onglet n'est pas écrasée. Les vies et le duo reviennent avec le joueur. Depuis Yoshi, le cercle natif est rétabli et doit être traversé pour terminer le stage ; aucun indicateur de stage terminé n'est fabriqué. Depuis DKC, la sortie native est libérée après victoire. Une défaite ou un abandon revient à la carte sans attribuer la victoire.

Le menu de réparation permet d'abandonner l'arène. Les changements de cheat sont bloqués pendant ce voyage ; le registre normal de vies et les sauvegardes normales ne sont pas pollués par la copie d'arène. Une restauration du compteur suivie d'une perte légitime de vie peut être confirmée sans guérir cette perte au prochain chargement.

## Validation et limites

- 828 tests réussis dans 74 fichiers ; TypeScript et build Vite de production réussis.
- Entrée des quatorze arènes et acteurs natifs observés dans Chrome temporaire via REA, sans erreur JavaScript observée.
- Froggy : déglutition puis entrée effective dans l'estomac, mode de salle 0D, observées après confirmation du dialogue natif.
- Aller-retour Yoshi 1-1 → Very Gnawty → Yoshi : banane native, duo/vies conservés, cercle rétabli, récépissé persisté.
- Aller-retour DKC → planète de Raphaël → carte DKC : duo/vies conservés. Pour accélérer la recette, un bouton réservé au développement rejoue le dernier piquet accepté dans la séquence native ; ce n'est pas une victoire entière jouée à la main.
- Les recettes utilisent des profils Chrome et des sauvegardes de test séparés ; aucune sauvegarde personnelle n'a été éditée à distance.

Les quatorze combats n'ont pas tous été joués manuellement jusqu'à la victoire. À confirmer sur iPhone/Android physiques : son après chaque rechargement de moteur, reprise après fermeture du navigateur, confort des contrôles et performance. Vérifier aussi les victoires complètes des autres boss, les morts/game over, les combats à niveaux de wagon, le mode vies illimitées et les anciens états de sauvegarde. Les transitions rechargent le moteur ; aucune promesse de transition sans délai sur tous les téléphones.

Les sources principales sont `native-arena.ts`, `native-arena-game.ts`, `native-dkc-arena-game.ts`, `app.ts`, `game.ts`, `dkc-game.ts` et `tests/native-arena.test.ts`. Les points d'entrée Yoshi reprennent les scripts de capture ROM existants. Les enregistrements synthétiques de recette sont dans le dossier de travail `outputs/native-arena-evidence.json`.
