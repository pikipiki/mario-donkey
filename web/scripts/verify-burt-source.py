#!/usr/bin/env python3
"""Read-only exact EU ROM corroboration for imported Burt's motion constants.
The available bank06 disassembly labels differ from this EU ROM by +$17 in
this routine. This verifies bytes, not execution of the full SuperFX boss AI.
No ROM bytes are changed or exported.
"""
import hashlib
import json
from pathlib import Path
rom = Path(__file__).resolve().parents[1] / 'public/rom/yoshi-eu.sfc'
data = rom.read_bytes()
assert hashlib.sha256(data).hexdigest() == '91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90'
guards = {
    # Source0697BA: wildcard2_lo0A; source06A15C: decrement twice then BMI defeat.
    'six-hit initial index': (0x317d1, 'a9 0a 9d 02 79 a9 01 9d 03 79'),
    'six-hit decrement and defeat': (0x32173, 'de 02 79 de 02 79 30 10'),
    'jump velocities source0699A0': (0x319b7, '00 fa 40 fa 80 fa c0 fa 00 fb 40 fb 00 f6 80 f6 00 f7 80 f7 00 f8 80 f8'),
    'horizontal velocities source069DCC': (0x31de3, 'c0 fe 40 01 f0 fe 10 01 40 ff c0 00 58 ff a8 00 70 ff 90 00 80 ff 80 00'),
    'fight acceleration and terminal speed source069D00': (0x31d17, 'a9 20 00 9d 42 75 a9 00 03 9d e2 75'),
}
for label, (offset, hexadecimal) in guards.items():
    expected = bytes.fromhex(hexadecimal)
    assert data[offset:offset+len(expected)] == expected, label
print(json.dumps({'romSha256': hashlib.sha256(data).hexdigest(), 'checks': {name: hex(offset) for name, (offset, _) in guards.items()}, 'limit': 'Static exact-ROM corroboration; state timing, collision box and arena geometry are port adaptations, not an executed native SuperFX state machine.'}, indent=2))
