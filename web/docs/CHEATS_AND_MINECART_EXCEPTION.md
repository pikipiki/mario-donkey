# Cheats réversibles et exception des wagonnets — 30 octobre 2026

## Menu

Les deux cases se trouvent au début de ☰ → Cheat codes, avec des lignes tactiles d’au moins48px et une case26px :

- Vies illimitées : recharge le compteur natif à99 dans les deux jeux (Yoshi EU0379, DKC USA Rev20575). Les dégâts, les morts et les reprises natives restent actifs. Décocher arrête la recharge ; le compteur actuel redevient un compteur normal, sans promettre de restituer un ancien nombre de vies.
- Tous les stages accessibles : ouvre tous les mondes et stages des deux jeux, dans une partie séparée. Décocher restaure le jeu et la sauvegarde normale d’avant l’activation. La progression du mode cheat n’est pas fusionnée avec la campagne normale.

## Protection des sauvegardes

`cheats.ts` conserve les préférences dans localStorage (clé séparée pour la recette DEVtest). `storage.ts` résout le nom physique de chaque fichier AVANT toute attente asynchrone. Quand le mode est actif, campagnes, checkpoints, sauvegardes SRAM contenues dans les snapshots, sauvegardes de secours et transfert de duo sont isolés sous `all-stages-sandbox-v1::`. ROM et bootstrap immuables sont partagés.

À chaque activation, le jeu termine toute sauvegarde précédente, capture une sauvegarde fraîche, puis copie les fichiers normaux dans le mode séparé au sein d’une transaction IndexedDB unique. Seuls les anciens fichiers de ce mode sont remplacés ; les fichiers normaux ne sont ni écrits ni supprimés. La préférence change après la réussite de la copie. La désactivation recharge le monde d’origine sans marqueur de tuyau : il doit reprendre sa scène sauvegardée, pas être redirigé vers une carte. Le rechargement automatique passe par le démarrage existant et le propriétaire audio persistant. Si une préférence ne peut pas être enregistrée, le namespace actif ne change pas.

Le mode est local à cet appareil et à cette adresse du site. Netlify et GitHub Pages ont déjà des espaces de sauvegarde différents. Aucun format existant de campagne n’est modifié.

## Ouverture native des cartes

Yoshi : indicateurs0222..0269, dernier monde0216, six lignes de12 icônes030F..0356. Les scores02B8 ne sont pas modifiés. Les valeurs suivent le déblocage de debug natif bank17. Une carte rechargée en mode cheat est reconstruite pour dessiner ses nouvelles icônes, même lors de la première arrivée depuis DKC.

DKC : les tables natives de correspondance des entrées et de connexion des cartes sont extraites de la ROM USARev2 vérifiée, dans `src/generated/dkc-unlock.json`. `scripts/extract-dkc-unlock.py` les régénère en vérifiant le SHA256 exact. Les indicateurs0583 sont ouverts ; les routes bidirectionnelles et icônes sont complétées dans les cachesFAFC/FC00 seulement sur la carte. FC00 est réutilisé par les bitmaps de bananes en niveau : il ne faut jamais l’écraser pendant une partie. Les tests vérifient les octets des tables contre la ROM, chaque arête et cette séparation de mémoire.

## Exception des wagonnets

Mine Cart Carnage et Minecart Madness n’ont aucun boss ajouté, pour leurs11 entrées, checkpoints et bonus. Leurs gardiens d’anciennes sauvegardes sont abandonnés ; leurs sorties natives ne restent pas verrouillées. Le morceau natif4 peut reprendre si un ancien combat avait coupé la musique. Les autres38 niveaux conservent une rotation des7 gardiens, dans l’ordre des niveaux éligibles, sans répétition immédiate.

## Recette exécutée

779 tests /70 fichiers et build TypeScript/Vite. Dans un onglet privé, origine locale et base IndexedDB distinctes de la production :

1. Activer vies illimitées dans DKC : compteur99.
2. Activer tous les stages depuis un combat Raphael du niveau224 : sauvegarde du combat normal puis ouverture de la carte DKC avec toutes ses routes.
3. Mesurer les empreintes SHA256 des fichiers normaux DKC campagne et checkpoint ; voyager par le tuyau vers Yoshi ; constater72 indicateurs ouverts et99 vies ; reconstruire la carte et naviguer jusqu’au monde6 avec toutes ses icônes.
4. Vérifier les empreintes des fichiers normaux, toujours identiques malgré les sauvegardes des deux jeux en mode cheat. Désactiver depuis Yoshi : retour au combat DKC224 sauvegardé avant l’activation. Le jeu reprend ensuite sa physique et peut immédiatement déplacer ou blesser le héros ; une lecture après reprise ne représente pas un arrêt sur image de la sauvegarde.
5. Faire une seconde activation depuis une partie Yoshi normale : les6 onglets et toutes les icônes apparaissent automatiquement. Désactiver : les72 indicateurs de progression sont exactement identiques à ceux lus avant l’activation (12 valeurs1 dans ce bootstrap précis).

Les fixtures et audits SHA256 sont DEV seulement. Les tests unitaires vérifient également les11 entrées de wagon sans gardien, leurs deux verrous de sortie désactivés, la reprise de musique et la capture fraîche après un autosave encore en cours.

Restent à faire : recette sur téléphones iPhone/Android physiques, partie prolongée dans les deux niveaux de wagonnets jusqu’à leur véritable sortie et campagne complète. La validation des sorties de wagonnets ici repose sur les garde-fous de la passerelle et les routines natives laissées libres, pas sur une traversée complète des rails. Quota au dernier contrôle56% restant ; seuil demandé10% non atteint, rapport Gemini actualisé malgré cela.
