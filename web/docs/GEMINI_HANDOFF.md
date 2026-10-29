## 29 octobre 2026 — régression roulade et boss DKC dans Yoshi (568 tests)

Retour utilisateur : roulade inefficace contre monstres/plantes, puis saut/roulade sans dégâts sur les boss DKC ajoutés dans Yoshi et arène suivant l’écran. Le test navigateur pré-correctif a bien tué un Shy Guy du1-1 avec Bobope : ne pas prétendre que tous les contacts étaient cassés. Deux défauts boss sont établis dans le code : StageBosses ne prenait que nativeEggHit ; les positions/sol/vols étaient recalculés à partir de la caméra courante.

Correction : StageBosses accepte une attaque rolling, détecte le franchissement descendant du dessus de chaque boss avec les pieds du héros (ancreY+32), donne un rebond natif-$500 uniquement sur un saut accepté, partage la grâce0.3s avec les œufs et empêche le même contact de blesser simultanément le héros. Contacts latéraux sans roulade et sauts montants restent dangereux. Réinitialiser l’historique de trajectoire à la pause/reprise/changement de pièce ; ne pas inventer une chute depuis un ancien état. Les sept boss DKC importés sont concernés. Les boss Yoshi d’origine restent natifs.

GuardianSave.arena optionnel mémorise caméraX/Y et hauteur AU DÉBUT de la rencontre. Sol, limites, oscillations aériennes et décor Necky restent dans ce repère du niveau, indépendamment du défilement. Compatible avec les anciennes sauvegardes (initialisation de l’arène au premier tick). Le sol du boss reprend maintenant la hauteur native du goal, sans le décalage+16px qui enfonçait ses pieds. Pas de réécriture des tuiles du niveau ni des coordonnées de caméra. Il s’agit du décor Yoshi existant avec l’arène crossover, pas d’un remplacement du stage par une salle native DKC.

Roulade ordinaire : l’ancien bouclier de4frames pouvait expirer entre deux rendus mobiles espacés. protectRoll couvre la durée restante en frames natives50Hz (+2), reste sous$40 pour ne pas déclencher le chemin de stun natif et conserve une protection native plus longue. Il s’exécute avant les collisions des boss. applyRoll balaie aussi le déplacement continu entre deux rendus (maximum96px, même pièce), conserve la liste des ennemis autorisés et le nettoyage natif des graphismes des plantes. Aucun décès de collectible, porte, anneau, Baby Mario ou objet de progression. Dialogues/verrous/transformations restent protégés. Le partenaire visuel n’a toujours pas de collisions indépendantes.

Tests : les5 héros ×7 montures (à pied, Yoshi et5 animaux), chacun avec tous les IDs autorisés de monstres/plantes hostiles + une fleur collectible protégée ; rendu espacé de200ms ; ennemi traversé entre deux images vs téléportation ; les7 boss par roulade et saut, coups non répétés sur un même frame/grâce, contacts montants exclus ; les7 arènes inchangées après déplacement de caméra500px, décor Necky ancré. Certaines combinaisons Mario+monture artificielles sont exercées au niveau du pont, même si l’interface force Mario sur Yoshi.568 tests /49 fichiers et build. Recette physique mobile toujours restante ; tests du pont ne signifient pas campagne complète jouée avec chacune des35 combinaisons.

Recette navigateur isolée5201 : vraie sortie1-1 chargée par la fixture native, Bobope à pied, direction gauche puis bouton Roll ; Gnawty3→2HP sans œuf, son boss-hit, arène3415/1532 et sol1712 conservés malgré caméraY1548. Preuves outputs/verification-yoshi-boss-roll.png/json. Les tentatives suivantes de saut/repositionnement ont pris des dégâts latéraux et ne constituent pas une preuve manuelle de stomp ni de victoire complète. Le stomp et les sept types de boss sont validés par tests du pont ; poursuivre une recette manuelle contrôlée sur mobile.

---

## 29 octobre 2026 — duo, caméra Squawks, boss et Dumb Drum (515 tests)

### Livré dans ce lot

- Contrôles paysage : deux portraits du duo + Tape (T) + Duo. Choix des cinq héros dans le dialogue Duo, deux membres distincts. Monture déplacée dans ce dialogue pour ne plus tronquer les noms. Joystick agrandi et quatre actions bornées en hauteur, y compris paysage de plus de600px de haut (capture utilisateur1080×955). Portrait conservé. Cibles44px minimum.
- `Adventure.team` optionnel, anciennes sauvegardes compatibles. Partenaire visuel suivant22 positions natives de retard. `TeamTag` adapte la tape0.42s de goonk-country à toutes les dix paires possibles ; permutation unique à mi-animation, au sol. Les entrées sont relâchées pendant la tape. Un seul héros possède les collisions natives ; le partenaire suiveur est visuel. Duo/Tape et les tuyaux préservent le couple sauvegardé. Sur carte la permutation est immédiate.
- Squawks : suppression de la limite artificielle écranY32. `SquawksCamera` loue le vrai drapeau GSU1E0A de suivi aérien, restaure sa valeur hors vol/au sol/pause et ne transporte pas l’ancien drapeau dans une autre pièce. Aucune écriture directe de caméra, de limites ou de tuiles. Le suivi horizontal fonctionne déjà nativement dans les deux directions.
- Burt dans DKC : arène ancrée en coordonnées du niveau, six sauts/vitesses et étapes adaptés au code source Yoshi ; direction choisie au lancement du saut, plus de poursuite de caméra. Six impacts pour une nouvelle rencontre, anciennes sauvegardes3HP compatibles.17 poses originales capturées de la ROM EU (attente, impulsion, montée, descente, réception, blessure, défaite), atlas3264px de large/36Ko. Œufs, saut descendant, roulade et vrais tonneaux/TNT lancés le blessent. Ne pas effacer les slots natifs : les tonneaux passent par leur nettoyage natif.
- Boss DKC originaux : mêmes quatre types d’attaque soumis à leurs vraies fenêtres de vulnérabilité et à leurs routines natives de dégâts, animation, bruitage, mort et victoire. Œufs illimités tant que le boss est présent, y compris ses phases invulnérables ; ces boss ne sont jamais avalables. `DkcBossContact` observe contacts/trajectoires, ne réécrit pas leurs HP. Gnawty utilise un jeton8001 interprété par une garde ROM précisément validée pour permettre les projectiles malgré sa comparaison native de hauteur ; collisions d’origine préservées.
- Dumb Drum : choix utilisateur confirmé « Ajouter une jauge et garder ses vagues ».5HP supplémentaires,45frames entre impacts, jauge visible, état sauvegardé. Ses vagues restent natives et peuvent toujours terminer le combat normalement. À0HP, la vague présente doit être vaincue ; la garde ne fait alors qu’emprunter la branche native de chute/explosion→banane→carte. Aucun compteur de vagues ni déblocage falsifié. À la mort du héros, l’état supplémentaire est réinitialisé.

### Adresses et preuves natives

ROMs exactes inchangées (hashes dans world/profile). Hooks de ce lot : comparaison Gnawty36DBD4→FBFC00, comparaison de fin de vague Drum36DD7E→FBFC40, requête privée de slot3BFC3E, espace libre vérifié. Les gardes existantes rendu3BFFD0, sorties3BF800 et banane3BFA00 restent séparées. Installer toutes les gardes avant loadState ; restaurer la requête Drum sauvegardée AVANT d’exécuter le premier frame repris. `DkcNativeBossHitHooks.restore` restaure la ROM octet pour octet.

Scripts reproductibles : `scripts/probe-dkc-native-boss-hit.py`, `probe-dumb-drum.py`, `probe-squawks-camera.py`, `probe-squawks-lateral.py`, `verify-burt-source.py`, `capture-burt-poses.py` et sélection burt-pose-selection.json. Ils s’appuient sur les sources exactes et le Mesen déjà présent dans le workspace ; ne pas refaire un appel REA sur .sfc non pris en charge. Captures hors ligne dans les sous-dossiers du workspace parent ; aucune seconde ROM exécutée dans le navigateur.

Preuves Squawks : 1-1 natif heroY1904→1294, caméra1756→1548 avec suivi (reste1756 avec vitesse seule), limites0/1804 inchangées. Latéral : heroX121→694→168, caméraX0→618→3, limites0/3840 inchangées. Preuve Drum : jeton absent→vague suivante ; jeton présent avec ennemi vivant→attente ; après disparition native de la vague→chute6, explosion7, état4, vraie banane puis carteE6. Ce sont des fixtures de frontière de routine, pas une campagne jouée entièrement.

### Validation et suite pour Gemini

515 tests /49 fichiers et build TypeScript/Vite. Cas ajoutés : toutes les paires, permutation unique, téléportation/pièce, sauvegarde ancienne, caméra réservée aux vols sûrs, dégâts natifs sans HP/position boss réécrits, tonneaux tenus exclus/tonneaux lancés consommés une fois, boss non avalables, six œufs pendant l’invulnérabilité, HP Drum et requête de défaite persistantes.

Recette navigateur sur origine isolée5200 : paysage1280×720, portraits69×46px, Tape/Duo44×46px, joystick166×166px, actions sur220px de haut. Duo Mario+Yoshi/Diddy choisi, vraie entrée Jungle, tape vers Diddy observée, audio toujours running. Vrai Very Gnawty puis fixture de dernier coup natif→Burt6HP avec musique/animation native extraites, vraie visée/jet d’œuf. Vérification physique iPhone/Android reste nécessaire ; ne pas annoncer un test tactile matériel ni une nouvelle taille de viewport (le redimensionnement global a été refusé pour protéger la partie utilisateur).

Travail encore à faire : importer les autres boss Yoshi si variété souhaitée (le gardien Yoshi actuellement disponible dans DKC est Burt seulement) ; comparer chaque combat complet contre le jeu original sur appareil physique. L’IA Burt est une adaptation TypeScript du code source, pas l’exécution du SuperFX dans DKC ; sa longue perte du pantalon est condensée. Vérifier les quatre attaques sur chaque boss dans les conditions normales de jeu, et l’ergonomie44px/portrait/petits paysages sur iPhone/Android. Le système utilise toujours un seul cœur, un hôte audio parent permanent et l’iframe game-host : préserver cette architecture et les sauvegardes. Voir les rubriques historiques ci-dessous pour toutes les limitations déjà connues.

---

## 29 octobre 2026 — blocage iPhone après tuyau, propriétaire audio permanent (470 tests)

Photo utilisateur : « undefined / Click to resume Emulator » et « Decompress Game Core99% » après DKC→Yoshi. La version précédente quittait le document entier ; WebKit perdait le contexte déverrouillé par Jouer. Le moteur local EmulatorJS checkStarted attend alors AL.sources[].gain.context.state et ouvre un popup audio via createPopup sans titre, origine du undefined. Ne pas simplement masquer le popup : le cœur peut rester sans frames et prepare finit en timeout.

Architecture corrigée : `src/main.ts` devient un hôte léger permanent. `src/app.ts` contient l’ancienne application. Un seul iframe same-origin game-host contient le monde actif. Le tuyau conserve son flux sauvegarde+son+transfert, mais location.replace remplace désormais seulement le document du jeu. L’hôte parent et son HTMLAudioElement déverrouillé/AudioContext restent vivants. installAudioHost crée réellement AudioContext dans le parent ; primeAudio dans le jeu appelle son propriétaire et fournit exactement ce contexte au constructeur OpenAL de chaque nouveau cœur, sur mobile et desktop. Pas de clic synthétique, pas de contournement des règles d’activation : premier Jouer est toujours un vrai geste.

Un seul cœur actif ; l’ancien monde est mis en pause/sauvegardé puis déchargé avec son document. detachNativeMixer déconnecte uniquement ses gains, jamais ne close/suspend le contexte partagé. Le détachement est évité pour un pagehide.persisted (BFCache) afin que le retour navigateur puisse reprendre son mixer. Ne pas remettre le propriétaire audio dans le document qui navigue. Le plein écran cible le document parent afin de survivre aux tuyaux. syncHostRoute reflète l’adresse du monde dans la barre d’adresse sans naviguer le parent et sans exposer game-frame=1. Origine IndexedDB/localStorage inchangée, schémas et clés de sauvegarde inchangés.

470 tests /43 fichiers, build TypeScript/Vite. Les tests audio-host couvrent propriétaire unique entre fenêtres, contexte non fermé lors du détachement des gains, route parent remplacée sans navigation et isolation cross-origin. Le diagnostic DEV audioOwner indique persistent, generation et state ; data-frame-loads sur game-host compte les documents remplacés. Paramètre DEV ios-audio-test active les branches isSafari/isMobile du moteur local avant son démarrage (via EJS_ready), avec le cœur legacy. Il ne prétend pas émuler physiquement WebKit.

Recette isolée5199 : DKC initial→Yoshi→DKC avec Safari-checkStarted activé ; générations audio=1 tout du long, état running, chargements iframe1→2→3→4 (dernier passage à nouveau vers Yoshi), aucune validation Jouer/resume. Signal natif Yoshi mesuré0.04263, DKC0.08781 ; transfert Mario+Yoshi conservé. Preuves outputs/verification-pipe-persistent-yoshi.png et verification-pipe-persistent-audio.json. Pas de téléphone physique ni nouveau redimensionnement global du navigateur : validation matérielle iPhone reste à faire. Le chargement de la nouvelle ROM/cœur existe toujours ; le 99% périmé est remplacé par Opening your saved adventure dès que le moteur démarre.

Pour les futures modifications UI, éditer désormais app.ts. main.ts ne doit plus contenir le runtime SNES ni stocker la partie. Ne jamais effacer les sauvegardes pour corriger un échec de démarrage.

---

## 29 octobre 2026 — Bébé Mario sur Yoshi dans DKC (466 tests)

Nouvelle sélection `mario` affichée « Mario + Yoshi ». Le défaut Bobope reste conservé. Adventure.select et la restauration placent ce duo sur mount=yoshi ; le duo ne descend pas à pied via ride. Les quatre héros précédents et leurs sauvegardes restent compatibles, sans changement de version. Les transferts par tuyau conservent ce choix.

Dans DKC, SpriteAtlas.drawMarioYoshi affiche des sprites authentiques du duo extraits d’une exécution privée de la ROM EU dans Mesen. Images64px transparentes, origine[32,56],16poses retenues (repos3, marche5, saut4, flutter4), visage normalisé vers la droite et miroir à gauche, pieds ancrés aux coordonnées natives DKC. Pas de lissage. `art/mario-yoshi.png/json` et `art/portraits/mario.png` ; provenance ROM SHA91a4…a90 et empreintes des captures dans le manifeste. OBJ palette5, Yoshi tiles00..1F et Bébé Mario60..67, transparence index0 ; quatre captures traversant la mise à jour dynamique OBJ ont été exclues après inspection visuelle. Script `scripts/capture-mario-yoshi.py --work PATH` nécessite le bridge privé project/bridge et le Mesen déjà présents dans le workspace, aucun second cœur dans la page.

Dans le monde Yoshi natif, choisir Mario conserve le vrai Yoshi/Bébé Mario : aucun rider Canvas supplémentaire n’est dessiné. Dans DKC, il s’agit d’un rendu du duo sur le moteur et les collisions DKC, avec la langue directionnelle et les œufs existants. Aucun système natif de bulle/Bébé perdu ou moteur physique SuperFX transplanté dans DKC ; ne pas affirmer que le duo copie toutes les règles de Yoshi dans ce monde. Le flutter capturé est une pose disponible, pas une nouvelle mécanique ajoutée ici.

466 tests /42 fichiers et build TypeScript/Vite valides. Nouveaux tests sélection→Yoshi, restauration d’une sauvegarde incohérente, refus de descendre, transfert entre mondes. Recette navigateur5198 isolée : choix Mario+Yoshi, entrée Jungle Hijinxs, déplacement/saut avec duo visible, sauvegarde/retour carte puis tuyau→carte Yoshi ; active=mario et mount=yoshi conservés, nativeDrawHidden=false. Preuves outputs/verification-mario-yoshi-dkc.png/json. Une caisse animale débloque toujours son animal mais ne fait pas descendre Mario de Yoshi. Les boutons ont une largeur minimale44px et défilent horizontalement si nécessaire pour conserver les cibles tactiles accessibles.

---

## 29 octobre 2026 — langue directionnelle et œufs Yoshi dans DKC, tuyaux automatiques (462 tests)

`Controls.tongueDirection` mémorise le dernier angle du joystick pendant2s, y compris diagonales, sans conserver le déplacement après relâchement. DKC transmet ce vecteur à DkcCombat. Les contrôles Yoshi natifs continuent d’utiliser leur propre entrée haut/langue. Un ennemi normal accepté par killDkcEnemy occupe maintenant la bouche (champ mouth optionnel de sauvegarde) : Bas transforme cet ennemi en un œuf, une fois, six maximum. Le refus d’un hit natif n’accorde rien. Les gardiens restent non avalables. L’inventaire normal est fini ; seuls les gardiens conservent le refill∞.

La visée deux appuis est maintenant générale dans DKC : premier appui V/Œuf→réticule mobile, second→projectile suivant le vecteur affiché, sans correction automatique vers un ennemi. Traînée suivant le chemin existante et collisions balayées conservées. La langue se dessine avec les tiles natifs en extension/rétraction ; œufs lancés animés avec poses natives.

`art/yoshi-projectiles.png/json` : OBJ4bpp décodés directement du snapshot EU raw19 (VRAM/CGRAM, empreinte dans le manifeste) ; œufs tiles80/82/84 palette0, langue20/21 palette5 confirmée bank09 source09849E/098555. Script reproductible `scripts/extract-yoshi-projectiles.py RAW STATE OUT`. Aucun dessin IA ni découpage de fond. Ces images se dessinent sans lissage dans SpriteAtlas ; ce sont des adaptations Canvas dans le moteur DKC, pas les fonctions SuperFX Yoshi exécutées dans cette ROM.

Tuyaux : toujours uniquement sur les deux cartes. `worldUrl` ajoute pipe=1 et retire fresh ; `pipeArrival` retire immédiatement le marqueur de l’URL (évite boucle de relancement). Le trajet réel démarre automatiquement l’autre ROM, consomme le transfert de compagnons existant et ouvre la carte si la sauvegarde était en stage. Le bouton Jouer reste pour une ouverture normale. Préchargement réseau de la ROM destination lorsque le tuyau apparaît. Conservation d’un seul cœur actif : navigation reste utilisée et un chargement technique existe ; aucune promesse de bascule instantanée ou de conservation du plein écran natif à travers une navigation.

Validation : 462 tests /42 fichiers, build TypeScript/Vite valide. Nouveaux cas : langue haut/bas/diagonales, bouche sauvegardée→Bas→œuf unique, visée finie hors boss, pas de marche collée pour le jeu à un doigt, marqueur de tuyau consommé sans fresh. Navigateur isolé5197 Snes9x legacy : vrai tuyau DKC→carte Yoshi→carte DKC sans cliquer Jouer, héros Bobope conservé. Recette graphique : vraie arène Very Gnawty→Burt, file de six œufs originaux visible après déplacement, réticule et deuxième appui affichant Egg thrown. Captures outputs/verification-dkc-yoshi-eggs-aim.png et verification-dkc-yoshi-mechanics.json. Un accès direct tapé pipe=1 sans geste a échoué à démarrer le cœur dans le navigateur de test ; le trajet réel cliqué dans les deux sens fonctionne. Ne pas confondre cette limite d’autoplay avec une preuve physique iOS/Android.

À compléter : recette tactile physique iOS/Android, notamment audio après navigation et délai de chargement ; avalement +Bas en situation native adversaire à adversaire. Les fonctions du pont sont couvertes par tests, mais la recette manuelle Jungle a été interrompue par les dégâts natifs ; aucune affirmation que cet enchaînement a été validé bout en bout sur téléphone. Les fixtures d’approche expérimentales ont été retirées, aucune modification de mémoire de progression ne reste.

---

## 29 octobre 2026 — ordre des boss DKC et noms des peluches (458 tests)

Les sept arènes DKC (entrées E0..E5 et68) gardent leur combat original. Burt apparaît ensuite, après la création de la vraie banane géante de victoire (ID74, état0). Le héros doit être au sol avant l’apparition : le sol de Burt vient du héros, pas de la banane suspendue hors écran. Après trois œufs visés et son animation de défaite, la cérémonie DKC reprend et débloque la vraie carte. Musique/FX Burt et œufs illimités existants restent actifs.

`dkc-boss-finish.ts` ne modifie que trampoline banane3F836C → garde libre3BFA00, drapeau privé3BFBFE ; dispatcher musiqueFBF880 existant, contexte P/A/X/Y/DB/DP intégralement conservé. Installer après DkcBossRomHooks et avant loadState. Les états de banane déjà avancés continuent : une sauvegarde dans la cérémonie ne se bloque pas. `DkcGuardianSave.exitKind` optionnel conserve la compatibilité des anciennes sauvegardes de portes. Les portes ne déclenchent jamais Burt prématurément dans une arène de boss.

K.Rool : NE PAS retenir directement CurrentWorldBoss au sous-état13 ! Une attente longue y cassait le contexte natif. La version finale laisse son script entier continuer : vraie animation01B2 → commande finale → propriétaire1E0F=5 → CODE_B6D1C5 → banane. La fausse défaite01AF ne crée aucune banane. Le trampoline du boss3F837C reste inchangé.

Noms affichés : violet → Bobope, pink → Paingpaing via CHARACTER_NAMES ; IDs internes, sélection et sauvegardes restent compatibles.

Validation : 458 tests /42 fichiers et build TypeScript/Vite valides. Mesen ROM Rev2 exacte : Very Gnawty vrai dernier saut (fixture1HP) → banane141frames → retenue600frames, déplacement natif → libération → vraie carteED. K.Rool : fixture honnêtement limitée au script final (pas combat complet) → banane156frames → retenue600frames, mouvement → libération → carte16 native. Navigateur isolé5196 Snes9x : vrai Very Gnawty avant Burt ; banane retenue ; Burt3HP, musique native arrêtée051D0 et audio Burt actif, trois tirs visés jusqu’à0HP, vraie carte Monkey MinesED et musique native12 rétablie. Preuves outputs/verification-dkc-native-boss-sequence.json et verification-dkc-after-native-boss.png. Scripts/probe-dkc-boss-sequence.py reproduit le test natif hors ligne sans modifier la ROM livrée.

À poursuivre : recette physique iPhone/Android et campagnes complètes des sept boss ; aucune affirmation que chaque combat complet a été joué. Les boss Yoshi dans DKC restent des adaptations Canvas/TypeScript et non une seconde ROM en simultané. Les vrais œufs SNES restent réservés au moteur Yoshi ; DKC utilise sa file/visée Canvas existante.

---

## 29 octobre 2026 — boss réciproques, audio et vrais œufs (448 tests, recette native effectuée)

### Changement demandé

Musique/bruitages correspondant au boss donneur dans les deux jeux, tête Necky encadrée par son arène, et vrais œufs de Yoshi (file + visée + renouvellement) pendant les gardiens DKC. Il n’existait auparavant aucun boss Yoshi dans DKC : ajout de Burt aux vraies sorties vers la carte. Un seul cœur SNES exécute la ROM du monde actif ; les boss de l’autre jeu sont des adaptations TypeScript avec graphismes/audio natifs extraits hors ligne.

### Œufs SNES authentiques dans Yoshi

`boss-eggs.ts` : hook EU entrée initOAM fichier265, stub libre1FF00, routines natives allocation03A364 et insertion inventaire03BEB9, DP7960 et scratch7960..7976 sauvegardés/restaurés. Reconstitue jusqu’à6 vrais œufs via allocation, sans écrire un compteur fictif. Pas de refill en visée, dialogue, transformation, locks, Bébé perdu ou hors gameplay. Tous registres/flags/DB/DP restaurés ; signatures ROM exactes et restauration réversible. `NativeEggFlights` observe les vraies trajectoires ; exclut œufs suiveurs/tenus et consomme uniquement un projectile lancé. Important découvert en exécution : collision1D38 est un compte à rebours20→1F→… et non un bit20 permanent.

`boss.ts/game.ts` suppriment tirs automatiques Canvas/A supprimé. Le premier appui vise réellement, le suivant tire ; les œufs suivent naturellement et les effets SNES d’origine restent actifs. Réapprovisionnement seulement pendant intro/combat ; stock réel conservé ensuite. Tests bytecode65816 et preuve native Mesen privée : inventaire0→12(6œufs), refs valides[92,88,84,80,76,72], viséeA, tirA, collisionShyGuy native, nouvelœuf, restauration exacte sans corruption. outputs/verification-native-eggs.json etcaptures. Recette navigateur5194 : vraisœufs derrière le héros, réticule jaune, vrai tir retireHP àGnawty, gardien vaincu et vraiGOAL natif.

### Boss et arène

Necky/NeckySnr sont ancrés vers xcam+222, cou tourné vers le bord. `boss-draw.ts` ajoute renfoncement rocheux/supports bois/mousse derrière la tête originale et particules bornées impact/défaite. Décor présenté par Canvas, ne modifie pas les tiles ni les collisions natives.

`dkc-guardian.ts` ajoute Burt3HP aux sorties normales DKC identifiées par le moteur, après les ennemis du niveau. `dkc-boss-rom.ts` suspend les vrais trampolines6A/6B pendant le combat, puis les laisse exécuter leurs collisions/animation/progression d’origine. **Correction critique par preuve native : Jungleexit1375=12, pas0 !** Résoudre destination1375||0565 puis flags exacts DATA81D102&0C20 pour courant et destination : bonus/intérieurs non bloqués. Table Rev2 fichier1D102 ; sortie normale36C455, eau36C3F1 ; trampolines3F8398/3F8394 ; espace libre3BF800..3BF9FF, séparé du garde rendu3BFFD0. Tests d’interprétation sur2484combinaisons + restauration et copiesROM multiples. Dégâts Burt demandent le vrai chocDKC1595=1 et respectent invulnérabilité16D1, états spéciaux et hitflags existants. Ne jamais forcer progression/mort/partenaire.

Le Burt complet est décodé de captures EU : corps BG2SuperFX4bpp et HDMA parscanline5C18/5B98, OBJpriorités2/3 (baseVRAM Mesen en mots→×2),192px/cellule, cinq poses. Atlas yoshi-bosses.png SHA b1afdc8a46780b7a20c19332a30940a8f831b0b6bd9937bd2f91be5c07bbd1f0. Script extract-yoshi-boss.py. Attaque/blessure réutilisent poses de mouvement ; décès par fondu, ce ne sont pas les programmes ni toutes les animations natives de Burt exécutés dans DKC. DkcCombat pendant gardien : œufs illimités en file, premier appui vise sans aimassist, secondtire suivant exactement le réticule, langue ne mange pas le boss. Dans DKC ces œufs sont une adaptation Canvas (DKC ne contient pas les routines Yoshi) ; dans Yoshi ce sont les véritables sprites/physique natifs.

### Musiques/FX et mémoire

`BossAudio` réutilise le contexte audio déverrouillé de l’émulateur, une seule boucle +4voixmax, pause/reprise sansdoublon, chargement asynchrone/cache/retry borné, pas de volume natif zéro qui couperait les vraisœufs. Export natif horsligne Mesen, MP3~3,5Mo au total, banquesFX PCM429Ko ; pas de secondémulateur dans la page. Boucles observées DKC2→24s, Burt30→87,08s, Salvo20→60,68s ; K.Rool146s originales, raccord musical complet non confirmé. FX DKC natifs et Burt saut13/atterrissage23/coup20/défaite78.

Arrêt musique Yoshi : commandeF0 seulement àWRAM4D ; 4F n’est pas un registre de chanson courante fiable (retombe0 après commandes) ! `native-boss-music.ts` capture via0205 persistant et table d’entrée EU B273 ; répare music0/F0. Ne pas écraser les jingles/fin natifs. DKC051D est un booléen, chanson0523/banque0521 ; dispatcher dans garde de sortie, API.music(stop|resume|none,song), arrêt nativeB990E7/repriseB990CE, acquittement051D sans WRAM inventée. P/A/X/Y/DB/DP conservés et testés.

### Validation effectuée et reprise

- **448 tests passent sur41fichiers**, build TypeScript/Vite valide. Nouveau garde DKC : préservation complèteA/X/Y/P sur les deux chemins ; normalF800, eauF900, musiqueF880, metadataF9FC/FE. Les portes déjà entrées (état1029 nonnul) continuent toujours leur cérémonie native ; garde installé avantloadState pour fermer la fenêtre d’une frame surreprise d’un combat inachevé.
- Origines de test isolées5194/5195, legacySnes9x : Yoshi1-1 vraie file d’œufs, réticule, projectile retirantHP3→2→0, GOAL puis score10. DKCJungle vrai Burt complet, mouvement natif, bossAudio.playingtrue pendantnative051D0, trois tirs visésHP3→2→1→0, FXyoshi-defeat, reprise native051D1 avecmusique0(DKIslandSwing), sortie authentique, carteRopeyRampage débloquée. Reprise parcheckpoint réaffiche la carte et son tuyau.
- Aperçu Necky viafixtureDEV sur5195 : tête ancrée àdroite dans l’ouverture/supports, vraisœufs suiveurs etréticule natif, guardian.music1 conservé, stopnatifF0etbossAudio.playingtrue/FXboss-throw. Capture verification-necky-native-eggs.png ; il s’agit d’une sélection de boss de test, pas du boss normal1-1.
- Autre correction découverte : après sortie nativeDKC, word32 reste0 tandis que le bootstrapavait1. La carte est reconnue par projectionheight0+acteur10/12, pas parword32 ; sinon le portail et lecheckpoint de carte disparaissaient après victoire. Régressiontestée. OriginalBurtadapté etbossDKCphases restent séparés des progressions originales.
- Preuves : outputs/verification-boss-crossover.json, verification-boss-native-eggs-browser.png, verification-boss-native-score.png, verification-burt-map-browser.png, verification-dkc-boss-native-music.json etverification-dkc-boss-native-map.png. Mesen séparé confirme051D1→0→1 etretourcartesjingle26→musique12. Les essais de combat utilisent une protectionDEV, pas la sauvegarde de l’utilisateur.
- Le contrôle automatique a refusé le redimensionnement global du navigateur pour préserver la partie ouverte de l’utilisateur. Aucun contournement : contrôles visuels auviewportactuel et tests logiques ; pas de nouveau passageportrait/paysage dans cette recette, ni téléphonephysique/haut-parleur iPhone/FPSmatériel.
- CapturesBurt sources conservées dans work/burt-native-evidence ; extraction : python scripts/extract-yoshi-boss.py CAPTURE_FOLDER public/art, PythonavecPillow. Audio : python scripts/export-boss-audio.py MesenCore.dylib public/audio, PythonavecNumPy+ffmpeg déjà disponible. Les `.sfc` restent non pris encharge par REA ; ces preuves viennent du désassemblage source+octets exacts+exécutionnative, pas d’un résultatREA.

Suite :

Étendre la recette aux autres gardiens et vérifier les téléphones physiques. Rejouer bonus/intérieurs/eau et boss DKC originaux : ils restent natifs, certains n’utilisent pas une porte6A/6B donc ne pas annoncer que tous reçoivent Burt. Aucun téléphone physique, haut-parleur iPhone niFPS matériel testé. Quota52%utilisés/48%restants au contrôle, seuil utilisateur10%nonatteint. Maintenir ce rapport pour repriseGemini.

## 29 octobre 2026 — tuyaux Mario entre les deux cartes

- `main.ts/style.css` : le bouton de changement de monde montre maintenant le même vrai pictogramme de tuyau vert sur la carte Yoshi (destination Donkey Goonk) et sur la carte DKC (destination Yoshi’s Island), avec nom, focus clavier et activation native Espace/Entrée. SVG de 40px dessiné dans le code, pas image floue ni bloc?. Le portail reste limité aux cartes et occupe la place inutilisée de Roll.
- `pipe.ts` : précharge42Ko PCM, réutilise le contexte WebAudio déjà déverrouillé de l’émulateur. Le clic relance ce contexte dans le geste utilisateur ; sauvegarde confirmée + métadonnées puis effet de tuyau entier avant `location.replace`. Navigation après onended, délai borné1,2s si onended ne vient pas. Téléchargement borné2s et erreur audio ne bloque pas le voyage. Double activation bloquée par worldSwitchPending. Aucune seconde instance SNES, aucun changement des sauvegardes séparées ni de la route iOS.
- Vrai son Yoshi EU `$31` exporté hors ligne depuis la ROM locale : `scripts/extract-yoshi-pipe.py`, Mesen local2.2.1 dans un HOME temporaire, stop musique natifSPC `$F0`, CPU dans boucle privée pour transmettre le son surAPU2143. Fichier ROM264E2, signature `A93100AC4801C00D00D008AC06613007A9140022DE8500EEB4`, jeu source intact. PCM mono32kHz durée0,659s, pic5074, SHA256 `a2b523a7766566fe0092f9f87f58ef7989778c00d586c13a26685facfc779db6`. Manifeste `public/audio/mario-pipe.json`. Pas de mélange musical exporté ni son synthétique.
- 390 tests passent (35fichiers), build TypeScript/Vite valide. 5 tests du tuyau vérifient ordre sauvegarde→son→navigation, attente effective de fin, absence de navigation en échec d’écriture, audio indisponible/suspendu, préchargement partagé/retry et timeout mobile.
- Recette navigateur et publication : voir outputs/verification-tuyaux.json et captures portrait390×844 /paysage844×390. Les captures desktop à dimensions mobiles ne prouvent ni le haut-parleur iPhone ni les performances matérielles ; essai téléphone physique reste à faire.

## 29 octobre 2026 — sortie après gardien et relais Bébé Mario

- Signalement : Bébé Mario s’envole au franchissement du cercle, puis le stage reste bloqué. Le lancer vers le Yoshi suivant est natif ; le mod déplaçait les coordonnées utilisées par cette réception.
- `boss.ts` conserve maintenant `nativeGoal` immuable dans les métadonnées de rencontre (champ optionnel compatible avec anciennes sauvegardes). Le cercle des stages ordinaires reste à sa position native, au lieu de suivre le héros/la caméra ; les autres types de sortie conservent leur portail. La hauteur de combat peut bouger sans déplacer le Yoshi receveur ni sa zone d’arrivée.
- Franchir ne suffit plus à marquer `released` : attendre le mode victoire14 ou l’état joueur14. Chaque overlap valide réarme le vrai test de franchissement ; une frame refusée ou une récupération de Bébé ne consomme plus la sortie. Ancien `released` en gameplay sans goal actif est remis en `exit`.
- Le boss ne peut plus appliquer de dégâts une fois l’œuf fatal reçu, même si un projectile ennemi touche dans la même boucle.
- Preuve ROM EU : fichier12921 contrôle Bébé porté et deltaY[-112,-32) ;12AED pose le receveur àgoalY−16 ;12AE3 pose sonX àgoalX+0x168 (360px, différence avec USA +0x144) ;12BB6 attend le retour porté de Bébé. Source/disassembly + octets exacts, pas sortie REA (.sfc non supporté).
- Recette native legacy isolée5192 : Very Gnawty vaincu par les projectiles du pont, cercle original(X3632/Y1712), saut au clavier, vrai GOAL, Bébé reçu par le Yoshi suivant, tableau natif des scores10points. ProtectionDEV pendant le combat uniquement, aucune modification native du succès ou du score. Capture `verification-goal-baby-score.png`.
- 385 tests passent (34 fichiers), build TypeScript/Vite valide. Nouveaux cas : caméra verticale + restauration, franchissement refusé puis récupération, confirmation native, ancien released prématuré, œuf fatal et impact simultanés. Fixture DEV de tir attend les frames d’entrée et utilise une grâce normale renouvelée, sans 7FFF qui immobilisait le joueur natif.
- Limite migrations : une ancienne sauvegarde déjà capturée DANS la cérémonie native bloquée peut conserver ses anciennes coordonnées déplacées. Les nouvelles coordonnées ne peuvent pas être reconstituées universellement à partir des anciennes métadonnées ; revenir à la carte/recommencer le stage avec la fonction existante si nécessaire. Ne pas annoncer une réparation rétroactive de toutes ces cérémonies.
- Quota contrôlé :52% restant, seuil utilisateur10% non atteint. Rapport maintenu pour Gemini. Recette native et publication consignées dans outputs/verification-goal-baby.json.

## 29 octobre 2026 — portail vers le vrai Donkey Kong Country

### Résultat livré et architecture

- Demande : bouton dans la carte Yoshi pour aller dans une carte Donkey Goonk, même sélection Violet/Pink/DK/Diddy, véritables ennemis DKC, langue qui donne des œufs et œufs qui tuent ces ennemis. La ROM DKC entière reste utilisée : aucun plafond au stage1, progression native, pas de reconstruction des niveaux.
- `world.ts` gère `?world=yoshi|dkc`, choix mémorisé `kong-active-world-v1`, transfert unique `world-party-v1` limité aux compagnons (pas de guardian/pickups d’une autre ROM). Le transfert est consommé après application pour ne pas écraser la sélection d’une future reprise. Les tableaux de collision/ennemis n’entrent jamais dans le transfert.
- `main.ts` ajoute un portail tuyau vert/bloc? dans la place de Roll, inutilisé sur les cartes ; bouton visible seulement sur carte. Il suspend et confirme la sauvegarde avant transfert et `location.replace` vers l’autre monde. Échec d’écriture : reste dans le jeu courant. Le remplacement d’entrée évite d’empiler les anciens jeux dans l’historique. **Une seule instance SNES dans la page**, pas deux ROMs exécutées en parallèle. Après navigation, Play/continue fournit le geste nécessaire à l’audio mobile.
- `engine.launch` accepte un nom de jeu optionnel : Yoshi garde `Kong Island`, DKC utilise `Donkey Goonk DKC Rev2`, pour séparer aussi les fichiers SRAM du wrapper. Le contexte/route audio iOS existant n’est pas réécrit.
- `DkcGame extends LiveGame` remplace préparation, tick, rendu, sauvegarde et carte ; aucun tick Yoshi/GSU/SuperFX/bosses ajoutés n’est appliqué à DKC. Les quatre héros sont des avatars sur la physique/collision du Kong natif actif. Les montures Yoshi ne sont pas invoquées dans DKC ; leur sélection reste dans les métadonnées pour le retour, le sélecteur est masqué dans DKC. DKC garde ses propres animaux/barils/ennemis/pouvoirs natifs.

### ROM, carte et garde graphique vérifiées

- Donneur local existant DKC USA Rev2 : SHA256 `628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527`, copié dans `public/rom/dkc-usa-rev2.sfc`. SHA complet contrôlé avant le patch en mémoire. Le fichier source sur disque reste intact ; `patchDkcDrawing` renvoie une copie. Analyse par désassemblage local et octets exacts + snapshots Mesen préexistants, puis vraie exécution navigateur. REA n’accepte pas le format .sfc (limite connue de la session précédente), ne pas attribuer ces observations à une décompilation REA.
- `dkc-profile.ts` : nativeCurrentKong WRAM056F, offset joueur2 (DK) ou4 (Diddy), X0B19+offset, Y0BC1+offset, ID0D45, vitesse0E89/0EF1, attributs0C69. Y natif monte : pieds écran = `height004A - rawY - camera0895 + signed(0887)`, X écran =rawX−088B. Jungle réel : X156/rawY175/height512/camera85,177 → pieds71,160.
- **Carte stable** : `word0032===1 && word004A===0 && spriteID(slot0)∈{10,12}`. 003E et0040 changent avec la case survolée et peuvent tous deux valoir16 sur une carte ! Ne pas utiliser seulement les ID d’entrée E6..ED. Initialisation native vérifiée aux fichiers ROM E282 (LDA10/STA0D45) et E4DC (height0, cameraY0, projection0200). `level=word0040||word003E` sert au nom/identité de la salle, pas à reconnaître la carte. EntréeEA=ReptileRumble, entrée00 invalide, EB invalide, EE..FF services/intérieurs.
- Garde rendu : remplace l’instruction `B9 45 0D` au fichier ROM3BA86B par JMPFFD0. Garde de47octets dans les zéros libres3BFFD0..3BFFFE ; tous les octets/signatures validés avant écriture. Elle garde les acteurs de carte (height0), entrée00, services, ennemis ; ne saute que le rendu des joueursID1/2 en stage. Aucun changement de physique, de palette ou allocation VRAM. Interprétation de ses branches dans17920combinaisons + test de restauration exacte des octets. Ne pas déplacer/modifier cette garde sans vérifier la compatibilité des snapshots natifs.
- Le contact sol est **12A5+offset, bit0**, pas vy==0 : DKC conserve une vitesseYFD00 en étant au sol. Vérifié au solveur ROM3FFCA4. Animations idle/marche/saut/roulade utilisent ce contact et les atlas existants, rendu2x sans filtrage. Le rendu suit la luminosité native051A pendant les fondus pour éviter les avatars qui clignotent seuls.
- `public/bootstrap/dkc-map-snes9x-2.0.2.state` : vraie carte KongoJungle obtenue en naviguant les menus natifs dans un onglet isolé, export DEV après pause sûre. 823432octets, SHA256 `ff90f2925343564427efbe16eee94ff536d348d2ec3855f6a0f1473ff35af434`. Zone de sonde WRAM1FE0 vérifiée nulle (pas de marqueur résiduel). Évite de rejouer l’introduction et les menus au premier lancement. S’il manque, erreur explicite, pas de faux lancement silencieux. Le bouton d’export DEV est limité aux cartes ; ne pas remplacer ce fichier par une partie avancée de l’utilisateur.

### Langue et œufs DKC

- `dkc-combat.ts` : langue en avant (~78px) ou vers le haut via Up puis C, un ennemi par appui. Un succès donne1œuf, limite6. Tir tactile/V à visée assistée initiale, vitesse300px/s, vraie collision balayée, une cible par projectile, durée≤3s, max6projectiles. Aucun ennemi tué juste parce que le bouton a été pressé. Pause/reprise conserve inventaire/projectiles, réinitialise seulement l’horloge ; changement de salle/carte efface les anciens tirs.
- **Demande de mort native** : WRAM1595+offset=`20` hex. Le moteur original consomme ce drapeau et gère animation, son, références de palette et cases graphiques. Ne jamais simplement mettre ID=0. Le vérificateur natif ROM3FC726 accepte1 ou20 ; utiliser20 car Krusha46 peut rire avec1 (contrôle ROM368613). Une demande déjà en attente est refusée pour ne pas donner plusieurs œufs.
- Liste courante : Kritter05, Klump06, Necky lance-noix0E, Zinger19, Klaptrap1A, Slippa29, Army2F, Krusha46, MiniNecky4B, Gnawty4D, Necky volant4F, Manky50, Chomps53, ChompsJr54, Bitesize55, Squidge56. États de mort :4B→5 ;0E/56→2 ; autres→1. **Rockkroc, Croctopus, Clambo et les boss ne sont pas des cibles de cette langue/ces œufs** ; ils gardent leurs règles natives. Ne pas annoncer tous les dangers comestibles.
- Boîtes du pont approximées par familles28×30 ou36×42, pas un décodeur exhaustif des hitboxes natives. À affiner si un ennemi particulier paraît trop facile/difficile à toucher. La mort elle-même reste native.
- Son de tir : effet Enguarde original de la banque WebAudio existante, même AudioContext déverrouillé ; coups/morts d’ennemis restent DKC natifs. Ne pas écrire un pseudo-drapeau sonore en RAM : le pilote DKC utilise une poignée de main sur les ports APU.

### Sauvegardes, preuve et reprise

- `dkc-save.ts` : enveloppe version1/worlddkc/SHA de la ROM, Adventure + inventaire/tirs + snapshot natif complet. Clés `dkc-campaign-v1-snes9x-2.0.2` et `dkc-map-v1-snes9x-2.0.2`, séparées de la campagne Yoshi existante. `snapshot.ts` ajoute une validation DKC sans blocSFX ; la validation Yoshi exige toujours ce bloc, protégeant les reprises croisées. SRAM524288octets, RAM131072, VRAM65536 et APU sont inclus.
- Capture identique à Yoshi : arrêt natif puis compteur stable100ms avant sérialisation ; tick suspendu pendant capture. Capture sur pause, environ20s, entrée sur carte et avant changement de monde. Ce n’est toujours pas un acquittement natif fourni par le cœur ; limites de capture/SRAM indépendante ci-dessous restent valables.
- `saveForWorldSwitch` confirme un checkpoint frais ou bloque le passage. Tests d’échec de pause/écriture évitent un changement qui annoncerait à tort une sauvegarde réussie.
- DKC **Leave stage · World map** recharge le dernier checkpoint de carte : abandonne/recommence la tentative courante et peut remettre les ressources de cette tentative à l’état de cette carte. Ce comportement est indiqué dans les options. Ne pas affirmer que cette opération préserve chaque banane/vie acquise dans la tentative. Le jeu natif Start→Select n’autorise l’abandon que dans les stages déjà terminés.
- **382 tests passent**, TypeScript et Vite valides. Recette réelle originetest5191, cœurlegacy : langue surGnawty (inventaire0→1, kills1), œuf surKritter (inventaire1→0, kills2), tirs disparus et décor intact. Rechargement retrouve exactement X665/Y346. Pink sélectionnée puis carteDKC→Yoshi→DKC garde Pink et les sauvegardes propres à chaque jeu. Première visite sans sauvegarde via configuration de cœur par défaut : arrivée directe carte, entrée dans Jungle. Activation clavier Espace (DKC→Yoshi) et Entrée (Yoshi→DKC) vérifiée ; ne pas laisser le raccourci de saut intercepter Espace quand le portail a le focus. Portrait390×844 et paysage844×390 : portail visible, joystick132px, actions≥61×83px en paysage.
- Preuves : outputs/verification-donkey-goonk.json, verification-portail-yoshi-portrait.png, verification-portail-dkc-portrait.png, verification-portail-dkc-paysage.png, verification-donkey-goonk-portrait.png, verification-donkey-goonk-paysage.png. Ces tests utilisent des origines/IDB de test, pas la partie de production de l’utilisateur. Aucun iPhone/Android physique ni mesure FPS matérielle réalisé. Ne pas confondre AudioContext running avec une sortie de haut-parleur réellement écoutée.
- Bundle final : `index-Ig98k2O1.js`, SHA256 `1538b7ad44be22d694af44559e9ae61f1494e24d7b9bf7a6e657c9b4d5fadd69`. Quota au contrôle :53% restant, seuil utilisateur10% non atteint. Rapport maintenu pour une reprise Gemini.

### Suite à faire / limites à ne pas masquer

1. Rejouer la campagne DKC entière : eau, mines/wagonnets, cordes, boss, retours bonus, services et transitions. La ROM entière est jouable, mais seuls les premiers combats ont été parcourus en recette. Le pont conserve les comportements natifs ; animations d’avatars dans des situations spéciales/cinématiques peuvent nécessiter des poses ou masques dédiés.
2. Tester sur de vrais iPhone/Android, son depuis le premier tap, interruptions téléphone/arrière-plan, retour orientation, latence tactile, FPS et captures périodiques. Le cœur par défaut et le legacy sont configurés/testés en navigateur desktop ; pas de preuve de fluidité matérielle sur téléphone.
3. Affiner hitboxes/langue/visée si nécessaire sur chaque famille ; ne pas supprimer des sprites à la main. Les ennemis invulnérables/bosses demanderaient de nouvelles adaptations natives validées avant d’autoriser la langue ou les œufs.
4. Conserver les limites SRAM autonome et réparation historique plus bas : sans la sauvegarde complète, le bootstrap peut remplacer une SRAM chargée indépendamment. Les fichiers SRAM du wrapper ont désormais des noms distincts, mais un démarrage fondé uniquement sur Candy/SRAM sans snapshot n’a pas été validé.
5. Les avatars DK/Diddy/goonks utilisent le Kong natif actif ; sélectionner un avatar ne force pas un changement risqué des états natifs DK/Diddy. Si le besoin devient des physiques distinctes par avatar ou Yoshi/montures invoquées en DKC, implémenter un vrai transfert natif sûr plutôt qu’une écriture aveugle de CurrentKong.
6. En cas de modification de gardeROM ou du cœur, vérifier/recréer le bootstrap, tester les anciennes sauvegardes et mettre à jour les signatures/versions. Le source ROM et les anciennes sauvegardes utilisateur doivent rester récupérables.

## 29 octobre 2026 — gardiens DKC avant les sorties (nouveau code)

- Demande : sept boss DKC1 alternés sur les niveaux principaux et Extra de Yoshi, œufs infinis pendant le combat, sortie seulement après victoire dans l’écran du héros. Dans les forteresses/châteaux, **conserver le boss original puis ajouter le gardien DKC**. Les jeux bonus/menu ne reçoivent pas de boss.
- Implémentation : `boss.ts` gère les rencontres et leurs projectiles Canvas, `boss-draw.ts` leur affichage, `boss-rom.ts` suspend/restaure les vraies routines de sortie EU. Un seul émulateur SNES reste utilisé. Les sept graphismes originaux (Very Gnawty, Master Necky, Queen B., Really Gnawty, Dumb Drum, Master Necky Snr., King K. Rool) viennent de la ROM DKC Rev2 existante, via `scripts/decode-dkc-bosses.py`. Atlas PNG207Ko, 91 images uniques dans des cases128px, décodage6Mio, filtrage désactivé. Les mouvements/attaques sont une adaptation TypeScript, pas le code des boss DKC exécuté dans un second émulateur.
- Œufs du combat : projectiles du pont avec visée assistée, collision balayée, délai entre impacts, inventaire natif intact. Le bouton affiche Throw·∞, V fonctionne aussi. Les œufs/pouvoirs natifs restent utilisés hors combat. Les dégâts demandent la vraie séparation de Bébé Mario via invincibilitéA0 ; pas de décrément manuel des étoiles. Combat suspendu pendant son sauvetage/dialogues. Maximum20 projectiles conservés.
- Progression : aucune écriture de déblocage/niveau terminé. L’anneau normal reste le véritable sprite0D avec son allocation graphique. Les forteresses sans clé (Burt, etc.) sont interceptées au sprite explosion13, wildcard1=0, avant sa disparition et son passage direct au score ; elles reprennent ce script après le portail. Les explosions produisant une clé (wildcard1≠0) restent natives. Après victoire, ses coordonnées sont adaptées ; le héros doit sauter pour le traverser. **Sa hauteur doit être sol−80** : le Yoshi suivant est créé à anneauY+48 ; un anneau trop bas provoquait une cérémonie bloquée, reproduite puis corrigée pendant la recette. Les clés14 des grands boss originaux sont suspendues avant init ; après le gardien et son portail, état2 pour reprendre leur vraie initialisation/cérémonie. Bowser final attend son état20, jamais19/1F.
- Adresses validées par signatures de la ROM EU exacte : baseROM = site de dessin natif−27AEB ; goal main12617, key init159C3/main15A19 remplacés temporairement par RTL6B ; explosion15F85 branchée vers une garde12octets à17FF0 (zoneFF vérifiée) : LDA7900,X / BNE +1 / RTL / LDA7402 / JMPDF88, afin de bloquer seulement les explosions sans clé avant leur premier effet palette/fenêtre. Le pointeur Bowser état20 à6C5A9 passe deD673 àD672 (RTS60 validé à6D672), état19 inchangé. Toutes les signatures sont vérifiées avant la moindre écriture ; fichiers ROM sur disque inchangés. `BossRomHooks.restore()` rend tous les octets natifs pendant la cérémonie.
- Sauvegarde : métadonnées guardian version1 ajoutées à Adventure, validation stricte et compatibilité des anciennes parties sans cette clé. HP, phase, projectiles et anneau sauvegardés avec l’état SNES ; reprise lie le sprite au slot/ID natif avant écriture. Pause réinitialise seulement l’horloge, mort15/16 ou carte26 efface la rencontre. Modes EU10/11/12 = chargement, pas mort. Une cérémonie released ne doit pas se relocker lors d’un changement de salle/niveau.
- Son natif : file EU compteurWRAM0057, entrées octets0059, 7max, routine ROM005DE vérifiée. Ne pas écrire seulement GSU007A (peut être effacé avant lecture). Sons d’œuf/blessure natifs + impact/victoire via banque DKC existante.
- Tests : 351 tests passent, dont27 nouveaux tests modèle/signatures, et build TypeScript/Vite valide avant recette finale. Recette native legacy isolée5190 : combat1-1 terminé via pressions du véritable contrôle Egg avec inventaire0, HP0/anneau visible ; sauvegarde/rechargement conserve la phase exit ; traversée atteint le vrai mode14 puis le tableau des scores original. Fixtures DEV uniquement : entrée réelle proche du goal via chargeur natif ; salleBurt via entrée native [3D,05,63,00], WRAM038C=1/038E=0, modeEU0F ; état final de Burt via son état48 et timer (la fixture se met en pause dès que le gardien apparaît), pour laisser son explosion réelle déclencher la rencontre mini (Burt ne crée pas de clé). Le bouton de tirs DEV réapplique une invincibilité de test pour vérifier les sorties sans sauvetage automatique ; aucun HP du boss ni drapeau de fin n’est forcé. Le premier test1-1 victorieux a été effectué avant cette protection. Ne pas prétendre avoir joué tout le combat original de Burt avec cette fixture.
- Recette forteresse1-4 : après la vraie animation finale de Burt déclenchée par la fixture, Really Gnawty apparaît avec décor intact ; victoire par projectiles (HP0, inventaire0), portail visible, saut/déplacement natifs à travers le portail puis phase released et vrai tableau des scores original (mode14), vérifié aussi en paysage844×390. Un essai sans protection de test a confirmé bossDamageRequests1 et la vraie bulle11 de BébéMario. L’invincibilité de fixture7FFF bloquait elle-même les déplacements ; elle est ramenée à3F après le tir de test. Ce n’est pas un verrou ajouté au jeu publié. Preuves dans outputs/verification-boss-1-1.json et verification-boss-portrait.png.
- Build final : `index-DD-wW0jP.js`, SHA256 `4805d83b0d0a07f8f5b42ffa4c227764ecd30ee24beccda1c7e7ed610c8b794d`.
- Reste à vérifier sur appareils physiques : fluidité/son iPhone et Android, tous les terrains des sorties, les sept attaques avec collisions natives et sauvegardes en plein combat, tous les châteaux et la fin Bowser complète. Les tests unitaires couvrent leur branchement mais ne remplacent pas une campagne complète. Les limites SRAM/reprise détaillées ci-dessous restent applicables.

## 29 octobre 2026 — effets sonores DKC des animaux

- Manque confirmé : le pont affichait/pilotait les animaux sans déclencher leurs effets DKC. La seule écriture sonore concernait auparavant une caisse et utilisait le moteur de Yoshi. `animal-sound.ts` ajoute une lecture Web Audio et un suivi des actions natives, branchés dans `game.ts`.
- ROM examinée : DKC USA Rev2 SHA256 `628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527`. Le serveur REA a refusé le format `.sfc` (unsupported binary format) ; l’analyse et les observations suivantes viennent des fichiers locaux, des octets et de Mesen, pas d’une décompilation REA. Le désassemblage DKC1 local (USA1.0) fournit les noms ; les différences Rev2 sont vérifiées sur les octets du pilote chargé. Ne pas réutiliser aveuglément les anciennes adresses SPC.
- Outil hors ligne reproductible : `scripts/extract-dkc-sfx.py ROM MesenCore.dylib OUTPUT`. Utilise le Mesen 2.2.1 déjà présent ; aucun émulateur supplémentaire dans le navigateur. Il ouvre la ROM dans un domicile temporaire, charge les échantillons BRR globaux depuis la table ROM9FF00, reconstitue le répertoire DSP3200 et la table d’instruments SPC04E8. Le pilote sonore original est appelé à SPC1178 et reprend sa boucle0606. Le CPU donneur est placé dans une boucle RAM privée pour arrêter musique/événements ; ni la ROM sur disque ni une configuration/sauvegarde utilisateur ne sont modifiées.
- 11 effets originaux exportés : Rambi réception0D, souffle10, caisse11, pas27/28, impact34, attaqueRambi56, attaqueEnguarde57, monter58, ailes59, sautAnimal5F. Les effets sont rendus par le SPC/DSP original, puis convertis en PCM mono32000Hz avec silence de fin coupé et fondu terminal5ms. Ce sont des effets extraits, pas des oscillateurs synthétiques. Métadonnées avec IDs, bornes, provenance et empreinte : `public/audio/dkc-animals.json`.
- Banque `dkc-animals.wav` : 247088 octets, SHA256 `6a563e9426cebbf189d197f4aaaf9ec09ff955b077ffe05e4cb2a1cecd64e940`. Chargement en arrière-plan sans attente du lancement du jeu, décodage une seule fois dans le même AudioContext déjà déverrouillé pour iOS. Maximum4 voix simultanées, répétitions bornées, aucun effet manqué rejoué en retard. En cas de panne réseau, le jeu continue et la caisse conserve son ancien effet natif de secours.
- Déclenchements : vrai décollage pour Rambi/Winky/Expresso/Enguarde, réception/pas alternés/souffle espacé de Rambi, début d’attaqueRambi/Enguarde, coups confirmés et murs détruits, ouverture de caisse/montée. Ailes59 pendant le vol de Squawks et les battements d’Expresso, bornées à un effet toutes les280ms. Le vol contrôlé de Squawks est une capacité du mod : son affectation à l’effet DKC WingFlap est une adaptation, pas une affirmation qu’il avait cette commande dans DKC1. Pas de son attribué arbitrairement à chaque pas de Winky/Expresso ; les déclenchements spécifiques disponibles sont respectés.
- Les effets sont arrêtés à la pause, sur la carte, durant les dialogues, le secours de BébéMario et l’arrivée. Musique et effets natifs de Yoshi continuent via le cœur existant. Le suivi ne touche pas aux collisions, coordonnées, pouvoirs ni sauvegardes.
- Validation : **324 tests passent**, TypeScript/Vite valides. Banque PCM contrôlée (empreinte, IDs/bornes, signal non silencieux et non écrêté), suivi des transitions réelles, absence de faux saut lors d’une reprise, anti-répétition, contexte partagé, réseau indisponible et pont natif. Build attendu `index-BrHFGD2c.js`, SHA256 `2442fac9dfdf6955dbf3788b52a43a466236fe46b0ca4c24856b28bd75d5f53f`.
- Recette native : onglet/origine de test isolés5189, cœur legacy et vrai1-1, banque prête et AudioContext running. Sons de saut/réception/marche de Rambi observés ; attaqueEnguarde (compteur18, dernierenguarde-attack), ailesSquawks (21, wing-flap), Winky (2, animal-jump) et Expresso (6, wing-flap). Pause après Expresso : compteur stable6. Les compteurs prouvent que les sources Web Audio démarrent ; aucun haut-parleur d’iPhone/Android physique écouté. Preuves dans outputs/verification-sons-animaux.json et .png. Les relevés Rambi pris après une attente montrent le souffle idle, pas l’instant du saut/attaque ; ne pas interpréter ce dernier effet comme une absence du saut observé auparavant.
- À vérifier sur téléphones réels : volume relatif avec la musique, sortie muette iOS, retour depuis arrière-plan et fluidité. La banque n’ajoute pas de boucle d’émulation, mais aucune mesure FPS matérielle n’a été faite. Autre observation native desktop à garder pour un futur correctif : redimensionner le canvas pendant la pause peut effacer momentanément le décor ; reprendre une image le redessine. Aucun changement de layout livré ici.
- Quota au dernier contrôle : 58% restants, seuil utilisateur10% non atteint. Les limites de reprise/SRAM et la suite des travaux décrites ci-dessous restent applicables.

## 29 octobre 2026 — écrans corrompus après sauvegarde et réparation de l’affichage

**Cette section remplace les anciennes affirmations de capture immédiate sûre. Publication vérifiée sur https://mario-donkey.netlify.app/ : correctif `290c499`, bundle publié identique au build testé.** Validation finale : **303 tests passent**, build TypeScript/Vite réussi. Build testé : `index-BWmpcqlh.js`, SHA256 `d355f416eb4782c04a7500d5763fef3acd08baf3e16bac1ed9c9f2c07fa324cf`. HTML de production et SHA256 du JavaScript vérifiés après le push de `290c499`. Preuves : `outputs/verification-reparation-reprise.json`, `outputs/verification-reparation-portrait.png`.

### Défaut reproduit et changement de capture

- `toggleMainLoop(0)` demande un arrêt ; son retour JavaScript ne garantit pas que l’itération native en cours a fini. Un `getState()` immédiat peut donc produire un état dont les blocs ont les bonnes tailles, mais dont les états CPU/vidéo ne sont pas cohérents à la restauration. Ce défaut a été reproduit dans une session déjà lancée, avec les cœurs modern et legacy sans le pont ; attendre avant la capture a donné des états correctement restaurés. Ne pas attribuer tout le problème au cœur legacy ni annoncer que la capture de l’iPhone constitue à elle seule une preuve de la cause.
- `waitForNativePause` demande l’arrêt puis attend que le compteur natif reste stable pendant 100 ms, avec délai maximal de 2 s. C’est une garde fondée sur l’observation du compteur, **pas un acquittement natif de pause** : aucune API d’acquittement n’est exposée par le wrapper actuel.
- `captureSave()` attend cette garde avant la copie des octets et des compagnons. Pendant la capture, les mutations du pont sont suspendues. La boucle reprend seulement si la partie n’a pas été mise en pause ou placée en réparation entre-temps. Les demandes simultanées partagent la capture en cours et les écritures restent sérialisées.
- L’autosave reste périodique toutes les 20 s, ainsi qu’à la pause et aux événements de sortie. Une pause d’au moins environ 100 ms peut désormais être perceptible à chaque capture : mesurer son effet sur téléphone avant toute promesse d’absence de saccade. L’événement `pagehide` ne garantit pas que le navigateur laissera terminer cette capture asynchrone ; une fermeture forcée peut revenir au dernier autosave effectivement écrit. L’ancien texte « capture immédiate à la sortie » plus bas est historique et n’est plus une garantie.
- Les sondes mémoire au démarrage s’appliquent à la scène de titre jetable ; elles n’empilent plus des restaurations intermédiaires de cet état avant le chargement final de la campagne ou du bootstrap. Les erreurs de lecture de campagne ne doivent plus être assimilées à une absence de sauvegarde suivie d’une nouvelle partie.

### Validation des états et réparation

- `snapshot.ts` valide la structure avant lecture/écriture des campagnes et sauvegarde de secours. Formats reconnus : snapshot natif `#!s9xsnp:0012\n`, ou `RASTATE` version 1 avec blocs tag4/longueur u32 LE, données alignées sur 8 octets et `END `. Les blocs RetroArch supplémentaires (`ACHV`, `RPLY`, inconnus) sont acceptés. Le bootstrap réel mesure 824440 octets, dont 824414 octets de `MEM` à partir de l’octet 16.
- Blocs natifs requis : NAM, CPU, REG, PPU, DMA, VRA, RAM, SRA, FIL, SND, CTL, TIM, SFX. Tailles mémoire exactes : VRA65536, RAM131072, SRA524288. Troncatures, blocs manquants, doublons, mauvaises tailles et versions incompatibles sont refusés. **Ce contrôle ne détecte pas des valeurs graphiques corrompues dans un état de structure valide.**
- Le bouton « Repair display · Return to map » reconstruit la carte à partir du bootstrap connu, avec une copie indépendante de l’état précédent conservée sous la clé de campagne suffixée `-before-display-repair`. Il faut recommencer le niveau courant ; cette action ne prétend pas rétablir la position exacte à l’intérieur de ce niveau. Les compagnons restent ceux de la campagne.
- `createRecoveryState` copie uniquement les champs stables EU : progression WRAM0222[72], scores02B8[72], objets0357[27], tutoriels0372[2], vies/pièces0379[4], drapeau216, fichier030E valide0/2/4, monde218/stage21A cohérents et bornés. Les icônes030F[72] sont reconstruites depuis la progression, sans importer l’ancien cache graphique. Seule la zone batterie SRAM7C00..7E80 est reprise ; le reste de SRA est l’espace de travail SuperFX et reste propre.
- CPU, REG, PPU, VRA, DMA, FIL, SND, CTL, TIM et SFX viennent du bootstrap. **Conserver aussi la phase native du bootstrap pendant son chargement** : ne pas écrire mode23 dans le fichier avant que le CPU propre ait repris. Après restauration native terminée, `goToMap()` demande le fondu/réassemblage de la carte, puis attend mode26. En cas d’échec, ne pas enregistrer la transition inachevée comme nouvelle reprise.
- Adresses établies par comparaison des octets de la ROM EU avec le désassemblage US : chargement `$10:810A`, sauvegarde `$10:828A`. SRAM : fichiers7C00/7C68/7CD0, copies7D38/7DA0/7E08, chacun104 octets. Checksums7E70..7E7B : `(0x7777 − somme des52 mots LE) & 0xFFFF`. La zone batterie est copiée telle quelle ; cette reconstruction suppose que les données de campagne restent intactes, elle ne répare pas arbitrairement leurs valeurs.
- Après chargement échoué, `originalCampaign` conserve une copie des octets originaux lus dans IndexedDB **avant** `loadState`. La réparation utilise ces octets si la reprise a échoué, car un nouvel instantané de la mémoire native déjà abîmée pourrait avoir perdu de la progression. Correctif intégré ; les 23 tests de reprise couvrent notamment cette protection.

### Recette effectuée et limites restantes

- Onglet/origine de test isolés, vrai EmulatorJS/Snes9x. Avec le cœur legacy : carte entière sauvegardée/rechargée et niveau1-1 repris aux coordonnées contrôlées après capture différée. Les essais de capture immédiate des deux cœurs reproduisaient des reprises cassées dans la session utilisée ; les captures différées ont restauré des scènes normales.
- Une fixture DEV altère volontairement le bloc VRA d’un état natif legacy : corruption visible → réparation → carte lisible → pause/sauvegarde → rechargement et Play → carte toujours lisible, sélections Violet/Yoshi conservées. Preuves dans `outputs/verification-reparation-reprise.json` et `outputs/verification-reparation-portrait.png`. Aucun nouveau niveau débloqué n’a été vérifié nativement pendant cette recette de réparation ; conservation des champs de progression couverte par fixtures unitaires. Ne pas présenter ces essais comme un parcours complet des niveaux ni comme une réparation testée sur la sauvegarde privée du téléphone de l’utilisateur.
- Le choix initial du cœur/rendu iOS est conservé : legacy sur iPhone, réglages mobiles existants. Aucun changement de moteur livré uniquement sur la base d’un essai desktop. Aucun iPhone ou Android physique testé pour ce correctif ; restent à vérifier capture périodique, sortie/reprise, son, tactile et rotation sur matériel réel. La tentative de nouvelle capture paysage n’a pas effectivement changé le viewport : ne pas la compter comme validation paysage. Le CSS est inchangé.
- Limite antérieure toujours ouverte : si notre campagne manque, le bootstrap initial peut remplacer la SRAM indépendante restaurée par EmulatorJS/IDBFS. La reprise par SRAM seule n’est pas rendue autonome par ce correctif. Les copies complètes de campagne et les sauvegardes internes SNES sont deux chemins distincts.
- Quota au dernier contrôle de cette session : 62% restants ; le seuil utilisateur de 10% n’est pas atteint. Ce document est néanmoins actualisé pour permettre une reprise par Gemini.

## 28 octobre 2026 — main bloquée sur l’onglet du monde

- État reproduit dans la ROM : la main passe sur l’onglet via Haut. Dans cet état, confirmer le monde courant ne fait nativement rien et les directions latérales sautent les mondes verrouillés. Bas revient à la grille ; ce n’était pas un gel du moteur.
- Boutons Jump et Egg deviennent « Levels ↓ » sur l’onglet courant. Un appui tactile, souris, Espace ou V envoie Bas ; après retour à la grille ils deviennent « Enter ». L’action est mémorisée jusqu’au relâchement : un maintien ne doit jamais se convertir en confirmation et lancer involontairement un stage, ni continuer à envoyer Bas dans la grille. Les directions concurrentes sont neutralisées pendant cette confirmation.
- Les confirmations sur un autre monde gardent leur comportement natif. Aucun monde/niveau déverrouillé artificiellement. Clavier/joystick Bas conserve le comportement original. Sur la carte, un appui commencé en gameplay ne devient pas automatiquement une confirmation.
- Adresses EU vérifiées directement dans la ROM : carte interactive mode26 ; onglet1119, sous-état111A, case1114. Les modes27/29/2B sont des fondus,28 progression après niveau,2A score,2C animation de monde : ne pas les traiter comme une seconde grille interactive.
- RoutineEU17E859 : Bas revient aux niveaux ;17E87E : confirmation de l’onglet courant sans effet ;17E3F1 : confirmation grille ;17E80B : mondes verrouillés ignorés. Le désassemblage US a des adresses inférieures de2 pour ces champs. La compétence reverse-engineer-anything a été consultée ; REA ne reconnaît pas .sfc, donc comparaison statique avec les octets de la ROM existante, sans installer d’outil.
- Correction distincte du libellé : monde brut218 vaut0,2,4… ; division par2 avant affichage. Stage21A est global, avec12 cases par monde : calcul du niveau local, Extra/Bonus. Tests jusqu’au monde6.
- Recette dans onglet/base de test port5187 : Haut place la main sur onglet2 (monde1), joystick Bas revient à la grille. Avec cœur legacy utilisé sur iOS et viewport390×844 : appui souris1000ms sur Levels↓ donne mode26/tab0, aucun lancement ; second clic Enter ouvre réellement mode13/stage0. Captures et JSON dans outputs/verification-retour-niveaux*. Aucun téléphone physique testé.
- 243 tests et build TypeScript/Vite réussis. Nouveaux fichiers menu.ts, menu.test.ts, menu-bridge.test.ts. Les contrôles tactiles et la physique des niveaux restent inchangés.
- Audit sauvegarde demandé juste avant : nos instantanés contiennent bien le bloc SRAM complet (SRA:524288). La persistance indépendante EmulatorJS/IDBFS reste active même avec EJS_disableDatabases sur iOS (ce flag neutralise les caches ROM/core). **Reste à sécuriser** : sans notre campagne, le bootstrap initial peut écraser la SRAM restaurée ; cette autonomie de secours n’est pas corrigée ici. Conservation de progression via campagne testée ; ne pas promettre une reprise par SRAM seule.

## 28 octobre 2026 — commandes mobiles, Goonks nets et secours de Bébé Mario

### Changements courants
- Joystick portrait : grille 45/55, diamètre 127–144 px selon écran ; actions 80–99 × 53.5 px sur formats vérifiés. Paysage : plus de place à gauche, actions compactes à droite, sélecteurs de personnage/monture empilés. Taille du stick déduite des safe-area verticales sur les écrans bas. Aucun bouton d’action sous 44 px.
- Goonks : interpolation désactivée dans SpriteAtlas.draw ET CSS `#actor { image-rendering:pixelated }`. Le calque plafonné à 2× reste inchangé. Pas de nouveaux assets, allocation ou calcul par frame. Les poses sources restent petites (40–68 × 40–72 px) : suppression du flou ajouté, pas création de nouveaux détails 3D. L’ancien lissage décrit plus bas est désormais remplacé.
- Récupération : absorbHit(gsu,wram) laisse les verrous natifs actifs quand Mario revient vers Yoshi. Avant, le pont les effaçait à chaque frame pendant la trajectoire de retour, laissant Yoshi s’éloigner.
- Aide de visibilité activée par défaut, désactivable via « Keep Baby Mario on screen » dans les options. Préférence locale `kong-baby-visibility`, accès stockage protégé par try/catch. Lorsqu’une bulle standard monte à moins de 24 px du bord haut : vitesse verticale mise à 0, plafond orienté vers le bas ; la gravité native la fait redescendre. Ne change ni coordonnées, ni compteur, ni cible native, ni mouvement horizontal. Cette aide est une adaptation d’accessibilité, pas une règle du jeu original.
- Gardes : vrai gameplay, Bébé perdu et sprite0 actif ID61, mode flottement11, aucune capture en cours, réserve non nulle, aucun dialogue/verrou/transformation/script. Retour, mort, victoire et autres formes restent natifs. L’aide ne borne pas la position X, ne téléporte pas une bulle déjà hors écran et ne garantit pas une récupération automatique après un déplacement de caméra.

### ROM européenne : attention aux adresses
Le désassemblage de référence est NTSC-US1.0, mais le projet utilise la ROM Europe SHA256 91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90. Vérification binaire effectuée :
- Mode du bébé : **word GSU19D6**, et non WRAM76. La direct page sprites est7960, donc `$76` signifie CPU79D6.
- Capture/retour : **WRAM0D9C** ; trajectoire calculée0D9E ; cibleY0DB4. Ces trois variables ont +2 par rapport au désassemblage US.
- VitesseY GSU1222 ; plafond15E2 ; mode11 flottement, mode1 retour. Montée PAL native plafonnée à−320.
- Preuves fichier ROM : 197D3 établit DP7960 ; table33CE2 associe mode1 à06:C399 et11 à06:C701 ; 34095 initialise le retour/verrous ; 34450 rattache et libère les verrous. Le premier brouillon de patch utilisait de mauvaises adresses ; il n’a jamais été publié. Les tests de régression utilisent uniquement les adresses EU corrigées.

### Recette réelle
- Navigateur isolé port5186, base IndexedDB de test, vraie émulation Snes9x ; aucun accès à la sauvegarde de production. ROM originale comparée en désactivant le pont (sans modifier bébé), à partir d’un même état natif. Au premier choc, original ET mod : bébé x433/y1877, screenY89, vy478, compteur102. La ROM originale monte elle aussi près du bord haut (screenY18 ensuite). Les séquences ultérieures ne sont pas synchrones car le dialogue original est passé manuellement.
- Avec aide : bulle mode11 observée screenY29, vy+104 (redescend), compteur66. Saut gauche puis langue verticale : mode1, capture9, verrous joueur1/sprites9. Direction maintenue pendant le retour : joueur reste à x390/y1852, compteur56 ; après rattachement mode0/capture0, verrous0, babyLost=false, compteur56. Sauvetage complet réellement vérifié, pas forcé par écriture de mémoire.
- Preuve `outputs/verification-secours-corrige.json`. `verification-bebe-rom-originale.json` contient les relevés initiaux ; ignorer ses champs mode/returning/targetY erronés, signalés dans le JSON (coordonnées/vitesse/compteur valides).
- Formats contrôlés : 320×568,390×670,390×844,844×390,667×375,568×320 ; aucun débordement horizontal ni chevauchement toolbar/joystick. Captures `outputs/verification-commandes-goonk-portrait.png` et `verification-commandes-goonk-paysage.png` (rose). Préférence d’aide désactivée puis rechargée : mémorisation confirmée, réactivée ensuite. Ce sont des tailles mobiles sur navigateur desktop, pas des téléphones physiques.
- Outils temporaires de comparaison retirés du build final ; copies conservées dans le workspace `work/original-rom-comparison/` si besoin. Diagnostic développeur conserve les coordonnées et états EU corrects du bébé.
- Validation automatisée : 227 tests, TypeScript et Vite. Tests ajoutés pour les deux atlas Goonks, les retours contact/langue, seuil/descente/états protégés de l’aide et activation/désactivation dans le tick.

### Reste à vérifier pour Gemini
- iPhone et Android réels : netteté, fluidité, son, tactile, rotation avec barre navigateur et safe-area. Pas de mesure FPS ni de garantie de performances sur matériel mobile réel dans cette recette.
- Autres niveaux, autoscroll, boss, transformations, séquences spéciales : tests unitaires des gardes, mais pas de parcours complet de la campagne. Garder le compteur natif ; ne pas réintroduire de recharge forcée.
- Si des Goonks encore plus détaillés sont souhaités, il faudra des rendus sources de résolution supérieure, avec budget atlas/mémoire mesuré. Agrandir seulement le canvas ne crée pas ces détails.
- Les limitations de sauvegarde, audio et campagne des sections précédentes restent valables. Le seuil demandé de 10% de quota restant n’est pas atteint (dernier relevé : 87% restants) ; ce document est actualisé malgré tout.

## 28 octobre 2026 — vol rapide et reprise à la position sauvegardée

- Vitesse soutenue de Squawks portée de -0x180 à -0x400. La physique native ajoute 0xA0 de gravité avec B relâché avant de déplacer Y (bank0B.asm CE24–CE57) : l’ancienne consigne produisait seulement ~0.875 pixel/image. Consigne actuelle ~3.375 px/image avant variations de cadence.
- Test réel EmulatorJS/Snes9x dans onglet/origine isolés port5185 : maintien Space 1.6 s au départ x120/y1904 ; ancien code y1836 (68 px gagnés), nouvelle consigne sans borne y1646 (258 px). Ce test a révélé la sortie par le haut, corrigée en limitant la vitesse près de cameraY+32, avec compensation de gravité. Le personnage et son cavalier restent visibles lors du maintien prolongé. La caméra et la position ne sont pas écrites directement.
- Vol diagonal puis maintien vertical, relâchement/atterrissage et bouton pointeur testés dans le vrai jeu. Paysage 844×390 vérifié, image outputs/verification-vol-squawks-mobile.png. Le test utilise un navigateur desktop redimensionné ; aucun téléphone physique testé.
- Suppression du goToMap automatique au chargement d’une campagne. Attention : loadState JS est synchrone mais RetroArch met la restauration en file. Il faut activer la boucle et attendre waitForNativeFrames AVANT de lire le mode restauré. Sans cette attente, le test natif lit encore 0x55 (titre) et rejetait la sauvegarde. Le test unitaire simule désormais ce chargement différé.
- En cas de mode invalide après restauration, erreur de reprise, sans bootstrap de nouvelle partie ni écrasement de la sauvegarde. Les erreurs IndexedDB de readCampaign conservent le comportement antérieur : log puis absence de sauvegarde (limite à revoir si stockage indisponible).
- Entrées vidées à la reprise. Sauvegarde sur pagehide et visibilité cachée ; capture immédiate et file des écritures qui conserve la dernière position même si une écriture précédente est en cours. Autosave périodique inchangé, 20 s. Une fermeture forcée de l’application sans événement peut revenir au dernier autosave.
- Validation native : fermeture/réouverture retrouve le niveau 1-1 ; rechargement contrôlé avec pause immédiate retrouve EXACTEMENT mode13, salle 0:0:81c7:21, x679/y1872, violet, Squawks et dialogue9. Preuve outputs/verification-reprise-coordonnees.json. Un premier essai laissé tourner plusieurs secondes après reprise a subi un choc ennemi normal ; ne pas confondre cette évolution avec une mauvaise restauration.
- Validation finale : 184 tests + build TypeScript/Vite. Préserver la vérification native, car le premier mock de loadState synchrone passait sans reproduire la restauration différée réelle.

## 28 octobre 2026 — vol de Squawks

- Corrigé deux défauts identifiés dans le code : le bouton Jump envoyait B natif en plein vol (flutter Yoshi concurrent à la vitesse de vol), et la pose jump de Squawks était figée à sa dernière frame comme un saut de Kong.
- B natif sert au décollage au sol seulement pour Squawks pendant le gameplay. En l’air, Jump maintenu soutient la montée ; relâcher rend la gravité native. Les confirmations carte/dialogue gardent leurs entrées natives.
- L’assistance de vol n’écrase plus le décollage au sol ni une impulsion native plus forte que -0x180. Elle reste bloquée par les plafonds, scripts, transformations et verrous. Perdre Baby Mario repasse toujours sur Yoshi.
- Les 14 poses de battement d’ailes bouclent durant le vol. Les poses de saut des autres personnages restent à leur dernière frame.
- Validation : 175 tests passent, build TypeScript/Vite valide. Cas ajoutés : décollage, maintien long, relâchement, retaps en l’air, plafond, carte/secours et animation prolongée.
- Limite : navigateur indisponible car Mac verrouillé ; ressenti et rendu à confirmer dans une partie sur téléphone.

## 28 octobre 2026 — netteté des Goonks sur mobile

- Le calque des acteurs suit la taille CSS et la densité de l’écran via ResizeObserver, plafonné à 2× (512×478 pour la sortie native 239 lignes ; maximum 512×512). Ce plafond conserve les texels utiles des poses sources ~50–70 px, dessinées à .64–.72×. Un buffer plus grand ne crée pas de détails supplémentaires dans ces assets.
- Les coordonnées du jeu restent 256×hauteur native grâce à setTransform ; caméra, collisions, positions et physique inchangées. Hauteur logique séparée de la hauteur physique du canvas dans LiveGame.
- Interpolation douce du calque à l’affichage et qualité haute pour les Goonks ; sprites DK et décor natif conservent leur pixel art. Aucune image plus lourde ni moteur 3D ajouté.
- Aucun calcul de layout par frame ni réallocation du canvas si la résolution cible reste identique. Budget du buffer RGBA : ~0.93 Mio à 512×478, maximum 1 Mio ; ce chiffre ne couvre pas les autres allocations du navigateur.
- Validation : 170 tests passent, TypeScript/Vite valides ; tests du plafond, densité portrait/paysage, transform logique et absence de réallocation sur changement de taille à résolution identique.
- Limite de validation : navigateur indisponible (Mac verrouillé). Pas de vérification visuelle ni de mesure de FPS sur téléphone pour cette modification. Vérifier iPhone/Android portrait et paysage, marche/roulade/monture, et absence de décalage après rotation.

# État courant — secours original et langue verticale à un doigt, 25 octobre2026

Comparaison demandée avec le jeu original : le manuel Nintendo, page11, recommande explicitement la langue vers le haut ou un œuf lorsque bébéMario flotte trop haut. Source primaire : https://www.nintendo.co.jp/clvs/manuals/common/pdf/CLV-P-SADJE.pdf . Le compteur commence à10, monte avec les étoiles jusqu’à30, se recharge progressivement vers10 après sauvetage ; il peut être inférieur à10 au choc suivant. Ces règles et les coordonnées de la bulle ne sont pas modifiées par ce correctif.

Défaut de commande identifié : sur le joystick tactile momentané, relâcher Haut avant de toucher Langue effaçait la direction. Avec un seul doigt, Up+Y n’était donc pas réalisable. Controls mémorise désormais la visée vers le haut pendant2secondes après un gesteHaut. Le joueur relâche, puis touche Langue : le pont envoie ensemble Up+Y uniquement pendant l’attaque140ms. Aucune direction de déplacement ne reste pressée après le relâchement du stick. Le bouton affiche Tongue↑ quand la visée est préparée ; les options expliquent la combinaison et l’usage d’un œuf.

La visée est consommée au premier tir, expire au bout de2secondes, s’annule avec nouveau geste côté/bas/centre, Stop/pause, changement de monture ou visée d’œuf. Les véritables appuis Haut+Langue simultanés restent possibles. Le compteur original, le saut plané deYoshi, les sauts normaux desKongs et la direction momentanée restent actifs.

167tests passent, TypeScript et buildVite valides (index-CSHD8_rt.js). Recette moteurMac dans un onglet isolé5183 : gesteHaut relâché puis boutonLangue au clic, langue native relativeX=0/Y=-48 et direction de déplacement0. Capture outputs/verification-langue-haut.png. Choc réel observé en1-1 : compteur10 et bulle native, puis instruction originale invitant à sauter ou utiliser la langue. Le sauvetage complet dans cette dernière séquence n’est pas revendiqué, l’essai ayant été interrompu par cette instruction. Pas de validation sur téléphone physique. Tests du relâchement sans mouvement, comboUp+Y, expiration, annulation et conservation du bébé/compteur.

---

# État courant — maintien du saut de Yoshi, après2281d8f

Le saut tactile/souris et Espace suivent maintenant un vrai appui maintenu jusqu’au relâchement. Le timer de750ms ne sert plus qu’au click d’accessibilité sans pointerdown/keyup. Les sources clavier/pointeurs sont suivies séparément ; Stop, blur, annulation et visée les libèrent. Un tap très court garde80ms de signal pour ne pas être perdu entre deux frames natives.

Yoshi : NativeFlutterInput envoie un seul relâchement/réappui60ms au début de descente si le bouton est toujours maintenu et que le flottement n’est pas déjà actif. C’est nécessaire car le code natif exige un nouveau frontB (GSU bank0B:CD52–CDAA). Le pont ne remplace pas la vitesse verticale ni la durée native du cycle, et ne répète pas automatiquement des cycles infinis. Les appuis manuels restent possibles.

Kongs à pied : NativeJumpBoost n’autorise B que pour un saut commencé au sol, pendant au plus260ms ; un nouvel appui en l’air ne crée plus le front qui pourrait activer le flottement de Yoshi. Donkey et Diddy gardent leur impulsion et leur physique existantes. S’ils chevauchent Yoshi, ils bénéficient naturellement de ses pouvoirs. Les montures animales gardent leur comportement et Squawks son vol.

162tests passent ; validation moteur sur Mac isolé5182 : maintien clavier1100ms et souris1100ms surYoshi, D2=6 (flottement actif), vy=-9 puis7 ; Donkey et Diddy maintenus1200ms à pied sont au solC0=0, vy=0, D2=1 (armement natif, aucun flottement actif). Captures outputs/verification-saut-yoshi.png et verification-saut-diddy.png. Pas de test de matériel mobile physique. Le libellé du bouton indique hold to flutter surYoshi, normal jump à pied, hold to fly surSquawks. TypeScript et Vite valides. Couverture des maintiens longs, relâchement, double source, tap rapide, interruption, sautDK/Diddy au sol, refus de flutter en plein vol, cycle natifYoshi et cavalier surYoshi. Le compteur de secours original et la direction momentanée de2281d8f sont conservés.

---

# État courant — compteur original restauré après303d56a

Demande utilisateur : conserver les mêmes valeurs que Yoshi’s Island original. Le minimum forcé de10secondes à chaque choc ajouté par303d56a était une modification des règles ; il est supprimé avec src/rescue.ts et ses tests de minuterie personnalisée. Le pont ne modifie plus WRAM03B6.

Référence primaire : manuel Nintendo original, page12, https://www.nintendo.co.jp/clvs/manuals/common/pdf/CLV-P-SADJE.pdf . Le compteur commence à10, monte jusqu’à30 avec les étoiles. Après récupération de bébé, une réserve inférieure à10 se recharge progressivement jusqu’à10. Un nouveau choc durant la recharge peut donc commencer à5 : ne pas forcer un remplissage à chaque coup.

Vérification code natif local : bank01:AFDC–AFDF initialise03B6 à0064 (100unités internes =10affichés). bank00:E2F5–E310 décrémente le compteur via le diviseur natif0392 ; bank00:E2CC–E2F3 gère la recharge progressive sous006D. Toute cadence, pause, bonus et capture reste gérée par le cœur et la ROM Europe exacts, sans conversion en horloge JavaScript ni modification de ROM.

Validation :149tests passent, TypeScript et Vite valides, bundle index-5fcl7yiP.js.

La direction momentanée par défaut du commit303d56a est conservée : relâcher libère la commande. Tests de pont ajoutés pour les réserves0/1/50/100/109/300, la seconde perte à5, la recharge native et pause/reprise sans écriture du compteur. Les sections suivantes sont historiques ; le minimum forcé qu’elles décrivent n’est plus actif.

---

# État courant — secours et direction, après ef98e18

La direction est momentanée par défaut : Controls(sticky=false), option Keep walking after release décochée. Relâcher le joystick annule ses deux axes ; la marche persistante reste un choix explicite. Les sauts et roulades accessibles restent disponibles.

RescueTimer dans src/rescue.ts donne au moins10 secondes actives à chaque nouvelle perte de bébé, ou le nombre supérieur d’étoiles déjà présent converti en secondes (unités RAM03B6 = dixièmes du compteur affiché). Il compense la décrémentation native, conserve les bonus ramassés pendant le secours, exclut pause/arrière-plan et instructions, puis laisse le compteur arriver à0 pour la capture native. La récupération ou sortie du gameplay réinitialise le suivi ; la réserve d’étoiles du bébé en sécurité n’est pas modifiée. L’ancien compteur n’était pas une horloge en secondes et pouvait laisser trop peu de temps sur mobile.

Validation : 155tests passent, TypeScript et Vite valides (index-BOnE570S.js). Recette moteur sur Mac, onglet isolé5181 : option de marche persistante décochée ; direction0 après relâchement ; choc réel en1-1, compteur10 puis encore6 après5secondes actives, puis compteur0 et capture native après6,5secondes supplémentaires. Pause respectée entre observations. Ce n’est pas une validation matérielle iPhone/Android. Capture outputs/verification-delai-secours.png.

Tests ajoutés pour les directions relâchées, les dix secondes, le compteur faible, les réserves supérieures, bonus, pause, dialogues, fin normale et intégration LiveGame. Les validations historiques ci-dessous sont conservées mais le mode persistant par défaut de ef98e18 est remplacé.

---

# État courant — audit du niveau 1-1, 24 octobre 2026

Cette section prévaut sur les notes historiques ci-dessous. Base335096c, copie isolée work/web-playthrough-20261024, serveur5180. **144 tests passent et build Vite valide** : index-Dxq6NEPY.js, CSS index-CS1DDHCj.css. Consulter [la recette détaillée](QA_1_1_2026-10-24.md) pour les reproductions, preuves et limites.

Corrigé : faux finish lors d’un choc près du cercle ; restauration du rendu natif et purge des anciennes commandes en victoire ; recul/invincibilité qui bloquait le contrôle après choc ; boosts de saut répétés en l’air ; absence de nouveau front B pour le flutter ; mode un doigt et annulation tactile ; carte/boutons SNES ouverts depuis pause ; destruction des murs avec toutes les montures ; traversée des parois par injection de vitesse ; destruction prématurée d’une Piranha porteuse ; personnage dessiné par-dessus les instructions.

Le cercle réel de1-1, la cérémonie, le score, le retour carte, l’ouverture et le démarrage de1-2 puis la sauvegarde/reprise ont été observés dans le moteur natif. La sortie a été vérifiée avec une entrée DEV proche du cercle, sans forcer de victoire. Le parcours d’entrée jusqu’aux plateformes/parois/plantes a été joué séparément, avec15 ennemis éliminés, puis usage de Squawks déverrouillé pour les essais. Ne pas transformer cette couverture en affirmation de partie intégrale sans assistance ou de jeu complet exempt de bugs.

Repères essentiels : état joueurAC14 = goal ; mode global14 = victoire ; AC1A = Piranha porteuse. C0=0 au sol,6 décollage,7/8 descente. ContactsFC gauche180/droite60/plafond18/sol7. L’invincibilité>=64 bloque nativement les commandes au sol ; le pont borne uniquement les chocs reconnus à24..63. Ne jamais forcer les déplacements pendant un script ou une transformation. L’ancienne fixture goal inv7fff bloquait elle-même le joueur ; remplacée par63 et pause dès l’entrée prête. La routine de dessin masquée n’a pas été prouvée responsable de l’avancement des cinématiques : l’ancien commentaire était trop affirmatif.

Reste à valider : appareils physiques iPhone/Android (audio, zoom, rotations), longues sessions, autres niveaux/boss/bonus, tous les passages secrets, transformations, toutes les issues de capture par les plantes. En cas de vieux snapshot coincé dans un mur : revenir à la carte par Options et relancer le stage. Aucun fichier audio, ROM ni format de sauvegarde n’a été changé dans ce lot.

---

# Zoom au spam des boutons — correctif après86a9f79

Retour réel utilisateur : zoom200% en appuyant rapidement, en portrait/paysage ; le CSS précédent ne suffisait pas. Nouveau src/touch.ts installé sur .shell : touchend capture et passive:false pour annuler le défaut natif sur [data-control]/#stick (les actions sont déjà exécutées par pointerdown). Ne synthétise pas de click ; conserve les clicks natifs des autres boutons/selects et le clavier. Bloque dblclick/gesturestart/gesturechange et touchmove multitouch ; ne bloque pas le scroll1doigt des options. touch-action:none aussi aux ancêtreshtml/body/#app et aux descendants des commandes. Viewport initial1/maximum1/user-scalable=no, choix explicite pour ce jeu où l’utilisateur veut bloquer le zoom ; Safari peut ignorer ce meta, d’où les gardes d’événements en plus.

94tests et build valides, bundle index-D0x9lEKz.js, CSS index-CS1DDHCj.css. Recette dans onglet31/serveur5179, page responsive.html de test non publiée : portrait375x812 et paysage812x375,400touchend synthétiques par format,400défauts annulés,gesturestart annulé,viewport1,pas de débordement. Ce sont des événements synthétiques sur navigateurMac, PAS une preuve de vrais gestes iPhone. Capture outputs/verification-zoom-paysage.png. Ne pas prétendre avoir testé sur matérielmobile. Son et basculeYoshi du commit86a9f79 conservés.

---

# Audio iPhone de nouveau muet au lancement — correctif suivant

Base25a31fe, comparaison674a168->25a31fe : aucun code audio n’avait changé, donc le lien causal avec le commit bébé n’est pas établi. Retour utilisateur : son absent dès lancement et bouton♪ inefficace.

Correctif : avant création du contexte, primeAudio lance un élément HTMLAudioElement non muté en boucle, source locale audio/ios-unlock.wav (PCM mono11025Hz,1s de silence,22094octets). Il conserve la route média durant le chargement asynchrone du cœur et est relancé synchroniquement aux gestes. Contournement documenté WebKit237322 : https://bugs.webkit.org/show_bug.cgi?id=237322 . Ce fichier ne remplace jamais la musiqueSNES : il est silencieux. Session playback conservée mais ne réécrit plus le type à chaque appel si déjà playback. resumeNativeAudio appelle resume même si l’état indique encore running. Pause : volume0 avec cœur arrêté, sans suspend manuel ; évite qu’un suspend asynchrone tardif annule le resume d’un geste. unlockAudio respecte le volume0 tant que game.paused. Le bouton♪ ferme les options puis reprend.

86tests et build valides (index-acxR9WhV.js). Tests du lancement média synchronique/refusé, reprise contexte running, setter session idempotent, absence suspend lors pause. Aucun accès au téléphone physique : ne pas annoncer une preuve de son audible. En cas d’échec persistant relever iOS/modèle et éventuels écouteurs/Bluetooth ; WebKit peut avoir une sortie muette malgré API running, non détectable par simple état JS. Le dernier comportement bébé/Yoshi est conservé.

Suite : confirmer HTML Netlify sur nouveau bundle et présence WAV200 ; test iPhone neuf puis même onglet après pause/retour arrière-plan. L’élément média silencieux peut faire apparaître les contrôles de lecture système iOS. Pas de dépendance supplémentaire, pas de microphone.

---

# Récupération bébé Mario — bascule Yoshi automatique

Base 674a168. À la transition bébé monté -> bébé perdu, Adventure.hit sélectionne Yoshi, conserve le personnage et les animaux débloqués. La détection intervient avant calcul des inputs et physique dans LiveGame.tick, annule la roulade en cours et restaure immédiatement le dessin natif de Yoshi. Les caisses animales ne peuvent pas remplacer Yoshi durant la poursuite. Le drapeau bébé et le compteur natifs ne sont pas forcés : il faut toujours toucher la bulle pour récupérer Mario. Après récupération, le personnage reste monté sur Yoshi ; on peut ensuite changer de monture manuellement.

Tests : les4 personnages après dégâts + pont tick (inputs de saut Yoshi au même frame, restauration visibilité, pas d’impulsion DK parasite, Mario reste perdu jusqu’à récupération native, choix personnage conservé). Recette téléphone physique toujours à confirmer pour audio et gestes tactiles du commit précédent.

---

# Correctif iPhone et PlushGoonk — 23 octobre 2026

Base : 1a870a0. Travail isolé : work/web-iphone-audio (serveur 5178). Les autres onglets de jeu utilisateur ne sont pas touchés.

- Son : le contexte OpenAL peut être running tout en restant muet avec le commutateur silencieux iPhone. `requestPlaybackAudio` demande `navigator.audioSession.type = playback` avant toute création/reprise audio, avec détection et catch pour les navigateurs sans API. Source primaire : https://bugs.webkit.org/show_bug.cgi?id=237322 (commentaire WebKit du 25 septembre 2024). Déblocage aussi sur click et keydown réels, en complément pointerup/touchend. Le message ne prétend plus prouver le son audible à partir de l’état running. Pas de preuve sur téléphone physique ; confirmer avec utilisateur. Ancien iOS sans AudioSession peut rester soumis au commutateur silencieux.
- Tactile : shell et commandes touch-action:none, user-select:none / -webkit-user-select:none, -webkit-touch-callout:none ; contextmenu annulé sur gameplay hors champs. Options conservent pan-y, champs/selects manipulation et police16 pour éviter le zoom au focus. Pas de maximum-scale/user-scalable=no global.
- PlushGoonk rose/violette : vrais assets locaux `goonk-country/public/rom2d/plush.{png,json}` (68 poses issues du rendu des modèles3D) copiés dans public/art. Rendu Canvas2D des animations idle/walk/jump/roll/ride, sans moteur3D supplémentaire ; ce sont des images prérendues et pas des modèles3D temps réel. Sélecteur4 personnages, DK/Diddy conservés. Violet par défaut. Migration des anciennes campagnes vers violet en gardant progression, monture, animaux ; characterSet:1 sauvegarde ensuite le choix explicite. Les miniatures de carte natives et cinématiques natives restent Yoshi.
- Tests : 74 tests réussis et build valide. Tests migration choix/default, dessin pose roulade/monture, session playback et API absente/refusée. Aucun test Mac ne doit être présenté comme confirmation audio iPhone ni validation réelle du zoom tactile iOS.

---

# En cours — audio, carte, graphismes, sauts et paysage (23 octobre 2026)

Dernières demandes : pas de son ; départ normal permettant de choisir les stages ; murs/textures parasites après certaines destructions, pas seulement un flash sur les plantes ; cercle de sortie disparu ; en paysage placer les quatre boutons et le nom de niveau à gauche au-dessus du joystick ; DK/Diddy à pied doivent sauter plus haut sans modifier leur accélération/freinage.

Changements préparés dans `work/web-mobile-current`, basés sur `5450e68` :

- Bug audio prouvé dans le JS du cœur livré : `AL.contexts` est un objet à clés numériques, pas un tableau. Les `.map/.find` lançaient une exception avant `resume`. `src/audio.ts` utilise Object.values, déduplique currentCtx, appelle resume synchroniquement dans le geste, borne l’attente 500 ms. Bouton ♪ accessible hors options ; le bouton des options ferme/reprend la partie avant le déblocage.
- Nouveau snapshot de carte native Europe / Snes9x 2.0.2 : `public/bootstrap/yoshi-eu-map-snes9x-2.0.2.state`, 824440 octets, SHA256 `45b5cc023e3d8f29ee804342f67e1b4eb954d7b2bb57ba0f85fe990430f4f75e`. Généré en rechargeant l’état neuf de 1-1 puis en passant par l’initialisation native de la carte (mode23 -> 26), sans marquer le stage terminé. Pas de route de capture à publier. L’ancien état de départ en plein 1-1 est retiré.
- La campagne est rechargée pour conserver la progression et les partenaires puis renvoyée à la carte native. Un bouton Options -> Choose a level / World map permet aussi d’y revenir. Sur la carte, Enter/V envoie B natif ; les valeurs RAM du dialogue en gameplay ne doivent pas bloquer cette confirmation. `inGoal` ne neutralise les commandes que pendant le gameplay, plus sur la carte.
- Une suppression de plantes effaçait seulement état+ID. Le correctif reproduit `despawn_sprite_free_slot / clear_graphics` (signature exacte EU vérifiée à ROM1A32E) : état0, draw priority $74A2=00FF, libération du masque dynamique via index $7722 et table $7ECE / bitmap $7ECC, libération de la plateforme $61B6. Adresses dans GSU = CPU -6000. Ne pas remettre l’ID à zéro. Cela répare un vrai défaut de ressources et peut expliquer textures parasites/cercle manquant ; ne pas prétendre avoir reproduit tous les murs parasites de l’utilisateur tant que le parcours réel n’est pas confirmé.
- Le collectible Fleur $110 et les vrais pots à contenu $DA sont protégés comme le goal $0D. La dénomination précédente PLANT_POTS était fausse : $66 est une Piranha, $6D/$6E sont des poissons. La liste est désormais CUSTOM_DEATH_PLANTS.
- Impulsion du saut DK/Diddy à pied -0640, maintien B260 ms ; accélération/freinage horizontal inchangés. Les pouvoirs/montures restent gérés par le jeu natif et le pont existant.
- En paysage mobile (hauteur <=600px), plus de rangée header. Toolbar en grille2x2 de boutons44px à gauche, nom de stage et Son dessous, joystick en bas. Portrait et desktop conservent leur disposition. Recette 320x568 et 812x375 : pas de débordement, commandes visibles44px minimum.

Validation à ce point : 68 tests réussis et build valide. Test moteur legacy sur Mac : départ carte, sélection1-1, retour carte ; OpenAL running et signal RMS non nul 0.02581 mesuré avec un AnalyserNode sur le gain natif (pas le micro). Ce n’est pas une preuve sonore sur un vrai téléphone. Fixture DEV Check native audio signal et Approch the 1-1 goal sont réservées au debug. La zone de fin1-1 a été rechargée par son vrai chargeur natif en modifiant temporairement l’entrée DEV : le cercle natif est présent (sprite0D à X3632 Y1712), son dessin est visible et sa réservation graphique vaut00FF. Les tentatives de parcours en téléportation ont été abandonnées car elles déclenchaient des dégâts/dialogues ; la fixture native finale donne une invincibilité de test seulement. Le passage en saut+roulade déclenche bien la victoire native (mode14, bébé monté, X3659 Y1659). Ce test a ensuite identifié un autre défaut : le corps natif restait masqué pendant la cinématique, alors que sa routine fait aussi avancer l’animation. `hideNativePlayer` limite maintenant le masquage au gameplay13 ; un test protège victoire14/15 et cartes23/26. Le parcours complet après destruction de toutes les plantes reste à confirmer. Pas encore publié à cet en-tête.

---

# Correctif suivant — démarrage direct, 23 octobre 2026, 20 h 12

**Publication confirmée : commit `5450e68`, déploiement Netlify `6adba33a8d5d6f455a8be685` publié. HTML public vérifié sur `index-kPY6Q6r0.js`, jeu lancé sans erreur console. Lien utilisateur à recharger : https://incandescent-dodol-e52ce9.netlify.app/?v=5450e68 . Ce paramètre contourne l’ancienne page en cache sans changer l’origine des sauvegardes.**

Le retour réel utilisateur invalide l’hypothèse que désactiver Fast Forward suffisait : « Preparing adventure » restait affiché plus de 60 secondes sur Chrome mobile. Les tests Mac précédents ne validaient pas le téléphone. La cause matérielle exacte de l’automatisation des menus reste inconnue.

La séquence de menus est maintenant entièrement retirée du démarrage. Un état initial natif du niveau 1-1 est embarqué : `public/bootstrap/yoshi-eu-snes9x-2.0.2.state`, 824440 octets, SHA256 `d4464f265aed6b67db1af34127299fb7d189aac250c64a119f3ad1eecd531dfa`. Il a été généré depuis un démarrage neuf (campagne ignorée), Europe exact + Snes9x 2.0.2, dès mode13 et X>0, avant de masquer le dessin natif. Il contient le point de départ du jeu, aucune partie utilisateur. Les sauvegardes utilisateur existantes sont toujours chargées d’abord.

`src/bootstrap.ts` charge et vérifie SHA256, délai réseau 15 s. Aucun repli vers l’ancienne boucle menus : erreur lisible en cas de fichier absent/invalide. `LiveGame.prepare` résout le pont, charge la campagne ou cet état, attend les frames et vérifie le mode gameplay. Le cache INITIAL reste écrit pour le bouton DEV de remise au début, mais n’est plus la source du premier lancement.

`waitForNativeFrames` attend deux changements réels du compteur (10 s maximum), y compris si une restauration remet le compteur en arrière. Cela remplace aussi l’attente fixe de 100 ms lors de la reprise d’une campagne.

**Validation : 61 tests réussis, build valide, bundle `index-kPY6Q6r0.js`.** Deux premiers lancements neufs testés dans des onglets Mac isolés : moteur normal et moteur legacy/WebGL1 utilisé par iPhone, tous deux au niveau 1-1 avec image et sans erreur console. Le paramètre DEV `?fresh=1&legacy=1` force ce dernier cas ; il ne change pas le véritable appareil/UA. Les tests obsolètes sur la politique Fast Forward ont été remplacés par validation de l’état et compteur restauré. La validation sur téléphone réel reste à faire après publication.

La route temporaire locale de capture a été retirée. Aucun changement de `vite.config.ts` à publier. Pour régénérer : repartir du bootstrap de eabcb0e dans une copie isolée, ignorer la campagne, capturer `new Uint8Array(manager.getState())` quand mode13 et X>0, avant `finishBoot`, vérifier sur les deux cores et changer le SHA256. Ne pas prendre une sauvegarde de partie utilisateur.

Suite : confirmer HTML public sur ce nouveau bundle, tester vrai Chrome iPhone/Android, noter si le blocage se situe désormais à « Loading the SNES core » ou « Opening level 1-1 ». Ne pas rallonger encore le timer des anciens menus. Les autres limites et tâches gameplay du rapport historique restent ouvertes.

---

# Relais Gemini — état du 23 octobre 2026, 20 h 08

**Publié et vérifié : commit `eabcb0e` (précédé de `948ae69`), HTML public chargeant `index-BED4v4xo.js`. Le jeu atteint le niveau 1-1 sur le site public, sans erreur console. Premier démarrage neuf testé sur Mac dans les branches mobile et desktop. La validation sur téléphones physiques reste à faire.**

## Source faisant autorité

Projet : `/Users/sevenone./Documents/git/mario-donkey/web`. Base Git de cette correction : `e9294a8`. Copie de travail récente : `work/web-mobile-current`, serveur de test localhost 5177. Ne jamais synchroniser les anciennes copies `web-iphone`, `web-walls`, `web-next` ou `web-project` sur le projet : elles précèdent plusieurs commits récents. Les onglets 5173/5174/5175 peuvent contenir la partie de l’utilisateur ; ne pas les manipuler.

Site à corriger : https://incandescent-dodol-e52ce9.netlify.app/ . Déploiement automatique de la branche main. `git push --dry-run origin HEAD:main` fonctionne malgré `gh auth status` invalide. L’onglet Netlify IAB affiche encore Log in ; l’utilisateur a annoncé se connecter. Aucun besoin de lire ni de copier des identifiants.

## Symptôme et correctif préparé

Sur iPhone et Android : écran noir après Play, seule indication « Fast Forward » en haut à droite. Ce texte démontre que le moteur a atteint la préparation initiale accélérée. La cause exacte sur matériel n’a pas été prouvée.

- Le premier boot mobile tourne désormais à vitesse normale, sans accélération ×6 ; iPhone, Android et iPad en mode bureau détectés. L’accélération desktop reste disponible.
- Impulsions Start/B synchronisées sur les frames natives (3 frames maintenues, plus de 20 entre appuis), plutôt que 85 ms arbitraires.
- Chargement visible pendant le démarrage, progression en secondes ; timeout explicite si les frames cessent d’avancer pendant 12 s, délai total mobile 90 s.
- `AudioContext.resume()` ne peut plus bloquer le lancement indéfiniment (500 ms maximum). Chargement des sauvegardes plafonné à 4 s sans autoriser l’écrasement d’une sauvegarde lente, écriture de l’état initial à 1,5 s.
- Import de `engine.ts` compatible Node pour les tests mémoire (plus de lecture de window non protégée au chargement du module).
- Les contrôles anglais, joystick, correction audio au relâchement du doigt, fuite originale de Mario, œufs et murs des commits récents sont conservés.

**Validation : 61 tests passent, build TypeScript/Vite réussi.** Premier démarrage neuf avec branche mobile forcée testé dans un onglet Mac séparé : niveau 1-1 atteint, pas de Fast Forward. Ce n’est pas un test sur iPhone/Android physique. Ne pas prétendre que le problème matériel est confirmé résolu sans retour utilisateur.

## Fichiers concernés

`src/startup.ts` : détection mobile et attente plafonnée. `tests/startup.test.ts` : iPhone/Android/iPad/desktop, promesse navigateur qui ne se termine jamais, nettoyage des timers. `src/game.ts` : préparation et audio bornés, bootstrap sur frames, watchdog. `src/engine.ts` : garde window. `src/main.ts` et `src/style.css` : progression visible.

`public/rom/yoshi-eu.sfc` est déjà suivi et embarqué, SHA256 `91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90`. Un seul émulateur Snes9x 2.0.2 / EmulatorJS 4.2.3 est utilisé. DKC fournit les sprites extraits ; aucun second émulateur requis. Les options iOS WebGL1/legacy déjà présentes sont conservées. Ne pas prendre le clone récent d’EmulatorJS comme source exacte du bundle minifié 4.2.3.

## Suite à faire après publication

1. Vérifier que Netlify publie le nouveau commit puis que le HTML public référence `index-BED4v4xo.js`.
2. Demander un essai réel iPhone ET Android avec rechargement de la page. Observer progression, entrée en 1-1, son après tap, reprise après arrière-plan, sauvegarde/reprise, portrait/paysage.
3. Si écran noir persiste : lire le message de progression ou erreur, modèle/version OS. Inspecter le navigateur distant pour distinguer compteur natif bloqué et rendu WebGL noir. Ne pas continuer à deviner seulement l’audio.
4. Si le compteur s’arrête : étudier main loop / visibilité / audio du bundle exact. Si le compteur avance sans image : inspecter canvas / WebGL. Si le niveau apparaît mais le mod échoue : sondes WRAM/GSU et restauration des états.
5. Éventuellement embarquer un savestate initial validé pour ce ROM/core exact afin d’éviter les menus au premier lancement ; pas encore fait.
6. Faire la validation complète de campagne et des pouvoirs sur les stages avancés. Le jeu complet est celui de la ROM, mais les ajouts animaux/attaques n’ont pas été vérifiés sur tous les stages, boss, transformations et salles spéciales.

Les archives `outputs/kong-island-netlify-mobile.zip` et `outputs/kong-island-netlify-iphone.zip` doivent toujours être régénérées à partir du build récent. Les anciennes archives de 17 h étaient obsolètes. Le code Wasm du cœur est déjà natif compilé ; une réécriture du pont en Rust n’est pas justifiée pour ce bug.

## Historique technique conservé ci-dessous

Les sections suivantes sont historiques. Les déclarations de source active, langue UI, compteurs de tests et état de publication anciens sont remplacées par le présent en-tête. Les adresses mémoire, limites gameplay et tâches non terminées restent utiles.

---

# Dernière mise à jour : murs sans œufs (23 octobre 2026)

Seuil de 10 % de la fenêtre de 5 h atteint le 23 octobre à 16:45 ; ce rapport complet a été mis à jour à ce seuil, sans utiliser de remise à zéro.

Cette section prime sur les anciennes priorités ci-dessous. La nouvelle source est `work/web-walls`, serveur localhost **5175**, session **90436**. Les copies `web-next`/5174 et `web-project`/5173 restent gelées pour ne pas recharger les parties de l’utilisateur. Livraison synchronisée vers `/Users/sevenone./Documents/git/mario-donkey/web`.

Implémenté : `src/terrain.ts`, appelé par `LiveGame.tick`. DK/Diddy en roulade, ou un des cinq animaux en déplacement, cassent les blocs des pages map16 1A/1B/1C (sable), 7A/7B/7C (blocs attaquables natifs), sans inventaire d’œufs. Rayon limité devant le corps, aucun effacement du sol sous les pieds. Les murs ordinaires, portes/tuyaux et décors hors liste restent protégés. La liste doit être étendue uniquement sur preuve de types supplémentaires.

Le pont reproduit l’écriture de `change_map16` native : carte de collisions WRAM `$7F8000` (offset 18000 dans WRAM), table écrans GSU `$CAA`, cache visible GSU `$409E`, file VRAM **Europe `$9EF` taille, `$9F1` destination, `$9F3` source**. Zéro est la tuile vide, source graphique `$4C33F2`. Vérifié dans ROM Europe : routine offset `$81334` et upload vers `$6800|tileIndex` à `$81B05`. Ne pas reprendre les adresses USA `$9ED/$9EF`. La file reste terminée par FFFF, append de 4 octets, limite conservatrice 100 octets hex. Aucun changement de collision si file pleine/non alignée ou bloc hors caméra. `leftmost/uppermost` GSU A4/A6. Les lignes du cache et les destinations VRAM gèrent le franchissement X=256 via XOR0420.

**Validation : 47 tests passent, build réussi.** Sept nouveaux tests terrain couvrent carte/cache/VRAM, maintien du stock zéro, protection du sol et des décors, attaque gauche/droite, arrêt/dialogue/transformation, file pleine, frontières d’écran et ajout à une file existante.

Recette navigateur sur onglet distinct 5175 : aide DEV `Placer un mur cassable (test)` pose deux vrais blocs map16 7B00 devant le personnage, avec upload natif (graphique A022). DK en roulade a détruit ces deux blocs, compteur walls=2, puis a traversé leur coordonnée (x175 après mur x160), œufs=0. Rambi a détruit deux autres blocs en déplacement simple (walls=4), puis a traversé la zone. Aucun œuf ni projectile synthétique utilisé. Aide DEV uniquement ; aucun mur de fixture ajouté aux parties réelles. Captures outputs/mur-avant.png et mur-apres-rambi.png. Les graphismes de 7B00 dépendent du tileset natif du niveau ; ceci ne prétend pas valider toutes les variantes de murs de toute la campagne.

À faire : parcours des murs réels du 1-2 et des autres mondes ; vérifier notamment blocs adjacents spéciaux 7C et effets des tuiles voisines (l’algorithme retire les cellules frappées, sans reproduire tous les raccords graphiques natifs), tous les animaux et sauvegarde/rechargement après destruction. Profil de performances et vrais téléphones toujours à réaliser. La destruction des sprites de décor mobiles n’est pas couverte par ce pont map16. Les autres limites du rapport demeurent.

Livraison du nouveau serveur : copie de sauvegarde 5174→5175 effectuée et validée au niveau 1-2 avec Diddy sur Expresso, puis pause immédiate. `transfer.html` permet de recommencer la copie de la dernière sauvegarde de 5174 vers 5175 (source conservée, anciennes données cible sauvegardées). Ne pas copier une fixture de test dans une partie utilisateur. Après tous les changements de fichiers, relancer la partie livrée puis pause immédiate : même les changements de documentation peuvent provoquer un reload Vite.

---

# Relais Gemini — Kong × Yoshi

État au 23 octobre 2026. Ce rapport est préparé avant le seuil demandé de 10 % restants. Dernier contrôle de quota pendant cette livraison : 35 % de la fenêtre de 5 h et 54 % de la semaine disponibles ; aucun crédit de remise à zéro utilisé.

## Intention et dernières décisions

Projet utilisateur : `/Users/sevenone./Documents/git/mario-donkey/web`. Un seul émulateur SNES dans le navigateur, interface TypeScript + Vite, statique pour Netlify. Yoshi’s Island Europe fournit le jeu complet, physique, ennemis, collisions, musique, effets, Baby Mario et œufs. Les sprites de DK/Diddy et des animaux viennent de DKC1. L’utilisateur a remplacé sa demande initiale de personnages dessinés dans le style Yoshi par leurs graphismes originaux.

Demandes confirmées : DK/Diddy animés, pouvoirs de Yoshi, monture Yoshi et animaux Rambi/Winky/Expresso/Enguarde/Squawks ; mobile first, grands boutons portrait/paysage, actions successives à un doigt, souris et clavier ; passer les instructions ; roulade qui tue les ennemis ordinaires ; campagne complète. **Dernière instruction : retirer les tonneaux DK.** Les deux Kong restent disponibles, même après un choc. Les caisses animales restent présentes. Un choc ne change plus automatiquement de monture : Baby Mario est libéré par le jeu natif et Yoshi reste visible si sélectionné.

## Emplacements, reprise et partie de l’utilisateur

- Source courante et serveur de test : `/Users/sevenone./Documents/Codex/2026-10-23/spiderman-in-arkham-knight-passthrough-mod/work/web-next`, port **5174**, session terminal 75172.
- Ancienne copie, volontairement gelée pendant que l’utilisateur joue : même parent `work/web-project`, port **5173**, session 87633. **Ne pas éditer cette copie sans tenir compte du rechargement Vite : l’utilisateur y joue.** Il a expressément demandé de tester dans un autre onglet.
- L’onglet utilisateur est `http://127.0.0.1:5173/?debug=1&test=1`. Ne pas le fermer, naviguer, réinitialiser ou piloter pendant les tests.
- Tests Codex : onglet distinct `http://127.0.0.1:5174/?debug=1&test=1` ; harnais `/responsive.html`.
- La livraison synchronise la source courante vers le dossier utilisateur `web`, pas vers la copie gelée. Redémarrer ultérieurement sur le même **port/origine** permet de retrouver la sauvegarde de cette origine.
- IndexedDB : `kong-island-local`, ou en DEV avec `?test=1`, **`kong-island-local-test-v2`**. L’utilisateur joue dans cette dernière base. Les ports 5173 et 5174 ont des bases distinctes. **Ne pas supprimer ces bases et ne pas retirer `test=1` en promettant que la partie sera reprise.** Un utilitaire DEV `transfer.html` copie désormais cette campagne 5173→5174, avec backup de l’ancienne cible et sans écrire dans la source. Export/import général utilisateur à ajouter.
- Le prototype Python/Mesen et les ROMs du dossier parent restent intacts.

```sh
cd /Users/sevenone./Documents/git/mario-donkey/web
npm ci
npm test
npm run build
npm run dev
```

Utiliser localhost `127.0.0.1`. Ne pas exposer le dev server sur `0.0.0.0` : `/__local-rom` lit une ROM locale en développement. Cette route n’existe pas en production. `YOSHI_ROM_PATH` remplace le chemin par défaut (ROM Europe dans le dossier parent).

## Architecture actuelle

- `src/engine.ts` : EmulatorJS, Snes9x/Wasm, inputs, recherche mémoire protégée, sélection de la copie ROM réellement exécutée et changement réversible du dessin natif.
- `src/profile.ts` : révision Europe, signatures/adresses, roulade par liste blanche, Baby Mario, fermeture native des instructions.
- `src/game.ts` : boot/cache initial, chargement de toute campagne sauvegardée, tick des entrées, pouvoirs, rendu canvas, sauvegarde native + aventure toutes les 20 s et à la pause, audio.
- `src/controls.ts` : déplacements persistants ou classiques, actions séparées, impulsions natives ; libération des commandes qui annulent la visée ; séparation de deux appuis Œuf rapides par 80 ms de relâchement.
- `src/adventure.ts` : Kong disponibles, montures, caisses animales posées sur du sol parcouru, sérialisation v2. Filtre les anciens tonneaux lors du chargement sans perdre animaux ni campagne.
- `src/atlas.ts` : atlas compact et animations originales ; changement d’état remet l’horloge à zéro, saut non bouclé.
- `src/campaign.ts` : bundle uint32LE longueur JSON + aventure JSON + savestate natif. Clé `campaign-v2-original-dkc-eu-snes9x-2.0.2` ; aucun filtre limitant au stage 1.
- `src/storage.ts` : IndexedDB local, aucun envoi de ROM.
- `src/main.ts` : interface française, boutons natifs, clic/touch/keyboard, sélecteur de monture et pause explicite/onglet masqué. Les aides de diagnostic sont réservées au DEV.
- `src/style.css` : plein viewport 100dvh/safe areas, ratio de jeu 4:3, portrait commandes dessous, paysage à droite, focus visible et reduced motion.
- `responsive.html` : vrais viewports iframe et mesures DOM ; outil DEV, non inclus dans `dist`.

Version figée des dépendances dans package-lock : Vite 6.4.5, TS 5.9, Vitest 3.2.7 ; Node 22. Distribution officielle locale EmulatorJS 4.2.3, core Snes9x 2.0.2, threads désactivés. Le core legacy ET normal, les outils de décompression, `cores/reports/snes9x.json` et licences doivent rester dans `public/emulator`.

## Corrections de cette livraison

1. **Œufs** : vrai bouton A natif, schéma Patient (`GSU $0082=0` pendant gameplay), premier appui vise, deuxième tire. Stock = mot GSU `$1DF6 / 2` (plafond 6). Ce nombre peut diminuer dès la prise en main pour viser, avant le projectile. Ne pas remplir arbitrairement les slots : ce sont des références aux sprites natifs, pas de simples types d’œufs ! Fabrication par langue Y puis Bas ; le jeu crée les vrais sprites et gère les collisions destructibles.
2. **Conflits d’entrée** : Œuf libère Bas, langue, roulade et déplacement persistant. Bas tenu 650 ms annulait la visée suivante en usage à un doigt. Deux appuis A rapprochés sont séparés pour produire deux fronts distincts.
3. **Clic** : un clic sans pointerdown est maintenant accepté, ainsi que le clic clavier/assistif (`detail=0`). Le couple pointerdown + click n’active qu’une fois. Capture de pointeur protégée. Space/Enter sur un bouton ne sont plus interceptés comme raccourcis de jeu.
4. **Freeze au changement de monture** : blur libère seulement les entrées ; pause automatique uniquement si `document.hidden`. Le select perd son focus après son changement, ce qui rend les raccourcis au clavier immédiatement disponibles.
5. **Yoshi invisible** : un choc ne force plus À pied ; les bascules de dessin n’accumulent plus de cheats persistants. On écrit/restaure les 3 octets de la ROM réellement exécutée, après validation de signature, et on conserve les transformations natives visibles.
6. **Instructions Europe** : **WRAM `$0D11`, pas `$0D0F` (USA)**. L’erreur laissait de vrais messages ouverts, empêchant les actions malgré un diagnostic à zéro. Adresse vérifiée dans le binaire Europe : à l’offset ROM `$E038`, séquence `8B 4B AB AE 11 0D...`. Quand état 9, écrire 2 dans GSU `$406E` puis laisser le jeu fermer sa fenêtre et libérer ses flags. Ne jamais mettre simplement le state WRAM à zéro.
7. **Tonneaux DK supprimés** : plus de génération ; migration des sauvegardes élimine les anciens tonneaux, les deux Kong restent disponibles. Caisses animales limitées à deux par pièce, premier seuil 320 px parcourus puis 1500 px ; posées uniquement sur des positions de sol connues derrière le joueur, pas sur une hauteur devinée ni dans un slot natif.

## ROM, mémoire et garde-fous

Yoshi Europe 2 MiB : SHA-256 `91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90`.
DKC USA Rev2 4 MiB (extraction seulement) : SHA-256 `628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527`.

WRAM : mode `$118` (gameplay `$13`), monde `$218`, stage `$21A`, caméra `$39/$3B`, message Europe `$D11`.
GSU/SRAM : X `$8C`, Y `$90`, vx `$B4`, vy `$AA`, direction `$C4`, forme `$AE`, Baby Mario `$1B2` (bit `$8000` porté), invulnérabilité `$1D6`, son `$7A`, mouth `$150`, ammo `$16A`, curseur œuf enable `$EC`, inventaire `$1DF6`.
Tables sprites : état `$F00`, ID `$1360`, X `$10E2`, Y `$1182`, 24 entrées espacées de 4. `$1E` Shy Guy ; **$1F porte et $21 seau sont protégés**, ainsi que Baby Mario, items et boss. La roulade ne cible que les ID explicitement listés, état actif `$10`, proximité 34×28 px et devant ; passe à la mort native `$0C` avec son `$11`. Beaucoup d’ID supplémentaires ont été classifiés par source mais pas testés individuellement.

`resolveMemory` sonde WRAM via `$7E1FE0`, GSU via `$7007E0`, en gardant une sauvegarde avant les huit marqueurs PAR ; laisse tourner 100 ms, arrête, exige une signature unique, resetCheat et restaure tout le savestate. Ne pas coder d’offset heap fixe. Certaines restaurations sont traitées au frame suivant : ne pas enchaîner téléportation et loadState en supposant un effet synchrone.

Dessin Yoshi : signature unique dans le fichier ROM `AD 1A 61 F0 6E AD AE 61 0D 57 0B`, offset Europe `$27AEB`, adresse CPU `$04FAEB`. Normal `AD 1A 61`, caché `A9 00 00`. Plusieurs copies de la ROM existent dans le heap. `resolveDrawing` les départage en appliquant temporairement les codes PAR **à 8 chiffres**, `04faeba9`, `04faec00`, `04faed00`, puis restaure le savestate, reset les cheats et rétablit les octets originaux. Un oubli du zéro initial a été corrigé et couvert par test. La bascule courante n’utilise ensuite plus de cheat. Signature complète et octets permis revérifiés avant chaque écriture. Baby Mario a son propre dessin natif.

Boot : original ROM non patché chargé, environ 5 frames avant sondage ; cache initial natif `campaign-original-eu-start-v2-snes9x-2.0.2`. Nouveau départ accéléré x6, boutons Start/B selon mode ; prologue EU `$3C/$3D` vers `$23`, WRAM `$200=$010F`, monde/stage zéro. En présence de sauvegarde, reprendre son mode et son stage, ne pas ramener au 1-1.

Audio : contexte AL.currentCtx.audioCtx ou AL.contexts ; resume après geste utilisateur, volume .65. Rendu natif mesuré via getVideoDimensions ; canvas overlay logique 256×hauteur et padding `(hauteur-224)/2`. Ratio CSS identique 4:3 pour les deux canvas.

## Graphismes et provenance

`public/art/dkc-atlas.png` : 1536×2496, cellules 96×96, 16 colonnes, origine (48,80), environ 0,5 Mo sur disque/15 Mo décodés. **407 frames, 36 animations**, originaux DKC1 : idle, marche, saut, roulade/attaque, poses de monte. Manifest `dkc-atlas.json`, portraits natifs découpés dans `portraits/`. Aucun second émulateur dans le navigateur.

`scripts/extract-dkc.py` utilise le worker Mesen du prototype pour capturer les sprites DK/Diddy. `scripts/decode-dkc-assets.py` décode 4bpp SNES depuis des descripteurs des sources DKC et la ROM Rev2, vérifie/recherche les headers déplacés, compose les animaux/objets, puis compacte les cellules sans perdre de pixels. Dépendances Python/Pillow seulement pour régénérer hors ligne. La bibliothèque source DKC1 de Yoshifanatic1 correspond à USA1.0 ; ne pas supposer tous ses offsets valides pour Rev2. Des copies/preuves de recherche sont dans `docs/art-evidence` et `work/web-research`.

L’ancien atlas SVG et les anciens essais d’art ne sont plus le rendu courant. Deux appels imagegen avaient été refusés sans image produite ; ne pas annoncer un atlas IA. L’index de recherche 1,2 Mo n’est pas servi dans public.

Sources primaires utiles :
- https://github.com/EmulatorJS/EmulatorJS
- https://github.com/brunovalads/yoshisisland-disassembly (USA : comparer les adresses avec EU)
- https://github.com/Yoshifanatic1/Donkey-Kong-Country-1-Disassembly
- https://www.nintendo.co.jp/clvs/manuals/common/pdf/CLV-P-SADJE.pdf (Patient : A puis A ; langue Y + Bas pour fabriquer)
- https://vite.dev/guide/static-deploy.html#netlify
- https://webassembly.org/docs/use-cases/

## Validation et limites connues

40 tests unitaires passent sur 7 fichiers ; build TypeScript/Vite réussi. Ils couvrent protection des sondes/restauration, dessin réversible, collisions de roulade et exclusions, Baby Mario, migration sans tonneaux, densité des caisses, sérialisation, animations, instructions Europe et conflits/impulsions des commandes.

Observations en navigateur : jeu SNES original, audio AL running, Baby Mario visible dans sa bulle, roulade DK/Diddy tuant des Shy Guys, sprites originaux et monte Yoshi/Enguarde. L’utilisateur a atteint le 1-2 pendant les essais. Après correction : fabrication native par C puis Bas observée (stock 0→1), réticule natif de visée avec V, tir au clic ramenant le bouton de Tirer au stock, cycles Enguarde→Yoshi→À pied→Yoshi avec clavier actif et diagnostic paused=false/audio=running, Yoshi conservé après une blessure, fermeture des vrais messages Europe. Capture `outputs/oeuf-visee.png`.

Audit DOM des vrais viewports iframe **375×812, 812×375, 320×568** : aucun débordement horizontal/vertical, toutes les commandes de jeu et le select dans le viewport, taille minimale 44 px. Ce n’est pas une validation de Safari/Android réel ni un audit complet lecteur d’écran.

La campagne originale est accessible mais **les 48 stages, extras et boss n’ont pas tous été parcourus**. Ne pas promettre zéro lag : premier chargement et compilation Wasm nécessaires. Pas de mesure FPS/latence sur téléphone physique. L’overlay peut passer devant un décor qui devrait le masquer. Les animaux héritent de la physique Yoshi ; Winky saute plus haut, Squawks vole pendant l’impulsion et Rambi accélère en roulade. Expresso/Enguarde n’ont pas encore toutes leurs règles DKC distinctives (vol/eau), ni leurs interactions uniques.

## Priorités de reprise

1. Vérifier explicitement un mur destructible après le tir déjà validé au clic, puis et verrouillage de visée L/R sur plusieurs niveaux ; vérifier œufs spéciaux, boss, transformations et contrôle en eau. Ne jamais remplacer les œufs natifs par des projectiles canvas qui ne cassent rien dans la ROM.
2. Vérifier plusieurs cycles À pied→Yoshi→Enguarde→Yoshi, choc avec Baby Mario, pause et retour au jeu, en mobile réel et clavier. Conserver la monture après choc. Le simple changement de select ne doit pas suspendre le moteur.
3. Étendre la recette de campagne et la liste de cibles de roulade seulement sur preuve, protéger décors/boss. Placement de caisses à vérifier dans les niveaux verticaux/eau/scènes scriptées ; elles ne doivent pas obstruer la progression.
4. Ajouter export/import de sauvegarde et retour visuel fiable du bouton Enregistrer. Le save actuel console.warn en cas d’échec ; ne pas annoncer une réussite sans résultat. Tester reload en milieu de niveau/monde et migrations de versions de core.
5. Améliorer occlusion native (priorités/layers), ancrage des poses de monte et états particuliers (langue, accroupi, nage, transport, transformations). Les sprites originaux sont plus grands que Yoshi et peuvent cacher des détails.
6. Mesurer démarrage/FPS/audio/consommation sur iPhone Safari et Android Chrome. Une réécriture Rust du petit pont n’est pas justifiée par des mesures : l’émulateur lourd est déjà du code natif compilé en Wasm. Optimiser sur profil avant de changer le langage.
7. Tester sauvegarde privée/Safari, agrandissement des textes, navigation Tab et boutons en VoiceOver, fullscreen iOS et rotation en cours de jeu.
8. Déployer sur le compte Netlify choisi par l’utilisateur, puis vérifier moteur, chargement local et en-têtes. Config statique prête, aucune ROM dans dist ; **aucun déploiement distant effectué pour l’instant**.

## Livraison

Le répertoire utilisateur `web` reçoit la source et le build testés. Le rapport est aussi copié dans le dossier `outputs/` de ce chat pour un lien de téléchargement. Le serveur 5173 reste volontairement l’ancienne version tant que l’utilisateur y joue ; le 5174 permet de tester les corrections sans recharger sa partie. Les bases IndexedDB ne sont jamais effacées. Une copie locale finale de la sauvegarde utilisateur a été effectuée via `transfer.html` et validée : reprise au monde 1 niveau 2, Diddy sur Expresso, puis pause immédiate. Le nouvel onglet 5174 est le livrable prêt à reprendre. Le helper source est dans la copie gelée sous `node_modules/.cache/kong-transfer.html`, chemin ignoré par le watcher : aucun rechargement de la partie d’origine. Messages limités aux deux origines localhost et à la fenêtre iframe attendue ; les anciens états de test de la cible sont conservés sous des clés before-transfer.
