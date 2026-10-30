# DKC : commandes figées pendant l’autosave — 30 octobre 2026

Signalement : Vulture Culture, Paingpaing sur Yoshi, aucune commande ne répond. La position exacte de la sauvegarde du téléphone n’est pas accessible ici. Un premier test natif frais avait montré un déplacement vers la droite, puis une chute ; il ne reproduisait pas le gel de la sauvegarde utilisateur.

Le code DKC maintenait `dkCapturing=true` et la boucle native à0 pendant toute l’écriture IndexedDB. Une transaction lente ou suspendue sur mobile bloquait donc les ticks et les commandes avec `paused=false` (pas de popin). Le test de régression laisse volontairement `storeFile` en attente : l’ancienne version ne redémarre pas le moteur, la nouvelle le redémarre avant la résolution de l’écriture.

Désormais la pause native couvre seulement l’attente d’arrêt stable, la copie indépendante de l’état et l’encodage synchrone des métadonnées. Un `finally` libère la capture et respecte la pause explicite de l’utilisateur. L’écriture disque suit après la reprise. La classification carte/niveau est capturée avec l’état, afin qu’une transition survenant pendant l’écriture ne transforme pas une sauvegarde de niveau en checkpoint de carte. Un reçu de vies n’est confirmé qu’après écriture effective. La cadence de20 secondes s’applique aussi après un échec : pas de nouvelle pause à chaque tick.

Tests : écriture pendante avec moteur relancé et capture libre ; octets copiés indépendants ; requêtes coalescées ; pause/reprise utilisateur pendant le disque ; pause pendant l’accusé d’arrêt natif ; échec disque ; choix de checkpoint lié à la scène capturée ; délai avant nouvelle tentative après erreur. Aucun stage, boss, collision ou fichier de sauvegarde personnel n’est réinitialisé.

Limite : la transaction de stockage elle-même peut encore rester en attente, empêchant de nouvelles sauvegardes, mais elle ne verrouille plus les commandes. Reproduction sur la sauvegarde et le téléphone de l’utilisateur encore à confirmer après publication.
