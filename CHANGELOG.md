# Changelog

All notable changes to this project are documented here. This project follows [Semantic Versioning](https://semver.org/); while below 1.0, minor versions may contain breaking changes.

## [0.1.0] - Unreleased

### Security
- Upgraded Vite 6.0 → 8.3. Resolves build-time advisories in esbuild, rollup, postcss, nanoid, and source-map-js. The published runtime code was not affected.
- Sensitive headers (`authorization`, `proxy-authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `x-csrf-token`, `x-xsrf-token`) are now redacted as `[REDACTED]` before payloads are stored.
- Payloads that are never claimed by `getPayload` now expire after 30 seconds instead of staying in memory for the life of the page.

### Added
- `redactHeaders` option to customize the redacted header list. Pass `[]` to disable redaction.
- Test suite (Vitest) and CI workflow.

### Changed
- **Breaking:** sensitive headers are redacted by default. To restore the previous behavior, use `init({ redactHeaders: [] })`.
- `stop()` now also clears all stored request/response data.
- Datadog traffic is now detected by hostname. Requests to EU (`datadoghq.eu`) and US1-FED (`ddog-gov.com`) intake are now ignored, and unrelated URLs that merely contain `datadoghq.com` are no longer skipped.
- The CommonJS build is now `dist/cjs/index.cjs`. Consumers resolving the package through `exports` (`require('@kyletaylored/datadog-rum-interceptor')`) are unaffected.
- Removed the unused `@rollup/rollup-linux-x64-gnu` optional dependency.

### Fixed
- `require()` of the package failed because the CJS build was treated as an ES module.
- `getPayload` threw when a fetch event had no `context.response` or an XHR event had no `context.xhr` (for example, on network errors). It now returns `null`.

## [0.0.9] - 2025-02-04

Last release before this changelog was introduced.

[0.1.0]: https://github.com/kyletaylored/datadog-rum-interceptor/compare/0.0.9...HEAD
[0.0.9]: https://github.com/kyletaylored/datadog-rum-interceptor/releases/tag/0.0.9
