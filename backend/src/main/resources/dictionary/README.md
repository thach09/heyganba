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

Review snapshot count/hash and representative entries, then run frontend, H2 and PostgreSQL migration tests. Commit both snapshot files together. Never bulk-import through Admin UI. The checksum-driven repeatable Flyway Java migration atomically upserts the catalog, removed entries are archived so existing notebook references survive. It runs only when snapshot bytes change. Deploying that reviewed change refreshes the catalog. The monthly maintenance workflow prepares an artifact, maintainers still review, merge and deploy the update.

Dictionary screens display the EDRDG attribution and license link. Course vocabulary remains distinct from catalog entries, saving an external entry to a notebook never adds it to course SRS or generated exams.
