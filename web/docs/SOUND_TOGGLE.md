# Persistent sound on/off control

The toolbar and settings sound buttons now toggle one shared preference. The icon, English action label and aria-pressed state reflect that preference. Muting keeps the game running; unmuting from a paused menu resumes playback, retaining the previous audio recovery fix. A failed unmute restores the off state so the next tap can retry. Late promises cannot overwrite an intervening mute.

`kong-sound-enabled-v1` stores the preference outside campaign/cheat saves. Missing or unavailable storage defaults to sound on and in-memory toggling still works. Both worlds read the same preference after reload or pipe navigation.

One gain gate per AudioContext covers existing and future native OpenAL voices, boss music/effects, animal effects, Yoshi egg/tongue effects and the pipe sound. Native context mixers are rerouted once; native setVolume and every unlock/resume also respect mute. Muting never suspends the shared AudioContext or stops the SNES loop. The iOS unlock gesture is skipped while muted. Audio assets and ROM data are unchanged.

847 tests in75 files pass; TypeScript and production builds pass. New regressions cover already-playing boss music, existing/new effect outputs, native mixer routing, both game classes staying muted after resume/unlock, reloading the preference and denied local storage. No physical iPhone/Android audio-output test was performed for this change. The REA browser provider was left unavailable by cleanup_incomplete during the preceding task, so no new browser replay is claimed.
