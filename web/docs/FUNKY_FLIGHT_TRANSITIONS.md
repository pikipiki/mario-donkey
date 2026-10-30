# Funky flight transitions

## Report and evidence

The reported iPhone failure is a black screen after flying with Funky to the first world. The interface incorrectly labelled Funky's visits and travel as the game-selection menu. The exact phone failure was not reproduced on desktop: both the original normal route and the corrected route completed successfully. A direct developer warp into Funky's interior was invalid and is not evidence of the reported bug; that temporary shortcut was removed.

Native disassembly confirms B boards the plane and RAM 0x057D bit 0x0100 marks flight; island entrance 236 leads to Kongo Jungle entrance 22. No new ROM patch is used.

## Changes

- Separate stages, maps, visits, flight, fades and actual intro/Game Over menus. Visits use B confirmation; Start/A are reserved for actual menus.
- Release native controls throughout fades, including a held confirmation.
- Restrict stage exit guards to real stage entrances, while preserving protection when a stage hero is temporarily absent.
- Capture a map checkpoint when it becomes fully visible, rather than when its actor first appears during the fade.
- After a witnessed flight targeting Kongo Jungle, recover a fully black transition only after 480 advancing native frames. Pauses and background time do not count. Other island destinations and normal gameplay do not trigger this recovery.
- Rebuild from the last validated checkpoint when the live black transition has completely cleared the campaign RAM. Otherwise keep live progress. Existing independent pre-repair backup and clean native map reconstruction remain in place.
- Use English Confirm/flight labels and expose bounded transit diagnostics only in debug mode.

## Validation

866 tests across 77 files pass. TypeScript and both root/Pages builds pass. Added regression coverage for confirmation routing, held input during fades, bounded recovery, pause/frame rollback, other destinations, missing-hero stage guards, stable-map checkpoint capture and cleared-RAM checkpoint fallback.

A private browser test followed the real Kongo Jungle map route through Funky's Flights, boarded the plane and confirmed Kongo Jungle with a 900 ms press. It returned to visible entrance 22 with brightness 15. The legacy core and disabled WebGL2 settings used by iOS were enabled on desktop; this is not a physical iPhone test. Evidence: outputs/funky-kongo-legacy.jpg.

## Remaining verification

Test a physical iPhone/Android flight using the affected saved campaign, including switching apps during travel. Verify all other island destinations. The exact original failure remains unconfirmed; the fallback only addresses a fully black, advancing Kongo transition after a witnessed flight. For an already stuck old session, use Options > Rebuild map / Repair display after updating; normal campaign progress is preserved and backed up.
