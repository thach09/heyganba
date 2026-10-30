# Spring advisory exception review — 2026-10-20

This is a time-bounded exception for the current Spring Boot 3.5 / Spring Framework 6.2 line. It does not claim that the application has no vulnerabilities.

| Advisory | Upstream severity | Affected versions and conditions | Current local evidence |
|---|---|---|---|
| [CVE-2026-47884](https://spring.io/security/cve-2026-47884/) | Medium | Spring Framework 6.2.0–6.2.19. Affected MVC applications must expose a `XSLTView` through a broad `/**` view-name mapping so an attacker-controlled view name can select the vulnerable rendering path. Upstream lists 6.2.20 as an Enterprise fix and 7.0.9 as the open-source fix. | The resolved runtime is Spring Framework 6.2.19 under the existing Boot 3.5 BOM. `MvcViewSurfaceTest` checks that this app has no `XSLTView`, wildcard view-name mapping, or server-side template rendering route. The real HTTP route inventory also found only JSON API handlers. |
| [CVE-2026-47890](https://spring.io/security/cve-2026-47890/) | Low | Spring Framework 6.2.0–6.2.19. Exploitation requires an MVC/WebFlux application using SSE view fragments with attacker-controlled streamed fragment data. Upstream lists 6.2.20 as an Enterprise fix and 7.0.9 as the open-source fix. | The runtime is 6.2.19. `MvcViewSurfaceTest` checks no SSE/view-fragment surface, and the route inventory found no SSE controller or view-based response. |

The project remains on Boot 3.5 and its managed Spring Framework 6.2 line; it does not force Framework 7 into an incompatible Boot BOM. The 6.2.20 fix is listed by Spring as Enterprise-only, so there is no compatible open-source 6.2 patch listed on the advisory pages reviewed on this date. This exception depends on the documented runtime and configuration checks and is not a substitute for taking a compatible upstream fix when one becomes available.

**Owner:** backend maintainer. **Review by:** 2026-10-27, and before any release that changes Spring dependencies, MVC configuration, controllers, or view technology.

Revoke this exception immediately if an `XSLTView`, wildcard view-name resolver, SSE view-fragment handler, or attacker-controlled fragment source is introduced; if the Spring Boot BOM changes; if upstream severity or exploit conditions change; or if a compatible open-source patch becomes available. Re-run dependency resolution, both advisory surface tests, H2/PostgreSQL suites, and production-profile startup at each review.

The evidence consists of the upstream advisory conditions and local config/runtime tests; it does not cover unknown dependency vulnerabilities, provider runtime behavior, or exploit paths outside those conditions.
