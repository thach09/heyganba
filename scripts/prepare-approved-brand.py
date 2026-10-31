"""Only crop/pad/resize the approved raster. No recoloring, tracing or regeneration.
Optional development tool: Python + Pillow. Generated PNG assets are checked in.
"""
from pathlib import Path
from PIL import Image
import hashlib,json
root=Path(__file__).resolve().parents[1]
source=root/'docs/Design/brand/jiayou-logo-approved.png'
expected='8ea10c5e31017d9bad370051195b817654dbe472b32b3597b1d19e01752acbab'
assert hashlib.sha256(source.read_bytes()).hexdigest()==expected,'A changed source needs owner approval and a crop review'
image=Image.open(source);assert image.mode=='RGBA' and image.size==(2172,724)
out=root/'frontend/public/brand';out.mkdir(parents=True,exist_ok=True)
# Bounds retain the visible original glow. The symbol crop excludes the wordmark.
wordmark=image.crop((476,156,1700,548))
symbol=image.crop((500,190,805,506))
square=Image.new('RGBA',(352,352));square.alpha_composite(symbol,((352-symbol.width)//2,(352-symbol.height)//2))
assets=[]
for name,original,width in [('jiayou-wordmark.png',wordmark,612),('jiayou-wordmark-small.png',wordmark,306),('jiayou-icon.png',square,128),('favicon-32.png',square,32),('apple-touch-icon.png',square,180)]:
 height=round(original.height*width/original.width)
 target=out/name;original.resize((width,height),Image.Resampling.LANCZOS).save(target,optimize=True)
 assets.append({'path':'/brand/'+name,'width':width,'height':height,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(out/'manifest.json').write_text(json.dumps({'source':'docs/Design/brand/jiayou-logo-approved.png','source_sha256':expected,'authorization':'Owner supplied approved artwork; raster derivatives only','operations':'Crop, transparent padding, proportional Lanczos downsampling; original colors retained','assets':assets},indent=2)+'\n',encoding='utf-8')
print(json.dumps(assets))
