# Repository deployment isolation — 30 October 2026

The owner explicitly confirms thach09/heyganba is not a source, image or update
dependency of the running Ganbarou laptop. No laptop investigation is a repository
merge/rename prerequisite; the host remains untouched and out of scope.

Completed before repository integration:

- Vercel project heyganba: removed only the Git connection. The dashboard confirms
  no repository is connected and no deploy hooks exist. Existing project settings,
  deployments and domain assignments were preserved; no DNS/ownership change occurred.
- Render production heyganba-backend: auto-deploy already off, PR previews off.
- Render staging heyganba-backend-staging: changed auto-deploy from commit to off,
  retaining its develop branch, service identity, live deployment and configuration.
- GitHub production environment: required owner approval/no admin bypass retained.
  No approval was issued and no deploy hook was called during security PR merges.

The source handover removes the Render deploy job from active CI while retaining
PR48's source-history script/tests and explicit manual validation-only job. The old
workflow and provider examples are archived. Actual repository secrets are not removed.
The scheduled Japanese corpus refresh is archived, not repurposed as a content publisher.
Vercel git.deploymentEnabled=false is also versioned as defense in depth; it does not
authorize reconnecting the provider or changing Ganbarou's public hostname.

Future CI runs tests/audits only. Anh Hưng's production deployment requires separate
explicit approval against a reviewed immutable artifact, target identity and backup/
restore evidence. Do not add laptop SSH/deploy hooks or enable automatic updates from
main as a handover shortcut. Repository renaming does not make old provider bindings safe
by itself. Recheck this inventory before reconnecting any integration.
