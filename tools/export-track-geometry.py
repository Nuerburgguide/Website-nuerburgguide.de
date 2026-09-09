"""Read only the two supplied Dart sources; export and verify every coordinate."""
import json
import re
import sys
from decimal import Decimal
from pathlib import Path

source = Path(sys.argv[1])
points_text = (source / 'nordschleife_sector_points.dart').read_text()
names_text = (source / 'nordschleife_sectors.dart').read_text()
names = {int(i): n for i, n in re.findall(r"Sector\(id:\s*(\d+),\s*name:\s*'([^']+)'", names_text)}
blocks = re.findall(r'(\d+):\s*const\s*\[(.*?)\]', points_text, re.S)
paths = {int(i): re.findall(r'LatLng\(\s*([\d.]+),\s*([\d.]+)\s*\)', b) for i, b in blocks}
counts = [12,11,21,5,5,9,5,8,11,11,14,8,8,4,6,8,14,14,12,10,6,8,7,9,6,9,6,10,6,7,12,9]
assert list(paths) == list(names) == list(range(1,33))
assert [len(p) for p in paths.values()] == counts
assert sum(counts) == 291
for i in range(1,33):
    assert paths[i][-1] == paths[i % 32 + 1][0]
# Keep numeric literals verbatim, including all decimal places.
rows = []
for i, path in paths.items():
    coordinates = ',\n'.join('      {"lat": '+lat+', "lng": '+lng+'}' for lat, lng in path)
    rows.append('  {"id": '+str(i)+', "name": '+json.dumps(names[i], ensure_ascii=False)+', "path": [\n'+coordinates+'\n  ]}')
payload = '[\n'+',\n'.join(rows)+'\n]'
exported = json.loads(payload, parse_float=Decimal)
for sector in exported:
    assert [(p['lat'], p['lng']) for p in sector['path']] == [(Decimal(a), Decimal(b)) for a,b in paths[sector['id']]]
latitudes = [p['lat'] for s in exported for p in s['path']]
longitudes = [p['lng'] for s in exported for p in s['path']]
assert [min(latitudes), min(longitudes), max(latitudes), max(longitudes)] == list(map(Decimal, ['50.33734','6.92003','50.38090','7.00558']))
out = Path(__file__).resolve().parents[1] / 'assets/trackstatus/geometry.js'
expected = '// Lossless export from the app sources. Regenerate with tools/export-track-geometry.py.\nwindow.TRACK_GEOMETRY = '+payload+';\n'
if '--check' in sys.argv:
    assert out.read_text() == expected, 'Export differs from source'
else:
    out.write_text(expected)
print('Verified 32 names/IDs, 291 coordinate pairs, all shared boundaries and bounds.')
