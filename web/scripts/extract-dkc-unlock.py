#!/usr/bin/env python3
"""Extract the verified USA Rev2 canonical entrance and native map route tables."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
rom=(root/'public/rom/dkc-usa-rev2.sfc').read_bytes()
assert hashlib.sha256(rom).hexdigest()=='628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527','Unsupported DKC ROM revision'
a,b=3979978,3709318
out={'canonical':list(rom[a:a+256]),'canonicalOffset':a,'connections':list(rom[b:b+178]),'connectionsOffset':b,'romSha256':hashlib.sha256(rom).hexdigest()}
assert out['connections'][-1]==0
(root/'src/generated/dkc-unlock.json').write_text(json.dumps(out,indent=2)+'\n')
