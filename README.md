# Donkey Kong / Diddy dans Yoshi’s Island — prototype du niveau 1-1

Prototype local pour macOS Apple Silicon, fondé sur **MesenCE 2.2.1**.

## Jouer

Double-cliquer sur **Donkey Kong.command** ou **Diddy Kong.command** dans ce dossier.
Le chargement des deux jeux prend quelques secondes. Une seule fenêtre de jeu apparaît.

- Flèches : déplacement ; Z ou Espace : saut.
- X ou Maj : course/roulade visuelle côté DKC.
- Entrée : pause ; Échap : quitter.
- Une manette reconnue par SDL2 est également prise en charge : croix/stick, bouton A pour sauter, X pour la course.

Autre lancement depuis Terminal :

```sh
cd /Users/sevenone./Documents/git/mario-donkey
.venv/bin/python run.py --character dk
.venv/bin/python run.py --character diddy
```

Prérequis constatés sur ce Mac : Python 3.9, Pillow 10.0.1 et SDL2 2.32.72.
MesenCE est fourni localement dans `vendor/Mesen.app` ; aucune installation dans Applications n’est nécessaire.
Les lanceurs utilisent `.venv/bin/python` pour éviter le Python système de macOS, qui ne contient pas Pillow. Cet environnement local utilise le Python 3.9.9 déjà installé et ses paquets existants.

## Ce qui fonctionne

Deux processus Mesen exécutent les ROMs originales. Le jeu hôte charge directement **1-1: Make Eggs, Throw Eggs**. Le jeu donneur exécute **Jungle Hijinxs**, avec Donkey Kong ou Diddy sélectionné lors du chargement du niveau.

La passerelle pilote les entrées et l’avancement des images, lit les coordonnées/caméras et les graphismes SNES, décode les sprites 4 bits par pixel avec leur palette et leur transparence, masque Yoshi et Baby Mario dans le rendu, puis place le personnage DKC dans la scène. La cadence PAL/NTSC est gérée par une horloge rationnelle. Une fenêtre SDL2 affiche le résultat.

Chaque lancement utilise une session privée dans `runtime/` avec des sauvegardes neuves et des réglages locaux. Les fichiers `.sfc` ne sont pas modifiés. Les exécutables sont partagés par liens physiques lorsque le système de fichiers le permet ; les sauvegardes et configurations restent propres à chaque processus.

## Limites de cette première version

**Les mouvements, collisions, ennemis et règles de jeu restent ceux de Yoshi’s Island.** Le moteur DKC fournit les vrais sprites et leur animation en direct. Le donneur est maintenu dans une zone de référence ; son monde ne reçoit pas encore les collisions de Yoshi’s Island. Ce prototype ne transfère donc pas la physique originale de Donkey Kong, sa roulade offensive ou les capacités propres à Diddy.

Le personnage est composé par-dessus l’image : les priorités complexes de décor ne sont pas encore reproduites. Les écrans de transition et de mort peuvent conserver les personnages du jeu hôte. Le mode sans fenêtre de Mesen utilisé pour piloter les ROMs ne fournit pas de son à cette fenêtre. La fluidité dépend du coût des captures et du Mac ; la cible est la cadence PAL, sans garantie de temps réel.

Seul le niveau 1-1 est ciblé. La marche, le saut, le retour au sol et le défilement du début du niveau sont vérifiés ; le parcours complet jusqu’au but n’a pas été validé automatiquement. L’affichage de DK et Diddy a aussi été inspecté sur des captures réelles. L’entrée clavier/manette possède un branchement SDL2, mais tous les modèles de manettes n’ont pas été testés.

## Tests

Tests unitaires seuls (sans lancement des ROMs) :

```sh
.venv/bin/python -m unittest discover -s tests -v
```

Tests unitaires + intégration sur les deux ROMs :

```sh
KONG_RUNTIME_TESTS=1 .venv/bin/python -m unittest discover -s tests -v
```

13 tests unitaires couvrent conversions avec défilement et coordonnées négatives, horloge PAL/NTSC sans dérive cumulative, traduction des commandes, rejet d’une capture tronquée, décodage SNES, palettes, transparence et retournements. Deux tests d’intégration vérifient le chargement du 1-1, la marche, le saut, l’atterrissage et l’initialisation des graphismes de Diddy. Les captures produites se trouvent dans `runtime/evidence/`.

## ROMs prises en charge

Les profils sont liés à ces fichiers précis, vérifiés par SHA-256. Les autres révisions sont refusées pour éviter d’utiliser des adresses incorrectes.

| Rôle | ROM | SHA-256 |
|---|---|---|
| Hôte | Super Mario World 2 - Yoshi’s Island (Europe) (En,Fr,De) | `91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90` |
| Donneur | Donkey Kong Country (USA) (Rev 2) | `628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527` |

## Sources techniques

- [MesenCE 2.2.1, version officielle](https://github.com/nesdev-org/MesenCE/releases/tag/2.2.1), sous GPLv3. Copie de la licence dans `vendor/MESEN-LICENSE`.
- [Sources MesenCE](https://github.com/nesdev-org/MesenCE/tree/2.2.1), en particulier `UI/Debugger/Documentation/LuaDocumentation.json` et `Core/Debugger/LuaApi.cpp`.
- [Désassemblage de Yoshi’s Island par brunovalads](https://github.com/brunovalads/yoshisisland-disassembly) : variables SRAM/WRAM et dessin du joueur. Les numéros de modes EU ont été vérifiés dans la table de la ROM fournie ; ceux de la version USA diffèrent.
- [Désassemblage DKC1 par Yoshifanatic1](https://github.com/Yoshifanatic1/Donkey-Kong-Country-1-Disassembly) : tables de personnages, coordonnées et palettes. Les adresses utilisées ont été vérifiées par exécution sur la révision fournie.

Le ZIP officiel MesenCE Apple Silicon téléchargé a été contrôlé avec l’empreinte publiée : `9c230cc25ad0bae79fed810c9eeb21c1c507b96b1ce795bbd22ca4331ffb6e48`.
