# JMdict snapshot

This catalog is derived from **JMdict**, maintained by the Electronic Dictionary Research and Development Group (EDRDG): https://www.edrdg.org/jmdict/j_jmdict.html.

Data license: **Creative Commons Attribution-ShareAlike 4.0 International** (CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/ . EDRDG conditions: https://www.edrdg.org/edrdg/licence.html . Retain attribution and share derived dictionary data under this license. This is a data license, application code retains its existing license.

`snapshot.json` records source URL, source SHA-256, generation date and entry count. `jmdict.tsv.gz` contains entry ID, representative valid headword, matching reading, English glosses and normalized search aliases. Sense restrictions are respected. Other spellings/readings and Hepburn search aliases are included in search, not asserted as translations. No Vietnamese translations or JLPT levels are generated.

## Update at least monthly

From repository root, download the official source and regenerate:

```powershell
Invoke-WebRequest https://www.edrdg.org/pub/Nihongo/JMdict_e.gz -OutFile scratch/JMdict_e.gz
node backend/tools/import-jmdict.mjs scratch/JMdict_e.gz
```

Review snapshot count/hash and representative entries, then run frontend, H2 and PostgreSQL migration tests. Commit both snapshot files together. Never bulk-import through Admin UI. The checksum-driven repeatable Flyway Java migration atomically upserts the catalog, removed entries are archived so notebook references survive. It refreshes when snapshot, reviewed TSV or transformer revision changes. The monthly maintenance workflow prepares an artifact; maintainers still review, merge and deploy the update.

Dictionary screens display the EDRDG attribution and license link. Course vocabulary remains distinct from catalog entries, saving an external entry to a notebook never adds it to course SRS or generated exams.

## Vietnamese starter glosses

`curated-ja-vi.tsv` contains 204 short Vietnamese glosses for frequent daily-life words. Each row is pinned to a JMdict entry ID and checks the expected headword and reading before Flyway applies it; English glosses remain from JMdict. The starter selection follows Japan Foundation Marugoto A1 themes and its public Vietnamese vocabulary index: https://marugoto.jpf.go.jp/en/teacher/resource/starter_c/ . Vietnamese wording was independently reviewed against references such as VIETCAFE (https://vietcafe-learning.com/dictionary/%E5%8C%BB%E8%80%85), Jdict (https://jdict.net/), and Glosbe (https://glosbe.com/ja/vi/%E8%AD%A6%E5%AF%9F). The curation does not copy or bulk-import another dictionary. Other catalog rows are clearly shown with English only until a Vietnamese gloss is checked. `common_rank` places this starter vocabulary ahead of obscure compounds for broad-character searches.

Optional columns 8 and 9 contain separately reviewed Vietnamese and English search aliases (`;` separated). Aliases are indexed in metadata, not displayed definitions. The transformer retains accented VI variants and derives ordered English gloss terms from the unchanged source. Catalog-wide rules prioritize primary glosses before secondary senses and compounds; no word-specific boost or global rank change is used. The existing bread/bus meanings and reviewed ranks are moved to the correct sense IDs 1103090/1098390; integrity tests lock their English anchors. See `docs/Dictionary/README.md` for the pending 500-concept artifact, measured benchmarks and local-only Flyway rehearsal. Production never loads the pending JSON.
