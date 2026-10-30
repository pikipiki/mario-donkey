# English interface, menu audio and ordinary-enemy defeat

## Changes

All custom interface text is English: pause/resume dialog, duo selection, cheat labels/hints, status/error messages, accessibility names, legacy transfer recovery messages and desktop keyboard hints (SPACE/ESC). EmulatorJS is explicitly English with automatic browser-language selection disabled. Existing ROMs and their language/save choices are not rewritten.

The sound action now resumes playback even if the menu was opened while already paused. It closes settings, updates the pause UI and restarts the native loop before unlocking audio and restoring mixer volume. A running AudioContext alone no longer produces a misleading success while the app still holds mixer volume at zero.

DkcDefeat observes the native final-hero death for ordinary enemies as well as crossover bosses. It still rejects partner takeovers and victory state11. Only a crossover boss may require restoration of native death music that the mod previously stopped; ordinary enemy deaths retain their original audio dispatch.

During a final-hero death the mod clears held inputs, pauses guardian attacks and stops egg/mount combat updates. The native emulator keeps running: no forced map load, completion flag, life rewrite or invented victory. The replacement avatar fades out over30 native frames and the custom actor/HUD overlay clears, preventing a stationary plush from remaining over a black transition. The map announces defeat and retry. No user save was reset.

## Verification

840 tests in74 files passed; TypeScript and Vite production builds passed. Regressions cover five native death states outside a boss battle, no RAM/progression rewrites, no attacks/held input during death, disappearance of the avatar overlay and audio recovery while paused with a context already reporting running. Existing barrel/water rendering fixtures now explicitly use visible native brightness15.

Private REA Chrome replay at390×844 with fr-FR browser locale: English pause dialog, Resume, menu sound closes settings, paused=false and AudioContext=running, zero observed JS errors (ev_ad39ff029aad56070d5d407a059f5998fac268e2c6525ec10103623fcfba80ae). This does not prove audible output on a physical iPhone.

The reported rock-throwing enemy, precise stage and user save were not available. DKC is inferred from the description. A DEV-only fixture requests native injury of the last hero in a disposable test profile; it must not be presented as reproducing that exact enemy/save. Further native defeat replay evidence is recorded in the work outputs. No personal IndexedDB was accessed.
