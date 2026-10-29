# DKC underwater Yoshi and Enguarde

Yoshi's air flutter intentionally excludes native swimmer state2B. Added water
control is separate: native mode32=3 plus normal swimmer/mounted water states
2B/30/4C/4D; hurt, dismount, death, maps, land and vehicles are excluded.
Selected Yoshi/Enguarde on a native swimmer rise while Jump/Up is held, dive on
Down, and maintain the released depth with bounded vertical-speed correction.
BF97C1's gravity is70; a bounded depth feedback corrects browser/native frame
cadence drift. Position, tile collision and player/animal states are untouched.
Native mounted Enguarde retains its original four-way speed; Jump adds Up.

Native mounts take priority over selected skins. Enguarde's nose automatically
requests native projectile damage20 for Chomps53, ChompsJr54, Bitesize55 and
Squidge56 ahead. Roll/X becomes Stab, extending reach and playing the extracted
stab animation and sound. No forced horizontal roll underwater. Native
BFC6CD accepts20 (or1) and owns the death sound/animation/resource cleanup;
IDs and states are never deleted. Tail/back contacts and Croctopus/Clambo/
Mincer/other scenery are not made vulnerable, and existing damage is not erased.
The native enemy must still be in a valid living state with no pending hit.

The temporary DEV Coral Capers loader option used for acceptance was removed
before release. Tests cover both player slots, water/land/hurt exclusions,
velocity-only writes, stable depth correction, all four fish types, mirrored
nose, range/vertical/back exclusions, native mounted speed and real game input
wiring. Private browser acceptance loaded original Coral Capers (entranceBF,
mode3, player state2B): Yoshi rose from y10667 to10594 and the final depth hold
remained y10612 across672 native frames. Selected Enguarde killed a native
Bitesize (kills0→1), with Enguarde-attack sound played and unchanged player
state2B. No user save or active user tab was used. This is not a physical
mobile-device test or a full underwater campaign playthrough.
