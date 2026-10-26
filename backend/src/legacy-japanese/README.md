# Historical Japanese audit ? external fixtures only

The Chinese runtime no longer bundles the 18 historical Japanese resources or the two curation helpers. Japanese product development belongs to the separate Japanese repository. This profile supports historical regression investigation; it does not authorize a Japanese data release.

The maintainer archive in this directory is preserved as received. It is not byte-identical to the Git source: sixteen text resources differ by CRLF normalization, one gzip is byte-identical, and `assisted-ja-vi.tsv` was previously replaced by a comment. The two Java helper relocations are normalized-equivalent. Do not claim that the empty assisted archive passes the 4,796-row integrity assertion.

Materialize the authenticated historical resources into a NEW private directory outside the repository:

```powershell
python backend/tools/materialize-legacy-audit.py "$env:TEMP/heyganba-legacy-fixtures"
Set-Location backend
mvn -Plegacy-japanese-audit clean test "-Dlegacy.audit.resources=$env:TEMP/heyganba-legacy-fixtures"
```

The script pins commit `fffcbc924fcbaeda45bf3d3097acc07013954faf` and every resource SHA-256 before writing. It refuses existing destinations and paths inside the repository. No rows are synthesized, and the current assisted archive is untouched. Store these historical data under private user access; licensing/attribution of Vietnamese assisted material remains unapproved for redistribution.

The profile enables the original assisted release-row assertion against that historical fixture. All six tagged test classes retain their business assertions and run separately; default Chinese tests exclude this tag and include a runtime boundary test. The opt-in historical PostgreSQL dictionary rehearsal still needs its own explicitly isolated database; a skipped opt-in test is not a PASS.

Without an explicit external fixture directory, the historical audit is deliberately not a runnable data release. Default Chinese builds and executable JARs do not acquire these resources, even when the audit profile is selected.
