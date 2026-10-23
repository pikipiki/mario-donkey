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
