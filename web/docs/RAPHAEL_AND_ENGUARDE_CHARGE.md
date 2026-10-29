> Rectification du diagnostic : l’état natif11 n’est pas une preuve de mort. La commande1 de1E2B produit aussi cet état avec l’animation de victoire63. La conclusion ci-dessous « mort du duo » était trop affirmative. Voir RAPHAEL_EARLY_EXIT.md pour le correctif du verrou de victoire.

# Raphael et charge d’Enguarde — 29 octobre 2026

## Corrections
- Raphael : correction Canvas de la rotation native capturée E6h, soit −26/256 de tour. Les pixels PNG ne changent pas. Les six poses idle utilisent la pose corrigée ; les blessures et la défaite conservent leurs frames natives.
- Collision idle centrée sur les pixels visibles : 51,32 × 55,05 px, au lieu du cadre générique 80 × 80. Les blessures conservent leurs séquences natives.
- Les états natifs de fuite / prise de relais 09,0A,0B sont exclus des dégâts et arrêtent l’horloge du gardien comme les états de blessure. Les trois secondes de protection partagées ne sont plus consommées pendant ce relais.
- HUD : nombre de héros encore disponibles, basé sur les deux acteurs natifs. La perte des deux héros conserve le retour à la carte original et affiche que le boss reste vivant ; ce n’est pas une victoire.
- Enguarde : Charge / X est la seule commande de charge offensive. Impulsion horizontale de 0x400 pendant 300 ms, direction conservée ; les poissons vulnérables passent par le vrai hitflag natif20. Swim / Espace monte sans déclencher B/Y, les anciennes charges doublonnées. Le contact de la pointe reste offensif mais ne lance pas une autre charge. Les obstacles invulnérables restent natifs.

## Diagnostic natif et recette
Un onglet privé sur le port5215, avec une sauvegarde séparée de la production, a reproduit le retour signalé : Bobope blessé (état0D), Paingpaing prend le relais (0E/0A), puis sa mort11 mène à la carte avec Raphael à5PV. Le boss n’avait pas été vaincu. La correction réduit les contacts injustes ; elle ne supprime pas les morts normales du duo.

Après correction, Raphael est visuellement droit, son combat reste à6PV pendant plus de30 secondes avec protection du scénario de test, et sa séquence de défaite complète libère la sortie native puis revient à la carte. Le dernier impact de cette recette est soumis par le bouton DEV, pas par un tir manuel. Les tirs, relais et commandes sous-marines sont couverts par les tests unitaires. Une recette tactile sur iPhone/Android physiques et une partie complète sous l’eau restent à faire. Ne pas annoncer qu’elles ont été exécutées.

744 tests /66 fichiers réussis. Compilation TypeScript et build Vite vérifiés. Script de préparation reproductible : `python3 scripts/normalize-raphael-idle.py` ; également exécuté par `pack-guardian-sequences.py`. Aucun changement de clé ni de format de sauvegarde.
