# Read-only discovery checklist — existing shared Arch Linux host

**NOT EXECUTED. No host access is authorized in the current task.** This checklist is
for a later explicitly authorized, read-only discovery session over the existing
Tailscale administrative path. Do not turn discovery into deployment or configuration.

Confirmed by owner: Arch Linux laptop already serves Ganbarou at heyganba.site;
Tailscale is connected; Jiayou will share this physical host with a different, still
unselected hostname. Everything below is unknown until observed. Neither a working
Tailscale session nor the historic Render service proves the public routing or actual
laptop datasource. The prior Neon/Render investigation identified that Render service's
datasource only; do not generalize it to Ganbarou on this laptop.

## Discovery boundaries and evidence handling

- Use the approved existing administrative identity and target host; do not scan the
  tailnet, create keys/accounts, change ACLs/routes or enable SSH/Funnel services.
- Read existing metadata with available permissions only. If blocked, record the exact
  missing permission for the operator; do not install packages, add docker-group access,
  escalate privileges or change ownership to make inspection work.
- Save sanitized observations: product/service identities, executable/image versions,
  listener bindings, configuration-source locations, network/volume ownership, capacity
  and dependency mapping. Record observation time and distinguish facts from hypotheses.
- Never paste raw environment files, `/proc/*/environ`, container inspect JSON, unit
  Environment values, command arguments, compose config output, proxy configuration
  dumps, tunnel configuration/tokens or connection URLs. They may contain secrets.
  A local redacting inspector must retain credentials only in memory and emit an
  approved allowlist of nonsecret fields. Avoid shell tracing and credential-bearing
  arguments/history. Do not export application data as discovery evidence.

## Inventory checklist and safe output

The commands below are examples for later review, not commands run by this task. Use
only tools already installed and stop on permission errors. Do not invoke service start,
reload, restart, migration, compose up/down, firewall apply, package update or DB writes.

| Check | Read-only approach / allowed evidence | Resolution needed before planning |
| --- | --- | --- |
| Host identity and OS | Approved Tailscale machine record + existing remote administrative identity; `uname -r`, `cat /etc/os-release` | Match the intended Arch host; record rootless/rootful/runtime ownership without assuming a new server |
| Runtime and service ownership | `systemctl list-units --type=service --state=running --no-pager`; process names only, not arguments; versions of installed Docker/Compose/Nginx/Caddy/cloudflared if present | Determine Docker/Podman/native systemd/mixed setup; identify Ganbarou, ingress, DB and backup units before suggesting a Compose stack |
| Listening sockets | `ss -lnt`, socket metadata as permitted; separate loopback, LAN, tailnet and wildcard binds | Establish existing 80/443 owners and all application/admin/DB port use; a listener is not proof it is publicly reachable |
| Compose/container ownership | If Docker exists and current access permits: `docker compose ls`, `docker ps --format '{{.Names}} {{.Image}} {{.Ports}}'`; inspect only explicitly selected metadata fields | Record project/config-source identities, pinned images, service health/restart metadata, mounts and network names; no raw Env or command/token output |
| Native service ownership | For identified units, read selected properties such as FragmentPath, DropInPaths, User, Group and WorkingDirectory; do not print Environment or ExecStart arguments | Locate deployment/config sources and owners. Operators locally review/redact secret-bearing directives instead of dumping whole unit files |
| Current ingress | Identify Nginx, Caddy, Traefik, other proxy, systemd sockets or cloudflared by running service/process identity and scoped configuration-source metadata | Trace heyganba.site → actual ingress → frontend/API upstream and TLS/redirect/cache boundaries; identify management-route policy and reload/rollback mechanism |
| Tunnel and Tailscale | Existing machine/service status and approved route/hostname metadata only; no token/key or full command line | Separate private admin path from public traffic. Establish whether Cloudflare Tunnel already routes Ganbarou; do not infer public IP/inbound connectivity from Tailscale |
| Networks | Existing engine network/subnet metadata, `ip route`, interface names/bindings as permitted, and read-only firewall policy metadata with operator redaction | Avoid collision with LAN/Docker/tailnet routes; record current public exposure controls. Do not modify firewall, routing, DNS, NAT or listeners |
| Persistent storage | Metadata for mounts/volumes/paths and their owners, `df -h`, `df -i`; do not traverse DB data files or read secrets | Preserve Ganbarou volume identities, paths, permissions and backup mounts; find an independently allocatable Jiayou location with adequate space |
| Capacity and operational baseline | `free -m`, `uptime`, `docker stats --no-stream` if available; existing monitoring for representative peaks and logs reviewed locally/redacted | Determine CPU/RAM/disk/I/O/thermal/connection/log/backup budgets. A single idle snapshot is not admission evidence; no stress test on Ganbarou |
| Backup/restore operations | Existing timer/backup-unit names and redacted policy metadata, last success/failure and verified restore evidence | Establish Ganbarou's protected RPO/RTO/retention and peak backup cost before creating a separate Jiayou schedule/destination/identity |
| Update/power behavior | Read relevant timer/unit/power/sleep policy metadata and maintenance records, without changing them | Understand existing sleep/reboot/Arch update/runtime restart risks shared by both apps |

## Actual Ganbarou datasource discovery — sanitized, not guessed

1. Match the running frontend's API route to the running Ganbarou backend. Record the
   backend service/container identity and deployed artifact/config source. Do not equate
   similarly named Render, Compose and systemd services without evidence.
2. Determine the effective configuration precedence for that process: native unit and
   environment-file references, container environment-source names, mounted secret/config
   files, active Spring profile and any explicit datasource/Flyway overrides. Metadata
   paths are not proof of effective values. Do not print raw files/env/arguments.
3. Have an approved local inspector parse the actual resolved datasource in memory and
   emit only protocol/provider inference, hostname, explicit/effective port, database
   name, active profile and whether credentials come from a separate file/environment.
   Strip username/password/userinfo/query parameters and redact values before any output.
   For split DB_HOST/DB_NAME inputs, resolve their effective precedence locally too.
4. Classify the endpoint as local service/socket, host/container address, private remote
   service or managed external provider. Correlate hostname/DNS and service ownership;
   record uncertainty instead of assuming Neon or local PostgreSQL. Do not wake, query,
   restart or change any DB in this metadata-discovery phase.
   Resolve loopback/service-name meaning in the backend's network namespace: container
   localhost is not automatically the host, and a service alias alone does not prove
   which database instance/volume is behind it.
5. Record migration-location/history-table configuration as nonsecret metadata. Actual
   live schema/history reads, if later required, need a separately scoped read-only DB
   session and sanitized evidence; no migration/repair/baseline/clean operation follows
   automatically from discovery.

Allowed datasource evidence template:

```text
Observed service/artifact: <redacted nonsecret identity>
Config sources/precedence: <paths or key names only>
Active profile: <verified or unknown>
Datasource protocol/host/port/database: <sanitized fields only>
Location classification: <local/private-remote/managed-external/unknown>
Credential values: OMITTED
Flyway location/history table: <verified or unknown>
Public frontend/API relationship: <evidence or unknown>
```

## Discovery exit gates

Return a sanitized mapping of current Ganbarou service → ingress → datasource → storage
→ backup ownership, plus a port/network inventory and representative resource budget.
Mark each field verified or unknown. Unknown ingress, datasource, storage ownership or
insufficient capacity blocks any provisioning proposal. Do not substitute a generic new
server setup for missing evidence.

Only then prepare a scoped Jiayou Compose project/secret/storage design and conditional
additive ingress diff, with rollback confined to Jiayou and unchanged Ganbarou baseline
checks. Preserve current DB/provider services even if discovery reveals they are remote.
The existing Vercel main Git auto-deploy remains a separate release gate until explicitly
isolated/disabled in an authorized change. Completing this checklist does not authorize
any merge, deploy, DNS/tunnel/firewall change, daemon restart or production DB write.

Reference documentation for the later discovery/design review:
- [Arch systemd administration](https://wiki.archlinux.org/title/Systemd)
- [Compose project identity](https://docs.docker.com/compose/how-tos/project-name/)
- [Tailscale private Serve access](https://tailscale.com/kb/1312/serve)
- [Tailscale public Funnel distinction](https://tailscale.com/kb/1223/funnel)
