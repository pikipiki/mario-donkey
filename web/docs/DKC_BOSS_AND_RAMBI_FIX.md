# DKC: boss interruption and invisible mounted animals

The private Jungle/Burt encounter reproduced a return to the map with HP left
when both native Kongs were lost. The added boss could hit the incoming partner
at the same position immediately after takeover. The fight now grants three
playable seconds of shared contact protection after accepting a native hit.
The deadline survives saves; native hurt pauses the fight clock. The party
blinks during this interval. This does not prevent normal death after further
hits, remove native enemies, or fabricate completion. Interrupted fights report
that the boss is still alive and the stage was not completed.

The native door hold also remains asserted during transient non-playing frames
instead of opening while the hero slot is temporarily absent. Native death
scripts are not intercepted. Eggs only change the web boss HP and cannot set
native progression or player damage flags.

Animal ownership was previously read correctly but rendered backwards:
BE8092 assigns the mounted animal animation to the Kong actor; BEBAD1 has the
body poses while BE8054 animates the linked actor as the rider. Hiding Kong
therefore also hid Rambi's body. Both body and seated replacement rider are
now drawn in the overlay, including Mario+Yoshi on native mounts. The native
render-only guard skips linked rider actors (IDs9..12) only with matching
1375 backlink 2/4 and 0512/0514 ownership; loose animals remain original.
The guard resides in verified zero ROM padding at BB:FE00, outside existing
patch mailboxes and without crossing the bank boundary. It preserves X/Y and
reloads the actor ID on return. No animal collision, speed, ID or ownership
is rewritten.

Regression tests execute the emitted render guard branches, including mounted
and loose animals for both Kong slots, verify party rendering for all five
heroes/four native animals, shared hurt grace and restoration, repeated hits,
and actual DkcGame exit hold across a missing player frame. A private browser
fixture is used for native graphics checks; user tabs/saves are untouched.

Private browser check: original Jungle animal crate was opened by native fall
collision, Rambi actor12/id9/state1 mounted by Kong slot2/state14. Bobope
was visible seated over one Rambi body, also after directional motion and jump.
The temporary crate-travel fixture was removed from app.ts before release.
Physical iPhone/Android not tested in this session.

Validation: 708 tests / 64 files and production build passed.
