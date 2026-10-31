# Historical Japanese regression fixtures

Jiayou's executable artifact excludes `dictionary/**`, the historical Japanese
dictionary coverage JSON and the Vietnamese-assisted dictionary data resources.
The two curation helpers compile only in test sources. Historical source/archive
files remain preserved; no SQL or Flyway checksum is moved or rewritten.

The six historical dictionary test classes retain their assertions under the
`legacy-japanese` tag. Run them explicitly against authenticated external test
resources, not the incomplete archived corpus:

```powershell
python backend/tools/materialize-legacy-audit.py D:/Private/new-legacy-fixtures
mvn -B -f backend/pom.xml -Plegacy-japanese-audit clean test "-Dlegacy.audit.resources=D:/Private/new-legacy-fixtures"
```

Choose a new private path outside the repository; restrict filesystem access.
The script pins the original Git commit and verifies all 18 SHA-256 values before
writing any fixture. A shallow clone needs that history fetched first. The data
is historical test evidence, not approval to redistribute or publish a corpus.
The isolated PostgreSQL dictionary pilot additionally needs its documented
explicit opt-in database; a skipped pilot is not a PostgreSQL PASS.

Default tests exercise the Chinese runtime boundary. A legacy catalog flag alone
cannot activate the Japanese data path: the explicit `legacy-japanese` Spring
profile is also required. Even the Maven audit profile does not include these
resources or helpers in the executable JAR.
