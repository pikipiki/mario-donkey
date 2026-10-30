# DKC map display recovery and native menu confirmation

## Findings and correction

The screenshot shows a dark, scrambled scene with the World map footer. Its exact save is not available. A concrete restore race was found in source: both saved states and the fresh DKC bootstrap were loaded while the native loop could still be running. All regular DKC restore paths now wait for native pause acknowledgment, load state and input latches, then resume and wait for native frames. Map-return and repair operations also block mod updates during restoration.

Autosaves and manual saves reject title/Game Over screens and dark/fading scenes. Map/pipe actions become available only once the map is visible. The scene is checked again after the native pause acknowledgment, preventing a transition that starts during capture from replacing the last useful campaign/map checkpoint.

## Existing damaged saves

The menu now offers **Rebuild map · Repair display**. It fetches the verified clean Kongo Jungle map bootstrap, captures an independent backup under the campaign key plus `-before-display-repair`, then reconstructs the map. CPU, PPU, VRAM, sound and unrelated runtime caches come from the clean bootstrap. Existing canonical stage completion/bonus flags, animal tokens, bananas, life/display counters, valid selected file/current Kong and partner-present flag are retained. Only the first2KiB battery SRAM is carried over (the exact DKC USA Rev2 HiROM header FFD8=1); unrelated SRA scratch stays clean. Derived route edges are rebuilt from the existing verified ROM triples only when their completion gate was earned. No new completion flag is awarded, and a lost partner is not refilled.

Recovery returns to the Kongo Jungle map rather than the broken scene/current stage. Earned routes remain reachable; duo selection/inventory metadata stays in the wrapper save. Original bytes are kept separately before repair. If loading/validation fails the live state is restored and no recovered campaign is written. A successful recovery writes a fresh map/campaign checkpoint. Personal saves were not accessed remotely.

## Intro/Game Over controls

The previous defeat bridge continued clearing inputs even after the native death had reached an intro/Game Over screen. It now blocks inputs only while the dying stage actor still exists. Outside maps/gameplay, one Jump/Egg/Tongue confirmation sends native Start/A/B, and the two main buttons display **Start / Confirm**. Map confirmation remains B without Start; normal gameplay remains unchanged. Title/Game Over screens do not replace the local playable checkpoint.

## Verification

858 tests in77 files and TypeScript/Vite production builds pass. New regressions cover restoration order/failure, fade/title checkpoint rejection including a race at pause acknowledgment, snapshot reconstruction with intentionally corrupted graphics/CPU blocks, preservation of battery/progress/counters, earned-only routes, wrapped Game Over life counters, and Start input after a final-hero defeat.

An independent in-app browser tab on localhost with test IndexedDB loaded the native map correctly, ran **Rebuild map · Repair display**, displayed a clear map and the success message, and resumed controls. Screenshot: work outputs/dkc-rebuilt-map.jpg. This exercised repair on a disposable normal map, not the exact corrupted user save. Full Game Over progression, all recovered-world routes and physical iPhone rendering remain to verify. The earlier unavailable REA provider was not used for this test; computer-use browser controls were used in a new temporary tab which was then closed.
