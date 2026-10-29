# Vies réversibles et réparation — 30 octobre 2026

Le cheat « Vies illimitées » mémorise maintenant le compteur natif avant son premier remplacement par99 : Yoshi EU0379, DKC USARev20575. Le compteur de secours est indépendant des snapshots d’émulateur et persiste dans localStorage, par jeu et par branche normale/tous-stages. Désactiver restaure ce compteur immédiatement dans le jeu actif et lors du prochain chargement de l’autre jeu. Le changement de case sauvegarde aussi immédiatement le snapshot. Les sauvegardes natives et le relevé des vies normales suivent la cadence existante20 secondes ; aucun intervalle supplémentaire n’est ajouté.

## Migration demandée

L’ancienne version n’avait aucune copie pré-cheat du compteur. Impossible de retrouver sa valeur historique. À la première ouverture de cette version, un marqueur local note si des préférences de cheat existaient déjà. Pour ces installations, chaque ancienne sauvegarde chargée sans registre de vies est réparée une seule fois à10 vies, comme demandé, même si99 a déjà diminué à98. Si le cheat est encore actif, l’affichage reste99 et sa désactivation ramène10. Une nouvelle partie sans sauvegarde garde toujours sa valeur native. Une installation sans anciennes préférences de cheat garde également ses compteurs existants. La migration est locale à l’adresse et à l’appareil ; elle ne modifie pas à distance la sauvegarde du téléphone avant son prochain chargement.

## Protection

Le compteur pré-cheat doit être écrit avant99. Une panne de stockage empêche cette substitution. Après désactivation ou réparation, un marqueur de restauration reste persistant jusqu’à l’écriture effective d’un snapshot contenant le bon compteur. Une interruption juste avant la sauvegarde ne restaure donc pas l’ancien99 au prochain chargement. Un reçu lié à la capture mémoire empêche un autosave ancien de confirmer une restauration plus récente. Les registres de la branche tous-stages sont copiés lors de sa préparation, avec leurs compteurs pré-cheat, sans écraser ceux de la campagne normale. Revenir à la carte DKC garde désormais les vies du héros au lieu de récupérer celles du vieux checkpoint.

## Validation et limites

Tests couvrent les deux jeux, rechargement pendant le cheat, désactivation depuis l’autre jeu, réparation unique à10, nouveau joueur, cadence20 secondes, panne de stockage, interruption avant confirmation, reçu périmé, isolation des branches et copie du compteur avant activation. Le test de reprise native utilise désormais un stockage navigateur simulé. La traversée et la fermeture/reprise sur un téléphone physique restent à vérifier ; les sauvegardes personnelles du téléphone ne sont pas accessibles depuis cet ordinateur.
