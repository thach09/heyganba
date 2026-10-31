# Jiayou

Engineering release review: [final audit](docs/Operations/FINAL-ENGINEERING-AUDIT.md)
and its [41-commit disposition](docs/Operations/engineering-audit-evidence/v21-integration-matrix.json).

Chinese learning for Vietnamese learners, built with React19/Vite and Spring Boot.
Ganbarou is separate and remains at heyganba.site; this repository must never replace
its running services, database or Docker deployment.

## Start here

- [Developer handover](docs/HANDOVER.md): builds, validation and operator prerequisites.
- [Independent bootstrap](docs/Operations/jiayou-independent-bootstrap.md).
- [Shared-host checklist](docs/Operations/jiayou-shared-host-discovery.md).
- [Design rules](frontend/DESIGN.md) and [product scope](PRODUCT.md).
- [Compatibility identifiers](docs/Operations/legacy-identifiers.md).

## Build and test

Use Node24, JDK21, Maven3.9 and disposable PostgreSQL16 for database rehearsals.

```text
cd frontend
npm ci
npm audit --audit-level=moderate
npm run lint
npm run build
npm test
cd ../backend
mvn -B clean verify
```

CI validates H2, PostgreSQL/Flyway, frontend tests/audit and the independent bootstrap.
CI does not deploy. The legacy source-history preflight is an explicit read-only check,
not permission to initialize a new database.

## Production intent

Anh H?ng will deploy an independent Jiayou stack on the existing Arch Linux laptop
that also hosts Ganbarou. Jiayou's hostname is not selected. docker-compose.yml is a
fail-closed review template: no host/public ports, separate external storage and secrets,
measured resource budgets and validation-only backend startup. It creates no public route
or initial schema. Do not run it on the host without a separately approved deployment.

The default backend profile is jiayou-prod. Missing identity/authorization fails before
initialization. Legacy prod/staging profiles and historical SQL remain for compatibility,
not Jiayou production. The new corpus is empty/pending: no accounts or public admin are
seeded, and APPROVED publication requires a separate reviewed release. No learner data
is migrated from Ganbarou.

Historical provider examples and research are evidence, not current release instructions.
Provider deployment sources are retained under docs/archive/provider-deployment/.
Private environments, caches and preservation manifests are outside the source checkout.
