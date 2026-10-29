# Kong × Yoshi — version web

Yoshi’s Island Europe tourne dans un seul émulateur Snes9x WebAssembly, avec une interface TypeScript/Vite et les sprites originaux de Donkey Kong Country. Le jeu conserve sa campagne, ses collisions, ses ennemis, Baby Mario, ses musiques et ses effets. Aucun émulateur n’a été créé de zéro. La ROM DKC n’est pas exécutée dans le navigateur.

## Démarrer

```sh
cd /Users/sevenone./Documents/git/mario-donkey/web
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:5173/, importer sa ROM Europe (En,Fr,De), puis « Jouer / continuer ». Le bouton de ROM de ce Mac est réservé au développement. Un chemin différent peut être fourni par `YOSHI_ROM_PATH`. La ROM reste sur l’appareil, en IndexedDB, et le fichier original reste intact.

Révision acceptée : SHA-256 `91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90`.

## Jouer

- Toucher une flèche démarre le déplacement ; retoucher ou STOP l’arrête. Mode classique disponible dans les options.
- Clavier : flèches, Espace pour sauter/planer, X pour rouler, C pour la langue, V pour viser/tirer, Échap pour pause. Tab puis Entrée/Espace active les boutons.
- **Murs cassables sans œufs** : utiliser la roulade de DK/Diddy (X), ou avancer avec un animal monté. Les blocs attaquables devant le corps sont retirés avec leurs collisions et leur affichage ; le sol et le terrain ordinaire restent protégés.
- **Œufs** : Langue sur un ennemi comestible, puis Bas pour l’avaler. Le stock s’affiche. Un appui sur Œuf/V vise, le suivant tire. Le mode natif « Patient » est imposé pour jouer sans maintien. Bas annule la visée. Les vrais œufs du jeu interagissent avec ses murs et objets.
- Donkey et Diddy sont disponibles sans tonneau DK. Le sélecteur choisit À pied, Yoshi ou les animaux libérés. Des caisses animales restent placées raisonnablement sur des sols réellement parcourus.
- Un choc conserve la monture sélectionnée et libère Baby Mario selon les règles natives.
- « Passer » ferme les instructions ; l’option automatique les passe pendant le jeu. Les menus natifs se pilotent aussi avec Sauter (B), Haut/Bas et les touches SNES dans les options.
- Le changement de monture libère les entrées sans mettre en pause. Le changement d’onglet met en pause ; Reprendre relance la partie.

Interface plein viewport, portrait/paysage et bouton plein écran quand le navigateur le permet. Cibles tactiles ≥44 px vérifiées en 375×812, 812×375 et 320×568. Les tests sur de vrais téléphones restent à réaliser.

## Vérifier et déployer

```sh
npm test
npm run build
npm run preview
```

47 tests du pont passent. `/?debug=1` active les aides locales ; `/responsive.html` mesure les formats mobiles. Ces aides ne font pas partie du build de production.

Netlify : base `web`, commande `npm ci && npm run build`, dossier publié `dist` relatif à cette base ; Node 22. Pour un dépôt ne contenant que ce dossier, laisser la base vide. `netlify.toml` fournit les réglages. Le résultat est statique : aucun serveur TypeScript n’est requis en production et aucune ROM n’est incluse. Le site n’est pas encore publié sur un compte Netlify.

La campagne originale n’est pas restreinte au 1-1 ; tous les niveaux/bosses n’ont pas été testés manuellement. Les animaux héritent des pouvoirs et de la physique de Yoshi, avec quelques capacités additionnelles ; ils ne reproduisent pas intégralement le moteur DKC. Lire [le relais Gemini](docs/GEMINI_HANDOFF.md) pour les preuves et travaux restants.

### DKC guardians at stage exits

Each main/Extra stage cycles through the seven DKC1 guardians. Fortresses and castles keep their original boss first. During the added fight, tap **Throw · ∞** (or **V**) to fire an assisted-aim egg; eggs damage the guardian without consuming native inventory. Recover Baby Mario normally if hit. After victory, jump through the nearby exit ring to let the original game handle its score and progression. Encounter progress is included in the local campaign save. Boss movement is adapted in TypeScript with original DKC sprites; one SNES core runs Yoshi’s Island.

### Two worlds: Yoshi’s Island ↔ Donkey Goonk

The green pipe on either world map switches games. Press **Play / continue** after switching to enable mobile audio. Each game keeps its own full local save; the selected Violet, Pink, Donkey or Diddy avatar follows you. Only one SNES game runs in the page. DKC starts directly on its native Kongo Jungle map and retains the original campaign and progression.

In DKC, **Tongue / C** swallows a nearby ordinary enemy and creates an egg (six maximum). **Eggs / V** throws toward a nearby target; an actual projectile collision requests the enemy’s original DKC death. Classic hazards and bosses keep their native rules. Jump and Roll keep the native Kong controls. DKC uses the active native Kong’s physics with your selected avatar; Yoshi-side mounts stay in the Yoshi-side party, while DKC keeps its original animal buddies.

The game saves on pause, about every 20 seconds, and before changing worlds. **Leave stage · World map** restarts the current DKC attempt from its last map checkpoint. Reloading normally resumes the current saved scene. Saves depend on this browser/device’s local storage.
