# DKC — one tap picks up and holds, the next tap throws

The old Roll action held native Y for580ms and then released it. In original
DKC, releasing Y throws the carried object, so a short mobile tap caused an
unwanted throw after pickup.

`DkcBarrelControl` now holds only the original Y input while an actual barrel
is carried. A second distinct tap releases Y until native throw completion.
The old action pulse is consumed so it cannot immediately roll or pick up again.
No barrel/player positions, ownership, states, animation, damage or ROM bytes
are rewritten. Carry detection validates the native16F5+(Kong slot-2) link,
1375+barrel backlink, grabbed state1 and native barrel IDs22/23/24/26/27.
Reference: native source BFBE5F pickup, BFCE9E grabbed state, BFBC06 release.

The same Roll / Pick up button (keyboard X, accessible click, touch and explicit
SNES Y control) handles both actions. Its label changes to Throw while carrying.
A second tap within the original580ms window is accepted without extending an
ordinary roll. While carrying/releasing, forced roll movement, roll appearance
and roll damage are suppressed; the stick still moves normally. Down is omitted
from the native release frame so the requested second tap throws rather than
placing TNT down. Normal movement/jump/egg mechanics are retained.

Stop/pause/tag retain the native Y latch or a pending release, instead of dropping
the object. Loading a saved native state restores the input immediately after
loadState, before awaiting native frames, to avoid a release during startup.
Native damage, loss of carrier, room/map changes and invalid/stale ownership
clear the latch. This is input adaptation over the original game engine.

Validation:701tests/63files and production build, including all five native
barrel types, quick second tap, either Kong slot, pause/re-adoption, stale/foreign
links, native damage, explicit SNES Y, and DkcGame simulated-input integration.
Native carry/throw animations are still executed by DKC. No claim of a physical
mobile or interactive emulator playthrough for this change.
