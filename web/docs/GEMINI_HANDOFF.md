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
