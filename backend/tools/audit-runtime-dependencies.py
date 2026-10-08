"""Check resolved public Maven coordinates against OSV, without sending source or credentials."""
import json
import pathlib
import re
import sys
import urllib.request

dependencies = re.findall(r"^\s+([\w.-]+):([\w.-]+):[^:]+:([^:\s]+):(compile|runtime)",
                          pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"), re.M)
if not dependencies:
    raise SystemExit("No resolved runtime dependencies found")
queries = [{"package": {"ecosystem": "Maven", "name": group + ":" + artifact}, "version": version}
           for group, artifact, version, _ in dependencies]
request = urllib.request.Request("https://api.osv.dev/v1/querybatch",
                                 data=json.dumps({"queries": queries}).encode(),
                                 headers={"Content-Type": "application/json"})
with urllib.request.urlopen(request, timeout=60) as response:
    results = json.load(response)["results"]
if len(results) != len(queries):
    raise SystemExit("Incomplete vulnerability service response")

# CVE-2026-47884 requires XsltView rendering with an implicit wildcard view name.
# This JSON-only backend has no XSLT views/resolver; MvcViewSurfaceTest guards that condition.
# Revisit when enabling any server-rendered view technology. Do not suppress other MVC advisories.
# GHSA-j9f9-w8pj-32f8 (CVE-2026-47890) requires Spring MVC/WebFlux, view fragments sent to
# clients over SSE, and attacker-controlled data streamed to other users. HeyGanba uses Spring MVC,
# but its application-owned handlers are REST APIs: none produces text/event-stream or exposes
# emitter/SSE/fragment/view types, and it has no server-rendered MVC endpoint path. The executable
# MvcViewSurfaceTest.applicationDoesNotExposeSseViewFragmentSurface guard checks registered handlers.
# Remove/revisit this exception before adding SSE or server-rendered fragment support.
exceptions = {
    ("org.springframework:spring-webmvc", "GHSA-pc63-qcmh-9cmg"),
    ("org.springframework:spring-webmvc", "GHSA-j9f9-w8pj-32f8"),
}
failed = False
for query, result in zip(queries, results):
    for vulnerability in result.get("vulns", []):
        key = (query["package"]["name"], vulnerability["id"])
        exempt = key in exceptions
        reason = {
            "GHSA-pc63-qcmh-9cmg": "NOT REACHABLE (XsltView disabled)",
            "GHSA-j9f9-w8pj-32f8": "NOT REACHABLE (SSE view fragments disabled)",
        }.get(key[1], "FAIL")
        print(f'{reason if exempt else "FAIL"}: {key[0]} {query["version"]} {key[1]}')
        failed |= not exempt
print(f"Audited {len(queries)} runtime dependencies")
raise SystemExit(1 if failed else 0)
