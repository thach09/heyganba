"""Prepare an evidence queue; lexical matches never imply semantic approval.

Use the official downloadable dictionaries, not scraped mirror/search snippets.
Full source text and the review worksheet stay in an ignored directory.
"""
import argparse
import collections
import gzip
import hashlib
import io
import json
import pathlib
import re
import unicodedata
import zipfile
import openpyxl


def tones(reading):
    result = []
    vowels = {'a':'āáǎà', 'e':'ēéěè', 'i':'īíǐì', 'o':'ōóǒò', 'u':'ūúǔù', 'ü':'ǖǘǚǜ'}
    for syllable in reading.lower().replace('u:', 'ü').split():
        if syllable[-1:] in '12345':
            tone = int(syllable[-1]); syllable = syllable[:-1]
            if tone < 5:
                position = next((syllable.index(v) for v in ['a','e'] if v in syllable), None)
                if position is None:
                    position = syllable.index('o') if 'ou' in syllable else next((i for i in range(len(syllable)-1,-1,-1) if syllable[i] in vowels), None)
                if position is not None:
                    syllable = syllable[:position] + vowels[syllable[position]][tone-1] + syllable[position+1:]
        result.append(syllable)
    return ''.join(result)


def normalized(reading):
    # Apostrophes delimit syllables (nǚ'ér), not tones. u and ü stay distinct.
    return re.sub(r"[\s\u3000\u00a0\u200b'’]+", '', unicodedata.normalize('NFC',reading or '')).lower()


def main():
    p=argparse.ArgumentParser();p.add_argument('--corpus',type=pathlib.Path,required=True);p.add_argument('--sources',type=pathlib.Path,required=True);p.add_argument('--report',type=pathlib.Path,required=True);p.add_argument('--worksheet',type=pathlib.Path,required=True);a=p.parse_args()
    # The worksheet contains source definitions used for fact-checking; do not redistribute.
    import subprocess
    if subprocess.run(['git','check-ignore','--quiet',str(a.worksheet.parent)]).returncode:
        raise SystemExit('Worksheet must remain gitignored')
    corpus=json.loads(a.corpus.read_text(encoding='utf-8-sig'))
    cedict=collections.defaultdict(list)
    for line in gzip.decompress((a.sources/'cedict.gz').read_bytes()).decode('utf-8').splitlines():
        m=re.match(r'^(\S+) (\S+) \[([^]]+)\] /(.+)/$',line)
        if m:
            traditional,simplified,pinyin,gloss=m.groups()
            cedict[simplified].append({'traditional':traditional,'pinyin':pinyin,'gloss':gloss,'entrySha256':hashlib.sha256(line.encode()).hexdigest()})
    archive=zipfile.ZipFile(a.sources/'moe-concise.zip')
    book=openpyxl.load_workbook(io.BytesIO(archive.read(archive.namelist()[0])),read_only=True,data_only=True)
    moe=collections.defaultdict(list)
    for row in list(book.active.values)[1:]:
        if row[0] and row[9]:
            moe[row[0]].append({'word':row[0],'id':row[1],'pinyin':row[9],'definition':row[13] or ''})
    source_files={name:hashlib.sha256((a.sources/name).read_bytes()).hexdigest() for name in ['cedict.gz','moe-concise.zip']}
    worksheet=[];report=[]
    for row in corpus:
        c=cedict[row['word']]
        traditional={row['word'],row.get('traditional')} | {e['traditional'] for e in c}
        m=[e for word in traditional if word for e in moe.get(word,[])]
        c_match=[e for e in c if normalized(tones(e['pinyin']))==normalized(row['pinyin'])]
        m_match=[e for e in m if normalized(e['pinyin'])==normalized(row['pinyin'])]
        # This only establishes a review candidate. Never approve by lookup success.
        reason='SEMANTIC_AND_OPTIONAL_FIELDS_CHECK_REQUIRED' if c_match and m_match else 'READING_OR_REGIONAL_DIFFERENCE' if c and m else 'SECOND_INDEPENDENT_ENTRY_NOT_FOUND'
        record={'id':row['id'],'word':row['word'],'hskLevel':row['hsk_level'],'status':'PENDING_REVIEW','reason':reason,'cedictMatches':len(c_match),'moeEntryIds':[e['id'] for e in m_match]}
        report.append(record);worksheet.append({'corpus':row,'cedict':c,'moe':m,'queue':record})
    a.worksheet.write_text(json.dumps(worksheet,ensure_ascii=False,indent=2),encoding='utf-8')
    a.report.write_text(json.dumps({'accessed':'2026-10-20','method':'LEXICAL_QUEUE_ONLY_NOT_APPROVAL','sourceFiles':source_files,'sources':[{'provider':'MDBG CC-CEDICT','dataFamily':'CC_CEDICT','reference':'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz','license':'CC BY-SA 4.0'},{'provider':'Taiwan Ministry of Education concise dictionary','dataFamily':'TAIWAN_MOE','reference':'https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/download/dict_concised_2014_20260929.zip','license':'CC BY-ND 3.0 Taiwan; source text retained locally without redistribution or derivative translation'}],'rows':report,'counts':dict(collections.Counter(r['reason'] for r in report))},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'rows':len(report),'reasons':dict(collections.Counter(r['reason'] for r in report)),'sources':source_files}))


if __name__=='__main__':main()
