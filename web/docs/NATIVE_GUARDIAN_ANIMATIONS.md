# Yoshi guardians in DKC — native injury and defeat sequences

29 October 2026. This supersedes the earlier note claiming the imported bosses
had full native damage/death animation: they previously reused movement poses,
looped `dead`, and released the native exit after 0.8 seconds.

## What now plays

| Guardian | Injury / lasting damage | Complete defeat duration |
| --- | --- | --- |
| Burt / Bélixo | Six original trousers levels; recoil, stretch, trousers drop and recovery; damage-tier windup/rise/fall/landing poses | 9.48 s, trousers off, red body, flight, shrink, native actor disappearance |
| Salvo | Original mass tiers and deforming body; original face retained | 12.16 s, collapse, dripping body, escaping eyes, actor disappearance |
| Bigger Boo | Original increasing size tiers and face reactions | 2.80 s, native inflation and BG3 star burst |
| Marching Milde | Original squash | 7.00 s, D2 → two D3 → four D4 → sixteen small108 → terminal pops |
| Prince Froggy | Original internal throat wobble shown in a small stomach view above the outside frog | 2.56 s, original outside mouth/ejection/restoration sequence |
| Raphael | Original squash reactions (two native damage states, reused across crossover HP tiers) | 15.62 s, spin, shrink/departure, star and constellation; original moon behind |
| Tap-Tap | Original egg knockback, reused across crossover HP tiers | 9.54 s, native sinking/rising/submerging and lava splash; original lava in front |

The donor is the exact Europe ROM SHA256
`91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90`.
Native pixels come from VRAM, OAM, CGRAM and per-line HDMA; Raphael's final
constellation uses the actual Mode7 projection and palette indices62/63.
Froggy's throat uses a 64×72 opaque native framebuffer crop excluding the
observer and HUD, because the generic stomach BG decoder omitted a fold layer.
No AI art, recolor, generated substitute boss or second runtime emulator.
Burt's whole body and facial parts are recovered even when the original donor
viewport clipped them: private independent native render fixtures and registered
upper/lower exposures reconstruct the actual native coverage. The private worker
uses guarded render-input immediates, transposes its render actor and suppresses
terrain; its world motion is discarded. It completes native graphics initialization
before replaying mature poses (intro-era DMA channels would misrender them).
Isolated PPU BG2/background coverage is
combined with exact native OBJ tiles. The original simulation snapshots remain
unchanged and authoritative for every exported trajectory/timer. The on-disk
ROM and published runtime ROM are unchanged. The coverage pass controls only the backdrop/PPU layer masks in the private
worker, with a sentinel palette value guarded absent from the artwork; it does
not key colors from a mixed game scene. Froggy's opaque native crop clears
the unused zero-alpha byte of Mesen BGRA by retaining RGB and setting coverage
to opaque; it is not a transparent body cutout.

## Runtime and saves

- `guardian-animation.ts` selects persistent tiers, timed frames, clamped
  one-shot playback, original visual-event cue times and native injury offsets.
- `dkc-guardian.ts` retains six-hit crossover combat and legacy three-hit saves.
  The complete recorded injury blocks another hit. Injury freezes the adapted
  hop controller rather than combining two unrelated movements. A native recoil
  displacement is mirrored away from the actual attack and reconciled before
  adapted motion resumes. Injury travel is relative to the original pre-hit
  snapshot, so a render-fixture transposition cannot leak into the world.
- Version1 saves gain optional `animationX`, `animationY`, `animationMirror`, `defeatFx` fields.
  The existing elapsed/death clock is restored, not restarted. Pause, native
  damage scripts and an unfinished lazy asset load do not advance that clock.
  `defeatFx` prevents repeating the event after save/reload.
- Native DKC exit and boss-banana hooks remain engaged until the last defeat
  frame. No stage-clear bit, exit/player script, score or next-room pointer is
  assigned to force a win. Original DKC boss still precedes the Yoshi guardian.
- `SpriteAtlas.prepareGuardian` loads only the encountered boss PNG/JSON and
  retains at most two banks. Every packed texture is at most4096 pixels on each
  axis, with trimmed rectangles and no smoothing; extra banks are not part of
  initial game startup. A failed fetch retries after5s. Native DKC keeps running
  while only the added guardian timeline waits for its art.
- Boo no longer receives the old1.5x magnification on already complete native
  growth. Its collision bounds follow native visible size tiers and its center
  is lifted so growth does not extend deeply under the DKC floor.

## Reproduction and evidence

Writable development copy and private donor captures:
`/Users/sevenone./Documents/Codex/2026-10-23/spiderman-in-arkham-knight-passthrough-mod/work/`.
The web directory is `web-team-boss-layout`; native outputs are in sibling
`native-boss-sequences/{burt,salvo,bigger-boo,milde,froggy,raphael,tap-tap}`.
Private `raw-*.bin`, matching PPU state dictionaries and capture logs stay there;
they are not deployment files and do not contain or read the user's SRAM.

Scripts committed with the web source:

- `capture-burt-poses.py`, `capture-burt-damage-motion.py`,
  `capture-burt-virtual-camera.py`, `export-burt-native-rgba.py`,
  `extract-burt-sequences.py`: original post-collision fields plus real donor
  movement at all six trousers levels; Burt sampled every6 EU frames.
- `capture-salvo-boo-sequences.py`: cumulative original mass/scale stages,
  collapsing Salvo, original escaping-eye OBJ and Boo native BG3 burst.
- `capture-milde-froggy-sequences.py`: original Milde split chain and descendants,
  exact native throat crop and outside Froggy mouth sequence.
- `capture-raphael-taptap-sequences.py`: original injuries, Mode7 constellation,
  moon context and lava sequence with exact canonical offsets.
- `pack-guardian-sequences.py`: deduplicated transparent crops packed into
  `public/art/guardian-sequences` plus the small source module
  `src/generated/guardian-runtime.json` (no direct public-file imports); preserves each frame's duration/translation.
  Run from the writable web copy with the bundled Python containing Pillow.

The capture scripts seed *accepted native post-collision fields*, then let
original CPU/SuperFX code execute. They are fixtures proving donor animation,
not seven successful player-controlled boss playthroughs. Every bank carries
source addresses, fixture description and relevant limitations. Milde's
recorded terminal split chain uses staged accepted hits on descendants and
brief observer-friendly positioning, explicitly logged in its provenance.

Private browser preview: `/tools/guardian-animations.html` on a separate local
origin. It has no emulator, ROM, storage writes or production entry point and
uses the exact production drawing/timing code. The DEV-only `Submit crossover
final hit` fixture in DKC diagnostics tests the real running core and guarded
exit without claiming a successful egg collision or assigning native clear flags.

## Remaining fidelity work / Gemini

This is a faithful *animation import into the DKC adaptation*, not a complete
execution of seven donor SuperFX boss AIs. The DKC world-coordinate movement,
HP abstraction and attack acceptance remain adapted. Original Raphael has two
injury states; Tap-Tap has no HP and dies via lava. The crossover intentionally
keeps the requested six-hit egg/roll/stomp/barrel damage and uses their real
reactions/defeats rather than inventing five separate damage morphs.

Froggy's complete swallowing transition and playable inside-stomach arena are
not reconstructed. His actual internal hurt is visible in an inset; his outside
body has no native damage sequence. Milde's descendants in the defeat sequence
are a native recorded cinematic, not a new interactive wave encounter. Original
fullscreen palette/window boss-clear wipes (notably Salvo/Milde) are omitted to
avoid recoloring the DKC world. The moon is a static original texture context;
original rotating moon terrain/camera and the donor's full scene are not rebuilt. Tap-Tap's lava is anchored to the fixed DKC floor even for a final airborne hit.
The complete native Raphael bank uses1x scale (rather than the old1.6x
transformation-pose enlargement); the lunar sequence is raised100px relative
to the DKC floor, with a further60px departure lift after3.14s for the final
constellation to stay in the sky. These are explicit crossover staging offsets,
not changes to the original frame artwork or injury/defeat timings.
Existing donor effect-bank cues are placed on corresponding visual events;
this is not full per-frame SPC command emulation.

Before promising pixel-for-pixel original fights, port the donor state machines,
terrain/contact rules and each special arena, then validate their complete
interactive phases against the same ROM. Remaining acceptance also includes
physical iPhone/Android audio/performance and campaign-wide play; desktop
preview, native fixture captures and unit tests do not substitute for that.

### Complete Burt render reconstruction

Use the retained original capture set and Python/Pillow runtime above. These are
one-time authoring commands, never part of game startup or Netlify builds.
Capture IDs refer to that exact set; if generating new donor simulations, first
reselect poses by native phase/hit index and validate the source hashes.

```sh
PY=/Users/sevenone./.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
$PY scripts/capture-burt-virtual-camera.py --work .. --source ../burt-full-native-4 --out ../burt-virtual-camera/matte --frames 163,182-475 --anchor-y 192 --isolate
$PY scripts/capture-burt-virtual-camera.py --work .. --source ../burt-full-native-4 --out ../burt-virtual-camera/upper/matte --frames 183,185,188,189,190,192,193,194,195,196,197,198,199,200,201,202,229,231,232,233,235,236,237,239,240,241,242,243,244,245,270,272,274,275,276,278,279,280,281,282,283,284,285,286,287,288,315,317,318,319,321,322,323,325,326,327,328,329,330,331,356,358,360,361,362,364,365,366,367,368,369,370,371,372,373,374,401,403,404,405,407,408,409,411,412,413,414,415,416,417 --anchor-y 384 --isolate
$PY scripts/capture-burt-virtual-camera.py --work .. --source ../burt-damage-motion --out ../burt-virtual-camera/motion/matte --frames 0,1,2,3,4,5,6,7,10,11,12,13,19,20,21,22,23,24,25,26,29,30,31,32,56,57,58,59,60,61,62,63,67,68,69,70,94,95,96,97,98,99,100,101,105,106,107,108,134,135,136,137,138,139,140,145,146,147,148,154,175,176,177,178,179,180,181,186,187,188,189,195 --anchor-y 192 --isolate
$PY scripts/export-burt-native-rgba.py --work .. --captures ../burt-virtual-camera
$PY scripts/extract-burt-sequences.py --work .. --out ../native-boss-sequences/burt
$PY scripts/pack-guardian-sequences.py
```

Verified reconstruction:295 injury/defeat tier poses +72 movement poses,
all complete and within their registered exposure bounds. Native tall stretch
reaches257pixels and needs an upper384 exposure registered192pixels above
primary192. Export retains upper y<16 and lower y>=16 with matching native
coordinates. It removes only entire256pixel all-black forced-blank rows from the
controlled magenta PPU pass; these cannot be part of the actor because the
backdrop remains magenta outside it. It also accounts for the15line PAL raster
border before combining native OAM. The capture script guards original ROM SHA
and both source opcodes before altering only the worker's in-memory render inputs.


### DKC platform alignment

The Jungle exit fixture exposed a real spatial mismatch: the native door origin
is16px above the hero's platform. Door guardians now use a nearby grounded hero's
actual platform height (or the door+16 fallback). An unfinished legacy guardian
still using exactly the door-origin height is calibrated once when a grounded
hero reaches it; no camera/room/terrain position is rewritten. An airborne hit
settles the grounded boss's recorded injury onto that floor over0.5s while its
native deformation/recoil continues. Boo and Raphael retain their flying/lunar
paths. This is a DKC placement adaptation, not a claimed original donor gravity
simulation; it prevents a captured ground reaction from hanging in midair.


## Final validation receipts

-690 tests in62 files and production build pass in the real repository. No
  runtime dependency, ROM-file edit or second runtime emulator was added.
-7 banks visually reviewed in the private production-renderer preview, including
  native throat hurt, complete airborne Burt head/boots, full moon/stakes and
  constellation. Screenshots are in the task outputs directory.
-367 complete native Burt source poses,1705 deduplicated packed frames overall,
 989556 total PNG bytes. Largest bank is2048×2213, loaded only at its encounter;
  at most2 banks retained. Physical iPhone/Android performance remains untested.
-Real DKC private origin5211, native Jungle exit fixture: guardian.floor465,
  old door origin449. The DEV final-hit fixture followed by Escape produced
  HP0/phase dying/phaseTime0; that time stayed fixed during pause and save. On
  resume the visible status became “Burt the Bashful defeated · Take the original
  stage exit”. No native stage-clear flag was forced. These facts are logged in
  outputs/native-guardian-dkc-before-finish.json and
  outputs/native-guardian-dkc-paused-defeat.json.
-The actual traversal into the map was not confirmed. The browser tool's
  automatic approval service became unavailable (“Selected model is at capacity”)
  while reading the final movement state. This is a tooling review failure,
  not evidence the code is unsafe or that the native exit succeeded/failed.
  Keep this manual acceptance item open; do not report a completed end-to-end
  stage transition based on the released-status message alone.
