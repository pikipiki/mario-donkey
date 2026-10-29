# Stage-based crossover boss rotation

Each campaign stage has a stable ordinal. Boss ordinal modulo seven selects the
crossover boss: 1,2,3,4,5,6,7,1,2… Never a repeat inside seven consecutive stages.
Replays/checkpoints keep the same boss; no save counter or randomness can skip,
duplicate or reset the sequence when a stage is retried.

Yoshi main stages use world*8+level, not the raw SNES world*12+level slot. The
48 main levels therefore rotate continuously across world boundaries. The six
extra levels are assigned ordinals48..53 after the main campaign; bonus menu
slots9..11 are excluded. Order: Very Gnawty, Master Necky, Queen B, Really
Gnawty, Dumb Drum, Master Necky Snr, King K Rool. World1 stage8 wraps to Very
Gnawty; world2 stage1 continues with Master Necky.

DKC has40 campaign entries in DKC_STAGE_ORDER, including its six regional boss
arenas and Gangplank Galleon. Every entrance/checkpoint/bonus is resolved to its
parent stage through the existing native stage names (normalized apostrophes,
spacing and Mine Cart/Minecart spelling). Maps, service huts, unused rooms and
animal token rooms have no ordinal. Order: Burt, Salvo, Bigger Boo, Milde,
Froggy, Raphael, Tap-Tap. The first five Jungle stages get bosses1..5, the native
Very Gnawty arena gets Raphael after its native boss, and Winky gets Tap-Tap.
The original boss always remains first in boss arenas/castles.

Older unfinished encounters are reassigned on save restore without healing HP.
Old attack shots/injury animation offsets are discarded when the boss changes;
world positions/floor remain retained. Dying, exit and released phases preserve
the original ID, so existing death/victory sequences do not switch bank halfway
or replay a completed stage.

Validation:715 tests in65 files. Tests cover every main level, every DKC native
exit/post-boss boundary, seven-entry windows and campaign boundaries, checkpoint
and bonus aliases, invalid rooms, and migration of old unfinished/dead saves.
This is automated mapping/encounter validation, not40/48 complete playthroughs.
