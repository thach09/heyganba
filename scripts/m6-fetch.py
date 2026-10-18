from pathlib import Path
import json, urllib.request, zipfile, io, re
p=Path('backups/m6-source');p.mkdir(parents=True,exist_ok=True)
for level in range(1,7):
    dest=p/f'hsk{level}.json'
    if not dest.exists():
        dest.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/wordlists/exclusive/old/{level}.json').read())
if not (p/'Unihan_Readings.txt').exists():
    data=urllib.request.urlopen('https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip').read()
    z=zipfile.ZipFile(io.BytesIO(data))
    for f in ['Unihan_Readings.txt','Unihan_IRGSources.txt']:(p/f).write_bytes(z.read(f))
existing='\n'.join(f.read_text(encoding='utf-8') for f in Path('backend/src/main/resources/db').rglob('*.sql'))
words=json.loads((p/'hsk2.json').read_text(encoding='utf-8'))
missing=[w['simplified'] for w in words if not re.search("\\('"+re.escape(w['simplified'])+"',",existing)]
print('HSK2 missing',len(missing), ' '.join(missing))
