"""Refresh the pinned, locally hosted handwriting assets. Run from repository root.
No database access. Character coverage is explicit in hanzi-characters.txt.
"""
from pathlib import Path
import base64,hashlib,io,json,tarfile,urllib.request

PACKAGES={
 'hanzi-writer':('3.5.0','ItQ0xJ4AQ1jxH/vDlaNpIjuFxQac+LDg5UdhiNJkl0UC8cuZLyamI3Y6Yxm3j0hFmsBnBpUUu7RhIzcPG6AABA=='),
 'hanzi-writer-data':('2.0.1','nbQwM+MaryGoq7pBMIZLCd3lFq03nXuJuwku1+6UbjL58uU+9OULVcMkoNvNuJSoIV7f1bbPRfD4D/LQa5S7qg=='),
}
root=Path(__file__).resolve().parents[1]
vendor=root/'frontend/public/vendor'; vendor.mkdir(parents=True,exist_ok=True)
data_dir=root/'frontend/public/hanzi-data';data_dir.mkdir(parents=True,exist_ok=True)
characters=[c.strip() for c in (root/'scripts/hanzi-characters.txt').read_text(encoding='utf-8-sig').splitlines() if c.strip()]
assert len(set(characters))==len(characters) and all(len(c)==1 and '\u3400'<=c<='\u9fff' for c in characters)
manifest={}
for package,(version,integrity) in PACKAGES.items():
 url=f'https://registry.npmjs.org/{package}/-/{package}-{version}.tgz'
 data=urllib.request.urlopen(url,timeout=60).read()
 assert base64.b64encode(hashlib.sha512(data).digest()).decode()==integrity,package+' integrity mismatch'
 archive=tarfile.open(fileobj=io.BytesIO(data))
 def copy(member,target):
  content=archive.extractfile(member).read()
  if target.suffix=='.js':
   # Do not publish a dangling production source-map directive.
   content=content.replace(b'//# sourceMappingURL=hanzi-writer.min.js.map',b'')
  target.write_bytes(content)
  manifest[str(target.relative_to(root/'frontend/public'))]=hashlib.sha256(content).hexdigest()
 if package=='hanzi-writer':
  copy('package/dist/hanzi-writer.min.js',vendor/'hanzi-writer-3.5.0.min.js')
  copy('package/LICENSE',vendor/'hanzi-writer-LICENSE.txt')
  copy('package/COPYING.md',vendor/'hanzi-writer-COPYING.md')
 else:
  for char in characters: copy('package/'+char+'.json',data_dir/(char+'.json'))
  for member in archive.getnames():
   if 'ARPHICPL' in member.upper(): copy(member,data_dir/Path(member).name)
  copy('package/README.md',data_dir/'UPSTREAM-README.md')
(vendor/'asset-sha256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Verified assets for {len(characters)} characters; pinned package SHA-512 and per-file SHA-256 recorded.')
