"""Build OFL webfonts with a small shared UI subset and complete Unicode fallbacks.

Requires fonttools[woff]. Source fonts stay in the ignored cache; generated WOFF2,
licenses and provenance manifest are shipped. No characters are removed from the
fallback set. Fonts and weights match frontend/DESIGN.md.
"""
import argparse
import hashlib
import json
import pathlib
import re
import urllib.request
import unicodedata
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = {
    'NotoSerifSC': ('notoserifsc/NotoSerifSC%5Bwght%5D.ttf', '050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9'),
    'NotoSansSC': ('notosanssc/NotoSansSC%5Bwght%5D.ttf', 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da'),
}


def fetch(url, path):
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url, timeout=90).read())
    return path.read_bytes()


def unicode_ranges(points):
    groups = []
    for point in sorted(points):
        if groups and point == groups[-1][1] + 1:
            groups[-1][1] = point
        else:
            groups.append([point, point])
    return ','.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in groups)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=pathlib.Path, required=True)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    out = ROOT / 'frontend/public/fonts'
    out.mkdir(parents=True, exist_ok=True)
    core = set(range(0x20, 0x7F))
    ui_files = list((ROOT/'frontend/src/features/dashboard').glob('*.tsx'))
    ui_files += list((ROOT/'frontend/src/components').glob('Oriental*.tsx'))
    ui_files += [ROOT/'frontend/src/components/Sidebar.tsx']
    for path in ui_files:
        source_text = path.read_text(encoding='utf-8')
        source_text = re.sub(r'/\*.*?\*/|^\s*//[^\n]*', '', source_text, flags=re.S | re.M)
        core.update(ord(ch) for ch in source_text if ord(ch) > 127)
    pets = (ROOT/'frontend/src/features/companion/petData.ts').read_text(encoding='utf-8')
    initial_quotes = re.search(r'panda:.*?idle:\s*\[(.*?)\]', pets, re.S).group(1)
    for text in [initial_quotes, *re.findall(r'(?:nameZh|labelZh|foodNameZh):\s*\x27([^\x27]+)',pets)]:
        core.update(ord(ch) for ch in text if ord(ch) > 127)
    pet_points = {ord(ch) for ch in pets if ord(ch) > 127} - core
    css, manifest = [], []
    for family, (relative, pinned) in SOURCES.items():
        url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + relative
        source = args.cache / (family + '.ttf')
        data = fetch(url, source)
        if hashlib.sha256(data).hexdigest() != pinned:
            raise SystemExit('Source checksum changed: inspect before regenerating ' + family)
        font = TTFont(source)
        coverage = set(font.getBestCmap())
        font.close()
        family_core = core if family == 'NotoSerifSC' else {p for p in core if p >= 0x2000}
        groups = [('ui', coverage & family_core)]
        remaining = coverage - family_core
        # Other moods/pets share a small content subset; they do not enlarge every initial UI load.
        groups.append(('pets', remaining & pet_points))
        remaining -= pet_points
        for block in sorted({p // 1024 for p in remaining}):
            groups.append((str(block), {p for p in remaining if p // 1024 == block}))
        output_points = set()
        for label, points in groups:
            options = subset.Options()
            options.flavor = 'woff2'
            options.hinting = False
            options.recalc_timestamp = False
            font = subset.load_font(str(source), options)
            worker = subset.Subsetter(options=options)
            worker.populate(unicodes=points)
            worker.subset(font)
            font.flavor = 'woff2'
            name = f'{family}-{label}.woff2'
            font.save(out/name)
            output_points.update(font.getBestCmap())
            font.close()
            css.append("@font-face{font-family:'%s';font-style:normal;font-weight:100 900;font-display:swap;src:url('/fonts/%s') format('woff2');unicode-range:%s;}" % (re.sub(r'(Sans|Serif)SC', r' \1 SC', family), name, unicode_ranges(points)))
        if output_points != coverage:
            raise SystemExit('Incomplete glyph coverage for ' + family)
        license_url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + relative.split('/')[0] + '/OFL.txt'
        (out/(family+'-OFL.txt')).write_bytes(fetch(license_url,args.cache/(family+'-OFL.txt')))
        manifest.append({'family':family,'source':url,'sha256':pinned,'glyphCodepoints':len(coverage),'uiCodepoints':len(coverage & family_core),'fallbackComplete':True,'license':'SIL OFL 1.1','subsets':len(groups)})
    for weight, style in [(400,'Regular'),(500,'Medium'),(600,'SemiBold'),(700,'Bold')]:
        url = f'https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/BeVietnamPro-{style}.ttf'
        source = args.cache/f'BeVietnamPro-{style}.ttf'
        data = fetch(url,source)
        expected = {400:'cd1ef6e9d7db28ad5cdb88a65ccbe693870e60d340b791f349d248342b4fe4c3',500:'b60832bfa0fcd015158112c64d7e3fdad3b0c6287d1823f85a3103636e845268',600:'bd8e27eb02720b9d91e59e4f10a90878643219f25ce6a8d9a4f06a8a88d3bb71',700:'7f738fe5c43c8872807b20e2d30d42163618de8a4daf7f48a939adac32c16847'}[weight]
        if hashlib.sha256(data).hexdigest() != expected:
            raise SystemExit('Source checksum changed: inspect before regenerating BeVietnamPro ' + str(weight))
        options = subset.Options(); options.flavor='woff2'; options.recalc_timestamp=False; options.hinting=False
        font = subset.load_font(str(source),options)
        coverage=set(font.getBestCmap());font.close()
        # Keep every Vietnamese vowel/tone in the initial subset. Other Latin
        # languages/Pinyin and decomposed input retain an on-demand full fallback.
        vowels='aăâeêioôơuưyAĂÂEÊIOÔƠUƯY'
        vietnamese={ord(unicodedata.normalize('NFC', v+t)) for v in vowels for t in ['', '\u0300','\u0301','\u0303','\u0309','\u0323']}
        latin=set(range(0x20,0x7F)) | vietnamese | {ord(c) for c in 'đĐ“”‘’…–—•·→←×°₫'}
        for label,points in [('',coverage & latin),('-rest',coverage-latin)]:
            font=subset.load_font(str(source),options);worker=subset.Subsetter(options=options);worker.populate(unicodes=points);worker.subset(font)
            name=f'BeVietnamPro-{weight}{label}.woff2';font.flavor='woff2';font.save(out/name);font.close()
            css.append("@font-face{font-family:'Be Vietnam Pro';font-style:normal;font-weight:%s;font-display:swap;src:url('/fonts/%s') format('woff2');unicode-range:%s;}" % (weight,name,unicode_ranges(points)))
        manifest.append({'family':'Be Vietnam Pro','weight':weight,'source':url,'sha256':hashlib.sha256(data).hexdigest(),'license':'SIL OFL 1.1','fallbackComplete':True})
    (out/'BeVietnamPro-OFL.txt').write_bytes(fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/OFL.txt',args.cache/'BeVietnamPro-OFL.txt'))
    (out/'fonts.css').write_text('\n'.join(css)+'\n',encoding='utf-8')
    assets = {p.name: hashlib.sha256(
        p.read_bytes().replace(b'\r\n', b'\n') if p.suffix in ['.txt', '.css'] else p.read_bytes()
    ).hexdigest() for p in sorted(out.iterdir()) if p.name != 'manifest.json'}
    (out/'manifest.json').write_text(json.dumps({'generator':'scripts/build-local-fonts.py','accessed':'2026-10-20','fonts':manifest,'assets':assets},indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'files':len(list(out.iterdir())),'bytes':sum(p.stat().st_size for p in out.iterdir()),'fonts':manifest}))


if __name__ == '__main__':
    main()
